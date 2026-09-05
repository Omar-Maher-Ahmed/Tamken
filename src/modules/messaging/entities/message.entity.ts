import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '@/modules/auth/entities/user.entity';
import { ServiceRequest } from '@/modules/jobs/entities/service-request.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  jobId: string;

  @ManyToOne(() => ServiceRequest, (job: any) => job.messages)
  @JoinColumn({ name: 'jobId' })
  job: ServiceRequest;

  @Column()
  senderId: string;

  @ManyToOne(() => User, (user: any) => user.messages)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date;
}
