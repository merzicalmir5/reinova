import type { VideoJob } from './video-job.entity';

export const VIDEO_JOB_REPOSITORY = Symbol('VIDEO_JOB_REPOSITORY');

export type VideoJobListParams = {
  userId: string;
  page: number;
  pageSize: number;
};

export type VideoJobListResult = {
  items: VideoJob[];
  total: number;
};

export interface VideoJobRepository {
  save(job: VideoJob): Promise<void>;
  findById(id: string): Promise<VideoJob | null>;
  findByTavusVideoId(tavusVideoId: string): Promise<VideoJob | null>;
  findManyForUser(params: VideoJobListParams): Promise<VideoJobListResult>;
}
