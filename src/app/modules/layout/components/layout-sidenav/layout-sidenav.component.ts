import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { LayoutConfig, NavItem } from '../../layout.types';
import { LayoutService } from '../../layout.service';

@Component({
  selector: 'app-layout-sidenav',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatTooltipModule, TranslateModule],
  templateUrl: './layout-sidenav.component.html',
  styleUrls: ['./layout-sidenav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutSidenavComponent implements OnInit, OnDestroy {
  @Input() config!: LayoutConfig;
  @Input() user: any = {};
  @Input() org: any = {};

  @Output() navItemClick = new EventEmitter<NavItem>();
  @Output() logoClick = new EventEmitter<void>();

  activeNavId: string | null = null;
  activeSectionId: string | null = null;
  isMobile = false;

  /** Which nav group ids are expanded */
  expandedGroups = new Set<string>();

  private destroy$ = new Subject<void>();

  constructor(
    public layoutService: LayoutService,
    private cdr: ChangeDetectorRef,
    private breakpointObserver: BreakpointObserver,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.breakpointObserver
      .observe(['(max-width: 1200px)'])
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.isMobile = state.matches;
        this.cdr.markForCheck();
      });
    this.layoutService.activeNavId$
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        this.activeNavId = id;
        this.cdr.markForCheck();
      });

    this.restoreActiveNav();

    this.layoutService.activeSectionId$
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        this.activeSectionId = id;
        if (id) {
          this.expandedGroups.add(id);
        }
        this.cdr.markForCheck();
      });

    this.expandAllGroups();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get collapsed(): boolean {
    return this.layoutService.sidenavCollapsed();
  }

  get mobileOpen(): boolean {
    return this.layoutService.mobileOpen();
  }

  /** Nav items for sidenav-only mode */
  get navItems(): NavItem[] {
    return this.config?.navItems ?? [];
  }

  /** Nav items for header-sidenav mode: children of active section */
  get sectionChildren(): NavItem[] {
    return this.layoutService.getActiveSectionChildren(this.config);
  }

  get activeSectionLabel(): string {
    return this.config?.navSections?.find(s => s.id === this.activeSectionId)?.label ?? '';
  }

  get displayItems(): NavItem[] {
    if (this.config?.mode === 'header-sidenav') {
      if (this.isMobile) {
        return this.config?.navSections?.map(section => ({
          id: section.id,
          label: section.label,
          icon: section.icon || 'folder',
          children: section.children
        })) ?? [];
      }
      return this.sectionChildren;
    }
    return this.navItems;
  }

  isActive(item: NavItem): boolean {
    return this.activeNavId === item.id;
  }

  hasActiveDescendant(item: NavItem): boolean {
    if (!item?.children) return false;
    return item.children.some(c => c.id === this.activeNavId || this.hasActiveDescendant(c));
  }

  private restoreActiveNav(): void {
    const allItems = this.config?.navItems ?? [
      ...(this.config?.navSections?.flatMap(s => s.children) ?? [])
    ];
    const url = this.router.url.split('?')[0];
    const routeId = this.layoutService.resolveNavIdFromUrl(url, allItems);
    if (routeId) { this.layoutService.setActiveNav(routeId); return; }
    const stored = localStorage.getItem('activeNavId');
    if (stored) { this.layoutService.setActiveNav(stored); }
  }

  hasChildren(item: NavItem): boolean {
    return !!(item.children?.length);
  }

  isExpanded(itemId: string): boolean {
    return this.expandedGroups.has(itemId);
  }

  toggleGroup(itemId: string): void {
    if (this.expandedGroups.has(itemId)) {
      this.expandedGroups.delete(itemId);
    } else {
      this.expandedGroups.add(itemId);
    }
  }

  expandAllGroups(): void {
    const expand = (items: NavItem[]) => {
      items.forEach(item => {
        if (this.hasChildren(item)) {
          this.expandedGroups.add(item.id);
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

  onItemClick(item: NavItem): void {
    if (item.disabled) return;
    if (this.hasChildren(item)) {
      if (item.route || item.action) {
        this.layoutService.setActiveNav(item.id);
        this.navItemClick.emit(item);
        if (item.action) item.action();
      } else {
        if (this.collapsed) {
          // In collapsed mode, expand sidenav first
          this.layoutService.toggleSidenav();
          this.expandedGroups.add(item.id);
        } else {
          this.toggleGroup(item.id);
        }
      }
      return;
    }
    this.layoutService.setActiveNav(item.id);
    if (item.menuClose && !this.collapsed) {
      this.layoutService.toggleSidenav();
    }
    this.navItemClick.emit(item);
    if (item.action) item.action();
  }

  toggleCollapse(): void {
    this.layoutService.toggleSidenav();
  }

  closeMobileDrawer(): void {
    this.layoutService.closeMobileDrawer();
  }

  get userInitial(): string {
    return (this.user?.name || this.user?.email || 'U')[0].toUpperCase();
  }
}
