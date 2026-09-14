import { ChatSessionRepository } from './repositories/chat-session.repository';
import { ChatMessageRepository } from './repositories/chat-message.repository';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatbotGateway } from './chatbot.gateway';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { LLMService } from './llm/llm.service';
import { ToolExecutor } from './tools/tool-executor';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ProvidersModule } from '@/modules/providers/providers.module';
import { JobsModule } from '@/modules/jobs/jobs.module';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession, ChatMessage]),
    ProvidersModule,
    JobsModule,
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [ChatbotController],
  providers: [
    ChatSessionRepository,
    ChatMessageRepository,
    ChatbotGateway,
    ChatbotService,
    LLMService,
    ToolExecutor,
  ],
  exports: [ChatbotService],
})
export class ChatbotModule {}
