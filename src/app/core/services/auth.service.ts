import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ThemeService } from './theme.service';
import { environment } from '../../../environments/environment';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService extends BaseService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private currentOrgSubject = new BehaviorSubject<any>(null);
  public currentOrg$ = this.currentOrgSubject.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private themeService: ThemeService,
    http: HttpClient
  ) {
    super(http);
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('auth_token');
      if (token && !sessionStorage.getItem('token')) {
        sessionStorage.setItem('token', token);
      }
      const user = localStorage.getItem('current_user');
      if (user) {
        try {
          const parsedUser = JSON.parse(user);
          if (parsedUser && parsedUser.user_id && !parsedUser.id) {
            parsedUser.id = parsedUser.user_id;
          }
          this.currentUserSubject.next(parsedUser);
        } catch (e) {
          console.warn('Failed to parse current_user from localStorage', e);
        }
      }
      const org = localStorage.getItem('current_org');
      if (org) {
        try {
          const parsedOrg = JSON.parse(org);
          if (parsedOrg) {
            this.currentOrgSubject.next(parsedOrg);
            this.themeService.applyTheme(parsedOrg);
          }
        } catch (e) {
          console.warn('Failed to parse current_org from localStorage', e);
          localStorage.removeItem('current_org');
        }
      }
    }
  }

  setSession(token: string, user: any) {
    if (!isPlatformBrowser(this.platformId)) return;

    localStorage.setItem('auth_token', token);
    sessionStorage.setItem('token', token);
    if (user && user.user_id && !user.id) {
      user.id = user.user_id;
    }
    localStorage.setItem('current_user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  setOrg(org: any) {
    if (!isPlatformBrowser(this.platformId)) return;

    localStorage.setItem('current_org', JSON.stringify(org));
    this.currentOrgSubject.next(org);
    this.themeService.applyTheme(org);
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return sessionStorage.getItem('token') || localStorage.getItem('auth_token');
  }

  getCurrentUser() {
    const user = this.currentUserSubject.value;
    if (user && user.user_id && !user.id) {
      user.id = user.user_id;
    }
    return user;
  }

  getCurrentOrg() {
    return this.currentOrgSubject.value;
  }

  setLanguage(language: string): void {
    const currentUser = this.getCurrentUser();
    const token = this.getToken();

    if (!currentUser || !token) return;

    this.setSession(token, {
      ...currentUser,
      language,
    });
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  refreshToken(): Observable<any> {
    const token = this.getToken();
    if (!token) return of(null);

    return this.post('/user/api/auth/refresh', { token }).pipe(
      tap(res => {
        if (res && res.token) {
          const user = this.getCurrentUser();
          this.setSession(res.token, user);
        }
      }),
      catchError(err => {
        console.error('Failed to refresh token', err);
        this.logout();
        return throwError(() => err);
      })
    );
  }

  logout() {
    if (!isPlatformBrowser(this.platformId)) return;

    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('current_user');
    localStorage.removeItem('current_org');
    localStorage.removeItem('org_theme');
    localStorage.removeItem('onboarded_completed');
    // localStorage.removeItem('selectedOrgId');
    this.currentUserSubject.next(null);
    this.currentOrgSubject.next(null);
  }

  hasPermission(module: string, submodule?: string, action?: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    if (!user.permissions_json) return false;

    try {
      const perms = typeof user.permissions_json === 'string' ? JSON.parse(user.permissions_json) : user.permissions_json;
      if (!Array.isArray(perms)) return false;

      const mod = perms.find((m: any) => m._id === module || m.id === module);
      if (!mod) return false;

      if (!submodule) {
        return true;
      }

      const sub = mod.subModules?.find((s: any) => s._id === submodule);
      if (!sub) return false;

      if (!action) {
        return true;
      }

      const perm = sub.permissions?.find((p: any) => p._id === action);
      return !!perm;
    } catch (e) {
      console.error('Failed to check permissions_json', e);
      return false;
    }
  }
}
