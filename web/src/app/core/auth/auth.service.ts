import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../api/api-base-url.token';

export type OAuthUser = {
  id: string;
  email: string;
  companyName: string;
  firstName: string;
  lastName: string;
  emailVerified?: boolean;
};

export type OAuthTokenBundle = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user?: OAuthUser;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly httpBackend = inject(HttpBackend);

  /** Bypasses interceptors to avoid refresh/login recursion. */
  private readonly rawHttp = new HttpClient(this.httpBackend);

  private readonly refreshStorageKey = 'reinova-refresh-token';

  readonly accessToken = signal<string | null>(null);
  readonly currentUser = signal<OAuthUser | null>(null);

  private refreshInFlight: Promise<string | null> | null = null;

  isLoggedIn(): boolean {
    return this.accessToken() !== null || !!this.getStoredRefreshToken();
  }

  getStoredRefreshToken(): string | null {
    return localStorage.getItem(this.refreshStorageKey);
  }

  displayName(): string {
    const u = this.currentUser();
    if (!u) {
      return '';
    }
    const name = `${u.firstName} ${u.lastName}`.trim();
    return name || u.email;
  }

  applyOAuthBundle(bundle: OAuthTokenBundle): void {
    this.accessToken.set(bundle.access_token);
    localStorage.setItem(this.refreshStorageKey, bundle.refresh_token);
    if (bundle.user) {
      this.currentUser.set(bundle.user);
    }
  }

  async restoreSession(): Promise<void> {
    const rt = this.getStoredRefreshToken();
    if (!rt) {
      return;
    }
    try {
      const bundle = await firstValueFrom(
        this.rawHttp.post<OAuthTokenBundle>(`${this.baseUrl}/authorization/refresh`, {
          refresh_token: rt,
        }),
      );
      this.applyOAuthBundle(bundle);
      await this.loadProfile();
    } catch {
      localStorage.removeItem(this.refreshStorageKey);
      this.accessToken.set(null);
      this.currentUser.set(null);
    }
  }

  async loadProfile(): Promise<void> {
    const token = this.accessToken();
    if (!token) {
      return;
    }
    try {
      const user = await firstValueFrom(
        this.rawHttp.get<OAuthUser>(`${this.baseUrl}/authorization/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      this.currentUser.set(user);
    } catch {
      /* profile optional */
    }
  }

  async login(email: string, password: string): Promise<void> {
    const bundle = await firstValueFrom(
      this.rawHttp.post<OAuthTokenBundle>(`${this.baseUrl}/authorization/login`, { email, password }),
    );
    this.applyOAuthBundle(bundle);
    await this.loadProfile();
  }

  async logout(): Promise<void> {
    const rt = this.getStoredRefreshToken();
    if (rt) {
      try {
        await firstValueFrom(
          this.rawHttp.post(`${this.baseUrl}/authorization/logout`, { refresh_token: rt }),
        );
      } catch {
        /* still clear client session */
      }
    }
    localStorage.removeItem(this.refreshStorageKey);
    this.accessToken.set(null);
    this.currentUser.set(null);
  }

  async refreshSession(): Promise<string | null> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }
    const rt = this.getStoredRefreshToken();
    if (!rt) {
      return null;
    }
    this.refreshInFlight = (async () => {
      try {
        const bundle = await firstValueFrom(
          this.rawHttp.post<OAuthTokenBundle>(`${this.baseUrl}/authorization/refresh`, {
            refresh_token: rt,
          }),
        );
        this.applyOAuthBundle(bundle);
        return bundle.access_token;
      } catch {
        localStorage.removeItem(this.refreshStorageKey);
        this.accessToken.set(null);
        this.currentUser.set(null);
        return null;
      } finally {
        this.refreshInFlight = null;
      }
    })();
    return this.refreshInFlight;
  }
}
