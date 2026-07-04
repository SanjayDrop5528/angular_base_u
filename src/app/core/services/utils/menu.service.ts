import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { catchError, of } from 'rxjs';
import { AuthService } from '../auth.service';
import {
  defaultNavItems,
  defaultNavSections,
  patientNavItems,
  filterMenuItems,
  filterNavSections
} from '../../../modules/layout/menu-config';
import { BaseService } from '../base.service';

@Injectable({
  providedIn: 'root'
})
export class MenuService extends BaseService {
  private menuConfigSubject = new BehaviorSubject<{ navItems: any[]; navSections: any[] }>({
    navItems: [],
    navSections: []
  });
  public menuConfig$ = this.menuConfigSubject.asObservable();
  private authService: AuthService;

  private loadPromise: Promise<any> | null = null;
  private lastUserId: string | null = null;

  constructor(
    http: HttpClient,
    authService: AuthService
  ) {
    super(http);
    this.authService = authService;
    // Listen to current user changes to dynamically update/reload menus ONCE
    this.authService.currentUser$.subscribe(user => {
      this.loadMenu(user);
    });
  }

  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    const array = new Uint32Array(1);
    (window.crypto || (window as any).msCrypto).getRandomValues(array);
    return 'menu-' + array[0].toString(36) + '-' + Date.now();
  }

  public loadMenu(currentUser?: any): Promise<any> {
    const user = currentUser || this.authService.getCurrentUser();
    const userId = user ? (user.id || user.user_id) : null;

    // If the user has not changed and we already have a promise, return the existing promise to prevent duplicate calls.
    if (this.loadPromise && userId === this.lastUserId) {
      return this.loadPromise;
    }

    this.lastUserId = userId;

    if (!user) {
      const result = { navItems: [], navSections: [] };
      this.menuConfigSubject.next(result);
      this.loadPromise = Promise.resolve(result);
      return this.loadPromise;
    }

    const checkPerm = (module: string, submodule: string, action: string): boolean => {
      if (user.role_name === 'Superadmin' || user.owner_access) {
        return true;
      }
      return this.authService.hasPermission(module, submodule, action);
    };
    // Call the backend to fetch the role menus and cache the loading promise
    this.loadPromise = new Promise((resolve) => {
      this.get('/user/api/entities/role_menus').pipe(
        catchError(err => {
          console.error('Failed to load role menus in MenuService', err);
          // Fallback to defaultNavItems if API fails
          const navItems = filterMenuItems(defaultNavItems, checkPerm);
          const navSections = filterNavSections(defaultNavSections, checkPerm);
          return of({ navItems, navSections });
        })
      ).subscribe(res => {
        if ('navItems' in res) {
          // Came from catchError fallback
          this.menuConfigSubject.next(res);
          resolve(res);
          return;
        }

        if (Array.isArray(res) && res.length > 0) {
          const matched = res[0];
          if (matched) {
            try {
              let parsed = matched.menu_config;
              if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
              }
              if (Array.isArray(parsed) && parsed.length > 0) {
                // Normalize DB-stored module names (e.g. "User Management Module") to
                // the kebab-case format used by the permission system ("user-management-module")
                const normalizeModuleName = (name: string): string =>
                  name.trim().toLowerCase().replace(/\s+/g, '-');

                const mapDbItem = (item: any): any => {
                  const mapped: any = {
                    id: item.id || this.generateUUID(),
                    label: item.displayName,
                    icon: item.icon || 'link',
                    // treat empty string routes as undefined so parent-group items render correctly
                    route: item.route || undefined,
                    password: item.password || undefined,
                    menuClose: item.menuClose || undefined
                  };
                  if (item.permission && Array.isArray(item.permission) && item.permission.length === 2 && item.permission[0]) {
                    mapped.requiredPermission = {
                      module: normalizeModuleName(item.permission[0]),
                      submodule: normalizeModuleName(item.permission[1]),
                      action: 'list'
                    };
                  }
                  if (item.children && Array.isArray(item.children)) {
                    mapped.children = item.children.map(mapDbItem);
                  }
                  return mapped;
                };

                const mappedItems = parsed.map(mapDbItem);
                const filteredItems = filterMenuItems(mappedItems, checkPerm);
                const navSections = filteredItems.map(item => ({
                  id: item.id,
                  label: item.label,
                  icon: item.icon || 'link',
                  children: item.children || []
                }));
                const result = { navItems: filteredItems, navSections };
                this.menuConfigSubject.next(result);
                resolve(result);
                return;
              }
            } catch (e) {
              console.error('Failed to parse role menu config in MenuService', e);
            }
          }
        }

        // Fallback if no matching sidenav menu is returned by database
        const navItems = filterMenuItems(defaultNavItems, checkPerm);
        const navSections = filterNavSections(defaultNavSections, checkPerm);
        const result = { navItems, navSections };
        this.menuConfigSubject.next(result);
        resolve(result);
      });
    });

    return this.loadPromise;
  }
}
