import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserMgmtService } from '../service/user-mgmt.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { DialogService } from '../../../core/services/dialog.service';
import { CoreGrid, GridOutputEvent } from '../../shared/components/core-grid/core-grid';
import { CardSchema } from '../../shared/components/core-card/core-card';
import { UtilsService } from '../../../core/services/utils/utils.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { DataService } from '../../../core/services/data.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CoreGrid, TranslateModule, AgGridModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  users: any[] = [];
  roles: any[] = [];
  selectedUser: any = null;
  selectedSessions: any[] = [];
  selectedActivities: any[] = [];
  @ViewChild('userGridTpl') userGrid!: CoreGrid;
  membersApi = (filter: any, sort: any, start: any, end: any): Observable<any> =>
    this.apiService.getUsersForGrid(filter, sort, start, end, this.showDeleted).pipe(
      map((res: any) => {
        if (res && res.data && res.data[0] && Array.isArray(res.data[0].response)) {
          res.data[0].response = res.data[0].response.map((user: any) => this.transformUserForGrid(user));
        }
        return res;
      })
    );
  showDeleted = false;
  loading = false;
  saving = false;

  activeTab: 'list' | 'permissions' = 'list';
  selectedUserForPermissions: any = null;
  matrix: any = {};
  modules: any[] = [];
  screens: any[] = [];
  availableActions: string[] = ['view', 'create', 'edit', 'delete', 'list', 'share'];
  gridRowData: any[] = [];
  gridColumnDefs: ColDef[] = [];
  gridDefaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };
  gridOptions: any = {
    groupDefaultExpanded: 1,
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
  permissionsGridApi!: GridApi;



  constructor(
    private fb: FormBuilder,
    private apiService: UserMgmtService,
    private authService: AuthService,
    private translateService: TranslateService,
    private dialogService: DialogService,
    private dataService: DataService
  ) { }

  ngOnInit(): void {
    this.fetchRoles();
    this.fetchModulesAndScreens();
  }

  t(key: string): string {
    return this.translateService.instant(key);
  }

  fetchRoles(): void {
    this.apiService.getRoles().subscribe({
      next: (res) => {
        this.roles = res || [];
      }
    });
  }

  private normalizeMemberForForm(user: any, detail?: any): any {
    const detailUser = detail?.user || detail?.data?.user || detail?.data || detail || {};
    const roleId = detail?.role_id || detail?.data?.role_id || detailUser.role_id || user?.role_id || user?.group_id || '';
    const phone = user?.phone || user?.mobile || detailUser.phone || detailUser.mobile || '';
    const language = detailUser.language || detailUser.preferred_language || user?.language || user?.preferred_language || 'en';

    return {
      ...detailUser,
      ...user,
      _id: detailUser.id || detailUser._id || user?.id || user?._id,
      id: detailUser.id || user?.id || user?._id,
      phone,
      mobile: detailUser.mobile || user?.mobile || phone,
      language,
      preferred_language: detailUser.preferred_language || user?.preferred_language || language,
      role_id: roleId,
      group_id: detail?.group_id || detail?.data?.group_id || detailUser.group_id || roleId
    };
  }

  refreshUserGrid(): void {
    if (this.userGrid) {
      this.userGrid.onRefreshClick();
    }
  }

  toggleDeletedFilter(): void {
    this.showDeleted = !this.showDeleted;
    this.refreshUserGrid();
  }

  private transformUserForGrid(user: any): any {
    let status = (user.status || 'active').toLowerCase();
    if (status === 'deactive') {
      status = 'invited';
    } else if (status === 'suspend') {
      status = 'suspended';
    }
    return {
      ...this.normalizeMemberForForm(user),
      _id: user.id ?? user._id,
      name: user.name || user.email,
      group_names_str: Array.isArray(user.group_names) ? user.group_names.join(', ') : user.group_names || '',
      created_at: user.created_at,
      status: status
    };
  }



  onGridAction(event: GridOutputEvent): void {
    const action = event.Action || (event as any).action;
    const data = event.data;
    const source = event.Source || (event as any).source;
    switch (action) {
      case 'Refresh':
      case 'refresh':
        this.refreshUserGrid();
        break;
      case 'rowClicked':
        this.selectUser(data);
        break;
      case 'add':
      case 'Add':
        if (source === 'Form') {
          this.refreshUserGrid();
          if (this.userGrid) {
            this.userGrid.closeDrawer();
          }
          this.dialogService.CloseALL();
        }
        break;
      case 'edit':
      case 'Edit':
        if (source === 'Form') {
          this.selectUser(data);
          this.refreshUserGrid();
          if (this.userGrid) {
            this.userGrid.closeDrawer();
          }
          this.dialogService.CloseALL();
        } else {
          this.selectUser(data);
        }
        break;
      case 'custom_permission':
        this.openCustomPermission(data);
        break;
      case 'resend_invite':
        this.resendUserInvite(data.id || data._id);
        break;
      case 'reset_password':
        this.resetPassword(data.id || data._id);
        break;
      case 'reset_mfa':
        this.resetMfa(data.id || data._id);
        break;
      case 'toggle_status':
        this.toggleUserStatus(data);
        break;
      default:
        break;
    }
  }

  onDeleteRequest(user: any): void {
    this.dialogService.confirmationBox(
      this.translateService.instant('USERS.CONFIRM_DELETE')
    ).afterClosed().subscribe((confirm: boolean) => {
      if (!confirm) return;
      const userId = user.id || user._id;
      this.apiService.deleteUser(userId).subscribe({
        next: () => {
          this.dialogService.openSnackBar(this.translateService.instant('USERS.SNACK_DELETED'));
          if (this.selectedUser?.id === userId || this.selectedUser?._id === userId) {
            this.selectedUser = null;
          }
          this.userGrid?.removeRow(user);
        },
        error: (err: any) => {
          this.dialogService.openSnackBar(err.error?.error || this.translateService.instant('USERS.ERR_DELETE'));
        }
      });
    });
  }

  onCardAction(event: any): void {
    this.onGridAction({
      Action: event.action || event.Action,
      Source: 'Grid',
      data: event.data
    });
  }

  editSelectedUser(user: any): void {
    if (!this.userGrid) return;
    const userId = user.id || user._id;
    this.apiService.getUserDetail(userId).subscribe({
      next: (res) => {
        this.userGrid.onActionButtonClick({ formAction: 'edit', label: 'Edit' }, this.normalizeMemberForForm(user, res));
      },
      error: () => {
        this.userGrid.onActionButtonClick({ formAction: 'edit', label: 'Edit' }, this.normalizeMemberForForm(user));
      }
    });
  }

  selectUser(user: any): void {
    this.selectedUser = user;
    this.selectedSessions = [];
    this.selectedActivities = [];

    this.apiService.getUserDetail(user.id || user._id).subscribe({
      next: (res) => {
        this.selectedSessions = res.sessions || [];
        this.selectedActivities = res.activities || [];
        this.selectedUser = this.normalizeMemberForForm(this.selectedUser || user, res);
      }
    });
  }

  switchTab(tab: 'list' | 'permissions'): void {
    this.activeTab = tab;
    if (tab === 'list') {
      this.selectedUserForPermissions = null;
      this.matrix = {};
      this.gridRowData = [];
    }
  }

  resendUserInvite(userId: string): void {
    this.apiService.resendInvite(userId).subscribe({
      next: () => {
        this.dialogService.openSnackBar(this.translateService.instant('USERS.SNACK_INVITE_RESENT'));
        this.refreshUserGrid();
      },
      error: (err) => {
        this.dialogService.openSnackBar(err.error?.error || this.translateService.instant('USERS.ERR_INVITE_RESENT'));
      }
    });
  }

  deleteUserAccount(userId: string): void {
    this.dialogService.confirmationBox(this.translateService.instant('USERS.CONFIRM_DELETE')).afterClosed().subscribe((confirm) => {
      if (!confirm) return;

      this.apiService.deleteUser(userId).subscribe({
        next: () => {
          this.dialogService.openSnackBar(this.translateService.instant('USERS.SNACK_DELETED'));
          this.selectedUser = null;
          this.refreshUserGrid();
        },
        error: (err) => {
          this.dialogService.openSnackBar(err.error?.error || this.translateService.instant('USERS.ERR_DELETE'));
        }
      });
    });
  }

  resetPassword(userId: string): void {
    this.dialogService.confirmationBox(this.translateService.instant('USERS.CONFIRM_RESET_PASSWORD')).afterClosed().subscribe((confirm) => {
      if (!confirm) return;

      this.apiService.adminResetPassword(userId).subscribe({
        next: () => {
          this.dialogService.openSnackBar(this.translateService.instant('USERS.SNACK_RESET_PASSWORD'));
          this.refreshUserGrid();
        },
        error: (err) => {
          this.dialogService.openSnackBar(err.error?.error || this.translateService.instant('USERS.ERR_RESET_PASSWORD'));
        }
      });
    });
  }

  resetMfa(userId: string): void {
    this.dialogService.confirmationBox(this.translateService.instant('USERS.CONFIRM_RESET_MFA')).afterClosed().subscribe((confirm) => {
      if (!confirm) return;

      this.apiService.adminResetMfa(userId).subscribe({
        next: () => {
          this.dialogService.openSnackBar(this.translateService.instant('USERS.SNACK_RESET_MFA'));
          this.refreshUserGrid();
        },
        error: (err) => {
          this.dialogService.openSnackBar(err.error?.error || this.translateService.instant('USERS.ERR_RESET_MFA'));
        }
      });
    });
  }

  toggleUserStatus(user: any): void {
    const newActive = user.status === 'suspended';
    const msgKey = newActive ? 'USERS.CONFIRM_TOGGLE_ACTIVE' : 'USERS.CONFIRM_TOGGLE_SUSPENDED';
    this.dialogService.confirmationBox(this.translateService.instant(msgKey)).afterClosed().subscribe((confirm) => {
      if (!confirm) return;

      this.apiService.adminToggleUserStatus(user.id).subscribe({
        next: () => {
          const snackKey = newActive ? 'USERS.SNACK_ENABLED' : 'USERS.SNACK_DISABLED';
          this.dialogService.openSnackBar(this.translateService.instant(snackKey));
          if (this.selectedUser) {
            this.selectUser(this.selectedUser);
          }
          this.refreshUserGrid();
        },
        error: (err) => {
          const errKey = newActive ? 'USERS.ERR_ENABLE' : 'USERS.ERR_DISABLE';
          this.dialogService.openSnackBar(err.error?.error || this.translateService.instant(errKey));
        }
      });
    });
  }

  fetchModulesAndScreens(): void {
    this.apiService.getModules().subscribe({
      next: (mods) => {
        this.modules = mods || [];
      }
    });
    this.apiService.getScreens().subscribe({
      next: (scrs) => {
        this.screens = scrs?.screens || scrs || [];
        this.updateAvailableActions();
      }
    });
  }

  private getAvailablePermissions(screen: any): string[] {
    try {
      const val = screen?.avialable_permission;
      if (Array.isArray(val)) return val.map(String);
      if (typeof val === 'string' && val.trim()) {
        const parsed = JSON.parse(val.trim());
        if (Array.isArray(parsed)) return parsed.map(String);
      }
    } catch {}
    return [];
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

  openCustomPermission(user: any): void {
    this.selectedUserForPermissions = user;
    this.saving = true;
    this.apiService.getUserCustomPermissions(user.id || user._id).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res.screens) {
          this.screens = res.screens.screens || res.screens || [];
          this.updateAvailableActions();
        }
        if (res.modules) {
          this.modules = res.modules || [];
        }
        let parsed: any = res.custom_permission || [];
        for (let i = 0; i < 3; i++) {
          if (typeof parsed !== 'string') break;
          try { parsed = JSON.parse(parsed); } catch { break; }
        }

        // Initialize matrix
        this.matrix = {};
        for (const scr of this.screens) {
          this.matrix[scr.id] = {};
          let avPerms = [];
          try { avPerms = JSON.parse(scr.avialable_permission || '[]'); } catch { avPerms = []; }
          for (const p of avPerms) {
            this.matrix[scr.id][p] = false;
          }
        }

        const screenNameToId: Record<string, string> = {};
        for (const scr of this.screens) {
          screenNameToId[scr.name] = scr.id;
        }

        // Apply overrides to matrix
        if (Array.isArray(parsed)) {
          for (const modConfig of parsed) {
            for (const screenConfig of (modConfig.permission_config || modConfig.configs || [])) {
              const screenId = screenNameToId[screenConfig.screen_name];
              if (!screenId || !this.matrix[screenId]) continue;
              const actions = screenConfig.action_available || [];
              for (const action of actions) {
                if (this.matrix[screenId].hasOwnProperty(action)) {
                  this.matrix[screenId][action] = true;
                }
              }
            }
          }
        }

        this.buildPermissionsGridRowData();
        this.activeTab = 'permissions';
      },
      error: (err: any) => {
        this.saving = false;
        this.dialogService.openSnackBar(err.error?.error || 'Failed to load user custom permissions.');
      }
    });
  }

  buildPermissionsGridRowData(): void {
    this.gridColumnDefs = [
      { field: 'moduleName', rowGroup: true, hide: true },
      { field: 'name', headerName: 'Screen Name', minWidth: 200 },
      { field: 'descriptions', headerName: 'Description', minWidth: 300, flex: 1 },
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
        cellRenderer: this.checkboxCellRenderer,
        cellStyle: { display: 'flex', justifyContent: 'center', alignItems: 'center' }
      }))
    ];

    this.gridRowData = this.screens.map(scr => {
      let moduleName = 'Unknown Module';
      let moduleId = '';
      try {
        const modIds = JSON.parse(scr.module_id || '[]');
        moduleId = modIds[0] || '';
      } catch {
        moduleId = scr.module_id || '';
      }
      const mod = this.modules.find(m => m.id === moduleId);
      if (mod) {
        moduleName = mod.name;
      }
      let avPerms: string[] = [];
      try {
        avPerms = JSON.parse(scr.avialable_permission || '[]');
      } catch {
        avPerms = [];
      }
      return {
        ...scr,
        moduleName: moduleName,
        availablePermissions: avPerms
      };
    });
  }

  onPermissionsGridReady(params: GridReadyEvent): void {
    this.permissionsGridApi = params.api;
  }

  refreshGrid(): void {
    if (this.permissionsGridApi) {
      this.permissionsGridApi.refreshCells({ force: true });
    }
  }

  togglePermission(screenId: string, action: string): void {
    if (!this.matrix[screenId]) {
      this.matrix[screenId] = {};
    }
    this.matrix[screenId][action] = !this.matrix[screenId][action];
  }

  isActionAvailable(scr: any, action: string): boolean {
    try {
      const avPerms = JSON.parse(scr.avialable_permission || '[]');
      return avPerms.includes(action.toLowerCase());
    } catch {
      return false;
    }
  }

  isAllSelected(scr: any): boolean {
    let avPerms: string[] = [];
    try { avPerms = JSON.parse(scr.avialable_permission || '[]'); } catch { avPerms = []; }
    return avPerms.length > 0 && avPerms.every(a => this.matrix[scr.id]?.[a] === true);
  }

  isPartiallySelected(scr: any): boolean {
    let avPerms: string[] = [];
    try { avPerms = JSON.parse(scr.avialable_permission || '[]'); } catch { avPerms = []; }
    const checkedCount = avPerms.filter(a => this.matrix[scr.id]?.[a] === true).length;
    return checkedCount > 0 && checkedCount < avPerms.length;
  }

  toggleAllForScreen(scr: any): void {
    let avPerms: string[] = [];
    try { avPerms = JSON.parse(scr.avialable_permission || '[]'); } catch { avPerms = []; }
    const selectAll = !this.isAllSelected(scr);
    if (!this.matrix[scr.id]) this.matrix[scr.id] = {};
    for (const action of avPerms) {
      this.matrix[scr.id][action] = selectAll;
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
      let avPerms: string[] = [];
      try { avPerms = JSON.parse(scr.avialable_permission || '[]'); } catch { avPerms = []; }
      totalAvailable += avPerms.length;
      checkedCount += avPerms.filter(a => this.matrix[scr.id]?.[a] === true).length;
    }

    return checkedCount > 0 && checkedCount < totalAvailable;
  }

  getScreensForModuleId(moduleId: string): any[] {
    return this.screens.filter(scr => {
      try {
        const modIds = JSON.parse(scr.module_id || '[]');
        return modIds.includes(moduleId);
      } catch {
        return scr.module_id === moduleId;
      }
    });
  }

  toggleAllForModule(moduleId: string): void {
    const screens = this.getScreensForModuleId(moduleId);
    const selectAll = !this.isModuleAllSelected(moduleId);
    for (const scr of screens) {
      let avPerms: string[] = [];
      try { avPerms = JSON.parse(scr.avialable_permission || '[]'); } catch { avPerms = []; }
      if (!this.matrix[scr.id]) this.matrix[scr.id] = {};
      for (const action of avPerms) {
        this.matrix[scr.id][action] = selectAll;
      }
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
    input.style.width = '18px';
    input.style.height = '18px';
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
    input.style.width = '18px';
    input.style.height = '18px';
    input.style.accentColor = '#1a73e8';
    input.addEventListener('change', (event: any) => {
      component.toggleAllForScreen(params.data);
      params.api.refreshCells({ rowNodes: [params.node], force: true });
    });
    return input;
  }

  saveCustomPermissions(): void {
    this.saving = true;
    const payload = this.buildCustomPermissionsPayload();
    const userId = this.selectedUserForPermissions.id || this.selectedUserForPermissions._id;
    this.apiService.updateUserCustomPermissions(userId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.dialogService.openSnackBar('Custom permissions saved successfully.');
        this.switchTab('list');
      },
      error: (err) => {
        this.saving = false;
        this.dialogService.openSnackBar(err.error?.error || 'Failed to save custom permissions.');
      }
    });
  }

  buildCustomPermissionsPayload(): any[] {
    const screenById: Record<string, any> = {};
    for (const scr of this.screens) {
      screenById[scr.id] = scr;
    }

    const moduleMap: Record<string, { module_name: string; module_id: string; permission_config: any[] }> = {};
    for (const module of this.modules) {
      moduleMap[module.id] = { module_name: module.name, module_id: module.id, permission_config: [] };
    }

    for (const scrId in this.matrix) {
      const scr = screenById[scrId];
      if (!scr) continue;

      const overriddenActions: string[] = [];
      for (const action in this.matrix[scrId]) {
        if (this.matrix[scrId][action]) {
          overriddenActions.push(action);
        }
      }

      if (overriddenActions.length === 0) continue;

      let moduleIds: string[] = [];
      try { moduleIds = JSON.parse(scr.module_id || '[]'); } catch { moduleIds = []; }
      const moduleId = moduleIds[0];
      if (!moduleId || !moduleMap[moduleId]) continue;

      moduleMap[moduleId].permission_config.push({
        screen_name: scr.name,
        action_available: overriddenActions
      });
    }

    return Object.values(moduleMap).filter(m => m.permission_config.length > 0);
  }
}
