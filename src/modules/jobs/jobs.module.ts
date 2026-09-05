import { ServiceRequestRepository } from './repositories/service-request.repository';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { ServiceRequest } from '@/modules/jobs';
import { ProviderProfile } from '@/modules/providers';
import { ProvidersModule } from '@/modules/providers/providers.module';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceRequest, ProviderProfile]), ProvidersModule],
  controllers: [JobsController],
  providers: [ServiceRequestRepository, JobsService],
  exports: [ServiceRequestRepository, JobsService],
})
export class JobsModule {}
