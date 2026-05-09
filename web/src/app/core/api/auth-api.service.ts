import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from './api-base-url.token';

export type RegisterBody = {
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  retypePassword: string;
  acceptTerms: boolean;
};

export type RegisteredUser = {
  id: string;
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified?: boolean;
};

export type RegisterResponse = {
  message: string;
  user: RegisteredUser;
  emailSent?: boolean;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
};

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  register(body: RegisterBody): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/authorization/register`, body);
  }

  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/authorization/verify-email`, {
      token,
    });
  }
}
