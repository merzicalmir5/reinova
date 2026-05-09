import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type LangId = 'bs' | 'en' | 'de' | 'it' | 'es';

const STORAGE_KEY = 'reinova-lang';

const LANG_FILES: Record<LangId, string> = {
  bs: 'bos.json',
  en: 'en.json',
  de: 'de.json',
  it: 'it.json',
  es: 'es.json',
};

const VALID_LANGS = new Set<LangId>(['bs', 'en', 'de', 'it', 'es']);

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly http = inject(HttpClient);
  readonly lang = signal<LangId>('bs');
  private readonly dict = signal<Record<string, string>>({});
  private readonly cache: Partial<Record<LangId, Record<string, string>>> = {};
  private initDone = false;

  translate(key: string): string {
    this.lang();
    this.dict();
    const row = this.dict()[key];
    return row !== undefined && row !== '' ? row : key;
  }

  async init(): Promise<void> {
    if (this.initDone) {
      return;
    }
    const saved = localStorage.getItem(STORAGE_KEY) as LangId | null;
    const initial: LangId = saved !== null && VALID_LANGS.has(saved) ? saved : 'bs';
    await this.loadLanguage(initial);
    this.lang.set(initial);
    this.initDone = true;
  }

  async setLang(lang: LangId): Promise<void> {
    localStorage.setItem(STORAGE_KEY, lang);
    await this.loadLanguage(lang);
    this.lang.set(lang);
  }

  private async loadLanguage(lang: LangId): Promise<void> {
    if (this.cache[lang]) {
      this.dict.set(this.cache[lang]!);
      return;
    }
    const file = LANG_FILES[lang];
    const data = await firstValueFrom(this.http.get<Record<string, string>>(`/i18n/${file}`));
    this.cache[lang] = data;
    this.dict.set(data);
  }
}
