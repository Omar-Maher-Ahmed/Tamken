import { VerificationDocumentRepository } from './repositories/verification-document.repository';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { VerificationDocument } from '@/modules/verification';
import { ProviderProfile } from '@/modules/providers';
import { User } from '@/modules/auth';
import { AuthModule } from '@/modules/auth/auth.module';
import { ProvidersModule } from '@/modules/providers/providers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationDocument, ProviderProfile, User]),
    AuthModule,
    ProvidersModule,
  ],
  controllers: [VerificationController],
  providers: [VerificationDocumentRepository, VerificationService],
  exports: [VerificationDocumentRepository, VerificationService],
})
export class VerificationModule {}
