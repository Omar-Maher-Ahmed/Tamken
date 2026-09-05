import { ProviderProfileRepository } from '@/modules/providers/repositories/provider-profile.repository';
import { ServiceRequestRepository } from '@/modules/jobs/repositories/service-request.repository';
import { MessageRepository } from '@/modules/messaging/repositories/message.repository';
import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '@/modules/messaging';
import { ServiceRequest } from '@/modules/jobs';
import { ProviderProfile } from '@/modules/providers';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly requestRepo: ServiceRequestRepository,
    private readonly providerRepo: ProviderProfileRepository,
  ) {}

  /**
   * Verify that a user is a participant in a job (customer or provider).
   */
  async verifyParticipant(jobId: string, userId: string): Promise<boolean> {
    const request = await this.requestRepo.findOne({
      where: { id: jobId },
      relations: ['provider'],
    });

    if (!request) return false;

    // Check if user is the customer
    if (request.customerId === userId) return true;

    // Check if user is the provider (need to look up via provider profile)
    if (request.provider) {
      const profile = await this.providerRepo.findOne({
        where: { id: request.providerId },
      });
      if (profile && profile.userId === userId) return true;
    }

    return false;
  }

  /**
   * Save a message to the database.
   */
  async saveMessage(jobId: string, senderId: string, content: string) {
    const isParticipant = await this.verifyParticipant(jobId, senderId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this job');
    }

    const message = this.messageRepo.create({
      jobId,
      senderId,
      content,
    });

    const saved = await this.messageRepo.save(message);
    this.logger.debug(`Message saved: ${saved.id} in job ${jobId}`);
    return saved;
  }

  /**
   * Get chat history for a job (paginated, oldest first).
   */
  async getChatHistory(
    jobId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    // Verify participant
    const isParticipant = await this.verifyParticipant(jobId, userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this job');
    }

    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const [messages, total] = await this.messageRepo.findAndCount({
      where: { jobId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
      skip,
      take: safeLimit,
    });

    return {
      data: messages.map((msg) => ({
        id: msg.id,
        jobId: msg.jobId,
        senderId: msg.senderId,
        senderName: msg.sender
          ? `${msg.sender.firstName} ${msg.sender.lastName}`
          : undefined,
        content: msg.content,
        createdAt: msg.createdAt,
        readAt: msg.readAt,
      })),
      meta: {
        page,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Mark messages as read.
   */
  async markAsRead(jobId: string, userId: string) {
    const isParticipant = await this.verifyParticipant(jobId, userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this job');
    }

    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ readAt: new Date() })
      .where('jobId = :jobId AND senderId != :userId AND readAt IS NULL', {
        jobId,
        userId,
      })
      .execute();
  }
}
