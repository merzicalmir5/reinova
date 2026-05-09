import {
  AfterViewInit,
  Component,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatToolbar } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, RouterLinkActive, MatToolbar, MatButton],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements AfterViewInit {
  readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  readonly mobileNavOpen = signal(false);
  /** Solid gray bar while scrolled (transparent at top). */
  readonly navbarScrolled = signal(false);

  ngAfterViewInit(): void {
    this.syncNavbarScrolled();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.syncNavbarScrolled();
  }

  private syncNavbarScrolled(): void {
    const y = window.scrollY ?? document.documentElement.scrollTop;
    const scrolled = y > 8;
    if (this.navbarScrolled() !== scrolled) {
      this.navbarScrolled.set(scrolled);
    }
  }

  onLogoClick(event: MouseEvent): void {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (this.router.url.includes('#')) {
      void this.router.navigateByUrl('/');
    }
  }

  demoMailtoHref(): string {
    const email = this.i18n.translate('demo.scheduleEmail');
    const subject = encodeURIComponent(this.i18n.translate('demo.mailSubject'));
    return `mailto:${email}?subject=${subject}`;
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update((v) => !v);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscapeCloseMobileNav(): void {
    if (this.mobileNavOpen()) {
      this.closeMobileNav();
    }
  }
}
