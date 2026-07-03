import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AppLayoutComponent } from '../components/app-layout/app-layout.component';
import {
  LayoutConfig, NavItem, NavSection,
  LayoutMode, HeaderMenuType, LayoutThemeColors
} from '../layout.types';
import { LayoutService } from '../layout.service';
import { ThemeService } from '../../../core/services/theme.service';
import { CoreCard, CardSchema } from '../../shared/components/core-card/core-card';
import { CoreGrid } from '../../shared/components/core-grid/core-grid';
import { SharedModule } from '../../shared/shared.module';

interface ThemePreset {
  name: string;
  primary: string;
  secondary: string;
  label: string;
}

/** Surface colour preset — maps directly to LayoutThemeColors CSS var keys */
interface SurfacePreset {
  name: string;
  colors: LayoutThemeColors;
}

@Component({
  selector: 'app-layout-demo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatTabsModule,
    MatChipsModule,
    MatListModule,
    AppLayoutComponent,
    CoreCard,
    CoreGrid,
    SharedModule,
  ],
  templateUrl: './layout-demo.component.html',
  styleUrls: ['./layout-demo.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutDemoComponent implements OnInit, OnDestroy {
  // ── Controls ────────────────────────────────────────────────
  selectedMode: LayoutMode = 'header-sidenav';
  selectedMenuType: HeaderMenuType = 'mega-menu';
  selectedTheme = 0;
  selectedSurface = 0;

  activeNavId: string | null = null;
  activeSectionId: string | null = null;
  lastNavLabel = '';

  modeOptions: { value: LayoutMode; label: string; icon: string }[] = [
    { value: 'header-only', label: 'Header Only', icon: 'web_asset' },
    { value: 'sidenav-only', label: 'Sidenav Only', icon: 'view_sidebar' },
    { value: 'header-sidenav', label: 'Header + Sidenav', icon: 'dashboard' },
  ];

  menuTypeOptions: { value: HeaderMenuType; label: string; icon: string }[] = [
    { value: 'mega-menu', label: 'Mega Menu', icon: 'grid_view' },
    { value: 'normal-menu', label: 'Normal Menu', icon: 'menu' },
  ];

  // ── Global accent colour presets ─────────────────────────────
  themes: ThemePreset[] = [
    { name: 'Cobalt Blue', primary: '#1a73e8', secondary: '#9c27b0', label: 'Classic' },
    { name: 'Teal Cyan', primary: '#009688', secondary: '#00bcd4', label: 'Teal' },
    { name: 'Emerald', primary: '#2e7d32', secondary: '#ffc107', label: 'Sunset' },
    { name: 'Rose', primary: '#e91e63', secondary: '#ff5722', label: 'Rose' },
    { name: 'Indigo', primary: '#5c6bc0', secondary: '#26c6da', label: 'Indigo' },
    { name: 'Amber', primary: '#f59e0b', secondary: '#ef4444', label: 'Amber' },
  ];

  // ── Surface (header / sidenav background) presets ────────────
  surfacePresets: SurfacePreset[] = [
    {
      name: 'Glass Dark',
      colors: {
        'header-bg-color': 'rgba(18,22,31,0.88)',
        'header-font-color': '#8b9bb4',
        'header-icon-color': '#8b9bb4',
        'meagmenu-parent-bg-color': 'rgba(18,22,31,0.88)',
        'meagmenu-parent-font-color': '#8b9bb4',
        'megamenu-child-font-text-color': '#f1f3f9',
        'megamenu-child-icon-color': '#8b9bb4',
        'megamenu-child-hover-bg': 'rgba(255,255,255,0.07)',
        'megamenu-child-diveder-color': 'rgba(255,255,255,0.08)',
        'sidenav-bg-color': 'rgba(18,22,31,0.75)',
        'sidenav-font-color': '#8b9bb4',
        'sidenav-icon-color': '#8b9bb4',
      }
    },
    {
      name: 'Deep Navy',
      colors: {
        'header-bg-color': '#0d1b2a',
        'header-font-color': '#90aac4',
        'header-icon-color': '#90aac4',
        'meagmenu-parent-bg-color': '#0d1b2a',
        'meagmenu-parent-font-color': '#90aac4',
        'meagmenu-parent-active-font-color': '#62b4ff',
        'meagmenu-parent-active-icon-color': '#62b4ff',
        'meagmenu-active-bg': 'rgba(98,180,255,0.12)',
        'megamenu-child-font-text-color': '#e0eaf5',
        'megamenu-child-icon-color': '#90aac4',
        'megamenu-child-hover-bg': 'rgba(98,180,255,0.1)',
        'megamenu-child-diveder-color': 'rgba(255,255,255,0.07)',
        'meagmenulink-active-icon-color': '#62b4ff',
        'meagmenulink-active-font-color': '#62b4ff',
        'mega-menu-active-bg-color': 'rgba(98,180,255,0.15)',
        'sidenav-bg-color': '#0a1520',
        'sidenav-font-color': '#90aac4',
        'sidenav-icon-color': '#90aac4',
        'sidenavlink-active-bg': 'rgba(98,180,255,0.15)',
        'sidenavlink-active-icon-color': '#62b4ff',
        'sidenavlink-active-font-color': '#62b4ff',
      }
    },
    {
      name: 'White Light',
      colors: {
        'header-bg-color': '#ffffff',
        'header-font-color': '#000000a1',
        'header-icon-color': 'black',
        'header-child-font-color': '#333',
        'header-child-icon-color': '#333',
        'meagmenu-parent-bg-color': '#fff',
        'meagmenu-parent-font-color': 'black',
        'meagmenu-active-bg': '#fff',
        'meagmenu-parent-active-font-color': '#E82329',
        'meagmenu-parent-active-icon-color': '#E82329',
        'megamenu-child-hover-bg': '#f0f0f0',
        'megamenu-child-font-color': '#555',
        'megamenu-child-icon-color': '#555',
        'megamenu-child-font-text-color': '#222',
        'megamenu-child-diveder-color': '#e0e0e0',
        'meagmenulink-active-icon-color': 'white',
        'meagmenulink-active-font-color': 'white',
        'mega-menu-active-bg-color': '#ffffff',
        'sidenav-bg-color': '#fff',
        'sidenav-bg-width': '15rem',
        'sidenav-font-color': 'black',
        'sidenav-icon-color': 'black',
        'sidenavlink-active-bg': '#f06a06',
        'sidenavlink-active-icon-color': 'white',
        'sidenavlink-active-font-color': 'white',
      }
    },
    {
      name: 'Charcoal',
      colors: {
        'header-bg-color': '#1a1a2e',
        'header-font-color': '#a0aec0',
        'header-icon-color': '#a0aec0',
        'meagmenu-parent-bg-color': '#1a1a2e',
        'meagmenu-parent-font-color': '#a0aec0',
        'meagmenu-parent-active-font-color': '#f6ad55',
        'meagmenu-parent-active-icon-color': '#f6ad55',
        'meagmenu-active-bg': 'rgba(246,173,85,0.12)',
        'megamenu-child-font-text-color': '#e2e8f0',
        'megamenu-child-icon-color': '#a0aec0',
        'megamenu-child-hover-bg': 'rgba(246,173,85,0.1)',
        'megamenu-child-diveder-color': 'rgba(255,255,255,0.08)',
        'meagmenulink-active-icon-color': '#f6ad55',
        'meagmenulink-active-font-color': '#f6ad55',
        'mega-menu-active-bg-color': 'rgba(246,173,85,0.15)',
        'sidenav-bg-color': '#16213e',
        'sidenav-font-color': '#a0aec0',
        'sidenav-icon-color': '#a0aec0',
        'sidenavlink-active-bg': 'rgba(246,173,85,0.15)',
        'sidenavlink-active-icon-color': '#f6ad55',
        'sidenavlink-active-font-color': '#f6ad55',
      }
    },
    {
      name: 'Gradient Header',
      colors: {
        'header-bg-color': 'linear-gradient(135deg, #7e808b54, #9d9ea154, #7e808b54)',
        'header-font-color': '#1a1a1a',
        'header-icon-color': '#1a1a1a',
        'meagmenu-parent-bg-color': 'rgba(255,255,255,0.95)',
        'meagmenu-parent-font-color': '#333',
        'megamenu-child-font-text-color': '#222',
        'megamenu-child-icon-color': '#555',
        'megamenu-child-hover-bg': '#f0f0f0',
        'megamenu-child-diveder-color': '#ddd',
        'sidenav-bg-color': 'rgba(255,255,255,0.92)',
        'sidenav-font-color': '#333',
        'sidenav-icon-color': '#555',
        'sidenavlink-active-bg': '#f06a06',
        'sidenavlink-active-icon-color': 'white',
        'sidenavlink-active-font-color': 'white',
      }
    },
  ];

  user = { first_name: 'Sanjay', last_name: 'Dev' };
  org = { name: 'Acme Corp', logoUrl: '' };

  metrics = [
    { label: 'Total Users', value: '4,821', icon: 'people', bg: 'linear-gradient(135deg,#1a73e8,#5c6bc0)', trend: '+12%', up: true },
    { label: 'Active Sessions', value: '238', icon: 'devices', bg: 'linear-gradient(135deg,#009688,#00bcd4)', trend: '+8%', up: true },
    { label: 'Groups', value: '47', icon: 'groups', bg: 'linear-gradient(135deg,#e91e63,#f48fb1)', trend: '+3%', up: true },
    { label: 'Storage Used', value: '1.4 TB', icon: 'storage', bg: 'linear-gradient(135deg,#f59e0b,#ffc107)', trend: '-2%', up: false },
  ];

  features = [
    { icon: 'web_asset', title: 'Header Only', desc: 'Full-width header with mega-menu or normal dropdown menus.' },
    { icon: 'view_sidebar', title: 'Sidenav Only', desc: 'Collapsible sidebar navigation with nested groups.' },
    { icon: 'dashboard', title: 'Header + Sidenav', desc: 'Sections in the header, children in the sidenav.' },
    { icon: 'grid_view', title: 'Mega Menu', desc: 'Multi-column hover mega dropdown with grouped items and icons.' },
    { icon: 'palette', title: 'Runtime Theming', desc: 'CSS custom properties allow instant color changes per org.' },
    { icon: 'compress', title: 'Collapsible Sidenav', desc: 'Smooth icon-only collapsed state with tooltip labels.' },
    { icon: 'phone_android', title: 'Mobile Responsive', desc: 'Mobile drawer with backdrop on all layouts.' },
    { icon: 'bolt', title: 'Standalone + OnPush', desc: 'All components are standalone with OnPush for peak performance.' },
  ];

  // ═══════════════════════════════════════════════════════════════
  // core-card & core-grid DEMO DATA
  // ═══════════════════════════════════════════════════════════════

  // ── Demo: active tab in the component reference section ───────
  demoTab: 'mode1' | 'mode2' | 'mode3' | 'grid' = 'mode1';

  // ── Sample data rows used across all card/grid demos ──────────
  demoUsers: any[] = [
    { _id: '1', name: 'Arjun Sharma', email: 'arjun@acme.com', role: 'Admin', status: 'active', joined: '2024-01-15', region: 'IN', mfa: true },
    { _id: '2', name: 'Priya Patel', email: 'priya@acme.com', role: 'Editor', status: 'active', joined: '2024-03-20', region: 'US', mfa: false },
    { _id: '3', name: 'Carlos Ruiz', email: 'carlos@acme.com', role: 'Viewer', status: 'invited', joined: '2024-05-10', region: 'MX', mfa: false },
    { _id: '4', name: 'Mei Lin', email: 'mei@acme.com', role: 'Admin', status: 'suspended', joined: '2023-11-08', region: 'CN', mfa: true },
    { _id: '5', name: 'James O\'Brien', email: 'james@acme.com', role: 'Editor', status: 'active', joined: '2024-06-01', region: 'IE', mfa: true },
    { _id: '6', name: 'Sara Müller', email: 'sara@acme.com', role: 'Viewer', status: 'active', joined: '2024-02-28', region: 'DE', mfa: false },
  ];

  // ── Mode 1: JSON-driven schema ────────────────────────────────
  /** The most common usage. Pass a CardSchema and data row — done. */
  mode1Schema: CardSchema = {
    titleKey: 'name',
    subtitleKey: 'email',
    fields: [
      { key: 'role', label: 'Role', type: 'badge', badgeColor: 'primary' },
      {
        key: 'status', label: 'Status', type: 'badge',
        badgeColor: 'success'
      },
      { key: 'region', label: 'Region', type: 'text' },
      { key: 'joined', label: 'Joined', type: 'date', dateFormat: 'dd MMM yyyy' },
    ],
    actions: [
      { label: 'Edit', icon: 'edit', action: 'edit', color: 'primary' },
      { label: 'Delete', icon: 'delete', action: 'delete', color: 'warn' },
    ],
  };

  // ── Mode 2: ng-content projection ────────────────────────────
  /** Core-card renders its body from projected content.
   *  The schema still drives the header + footer actions. */
  mode2Schema: CardSchema = {
    titleKey: 'name',
    subtitleKey: 'email',
    fields: [],   // empty — body is supplied via ng-content
    actions: [
      { label: 'View', icon: 'visibility', action: 'view', color: 'primary' },
    ],
  };

  // ── Mode 3: cardComponent input via core-grid ─────────────────
  /** Pass a component class to core-grid; it creates one per row. */
  mode3Schema: CardSchema = {
    titleKey: 'name',
    subtitleKey: 'role',
    fields: [
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'status', label: 'Status', type: 'badge', badgeColor: 'primary' },
    ],
    actions: [],
  };

  // ── core-grid card mode schema (for grid demo) ────────────────
  gridCardSchema: CardSchema = {
    titleKey: 'name',
    subtitleKey: 'email',
    fields: [
      { key: 'role', label: 'Role', type: 'badge', badgeColor: 'primary' },
      { key: 'status', label: 'Status', type: 'badge', badgeColor: 'success' },
      { key: 'region', label: 'Region', type: 'text' },
      { key: 'joined', label: 'Joined', type: 'date', dateFormat: 'dd MMM yyyy' },
    ],
    actions: [
      { label: 'Edit', icon: 'edit', action: 'edit', color: 'primary' },
      { label: 'Delete', icon: 'delete', action: 'delete', color: 'warn' },
    ],
  };

  // ── Last card action fired (for demo feedback) ─────────────────
  lastCardAction = '';

  // ── Permission system demo data ────────────────────────────────
  userPermissions: string[] = [
    'admin:user:read', 'admin:user:edit', 'admin:role:read',
    'admin:audit:read', 'admin:billing:read', 'admin:settings:read'
  ];

  onDemoCardAction(event: { action: string; data: any }): void {
    this.lastCardAction = `Action: "${event.action}" on "${event.data?.name}"`;
    this.cdr.markForCheck();
  }

  // ── Code snippets (displayed in demo) ─────────────────────────
  readonly snippet_mode1 = `// 1. Define the schema in your component
userSchema: CardSchema = {
  titleKey: 'name',
  subtitleKey: 'email',
  fields: [
    { key: 'role',   label: 'Role',   type: 'badge', badgeColor: 'primary' },
    { key: 'status', label: 'Status', type: 'badge', badgeColor: 'success' },
    { key: 'joined', label: 'Joined', type: 'date',  dateFormat: 'dd MMM yyyy' },
  ],
  actions: [
    { label: 'Edit',   icon: 'edit',   action: 'edit',   color: 'primary' },
    { label: 'Delete', icon: 'delete', action: 'delete', color: 'warn'    },
  ],
};

// 2. Use it in the template
<core-card
  [data]="row"
  [cardSchema]="userSchema"
  [actionCallback]="onCardAction.bind(this)">
</core-card>`;

  readonly snippet_mode2 = `// Schema only drives header + footer. Body = ng-content.
<core-card [data]="row" [cardSchema]="headerSchema">
  <!-- Everything inside is fully custom -->
  <div class="my-layout">
    <img [src]="row.avatar" />
    <p>{{ row.bio }}</p>
    <mat-chip>{{ row.status }}</mat-chip>
  </div>
</core-card>`;

  readonly snippet_mode3 = `// core-grid creates one instance of MyCardComponent per row.
// Your component must implement CoreCardHost:
//   @Input() data: any
//   @Input() cardSchema?: CardSchema
//   @Input() actionCallback?: (e) => void

<core-grid
  [listData]="rows"
  [cardComponent]="MyCardComponent"
  [cardSchema]="schema">
</core-grid>`;

  readonly snippet_grid = `// core-grid auto-switches table ↔ card on mobile.
// Force card view with [viewMode]="'card'".

<core-grid
  [listName]="'members'"      <!-- loads JSON config for AG Grid columns -->
  [listData]="users"
  [gridRowModelType]="'clientSide'"
  [cardSchema]="membersCardSchema"
  [cardActionCallback]="onAction.bind(this)"
  (actionClicked)="onAction($event)">
</core-grid>

// Force always-card (e.g. mobile-first screens):
<core-grid [viewMode]="'card'" [listData]="rows" [cardSchema]="schema">
</core-grid>`;

  readonly snippet_permissions = `// 1. Permission directives
// Show element only if user has specific permission
<div *hasPermission="'admin:user:edit'">
  <button (click)="editUser(user)">Edit</button>
</div>

// Show if user has ANY of the permissions
<div *hasAnyPermission="['admin', 'superadmin']">
  <button (click)="adminAction()">Admin Action</button>
</div>

// Show only if user has ALL specified permissions
<div *hasAllPermissions="['admin:user:read', 'admin:user:edit']">
  <button (click)="manageUser(user)">Manage User</button>
</div>

// 2. Permission service check in component
constructor(private permissionService: PermissionService) {}

canEditUser(user: User): boolean {
  return this.permissionService.hasPermission('admin:user:edit');
}

// 3. Menu config with permissions
{
  id: 'users-all',
  label: 'All Users',
  icon: 'people',
  requiredPermission: 'admin:user:read'  // Only show if user has this
},
{
  id: 'roles-menu',
  label: 'Roles',
  icon: 'shield',
  requiredPermission: 'admin:role:read'  // Only show if user has this
}

// 4. Dynamic permission loading (from API on login)
loadUserPermissions(): void {
  this.http.get('/api/users/permissions').subscribe(perms => {
    this.authService.userPermissions = perms;
    // Update menu visibility based on new permissions
    this.menuService.refresh();
  });
}`;

  readonly snippet_sidenav_children = `// 1. Define sections with parent + children in layout.types.ts
export interface NavSection {
  id: string;
  label: string;
  icon: string;
  children: NavItem[];  // Children auto-appear in sidenav
}

// 2. In your component's navSections getter
get navSections(): NavSection[] {
  return [
    {
      id: 'users-section',
      label: 'User Management',
      icon: 'people',
      children: [
        { id: 'users-all',     label: 'All Users',      icon: 'people' },
        { id: 'users-groups',  label: 'Groups',         icon: 'groups' },
        { id: 'users-roles',   label: 'Roles & Perms',  icon: 'shield' },
        { id: 'users-sessions',label: 'Sessions',       icon: 'devices' },
      ]
    },
    {
      id: 'content-section',
      label: 'Content',
      icon: 'article',
      children: [
        { id: 'content-pages',   label: 'Pages',   icon: 'web'        },
        { id: 'content-media',   label: 'Media',   icon: 'perm_media' },
        { id: 'content-storage', label: 'Storage', icon: 'folder'     },
      ]
    },
  ];
}

// 3. In header-sidenav mode:
//    - Parent (section) shows in header
//    - Children show in sidenav when parent is clicked
//    - No extra configuration needed
// 4. Permissions on child items:
{
  id: 'users-all',
  label: 'All Users',
  icon: 'people',
  requiredPermission: 'admin:user:read'  // Hidden if user lacks permission
}`;

  // ── Controls panel open/close ────────────────────────────────
  controlsOpen = true;

  // ── Sidenav demo: show parent + children ─────────────────────
  sidenavWithChildren: NavSection = {
    id: 'demo-section',
    label: 'Demo: Parent + Children',
    icon: 'folder',
    children: [
      { id: 'demo-child-1', label: 'Child Item 1', icon: 'folder' },
      { id: 'demo-child-2', label: 'Child Item 2', icon: 'folder' },
      { id: 'demo-child-3', label: 'Child Item 3', icon: 'folder' },
    ]
  };

  get sidenavDemoConfig(): LayoutConfig {
    return {
      mode: 'header-sidenav',
      headerMenuType: this.selectedMenuType,
      showLogo: true,
      appName: 'Acme Corp',
      logoUrl: '',
      sidenavWidth: 256,
      sidenavCollapsible: true,
      sidenavCollapsed: false,
      headerHeight: 64,
      navItems: [],
      navSections: [this.sidenavWithChildren],
      themeColors: this.surfacePresets[this.selectedSurface].colors,
    };
  }

  private destroy$ = new Subject<void>();

  constructor(
    private layoutService: LayoutService,
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.applyTheme(0);

    this.layoutService.activeNavId$
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        this.activeNavId = id;
        this.cdr.markForCheck();
      });

    this.layoutService.activeSectionId$
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        this.activeSectionId = id;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Config builder ───────────────────────────────────────────
  get config(): LayoutConfig {
    return {
      mode: this.selectedMode,
      headerMenuType: this.selectedMenuType,
      showLogo: true,
      appName: 'Acme Corp',
      logoUrl: '',
      sidenavWidth: 256,
      sidenavCollapsible: true,
      sidenavCollapsed: false,
      headerHeight: 64,
      navItems: this.flatNavItems,
      navSections: this.navSections,
      themeColors: this.surfacePresets[this.selectedSurface].colors,
    };
  }

  // ── Flat nav items (header-only / sidenav-only) ───────────────
  get flatNavItems(): NavItem[] {
    return [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      {
        id: 'analytics', label: 'Analytics', icon: 'bar_chart',
        children: [
          { id: 'analytics-overview', label: 'Overview', icon: 'insights' },
          { id: 'analytics-reports', label: 'Reports', icon: 'description' },
          { id: 'analytics-realtime', label: 'Real-time', icon: 'bolt' },
        ]
      },
      {
        id: 'users-menu', label: 'Users', icon: 'group',
        children: [
          {
            id: 'users-group', label: 'User Management', icon: 'manage_accounts',
            children: [
              { id: 'users-all', label: 'All Users', icon: 'people' },
              { id: 'users-groups', label: 'Groups', icon: 'groups' },
              { id: 'users-roles', label: 'Roles', icon: 'shield' },
              { id: 'users-sessions', label: 'Sessions', icon: 'devices' },
            ]
          },
          {
            id: 'auth-group', label: 'Authentication', icon: 'lock',
            children: [
              { id: 'auth-mfa', label: 'MFA Settings', icon: 'security' },
              { id: 'auth-sso', label: 'SSO / SAML', icon: 'link' },
              { id: 'auth-policy', label: 'Policy', icon: 'policy' },
            ]
          },
        ]
      },
      {
        id: 'content', label: 'Content', icon: 'article',
        children: [
          { id: 'content-pages', label: 'Pages', icon: 'web' },
          { id: 'content-media', label: 'Media', icon: 'perm_media' },
          { id: 'content-storage', label: 'Storage', icon: 'folder' },
        ]
      },
      {
        id: 'settings-menu', label: 'Settings', icon: 'settings',
        children: [
          { id: 'settings-general', label: 'General', icon: 'tune' },
          { id: 'settings-theme', label: 'Theme', icon: 'palette' },
          { id: 'settings-billing', label: 'Billing', icon: 'credit_card' },
          { id: 'settings-api', label: 'API Keys', icon: 'vpn_key' },
        ]
      },
    ];
  }

  // ── Sections (header-sidenav mode) ────────────────────────────
  get navSections(): NavSection[] {
    return [
      {
        id: 'home-section', label: 'Home', icon: 'home',
        children: [
          { id: 'home-dashboard', label: 'Dashboard', icon: 'dashboard' },
          { id: 'home-analytics', label: 'Analytics', icon: 'bar_chart' },
          { id: 'home-activity', label: 'Activity', icon: 'timeline' },
          { id: 'home-reports', label: 'Reports', icon: 'description' },
        ]
      },
      {
        id: 'users-section', label: 'Users', icon: 'group',
        children: [
          { id: 'sec-users-all', label: 'All Users', icon: 'people' },
          { id: 'sec-users-groups', label: 'Groups', icon: 'groups' },
          { id: 'sec-users-roles', label: 'Roles & Perms', icon: 'shield' },
          { id: 'sec-users-sessions', label: 'Sessions', icon: 'devices' },
          { id: 'sec-users-audit', label: 'Audit Log', icon: 'history' },
        ]
      },
      {
        id: 'content-section', label: 'Content', icon: 'article',
        children: [
          { id: 'cnt-pages', label: 'Pages', icon: 'web' },
          { id: 'cnt-media', label: 'Media', icon: 'perm_media' },
          { id: 'cnt-storage', label: 'Storage', icon: 'folder' },
          { id: 'cnt-forms', label: 'Forms', icon: 'dynamic_form' },
        ]
      },
      {
        id: 'settings-section', label: 'Settings', icon: 'settings',
        children: [
          { id: 'set-general', label: 'General', icon: 'tune' },
          { id: 'set-theme', label: 'Theme', icon: 'palette' },
          { id: 'set-billing', label: 'Billing', icon: 'credit_card' },
          { id: 'set-api', label: 'API Keys', icon: 'vpn_key' },
          { id: 'set-security', label: 'Security', icon: 'security' },
          { id: 'set-notif', label: 'Notifications', icon: 'notifications' }, {
            id: 'settings-section', label: 'Settings', icon: 'settings',
            children: [
              { id: 'set-general', label: 'General', icon: 'tune' },
              { id: 'set-theme', label: 'Theme', icon: 'palette' },
              { id: 'set-billing', label: 'Billing', icon: 'credit_card' },
              { id: 'set-api', label: 'API Keys', icon: 'vpn_key' },
              { id: 'set-security', label: 'Security', icon: 'security' },
              { id: 'set-notif', label: 'Notifications', icon: 'notifications' },
            ]
          },
        ]
      },
    ];
  }

  // ── Event handlers ────────────────────────────────────────────
  onNavItemClick(item: NavItem): void {
    this.lastNavLabel = item.label;
    this.cdr.markForCheck();
  }

  onSectionClick(section: NavSection): void {
    this.lastNavLabel = section.label;
    this.cdr.markForCheck();
  }

  onModeChange(mode: LayoutMode): void {
    this.selectedMode = mode;
    this.layoutService.setConfig(this.config);
    this.cdr.markForCheck();
  }

  onMenuTypeChange(type: HeaderMenuType): void {
    this.selectedMenuType = type;
    this.cdr.markForCheck();
  }

  applyTheme(index: number): void {
    this.selectedTheme = index;
    const t = this.themes[index];
    this.themeService.applyTheme({
      PrimaryColor: t.primary,
      SecondaryColor: t.secondary,
    });
    this.cdr.markForCheck();
  }

  applySurface(index: number): void {
    this.selectedSurface = index;
    this.layoutService.applyLayoutTheme(this.surfacePresets[index].colors);
    this.cdr.markForCheck();
  }

  get activeNavLabel(): string {
    const all = [...this.flatNavItems, ...this.navSections.flatMap(s => s.children)];
    const deepAll: NavItem[] = [];
    const flatten = (items: NavItem[]) => {
      items.forEach(i => {
        deepAll.push(i);
        if (i.children) flatten(i.children);
      });
    };
    flatten(all);
    return deepAll.find(i => i.id === this.activeNavId)?.label ?? '—';
  }

  get activeSectionLabel(): string {
    return this.navSections.find(s => s.id === this.activeSectionId)?.label ?? '—';
  }
}
