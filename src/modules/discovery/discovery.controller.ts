import { Controller, Get, Query, UsePipes } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { searchQuerySchema } from '@/shared';
import { DiscoveryService } from './discovery.service';
import { SearchQueryDto } from './dto/discovery.dto';
import { Public } from '@/shared/decorators/public.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe';

@ApiTags('Discovery')
@Controller('search')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Search active providers',
    description:
      'Filters active providers by category, city, minimum rating, and maximum hourly price.',
  })
  @ApiQuery({ name: 'category', required: false, example: 'plumbing' })
  @ApiQuery({ name: 'city', required: false, example: 'Riyadh' })
  @ApiQuery({ name: 'minRating', type: Number, required: false, example: 4 })
  @ApiQuery({ name: 'maxPrice', type: Number, required: false, example: 200 })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated list of matching providers' })
  async search(@Query(new ZodValidationPipe(searchQuerySchema)) query: SearchQueryDto) {
    return this.discoveryService.searchProviders(query);
  }
}
