import { describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { RequestStatus, UserRole } from '@/shared';

const makeJob = (status: RequestStatus = RequestStatus.PENDING) => ({
  id: 'job-id',
  customerId: 'customer-id',
  providerId: 'provider-id',
  status,
});

describe('JobsService authorization and state transitions', () => {
  it('does not disclose a job to an unrelated customer', async () => {
    const requestRepo = { findOne: jest.fn<(...args: any[]) => any>().mockResolvedValue(makeJob()) };
    const providerRepo = { findOne: jest.fn<(...args: any[]) => any>() };
    const service = new JobsService(requestRepo as never, providerRepo as never);

    await expect(
      service.getRequestById('job-id', 'another-customer', UserRole.CUSTOMER),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a state transition that skips the lifecycle', async () => {
    const requestRepo = {
      findOne: jest.fn<(...args: any[]) => any>().mockResolvedValue(makeJob()),
      save: jest.fn<(...args: any[]) => any>(),
    };
    const providerRepo = { findOne: jest.fn<(...args: any[]) => any>() };
    const service = new JobsService(requestRepo as never, providerRepo as never);

    await expect(
      service.updateStatus(
        'job-id',
        'admin-id',
        UserRole.ADMIN,
        RequestStatus.COMPLETED,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(requestRepo.save).not.toHaveBeenCalled();
  });

  it('allows the assigned provider to accept a pending job', async () => {
    const job = makeJob();
    const requestRepo = {
      findOne: jest.fn<(...args: any[]) => any>().mockResolvedValue(job),
      save: jest.fn<(...args: any[]) => any>().mockResolvedValue(job),
    };
    const providerRepo = {
      findOne: jest.fn<(...args: any[]) => any>().mockResolvedValue({ id: 'provider-id' }),
    };
    const service = new JobsService(requestRepo as never, providerRepo as never);

    await expect(
      service.updateStatus(
        'job-id',
        'provider-user-id',
        UserRole.PROVIDER,
        RequestStatus.ACCEPTED,
      ),
    ).resolves.toMatchObject({ status: RequestStatus.ACCEPTED });
    expect(requestRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: RequestStatus.ACCEPTED }),
    );
  });
});
