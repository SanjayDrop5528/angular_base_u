import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { AppLayoutComponent } from '../app-layout/app-layout.component';
import { LayoutConfig, NavItem, NavSection } from '../../layout.types';
import { AuthService } from '../../../../core/services/auth.service';
import { LayoutService } from '../../layout.service';
import { MenuService } from '../../../../core/services/utils/menu.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AppLayoutComponent],
  template: `
    <app-layout
      *ngIf="layoutConfig"
      [config]="layoutConfig"
      [user]="user"
      [org]="org"
      (navItemClick)="onNavItemClick($event)"
      (sectionClick)="onSectionClick($event)"
      (profileClick)="onLogout()">
      <router-outlet></router-outlet>
    </app-layout>
  `
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  layoutConfig?: LayoutConfig;
  user: any = {};
  org: any = {};
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private layoutService: LayoutService,
    private menuService: MenuService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.authService.currentUser$,
      this.authService.currentOrg$,
      this.menuService.menuConfig$
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([currentUser, currentOrg, menuConfig]) => {
      this.initLayout(currentUser, currentOrg, menuConfig);
    });

    // Sync on navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: any) => {
      this.syncActiveRoute(event.urlAfterRedirects || event.url);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initLayout(currentUser: any, currentOrg: any, menuConfig: { navItems: any[]; navSections: any[] }): void {
    this.user = currentUser ? {
      name: currentUser.name || currentUser.email || 'User',
      email: currentUser.email
    } : {};

    this.org = currentOrg ? {
      name: currentOrg.name,
      logoUrl: currentOrg.logoUrl || ''
    } : { name: 'SynapseMD' };

    this.layoutConfig = {
      mode: 'header-only', // no side nav, top header only
      headerMenuType: 'mega-menu',
      showLogo: true,
      appName: this.org.name,
      logoUrl: this.org.logoUrl,
      sidenavWidth: 256,
      sidenavCollapsible: true,
      sidenavCollapsed: false,
      headerHeight: 64,
      navItems: menuConfig.navItems || [],
      navSections: menuConfig.navSections || []
    };

    // Sync active route after updating config
    this.syncActiveRoute(this.router.url);
    this.cdr.markForCheck();
  }

  private syncActiveRoute(url: string) {
    if (!this.layoutConfig) return;

    const isExactMatch = (routeStr: string): boolean => {
      return routeStr === url;
    };

    const isPathMatch = (routeStr: string): boolean => {
      const rPath = routeStr.split('?')[0];
      const uPath = url.split('?')[0];
      return uPath === rPath || uPath.startsWith(rPath + '/');
    };

    // 1. Try exact match first (including query parameters)
    if (this.layoutConfig.navItems) {
      for (const item of this.layoutConfig.navItems) {
        if (item.route && isExactMatch(item.route)) {
          this.layoutService.setActiveNav(item.id);
          return;
        }
        if (item.children) {
          for (const child of item.children) {
            if (child.route && isExactMatch(child.route)) {
              this.layoutService.setActiveNav(child.id);
              return;
            }
          }
        }
      }
    }

    // 2. Fallback to path matching (ignoring query parameters)
    if (this.layoutConfig.navItems) {
      for (const item of this.layoutConfig.navItems) {
        if (item.route && isPathMatch(item.route)) {
          this.layoutService.setActiveNav(item.id);
          return;
        }
        if (item.children) {
          for (const child of item.children) {
            if (child.route && isPathMatch(child.route)) {
              this.layoutService.setActiveNav(child.id);
              return;
            }
          }
        }
      }
    }
  }

  onNavItemClick(item: NavItem): void {
    if (item.route) {
      if (item.password) {
        const pwd = prompt('Enter password to access this page:');
        if (pwd !== item.password) {
          alert('Incorrect password. Access denied.');
          return;
        }
      }
      this.router.navigateByUrl(item.route);
    }
    if (item.menuClose && !item.children?.length) {
      if (this.layoutConfig && this.layoutConfig.sidenavCollapsible && !this.layoutConfig.sidenavCollapsed) {
        if (!this.layoutService.sidenavCollapsed()) {
          this.layoutService.toggleSidenav();
        }
      }
      this.layoutService.closeMobileDrawer();
    }
  }

  onSectionClick(section: NavSection): void {
    if (section.children && section.children.length > 0) {
      const firstChild = section.children[0];
      if (firstChild.route) {
        this.router.navigate([firstChild.route]);
      }
    }
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/iam/login']);
  }
}
