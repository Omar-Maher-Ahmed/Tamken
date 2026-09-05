import { z } from 'zod';
import {
  DocumentType,
  RequestStatus,
  ServiceCategory,
  UserRole,
} from '../types';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().optional(),
  // Public registration must never be able to create an administrator.
  role: z.enum([UserRole.CUSTOMER, UserRole.PROVIDER]).default(UserRole.CUSTOMER),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().optional(),
});

export const providerProfileSchema = z.object({
  businessName: z.string().trim().min(2).max(200),
  bio: z.string().trim().min(10),
  category: z.nativeEnum(ServiceCategory),
  categories: z.array(z.nativeEnum(ServiceCategory)).min(1).optional(),
  hourlyRate: z.coerce.number().positive().optional(),
  city: z.string().trim().min(2).max(100).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  portfolioUrls: z.array(z.string().url()).optional(),
});

export const updateProviderProfileSchema = providerProfileSchema.partial();

export const searchQuerySchema = z.object({
  category: z.nativeEnum(ServiceCategory).optional(),
  city: z.string().trim().min(2).max(100).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPrice: z.coerce.number().positive().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().default(20),
});

export const createServiceRequestSchema = z.object({
  title: z.string().trim().min(5).max(200),
  category: z.nativeEnum(ServiceCategory),
  description: z.string().trim().min(20),
  budget: z.coerce.number().positive().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const updateServiceRequestSchema = createServiceRequestSchema.partial().extend({
  status: z.nativeEnum(RequestStatus).optional(),
});

export const createReviewSchema = z.object({
  jobId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(5).optional(),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(RequestStatus),
});

export const submitVerificationDocumentSchema = z.object({
  documentType: z.nativeEnum(DocumentType),
  documentUrl: z.string().url(),
});

export const reviewVerificationDocumentSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
    rejectionReason: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'rejected' && !value.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rejection reason is required when rejecting a document',
        path: ['rejectionReason'],
      });
    }
  });
