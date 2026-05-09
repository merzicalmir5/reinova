import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthorizationModule } from './core/authorization/authorization.module';
import { EmailModule } from './core/email/email.module';
import { UserModule } from './features/user/user.module';
import { VideoModule } from './features/video/video.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    AuthorizationModule,
    VideoModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
