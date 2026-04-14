import { Routes } from '@angular/router';

import { ShellLayoutComponent } from './layout/shell-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard-page.component').then((m) => m.DashboardPageComponent),
      },
      {
        path: 'incomes',
        loadComponent: () =>
          import('./pages/incomes/incomes-page.component').then((m) => m.IncomesPageComponent),
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./pages/expenses/expenses-page.component').then((m) => m.ExpensesPageComponent),
      },
      {
        path: 'goals',
        loadComponent: () =>
          import('./pages/goals/goals-page.component').then((m) => m.GoalsPageComponent),
      },
      {
        path: 'scenarios',
        loadComponent: () =>
          import('./pages/scenarios/scenarios-page.component').then((m) => m.ScenariosPageComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
