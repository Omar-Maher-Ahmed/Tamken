import { ProviderProfileRepository } from './repositories/provider-profile.repository';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { User } from '@/modules/auth';
import { ProviderProfile } from '@/modules/providers';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, ProviderProfile]), AuthModule],
  controllers: [ProvidersController],
  providers: [ProviderProfileRepository, ProvidersService],
  exports: [ProviderProfileRepository, ProvidersService],
})
export class ProvidersModule {}
