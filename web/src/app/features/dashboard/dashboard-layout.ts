import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { filter, map, startWith } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';

const DASH_THEME_STORAGE = 'reinova-dashboard-theme';

@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, MatButton],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.scss',
})
export class DashboardLayout {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  readonly i18n = inject(I18nService);

  /** `true` = dark mode (white text), `false` = light mode (black text) */
  readonly darkMode = signal(this.readStoredTheme());

  constructor() {
    effect(() => {
      const dark = this.darkMode();
      try {
        localStorage.setItem(DASH_THEME_STORAGE, dark ? 'dark' : 'light');
      } catch {
        /* ignore quota / private mode */
      }
    });
  }

  toggleTheme(): void {
    this.darkMode.update((v) => !v);
  }

  private readStoredTheme(): boolean {
    try {
      return localStorage.getItem(DASH_THEME_STORAGE) === 'dark';
    } catch {
      return false;
    }
  }

  readonly pageTitleKey = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.titleKeyFromRoute()),
      startWith(this.titleKeyFromRoute()),
    ),
    { initialValue: this.titleKeyFromRoute() },
  );

  private titleKeyFromRoute(): string | undefined {
    let route: ActivatedRoute | null = this.activatedRoute;
    while (route?.firstChild) {
      route = route.firstChild;
    }
    const data = route?.snapshot?.data;
    if (!data) {
      return undefined;
    }
    const key = data['titleKey'];
    return typeof key === 'string' ? key : undefined;
  }

  logout(): void {
    void this.auth.logout().then(() => this.router.navigateByUrl('/'));
  }
}
