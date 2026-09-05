import { UserRepository } from '@/modules/auth/repositories/user.repository';
import { RefreshTokenRepository } from '@/modules/auth/repositories/refresh-token.repository';
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@/modules/auth';
import { RefreshToken } from '@/modules/auth';
import { UserRole, JwtPayload, RegisterInput, LoginInput } from '@/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    private readonly userRepo: UserRepository,
    private readonly refreshTokenRepo: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a new user (customer or provider).
   */
  async register(input: RegisterInput) {
    const email = input.email.toLowerCase().trim();
    // Check if email already exists
    const existing = await this.userRepo.findOne({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, this.BCRYPT_ROUNDS);

    // Create user
    const user = this.userRepo.create({
      email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      role: input.role ?? UserRole.CUSTOMER,
    });

    const savedUser = await this.userRepo.save(user);
    this.logger.log(`User registered: ${savedUser.email} (${savedUser.role})`);

    // Issue tokens
    const tokens = await this.issueTokenPair(savedUser);

    return {
      ...tokens,
      user: this.sanitizeUser(savedUser),
    };
  }

  /**
   * Authenticate user by email + password.
   */
  async login(input: LoginInput) {
    const user = await this.userRepo.findOne({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      input.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Issue tokens
    const tokens = await this.issueTokenPair(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Refresh access token using a valid refresh token.
   */
  async refreshTokens(refreshToken: string) {
    const [tokenId, tokenSecret] = refreshToken.split('.');
    if (!tokenId || !tokenSecret) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const storedToken = await this.refreshTokenRepo.findOne({
      where: { id: tokenId },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    const isTokenValid = storedToken
      ? await bcrypt.compare(tokenSecret, storedToken.tokenHash)
      : false;
    if (
      !storedToken ||
      !isTokenValid ||
      storedToken.revokedAt ||
      storedToken.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke atomically so concurrent refresh requests cannot both succeed.
    const revokeResult = await this.refreshTokenRepo
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('id = :id', { id: storedToken.id })
      .andWhere('revokedAt IS NULL')
      .execute();
    if (revokeResult.affected !== 1) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepo.findOne({
      where: { id: storedToken.userId },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Issue new token pair
    const tokens = await this.issueTokenPair(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Revoke all refresh tokens for a user (logout).
   */
  async logout(userId: string) {
    await this.refreshTokenRepo
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('userId = :userId', { userId })
      .andWhere('revokedAt IS NULL')
      .execute();
  }

  // ─── Private Helpers ───

  private async issueTokenPair(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
    });

    // An opaque token is stored as "record-id.secret": the record id makes a
    // lookup possible while the secret itself is persisted only as a bcrypt hash.
    const tokenSecret = uuidv4();
    const refreshTokenEntity = this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash: await this.hashToken(tokenSecret),
      expiresAt: this.getRefreshTokenExpiry(),
    });
    const savedRefreshToken = await this.refreshTokenRepo.save(refreshTokenEntity);
    const refreshToken = `${savedRefreshToken.id}.${tokenSecret}`;

    return { accessToken, refreshToken };
  }

  private async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  private getRefreshTokenExpiry(): Date {
    const expiration = this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION',
      '7d',
    );
    const match = /^(\d+)([smhd])$/.exec(expiration);
    if (!match) {
      throw new Error('JWT_REFRESH_EXPIRATION must use a format such as 7d or 12h');
    }

    const value = Number(match[1]);
    const unitInMs: Record<string, number> = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return new Date(Date.now() + value * unitInMs[match[2]]);
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }
}
