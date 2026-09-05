import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UsePipes,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { createReviewSchema, UserRole } from '@/shared';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/reviews.dto';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { Roles } from '@/shared/decorators/roles.decorator';
import { Public } from '@/shared/decorators/public.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Submit a review for a completed job (customers only)',
  })
  @ApiResponse({ status: 201, description: 'Review submitted' })
  @ApiResponse({ status: 403, description: 'Not authorized or job not completed' })
  @ApiResponse({ status: 409, description: 'Already reviewed this job' })
  async createReview(
    @CurrentUser('id') customerId: string,
    @Body(new ZodValidationPipe(createReviewSchema)) body: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(customerId, body);
  }

  @Get(':providerId')
  @Public()
  @ApiOperation({ summary: 'Get all reviews for a provider (public)' })
  @ApiParam({ name: 'providerId', description: 'Provider profile UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated reviews with rating stats' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async getProviderReviews(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.getProviderReviews(
      providerId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }
}
