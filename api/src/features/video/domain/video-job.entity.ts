export type VideoJob = {
  id: string;
  tavusVideoId: string;
  replicaId: string;
  script: string;
  tavusStatus: string;
  videoName?: string;
  downloadUrl?: string;
  hostedUrl?: string;
  streamUrl?: string;
  errorMessage?: string;
  /** Absolute path to file after local FFmpeg processing */
  processedLocalPath?: string;
  /** Owner user when job is created in an authenticated context */
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
};
