/** Body for POST /video/jobs — maps to Tavus POST /v2/videos */
export type CreateVideoJobDto = {
  replicaId: string;
  script: string;
  videoName?: string;
  callbackUrl?: string;
  fast?: boolean;
  /** Tavus: .webm with alpha; only works when fast is true (API forces fast when this is true). */
  transparentBackground?: boolean;
  backgroundUrl?: string;
};
