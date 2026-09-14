import { Injectable, Logger } from '@nestjs/common';
import { ChatSessionRepository } from './repositories/chat-session.repository';
import { ChatMessageRepository } from './repositories/chat-message.repository';
import { ChatSession } from './entities/chat-session.entity';
import {
  ChatMessage,
  ChatMessageRole,
} from './entities/chat-message.entity';
import { LLMService } from './llm/llm.service';
import { LLMMessage } from './llm/llm.types';
import { ToolExecutor } from './tools/tool-executor';
import { CHATBOT_TOOLS } from './tools/tool-definitions';
import { SYSTEM_PROMPT } from './prompts/system-prompt';
import { UserRole } from '@/shared';

const MAX_TOOL_ITERATIONS = 5;
const HISTORY_LIMIT = 20;

export interface ChatResponse {
  sessionId: string;
  messageId: string;
  content: string;
  createdAt: Date;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly sessionRepo: ChatSessionRepository,
    private readonly messageRepo: ChatMessageRepository,
    private readonly llmService: LLMService,
    private readonly toolExecutor: ToolExecutor,
  ) {}

  async handleMessage(
    userId: string,
    userRole: UserRole,
    content: string,
    sessionId?: string,
  ): Promise<ChatResponse> {
    const session = await this.getOrCreateSession(userId, sessionId);

    await this.saveMessage(session.id, ChatMessageRole.USER, content);

    const history = await this.buildMessageHistory(session.id);

    const finalContent = await this.runAgentLoop(history, userId, userRole);

    const assistantMsg = await this.saveMessage(
      session.id,
      ChatMessageRole.ASSISTANT,
      finalContent,
    );

    if (!session.title) {
      session.title = content.slice(0, 80);
      session.lastMessageAt = new Date();
      await this.sessionRepo.save(session);
    } else {
      session.lastMessageAt = new Date();
      await this.sessionRepo.save(session);
    }

    return {
      sessionId: session.id,
      messageId: assistantMsg.id,
      content: finalContent,
      createdAt: assistantMsg.createdAt,
    };
  }

  async getSessions(userId: string) {
    return this.sessionRepo.find({
      where: { userId },
      order: { lastMessageAt: 'DESC', createdAt: 'DESC' },
      select: ['id', 'title', 'createdAt', 'lastMessageAt'],
    });
  }

  async getSessionMessages(sessionId: string, userId: string, page = 1, limit = 50) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return null;
    }

    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const [messages, total] = await this.messageRepo.findAndCount({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      skip,
      take: safeLimit,
    });

    return {
      data: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
      meta: {
        page,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return false;
    }

    await this.messageRepo.delete({ sessionId });
    await this.sessionRepo.remove(session);
    return true;
  }

  private async runAgentLoop(
    messages: LLMMessage[],
    userId: string,
    userRole: UserRole,
  ): Promise<string> {
    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await this.llmService.chatCompletion(
        messages,
        CHATBOT_TOOLS,
      );

      const choice = response.choices?.[0];
      if (!choice) {
        return 'I apologize, but I was unable to generate a response. Please try again.';
      }

      const assistantMessage = choice.message;
      messages.push({
        role: 'assistant',
        content: assistantMessage.content,
        tool_calls: assistantMessage.tool_calls,
      });

      if (choice.finish_reason === 'tool_calls' && assistantMessage.tool_calls) {
        for (const toolCall of assistantMessage.tool_calls) {
          let args: Record<string, any> = {};
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch {
            args = {};
          }

          const result = await this.toolExecutor.execute(
            toolCall.function.name,
            args,
            userId,
            userRole,
          );

          messages.push({
            role: 'tool',
            content: JSON.stringify(result),
            tool_call_id: toolCall.id,
          });
        }
        continue;
      }

      return assistantMessage.content || '';
    }

    const fallback = messages[messages.length - 1];
    if (fallback?.role === 'assistant' && fallback.content) {
      return fallback.content;
    }

    return 'I apologize, I took too many steps to answer this. Could you rephrase your question?';
  }

  private async getOrCreateSession(
    userId: string,
    sessionId?: string,
  ): Promise<ChatSession> {
    if (sessionId) {
      const existing = await this.sessionRepo.findOne({
        where: { id: sessionId, userId },
      });
      if (existing) return existing;
    }

    const session = this.sessionRepo.create({ userId });
    return this.sessionRepo.save(session);
  }

  private async buildMessageHistory(sessionId: string): Promise<LLMMessage[]> {
    const recentMessages = await this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      take: HISTORY_LIMIT,
    });

    const history: LLMMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    const sorted = [...recentMessages].reverse();
    for (const msg of sorted) {
      if (msg.role === ChatMessageRole.USER || msg.role === ChatMessageRole.ASSISTANT) {
        history.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    return history;
  }

  private async saveMessage(
    sessionId: string,
    role: ChatMessageRole,
    content: string,
    toolCalls?: any,
    toolResult?: any,
  ): Promise<ChatMessage> {
    const message = this.messageRepo.create({
      sessionId,
      role,
      content,
      toolCalls,
      toolResult,
    });
    return this.messageRepo.save(message);
  }
}
