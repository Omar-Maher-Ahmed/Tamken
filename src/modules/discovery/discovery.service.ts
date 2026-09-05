import { Injectable } from '@nestjs/common';
import { ProvidersService } from '@/modules/providers/providers.service';
import { ServiceCategory } from '@/shared';

@Injectable()
export class DiscoveryService {
  constructor(private readonly providersService: ProvidersService) {}

  /**
   * Discovery owns no table. A cache or PostGIS-specific implementation can
   * later be introduced here without changing its HTTP contract.
   */
  async searchProviders(query: {
    category?: ServiceCategory | string;
    city?: string;
    minRating?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }) {
    return this.providersService.findActiveForDiscovery(query);
  }
}
