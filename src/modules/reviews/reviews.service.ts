import { ProviderProfileRepository } from '@/modules/providers/repositories/provider-profile.repository';
import { ServiceRequestRepository } from '@/modules/jobs/repositories/service-request.repository';
import { ReviewRepository } from '@/modules/reviews/repositories/review.repository';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '@/modules/reviews';
import { ServiceRequest } from '@/modules/jobs';
import { ProviderProfile } from '@/modules/providers';
import { RequestStatus } from '@/shared';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly reviewRepo: ReviewRepository,
    private readonly requestRepo: ServiceRequestRepository,
    private readonly providerRepo: ProviderProfileRepository,
  ) {}

  /**
   * Submit a review for a completed job.
   * Only the customer of the job can leave a review, and only once.
   */
  async createReview(
    customerId: string,
    input: { jobId: string; rating: number; comment?: string },
  ) {
    // 1. Find the job
    const job = await this.requestRepo.findOne({
      where: { id: input.jobId },
    });

    if (!job) {
      throw new NotFoundException('Service request not found');
    }

    // 2. Verify the job is completed
    if (job.status !== RequestStatus.COMPLETED) {
      throw new ForbiddenException(
        'Can only review completed jobs',
      );
    }

    // 3. Verify the reviewer is the customer of this job
    if (job.customerId !== customerId) {
      throw new ForbiddenException(
        'Only the customer of this job can leave a review',
      );
    }

    // 4. Check for existing review (unique constraint backup)
    const existing = await this.reviewRepo.findOne({
      where: { jobId: input.jobId, customerId },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this job');
    }

    // 5. Create and save review
    const review = this.reviewRepo.create({
      jobId: input.jobId,
      customerId,
      providerId: job.providerId,
      rating: input.rating,
      comment: input.comment,
    });

    const saved = await this.reviewRepo.save(review);

    // 6. Recalculate provider's average rating
    await this.recalculateProviderRating(job.providerId);

    this.logger.log(
      `Review created: ${saved.id} (job=${input.jobId}, rating=${input.rating})`,
    );

    return saved;
  }

  /**
   * Get all reviews for a provider (paginated).
   */
  async getProviderReviews(
    providerId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

    // Verify provider exists
    const provider = await this.providerRepo.findOne({
      where: { id: providerId },
    });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const [reviews, total] = await this.reviewRepo.findAndCount({
      where: { providerId },
      relations: ['customer'],
      order: { createdAt: 'DESC' },
      skip,
      take: safeLimit,
    });

    return {
      data: reviews.map((review: any) => ({
        id: review.id,
        jobId: review.jobId,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        customer: review.customer
          ? {
              id: review.customer.id,
              firstName: review.customer.firstName,
              lastName: review.customer.lastName,
            }
          : undefined,
      })),
      meta: {
        page,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
        avgRating: provider.avgRating,
        totalReviews: provider.totalReviews,
      },
    };
  }

  /**
   * Recalculate a provider's average rating from all their reviews.
   */
  private async recalculateProviderRating(providerId: string) {
    const result = await this.reviewRepo
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.providerId = :providerId', { providerId })
      .getRawOne();

    await this.providerRepo.update(providerId, {
      avgRating: parseFloat(result.avg) || 0,
      totalReviews: parseInt(result.count, 10) || 0,
    });
  }
}
