import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';

@Injectable()
export class ChatSessionRepository extends Repository<ChatSession> {
  constructor(@InjectEntityManager() manager: EntityManager) {
    super(ChatSession, manager);
  }
}
