import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '@/modules/auth/entities/user.entity';
import { ProviderProfile } from '@/modules/providers/entities/provider-profile.entity';
import { ServiceRequest } from '@/modules/jobs/entities/service-request.entity';

@Entity('reviews')
@Unique(['jobId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  jobId: string;

  @OneToOne(() => ServiceRequest, (job: any) => job.review)
  @JoinColumn({ name: 'jobId' })
  job: ServiceRequest;

  @Column()
  customerId: string;

  @ManyToOne(() => User, (user: any) => user.reviews)
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @Column()
  providerId: string;

  @ManyToOne(() => ProviderProfile, (provider: any) => provider.reviews)
  @JoinColumn({ name: 'providerId' })
  provider: ProviderProfile;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;
}
