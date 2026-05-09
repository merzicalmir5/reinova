import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { I18nService, type LangId } from './core/i18n/i18n.service';

const LANG_UI: Record<LangId, { flag: string; code: string }> = {
  bs: { flag: '🇧🇦', code: 'BS' },
  en: { flag: '🇬🇧', code: 'EN' },
  de: { flag: '🇩🇪', code: 'DE' },
  it: { flag: '🇮🇹', code: 'IT' },
  es: { flag: '🇪🇸', code: 'ES' },
};

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  readonly i18n = inject(I18nService);
  protected readonly menuOpen = signal(false);
  protected readonly activeFlag = computed(() => LANG_UI[this.i18n.lang()].flag);
  protected readonly activeCode = computed(() => LANG_UI[this.i18n.lang()].code);

  ngOnInit(): void {
    void this.i18n.init();
  }

  protected toggleLangMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  protected pickLang(lang: LangId): void {
    void this.i18n.setLang(lang);
    this.menuOpen.set(false);
  }
}
