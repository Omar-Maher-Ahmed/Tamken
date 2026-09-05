import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Point } from 'geojson';
import { ServiceCategory } from '@/shared';
import { User } from '@/modules/auth/entities/user.entity';
import { ServiceRequest } from '@/modules/jobs/entities/service-request.entity';
import { Review } from '@/modules/reviews/entities/review.entity';

@Entity('provider_profiles')
@Index(['isActive', 'city', 'avgRating'])
export class ProviderProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @OneToOne(() => User, (user: any) => user.providerProfile)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 200 })
  businessName: string;

  @Column({ type: 'text' })
  bio: string;

  @Column({
    type: 'enum',
    enum: ServiceCategory,
    default: ServiceCategory.OTHER,
  })
  category: ServiceCategory;

  @Column({ type: 'jsonb', default: [] })
  categories: ServiceCategory[];

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  hourlyRate: number;

  @Index()
  @Column({ length: 100, nullable: true })
  city: string;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  location: Point;

  @Column({ type: 'jsonb', default: [] })
  portfolioUrls: string[];

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  avgRating: number;

  @Column({ default: 0 })
  totalReviews: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ─── Relations ───

  @OneToMany(() => ServiceRequest, (req: any) => req.provider)
  serviceRequests: ServiceRequest[];

  @OneToMany(() => Review, (review: any) => review.provider)
  reviews: Review[];
}
