import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './application/user.service';
import { USER_REPOSITORY } from './domain/user.repository';
import { PrismaUserRepository } from './infra/prisma-user.repository';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    PrismaUserRepository,
    {
      provide: USER_REPOSITORY,
      useExisting: PrismaUserRepository,
    },
  ],
  exports: [UserService],
})
export class UserModule {}
