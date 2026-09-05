import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { VerificationDocument } from '../entities/verification-document.entity';

@Injectable()
export class VerificationDocumentRepository extends Repository<VerificationDocument> {
  constructor(@InjectEntityManager() manager: EntityManager) {
    super(VerificationDocument, manager);
  }
}
