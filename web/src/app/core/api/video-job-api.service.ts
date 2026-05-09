import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from './api-base-url.token';

export type CreateVideoJobBody = {
  replicaId: string;
  script: string;
  videoName?: string;
  callbackUrl?: string;
  fast?: boolean;
  transparentBackground?: boolean;
  backgroundUrl?: string;
};

export type VideoJobListResponse = {
  items: VideoJobResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type VideoJobResponse = {
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
  processedLocalPath?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReplicaListItem = {
  replicaId: string;
  replicaName?: string;
  thumbnailVideoUrl?: string;
  trainingProgress?: string;
  status?: string;
  createdAt?: string;
  replicaType?: string;
  modelName?: string;
};

export type ReplicaListResponse = {
  items: ReplicaListItem[];
  total: number;
  page: number;
  limit: number;
};

@Injectable({ providedIn: 'root' })
export class VideoJobApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  createJob(body: CreateVideoJobBody): Observable<VideoJobResponse> {
    return this.http.post<VideoJobResponse>(`${this.baseUrl}/video/jobs`, body);
  }

  listJobs(
    page: number,
    pageSize: number,
    syncFromTavus = false,
  ): Observable<VideoJobListResponse> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));
    if (syncFromTavus) {
      params = params.set('sync', '1');
    }
    return this.http.get<VideoJobListResponse>(`${this.baseUrl}/video/my-jobs`, { params });
  }

  /** Tavus replicas for the API account (via backend `TAVUS_API_KEY`). */
  listReplicas(page: number, limit: number): Observable<ReplicaListResponse> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit))
      .set('verbose', '1');
    return this.http.get<ReplicaListResponse>(`${this.baseUrl}/video/replicas`, {
      params,
    });
  }
}
