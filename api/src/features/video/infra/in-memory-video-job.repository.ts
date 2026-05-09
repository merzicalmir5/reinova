import { Injectable } from '@nestjs/common';
import type { VideoJob } from '../domain/video-job.entity';
import type {
  VideoJobListParams,
  VideoJobListResult,
  VideoJobRepository,
} from '../domain/video-job.repository';

@Injectable()
export class InMemoryVideoJobRepository implements VideoJobRepository {
  private readonly jobs = new Map<string, VideoJob>();

  save(job: VideoJob): Promise<void> {
    this.jobs.set(job.id, { ...job });
    return Promise.resolve();
  }

  findById(id: string): Promise<VideoJob | null> {
    const job = this.jobs.get(id);
    return Promise.resolve(job ? { ...job } : null);
  }

  findByTavusVideoId(tavusVideoId: string): Promise<VideoJob | null> {
    for (const job of this.jobs.values()) {
      if (job.tavusVideoId === tavusVideoId) {
        return Promise.resolve({ ...job });
      }
    }
    return Promise.resolve(null);
  }

  findManyForUser(params: VideoJobListParams): Promise<VideoJobListResult> {
    const list = [...this.jobs.values()]
      .filter((j) => j.userId === params.userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = list.length;
    const start = (params.page - 1) * params.pageSize;
    const items = list.slice(start, start + params.pageSize).map((j) => ({ ...j }));
    return Promise.resolve({ items, total });
  }
}
