import { ReviewRepository } from './repositories/review.repository';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { Review } from '@/modules/reviews';
import { ServiceRequest } from '@/modules/jobs';
import { ProviderProfile } from '@/modules/providers';
import { JobsModule } from '@/modules/jobs/jobs.module';
import { ProvidersModule } from '@/modules/providers/providers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, ServiceRequest, ProviderProfile]),
    JobsModule,
    ProvidersModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewRepository, ReviewsService],
  exports: [ReviewRepository, ReviewsService],
})
export class ReviewsModule {}
