import { Injectable, signal, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Subject } from 'rxjs';
import { LayoutConfig, LayoutThemeColors, NavSection, NavItem } from './layout.types';

@Injectable({ providedIn: 'root' })
export class LayoutService {

  // ── Back button click stream ─────────────────────────────────────────────
  private _backClick$ = new Subject<void>();
  backClick$ = this._backClick$.asObservable();

  triggerBackClick(): void {
    this._backClick$.next();
  }

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  // ── Sidenav collapsed state ──────────────────────────────────────────────
  private _sidenavCollapsed = signal(false);
  sidenavCollapsed = this._sidenavCollapsed.asReadonly();

  // ── Mobile drawer open state ─────────────────────────────────────────────
  private _mobileOpen = signal(false);
  mobileOpen = this._mobileOpen.asReadonly();

  // ── Active section (for header-sidenav mode) ─────────────────────────────
  private _activeSectionId$ = new BehaviorSubject<string | null>(null);
  activeSectionId$ = this._activeSectionId$.asObservable();

  // ── Active nav item id ────────────────────────────────────────────────────
  private _activeNavId$ = new BehaviorSubject<string | null>(null);
  activeNavId$ = this._activeNavId$.asObservable();

  // ── Layout config ─────────────────────────────────────────────────────────
  private _config$ = new BehaviorSubject<LayoutConfig | null>(null);
  config$ = this._config$.asObservable();

  setConfig(config: LayoutConfig): void {
    this._sidenavCollapsed.set(config.sidenavCollapsed ?? false);
    this._config$.next(config);
    // Apply theme tokens to :root
    if (config.themeColors) {
      this.applyLayoutTheme(config.themeColors);
    }
    // Auto-select first section if header-sidenav
    if (config.mode === 'header-sidenav' && config.navSections?.length) {
      this._activeSectionId$.next(config.navSections[0].id);
      const firstChild = config.navSections[0].children?.[0];
      if (firstChild) this._activeNavId$.next(firstChild.id);
    }
  }

  /**
   * Write all LayoutThemeColors keys as CSS custom properties on :root.
   * Keys match exactly the CSS var names (without the leading --).
   * Empty/undefined values clear the property so the SCSS fallback kicks in.
   */
  applyLayoutTheme(colors: LayoutThemeColors): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const root = document.documentElement;
    const entries = Object.entries(colors) as [string, string | undefined][];
    for (const [key, value] of entries) {
      if (value) {
        root.style.setProperty(`--${key}`, value);
      } else {
        root.style.removeProperty(`--${key}`);
      }
    }
  }

  toggleSidenav(): void {
    this._sidenavCollapsed.update(v => !v);
  }

  toggleMobileDrawer(): void {
    this._mobileOpen.update(v => !v);
  }

  closeMobileDrawer(): void {
    this._mobileOpen.set(false);
  }

  setActiveSection(sectionId: string, config: LayoutConfig): void {
    this._activeSectionId$.next(sectionId);
    const section = config.navSections?.find(s => s.id === sectionId);
    const firstChild = section?.children?.[0];
    if (firstChild) this._activeNavId$.next(firstChild.id);
  }

  setActiveNav(navId: string): void {
    this._activeNavId$.next(navId);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('activeNavId', navId);
    }
  }

  /** Walk the full nav tree and return the id of the item whose route matches the given url */
  resolveNavIdFromUrl(url: string, items: NavItem[]): string | null {
    for (const item of items) {
      if (item.route && url.startsWith(item.route)) return item.id;
      if (item.children?.length) {
        const found = this.resolveNavIdFromUrl(url, item.children);
        if (found) return found;
      }
    }
    return null;
  }

  getActiveSectionChildren(config: LayoutConfig): NavItem[] {
    const sectionId = this._activeSectionId$.getValue();
    if (!sectionId || !config.navSections) return [];
    return config.navSections.find(s => s.id === sectionId)?.children ?? [];
  }
}
