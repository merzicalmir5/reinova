import { Routes } from '@angular/router';

import { DashboardLayout } from './dashboard-layout';
import { DashboardOverview } from './dashboard-overview';
import { DashboardReplicas } from './dashboard-replicas';
import { DashboardVideoRequests } from './dashboard-video-requests';

export const dashboardRoutes: Routes = [
  {
    path: '',
    component: DashboardLayout,
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: DashboardOverview,
        data: { titleKey: 'dashboard.page.overview' },
      },
      {
        path: 'video-requests',
        component: DashboardVideoRequests,
        data: { titleKey: 'dashboard.page.videoRequests' },
      },
      {
        path: 'replicas',
        component: DashboardReplicas,
        data: { titleKey: 'dashboard.page.replicas' },
      },
    ],
  },
];
