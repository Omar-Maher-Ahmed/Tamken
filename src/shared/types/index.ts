export enum UserRole {
  CUSTOMER = 'customer',
  PROVIDER = 'provider',
  ADMIN = 'admin',
}

export enum ServiceCategory {
  CLEANING = 'cleaning',
  PLUMBING = 'plumbing',
  ELECTRICAL = 'electrical',
  CARPENTRY = 'carpentry',
  PAINTING = 'painting',
  MOVING = 'moving',
  OTHER = 'other',
}

export enum RequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum DocumentType {
  ID_CARD = 'id_card',
  PASSPORT = 'passport',
  CERTIFICATE = 'certificate',
  OTHER = 'other',
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole.CUSTOMER | UserRole.PROVIDER;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const VALID_STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.PENDING]: [RequestStatus.ACCEPTED, RequestStatus.CANCELLED],
  [RequestStatus.ACCEPTED]: [RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED],
  [RequestStatus.IN_PROGRESS]: [RequestStatus.COMPLETED, RequestStatus.CANCELLED],
  [RequestStatus.COMPLETED]: [],
  [RequestStatus.CANCELLED]: [],
};
