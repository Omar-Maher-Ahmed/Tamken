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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatbotService } from './chatbot.service';
import { JwtPayload, UserRole } from '@/shared';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chatbot',
})
export class ChatbotGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatbotGateway.name);

  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

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

      client.data.userId = payload.sub;
      client.data.email = payload.email;
      client.data.role = payload.role;

      this.logger.log(
        `Chatbot client connected: ${client.id} (user=${payload.sub})`,
      );
    } catch (error) {
      this.logger.warn(
        `Unauthorized chatbot connection: ${client.id}`,
      );
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Chatbot client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody()
    data: { content: string; sessionId?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { content, sessionId } = data;
    const userId = client.data.userId;
    const userRole = client.data.role;

    if (!content || content.trim().length === 0) {
      client.emit('error', { message: 'Message content cannot be empty' });
      return;
    }

    client.emit('typing', { active: true });

    try {
      const response = await this.chatbotService.handleMessage(
        userId,
        userRole,
        content.trim(),
        sessionId,
      );

      client.emit('newMessage', {
        sessionId: response.sessionId,
        messageId: response.messageId,
        content: response.content,
        createdAt: response.createdAt,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to process message';
      this.logger.error(`Chatbot error for user ${userId}: ${message}`);
      client.emit('error', { message });
    } finally {
      client.emit('typing', { active: false });
    }
  }

  @SubscribeMessage('getSessions')
  async handleGetSessions(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const sessions = await this.chatbotService.getSessions(
      client.data.userId,
    );
    client.emit('sessions', sessions);
  }

  @SubscribeMessage('getHistory')
  async handleGetHistory(
    @MessageBody()
    data: { sessionId: string; page?: number; limit?: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const result = await this.chatbotService.getSessionMessages(
      data.sessionId,
      client.data.userId,
      data.page,
      data.limit,
    );

    if (!result) {
      client.emit('error', { message: 'Session not found' });
      return;
    }

    client.emit('history', result);
  }

  @SubscribeMessage('deleteSession')
  async handleDeleteSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const deleted = await this.chatbotService.deleteSession(
      data.sessionId,
      client.data.userId,
    );

    client.emit('sessionDeleted', { sessionId: data.sessionId, deleted });
  }
}
