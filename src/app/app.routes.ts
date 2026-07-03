import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { MainLayoutComponent } from './modules/layout/components/main-layout/main-layout.component';
import { SimpleLayoutComponent } from './modules/layout/layout.module';

export const routes: Routes = [
  // ── Public / Auth routes (no guard) ─────────────────────────────────────
  {
    path: 'iam/login',
    loadComponent: () =>
      import('./modules/iam/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'iam/onboarding',
    loadComponent: () =>
      import('./modules/iam/onboarding/onboarding.component').then(m => m.OnboardingComponent)
  },
  {
    path: 'iam/register',
    loadComponent: () =>
      import('./modules/iam/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'iam/reset-password',
    loadComponent: () =>
      import('./modules/iam/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'iam/mfa-verify',
    loadComponent: () =>
      import('./modules/iam/mfa-verify/mfa-verify.component').then(m => m.MfaVerifyComponent)
  },
  {
    path: 'iam/change-password',
    loadComponent: () =>
      import('./modules/iam/change-password/change-password.component').then(m => m.ChangePasswordComponent)
  },

  // ── Authenticated layout shell ───────────────────────────────────────────
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [

      // ── User Management ────────────────────────────────────────────────
      {
        path: 'user-mgmt',
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          // Members
          {
            path: 'members',
            canActivate: [permissionGuard],
            data: { permission: { module: 'user-management-module', submodule: 'all-users', action: 'list' } },
            loadComponent: () =>
              import('./modules/user-mgmt/users/users.component')
                .then(m => m.UsersComponent)
          },
          // Roles
          {
            path: 'roles',
            canActivate: [permissionGuard],
            data: { permission: { module: 'user-management-module', submodule: 'user-roles', action: 'list' } },
            loadComponent: () =>
              import('./modules/user-mgmt/roles/roles.component')
                .then(m => m.RolesComponent)
          },
          // Sessions
          {
            path: 'sessions',
            canActivate: [permissionGuard],
            data: { permission: { module: 'user-management-module', submodule: 'user-sessions', action: 'list' } },
            loadComponent: () =>
              import('./modules/user-mgmt/sessions/sessions.component')
                .then(m => m.SessionsComponent)
          },
          // Settings — open to all authenticated users inside user-mgmt
          {
            path: 'settings',
            loadComponent: () =>
              import('./modules/user-mgmt/settings/settings.component')
                .then(m => m.SettingsComponent)
          },

          // Global Configuration — platform admin settings
          {
            path: 'global-config',
            loadComponent: () =>
              import('./modules/settings/global-config.component')
                .then(m => m.GlobalConfigComponent)
          },

          // Notifications (user-level inbox)
          {
            path: 'notifications',
            data: { activeTab: 'inbox' },
            loadComponent: () =>
              import('./modules/notifications/notifications.component')
                .then(m => m.NotificationsComponent)
          }
        ]
      },
      // ── Notification Center ────────────────────────────────────────────
      {
        path: 'notifications',
        children: [
          {
            path: 'channels',
            canActivate: [permissionGuard],
            data: { permission: { module: 'notification-module', submodule: 'channels', action: 'list' }, activeTab: 'channels' },
            loadComponent: () =>
              import('./modules/notifications/notifications.component')
                .then(m => m.NotificationsComponent)
          },
          {
            path: 'events',
            canActivate: [permissionGuard],
            data: { permission: { module: 'notification-module', submodule: 'notification-center', action: 'list' }, activeTab: 'events' },
            loadComponent: () =>
              import('./modules/notifications/notifications.component')
                .then(m => m.NotificationsComponent)
          },
          {
            path: 'templates',
            canActivate: [permissionGuard],
            data: { permission: { module: 'notification-module', submodule: 'notification-center', action: 'list' }, activeTab: 'templates' },
            loadComponent: () =>
              import('./modules/notifications/notifications.component')
                .then(m => m.NotificationsComponent)
          },
          {
            path: 'check',
            canActivate: [permissionGuard],
            data: { permission: { module: 'notification-module', submodule: 'notification-center', action: 'list' }, activeTab: 'check' },
            loadComponent: () =>
              import('./modules/notifications/notifications.component')
                .then(m => m.NotificationsComponent)
          },
          {
            path: 'delivery-logs',
            canActivate: [permissionGuard],
            data: { permission: { module: 'notification-module', submodule: 'notification-history', action: 'list' }, activeTab: 'delivery-logs' },
            loadComponent: () =>
              import('./modules/notifications/notifications.component')
                .then(m => m.NotificationsComponent)
          }
        ]
      },
      {
        path: 'add/:form',
        canActivate: [permissionGuard],
        data: {
          permission: { module: 'roaster-module', submodule: 'roaster', action: 'list' },
          component: true
        },
        loadComponent: () =>
          import('./modules/dynamic/components/dynamic-form/dynamic-form.component')
            .then(m => m.DynamicFormComponent)
      },
      {
        path: 'add/:form/:id',
        canActivate: [permissionGuard],
        data: {
          permission: { module: 'roaster-module', submodule: 'roaster', action: 'list' },
          component: true
        },
        loadComponent: () =>
          import('./modules/dynamic/components/dynamic-form/dynamic-form.component')
            .then(m => m.DynamicFormComponent)
      },
      { path: '', redirectTo: 'user-mgmt/dashboard', pathMatch: 'full' }
    ]
  },

  {
    path: 'layout-demo',
    loadComponent: () =>
      import('./modules/layout/demo/layout-demo.component')
        .then(m => m.LayoutDemoComponent)
  },

  { path: '**', redirectTo: 'user-mgmt/dashboard' }
];
