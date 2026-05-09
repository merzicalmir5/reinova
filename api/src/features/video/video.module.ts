import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../../core/authorization/authorization.module';
import { VideoService } from './application/video.service';
import { VIDEO_JOB_REPOSITORY } from './domain/video-job.repository';
import { FfmpegRunner } from './infra/ffmpeg-runner';
import { PrismaVideoJobRepository } from './infra/prisma-video-job.repository';
import { TavusApiClient } from './infra/tavus-api.client';
import { VideoFileDownloader } from './infra/video-file-downloader';
import { TavusWebhookController } from './tavus-webhook.controller';
import { VideoController } from './video.controller';

@Module({
  imports: [
    AuthorizationModule,
    HttpModule.register({
      timeout: Number(process.env.HTTP_TIMEOUT_MS ?? 600_000),
      maxRedirects: 5,
    }),
  ],
  controllers: [VideoController, TavusWebhookController],
  providers: [
    VideoService,
    TavusApiClient,
    FfmpegRunner,
    VideoFileDownloader,
    PrismaVideoJobRepository,
    {
      provide: VIDEO_JOB_REPOSITORY,
      useExisting: PrismaVideoJobRepository,
    },
  ],
})
export class VideoModule {}
