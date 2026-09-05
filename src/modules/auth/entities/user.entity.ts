import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { UserRole } from '@/shared';
import { ProviderProfile } from '@/modules/providers/entities/provider-profile.entity';
import { ServiceRequest } from '@/modules/jobs/entities/service-request.entity';
import { Review } from '@/modules/reviews/entities/review.entity';
import { Message } from '@/modules/messaging/entities/message.entity';
import { RefreshToken } from './refresh-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column()
  passwordHash: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column({ default: false })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ─── Relations ───

  @OneToOne(() => ProviderProfile, (profile) => profile.user)
  providerProfile: ProviderProfile;

  @OneToMany(() => ServiceRequest, (req: any) => req.customer)
  customerRequests: ServiceRequest[];

  @OneToMany(() => Review, (review: any) => review.customer)
  reviews: Review[];

  @OneToMany(() => Message, (message: any) => message.sender)
  messages: Message[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];
}
