/**
 * Layout Module Types
 */

export type LayoutMode = 'header-only' | 'sidenav-only' | 'header-sidenav' | 'simple-header' | string;
export type HeaderMenuType = 'mega-menu' | 'normal-menu';

export interface NavItem {
  id: string;
  label: string;
  icon?: string;
  svgIcon?: string;
  route?: string;
  action?: () => void;
  badge?: number | string;
  children?: NavItem[];
  permissions?: string[];
  disabled?: boolean;
  dividerAfter?: boolean;
  password?: string;
  menuClose?: boolean;
}

export interface NavSection {
  id: string;
  label: string;
  icon?: string;
  children: NavItem[];
}

/**
 * Full set of CSS custom-property theme tokens for the layout surfaces.
 * All properties are optional — missing values fall back to the global design-system vars.
 *
 * These are written directly onto :root via LayoutService.applyLayoutTheme()
 * so every component SCSS can consume them with var().
 */
export interface LayoutThemeColors {
  // ── Header (Top Nav) ──────────────────────────────────────
  /** e.g. white | linear-gradient(...) */
  'header-bg-color'?: string;
  /** px value, e.g. "64px" */
  'header-height'?: string;
  /** Normal nav item font color */
  'header-font-color'?: string;
  /** Header icon color */
  'header-icon-color'?: string;
  /** Child menu item font color (normal-menu dropdown) */
  'header-child-font-color'?: string;
  /** Child menu item icon color */
  'header-child-icon-color'?: string;
  /** Child menu item text color */
  'header-child-font-text-color'?: string;

  // ── Mega Menu ──────────────────────────────────────────────
  /** Parent-level mega trigger background */
  'meagmenu-parent-bg-color'?: string;
  /** Parent-level mega trigger font color */
  'meagmenu-parent-font-color'?: string;
  /** Active parent trigger background */
  'meagmenu-active-bg'?: string;
  /** Active parent trigger font color */
  'meagmenu-parent-active-font-color'?: string;
  /** Active parent trigger icon color */
  'meagmenu-parent-active-icon-color'?: string;
  /** Child item hover background */
  'megamenu-child-hover-bg'?: string;
  /** Child item font color */
  'megamenu-child-font-color'?: string;
  /** Child item icon color */
  'megamenu-child-icon-color'?: string;
  /** Child item label text color */
  'megamenu-child-font-text-color'?: string;
  /** Column divider color */
  'megamenu-child-diveder-color'?: string;
  /** Active mega-link icon color */
  'meagmenulink-active-icon-color'?: string;
  /** Active mega-link font color */
  'meagmenulink-active-font-color'?: string;
  /** Mega menu active background (dropdown panel) */
  'mega-menu-active-bg-color'?: string;

  // ── Side Nav ───────────────────────────────────────────────
  /** Sidenav width, e.g. "15rem" or "240px" */
  'sidenav-bg-width'?: string;
  /** Sidenav panel background */
  'sidenav-bg-color'?: string;
  /** Normal nav item font color */
  'sidenav-font-color'?: string;
  /** Normal nav item icon color */
  'sidenav-icon-color'?: string;
  /** Active nav link background */
  'sidenavlink-active-bg'?: string;
  /** Active nav link icon color */
  'sidenavlink-active-icon-color'?: string;
  /** Active nav link font color */
  'sidenavlink-active-font-color'?: string;
}

export interface LayoutConfig {
  mode: LayoutMode;
  headerMenuType?: HeaderMenuType;
  sidenavWidth?: number;
  sidenavCollapsible?: boolean;
  sidenavCollapsed?: boolean;
  headerHeight?: number;
  showLogo?: boolean;
  logoUrl?: string;
  appName?: string;
  navItems?: NavItem[];
  navSections?: NavSection[];
  /** Full CSS-variable theme overrides applied to :root */
  themeColors?: LayoutThemeColors;
}
