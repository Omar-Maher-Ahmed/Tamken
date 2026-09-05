import { ProviderProfileRepository } from '@/modules/providers/repositories/provider-profile.repository';
import { ServiceRequestRepository } from '@/modules/jobs/repositories/service-request.repository';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceRequest } from './entities/service-request.entity';
import {
  RequestStatus,
  ServiceCategory,
  UserRole,
  VALID_STATUS_TRANSITIONS,
} from '@/shared';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly requestRepo: ServiceRequestRepository,
    private readonly providerRepo: ProviderProfileRepository,
  ) {}

  /**
   * Create a new service request from a customer to a provider.
   */
  async createServiceRequest(
    customerId: string,
    providerId: string,
    input: {
      title: string;
      description: string;
      category: string;
      budget?: number;
      scheduledAt?: string;
    },
  ) {
    // Verify the provider exists and is active
    const provider = await this.providerRepo.findOne({
      where: { id: providerId, isActive: true },
    });
    if (!provider) {
      throw new NotFoundException('Provider not found or inactive');
    }

    const request = this.requestRepo.create({
      customerId,
      providerId,
      title: input.title,
      description: input.description,
      category: input.category as ServiceCategory,
      budget: input.budget,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      status: RequestStatus.PENDING,
    });

    const saved = await this.requestRepo.save(request);
    this.logger.log(
      `Service request created: ${saved.id} (customer=${customerId}, provider=${providerId})`,
    );

    return saved;
  }

  /**
   * List service requests filtered by the user's role.
   * - Customer sees their own requests
   * - Provider sees requests assigned to them
   * - Admin sees all
   */
  async listRequests(
    userId: string,
    userRole: string,
    query: { status?: string; page?: number; limit?: number },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);
    const skip = (page - 1) * limit;

    const qb = this.requestRepo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.customer', 'customer')
      .leftJoinAndSelect('request.provider', 'provider')
      .leftJoinAndSelect('provider.user', 'providerUser');

    // Role-based filtering
    if (userRole === UserRole.CUSTOMER) {
      qb.where('request.customerId = :userId', { userId });
    } else if (userRole === UserRole.PROVIDER) {
      // Find the provider profile for this user
      const profile = await this.providerRepo.findOne({
        where: { userId },
      });
      if (profile) {
        qb.where('request.providerId = :providerId', {
          providerId: profile.id,
        });
      } else {
        // Provider has no profile yet — return empty
        return {
          data: [],
          meta: { page, limit, total: 0, totalPages: 0 },
        };
      }
    }
    // Admin: no where clause — sees all

    if (query.status) {
      qb.andWhere('request.status = :status', { status: query.status });
    }

    qb.orderBy('request.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single service request by ID.
   */
  async getRequestById(requestId: string, userId: string, userRole: UserRole) {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: ['customer', 'provider', 'provider.user'],
    });

    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    await this.authorizeRead(request, userId, userRole);

    return request;
  }

  /**
   * Update service request status with state machine validation.
   */
  async updateStatus(
    requestId: string,
    userId: string,
    userRole: string,
    newStatus: string,
  ) {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: ['provider'],
    });

    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    // ─── Authorization check ───
    await this.authorizeStatusChange(request, userId, userRole, newStatus);

    // ─── State machine validation ───
    const currentStatus = request.status as RequestStatus;
    const targetStatus = newStatus as RequestStatus;
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];

    if (!allowedTransitions || !allowedTransitions.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${currentStatus}" to "${targetStatus}". Allowed: [${allowedTransitions?.join(', ') || 'none'}]`,
      );
    }

    // Apply the transition
    request.status = targetStatus;

    if (targetStatus === RequestStatus.COMPLETED) {
      request.completedAt = new Date();
    }

    const updated = await this.requestRepo.save(request);
    this.logger.log(
      `Request ${requestId}: ${currentStatus} → ${targetStatus} by ${userRole}:${userId}`,
    );

    return updated;
  }

  // ─── Private Helpers ───

  private async authorizeStatusChange(
    request: ServiceRequest,
    userId: string,
    userRole: string,
    newStatus: string,
  ) {
    if (userRole === UserRole.ADMIN) {
      return; // Admin can do anything
    }

    if (userRole === UserRole.CUSTOMER) {
      if (request.customerId !== userId) {
        throw new ForbiddenException('You can only modify your own requests');
      }
      // Customers can only cancel
      if (newStatus !== RequestStatus.CANCELLED) {
        throw new ForbiddenException('Customers can only cancel requests');
      }
    }

    if (userRole === UserRole.PROVIDER) {
      // Verify this provider owns the request
      const profile = await this.providerRepo.findOne({
        where: { userId },
      });

      if (!profile || request.providerId !== profile.id) {
        throw new ForbiddenException(
          'You can only modify requests assigned to you',
        );
      }

      // Providers can accept, start, complete, or cancel
      const allowed: string[] = [
        RequestStatus.ACCEPTED,
        RequestStatus.IN_PROGRESS,
        RequestStatus.COMPLETED,
        RequestStatus.CANCELLED,
      ];
      if (!allowed.includes(newStatus)) {
        throw new ForbiddenException(`Providers cannot set status to "${newStatus}"`);
      }
    }
  }

  private async authorizeRead(
    request: ServiceRequest,
    userId: string,
    userRole: UserRole,
  ) {
    if (userRole === UserRole.ADMIN || request.customerId === userId) {
      return;
    }

    if (userRole === UserRole.PROVIDER) {
      const profile = await this.providerRepo.findOne({ where: { userId } });
      if (profile?.id === request.providerId) {
        return;
      }
    }

    throw new ForbiddenException('You are not allowed to access this request');
  }
}
