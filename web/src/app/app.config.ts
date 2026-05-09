import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { API_BASE_URL } from './core/api/api-base-url.token';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { I18nService } from './core/i18n/i18n.service';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: API_BASE_URL, useValue: 'http://localhost:3000' },
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(async () => {
      const i18nService = inject(I18nService);
      const authService = inject(AuthService);

      await i18nService.init();
      await authService.restoreSession();
    }),
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    provideRouter(routes),
  ],
};
