import {
  Controller,
  Post,
  Get,
  Patch,
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
  createServiceRequestSchema,
  updateStatusSchema,
  UserRole,
} from '@/shared';
import { JobsService } from './jobs.service';
import {
  CreateServiceRequestDto,
  UpdateStatusDto,
  RequestQueryDto,
} from './dto/jobs.dto';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { Roles } from '@/shared/decorators/roles.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe';

@ApiTags('Jobs / Service Requests')
@ApiBearerAuth()
@Controller()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('providers/:id/request')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Submit a service request to a provider (customers only)' })
  @ApiParam({ name: 'id', description: 'Provider profile UUID' })
  @ApiResponse({ status: 201, description: 'Service request created' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async createRequest(
    @Param('id', ParseUUIDPipe) providerId: string,
    @CurrentUser('id') customerId: string,
    @Body(new ZodValidationPipe(createServiceRequestSchema)) body: CreateServiceRequestDto,
  ) {
    return this.jobsService.createServiceRequest(customerId, providerId, body);
  }

  @Get('requests')
  @ApiOperation({
    summary: 'List service requests (filtered by role)',
    description:
      'Customers see their own requests. Providers see assigned requests. Admins see all.',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of service requests' })
  async listRequests(
    @CurrentUser() user: { id: string; role: string },
    @Query() query: RequestQueryDto,
  ) {
    return this.jobsService.listRequests(user.id, user.role, query);
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get a single service request by ID' })
  @ApiParam({ name: 'id', description: 'Service request UUID' })
  @ApiResponse({ status: 200, description: 'Service request details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.jobsService.getRequestById(id, user.id, user.role);
  }

  @Patch('requests/:id/status')
  @ApiOperation({
    summary: 'Update service request status',
    description:
      'Transitions: pending→accepted→in_progress→completed. Cancellation allowed at most stages.',
  })
  @ApiParam({ name: 'id', description: 'Service request UUID' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 403, description: 'Not authorized for this transition' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: { id: string; role: string },
    @Body(new ZodValidationPipe(updateStatusSchema)) body: UpdateStatusDto,
  ) {
    return this.jobsService.updateStatus(
      requestId,
      user.id,
      user.role,
      body.status,
    );
  }
}
