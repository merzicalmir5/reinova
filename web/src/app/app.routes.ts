import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guard';
import { Login } from './features/auth/login/login';
import { SignupCheckEmail } from './features/auth/signup-check-email/signup-check-email';
import { Signup } from './features/auth/signup/signup';
import { VerifyEmail } from './features/auth/verify-email/verify-email';
import { Home } from './features/home/home';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: Home },
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'register', component: Signup, canActivate: [guestGuard] },
  {
    path: 'register/check-email',
    component: SignupCheckEmail,
    canActivate: [guestGuard],
  },
  { path: 'verify-email', component: VerifyEmail },
  { path: 'signup', redirectTo: 'register', pathMatch: 'full' },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.dashboardRoutes),
  },
  { path: '**', redirectTo: '' },
];
