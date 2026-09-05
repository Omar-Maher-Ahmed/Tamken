import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagingService } from './messaging.service';
import { JwtPayload } from '@/shared';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    email: string;
    role: string;
  };
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);

  constructor(
    private readonly messagingService: MessagingService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Authenticate user during WebSocket handshake using JWT from auth header or query.
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        client.handshake.query?.token;

      if (!token) {
        throw new WsException('No authentication token provided');
      }

      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Attach user info to socket
      client.data.userId = payload.sub;
      client.data.email = payload.email;
      client.data.role = payload.role;

      this.logger.log(
        `Client connected: ${client.id} (user=${payload.sub})`,
      );
    } catch (error) {
      this.logger.warn(`Unauthorized WebSocket connection: ${client.id}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Join a chat room scoped to a job.
   * Only job participants (customer + assigned provider) can join.
   */
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: { jobId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { jobId } = data;
    const userId = client.data.userId;

    // Verify the user is a participant in this job
    const isParticipant = await this.messagingService.verifyParticipant(
      jobId,
      userId,
    );

    if (!isParticipant) {
      client.emit('error', {
        message: 'You are not a participant in this job',
      });
      return;
    }

    const roomName = `job:${jobId}`;
    client.join(roomName);

    // Mark existing messages as read
    await this.messagingService.markAsRead(jobId, userId);

    client.emit('joinedRoom', { jobId, roomName });
    this.logger.debug(
      `User ${userId} joined room ${roomName}`,
    );
  }

  /**
   * Leave a chat room.
   */
  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() data: { jobId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const roomName = `job:${data.jobId}`;
    client.leave(roomName);
    client.emit('leftRoom', { jobId: data.jobId });
  }

  /**
   * Send a message in a job chat room.
   * Persists to DB and broadcasts to all room members.
   */
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { jobId: string; content: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { jobId, content } = data;
    const userId = client.data.userId;

    if (!content || content.trim().length === 0) {
      client.emit('error', { message: 'Message content cannot be empty' });
      return;
    }

    // Verify participation
    const isParticipant = await this.messagingService.verifyParticipant(
      jobId,
      userId,
    );
    if (!isParticipant) {
      client.emit('error', { message: 'You are not a participant in this job' });
      return;
    }

    // Persist message
    const saved = await this.messagingService.saveMessage(
      jobId,
      userId,
      content.trim(),
    );

    // Broadcast to room
    const roomName = `job:${jobId}`;
    this.server.to(roomName).emit('newMessage', {
      id: saved.id,
      jobId: saved.jobId,
      senderId: saved.senderId,
      content: saved.content,
      createdAt: saved.createdAt,
    });
  }

  /**
   * Typing indicator — broadcast to other room members.
   */
  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { jobId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const isParticipant = await this.messagingService.verifyParticipant(
      data.jobId,
      client.data.userId,
    );
    if (!isParticipant) {
      client.emit('error', { message: 'You are not a participant in this job' });
      return;
    }

    const roomName = `job:${data.jobId}`;
    client.to(roomName).emit('typing', {
      jobId: data.jobId,
      userId: client.data.userId,
    });
  }
}
