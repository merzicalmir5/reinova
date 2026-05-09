import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthService } from './auth.service';
import type { JwtValidatedUser } from './jwt.strategy';
import { UserService } from '../../features/user/application/user.service';

type LoginBody = {
  email?: string;
  password?: string;
};

type RefreshBody = {
  refresh_token?: string;
};

type LogoutBody = {
  refresh_token?: string;
};

@Controller('authorization')
export class AuthorizationController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Get('health')
  health() {
    return { module: 'authorization', status: 'ok' };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginBody, @Req() req: Request) {
    const err = this.validateLogin(body);
    if (err) {
      throw new BadRequestException(err);
    }
    return this.authService.login(body.email!.trim(), body.password!, {
      userAgent:
        typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent']
          : undefined,
      ip: req.ip,
    });
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: RefreshBody) {
    const token = body.refresh_token?.trim();
    if (!token) {
      throw new BadRequestException('refresh_token is required');
    }
    return this.authService.refresh(token);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() body: LogoutBody) {
    const token = body.refresh_token?.trim();
    if (!token) {
      throw new BadRequestException('refresh_token is required');
    }
    await this.authService.logout(token);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@Req() req: Request & { user: JwtValidatedUser }) {
    const user = await this.userService.findById(req.user.userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.userService.toPublicUser(user);
  }

  @Post('register')
  async register(@Body() payload: RegisterDto) {
    const validationError = this.validatePayload(payload);
    if (validationError) {
      throw new BadRequestException(validationError);
    }

    if (payload.password !== payload.retypePassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existing = await this.userService.findByEmail(payload.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.userService.register({
      companyName: payload.companyName,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      password: payload.password,
    });

    try {
      await this.authService.sendSignupVerificationEmail(
        user.id,
        user.email,
        user.firstName,
      );
    } catch (err) {
      await this.authService.deleteRegistrationUser(user.id);
      if (err instanceof ServiceUnavailableException) {
        throw err;
      }
      throw new ServiceUnavailableException(
        'Could not send verification email. Please try again later.',
      );
    }

    const fresh = await this.userService.findById(user.id);
    if (!fresh) {
      throw new ConflictException('Registration failed');
    }

    return {
      message:
        'Registration successful. Check your email and click the link to activate your account.',
      user: this.userService.toPublicUser(fresh),
      emailSent: true,
    };
  }

  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(@Body() body: VerifyEmailDto) {
    const token = body.token?.trim();
    if (!token) {
      throw new BadRequestException('token is required');
    }
    await this.authService.verifyEmailWithToken(token);
    return {
      message: 'Email verified. You can sign in.',
    };
  }

  private validateLogin(body: LoginBody): string | null {
    const email = body.email?.trim();
    const password = body.password ?? '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'email must be valid';
    }
    if (password.length < 6) {
      return 'password must contain at least 6 characters';
    }
    return null;
  }

  private validatePayload(payload: RegisterDto): string | null {
    const companyName = payload.companyName?.trim();
    const firstName = payload.firstName?.trim();
    const lastName = payload.lastName?.trim();
    const email = payload.email?.trim();
    const password = payload.password ?? '';
    const retypePassword = payload.retypePassword ?? '';

    if (!companyName || companyName.length < 2) {
      return 'companyName must contain at least 2 characters';
    }
    if (!firstName || firstName.length < 2) {
      return 'firstName must contain at least 2 characters';
    }
    if (!lastName || lastName.length < 2) {
      return 'lastName must contain at least 2 characters';
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'email must be valid';
    }
    if (password.length < 6 || retypePassword.length < 6) {
      return 'password and retypePassword must contain at least 6 characters';
    }
    if (payload.acceptTerms !== true) {
      return 'acceptTerms must be true';
    }
    return null;
  }
}
