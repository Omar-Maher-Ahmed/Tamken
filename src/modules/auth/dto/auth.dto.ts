import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@/shared';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'StrongP@ss1', minLength: 8 })
  password: string;

  @ApiProperty({ example: 'Ahmed' })
  firstName: string;

  @ApiProperty({ example: 'Al-Rashid' })
  lastName: string;

  @ApiProperty({ example: '+966501234567', required: false })
  phone?: string;

  @ApiPropertyOptional({
    enum: [UserRole.CUSTOMER, UserRole.PROVIDER],
    example: UserRole.CUSTOMER,
    default: UserRole.CUSTOMER,
  })
  role?: UserRole.CUSTOMER | UserRole.PROVIDER;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'StrongP@ss1' })
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  refreshToken: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  refreshToken: string;

  @ApiProperty({
    example: {
      id: 'uuid',
      email: 'user@example.com',
      firstName: 'Ahmed',
      lastName: 'Al-Rashid',
      role: 'customer',
    },
  })
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}
