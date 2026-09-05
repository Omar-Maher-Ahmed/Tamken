import {
  Controller,
  Get,
  Param,
  Query,
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
import { MessagingService } from './messaging.service';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';

@ApiTags('Messaging')
@ApiBearerAuth()
@Controller('messages')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get(':jobId')
  @ApiOperation({
    summary: 'Get chat history for a job',
    description: 'REST fallback for loading chat history. Only job participants can access.',
  })
  @ApiParam({ name: 'jobId', description: 'Service request UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated chat history' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  async getChatHistory(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.messagingService.getChatHistory(
      jobId,
      userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }
}
