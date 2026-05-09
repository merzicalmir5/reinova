import { Injectable } from '@nestjs/common';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';

@Injectable()
export class InMemoryUserRepository implements UserRepository {
  private readonly users: User[] = [
    {
      id: '1',
      companyName: 'Reinova',
      firstName: 'Almir',
      lastName: 'Merzic',
      email: 'almir@reinova.ai',
      passwordHash: 'mock',
      emailVerifiedAt: new Date(),
    },
    {
      id: '2',
      companyName: 'Demo Company',
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo@reinova.ai',
      passwordHash: 'mock',
      emailVerifiedAt: new Date(),
    },
  ];

  async findById(id: string): Promise<User | null> {
    const user = this.users.find((item) => item.id === id);
    return user ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    const user = this.users.find(
      (item) => item.email.toLowerCase() === normalized,
    );
    return user ?? null;
  }

  async create(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }
}
