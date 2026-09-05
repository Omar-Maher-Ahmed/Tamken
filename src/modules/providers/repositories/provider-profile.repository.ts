import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ProviderProfile } from '../entities/provider-profile.entity';

@Injectable()
export class ProviderProfileRepository extends Repository<ProviderProfile> {
  constructor(@InjectEntityManager() manager: EntityManager) {
    super(ProviderProfile, manager);
  }
}
