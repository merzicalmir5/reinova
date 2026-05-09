import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { User } from '../domain/user.entity';
import type { UserRepository } from '../domain/user.repository';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const prisma = this.prisma as any;
    const user = await prisma.user.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!user) {
      return null;
    }

    return this.toDomain(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    const prisma = this.prisma as any;
    const user = await prisma.user.findUnique({
      where: { email: normalized },
      include: { company: true },
    });
    if (!user) {
      return null;
    }

    return this.toDomain(user);
  }

  async create(user: User): Promise<User> {
    const prisma = this.prisma as any;
    const created = await prisma.$transaction(async (tx: any) => {
      const company = await tx.company.create({
        data: { name: user.companyName },
      });
      return tx.user.create({
        data: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          passwordHash: user.passwordHash,
          email: user.email.toLowerCase(),
          emailVerifiedAt: user.emailVerifiedAt ?? null,
          companyId: company.id,
        },
        include: { company: true },
      });
    });

    return this.toDomain(created);
  }

  private toDomain(user: {
    id: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    email: string;
    emailVerifiedAt: Date | null;
    company: { name: string };
  }): User {
    return {
      id: user.id,
      companyName: user.company.name,
      firstName: user.firstName,
      lastName: user.lastName,
      passwordHash: user.passwordHash,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }
}
