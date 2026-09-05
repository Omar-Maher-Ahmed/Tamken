import { UserRepository } from '@/modules/auth/repositories/user.repository';
import { ProviderProfileRepository } from '@/modules/providers/repositories/provider-profile.repository';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/auth';
import { ProviderProfile } from '@/modules/providers';
import { ServiceCategory } from '@/shared';
import { Point } from 'geojson';

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly providerRepo: ProviderProfileRepository,
  ) {}

  /**
   * Get user by ID (with optional provider profile).
   */
  async findById(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['providerProfile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Update current user's basic profile.
   */
  async updateProfile(
    userId: string,
    updates: { firstName?: string; lastName?: string; phone?: string },
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updates);
    const saved = await this.userRepo.save(user);
    return this.sanitizeUser(saved);
  }

  /**
   * Create a provider profile for the authenticated provider user.
   */
  async createProviderProfile(
    userId: string,
    input: {
      businessName: string;
      bio: string;
      category: string;
      categories?: string[];
      hourlyRate?: number;
      city?: string;
      latitude: number;
      longitude: number;
      portfolioUrls?: string[];
    },
  ) {
    // Check if profile already exists
    const existing = await this.providerRepo.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('Provider profile already exists');
    }

    const location: Point = {
      type: 'Point',
      coordinates: [input.longitude, input.latitude],
    };

    const profile = this.providerRepo.create({
      userId,
      businessName: input.businessName,
      bio: input.bio,
      category: input.category as ServiceCategory,
      categories: input.categories?.length
        ? (input.categories as ServiceCategory[])
        : [input.category as ServiceCategory],
      hourlyRate: input.hourlyRate,
      city: input.city,
      location,
      portfolioUrls: input.portfolioUrls || [],
    });

    return this.providerRepo.save(profile);
  }

  /**
   * Update an existing provider profile.
   */
  async updateProviderProfile(
    userId: string,
    updates: {
      businessName?: string;
      bio?: string;
      category?: string;
      categories?: string[];
      hourlyRate?: number;
      city?: string;
      latitude?: number;
      longitude?: number;
      portfolioUrls?: string[];
    },
  ) {
    const profile = await this.providerRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Provider profile not found');
    }

    if (updates.businessName) profile.businessName = updates.businessName;
    if (updates.bio) profile.bio = updates.bio;
    if (updates.category) profile.category = updates.category as ServiceCategory;
    if (updates.categories?.length) {
      profile.categories = updates.categories as ServiceCategory[];
      profile.category = updates.categories[0] as ServiceCategory;
    }
    if (updates.hourlyRate !== undefined) profile.hourlyRate = updates.hourlyRate;
    if (updates.city !== undefined) profile.city = updates.city;
    if (updates.portfolioUrls) profile.portfolioUrls = updates.portfolioUrls;

    if (updates.latitude !== undefined && updates.longitude !== undefined) {
      profile.location = {
        type: 'Point',
        coordinates: [updates.longitude, updates.latitude],
      };
    }

    return this.providerRepo.save(profile);
  }

  /**
   * Get a provider's public profile by provider profile ID.
   */
  async getProviderById(providerId: string) {
    const profile = await this.providerRepo.findOne({
      where: { id: providerId },
      relations: ['user', 'reviews'],
    });

    if (!profile) {
      throw new NotFoundException('Provider not found');
    }

    return {
      ...profile,
      user: profile.user ? this.sanitizeUser(profile.user) : undefined,
    };
  }

  /**
   * List all active providers with optional category filter + pagination.
   */
  async listProviders(query: {
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);
    const skip = (page - 1) * limit;

    const qb = this.providerRepo
      .createQueryBuilder('provider')
      .leftJoinAndSelect('provider.user', 'user')
      .where('provider.isActive = :isActive', { isActive: true });

    if (query.category) {
      qb.andWhere('provider.category = :category', {
        category: query.category,
      });
    }

    qb.orderBy('provider.avgRating', 'DESC')
      .skip(skip)
      .take(limit);

    const [providers, total] = await qb.getManyAndCount();

    return {
      data: providers.map((p) => ({
        ...p,
        user: p.user ? this.sanitizeUser(p.user) : undefined,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Query used by Discovery. Keeping it here means Discovery stays stateless
   * and owns no persistence model.
   */
  async findActiveForDiscovery(query: {
    category?: ServiceCategory | string;
    city?: string;
    minRating?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const qb = this.providerRepo
      .createQueryBuilder('provider')
      .leftJoinAndSelect('provider.user', 'user')
      .where('provider.isActive = :isActive', { isActive: true });

    if (query.category) {
      qb.andWhere(
        '(provider.category = :category OR provider.categories @> :categories::jsonb)',
        { category: query.category, categories: JSON.stringify([query.category]) },
      );
    }
    if (query.city) {
      qb.andWhere('LOWER(provider.city) = LOWER(:city)', { city: query.city });
    }
    if (query.minRating !== undefined) {
      qb.andWhere('provider.avgRating >= :minRating', {
        minRating: query.minRating,
      });
    }
    if (query.maxPrice !== undefined) {
      qb.andWhere('provider.hourlyRate <= :maxPrice', {
        maxPrice: query.maxPrice,
      });
    }

    const [providers, total] = await qb
      .orderBy('provider.avgRating', 'DESC')
      .addOrderBy('provider.totalReviews', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: providers.map((provider) => ({
        ...provider,
        user: provider.user ? this.sanitizeUser(provider.user) : undefined,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private sanitizeUser(user: User) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
