import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ChatMessage } from '../entities/chat-message.entity';

@Injectable()
export class ChatMessageRepository extends Repository<ChatMessage> {
  constructor(@InjectEntityManager() manager: EntityManager) {
    super(ChatMessage, manager);
  }
}
