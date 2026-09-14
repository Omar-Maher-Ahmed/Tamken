import {
  Controller,
  Get,
  Delete,
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
import { ChatbotService } from './chatbot.service';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';

@ApiTags('Chatbot')
@ApiBearerAuth()
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get('sessions')
  @ApiOperation({
    summary: 'List chat sessions',
    description: 'Get all chatbot sessions for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'List of chat sessions' })
  async getSessions(@CurrentUser('id') userId: string) {
    return this.chatbotService.getSessions(userId);
  }

  @Get('sessions/:sessionId/messages')
  @ApiOperation({
    summary: 'Get session messages',
    description: 'Get paginated messages for a specific chatbot session.',
  })
  @ApiParam({ name: 'sessionId', description: 'Chat session UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated message history' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionMessages(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.chatbotService.getSessionMessages(
      sessionId,
      userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );

    if (!result) {
      return { statusCode: 404, message: 'Session not found' };
    }

    return result;
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({
    summary: 'Delete a session',
    description: 'Delete a chatbot session and all its messages.',
  })
  @ApiParam({ name: 'sessionId', description: 'Chat session UUID' })
  @ApiResponse({ status: 200, description: 'Session deleted' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async deleteSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser('id') userId: string,
  ) {
    const deleted = await this.chatbotService.deleteSession(
      sessionId,
      userId,
    );

    if (!deleted) {
      return { statusCode: 404, message: 'Session not found' };
    }

    return { deleted: true };
  }
}
