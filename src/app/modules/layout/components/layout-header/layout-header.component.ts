import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, AfterViewInit, HostListener,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { LayoutConfig, NavItem, NavSection } from '../../layout.types';
import { LayoutService } from '../../layout.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { NavDropdownItemComponent } from './nav-dropdown-item.component';
import { AuthService } from '../../../../core/services/auth.service';
import { InAppNotification, InAppNotificationService } from '../../../../core/services/notification/in-app-notification.service';

interface HeaderLanguage {
  code: string;
  translateKey: string;
  label: string;
}

@Component({
  selector: 'app-layout-header',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatIconModule, MatButtonModule, MatMenuModule,
    MatTooltipModule, MatDividerModule, TranslateModule,
    NavDropdownItemComponent          // ← each instance gets its own mat-menu scope
  ],
  templateUrl: './layout-header.component.html',
  styleUrls: ['./layout-header.component.scss'],
  // Default CD — required so CSS-driven *ngFor updates are detected normally
  changeDetection: ChangeDetectionStrategy.Default
})
export class LayoutHeaderComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() config!: LayoutConfig;
  @Input() user: any = {};
  @Input() org: any = {};

  @Output() navItemClick = new EventEmitter<NavItem>();
  @Output() sectionClick = new EventEmitter<NavSection>();
  @Output() profileClick = new EventEmitter<void>();
  @Output() logoClick = new EventEmitter<void>();
  @Output() menuToggle = new EventEmitter<void>();

  activeSectionId: string | null = null;
  activeNavId: string | null = null;
  openMegaMenuId: string | null = null;
  isMenuClicked = false;
  currentThemeMode: 'night' | 'morning' = 'night';
  currentLanguage = 'en';
  notifications: InAppNotification[] = [];
  unreadNotificationCount = 0;
  languages: HeaderLanguage[] = [
    { code: 'en', translateKey: 'english', label: 'English' },
    { code: 'hi', translateKey: 'hindi', label: 'Hindi' },
    { code: 'ta', translateKey: 'tamil', label: 'Tamil' },
    { code: 'mr', translateKey: 'marathi', label: 'Marathi' },
    { code: 'ne', translateKey: 'nepali', label: 'Nepali' },
    { code: 'ms', translateKey: 'malay', label: 'Malay' },
  ];

  /** Mobile nav drawer open (header-only) */
  mobileNavOpen = false;

  /** Which header nav group ids are expanded in mobile drawer */
  expandedHeaderGroups = new Set<string>();

  private destroy$ = new Subject<void>();

  constructor(
    public layoutService: LayoutService,
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private router: Router,
    private translateService: TranslateService,
    private inAppNotificationService: InAppNotificationService
  ) { }

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.screenWidth = window.innerWidth;
    }

    this.layoutService.activeSectionId$
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => { this.activeSectionId = id; });

    this.layoutService.activeNavId$
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        this.activeNavId = id;
        this.cdr.markForCheck();
      });

    this.restoreActiveNav();

    this.themeService.themeMode$
      .pipe(takeUntil(this.destroy$))
      .subscribe(mode => {
        this.currentThemeMode = mode;
        this.cdr.markForCheck();
      });

    this.currentLanguage = this.normalizeLanguageCode(
      this.user?.language || this.authService.getCurrentUser()?.language || 'en'
    );

    this.inAppNotificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications.slice(0, 5);
        this.cdr.markForCheck();
      });

    this.inAppNotificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadNotificationCount = count;
        this.cdr.markForCheck();
      });

    this.inAppNotificationService.loadLatest();
    this.expandAllHeaderGroups();
  }

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.screenWidth = window.innerWidth;
        this.cdr.detectChanges();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  screenWidth: number = typeof window !== 'undefined' ? window.innerWidth : 1200;

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.screenWidth = event.target.innerWidth;
    this.cdr.markForCheck();
  }

  // ── Getters ──────────────────────────────────────────────────
  get isMegaMenu(): boolean { return this.config?.headerMenuType === 'mega-menu'; }
  get headerItems(): NavItem[] { return this.config?.navItems ?? []; }
  get visibleHeaderItems(): NavItem[] {
    const items = this.config?.navItems ?? [];

    // Dynamically calculate limit based on screen width to prevent overlap while maximizing space
    let limit = 3;
    if (this.screenWidth > 1750) {
      limit = 8;
    } else if (this.screenWidth > 1550) {
      limit = 5;
    } else if (this.screenWidth > 1350) {
      limit = 4;
    } else if (this.screenWidth > 1200) {
      limit = 3;
    } else {
      limit = 2;
    }

    if (items.length <= limit + 1) {
      return items;
    }

    const visible = items.slice(0, limit);
    const overflow = items.slice(limit);

    const moreItem: NavItem = {
      id: 'more_nav_item',
      label: 'MENU_CONFIG.MORE',
      icon: 'more_horiz',
      children: overflow
    };

    return [...visible, moreItem];
  }
  get headerSections(): NavSection[] { return this.config?.navSections ?? []; }

  // ── Clicks ───────────────────────────────────────────────────
  onSectionClick(section: NavSection): void {
    this.layoutService.setActiveSection(section.id, this.config);
    this.layoutService.closeMobileDrawer();
    this.sectionClick.emit(section);
  }

  onNavItemClick(item: NavItem): void {
    if (item.disabled) return;
    this.layoutService.setActiveNav(item.id);
    this.navItemClick.emit(item);
    if (item.action) item.action();

    this.isMenuClicked = true;
    this.openMegaMenuId = null;
    this.cdr.markForCheck();
  }

  onHamburgerClick(): void {
    if (this.config?.mode === 'header-only') {
      this.mobileNavOpen = !this.mobileNavOpen;
    } else {
      this.layoutService.toggleMobileDrawer();
    }
    this.menuToggle.emit();
  }

  closeMobileNav(): void { this.mobileNavOpen = false; }
  onProfileClick(): void { this.profileClick.emit(); }
  toggleThemeMode(): void { this.themeService.toggleThemeMode(); }

  openNotificationsScreen(): void {
    this.router.navigate(['/user-mgmt/notifications']);
  }

  markNotificationRead(notification: InAppNotification, event?: Event): void {
    event?.stopPropagation();
    this.inAppNotificationService.markRead(notification);
  }

  markAllNotificationsRead(event?: Event): void {
    event?.stopPropagation();
    this.inAppNotificationService.markAllRead();
  }

  refreshNotifications(event?: Event): void {
    event?.stopPropagation();
    this.inAppNotificationService.refresh();
  }

  changeLanguage(language: HeaderLanguage): void {
    this.currentLanguage = language.code;
    this.authService.setLanguage(language.code);
    localStorage.setItem('language', language.code);
    this.translateService.use(language.translateKey);
    this.cdr.markForCheck();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/iam/login']);
  }

  openSettings(tab: string): void {
    this.router.navigate(['/user-mgmt/settings'], { queryParams: { tab } });
  }

  // ── Helpers ──────────────────────────────────────────────────
  isHeaderGroupExpanded(groupId: string): boolean {
    return this.expandedHeaderGroups.has(groupId);
  }

  toggleHeaderGroup(groupId: string): void {
    if (this.expandedHeaderGroups.has(groupId)) {
      this.expandedHeaderGroups.delete(groupId);
    } else {
      this.expandedHeaderGroups.add(groupId);
    }
  }

  expandAllHeaderGroups(): void {
    const expand = (items: NavItem[]) => {
      items.forEach(item => {
        if (this.hasChildren(item)) {
          this.expandedHeaderGroups.add(item.id);
          if (item.children) {
            expand(item.children);
          }
        }
      });
    };
    expand(this.config?.navItems ?? []);
    if (this.config?.navSections) {
      this.config.navSections.forEach(section => {
        if (section.children) {
          expand(section.children);
        }
      });
    }
  }

  hasChildren(item: NavItem): boolean { return !!(item?.children?.length); }
  isActiveSection(id: string): boolean { return this.activeSectionId === id; }
  isActiveNav(id: string): boolean { return this.activeNavId === id; }

  hasActiveDescendant(item: NavItem): boolean {
    if (!item?.children) return false;
    return item.children.some(c => this.isActiveNav(c.id) || this.hasActiveDescendant(c));
  }

  private restoreActiveNav(): void {
    const allItems = this.config?.navItems ?? [];
    const url = this.router.url.split('?')[0];
    // 1. Try match by current route
    const routeId = this.layoutService.resolveNavIdFromUrl(url, allItems);
    if (routeId) { this.layoutService.setActiveNav(routeId); return; }
    // 2. Fall back to localStorage
    const stored = localStorage.getItem('activeNavId');
    if (stored) { this.layoutService.setActiveNav(stored); }
  }

  hasFlatChildren(item: NavItem): boolean {
    return !!item?.children?.some(child => !this.hasChildren(child));
  }

  isHierarchical(item: NavItem): boolean {
    return !!item?.children?.some(child => this.hasChildren(child));
  }

  onMouseEnterTrigger(item: NavItem): void {
    this.isMenuClicked = false;
    if (this.hasChildren(item)) {
      this.openMegaMenuId = item.id;
    } else {
      this.openMegaMenuId = null;
    }
    this.cdr.markForCheck();
  }

  onNavBtnClick(item: NavItem): void {
    if (!this.hasChildren(item)) {
      this.onNavItemClick(item);
      return;
    }
    this.isMenuClicked = false;
    if (this.openMegaMenuId === item.id) {
      this.openMegaMenuId = null;
    } else {
      this.openMegaMenuId = item.id;
    }
    this.cdr.markForCheck();
  }

  resetMegaMenu(): void {
    this.openMegaMenuId = null;
    this.isMenuClicked = false;
    this.cdr.markForCheck();
  }

  get userInitial(): string {
    const name = this.user?.name || 'User';
    return name?.[0]?.toUpperCase() ?? 'U';
  }
  get userName(): string {
    return this.user?.name || 'User';
  }

  get userEmail(): string {
    return this.user?.email || this.authService.getCurrentUser()?.email || '';
  }

  get activeLanguageLabel(): string {
    return this.languages.find(language => language.code === this.currentLanguage)?.label || 'English';
  }

  get notificationBadgeLabel(): string {
    return this.unreadNotificationCount > 99 ? '99+' : `${this.unreadNotificationCount}`;
  }

  getNotificationTitle(notification: InAppNotification): string {
    return notification.title || 'Notification';
  }

  getNotificationBody(notification: InAppNotification): string {
    return notification.body || '';
  }

  getNotificationTime(notification: InAppNotification): string {
    const date = new Date(notification.createdAt);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  private normalizeLanguageCode(language: string): string {
    const match = this.languages.find(item => item.code === language || item.translateKey === language);
    return match?.code || 'en';
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.mob-drawer') && !t.closest('.hamburger') && this.mobileNavOpen) {
      this.closeMobileNav();
    }
  }
}
