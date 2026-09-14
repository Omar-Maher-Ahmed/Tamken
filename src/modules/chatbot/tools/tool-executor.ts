import { Injectable, Logger } from '@nestjs/common';
import { ProvidersService } from '@/modules/providers/providers.service';
import { JobsService } from '@/modules/jobs/jobs.service';
import { UserRepository } from '@/modules/auth/repositories/user.repository';
import { UserRole } from '@/shared';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

@Injectable()
export class ToolExecutor {
  private readonly logger = new Logger(ToolExecutor.name);

  constructor(
    private readonly providersService: ProvidersService,
    private readonly jobsService: JobsService,
    private readonly userRepo: UserRepository,
  ) {}

  async execute(
    toolName: string,
    args: Record<string, any>,
    userId: string,
    userRole: UserRole,
  ): Promise<ToolResult> {
    this.logger.debug(`Executing tool: ${toolName}`);

    try {
      switch (toolName) {
        case 'search_providers':
          return await this.searchProviders(args);
        case 'get_provider_details':
          return await this.getProviderDetails(args);
        case 'get_user_jobs':
          return await this.getUserJobs(args, userId, userRole);
        case 'get_job_status':
          return await this.getJobStatus(args, userId, userRole);
        case 'get_user_profile':
          return await this.getUserProfile(userId);
        case 'get_platform_info':
          return await this.getPlatformInfo(args);
        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Tool ${toolName} failed: ${message}`);
      return { success: false, error: message };
    }
  }

  private async searchProviders(
    args: Record<string, any>,
  ): Promise<ToolResult> {
    const result = await this.providersService.findActiveForDiscovery({
      category: args.category,
      city: args.city,
      minRating: args.minRating,
      maxPrice: args.maxPrice,
      page: args.page || 1,
      limit: Math.min(args.limit || 10, 20),
    });

    return {
      success: true,
      data: {
        providers: result.data.map((p) => ({
          id: p.id,
          businessName: p.businessName,
          category: p.category,
          city: p.city,
          hourlyRate: p.hourlyRate,
          avgRating: p.avgRating,
          totalReviews: p.totalReviews,
          isVerified: p.isVerified,
          bio: p.bio,
        })),
        total: result.meta.total,
        page: result.meta.page,
        totalPages: result.meta.totalPages,
      },
    };
  }

  private async getProviderDetails(
    args: Record<string, any>,
  ): Promise<ToolResult> {
    const provider = await this.providersService.getProviderById(
      args.providerId,
    );

    return {
      success: true,
      data: {
        id: provider.id,
        businessName: provider.businessName,
        bio: provider.bio,
        category: provider.category,
        categories: provider.categories,
        hourlyRate: provider.hourlyRate,
        city: provider.city,
        avgRating: provider.avgRating,
        totalReviews: provider.totalReviews,
        isVerified: provider.isVerified,
        portfolioUrls: provider.portfolioUrls,
        createdAt: provider.createdAt,
      },
    };
  }

  private async getUserJobs(
    args: Record<string, any>,
    userId: string,
    userRole: UserRole,
  ): Promise<ToolResult> {
    const result = await this.jobsService.listRequests(userId, userRole, {
      status: args.status,
      page: args.page || 1,
      limit: Math.min(args.limit || 10, 20),
    });

    return {
      success: true,
      data: {
        jobs: result.data.map((j) => ({
          id: j.id,
          title: j.title,
          category: j.category,
          status: j.status,
          budget: j.budget,
          scheduledAt: j.scheduledAt,
          createdAt: j.createdAt,
        })),
        total: result.meta.total,
        page: result.meta.page,
        totalPages: result.meta.totalPages,
      },
    };
  }

  private async getJobStatus(
    args: Record<string, any>,
    userId: string,
    userRole: UserRole,
  ): Promise<ToolResult> {
    const job = await this.jobsService.getRequestById(
      args.jobId,
      userId,
      userRole,
    );

    return {
      success: true,
      data: {
        id: job.id,
        title: job.title,
        description: job.description,
        category: job.category,
        status: job.status,
        budget: job.budget,
        scheduledAt: job.scheduledAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
      },
    };
  }

  private async getUserProfile(userId: string): Promise<ToolResult> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['providerProfile'],
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const { passwordHash, ...rest } = user;
    return {
      success: true,
      data: {
        ...rest,
        hasProviderProfile: !!user.providerProfile,
        providerProfileId: user.providerProfile?.id,
      },
    };
  }

  private async getPlatformInfo(
    args: Record<string, any>,
  ): Promise<ToolResult> {
    const topic = args.topic || 'general';

    const info: Record<string, string> = {
      how_it_works:
        'Tamken connects customers with skilled service providers. 1) Sign up as a customer or provider. 2) Customers search for providers by category, location, or rating. 3) Customers view provider profiles, portfolios, and reviews. 4) Customers send a service request. 5) Provider accepts and performs the service. 6) After completion, customers leave a rating and review.',
      services:
        'Tamken supports these service categories: Cleaning (تنظيف), Plumbing (سباكة), Electrical (كهرباء), Carpentry (نجارة), Painting (دهان), Moving (نقل عفش), and Other (أخرى). You can search providers in any of these categories.',
      signup:
        'To sign up, go to the registration page and choose your role: Customer or Provider. Customers can immediately start searching for providers. Providers need to create a profile with their business name, services, pricing, and location.',
      pricing:
        'Tamken is free for customers to use. Providers set their own hourly rates. The platform may charge service fees or commissions — check the latest terms for details.',
      verification:
        'Providers can verify their identity by uploading official documents (ID card, passport, or professional certificate). Verified providers get a verification badge that increases customer trust.',
      payment:
        'Payment details are handled between the customer and provider. The platform facilitates the connection but payment methods may vary.',
      cancellation:
        'Service requests can be cancelled by the customer before the provider starts the work. Once in progress, only the provider can complete or cancel the job.',
      reviews:
        'After a service request is completed, customers can rate the provider from 1 to 5 stars and leave a written review. Ratings help other customers choose the best provider.',
      messaging:
        'Customers and providers can communicate via the in-app messaging system. Each service request has its own chat room for easy communication.',
      general:
        'Tamken (تمكين) is a C2C skilled-services marketplace. It connects customers with independent service providers like plumbers, electricians, carpenters, painters, and cleaners. You can search for providers, view their profiles, request services, and communicate directly.',
    };

    return {
      success: true,
      data: info[topic] || info.general,
    };
  }
}
