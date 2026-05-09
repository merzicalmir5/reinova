import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatToolbar } from '@angular/material/toolbar';

import { AuthService } from '../../../core/auth/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-login',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatToolbar,
    MatButton,
    MatIconButton,
    MatIcon,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly i18n = inject(I18nService);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly authError = signal(false);
  readonly verifyRequired = signal(false);
  readonly verifiedBanner = signal(false);
  readonly submitting = signal(false);
  readonly hidePassword = signal(true);

  constructor() {
    if (this.route.snapshot.queryParamMap.get('verified') === '1') {
      this.verifiedBanner.set(true);
    }
  }

  submit(): void {
    this.authError.set(false);
    this.verifyRequired.set(false);
    this.verifiedBanner.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
    void this.auth
      .login(email.trim(), password)
      .then(() => {
        this.submitting.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const target =
          returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/dashboard';
        void this.router.navigateByUrl(target);
      })
      .catch((err: unknown) => {
        this.submitting.set(false);
        if (err instanceof HttpErrorResponse && err.status === 403) {
          this.verifyRequired.set(true);
          return;
        }
        this.authError.set(true);
      });
  }
}
