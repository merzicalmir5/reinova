import { InjectionToken } from '@angular/core';

/** Nest API origin (no trailing slash). Provided in `app.config.ts`. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
