import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

import {
  VideoJobApiService,
  type ReplicaListItem,
} from '../../core/api/video-job-api.service';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-dashboard-replicas',
  imports: [MatCard, MatCardContent, MatProgressSpinner, MatPaginatorModule],
  templateUrl: './dashboard-replicas.html',
  styleUrl: './dashboard-replicas.scss',
})
export class DashboardReplicas implements OnInit {
  private readonly videoJobApi = inject(VideoJobApiService);
  readonly i18n = inject(I18nService);

  readonly rows = signal<ReplicaListItem[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(5);
  /** Brief feedback after copying a replica ID */
  readonly copiedId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadReplicas();
  }

  loadReplicas(): void {
    this.loading.set(true);
    this.error.set(null);
    const page = this.pageIndex() + 1;
    const limit = this.pageSize();
    this.videoJobApi.listReplicas(page, limit).subscribe({
      next: (res) => {
        this.rows.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(this.messageFromHttpError(err, 'dashboard.replicas.loadError'));
      },
    });
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
    this.loadReplicas();
  }

  isReplicaReady(status?: string): boolean {
    return (status ?? '').toLowerCase() === 'completed';
  }

  /** Preview only while hovering — avoids loading/playing every thumbnail at once. */
  hoverPlay(video: HTMLVideoElement | undefined): void {
    if (!video) {
      return;
    }
    void video.play().catch(() => {
      /* autoplay policies / decode errors */
    });
  }

  hoverPause(video: HTMLVideoElement | undefined): void {
    if (!video) {
      return;
    }
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      /* ignore */
    }
  }

  copyReplicaId(id: string): void {
    const run = (): void => {
      this.copiedId.set(id);
      window.setTimeout(() => this.copiedId.update((c) => (c === id ? null : c)), 2000);
    };
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(id).then(run).catch(() => run());
    } else {
      run();
    }
  }

  private messageFromHttpError(err: unknown, i18nFallbackKey: string): string {
    if (err instanceof HttpErrorResponse) {
      const data = err.error as { message?: string | string[] } | null;
      if (data && typeof data.message === 'string') {
        return data.message;
      }
      if (Array.isArray(data?.message)) {
        return data.message.join(', ');
      }
      if (typeof err.error === 'string' && err.error.length > 0) {
        return err.error;
      }
      return `${err.status} ${err.statusText}`.trim();
    }
    return this.i18n.translate(i18nFallbackKey);
  }
}
