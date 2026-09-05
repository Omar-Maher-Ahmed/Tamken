import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ServiceRequest } from '../entities/service-request.entity';

@Injectable()
export class ServiceRequestRepository extends Repository<ServiceRequest> {
  constructor(@InjectEntityManager() manager: EntityManager) {
    super(ServiceRequest, manager);
  }
}
