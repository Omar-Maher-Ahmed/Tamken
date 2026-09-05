import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchQueryDto {
  @ApiPropertyOptional({ example: 'plumbing', description: 'Service category filter' })
  category?: string;

  @ApiPropertyOptional({ example: 'Riyadh' })
  city?: string;

  @ApiPropertyOptional({ example: 4, minimum: 0, maximum: 5 })
  minRating?: number;

  @ApiPropertyOptional({ example: 200, minimum: 0 })
  maxPrice?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  limit?: number;
}
