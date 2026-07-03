import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { of, map, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const http = inject(HttpClient);

  if (!authService.isLoggedIn()) {
    router.navigate(['/iam/login']);
    return false;
  }

  // Welcome page — just check login, skip onboarding check
  if (state.url.startsWith('/welcome')) {
    return true;
  }

  const user = authService.getCurrentUser();
  if (user && (user.role_name === 'Patient' || user.role_name === 'User')) {
    // If onboarding is already verified as complete, proceed immediately
    if (localStorage.getItem('onboarded_completed') === 'true') {
      return true;
    }

    const baseUrl = environment.apiBaseUrl || '';
    const cleanUrl = baseUrl.endsWith('/') ? baseUrl : (baseUrl + '/');

    return http.post<any>(cleanUrl + 'entities/filter/patients', {
      start: 0, end: 100, filter: [
        {
          Clause: "AND",
          conditions: [{
            column: "record_access_user_ids",
            operator: "IN",
            type: "string",
            value: user.id
          }]
        }
      ]
    }).pipe(
      map((res: any) => {
        const list: any[] = res?.data?.[0]?.response ?? res?.data ?? (Array.isArray(res) ? res : []);

        const hasCompletedPatient = list.some((p: any) => {
          const status = (p.status || '').toLowerCase();
          return status === 'completed' || status === 'active';
        });

        if (hasCompletedPatient) {
          localStorage.setItem('onboarded_completed', 'true');
          return true;
        }

        router.navigate(['/onboard']);
        return false;
      }),
      catchError(() => {
        router.navigate(['/onboard']);
        return of(false);
      })
    );
  }

  return true;
};
