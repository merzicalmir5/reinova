import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

const STATUS_POLL_INTERVAL_MS = 20_000;
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import {
  VideoJobApiService,
  type VideoJobResponse,
} from '../../core/api/video-job-api.service';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-dashboard-video-requests',
  imports: [
    DatePipe,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatProgressSpinner,
    MatTableModule,
    MatPaginatorModule,
  ],
  templateUrl: './dashboard-video-requests.html',
  styleUrl: './dashboard-video-requests.scss',
})
export class DashboardVideoRequests implements OnInit {
  private readonly videoJobApi = inject(VideoJobApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);

  readonly jobsRows = signal<VideoJobResponse[]>([]);
  readonly jobsTotal = signal(0);
  readonly jobsLoading = signal(false);
  readonly jobsError = signal<string | null>(null);
  readonly jobsPageIndex = signal(0);
  readonly jobsPageSize = signal(10);

  readonly displayedColumns = [
    'createdAt',
    'localId',
    'status',
    'hostedUrl',
    'script',
  ] as const;

  ngOnInit(): void {
    this.loadJobs();
    interval(STATUS_POLL_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadJobs({ silent: true }));
  }

  loadJobs(options?: { silent?: boolean }): void {
    const silent = options?.silent ?? false;
    if (!silent) {
      this.jobsLoading.set(true);
      this.jobsError.set(null);
    }
    const page = this.jobsPageIndex() + 1;
    const pageSize = this.jobsPageSize();
    this.videoJobApi.listJobs(page, pageSize, true).subscribe({
      next: (res) => {
        this.jobsRows.set(res.items);
        this.jobsTotal.set(res.total);
        if (!silent) {
          this.jobsLoading.set(false);
        }
      },
      error: (err: unknown) => {
        if (!silent) {
          this.jobsLoading.set(false);
          this.jobsError.set(this.messageFromHttpError(err, 'dashboard.video.tableLoadError'));
        }
      },
    });
  }

  onJobsPage(ev: PageEvent): void {
    this.jobsPageIndex.set(ev.pageIndex);
    this.jobsPageSize.set(ev.pageSize);
    this.loadJobs();
  }

  scriptPreview(text: string, maxLen = 96): string {
    const t = text?.trim() ?? '';
    if (t.length <= maxLen) {
      return t;
    }
    return `${t.slice(0, maxLen)}…`;
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
