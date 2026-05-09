import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

import {
  VideoJobApiService,
  type CreateVideoJobBody,
  type VideoJobResponse,
} from '../../core/api/video-job-api.service';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-dashboard-overview',
  imports: [
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatFormFieldModule,
    MatInputModule,
    MatButton,
    MatCheckbox,
    MatProgressSpinner,
  ],
  templateUrl: './dashboard-overview.html',
  styleUrl: './dashboard-overview.scss',
})
export class DashboardOverview {
  private readonly fb = inject(FormBuilder);
  private readonly videoJobApi = inject(VideoJobApiService);

  readonly i18n = inject(I18nService);

  readonly form = this.fb.nonNullable.group({
    replicaId: ['r3f427f43c9d', [Validators.required, Validators.minLength(1)]],
    script: ['', [Validators.required, Validators.minLength(1)]],
    videoName: [''],
    callbackUrl: [''],
    fast: [false],
    transparentBackground: [false],
    backgroundUrl: [''],
  });

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly lastJob = signal<VideoJobResponse | null>(null);

  submitVideoJob(): void {
    this.submitError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body: CreateVideoJobBody = {
      replicaId: v.replicaId.trim(),
      script: v.script.trim(),
    };
    if (v.videoName.trim()) {
      body.videoName = v.videoName.trim();
    }
    if (v.callbackUrl.trim()) {
      body.callbackUrl = v.callbackUrl.trim();
    }
    if (v.transparentBackground) {
      body.transparentBackground = true;
      body.fast = true;
    } else if (v.fast) {
      body.fast = true;
    }
    if (v.backgroundUrl.trim()) {
      body.backgroundUrl = v.backgroundUrl.trim();
    }

    this.submitting.set(true);
    this.videoJobApi.createJob(body).subscribe({
      next: (job) => {
        this.lastJob.set(job);
        this.submitting.set(false);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.submitError.set(this.messageFromHttpError(err, 'dashboard.video.errorUnknown'));
      },
    });
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
