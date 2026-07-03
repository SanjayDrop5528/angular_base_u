import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route-level permission guard.
 *
 * Add to any route's `canActivate` array alongside `authGuard`.
 * The route must declare `data.permission` with { module, submodule, action }.
 *
 * Example:
 * {
 *   path: 'members',
 *   canActivate: [authGuard, permissionGuard],
 *   data: {
 *     permission: {
 *       module: 'user-management-module',
 *       submodule: 'all-users',
 *       action: 'list'
 *     }
 *   },
 *   loadComponent: () => import('./users/users.component').then(m => m.UsersComponent)
 * }
 */
export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const permission = route.data?.['permission'] as
    | { module: string; submodule: string; action: string }
    | undefined;

  // No permission required on this route — allow through
  if (!permission) return true;

  const currentUser = authService.getCurrentUser();
  if (currentUser?.role_name === 'Superadmin' || currentUser?.owner_access) {
    return true;
  }

  let submodule = permission.submodule;
  let action = permission.action;

  // Override submodule for patients accessing registration bookings
  const formParam = route.params['form'];
  if (formParam === 'registration') {
    const role = (currentUser?.roleType || currentUser?.entity_type || currentUser?.role_name || '').toLowerCase();
    if (role === 'patient') {
      submodule = 'patient-booking';
    }
  }

  const allowed = authService.hasPermission(
    permission.module,
    submodule,
    action
  );

  if (!allowed) {
    // Redirect to dashboard instead of a blank screen
    router.navigate(['/user-mgmt/dashboard']);
    return false;
  }

  return true;
};
