import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';

import { USER_REPOSITORY } from '../domain/user.repository';
import type { UserRepository } from '../domain/user.repository';
import { User } from '../domain/user.entity';

export type RegisterUserInput = {
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type PublicUser = Omit<User, 'passwordHash' | 'emailVerifiedAt'> & {
  emailVerified: boolean;
};

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async findById(id: string) {
    return this.userRepository.findById(id);
  }

  async findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  async register(input: RegisterUserInput): Promise<PublicUser> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user: User = {
      id: randomUUID(),
      companyName: input.companyName.trim(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: normalizedEmail,
      passwordHash,
      emailVerifiedAt: null,
    };

    const created = await this.userRepository.create(user);
    return this.toPublicUser(created);
  }

  toPublicUser(user: User): PublicUser {
    const {
      passwordHash: _passwordHash,
      emailVerifiedAt,
      ...rest
    } = user;
    return {
      ...rest,
      emailVerified: emailVerifiedAt !== null,
    };
  }
}
