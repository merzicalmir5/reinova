import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { VideoJob } from '../domain/video-job.entity';
import type {
  VideoJobListParams,
  VideoJobListResult,
  VideoJobRepository,
} from '../domain/video-job.repository';

@Injectable()
export class PrismaVideoJobRepository implements VideoJobRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(job: VideoJob): Promise<void> {
    const prisma = this.prisma as any;
    await prisma.videoJob.upsert({
      where: { id: job.id },
      create: {
        id: job.id,
        tavusVideoId: job.tavusVideoId,
        replicaId: job.replicaId,
        script: job.script,
        tavusStatus: job.tavusStatus,
        videoName: job.videoName,
        downloadUrl: job.downloadUrl,
        hostedUrl: job.hostedUrl,
        streamUrl: job.streamUrl,
        errorMessage: job.errorMessage,
        processedLocalPath: job.processedLocalPath,
        userId: job.userId,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
      update: {
        tavusVideoId: job.tavusVideoId,
        replicaId: job.replicaId,
        script: job.script,
        tavusStatus: job.tavusStatus,
        videoName: job.videoName,
        downloadUrl: job.downloadUrl,
        hostedUrl: job.hostedUrl,
        streamUrl: job.streamUrl,
        errorMessage: job.errorMessage,
        processedLocalPath: job.processedLocalPath,
        userId: job.userId,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<VideoJob | null> {
    const prisma = this.prisma as any;
    const job = await prisma.videoJob.findUnique({ where: { id } });
    return job ? this.toEntity(job) : null;
  }

  async findByTavusVideoId(tavusVideoId: string): Promise<VideoJob | null> {
    const prisma = this.prisma as any;
    const job = await prisma.videoJob.findUnique({
      where: { tavusVideoId },
    });
    return job ? this.toEntity(job) : null;
  }

  async findManyForUser(params: VideoJobListParams): Promise<VideoJobListResult> {
    const prisma = this.prisma as any;
    const skip = (params.page - 1) * params.pageSize;
    const where = { userId: params.userId };
    const [rows, total] = await Promise.all([
      prisma.videoJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: params.pageSize,
      }),
      prisma.videoJob.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.toEntity(row)),
      total,
    };
  }

  private toEntity(job: {
    id: string;
    tavusVideoId: string;
    replicaId: string;
    script: string;
    tavusStatus: string;
    videoName: string | null;
    downloadUrl: string | null;
    hostedUrl: string | null;
    streamUrl: string | null;
    errorMessage: string | null;
    processedLocalPath: string | null;
    userId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): VideoJob {
    return {
      id: job.id,
      tavusVideoId: job.tavusVideoId,
      replicaId: job.replicaId,
      script: job.script,
      tavusStatus: job.tavusStatus,
      videoName: job.videoName ?? undefined,
      downloadUrl: job.downloadUrl ?? undefined,
      hostedUrl: job.hostedUrl ?? undefined,
      streamUrl: job.streamUrl ?? undefined,
      errorMessage: job.errorMessage ?? undefined,
      processedLocalPath: job.processedLocalPath ?? undefined,
      userId: job.userId ?? undefined,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
