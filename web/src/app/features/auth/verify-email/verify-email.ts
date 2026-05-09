import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatToolbar } from '@angular/material/toolbar';

import { AuthApiService } from '../../../core/api/auth-api.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-verify-email',
  imports: [RouterLink, MatToolbar, MatButton],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss',
})
export class VerifyEmail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);
  readonly i18n = inject(I18nService);

  readonly loading = signal(true);
  readonly errorKey = signal<'missing' | 'invalid' | 'generic' | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token')?.trim();
    if (!token) {
      this.loading.set(false);
      this.errorKey.set('missing');
      return;
    }
    this.authApi.verifyEmail(token).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/login'], { queryParams: { verified: '1' } });
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if (err instanceof HttpErrorResponse && err.status === 400) {
          this.errorKey.set('invalid');
        } else {
          this.errorKey.set('generic');
        }
      },
    });
  }
}
