import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UsePipes,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  updateProfileSchema,
  providerProfileSchema,
  updateProviderProfileSchema,
  UserRole,
} from '@/shared';
import { ProvidersService } from './providers.service';
import {
  UpdateProfileDto,
  CreateProviderProfileDto,
  UpdateProviderProfileDto,
  ProviderQueryDto,
} from './dto/providers.dto';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { Roles } from '@/shared/decorators/roles.decorator';
import { Public } from '@/shared/decorators/public.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe';

@ApiTags('Users')
@ApiBearerAuth()
@Controller()
export class ProvidersController {
  constructor(private readonly usersService: ProvidersService) {}

  // ─── Current User ───

  @Get('users/me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch('users/me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, body);
  }

  // ─── Provider Profile Management ───

  @Post('users/me/provider-profile')
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'Create provider profile (providers only)' })
  @ApiResponse({ status: 201, description: 'Provider profile created' })
  @ApiResponse({ status: 409, description: 'Profile already exists' })
  async createProviderProfile(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(providerProfileSchema)) body: CreateProviderProfileDto,
  ) {
    return this.usersService.createProviderProfile(userId, body);
  }

  @Patch('users/me/provider-profile')
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'Update provider profile (providers only)' })
  @ApiResponse({ status: 200, description: 'Provider profile updated' })
  async updateProviderProfile(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(updateProviderProfileSchema)) body: UpdateProviderProfileDto,
  ) {
    return this.usersService.updateProviderProfile(userId, body);
  }

  // ─── Public Provider Endpoints ───

  @Get('providers')
  @Public()
  @ApiOperation({ summary: 'List all active providers (public)' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated provider list' })
  async listProviders(@Query() query: ProviderQueryDto) {
    return this.usersService.listProviders(query);
  }

  @Get('providers/:id')
  @Public()
  @ApiOperation({ summary: 'Get provider profile by ID (public)' })
  @ApiParam({ name: 'id', description: 'Provider profile UUID' })
  @ApiResponse({ status: 200, description: 'Provider profile with portfolio & ratings' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async getProvider(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getProviderById(id);
  }
}
