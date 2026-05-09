import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import type { JwtValidatedUser } from '../../core/authorization/jwt.strategy';
import { VideoService } from './application/video.service';
import type { CreateVideoJobDto } from './dto/create-video-job.dto';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Get('health')
  health() {
    return { module: 'video', status: 'ok' };
  }

  /** Tavus replicas for the server-configured API account (same key as video generation). */
  @Get('replicas')
  @UseGuards(AuthGuard('jwt'))
  listReplicas(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('verbose') verbose?: string,
    @Query('replica_type') replicaType?: string,
    @Query('model_name') modelName?: string,
  ) {
    const rt =
      replicaType === 'user' || replicaType === 'system'
        ? replicaType
        : undefined;
    let verboseOpt: boolean | undefined;
    if (verbose === '1' || verbose === 'true') {
      verboseOpt = true;
    } else if (verbose === '0' || verbose === 'false') {
      verboseOpt = false;
    }
    return this.videoService.listReplicas({
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
      verbose: verboseOpt,
      replicaType: rt,
      modelName,
    });
  }

  /** Paginated list of video jobs for the authenticated user (newest first). */
  @Get('my-jobs')
  @UseGuards(AuthGuard('jwt'))
  listJobs(
    @Req() req: Request & { user: JwtValidatedUser },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sync') sync?: string,
  ) {
    const p = Number(page ?? '1');
    const ps = Number(pageSize ?? '10');
    const syncFromTavus = sync === '1' || sync === 'true';
    return this.videoService.listJobsForUser(
      req.user.userId,
      p,
      ps,
      syncFromTavus,
    );
  }

  @Post('jobs')
  @UseGuards(AuthGuard('jwt'))
  createJob(
    @Body() body: CreateVideoJobDto,
    @Req() req: Request & { user: JwtValidatedUser },
  ) {
    return this.videoService.createJob(body, req.user.userId);
  }

  @Get('jobs/:jobId')
  getJob(@Param('jobId') jobId: string, @Query('sync') sync?: string) {
    const syncFromTavus = sync === '1' || sync === 'true';
    return this.videoService.getJob(jobId, syncFromTavus);
  }

  @Post('jobs/:jobId/ffmpeg')
  processWithFfmpeg(@Param('jobId') jobId: string) {
    return this.videoService.processJobWithFfmpeg(jobId);
  }

  /** Same handler as POST /webhook — useful if you prefer a /video prefix behind a proxy. */
  @Post('webhook')
  @HttpCode(200)
  tavusWebhook(@Body() body: unknown) {
    return this.videoService.applyTavusVideoCallback(body);
  }
}
