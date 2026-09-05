import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Message } from '../entities/message.entity';

@Injectable()
export class MessageRepository extends Repository<Message> {
  constructor(@InjectEntityManager() manager: EntityManager) {
    super(Message, manager);
  }
}
