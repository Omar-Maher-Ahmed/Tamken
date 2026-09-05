import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  reviewVerificationDocumentSchema,
  submitVerificationDocumentSchema,
  UserRole,
} from '@/shared';
import { VerificationService } from './verification.service';
import { SubmitDocumentDto, ReviewDocumentDto } from './dto/verification.dto';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { Roles } from '@/shared/decorators/roles.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe';

@ApiTags('Verification')
@ApiBearerAuth()
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('submit')
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'Submit a verification document (providers only)' })
  @ApiResponse({ status: 201, description: 'Document submitted for review' })
  async submitDocument(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(submitVerificationDocumentSchema)) body: SubmitDocumentDto,
  ) {
    return this.verificationService.submitDocument(userId, body);
  }

  @Get('status')
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'Get verification status for current provider' })
  @ApiResponse({ status: 200, description: 'Verification status with all documents' })
  async getStatus(@CurrentUser('id') userId: string) {
    return this.verificationService.getMyDocuments(userId);
  }

  @Get('pending')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all pending verification documents (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated pending documents' })
  async listPending(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.verificationService.listPendingDocuments(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Patch(':id/review')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve or reject a verification document (admin only)' })
  @ApiParam({ name: 'id', description: 'Verification document UUID' })
  @ApiResponse({ status: 200, description: 'Document reviewed' })
  @ApiResponse({ status: 400, description: 'Already reviewed or missing rejection reason' })
  async reviewDocument(
    @Param('id', ParseUUIDPipe) documentId: string,
    @CurrentUser('id') adminId: string,
    @Body(new ZodValidationPipe(reviewVerificationDocumentSchema)) body: ReviewDocumentDto,
  ) {
    return this.verificationService.reviewDocument(documentId, adminId, body);
  }
}
