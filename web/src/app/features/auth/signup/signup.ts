import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatToolbar } from '@angular/material/toolbar';

import { AuthApiService } from '../../../core/api/auth-api.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-signup',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatToolbar,
    MatButton,
    MatIconButton,
    MatIcon,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
  ],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);

  readonly form = this.fb.nonNullable.group(
    {
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      retypePassword: ['', [Validators.required, Validators.minLength(6)]],
      acceptTerms: [false, [Validators.requiredTrue]],
    },
    { validators: [Signup.passwordsMatchValidator] },
  );

  readonly submitError = signal('');
  readonly submitting = signal(false);
  readonly hidePassword = signal(true);
  readonly hideRetypePassword = signal(true);
  readonly passwordsMismatch = computed(
    () =>
      this.form.hasError('passwordMismatch') &&
      (this.form.controls.retypePassword.touched || this.form.controls.password.touched),
  );

  submit(): void {
    this.submitError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.authApi.register(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.emailSent && res.user?.email) {
          void this.router.navigate(['/register/check-email'], {
            queryParams: { email: res.user.email },
          });
          return;
        }
        void this.router.navigate(['/login']);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.submitError.set(this.resolveErrorMessage(error));
      },
    });
  }

  private static passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const { password, retypePassword } = control.getRawValue() as { password: string; retypePassword: string };
    return password === retypePassword ? null : { passwordMismatch: true };
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) {
        return this.i18n.translate('signup.errors.emailTaken');
      }
      if (error.status === 400) {
        return this.i18n.translate('signup.errors.invalidRequest');
      }
      if (error.status === 503) {
        return this.i18n.translate('signup.errors.emailUnavailable');
      }
    }
    return this.i18n.translate('signup.errors.generic');
  }
}
