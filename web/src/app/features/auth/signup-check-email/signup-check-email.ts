import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatToolbar } from '@angular/material/toolbar';

import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-signup-check-email',
  imports: [RouterLink, MatToolbar, MatButton],
  templateUrl: './signup-check-email.html',
  styleUrl: './signup-check-email.scss',
})
export class SignupCheckEmail {
  private readonly route = inject(ActivatedRoute);
  readonly i18n = inject(I18nService);

  readonly email = this.route.snapshot.queryParamMap.get('email') ?? '';
}
