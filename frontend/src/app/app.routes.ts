import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'extract', pathMatch: 'full' },
  {
    path: 'extract',
    loadComponent: () =>
      import('./pages/extract/extract').then((m) => m.ExtractPageComponent),
  },
  {
    path: 'verify',
    loadComponent: () =>
      import('./pages/verify/verify').then((m) => m.VerifyPageComponent),
  },
];
