import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';

import { EmailService } from '../email/email.service';

import { UserService } from '../../features/user/application/user.service';
import type { PublicUser } from '../../features/user/application/user.service';
import { PrismaService } from '../../prisma/prisma.service';

import { jwtExpiresSecondsFromEnv } from './jwt-expires.util';

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export type OAuthTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(PrismaService) private readonly prisma: PrismaClient,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
  ) {}

  async verifyPassword(plain: string, storedHash: string): Promise<boolean> {
    if (storedHash.startsWith('$2')) {
      return bcrypt.compare(plain, storedHash);
    }
    const legacy = sha256Hex(plain);
    return legacy === storedHash;
  }

  async login(
    email: string,
    password: string,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<OAuthTokenResponse & { user: PublicUser }> {
    const normalized = email.trim().toLowerCase();
    const user = await this.userService.findByEmail(normalized);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await this.verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(
        'Please verify your email before signing in. Check your inbox for the activation link.',
      );
    }
    const tokens = await this.issueTokensForUser(user.id, user.email, meta);
    return { ...tokens, user: this.userService.toPublicUser(user) };
  }

  async issueTokensForUser(
    userId: string,
    email: string,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<OAuthTokenResponse> {
    const access_token = await this.jwtService.signAsync({
      sub: userId,
      email,
    });
    const refreshRaw = randomBytes(48).toString('base64url');
    const refreshTokenHash = sha256Hex(refreshRaw);
    const expiresAt = this.refreshExpiresAt();
    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt,
        userAgent: meta?.userAgent ?? null,
        ip: meta?.ip ?? null,
      },
    });
    return {
      access_token,
      refresh_token: refreshRaw,
      token_type: 'Bearer',
      expires_in: jwtExpiresSecondsFromEnv(),
    };
  }

  async refresh(refreshToken: string): Promise<OAuthTokenResponse> {
    const hash = sha256Hex(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hash },
      include: { user: true },
    });
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      if (session) {
        await this.prisma.session
          .delete({ where: { id: session.id } })
          .catch(() => undefined);
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.prisma.session.delete({ where: { id: session.id } });
    return this.issueTokensForUser(session.userId, session.user.email);
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = sha256Hex(refreshToken);
    await this.prisma.session.deleteMany({ where: { refreshTokenHash: hash } });
  }

  private refreshExpiresAt(): Date {
    const days = Number(process.env.JWT_REFRESH_EXPIRES_DAYS ?? 7);
    return new Date(Date.now() + Math.max(1, days) * 86400000);
  }

  async sendSignupVerificationEmail(
    userId: string,
    email: string,
    firstName: string,
  ): Promise<void> {
    if (!this.emailService.isConfigured()) {
      throw new ServiceUnavailableException(
        'Email is not configured on the server. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL.',
      );
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = sha256Hex(rawToken);
    const hours = Number(process.env.EMAIL_VERIFICATION_EXPIRES_HOURS ?? 48);
    const expiresAt = new Date(
      Date.now() + Math.max(1, hours) * 3600000,
    );

    await this.prisma.emailVerificationToken.deleteMany({ where: { userId } });
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    const webBase =
      process.env.WEB_APP_URL?.trim().replace(/\/$/, '') ||
      'http://localhost:4200';
    const link = `${webBase}/verify-email?token=${encodeURIComponent(rawToken)}`;
    const greeting = firstName.trim() || 'there';

    await this.emailService.send({
      to: email,
      subject: 'Potvrdite email za Reinova',
      text: [
        `Zdravo ${greeting},`,
        '',
        'Kliknite na link da aktivirate račun:',
        link,
        '',
        'Ako niste tražili ovaj račun, ignorišite ovaj email.',
      ].join('\n'),
      html: `<p>Zdravo ${greeting},</p><p>Kliknite na link da aktivirate račun:</p><p><a href="${link}">${link}</a></p><p>Ako niste tražili ovaj račun, ignorišite ovaj email.</p>`,
    });
  }

  async verifyEmailWithToken(rawToken: string): Promise<void> {
    const token = rawToken?.trim();
    if (!token) {
      throw new BadRequestException('token is required');
    }
    const tokenHash = sha256Hex(token);
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });
    if (!record || record.usedAt) {
      throw new BadRequestException('Invalid or already used verification link');
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Verification link has expired');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  async deleteRegistrationUser(userId: string): Promise<void> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    if (!row) {
      return;
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
      await tx.company.delete({ where: { id: row.companyId } });
    });
  }
}
