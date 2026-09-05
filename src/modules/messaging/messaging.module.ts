import { MessageRepository } from './repositories/message.repository';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessagingGateway } from './messaging.gateway';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { Message } from '@/modules/messaging';
import { ServiceRequest } from '@/modules/jobs';
import { ProviderProfile } from '@/modules/providers';
import { JobsModule } from '@/modules/jobs/jobs.module';
import { ProvidersModule } from '@/modules/providers/providers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, ServiceRequest, ProviderProfile]),
    JobsModule,
    ProvidersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [MessagingController],
  providers: [MessageRepository, MessagingGateway, MessagingService],
  exports: [MessageRepository, MessagingService],
})
export class MessagingModule {}
