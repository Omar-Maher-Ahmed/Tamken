import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ahmed' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Al-Rashid' })
  lastName?: string;

  @ApiPropertyOptional({ example: '+966501234567' })
  phone?: string;
}

export class CreateProviderProfileDto {
  @ApiProperty({ example: 'Ahmed Plumbing Services' })
  businessName: string;

  @ApiProperty({ example: 'Expert plumber with 10 years of experience...' })
  bio: string;

  @ApiProperty({ example: 'plumbing' })
  category: string;

  @ApiPropertyOptional({ type: [String], example: ['plumbing', 'electrical'] })
  categories?: string[];

  @ApiPropertyOptional({ example: 150 })
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 'Riyadh' })
  city?: string;

  @ApiProperty({ example: 24.7136 })
  latitude: number;

  @ApiProperty({ example: 46.6753 })
  longitude: number;

  @ApiPropertyOptional({
    example: ['https://example.com/portfolio1.jpg'],
    type: [String],
  })
  portfolioUrls?: string[];
}

export class UpdateProviderProfileDto {
  @ApiPropertyOptional({ example: 'Ahmed Premium Plumbing' })
  businessName?: string;

  @ApiPropertyOptional({ example: 'Updated bio...' })
  bio?: string;

  @ApiPropertyOptional({ example: 'plumbing' })
  category?: string;

  @ApiPropertyOptional({ type: [String] })
  categories?: string[];

  @ApiPropertyOptional({ example: 150 })
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 'Riyadh' })
  city?: string;

  @ApiPropertyOptional({ example: 24.7136 })
  latitude?: number;

  @ApiPropertyOptional({ example: 46.6753 })
  longitude?: number;

  @ApiPropertyOptional({ type: [String] })
  portfolioUrls?: string[];
}

export class ProviderQueryDto {
  @ApiPropertyOptional({ example: 'plumbing' })
  category?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  limit?: number;
}
