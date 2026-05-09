import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { UserService } from './application/user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('health')
  health() {
    return { module: 'user', status: 'ok' };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.userService.toPublicUser(user);
  }
}
