import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  RequestTimeoutException,
} from '@nestjs/common';
import type { CreateVideoJobDto } from '../dto/create-video-job.dto';
import type { TavusVideoCallbackPayload } from '../dto/tavus-video-callback.dto';
import type { VideoJob } from '../domain/video-job.entity';
import {
  VIDEO_JOB_REPOSITORY,
  type VideoJobRepository,
} from '../domain/video-job.repository';
import { FfmpegRunner } from '../infra/ffmpeg-runner';
import { TavusApiClient } from '../infra/tavus-api.client';
import { VideoFileDownloader } from '../infra/video-file-downloader';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

@Injectable()
export class VideoService {
  constructor(
    @Inject(VIDEO_JOB_REPOSITORY)
    private readonly videoJobRepository: VideoJobRepository,
    private readonly tavusApiClient: TavusApiClient,
    private readonly ffmpegRunner: FfmpegRunner,
    private readonly videoFileDownloader: VideoFileDownloader,
  ) {}

  /** Tavus replicas available for the API key configured on this server (paginated). */
  async listReplicas(options: {
    page?: number;
    limit?: number;
    verbose?: boolean;
    replicaType?: 'user' | 'system';
    modelName?: string;
  }): Promise<{
    items: Array<{
      replicaId: string;
      replicaName?: string;
      thumbnailVideoUrl?: string;
      trainingProgress?: string;
      status?: string;
      createdAt?: string;
      replicaType?: string;
      modelName?: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const parsedPage = Number(options.page);
    const safePage =
      Number.isFinite(parsedPage) && parsedPage > 0
        ? Math.floor(parsedPage)
        : 1;
    const parsedLimit = Number(options.limit);
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(100, Math.floor(parsedLimit))
        : 5;
    /** Omit `replica_type` unless `GET ?replica_type=user|system` — otherwise Tavus returns user + stock (full list). */
    const raw = await this.tavusApiClient.listReplicas({
      page: safePage,
      limit: safeLimit,
      verbose: options.verbose ?? true,
      replica_type: options.replicaType,
      model_name: options.modelName?.trim() || undefined,
    });
    return {
      items: raw.data.map((r) => ({
        replicaId: r.replica_id,
        replicaName: r.replica_name,
        thumbnailVideoUrl: r.thumbnail_video_url,
        trainingProgress: r.training_progress,
        status: r.status,
        createdAt: r.created_at,
        replicaType: r.replica_type,
        modelName: r.model_name,
      })),
      total: raw.total_count,
      page: safePage,
      limit: safeLimit,
    };
  }

  async listJobsForUser(
    userId: string,
    page: number,
    pageSize: number,
    syncFromTavus = false,
  ): Promise<{
    items: VideoJob[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeSize =
      Number.isFinite(pageSize) && pageSize > 0
        ? Math.min(100, Math.floor(pageSize))
        : 10;
    const { items, total } = await this.videoJobRepository.findManyForUser({
      userId,
      page: safePage,
      pageSize: safeSize,
    });
    if (syncFromTavus) {
      for (const job of items) {
        if (!this.shouldPullStatusFromTavus(job.tavusStatus)) {
          continue;
        }
        try {
          await this.refreshFromTavus(job);
        } catch {
          /* Tavus unreachable — keep stored status */
        }
      }
    }
    return {
      items,
      total,
      page: safePage,
      pageSize: safeSize,
    };
  }

  /** Sync list rows that are not in a terminal Tavus state (ready / error / deleted). */
  private shouldPullStatusFromTavus(status: string): boolean {
    const s = status.toLowerCase();
    return s !== 'ready' && s !== 'error' && s !== 'deleted';
  }

  async createJob(dto: CreateVideoJobDto, userId?: string): Promise<VideoJob> {
    if (!dto.replicaId?.trim() || !dto.script?.trim()) {
      throw new BadRequestException('replicaId and script are required');
    }
    if (dto.transparentBackground === true && dto.backgroundUrl?.trim()) {
      throw new BadRequestException(
        'transparent_background is not compatible with background_url (Tavus fast pipeline)',
      );
    }
    const id = randomUUID();
    const body: Record<string, unknown> = {
      replica_id: dto.replicaId,
      script: dto.script,
    };
    if (dto.videoName?.trim()) body.video_name = dto.videoName.trim();
    if (dto.callbackUrl?.trim()) body.callback_url = dto.callbackUrl.trim();
    if (dto.transparentBackground === true) {
      body.transparent_background = true;
      body.fast = true;
    } else if (dto.fast !== undefined) {
      body.fast = dto.fast;
    }
    if (dto.backgroundUrl?.trim()) {
      body.background_url = dto.backgroundUrl.trim();
    }

    const tavus = await this.tavusApiClient.createVideo(body);
    const now = new Date();
    const job: VideoJob = {
      id,
      tavusVideoId: tavus.video_id,
      replicaId: dto.replicaId,
      script: dto.script,
      tavusStatus: tavus.status ?? 'unknown',
      videoName: tavus.video_name ?? dto.videoName,
      downloadUrl: tavus.download_url,
      hostedUrl: tavus.hosted_url,
      userId,
      createdAt: now,
      updatedAt: now,
    };
    if (tavus.status === 'error') {
      job.errorMessage = 'Video generation reported error from Tavus';
    }
    await this.videoJobRepository.save(job);
    return job;
  }

  async applyTavusVideoCallback(
    body: unknown,
  ): Promise<{ ok: true; updated: boolean; jobId?: string }> {
    const payload = this.parseVideoCallbackPayload(body);
    const job = await this.videoJobRepository.findByTavusVideoId(
      payload.video_id,
    );
    if (!job) {
      return { ok: true, updated: false };
    }
    job.tavusStatus = payload.status;
    if (payload.video_name !== undefined) {
      job.videoName = payload.video_name ?? job.videoName;
    }
    if (payload.download_url !== undefined) {
      job.downloadUrl = payload.download_url ?? undefined;
    }
    if (payload.hosted_url !== undefined) {
      job.hostedUrl = payload.hosted_url ?? undefined;
    }
    if (payload.stream_url !== undefined) {
      job.streamUrl = payload.stream_url ?? undefined;
    }
    if (payload.status === 'error') {
      job.errorMessage =
        (typeof payload.status_details === 'string' &&
          payload.status_details) ||
        (typeof payload.error_details === 'string' && payload.error_details) ||
        'Tavus video error';
    } else if (payload.status === 'ready') {
      job.errorMessage = undefined;
    }
    job.updatedAt = new Date();
    await this.videoJobRepository.save(job);
    return { ok: true, updated: true, jobId: job.id };
  }

  async getJob(id: string, syncFromTavus: boolean): Promise<VideoJob> {
    const job = await this.videoJobRepository.findById(id);
    if (!job) {
      throw new NotFoundException('Video job not found');
    }
    if (syncFromTavus) {
      await this.refreshFromTavus(job);
    }
    return job;
  }

  /**
   * Polls Tavus until the video is ready, downloads it, runs FFmpeg locally, stores output path on the job.
   */
  async processJobWithFfmpeg(jobId: string): Promise<VideoJob> {
    const job = await this.videoJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException('Video job not found');
    }

    const pollMs = Number(process.env.TAVUS_POLL_INTERVAL_MS ?? 3000);
    const maxWaitMs = Number(process.env.TAVUS_POLL_MAX_MS ?? 300_000);
    const started = Date.now();

    while (Date.now() - started < maxWaitMs) {
      await this.refreshFromTavus(job);
      if (job.tavusStatus === 'ready') {
        break;
      }
      if (job.tavusStatus === 'error' || job.tavusStatus === 'deleted') {
        throw new BadRequestException(
          job.errorMessage ?? `Tavus status: ${job.tavusStatus}`,
        );
      }
      await sleep(Number.isFinite(pollMs) && pollMs > 0 ? pollMs : 3000);
    }

    if (job.tavusStatus !== 'ready') {
      throw new RequestTimeoutException(
        'Video is not ready within TAVUS_POLL_MAX_MS; try again later or use GET ?sync=1',
      );
    }

    const sourceUrl = job.downloadUrl ?? job.hostedUrl;
    if (!sourceUrl) {
      throw new BadRequestException(
        'Tavus did not return download_url or hosted_url for this video',
      );
    }

    const workDir = join(tmpdir(), 'reinova-video');
    const inputPath = join(workDir, `${job.id}-source.bin`);
    const outputPath = join(workDir, `${job.id}-processed.mp4`);

    await this.videoFileDownloader.downloadToFile(sourceUrl, inputPath);
    await this.ffmpegRunner.transcodeCopy(inputPath, outputPath);

    job.processedLocalPath = outputPath;
    job.updatedAt = new Date();
    await this.videoJobRepository.save(job);
    return job;
  }

  private parseVideoCallbackPayload(body: unknown): TavusVideoCallbackPayload {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Expected JSON object body');
    }
    const o = body as Record<string, unknown>;
    const videoId = o.video_id;
    if (typeof videoId !== 'string' || !videoId.trim()) {
      throw new BadRequestException('video_id is required');
    }
    const status = o.status;
    if (typeof status !== 'string' || !status.trim()) {
      throw new BadRequestException('status is required');
    }
    return {
      ...o,
      video_id: videoId.trim(),
      status: status.trim(),
    };
  }

  private async refreshFromTavus(job: VideoJob): Promise<void> {
    const v = await this.tavusApiClient.getVideo(job.tavusVideoId);
    job.tavusStatus = v.status;
    job.videoName = v.video_name ?? job.videoName;
    job.downloadUrl = v.download_url ?? job.downloadUrl;
    job.hostedUrl = v.hosted_url ?? job.hostedUrl;
    job.streamUrl = v.stream_url ?? job.streamUrl;
    if (v.status === 'error') {
      job.errorMessage = v.status_details ?? 'Tavus video error';
    }
    job.updatedAt = new Date();
    await this.videoJobRepository.save(job);
  }
}
