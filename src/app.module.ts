import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { VerificationModule } from './modules/verification/verification.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { RolesGuard } from './shared/guards/roles.guard';

@Module({
  imports: [
    // ─── Infrastructure ───
    AppConfigModule,
    DatabaseModule,

    // Rate limiting: 100 requests per 60 seconds per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // ─── Feature Modules ───
    AuthModule,
    ProvidersModule,
    DiscoveryModule,
    JobsModule,
    MessagingModule,
    ReviewsModule,
    VerificationModule,
    ChatbotModule,
  ],
  providers: [
    // Apply JWT auth guard globally — use @Public() to opt out
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Apply roles guard globally — use @Roles() to restrict
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
