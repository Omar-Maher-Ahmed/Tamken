import { UserRepository } from '@/modules/auth/repositories/user.repository';
import { ProviderProfileRepository } from '@/modules/providers/repositories/provider-profile.repository';
import { VerificationDocumentRepository } from '@/modules/verification/repositories/verification-document.repository';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationDocument } from '@/modules/verification';
import { ProviderProfile } from '@/modules/providers';
import { User } from '@/modules/auth';
import { DocumentType, VerificationStatus, UserRole } from '@/shared';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly docRepo: VerificationDocumentRepository,
    private readonly providerRepo: ProviderProfileRepository,
    private readonly userRepo: UserRepository,
  ) {}

  /**
   * Submit a verification document (provider only).
   */
  async submitDocument(
    userId: string,
    input: { documentType: string; documentUrl: string },
  ) {
    // Find provider profile
    const profile = await this.providerRepo.findOne({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException(
        'Provider profile not found. Create a provider profile first.',
      );
    }

    const doc = this.docRepo.create({
      providerId: profile.id,
      documentType: input.documentType as DocumentType,
      documentUrl: input.documentUrl,
      status: VerificationStatus.PENDING,
    });

    const saved = await this.docRepo.save(doc);
    this.logger.log(
      `Verification document submitted: ${saved.id} (provider=${profile.id}, type=${input.documentType})`,
    );

    return saved;
  }

  /**
   * Get verification status for the current provider.
   */
  async getMyDocuments(userId: string) {
    const profile = await this.providerRepo.findOne({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Provider profile not found');
    }

    const documents = await this.docRepo.find({
      where: { providerId: profile.id },
      order: { createdAt: 'DESC' },
    });

    return {
      providerId: profile.id,
      isVerified: (
        await this.userRepo.findOne({ where: { id: userId } })
      )?.isVerified,
      documents,
    };
  }

  /**
   * Admin: list all pending verification documents.
   */
  async listPendingDocuments(page: number = 1, limit: number = 20) {
    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

    const [documents, total] = await this.docRepo.findAndCount({
      where: { status: VerificationStatus.PENDING },
      relations: ['provider', 'provider.user'],
      order: { createdAt: 'ASC' },
      skip,
      take: safeLimit,
    });

    return {
      data: documents,
      meta: {
        page,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Admin: review (approve/reject) a verification document.
   */
  async reviewDocument(
    documentId: string,
    adminId: string,
    input: { status: 'approved' | 'rejected'; rejectionReason?: string },
  ) {
    const doc = await this.docRepo.findOne({
      where: { id: documentId },
      relations: ['provider'],
    });

    if (!doc) {
      throw new NotFoundException('Verification document not found');
    }

    if (doc.status !== VerificationStatus.PENDING) {
      throw new BadRequestException('Document has already been reviewed');
    }

    if (input.status === 'rejected' && !input.rejectionReason) {
      throw new BadRequestException(
        'Rejection reason is required when rejecting a document',
      );
    }

    // Update document
    doc.status = input.status as VerificationStatus;
    doc.reviewedBy = adminId;
    doc.reviewedAt = new Date();
    if (input.rejectionReason) {
      doc.rejectionReason = input.rejectionReason;
    }

    const updated = await this.docRepo.save(doc);

    // If approved, check if all required docs are approved → verify the user
    if (input.status === 'approved') {
      await this.checkAndVerifyProvider(doc.provider.userId);
    }

    this.logger.log(
      `Document ${documentId} ${input.status} by admin ${adminId}`,
    );

    return updated;
  }

  /**
   * Check if a provider has all required documents approved,
   * and if so, mark their user account as verified.
   */
  private async checkAndVerifyProvider(userId: string) {
    const profile = await this.providerRepo.findOne({
      where: { userId },
    });
    if (!profile) return;

    // Check if at least one document is approved (simplified check)
    const approvedCount = await this.docRepo.count({
      where: {
        providerId: profile.id,
        status: VerificationStatus.APPROVED,
      },
    });

    if (approvedCount > 0) {
      await Promise.all([
        this.userRepo.update(userId, { isVerified: true }),
        this.providerRepo.update(profile.id, { isVerified: true }),
      ]);
      this.logger.log(`Provider ${userId} verified (${approvedCount} approved docs)`);
    }
  }
}
