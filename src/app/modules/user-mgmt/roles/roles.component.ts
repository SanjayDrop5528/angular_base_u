import { Component, inject, injectAsync, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { UserMgmtService } from '../service/user-mgmt.service';
import { DialogService } from '../../../core/services/dialog.service';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { ScreenLoaded } from '../../../core/services/screenloader.service';
import { CoreGrid, GridOutputEvent } from '../../shared/components/core-grid/core-grid';
import { MatStepperModule } from '@angular/material/stepper';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AggridHelperService } from '../../../core/services/ag-grid/aggrid-helper.service';

interface MenuItem {
  id: string; // internal tracking
  displayName: string;
  route: string;
  icon: string;
  permission?: string[]; // [moduleName, screenName]
  children?: MenuItem[];
  password?: string;
  menuClose?: boolean;
  expanded?: boolean;
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    AgGridModule,
    CoreGrid,
    MatStepperModule
  ],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.css']
})
export class RolesComponent implements OnInit {
  roles: any[] = [];
  selectedRole: any = null;
  editingRole: any = null;

  roleForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    description: new FormControl(''),
    status: new FormControl('active')
  });

  pageHeading = 'USER_MGMT.ROLES.PAGE_HEADING';
  activeTab = 'list';
  selectedStepIndex = 0;
  saving = false;

  @ViewChild(CoreGrid) roleGrid!: CoreGrid;

  rolesApi = (filter: any, sort: any, start: any, end: any): Observable<any> =>
    this.apiService.getRoles().pipe(
      map((res: any) => {
        const rolesList = this.unwrapArrayResponse(res).map((r: any) => ({
          ...r,
          description: r.role_description || r.description || '',
          status: (r.status || 'active').toLowerCase()
        }));
        this.roles = rolesList;
        if (this.selectedRole) {
          const updated = this.roles.find(r => r.id === this.selectedRole.id);
          this.selectedRole = updated || null;
        }
        return {
          data: [
            {
              response: rolesList,
              pagination: [
                {
                  totalDocs: rolesList.length
                }
              ]
            }
          ]
        };
      })
    );

  refreshRoleGrid(): void {
    if (this.roleGrid) {
      this.roleGrid.onRefreshClick();
    }
  }

  // Confirmation modal state
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmAction = ''; // 'delete' | 'toggle'
  confirmTarget: any = null;

  // Permissions matrix state
  modules: any[] = [];
  screens: any[] = [];
  rolePermissions: any[] = [];
  matrix: any = {};
  availableActions: string[] = ['view', 'create', 'edit', 'delete', 'list', 'share'];
  cloningFromRoleId: string | null = null;

  // AG Grid Properties
  gridApi!: GridApi;
  gridRowData: any[] = [];
  gridColumnDefs: ColDef[] = [];
  gridDefaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };
  gridOptions: GridOptions = {
    groupDefaultExpanded: 1, // Expand all groups by default
    animateRows: true,
    rowHeight: 50,
  };
  autoGroupColumnDef = {
    headerName: 'Module / Screen Name',
    minWidth: 250,
    cellRendererParams: {
      suppressCount: true,
    }
  };
  gridContext: any = { componentParent: this };

  // Menu configuration state
  roleMenus: any[] = [];
  menuItems: MenuItem[] = [];
  selectedItem: MenuItem | null = null;
  selectedItemParent: MenuItem | null = null;
  activeMenuRecordId: string | null = null;
  menuEditIndependentOfPermissions = false;

  constructor(
    private apiService: UserMgmtService,
    private dialogService: DialogService,
    private translateService: TranslateService,
    private screenLoaded: ScreenLoaded
  ) { }

  ngOnInit(): void {
    // Silently notify loader if needed
    this.screenLoaded.loadFormConfigJson('roles').subscribe();
    this.fetchRoles();
    this.loadAllData()
  }

  loadAllData(): void {
    this.saving = true;
    forkJoin({
      modules: this.apiService.getModules(),
      screens: this.apiService.getScreens()
    }).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.modules = this.unwrapArrayResponse(res.modules);
        this.screens = this.unwrapArrayResponse(res.screens, 'screens');
        this.updateAvailableActions();

        // Refresh selected role context if it is open
        if (this.selectedRole) {
          const updated = this.roles.find(r => r.id === this.selectedRole.id);
          this.selectedRole = updated || null;
        }
      },
      error: () => {
        this.saving = false;
        this.dialogService.openSnackBar('Failed to load roles and permission metadata.');
      }
    });
  }

  fetchRoles(): void {
    this.apiService.getRoles().subscribe({
      next: (res) => {
        this.roles = this.unwrapArrayResponse(res).map((r: any) => ({
          ...r,
          description: r.role_description || r.description || '',
          status: (r.status || 'active').toLowerCase()
        }));
        if (this.selectedRole) {
          const updated = this.roles.find(r => r.id === this.selectedRole.id);
          this.selectedRole = updated || null;
        }
      }
    });
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'list') {
      this.editingRole = null;
      this.cloningFromRoleId = null;
      this.roleForm.reset({ name: '', description: '', status: 'active' });
      this.selectedStepIndex = 0;
      this.menuItems = [];
      this.selectedItem = null;
      this.selectedItemParent = null;
      this.menuEditIndependentOfPermissions = false;
      this.matrix = {};
      this.gridRowData = [];
    }
  }

  selectRole(role: any): void {
    this.selectedRole = this.selectedRole?.id === role.id ? null : role;
  }

  isSystemRole(role: any): boolean {
    return role.name === 'Superadmin' || role.name === 'System';
  }

  generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    const array = new Uint32Array(1);
    (window.crypto || (window as any).msCrypto).getRandomValues(array);
    return 'temp-' + array[0].toString(36) + '-' + Date.now();
  }

  private unwrapArrayResponse(value: any, nestedKey?: string): any[] {
    if (Array.isArray(value)) return value;
    if (nestedKey && Array.isArray(value?.[nestedKey])) return value[nestedKey];
    if (Array.isArray(value?.data)) return value.data;
    if (nestedKey && Array.isArray(value?.data?.[nestedKey])) return value.data[nestedKey];
    return [];
  }

  private parseJsonArray(value: any): string[] {
    if (Array.isArray(value)) return value.map(String);
    if (!value) return [];
    if (typeof value !== 'string') return [];

    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // Fall back to comma-separated values below.
    }

    return trimmed.split(',').map(v => v.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }

  private parseJsonValue(value: any, fallback: any): any {
    if (value === null || value === undefined) return fallback;
    let parsed = value;

    for (let i = 0; i < 5; i++) {
      if (typeof parsed !== 'string') break;
      const trimmed = parsed.trim();
      if (!trimmed) return fallback;

      try {
        parsed = JSON.parse(trimmed);
      } catch (err) {
        // If standard JSON.parse fails, try to strip leading/trailing escaped quotes
        // or unescape backslashes and try again.
        let cleaned = trimmed;
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
          cleaned = cleaned.substring(1, cleaned.length - 1);
        }
        cleaned = cleaned.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          // If it still fails, check if the string contains a JSON array or object
          // and try to find the start [ or { and end ] or }
          const startIdx = cleaned.indexOf('[');
          const startObjIdx = cleaned.indexOf('{');
          const start = (startIdx !== -1 && (startObjIdx === -1 || startIdx < startObjIdx)) ? startIdx : startObjIdx;
          if (start !== -1) {
            const end = cleaned.lastIndexOf(cleaned.charAt(start) === '[' ? ']' : '}');
            if (end !== -1 && end > start) {
              try {
                parsed = JSON.parse(cleaned.substring(start, end + 1));
                continue;
              } catch { }
            }
          }
          return fallback;
        }
      }
    }
    return parsed ?? fallback;
  }

  private getRecordId(record: any): string {
    return record?.id || record?._id || '';
  }

  private getScreenId(screen: any): string {
    return this.getRecordId(screen);
  }

  private getModuleIds(screen: any): string[] {
    const ids = this.parseJsonArray(screen?.module_id);
    return ids.length > 0 ? ids : (screen?.module_id ? [String(screen.module_id)] : []);
  }

  private getAvailablePermissions(screen: any): string[] {
    return this.parseJsonArray(screen?.avialable_permission);
  }

  private updateAvailableActions(): void {
    const uniqueActions = new Set<string>();
    for (const scr of this.screens) {
      const perms = this.getAvailablePermissions(scr);
      for (const p of perms) {
        if (p && p.trim()) {
          uniqueActions.add(p.trim().toLowerCase());
        }
      }
    }
    if (uniqueActions.size > 0) {
      this.availableActions = Array.from(uniqueActions);
    }
  }

  private getScreenRoute(screen: any): string {
    const config = this.parseJsonValue(screen?.config, {});
    const route = config?.route || config?.path || config?.menuRoute || config?.routerLink || screen?.route || screen?.path || '';
    return typeof route === 'string' ? route : '';
  }

  private buildEmptyMatrix(): void {
    this.matrix = {};
    for (const scr of this.screens) {
      const screenId = this.getScreenId(scr);
      if (!screenId) continue;
      this.matrix[screenId] = {};
      for (const p of this.getAvailablePermissions(scr)) {
        this.matrix[screenId][p] = false;
      }
    }
  }

  private getRolePermissionRows(response: any): any[] {
    const directRows = this.unwrapArrayResponse(response?.permissions);
    if (directRows.length > 0) return directRows;

    const rolePermission = response?.role?.permission || response?.permission || response?.data?.role?.permission;
    return rolePermission ? [{ permission: rolePermission }] : [];
  }

  private applyRolePermissions(response: any): void {
    const responseModules = this.unwrapArrayResponse(response?.modules);
    const responseScreens = this.unwrapArrayResponse(response?.screens, 'screens');
    if (responseModules.length > 0) this.modules = responseModules;
    if (responseScreens.length > 0) {
      this.screens = responseScreens;
      this.updateAvailableActions();
    }

    this.rolePermissions = this.getRolePermissionRows(response);
    this.buildEmptyMatrix();

    const screenNameToId: Record<string, string> = {};
    for (const scr of this.screens) {
      const screenId = this.getScreenId(scr);
      if (screenId) screenNameToId[scr.name] = screenId;
    }

    for (const rp of this.rolePermissions) {
      const parsed = this.parseJsonValue(rp.permission ?? rp, []);
      if (!Array.isArray(parsed)) continue;

      for (const modConfig of parsed) {
        const configs = modConfig.permission_config || modConfig.configs || [];
        for (const screenConfig of configs) {
          const screenId = screenNameToId[screenConfig.screen_name];
          if (!screenId || !this.matrix[screenId]) continue;

          const actions = screenConfig.action_available || {};
          for (const action of Object.keys(actions)) {
            if (Object.prototype.hasOwnProperty.call(this.matrix[screenId], action)) {
              this.matrix[screenId][action] = actions[action] === 'Y' || actions[action] === true;
            }
          }
        }
      }
    }

    this.buildGridRowData();
  }

  private applyRoleMenus(menusResponse: any, roleId: string, syncWithPermissions = true): void {
    this.roleMenus = this.unwrapArrayResponse(menusResponse);
    const roleRecords = this.roleMenus.filter(rm => String(rm.roleid || rm.role_id || '').toLowerCase() === String(roleId).toLowerCase());
    this.activeMenuRecordId = roleRecords[0]?.id || null;

    this.menuItems = [];
    if (roleRecords.length > 0) {
      const record = roleRecords[0];
      const parsed = this.parseJsonValue(record.menu_config, []);
      if (Array.isArray(parsed)) {
        this.menuItems = this.assignTempIds(parsed);
      }
    }

    if (this.menuItems.length === 0) {
      this.menuItems = syncWithPermissions ? this.buildDefaultMenuItemsFromPermissions() : this.buildDefaultMenuItems();
    }
  }

  private buildDefaultMenuItems(): MenuItem[] {
    return this.modules
      .map(module => {
        const moduleId = this.getRecordId(module);
        const moduleScreens = this.getScreensForModuleId(moduleId);
        if (!moduleId || moduleScreens.length === 0) return null;

        const children = moduleScreens.map(scr => ({
          id: this.generateUUID(),
          displayName: scr.name || 'Untitled Screen',
          route: this.getScreenRoute(scr),
          icon: scr.type === 'Form' ? 'edit_note' : scr.type === 'View' ? 'visibility' : 'list_alt',
          permission: [module.name, scr.name]
        }));

        return {
          id: this.generateUUID(),
          displayName: module.name || 'Module',
          route: '',
          icon: 'folder',
          permission: ['', ''],
          children
        } as MenuItem;
      })
      .filter((item): item is MenuItem => !!item);
  }

  syncMenuItemsWithPermissions(): void {
    const permittedMap = new Map<string, Set<string>>();
    for (const scr of this.screens) {
      const screenId = this.getScreenId(scr);
      if (!screenId || !this.matrix[screenId]) continue;
      const isPermitted = Object.values(this.matrix[screenId]).some(val => val === true);
      if (isPermitted) {
        const moduleId = this.getModuleIds(scr)[0] || '';
        const mod = this.modules.find(m => this.getRecordId(m) === moduleId);
        if (mod) {
          if (!permittedMap.has(mod.name)) {
            permittedMap.set(mod.name, new Set<string>());
          }
          permittedMap.get(mod.name)!.add(scr.name);
        }
      }
    }

    const filterAndSync = (items: MenuItem[], parentModuleName = ''): MenuItem[] => {
      const result: MenuItem[] = [];
      for (const item of items) {
        if (item.children && item.children.length > 0) {
          const syncedChildren = filterAndSync(item.children, item.displayName);
          if (syncedChildren.length > 0) {
            item.children = syncedChildren;
            result.push(item);
          }
        } else {
          const [modName, scrName] = item.permission || ['', ''];
          const effectiveMod = modName || parentModuleName;
          if (effectiveMod && scrName && permittedMap.has(effectiveMod) && permittedMap.get(effectiveMod)!.has(scrName)) {
            result.push(item);
          }
        }
      }
      return result;
    };

    let currentItems = filterAndSync(this.menuItems || []);

    permittedMap.forEach((screens, moduleName) => {
      let modItem = currentItems.find(item => item.displayName === moduleName);
      if (!modItem) {
        modItem = {
          id: this.generateUUID(),
          displayName: moduleName,
          route: '',
          icon: 'folder',
          permission: ['', ''],
          children: []
        };
        currentItems.push(modItem);
      }

      screens.forEach(screenName => {
        const hasScreen = modItem!.children?.some(child => {
          const [, sName] = child.permission || ['', ''];
          return sName === screenName;
        });

        if (!hasScreen) {
          const scrDef = this.screens.find(s => s.name === screenName);
          const route = scrDef ? this.getScreenRoute(scrDef) : '';
          const icon = scrDef ? (scrDef.type === 'Form' ? 'edit_note' : scrDef.type === 'View' ? 'visibility' : 'list_alt') : 'link';

          modItem!.children = modItem!.children || [];
          modItem!.children.push({
            id: this.generateUUID(),
            displayName: screenName,
            route: route,
            icon: icon,
            permission: [moduleName, screenName]
          });
        }
      });

      if (modItem!.children) {
        modItem!.children.sort((a, b) => {
          const idxA = this.screens.findIndex(s => s.name === (a.permission?.[1] || a.displayName));
          const idxB = this.screens.findIndex(s => s.name === (b.permission?.[1] || b.displayName));
          return idxA - idxB;
        });
      }
    });

    currentItems.sort((a, b) => {
      const idxA = this.modules.findIndex(m => m.name === a.displayName);
      const idxB = this.modules.findIndex(m => m.name === b.displayName);
      return idxA - idxB;
    });

    this.menuItems = currentItems.filter(item => {
      if (item.children && item.children.length === 0) return false;
      return true;
    });
  }

  private buildDefaultMenuItemsFromPermissions(): MenuItem[] {
    const existingItems = this.menuItems;
    this.menuItems = this.buildDefaultMenuItems();
    this.syncMenuItemsWithPermissions();
    const permittedItems = this.menuItems;
    this.menuItems = existingItems;
    return permittedItems;
  }

  // --- Step initialization and navigation ---

  startAdd(): void {
    this.editingRole = null;
    this.cloningFromRoleId = null;
    this.menuEditIndependentOfPermissions = false;
    this.roleForm.reset({ name: '', description: '', status: 'active' });
    this.selectedStepIndex = 0;

    // Setup empty matrix and a module/screen menu template for all configured screens.
    this.buildEmptyMatrix();
    this.buildGridRowData();

    this.menuItems = [];
    this.selectedItem = null;
    this.selectedItemParent = null;

    this.activeTab = 'stepper';
  }

  startEditFully(role: any): void {
    this.editingRole = role;
    this.menuEditIndependentOfPermissions = false;
    this.roleForm.patchValue({
      name: role.name,
      description: role.description || role.role_description,
      status: role.status || 'active'
    });
    this.loadRoleDataIntoStepper(role, 0);
  }

  startEditPermissions(role: any): void {
    this.editingRole = role;
    this.menuEditIndependentOfPermissions = false;
    this.roleForm.patchValue({
      name: role.name,
      description: role.description || role.role_description,
      status: role.status || 'active'
    });
    this.loadRoleDataIntoStepper(role, 1);
  }

  startEditMenu(role: any): void {
    this.editingRole = role;
    this.menuEditIndependentOfPermissions = true;
    this.roleForm.patchValue({
      name: role.name,
      description: role.description || role.role_description,
      status: role.status || 'active'
    });
    this.loadRoleDataIntoStepper(role, 2);
  }

  loadRoleDataIntoStepper(role: any, focusStep: number): void {
    this.applyRolePermissions({ role: role });
    this.applyRoleMenus([{ roleid: role.id, menu_config: role.menu_config }], role.id, !this.menuEditIndependentOfPermissions);

    this.selectedStepIndex = focusStep;
    this.activeTab = 'stepper';
  }

  // --- Grid and Matrix Builders ---
  // aggridHelper=injectAsync(()=>import('../../../core/services/aggrid-helper.service').then(m=>m.AggridHelperService))
  aggridHelper = inject(AggridHelperService)
  buildGridRowData(): void {
    this.gridColumnDefs = [
      { field: 'moduleName', rowGroup: true, hide: true },
      { field: 'name', headerName: 'Screen Name', minWidth: 200 },
      { field: 'descriptions', headerName: 'Description', minWidth: 300 },
      {
        headerName: 'All',
        width: 80,
        cellRenderer: this.allCheckboxCellRenderer,
        cellStyle: { display: 'flex', justifyContent: 'center', alignItems: 'center' }
      },
      ...this.availableActions.map(action => ({
        field: action,
        headerName: action.charAt(0).toUpperCase() + action.slice(1),
        width: 100,
        "menuTabs": [],
        cellRenderer: this.checkboxCellRenderer,
        cellStyle: { display: 'flex', justifyContent: 'center', alignItems: 'center' }
      }))
    ];
    this.aggridHelper.aggridSetter(this, 'gridColumnDefs')
    this.gridRowData = this.screens.map(scr => {
      let moduleName = 'Unknown Module';
      const moduleId = this.getModuleIds(scr)[0] || '';
      const mod = this.modules.find(m => this.getRecordId(m) === moduleId);
      if (mod) {
        moduleName = mod.name;
      }
      const avPerms = this.getAvailablePermissions(scr);
      return {
        ...scr,
        id: this.getScreenId(scr),
        moduleName: moduleName,
        availablePermissions: avPerms
      };
    });
  }

  onStepChange(event: any): void {
    this.selectedStepIndex = event.selectedIndex;
    if (this.selectedStepIndex === 2 && !this.menuEditIndependentOfPermissions) {
      this.syncMenuItemsWithPermissions();
    }
  }

  getScreensForModule(moduleName: string): any[] {
    if (!moduleName) return [];
    const mod = this.modules.find(m => m.name === moduleName);
    if (!mod) return [];
    const moduleId = this.getRecordId(mod);

    return this.screens.filter(scr => {
      return this.getModuleIds(scr).includes(moduleId);
    });
  }

  isActionAvailable(scr: any, action: string): boolean {
    return this.getAvailablePermissions(scr).includes(action.toLowerCase());
  }

  togglePermission(screenId: string, action: string): void {
    if (!this.matrix[screenId]) {
      this.matrix[screenId] = {};
    }
    this.matrix[screenId][action] = !this.matrix[screenId][action];
  }

  isAllSelected(scr: any): boolean {
    const avPerms = this.getAvailablePermissions(scr);
    const screenId = this.getScreenId(scr);
    return avPerms.length > 0 && avPerms.every(a => this.matrix[screenId]?.[a] === true);
  }

  isPartiallySelected(scr: any): boolean {
    const avPerms = this.getAvailablePermissions(scr);
    const screenId = this.getScreenId(scr);
    const checkedCount = avPerms.filter(a => this.matrix[screenId]?.[a] === true).length;
    return checkedCount > 0 && checkedCount < avPerms.length;
  }

  toggleAllForScreen(scr: any): void {
    const avPerms = this.getAvailablePermissions(scr);
    const selectAll = !this.isAllSelected(scr);
    const screenId = this.getScreenId(scr);
    if (!this.matrix[screenId]) this.matrix[screenId] = {};
    for (const action of avPerms) {
      this.matrix[screenId][action] = selectAll;
    }
  }

  isModuleAllSelected(moduleId: string): boolean {
    const screens = this.getScreensForModuleId(moduleId);
    if (screens.length === 0) return false;
    return screens.every(scr => this.isAllSelected(scr));
  }

  isModulePartiallySelected(moduleId: string): boolean {
    const screens = this.getScreensForModuleId(moduleId);
    if (screens.length === 0) return false;

    let totalAvailable = 0;
    let checkedCount = 0;

    for (const scr of screens) {
      const avPerms = this.getAvailablePermissions(scr);
      totalAvailable += avPerms.length;
      const screenId = this.getScreenId(scr);
      checkedCount += avPerms.filter(a => this.matrix[screenId]?.[a] === true).length;
    }

    return checkedCount > 0 && checkedCount < totalAvailable;
  }

  getScreensForModuleId(moduleId: string): any[] {
    return this.screens.filter(scr => {
      return this.getModuleIds(scr).includes(moduleId);
    });
  }

  toggleAllForModule(moduleId: string): void {
    const screens = this.getScreensForModuleId(moduleId);
    const selectAll = !this.isModuleAllSelected(moduleId);
    for (const scr of screens) {
      const avPerms = this.getAvailablePermissions(scr);
      const screenId = this.getScreenId(scr);
      if (!this.matrix[screenId]) this.matrix[screenId] = {};
      for (const action of avPerms) {
        this.matrix[screenId][action] = selectAll;
      }
    }
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  refreshGrid(): void {
    if (this.gridApi) {
      this.gridApi.refreshCells({ force: true });
    }
  }

  checkboxCellRenderer(params: any): any {
    const action = params.colDef.field;
    if (!action || !params.data) {
      return '';
    }
    const screenId = params.data.id;
    const isAvailable = params.data.availablePermissions.includes(action);
    if (!isAvailable) {
      const span = document.createElement('span');
      span.textContent = '-';
      span.style.color = 'rgba(255,255,255,0.15)';
      span.style.fontWeight = 'bold';
      return span;
    }
    const checked = params.context.componentParent.matrix[screenId]?.[action] === true;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.style.cursor = 'pointer';
    input.style.width = '16px';
    input.style.height = '16px';
    input.style.accentColor = '#1a73e8';
    input.addEventListener('change', (event: any) => {
      params.context.componentParent.togglePermission(screenId, action);
      params.api.refreshCells({ rowNodes: [params.node], force: true });
    });
    return input;
  }

  allCheckboxCellRenderer(params: any): any {
    if (!params.data) {
      return '';
    }
    const screenId = params.data.id;
    const component = params.context.componentParent;
    const checked = component.isAllSelected(params.data);
    const indeterminate = component.isPartiallySelected(params.data);

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.indeterminate = indeterminate;
    input.style.cursor = 'pointer';
    input.style.width = '16px';
    input.style.height = '16px';
    input.style.accentColor = '#1a73e8';
    input.addEventListener('change', (event: any) => {
      component.toggleAllForScreen(params.data);
      params.api.refreshCells({ rowNodes: [params.node], force: true });
    });
    return input;
  }

  // --- Sidenav Config Menu Tree Helpers ---

  assignTempIds(items: any[]): MenuItem[] {
    if (!items || !Array.isArray(items)) return [];
    return items.map(item => {
      const permission = Array.isArray(item.permission) && item.permission.length === 2
        ? [...item.permission]
        : ['', ''];
      const hasChildren = item.children && item.children.length > 0;
      return {
        ...item,
        id: item.id || this.generateUUID(),
        permission,
        password: item.password || '',
        menuClose: item.menuClose || false,
        expanded: item.expanded !== undefined ? item.expanded : hasChildren,
        children: item.children ? this.assignTempIds(item.children) : []
      };
    });
  }

  cleanMenuItems(items: MenuItem[]): any[] {
    return items.map(item => {
      const cleaned: any = {
        displayName: item.displayName || '',
        icon: item.icon || '',
      };
      if (item.children && item.children.length > 0) {
        cleaned.children = this.cleanMenuItems(item.children);
      } else {
        cleaned.route = item.route || '';
        if (item.password) {
          cleaned.password = item.password;
        }
        if (item.menuClose) {
          cleaned.menuClose = item.menuClose;
        }
      }
      if (item.permission && item.permission.length === 2 && item.permission[0]) {
        cleaned.permission = item.permission;
      }
      return cleaned;
    });
  }

  addRootItem(): void {
    const newItem: MenuItem = {
      id: this.generateUUID(),
      displayName: 'New Menu Item',
      route: '',
      icon: 'folder',
      permission: ['', ''],
      children: []
    };
    this.menuItems.push(newItem);
    this.selectItem(newItem, null);
  }

  addChildItem(parent: MenuItem): void {
    if (!parent.children) {
      parent.children = [];
    }
    const childItem: MenuItem = {
      id: this.generateUUID(),
      displayName: 'New Sub Item',
      route: '',
      icon: 'link',
      permission: ['', '']
    };
    parent.route = '';
    parent.children.push(childItem);
    parent.expanded = true;
    this.selectItem(childItem, parent);
  }

  toggleNodeExpanded(node: MenuItem): void {
    node.expanded = node.expanded === false ? true : false;
  }

  selectItem(item: MenuItem, parent: MenuItem | null): void {
    this.selectedItem = item;
    this.selectedItemParent = parent;
  }

  deleteItem(item: MenuItem, parent: MenuItem | null): void {
    if (this.selectedItem?.id === item.id) {
      this.selectedItem = null;
      this.selectedItemParent = null;
    }

    if (parent) {
      parent.children = parent.children?.filter(c => c.id !== item.id) || [];
    } else {
      this.menuItems = this.menuItems.filter(m => m.id !== item.id);
    }
  }

  moveUp(index: number, parent: MenuItem | null): void {
    const list = parent ? parent.children : this.menuItems;
    if (!list || index <= 0) return;
    const temp = list[index];
    list[index] = list[index - 1];
    list[index - 1] = temp;
  }

  moveDown(index: number, parent: MenuItem | null): void {
    const list = parent ? parent.children : this.menuItems;
    if (!list || index >= list.length - 1) return;
    const temp = list[index];
    list[index] = list[index + 1];
    list[index + 1] = temp;
  }

  onPermissionModuleChange(): void {
    if (this.selectedItem && this.selectedItem.permission) {
      this.selectedItem.permission[1] = '';
    }
  }

  onHasSubmenuChange(item: MenuItem, event: any): void {
    const checked = event.target.checked;
    if (checked) {
      item.children = item.children || [];
      item.route = '';
      item.expanded = true;
    } else {
      item.children = [];
    }
  }

  // --- Core Submit Actions ---

  buildPermissionsPayload(): any[] {
    const screenById: Record<string, any> = {};
    for (const scr of this.screens) {
      const screenId = this.getScreenId(scr);
      if (screenId) screenById[screenId] = scr;
    }

    const moduleMap: Record<string, { module_name: string; module_id: string; permission_config: any[] }> = {};
    for (const module of this.modules) {
      const moduleId = this.getRecordId(module);
      if (moduleId) moduleMap[moduleId] = { module_name: module.name, module_id: moduleId, permission_config: [] };
    }

    for (const scrId in this.matrix) {
      const scr = screenById[scrId];
      if (!scr) continue;

      const actionAvailable: Record<string, string> = {};
      for (const action in this.matrix[scrId]) {
        if (this.matrix[scrId][action]) {
          actionAvailable[action] = 'Y';
        }
      }

      if (Object.keys(actionAvailable).length === 0) continue;

      const moduleIds = this.getModuleIds(scr);
      const moduleId = moduleIds[0];
      if (!moduleId || !moduleMap[moduleId]) continue;

      moduleMap[moduleId].permission_config.push({
        screen_name: scr.name,
        action_available: actionAvailable
      });
    }

    return Object.values(moduleMap).filter(m => m.permission_config.length > 0);
  }

  saveRoleConfig(): void {
    if (this.roleForm.invalid) {
      this.dialogService.openSnackBar('Please enter a valid role name.');
      return;
    }

    this.saving = true;
    const formVal = this.roleForm.value as any;
    const roleId = this.editingRole ? this.editingRole.id : null;

    if (!this.menuEditIndependentOfPermissions) {
      this.syncMenuItemsWithPermissions();
    }
    const permissionsPayload = this.buildPermissionsPayload();
    const menuPayload = this.cleanMenuItems(this.menuItems);

    const roleData = {
      name: formVal.name,
      description: formVal.description,
      status: roleId ? (formVal.status || 'active') : 'active',
      permissions: permissionsPayload,
      menu_config: menuPayload
    };

    if (roleId) {
      // Update existing role details
      this.apiService.updateRole(roleId, { ...roleData, version_no: this.editingRole.version_no }).subscribe({
        next: () => {
          this.saving = false;
          this.dialogService.openSnackBar('Role configuration updated successfully.');
          this.switchTab('list');
          this.loadAllData();
          this.refreshRoleGrid();
        },
        error: (err) => {
          this.saving = false;
          this.dialogService.openSnackBar(err.error?.error || 'Failed to update role configuration.');
        }
      });
    } else {
      // Create new role
      this.apiService.createRole(roleData).subscribe({
        next: () => {
          this.saving = false;
          this.dialogService.openSnackBar('Role created and configured successfully.');
          this.switchTab('list');
          this.loadAllData();
          this.refreshRoleGrid();
        },
        error: (err) => {
          this.saving = false;
          this.dialogService.openSnackBar(err.error?.error || 'Failed to create role.');
        }
      });
    }
  }

  cloneRole(role: any): void {
    this.cloningFromRoleId = role.id;
    this.startAdd();
    this.roleForm.patchValue({
      name: `${role.name} - Copy`,
      description: role.description || role.role_description || `Clone of ${role.name}`
    });

    this.applyRolePermissions({ role: role });
    this.applyRoleMenus([{ roleid: role.id, menu_config: role.menu_config }], role.id);
  }

  // --- Grid action redirects ---

  onGridAction(event: GridOutputEvent): void {
    const action = event.Action || (event as any).action;
    const data = event.data;
    const source = event.Source || (event as any).source;

    if (source === 'Form') {
      if (['add', 'Add', 'edit', 'update'].includes(action)) {
        this.loadAllData();
        this.refreshRoleGrid();
      }
      return;
    }

    switch (action) {
      case 'Refresh':
      case 'refresh':
        this.loadAllData();
        this.refreshRoleGrid();
        break;
      case 'add':
        this.startAdd();
        break;
      case 'edit_fully':
        this.startEditFully(data);
        break;
      case 'edit_permissions':
        this.startEditPermissions(data);
        break;
      case 'edit_menu':
        this.startEditMenu(data);
        break;
      case 'clone':
        this.cloneRole(data);
        break;
      case 'toggle_status_role':
        this.confirmToggleStatus(data);
        break;
      case 'delete_role':
        this.confirmDelete(data);
        break;
      default:
        break;
    }
  }

  onDeleteRequest(role: any): void {
    this.confirmDelete(role);
  }

  // --- Status and Deletion Confirms ---

  confirmToggleStatus(role: any): void {
    const action = role.status === 'active' ? 'deactivate' : 'activate';
    this.apiService.getAffectedRoleUsers(role.id).subscribe({
      next: (res: any) => {
        const count = res.count || 0;
        this.confirmTitle = role.status === 'active' ? 'Deactivate Role' : 'Activate Role';
        if (role.status === 'active' && count > 0) {
          this.confirmMessage = `This role has ${count} assigned users. Deactivating it will suspend all these users. Are you sure you want to deactivate it?`;
        } else {
          this.confirmMessage = `Are you sure you want to change the status of role "${role.name}"?`;
        }
        this.confirmAction = 'toggle';
        this.confirmTarget = role;
        this.showConfirmModal = true;
      }
    });
  }

  confirmDelete(role: any): void {
    this.apiService.getAffectedRoleUsers(role.id).subscribe({
      next: (res: any) => {
        const count = res.count || 0;
        this.confirmTitle = 'Delete Role';
        this.confirmMessage = count > 0
          ? `This role is assigned to ${count} active users. Deleting this role will suspend those users. Are you sure you want to delete this role permanently?`
          : `Are you sure you want to delete the role "${role.name}" permanently?`;
        this.confirmAction = 'delete';
        this.confirmTarget = role;
        this.showConfirmModal = true;
      }
    });
  }

  dismissConfirm(): void {
    this.showConfirmModal = false;
    this.confirmTarget = null;
  }

  executeConfirm(): void {
    if (this.confirmAction === 'delete') {
      this.apiService.deleteRole(this.confirmTarget.id).subscribe({
        next: () => {
          this.showConfirmModal = false;
          this.selectedRole = null;
          if (this.roleGrid) {
            this.roleGrid.removeRow(this.confirmTarget);
          }
          this.roles = this.roles.filter(r => r.id !== this.confirmTarget.id);
          this.dialogService.openSnackBar('Role deleted successfully.');
        },
        error: (err) => {
          this.showConfirmModal = false;
          this.dialogService.openSnackBar(err.error?.error || 'Failed to delete role.');
        }
      });
    } else if (this.confirmAction === 'toggle') {
      const isCurrentlyActive = this.confirmTarget.status === 'active';
      const newStatus = isCurrentlyActive ? 'inactive' : 'active';

      // Call updateRole with new status
      this.apiService.updateRole(this.confirmTarget.id, {
        name: this.confirmTarget.name,
        description: this.confirmTarget.description || this.confirmTarget.role_description,
        status: newStatus,
        version_no: this.confirmTarget.version_no
      }).subscribe({
        next: () => {
          this.showConfirmModal = false;
          this.loadAllData();
          this.refreshRoleGrid();
          this.dialogService.openSnackBar(`Role status set to ${newStatus}.`);
        },
        error: (err) => {
          this.showConfirmModal = false;
          this.dialogService.openSnackBar(err.error?.error || 'Failed to change role status.');
        }
      });
    }
  }
}
