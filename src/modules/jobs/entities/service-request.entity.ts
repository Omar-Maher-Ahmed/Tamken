import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { RequestStatus, ServiceCategory } from '@/shared';
import { User } from '@/modules/auth/entities/user.entity';
import { ProviderProfile } from '@/modules/providers/entities/provider-profile.entity';
import { Message } from '@/modules/messaging/entities/message.entity';
import { Review } from '@/modules/reviews/entities/review.entity';

@Entity('service_requests')
export class ServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @ManyToOne(() => User, (user: any) => user.customerRequests)
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @Column()
  providerId: string;

  @ManyToOne(() => ProviderProfile, (provider: any) => provider.serviceRequests)
  @JoinColumn({ name: 'providerId' })
  provider: ProviderProfile;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING,
  })
  status: RequestStatus;

  @Column({
    type: 'enum',
    enum: ServiceCategory,
    default: ServiceCategory.OTHER,
  })
  category: ServiceCategory;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  budget: number;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ─── Relations ───

  @OneToMany(() => Message, (message: any) => message.job)
  messages: Message[];

  @OneToOne(() => Review, (review: any) => review.job)
  review: Review;
}
