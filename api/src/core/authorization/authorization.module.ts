import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthorizationController } from './authorization.controller';
import { AuthService } from './auth.service';
import { jwtExpiresSecondsFromEnv } from './jwt-expires.util';
import { JwtStrategy } from './jwt.strategy';
import { UserModule } from '../../features/user/user.module';

@Module({
  imports: [
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (): JwtModuleOptions => ({
        secret: process.env.JWT_SECRET ?? 'dev-only-change-me',
        signOptions: {
          expiresIn: jwtExpiresSecondsFromEnv(),
        },
      }),
    }),
  ],
  controllers: [AuthorizationController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule, JwtStrategy],
})
export class AuthorizationModule {}
