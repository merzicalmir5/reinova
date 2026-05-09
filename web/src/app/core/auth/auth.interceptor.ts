import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { AuthService } from './auth.service';

function isAuthPublicUrl(url: string): boolean {
  try {
    const u = url.includes('://') ? new URL(url) : new URL(url, 'http://local');
    const path = u.pathname;
    return (
      path.includes('/authorization/login') ||
      path.includes('/authorization/register') ||
      path.includes('/authorization/refresh') ||
      path.endsWith('/authorization/health')
    );
  } catch {
    return (
      url.includes('/authorization/login') ||
      url.includes('/authorization/register') ||
      url.includes('/authorization/refresh')
    );
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken();

  let outgoing = req;
  if (token && !isAuthPublicUrl(req.url)) {
    outgoing = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(outgoing).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }
      if (isAuthPublicUrl(req.url)) {
        return throwError(() => err);
      }
      return from(auth.refreshSession()).pipe(
        switchMap((newToken) => {
          if (!newToken) {
            return throwError(() => err);
          }
          const retry = req.clone({
            setHeaders: { Authorization: `Bearer ${newToken}` },
          });
          return next(retry);
        }),
      );
    }),
  );
};
