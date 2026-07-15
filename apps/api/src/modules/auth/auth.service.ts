import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthProvider, Role, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from './token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { slugify } from '../../common/utils/slug.util';

interface RequestContext {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  private sanitize(user: Record<string, unknown> | User) {
    const { passwordHash, ...rest } = user as User & Record<string, unknown>;
    return rest;
  }

  private async buildSession(user: User, ctx?: RequestContext) {
    const full = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
        reputation: true,
        business: { select: { id: true, slug: true, name: true, verification: true } },
        businessSubscription: true,
      },
    });
    const pair = await this.tokens.issueTokens(
      { sub: user.id, email: user.email, username: user.username, role: user.role },
      ctx,
    );
    return { user: this.sanitize(full ?? user), ...pair };
  }

  async register(dto: RegisterDto, ctx?: RequestContext) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException('Email or username is already taken');
    }

    const passwordHash = await this.tokens.hashPassword(dto.password);
    // Business role is granted only after the 10 GEL/month subscription is paid.
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
        role: Role.USER,
        profile: { create: { displayName: dto.displayName } },
        reputation: { create: {} },
        ...(dto.asBusiness
          ? {
              businessSubscription: {
                create: {
                  status: 'PENDING',
                  amount: 10,
                  currency: 'GEL',
                  interval: 'month',
                },
              },
            }
          : {}),
      },
      include: { businessSubscription: true },
    });

    return this.buildSession(user, ctx);
  }

  async login(dto: LoginDto, ctx?: RequestContext) {
    const identifier = dto.email.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { username: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.isBanned || !user.isActive) {
      throw new ForbiddenException('This account is disabled');
    }

    const valid = await this.tokens.verifyPassword(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.buildSession(user, ctx);
  }

  async refresh(refreshToken: string, ctx?: RequestContext) {
    let payload;
    try {
      payload = await this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const stored = await this.tokens.findStoredToken(refreshToken);
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    // Rotate: revoke the old token before issuing a new pair.
    await this.tokens.revokeToken(refreshToken);

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.isBanned || !user.isActive) {
      throw new UnauthorizedException('Account unavailable');
    }

    return this.buildSession(user, ctx);
  }

  async logout(refreshToken: string) {
    if (refreshToken) await this.tokens.revokeToken(refreshToken);
    return { message: 'Logged out' };
  }

  async validateGoogleUser(
    profile: { providerId: string; email: string; displayName: string; avatarUrl?: string },
    ctx?: RequestContext,
  ) {
    let account = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: AuthProvider.GOOGLE,
          providerAccountId: profile.providerId,
        },
      },
      include: { user: true },
    });

    if (account) {
      return this.buildSession(account.user, ctx);
    }

    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });

    if (!user) {
      const baseUsername = slugify(profile.displayName).replace(/-/g, '') || 'user';
      let username = baseUsername;
      let n = 0;
      while (await this.prisma.user.findUnique({ where: { username } })) {
        n += 1;
        username = `${baseUsername}${n}`;
      }
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          username,
          emailVerified: true,
          role: Role.USER,
          profile: {
            create: { displayName: profile.displayName, avatarUrl: profile.avatarUrl },
          },
          reputation: { create: {} },
        },
      });
    }

    await this.prisma.oAuthAccount.create({
      data: {
        provider: AuthProvider.GOOGLE,
        providerAccountId: profile.providerId,
        userId: user.id,
      },
    });

    return this.buildSession(user, ctx);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        reputation: true,
        business: { select: { id: true, slug: true, name: true, verification: true } },
        businessSubscription: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    return this.sanitize(user);
  }
}
