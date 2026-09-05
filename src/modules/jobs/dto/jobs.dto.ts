import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceRequestDto {
  @ApiProperty({ example: 'Fix kitchen sink leak', minLength: 5 })
  title: string;

  @ApiProperty({
    example: 'The kitchen sink has been leaking for 2 days. Need urgent repair.',
    minLength: 20,
  })
  description: string;

  @ApiProperty({ example: 'plumbing' })
  category: string;

  @ApiPropertyOptional({ example: 150.0 })
  budget?: number;

  @ApiPropertyOptional({ example: '2026-09-10T14:00:00Z' })
  scheduledAt?: string;
}

export class UpdateStatusDto {
  @ApiProperty({
    enum: ['accepted', 'in_progress', 'completed', 'cancelled'],
    example: 'accepted',
  })
  status: 'accepted' | 'in_progress' | 'completed' | 'cancelled';
}

export class RequestQueryDto {
  @ApiPropertyOptional({
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
  })
  status?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  limit?: number;
}
