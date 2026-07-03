import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  ContentChildren,
  effect,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  input,
  OnDestroy,
  Output,
  QueryList,
  TemplateRef,
  Type,
  ViewChild,
  ViewChildren,
  ViewContainerRef,
} from '@angular/core';
import {
  ColDef,
  FirstDataRenderedEvent,
  GetContextMenuItemsParams,
  GetRowIdFunc,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  IServerSideDatasource,
  IServerSideGetRowsParams,
  MenuItemDef,
  RowModelType,
  ServerSideTransaction,
} from 'ag-grid-community';
import { CommonModule } from '@angular/common';
import { AgGridModule } from 'ag-grid-angular';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ActivatedRoute, Router } from '@angular/router';
import {
  distinctUntilChanged,
  firstValueFrom,
  Observable,
  Subject,
  takeUntil,
} from 'rxjs';
import _ from 'lodash';

import { SharedModule } from '../../shared.module';
import { QueryParamService } from '../../../../core/services/utils/query-param.service';
import { environment } from '../../../../../environments/environment';
import { AggridHelperService } from '../../../../core/services/ag-grid/aggrid-helper.service';
import { UtilsService } from '../../../../core/services/utils/utils.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { DynamicQueryBuilderService } from '../../../../core/services/utils/dynamic-query-builder-service.service';
import { DataManipulatorService } from '../../../../core/services/utils/data-manipulator-service.service';
import { AggridFilterConverterService } from '../../../../core/services/ag-grid/aggrid-filter-converter.service';
import { DataService } from '../../../../core/services/data.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { HelperService } from '../../../../core/services/utils/helper.service';
import { FilterService } from '../../../../core/services/utils/filter.service';
import { ActionButtonComponent } from '../../../dynamic/components/datatable/button';
import { MyLinkRendererComponent } from '../../../dynamic/components/datatable/cellstyle';
import { ScreenLoaded } from '../../../../core/services/screenloader.service';
import { expressionCheck } from '../../../../core/interfaces/filter-builder';
import { DynamicFormComponent } from '../../../dynamic/components/dynamic-form/dynamic-form.component';
import { DynamicFilterComponent } from '../../../dynamic/components/dynamic-filter/dynamic-filter.component';
import { TranslateService } from '@ngx-translate/core';
import { MatPaginatorModule, PageEvent, MatPaginator } from '@angular/material/paginator';
import { DialogRef } from '@angular/cdk/dialog';
import { CardSchema, CoreCard } from '../core-card/core-card';

/** Determines whether the grid renders as a table or as a card list */
export type GridViewMode = 'grid' | 'card';

/** Token interface that dynamically-created card components should implement */
export interface CoreCardHost {
  data: any;
  cardSchema?: CardSchema;
  actionCallback?: (event: { action: string; data: any }) => void;
}

export interface GridOutputEvent {
  Action: string;
  Source: 'Form' | 'Grid' | 'Filter';
  data?: any;
}

@Component({
  selector: 'core-grid',
  standalone: true,
  imports: [CommonModule, AgGridModule, SharedModule, ScrollingModule, CoreCard, DynamicFormComponent, DynamicFilterComponent, MatPaginator],
  templateUrl: './core-grid.html',
  styleUrl: './core-grid.scss',
})
export class CoreGrid implements AfterViewInit, AfterContentInit, OnDestroy {

  // ── Core grid inputs (unchanged API) ──────────────────────────────────────

  listName = input<string>();
  mode = input<'page' | 'popup'>('popup');
  listData = input<any[]>([]);
  gridRowModelType = input<RowModelType>('clientSide'); // clientSide by default
  rowSelection = input<'single' | 'multiple'>('single');
  @Input() removeDrawerPadding = false;

  @Output() actionClicked = new EventEmitter<GridOutputEvent>();

  /**
   * Emitted when the user clicks a delete action button.
   * The parent should handle the confirmation dialog, API call, and then
   * either call `grid.removeRow(data)` (serverSide) or update the `listData`
   * input array (clientSide) to reflect the deletion in the grid and card views.
   */
  @Output() deleteRequest = new EventEmitter<any>();

  apiObservable = input<
    (gridFilter: any, gridSort: any, start: any, end: any) => Observable<any>
  >();
  formName = input<string>();
  filterAndSortDefault = input<boolean>(false);
  showHeader = input<boolean>(true);

  // ── Card mode inputs ──────────────────────────────────────────────────────

  /**
   * Force a specific view mode. When omitted, the grid auto-switches to 'card'
   * on mobile screens (< 768 px).
   */
  @Input() viewMode?: GridViewMode;
  private _reloadData: boolean = false;

  @Input()
  set reloadData(value: boolean) {
    this._reloadData = value;
    if (value && this.gridApi) {
      this.getList(this.filterQuery, this.config?.sort);
    }
  }

  get reloadData(): boolean {
    return this._reloadData;
  }
  /**
   * JSON schema passed to each auto-rendered core-card in card mode.
   * Required when using the JSON-driven card layout (Mode 1).
   */
  @Input() cardSchema?: CardSchema;

  /**
   * Mode 3: Pass a component class here and core-grid will dynamically
   * instantiate one per data row using ViewContainerRef, set [data] on it,
   * and append it to the card list.
   */
  @Input() cardComponent?: Type<CoreCardHost>;

  /**
   * Named template map for Mode 2: pass custom TemplateRef per field ID.
   * { status: statusTpl, name: nameTpl }
   */
  @Input() fieldTemplateMap?: Record<string, TemplateRef<any>>;

  /**
   * Callback fired when a card action button is clicked.
   * Receives { action: string, data: any }.
   */
  @Input() cardActionCallback?: (event: { action: string; data: any }) => void;

  /**
   * Item size in px for CdkVirtualScrollViewport (card mode).
   * Adjust to match your actual card height for best performance.
   */
  @Input() cardItemSize = 180;

  // ── Internal state ────────────────────────────────────────────────────────

  activeViewMode: GridViewMode = 'grid';
  cardRows: any[] = [];

  /** ViewContainerRef anchors for Mode 3 dynamic component creation */
  @ViewChildren('dynamicCardAnchor', { read: ViewContainerRef })
  dynamicAnchors!: QueryList<ViewContainerRef>;

  /** Holds refs to dynamically created components so we can destroy them */
  private dynamicRefs: ComponentRef<CoreCardHost>[] = [];

  /** ng-content projection: children passed inside <core-grid>...</core-grid> */
  @ContentChildren('coreCardContent')
  projectedCards!: QueryList<any>;

  private destroy$ = new Subject<void>();

  // ── Service injections ────────────────────────────────────────────────────

  @ViewChild('Popup', { static: true }) Popup!: TemplateRef<any>;
  @ViewChild('DrawerDialog', { static: true }) DrawerDialog!: TemplateRef<any>;
  private _agGridHelper = inject(AggridHelperService);
  private _queryParamService = inject(QueryParamService);
  private _utilsService = inject(UtilsService);
  private _authService = inject(AuthService);
  public _permissionService = inject(PermissionService);

  getRole(): string {
    const user = this._authService.getCurrentUser();
    return (user?.role_name || user?.roleType || user?.entity_type || this._utilsService.getRole() || '').toLowerCase();
  }
  private _dynamicQueryBuilderService = inject(DynamicQueryBuilderService);
  private _dataManipulatorService = inject(DataManipulatorService);
  private _aggridFilterConverterService = inject(AggridFilterConverterService);
  private _dataService = inject(DataService);
  public _dialogService = inject(DialogService);
  public _helperService = inject(HelperService);
  public _screenLoaded = inject(ScreenLoaded);
  private _filterService = inject(FilterService);
  private _breakpointObserver = inject(BreakpointObserver);
  private _route = inject(ActivatedRoute);
  private _router = inject(Router);
  private _translateService = inject(TranslateService);
  private _vcr = inject(ViewContainerRef);
  private _cdr = inject(ChangeDetectorRef);

  // ── Grid state ────────────────────────────────────────────────────────────

  pageHeading: any;
  pageDescription: any;
  columnDefs: any;
  filterOptions: any;
  collectionName: any;
  loading = false;
  refreshing = false;
  showdefaultFilter = true;
  isConfigLoaded = false;
  id: any;
  gridApi!: GridApi;
  components: any;
  context: any;
  formAction = 'add';
  selectedModel: any = {};
  showbutton!: boolean;
  showDrawer = false;
  dataExist = true;
  config: any;
  model: any;
  models: any = {};
  filterQuery: any;
  allFilter: any;
  filteredRows: any[] | null = null;
  private lastListQuery: any;
  private lastListSort: any;
  private lastListTriggerFilter = false;
  cardPage = 0;
  cardPageSize = environment?.paginationPageSize || 20;
  cardTotalRows = 0;
  unfilteredTotalCount = 0;
  isManuallyToggled = false;

  get totalDataCount(): number {
    if (this.gridRowModelType() === 'clientSide') {
      return (this.listData() ?? []).length;
    } else {
      return this.unfilteredTotalCount;
    }
  }

  get shouldHideFilters(): boolean {
    if (this.isManuallyToggled && this.activeViewMode === 'grid') {
      return false;
    }
    const pageSize = this.gridOptions?.paginationPageSize || this.cardPageSize || 20;
    return this.totalDataCount <= pageSize;
  }

  getStandardViewMode(): GridViewMode {
    if (this.viewMode) {
      return this.viewMode;
    }
    if (this.config?.defaultViewMode) {
      return this.config.defaultViewMode;
    }
    return this.isMobile ? 'card' : 'grid';
  }

  checkViewModeAndFilters() {
    if (this.isManuallyToggled) return;
    const pageSize = this.gridOptions?.paginationPageSize || this.cardPageSize || 20;
    if (this.totalDataCount > 0 && this.totalDataCount <= pageSize) {
      this.activeViewMode = 'card';
    } else {
      this.activeViewMode = this.getStandardViewMode();
    }
  }

  public gridOptions: any = {
    cacheBlockSize: environment?.cacheBlockSize,
    paginationPageSize: environment?.paginationPageSize || 20,
    rowModelType: this.gridRowModelType() || environment?.rowModelType || 'serverSide',
    paginationPageSizeSelector: [10, 20, 25, 30, 50, 100],
  };

  get pagedCardRows(): any[] {
    const rows = this.virtualScrollRows;
    if (this.gridRowModelType() === 'clientSide') {
      this.cardTotalRows = rows.length;
    }
    const start = this.cardPage * this.cardPageSize;
    return rows.slice(start, start + this.cardPageSize);
  }

  get showCardPaginator(): boolean {
    const total = this.gridRowModelType() === 'clientSide'
      ? this.virtualScrollRows.length
      : this.cardTotalRows;
    const pageSize = this.gridOptions?.paginationPageSize || this.cardPageSize || 20;
    return total > pageSize;
  }

  get showMobileMenuAndPaginator(): boolean {
    return this.showCardPaginator;
  }

  // Add this method
  onCardPageChange(event: PageEvent) {
    this.cardPage = event.pageIndex;
    this.cardPageSize = event.pageSize;
    this._cdr.markForCheck();
  }

  overlayNoRowsTemplate =
    '<span class="no-rows-overlay">No Data Found</span>';

  public getRowId: GetRowIdFunc = (params: GetRowIdParams) => {
    const data = params.data ?? {};
    const keyField = this.config?.keyField ?? '_id';
    return `${data[keyField] ?? data._id ?? data.id ?? data.uuid ?? data.ID ?? ''}`;
  };

  public defaultColDef: ColDef = {
    resizable: true,
    filter: false,
    floatingFilter: false,
  };

  constructor() {
    this.context = { componentParent: this };
    this.components = {
      buttonRenderer: ActionButtonComponent,
      linkRenderer: MyLinkRendererComponent,
    };

    // Re-load config when listName changes
    effect(() => {
      const name = this.listName();
      if (name) this.loadConfig();
    });

    // Watch listData — update clientSide grid rowData when listData changes
    effect(() => {
      const data = this.listData();
      if (this.gridRowModelType() === 'clientSide') {
        this.cardRows = data ?? [];
        this.refreshing = false;
        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', data ?? []);
        }
        if (this.cardComponent) {
          setTimeout(() => this.buildDynamicCards());
        }
        this.checkViewModeAndFilters();
        this._cdr.markForCheck();
      }
    });

    // Watch breakpoint — auto-switch view mode unless explicitly overridden
    this._breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        if (!this.viewMode) {
          this.activeViewMode = state.matches ? 'card' : 'grid';
        } else {
          this.activeViewMode = this.viewMode;
        }
        this._cdr.markForCheck();
      });
  }

  ngOnInit() {
    // Update gridOptions rowModelType from signal input
    if (this.gridOptions) {
      const rowModel = this.gridRowModelType() || 'serverSide';
      this.gridOptions.rowModelType = rowModel;
      if (rowModel === 'clientSide') {
        delete this.gridOptions.cacheBlockSize;
      }
    }

    // Honour explicit viewMode input
    if (this.viewMode) this.activeViewMode = this.viewMode;

    this._translateService.onLangChange.subscribe(() => {
      this._agGridHelper.aggridSetter(this, 'columnDefs');
      if (this.gridApi) {
        this.gridApi.updateGridOptions({ columnDefs: this.columnDefs });
        this.gridApi.refreshHeader();
        this.gridApi.refreshCells({ force: true });
      }
      this._cdr.markForCheck();
    });
  }

  ngAfterContentInit() {
    // Mode 2 / ng-content: projected cards are already rendered by Angular
  }

  ngAfterViewInit() {
    // Mode 3: build dynamic components whenever the anchor list changes
    this.dynamicAnchors.changes
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.buildDynamicCards());

    // Initial build
    this.buildDynamicCards();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearDynamicCards();
  }

  // ── Dynamic component creation (Mode 3) ───────────────────────────────────

  private buildDynamicCards() {
    if (!this.cardComponent) return;
    this.clearDynamicCards();

    const rows = this.cardRows.length ? this.cardRows : (this.listData() ?? []);
    const anchors = this.dynamicAnchors.toArray();

    rows.forEach((row, i) => {
      const anchor = anchors[i];
      if (!anchor) return;

      const ref = anchor.createComponent(this.cardComponent!);
      ref.instance.data = row;
      if (this.cardSchema) ref.instance.cardSchema = this.cardSchema;
      if (this.cardActionCallback)
        ref.instance.actionCallback = this.cardActionCallback;
      ref.changeDetectorRef.detectChanges();
      this.dynamicRefs.push(ref);
    });
  }

  private clearDynamicCards() {
    this.dynamicRefs.forEach((r) => r.destroy());
    this.dynamicRefs = [];
  }

  // ── Config loading ─────────────────────────────────────────────────────────

  listenQueryParams() {
    this._route.queryParams
      .pipe(distinctUntilChanged())
      .subscribe(() => this.getList());
  }

  loadConfig() {
    this.isManuallyToggled = false;
    this._screenLoaded.loadListConfigJson(this.listName()!).subscribe(
      (config: any) => {
        this.config = config;
        if (config?.onloadConfig)
          this._dataManipulatorService.processValues(this, this, config.onloadConfig);
        if (config?.filterParams)
          this._dynamicQueryBuilderService.buildFilterParams(this);
        if (config?.listenQueryParams) this.listenQueryParams();

        this.showbutton = config.showbutton;
        if (_.hasIn(config, 'showbuttonExpression')) {
          this.showbutton = expressionCheck(this, config.showbuttonExpression);
        }

        const filter = this._dynamicQueryBuilderService.getFilterQuery(config, this);
        this.filterQuery = filter;
        let fOptions = config.filterOptions ?? [];
        const role = this.getRole();
        if (!this.listName()?.startsWith('cases-') && (role === 'user')) {
          fOptions = fOptions.filter((opt: any) =>
            opt.columnName !== 'patientName' &&
            opt.columnName !== 'patient_name' &&
            opt.label !== 'Patient' &&
            opt.label !== 'PAYMENTS.COL_USER_NAME'
          );
        }
        this.filterOptions = fOptions;
        this.showdefaultFilter = config.showdefaultFilter;
        this.pageHeading = config.pageHeading;
        this.pageDescription = config.pageDescription;
        this.collectionName =
          config.collectionName ??
          config.form?.collectionName ??
          config.screenId ??
          this.listName();

        let colDefs = config.columnDefs;
        if (Array.isArray(colDefs)) {
          colDefs.forEach((col: any) => {
            const fieldLower = (col.field || '').toLowerCase();
            const headerLower = (col.headerName || '').toLowerCase();
            if (fieldLower === 'action' || fieldLower === 'actions' || headerLower === 'action' || headerLower === 'actions') {
              col.width = 50;
              col.minWidth = 50;
              col.maxWidth = 50;
              col.resizable = false;
              if (col.flex) {
                delete col.flex;
              }
            }
          });
        }
        // Hide patient name/email/phone from other screens if needed, but not on patient list screens or cases screens
        if (this.listName() !== 'patients' && this.listName() !== 'patient' && !this.listName()?.startsWith('cases-') && (role === 'user')) {
          if (Array.isArray(colDefs)) {
            colDefs = colDefs.filter((col: any) => col.field !== 'patient_name' && col.field !== 'patientName');
            // if (role === 'patient') {
            //   colDefs = colDefs.filter((col: any) => col.field !== 'email' && col.field !== 'phone');
            // }
          }
        }
        this.columnDefs = colDefs;
        this.cardSchema = config.cardSchema ?? this.buildCardSchemaFromConfig(config);
        this.cardItemSize = config.cardSchema?.virtualScroll?.itemSize ?? config.cardItemSize ?? this.cardItemSize;
        if (config.defaultViewMode === 'grid' || config.defaultViewMode === 'card') {
          this.activeViewMode = this.viewMode ?? config.defaultViewMode;
        }
        this._agGridHelper.aggridSetter(this, 'columnDefs');
        this.isConfigLoaded = true;
        this.getList(this.filterQuery, config.sort);

        if (this.gridApi) {
          this.gridApi.updateGridOptions({ columnDefs: this.columnDefs });
          this.gridApi.resetRowHeights();
          if (config.rowHeight)
            this.gridApi.updateGridOptions({ rowHeight: config.rowHeight });
          setTimeout(() => {
            this.gridApi?.sizeColumnsToFit();
          }, 100);
        }
        this._cdr.markForCheck();
      }
    );
  }

  private buildCardSchemaFromConfig(config: any): CardSchema | undefined {
    const displayColumns = (config?.columnDefs ?? [])
      .filter((column: any) => column?.field && !['Action', 'actions'].includes(column.field))
      .slice(0, 6);

    if (!displayColumns.length) return undefined;

    const profileCol = (config?.columnDefs ?? []).find((c: any) => c.type === 'userProfile');
    const avatarKey = profileCol ? (profileCol.profileImageField || 'profile_photo') : undefined;
    const avatarFolder = profileCol ? (profileCol.folder || 'doctor_profiles') : undefined;

    return {
      titleKey: displayColumns[0]?.field,
      subtitleKey: displayColumns[1]?.field,
      avatarKey,
      avatarFolder,
      fields: displayColumns.slice(2).map((column: any) => ({
        key: column.field,
        label: column.headerName ?? column.field,
        type: column.type === 'date' ? 'date' : column.field === 'status' ? 'badge' : 'text',
        badgeColor: column.field === 'status' ? 'success' : undefined,
        span: column.flex && Number(column.flex) > 1.5 ? 2 : 1,
      })),
      actions: (config?.actions ?? []).map((action: any) => ({
        label: action.label,
        icon: action.icon,
        action: action.formAction ?? action.action ?? action.label?.toLowerCase(),
        color: action.formAction === 'delete' ? 'warn' : 'primary',
      })),
      virtualScroll: {
        enabled: true,
        itemSize: config?.cardItemSize ?? 220,
      },
    };
  }

  // ── Data fetching ──────────────────────────────────────────────────────────

  getList(query?: any, sort?: any, triggerFilter: any = false) {
    this.lastListQuery = query;
    this.lastListSort = sort;
    this.lastListTriggerFilter = triggerFilter;

    if (this.gridRowModelType() === 'clientSide' && triggerFilter) {
      this.applyClientSideFilter(query);
      return;
    }

    let filterQuery = query;
    let filterParmas: any = null;

    if (triggerFilter) {
      filterQuery = query?.filterQuery;
      filterParmas = query?.filterParams;
    }

    if (this.gridApi !== undefined && this.gridRowModelType() !== 'clientSide' && this.activeViewMode === 'grid') {
      const datasource: IServerSideDatasource = {
        getRows: async (params: IServerSideGetRowsParams) => {
          const obj: any = {
            start: params.request.startRow,
            end: params.request.endRow,
            filter: params.request.filterModel,
            sort: params.request.sortModel,
          };

          this._aggridFilterConverterService
            .makeFiltersConditions(obj, this.filterAndSortDefault())
            .then(async (filtercondition: any) => {
              const filter = filtercondition.filter;
              filtercondition.filter = [];

              if (this.filterQuery !== undefined && filterQuery !== undefined) {
                filtercondition.filter =
                  this.filterQuery === filterQuery
                    ? [...this.filterQuery, ...filter]
                    : [...this.filterQuery, ...filter, ...filterQuery];
              } else if (this.filterQuery !== undefined) {
                filtercondition.filter = [...this.filterQuery, ...filter];
              } else if (filterQuery !== undefined) {
                filtercondition.filter = [...filter, ...filterQuery];
              } else {
                filtercondition.filter = [...filter];
              }

              if (sort !== undefined) {
                filtercondition.sort = Array.isArray(sort)
                  ? [...sort, ...filtercondition.sort]
                  : [sort, ...filtercondition.sort];
              }

              if (
                this.config?.buildWithQueryParams &&
                !_.isEmpty(this._route.snapshot.queryParams)
              ) {
                const cond: any[] = [];
                this._queryParamService.ConstructQueryParamsIntoFilterObj(
                  this._route.snapshot.queryParams,
                  null,
                  cond,
                  this.config.dataKeyChange
                );
                const f = { clause: 'AND', conditions: cond };
                filtercondition.filter = _.isEmpty(filtercondition.filter)
                  ? [f]
                  : [...filtercondition.filter, f];
              }

              this.allFilter = filtercondition;

              if (triggerFilter) {
                filtercondition.filter = filterQuery;
                filtercondition.filterParams = filterParmas;
              }

              if (this.config?.queryParamsUse) {
                this._queryParamService.ConstructorFilterColumnIntoQueryParams(
                  filtercondition,
                  true
                );
              }

              const apiFn = this.apiObservable();
              if (apiFn) {
                const apiObservable = apiFn(
                  filtercondition.filter,
                  filtercondition.sort,
                  filtercondition.start,
                  filtercondition.end
                );
                try {
                  const response = await firstValueFrom(apiObservable);
                  console.log(response);
                  const pagination = response?.data?.[0]?.pagination?.[0];
                  if (pagination?.totalDocs !== undefined) {
                    params.api.hideOverlay();
                    const rows = response.data[0].response;

                    if (!triggerFilter) {
                      this.unfilteredTotalCount = pagination.totalDocs;
                    }
                    this.cardRows = rows;
                    this.cardTotalRows = pagination.totalDocs;

                    this.checkViewModeAndFilters();

                    if (this.activeViewMode === 'card') {
                      // Rebuild dynamic components if needed
                      if (this.cardComponent) {
                        setTimeout(() => this.buildDynamicCards());
                      }
                    }

                    params.success({ rowData: rows, rowCount: pagination.totalDocs });
                    this._cdr.markForCheck();

                  } else {
                    params.api.showNoRowsOverlay();
                    this.cardRows = [];
                    params.success({ rowData: [], rowCount: 0 });
                  }
                } catch {
                  params.api.showNoRowsOverlay();
                  this.cardRows = [];
                  params.success({ rowData: [], rowCount: 0 });
                }
              }
            });
        },
      };
      this.gridApi.setGridOption('serverSideDatasource', datasource);
    } else if (this.gridRowModelType() !== 'clientSide') {
      const apiFn = this.apiObservable();
      if (apiFn) {
        const conds: any[] = [];
        if (this.filterQuery) {
          conds.push(...this.filterQuery);
        }
        if (filterQuery) {
          conds.push(...filterQuery);
        }
        if (
          this.config?.buildWithQueryParams &&
          !_.isEmpty(this._route.snapshot.queryParams)
        ) {
          const cond: any[] = [];
          this._queryParamService.ConstructQueryParamsIntoFilterObj(
            this._route.snapshot.queryParams,
            null,
            cond,
            this.config.dataKeyChange
          );
          conds.push({ clause: 'AND', conditions: cond });
        }

        const sortConds = sort ?? this.config?.sort ?? [];

        const apiObservable = apiFn(
          conds,
          sortConds,
          0,
          100
        );

        apiObservable.subscribe({
          next: (response: any) => {
            const rows = response?.data?.[0]?.response ?? [];
            const pagination = response?.data?.[0]?.pagination?.[0];
            this.cardRows = rows;
            this.cardTotalRows = pagination?.totalDocs ?? rows.length;
            if (!triggerFilter) {
              this.unfilteredTotalCount = this.cardTotalRows;
            }
            this.checkViewModeAndFilters();
            if (this.cardComponent) {
              setTimeout(() => this.buildDynamicCards());
            }
            this._cdr.markForCheck();
          },
          error: (err: any) => {
            console.error('Failed to manually load serverSide card rows:', err);
            this.cardRows = [];
            this._cdr.markForCheck();
          }
        });
      }
    }
  }

  // ── AG Grid events ────────────────────────────────────────────────────────

  onRefreshClick(): void {
    this.refreshing = true;
    this._cdr.markForCheck();
    this.actionClicked.emit({ Action: 'Refresh', Source: 'Grid' });

    if (this.gridRowModelType() === 'clientSide') {
      // For clientSide, the parent handles Refresh action to re-fetch data.
      // Auto-reset spinner after 3s as a safety net if parent does not update listData.
      setTimeout(() => {
        this.refreshing = false;
        this._cdr.markForCheck();
      }, 3000);
      return;
    }

    this.getList(
      this.lastListQuery ?? this.filterQuery,
      this.lastListSort ?? this.config?.sort,
      this.lastListTriggerFilter
    );
    setTimeout(() => {
      this.refreshing = false;
      this._cdr.markForCheck();
    }, 3000);
  }

  onGridReady(params: GridReadyEvent) {
    params.api.updateGridOptions({
      paginationPageSize: environment.paginationPageSize,
    });
    this.gridApi = params.api;
    if (this.gridRowModelType() === 'clientSide') {
      this.gridApi.setGridOption('rowData', this.filteredRows ?? this.listData() ?? []);
    }
    this.getList(this.filterQuery, this.config?.sort);
    if (this.config?.rowHeight)
      this.gridApi.updateGridOptions({ rowHeight: this.config.rowHeight });

    setTimeout(() => {
      if (this.gridApi) {
        this.gridApi.sizeColumnsToFit();
      }
      this._cdr.markForCheck();
    }, 150);
  }

  onFirstDataRendered(params: FirstDataRenderedEvent) {
    params.api.sizeColumnsToFit();
    this._cdr.markForCheck();
  }

  onCellClicked(event: any) {
    const clickCell: string = event.column.getColId();
    const skipCells = new Set(['action', 'actions', '0', 'status', 'invite_status']);
    if (skipCells.has(clickCell.toLowerCase())) return;

    const colDef = event.column.getColDef();
    if (colDef.cellRenderer === 'buttonRenderer') {
      let actions: any[] = [];
      if (colDef.cellRendererParams) {
        const actionKey = colDef.cellRendererParams.actionKey;
        if (actionKey && typeof actionKey === 'string') {
          const parts = actionKey.split('.');
          const key = parts[parts.length - 1];
          actions = this.config?.[key] ?? [];
        } else {
          actions = this.config?.actions ?? [];
        }
      }
      const hasPreventClick = Array.isArray(actions) && actions.some((act: any) => act && act.preventClick === true);
      if (hasPreventClick) return;
    }

    this.actionClicked.emit({ Action: 'rowClicked', Source: 'Grid', data: event.data });
    if (this.config?.noForm) return;

    if (this.config?.screenEditMode === 'drawer') {
      this.selectedModel = event.data;
      this.formAction = 'Edit';
      this.openGlobalDrawer(event.data);
    } else if (this.config?.screenEditMode === 'popup') {
      this.selectedModel = event.data;
      this.formAction = 'Edit';
      this._dialogService.openDialog(
        this.Popup,
        this.config.screenWidth,
        null,
        event.data,
        this.config.screenMinWidth ?? false,
        this.config.screenMinHeight ?? false,
        this.config.panelClass ?? false
      );
    }
  }

  onRowDoubleClicked(event: any) {
    this.actionClicked.emit({ Action: 'rowDoubleClicked', Source: 'Grid', data: event.data });
    if (this.config?.noForm) return;
    if (this.config?.matRoute) {
      const updatedRoute = this.config.matRoute.replace(
        /{{(\w+.)}}/g,
        (_match: any, field: any) => _.get(event.data, field) ?? ''
      );
      this._router.navigateByUrl(updatedRoute);
    }
  }

  getContextMenuItems(
    params: GetContextMenuItemsParams
  ): (any | MenuItemDef)[] {
    return [
      'copy',
      'copyWithHeaders',
      'separator',
      {
        name: 'Export To Excel',
        subMenu: [
          {
            name: 'Selected Data Only',
            action: () => {
              if (params.context.componentParent.gridApi.getSelectedRows().length !== 0) {
                params.context.componentParent.onBtExport(false);
              } else {
                window.alert('No data Selected');
              }
            },
          },
          {
            name: 'All Data',
            action: () => params.context.componentParent.onBtExport(true),
          },
        ],
      },
    ];
  }

  // ── Action buttons ─────────────────────────────────────────────────────────

  onAddButonClick(_event: any) {
    this.actionClicked.emit({ Action: 'add', Source: 'Grid', data: {} });
    if (this.config?.noForm) return;
    if (this.config?.addRoute) {
      this._router.navigateByUrl(this.config.addRoute);
      return;
    }
    this.selectedModel = {};
    this.formAction = 'add';
    this.doAction(this.selectedModel);
  }

  onActionButtonClick(item: any, value: any = {}) {
    const action = item.formAction ?? item.label?.toLowerCase();
    this.actionClicked.emit({ Action: action, Source: 'Grid', data: value });
    if (this.config?.noForm) return;
    this.formAction = item.formAction ?? item.label.toLowerCase();
    if (item.formName) (this as any).formName = item.formName;

    const idKey = this.config?.keyField ?? '_id';
    const data = _.cloneDeep(value);
    _.set(this, 'selectedRow', data);

    if (item.config) this._dataManipulatorService.processValues(this, data, item.config);

    if (item.type === 'routing') {
      const route = item.route.replace(
        /{{(\w+.)}}/g,
        (_: any, field: any) => _.get(data, field) ?? ''
      );
      this._router.navigateByUrl(route);
    } else if (this.formAction === 'add') {
      if (item.addFormName) (this as any).formName = item.addFormName;
      if (this.config?.addFormName) (this as any).formName = this.config.addFormName;
      this.doAction(data, undefined, item.openType);
    } else if (this.formAction === 'edit') {
      this.selectedModel = data;
      if (item.changeFormName) (this as any).formName = item.changeFormName;
      this.doAction(data, data[idKey]);
    } else if (this.formAction === 'delete') {
      // Emit to parent so it owns the confirmation, API call, and data update.
      // After deletion succeeds the parent should call grid.removeRow(data)
      // (serverSide) or splice the item from its listData array (clientSide).
      if (this.deleteRequest.observed || (this.deleteRequest.observers && this.deleteRequest.observers.length > 0)) {
        this.deleteRequest.emit(data);
        this.actionClicked.emit({ Action: 'delete', Source: 'Grid', data });
        return;
      }
      this.deleteRequest.emit(data);
      const dialogRef = this._dialogService.openConfirmation(
        this._translateService.instant('CONFIRM_MSG.DELETE_RECORD')
      );
      dialogRef.afterClosed().subscribe((result: boolean) => {
        if (!result) return;
        const endpoint = this.config?.deleteEndpoint ?? this.collectionName;
        const obs$: Observable<any> = this.config?.deleteEndpoint
          ? this._dataService.deleteDataByEndpointId(endpoint, data._id || data.id)
          : this._dataService.deleteDataById(this.collectionName, data._id || data.id);

        obs$.subscribe(() => {
          const msg = this.config?.deleteMessage
            ? this._utilsService.templateProcessor(data, this.config.deleteMessage)
            : this._translateService.instant('SUCCESS_MSG.DELETE_SUCCESS');
          this._dialogService.openSnackBar(
            msg,
            this._translateService.instant('FORM.COMMON.OK')
          );
          this.applyGridTransaction('remove', data);

          // Also remove from card rows
          this.cardRows = this.cardRows.filter((r) => r !== data);
          this.actionClicked.emit({ Action: 'delete', Source: 'Form', data });
        });
      });
      this.actionClicked.emit({ Action: 'delete', Source: 'Grid', data });
    } else if (this.formAction === 'update') {
      const id = _.get(data, item.updateIdKey || '_id');
      const updateObj = item.updateObj;
      let collectionName = item.updateCollectionName;
      if (collectionName) {
        collectionName = collectionName.replace(
          /{{(\w+.)}}/g,
          (_match: any, field: any) => _.get(data, field) ?? ''
        );
      }
      const isStatic = item.static ?? false;
      const updateMessage = item.updateMessage ?? false;

      if (id && updateObj && collectionName) {
        this.makeupdateCall(
          collectionName,
          id,
          updateObj,
          this._utilsService.templateProcessor(data, updateMessage),
          isStatic
        );
        this.gridApi.deselectAll();
      }
    }

    _.unset(this, 'selectedRow');
  }

  doAction(data?: any, id?: string, mode?: any) {
    if (this.formAction === 'edit' && this.config?.editRoute) {
      const route = this.config.editRoute.replace(
        /{{(\w+.)}}/g,
        (_: any, field: any) => _.get(data, field) ?? ''
      );
      this._router.navigateByUrl(route);
      return;
    }
    const editMode = this.config?.editMode;
    if (editMode === 'drawer' || mode === 'drawer') {
      if (this.formAction === 'add') {
        const value: any = {};
        if (this.config?.addCtrlValuetoData)
          this._dataManipulatorService.processValues(this, value, this.config.addCtrlValuetoData);
        this.selectedModel = value;
      } else {
        this.selectedModel = data || {};
      }
      this.openGlobalDrawer(this.selectedModel);
      return;
    }
    if (editMode === 'popup' || mode === 'popup') {
      if (this.formAction === 'add') {
        const value: any = {};
        if (this.config?.addCtrlValuetoData)
          this._dataManipulatorService.processValues(this, value, this.config.addCtrlValuetoData);
        this._dialogService.openDialog(
          this.Popup,
          this.config.screenWidth,
          this.config.screenHeight ?? false,
          value,
          this.config.screenMinWidth ?? false,
          this.config.screenMinHeight ?? false,
          this.config.panelClass ?? false
        );
        return;
      }
      this._dialogService.openDialog(
        this.Popup,
        this.config.screenWidth,
        this.config.screenHeight ?? false,
        data,
        this.config.screenMinWidth ?? false,
        this.config.screenMinHeight ?? false,
        this.config.panelClass ?? false
      );
    } else {
      if (this.formAction === 'add') {
        if (this.config?.addRoute) {
          this._router.navigate([this.config.addRoute]);
        }
      } else if (this.formAction === 'edit') {
        if (this.config?.editRoute) {
          this._router.navigate([
            this.config.editRoute,
            data?.[this.config.keyField ?? '_id'],
          ]);
        }
      } else if (this.formAction === 'view') {
        if (this.config?.viewRoute) {
          this._router.navigate([
            this.config.viewRoute,
            data?.[this.config.keyField ?? '_id'],
          ]);
        }
      } else {
        this._dialogService.openDialog(
          this.Popup,
          this.config.screenWidth,
          null,
          data,
          this.config.screenMinWidth ?? false,
          this.config.screenMinHeight ?? false,
          this.config.panelClass ?? false
        );
      }
    }
  }

  export() { }

  close(event: any) {
    if (this._dialogService.dialogRef) {
      this._dialogService.closeModal();
    }
    if (this.drawerRef) {
      this.drawerRef.close()
      this.drawerRef = null
    }
    this.showDrawer = false;
    this._cdr.markForCheck();
    if (!event) return;

    if (event.action === 'filter') {
      this.getList(event.data);
      return;
    }

    if (event.action === 'Add' && event.data) {
      if (this.gridApi) {
        this.gridApi.deselectAll();
        this.gridApi.hideOverlay();
      }
      this.applyGridTransaction('add', event.data);
      if (this.activeViewMode === 'card') this.cardRows = [...this.cardRows, event.data];
    } else if (event.action === 'delete') {
      this.applyGridTransaction('remove', event.data);
      this.cardRows = this.cardRows.filter((r) => r._id !== event.data._id);
    } else {
      this.applyGridTransaction('update', event.data);
      this.cardRows = this.cardRows.map((r) =>
        r._id === event.data._id ? event.data : r
      );
    }

    this.actionClicked.emit({ Action: event.action, Source: 'Form', data: event.data });
  }

  closeDrawer() {
    this.showDrawer = false;
    if (this._dialogService.dialogRef) {
      this._dialogService.closeModal();
    }

    this._cdr.markForCheck();
  }
  drawerRef: DialogRef<any> | null = null;
  private openGlobalDrawer(data: any) {
    this.showDrawer = false;
    this.drawerRef = this._dialogService.openDrawer(
      this.DrawerDialog,
      data,
      this.config?.drawerWidth ?? '50vw',
      this.config?.drawerPanelClass ?? 'global-drawer-dialog'
    );
    this._cdr.markForCheck();
  }

  /**
   * Public API: called by the parent after it successfully deletes a record.
   * Removes the row from both the AG Grid and the card list.
   *
   * Usage (serverSide):
   *   <core-grid #myGrid (deleteRequest)="onDelete($event)"> ...
   *   onDelete(data) { api.delete(data._id).subscribe(() => myGrid.removeRow(data)); }
   *
   * Usage (clientSide):
   *   Simply filter the item out of your `listData` array — the grid's effect
   *   will pick up the change automatically.
   */
  removeRow(data: any): void {
    const keyField = this.config?.keyField ?? '_id';
    const id = data[keyField] ?? data._id ?? data.id;

    this.applyGridTransaction('remove', data);

    this.cardRows = this.cardRows.filter((r) => {
      const rId = r[keyField] ?? r._id ?? r.id;
      return rId !== id;
    });

    this._cdr.markForCheck();
  }

  private applyGridTransaction(action: 'add' | 'remove' | 'update', data: any) {
    if (!this.gridApi) {
      this.getList();
      return;
    }

    const isClientSide = this.gridRowModelType() === 'clientSide';
    const tx: any = {};
    tx[action] = [data];

    try {
      if (isClientSide) {
        const result = this.gridApi.applyTransaction(tx);
        const affectedRows = (result?.add?.length || 0) + (result?.remove?.length || 0) + (result?.update?.length || 0);
        if (affectedRows === 0) {
          this.getList();
        }
      } else {
        const result = this.gridApi.applyServerSideTransaction(tx);
        if (!result || result.status !== 'Applied') {
          this.getList();
        }
      }
    } catch (err) {
      console.warn("Transaction failed in grid, falling back to full refresh:", err);
      this.getList();
    }
  }

  makeupdateCall(
    collectionName: any,
    id: any,
    updateObj: any,
    updateMessage: any,
    isStatic: any
  ) {
    const endpoint = isStatic ? collectionName : `${collectionName}/${id}`;
    this._dataService.dataUpdate(endpoint, updateObj).subscribe(() => {
      this._dialogService.openSnackBar(updateMessage || 'Update Success');
    });
  }

  // ── View toggle (manual override) ─────────────────────────────────────────

  toggleView(mode: GridViewMode) {
    this.isManuallyToggled = true;
    this.activeViewMode = mode;
    if (mode === 'card') {
      this.cardRows = this.getCurrentRowsForCards();
      if (this.cardComponent) {
        setTimeout(() => this.buildDynamicCards());
      }
    }
    if (mode === 'grid' && this.gridApi) {
      setTimeout(() => this.gridApi?.sizeColumnsToFit(), 0);
    }
    this._cdr.markForCheck();
  }

  /** Expose rows for the template's virtual scroll */
  get virtualScrollRows(): any[] {
    if (this.filteredRows) return this.filteredRows;
    return this.cardRows.length ? this.cardRows : (this.listData() ?? []);
  }

  private getCurrentRowsForCards(): any[] {
    if (this.filteredRows) return this.filteredRows;

    const inputRows = this.listData() ?? [];
    if (inputRows.length) return inputRows;

    if (!this.gridApi) return this.cardRows;

    const gridRows: any[] = [];
    this.gridApi.forEachNode((node) => {
      if (node.data) gridRows.push(node.data);
    });

    return gridRows.length ? gridRows : this.cardRows;
  }

  onFilterValue(event: any) {
    if (this.gridRowModelType() === 'clientSide') {
      this.applyClientSideFilter(event);
      return;
    }
    this.getList(event, null, true);
  }


  private applyClientSideFilter(event: any) {
    const filterQuery: any[] = event?.filterQuery ?? [];
    const sourceRows = this.listData() ?? [];

    if (!filterQuery.length) {
      this.filteredRows = null;
      this.cardRows = [];
      if (this.gridApi) {
        this.gridApi.setGridOption('rowData', sourceRows);
      }
      return;
    }

    const matchesCondition = (row: any, condition: any): boolean => {
      const rawValue = _.get(row, condition.column);
      const rowValue = rawValue == null ? '' : String(rawValue).toLowerCase();
      const filterValue = condition.value == null ? '' : String(condition.value).toLowerCase();

      if (condition.type === 'date') {
        if (!rawValue) return false;
        const rowTime = new Date(rawValue).getTime();
        const filterTime = new Date(condition.value).getTime();
        if (isNaN(rowTime) || isNaN(filterTime)) return false;

        switch (condition.operator) {
          case 'GREATERTHANOREQUAL':
            return rowTime >= filterTime;
          case 'LESSTHANOREQUAL':
            return rowTime <= filterTime;
          case 'NOTEQUAL':
            return rowTime !== filterTime;
          case 'EQUALS':
          default:
            return rowTime === filterTime;
        }
      }

      switch (condition.operator) {
        case 'CONTAINS':
          return rowValue.includes(filterValue);
        case 'STARTSWITH':
          return rowValue.startsWith(filterValue);
        case 'ENDSWITH':
          return rowValue.endsWith(filterValue);
        case 'NOTEQUAL':
          return rowValue !== filterValue;
        case 'EQUALS':
        default:
          return rowValue === filterValue;
      }

    };

    const filtered = sourceRows.filter((row) =>
      filterQuery.every((group: any) => {
        const { clause, conditions } = group;
        if (clause === 'OR') {
          return conditions.some((c: any) => matchesCondition(row, c));
        }
        return conditions.every((c: any) => matchesCondition(row, c));
      })
    );

    this.filteredRows = filtered;
    this.cardRows = filtered;
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', filtered);
    }
    this._cdr.markForCheck();
  }

  onCardAction(event: { action: string; data: any }) {
    const actionName = event.action?.toLowerCase();
    const actionConfig = (this.config?.actions ?? []).find((action: any) => {
      const candidates = [
        action.action,
        action.formAction,
        action.label,
      ].filter(Boolean).map((value: string) => value.toLowerCase());
      return candidates.includes(actionName);
    });

    if (actionConfig) {
      this.onActionButtonClick(actionConfig, event.data);
      return;
    }

    this.cardActionCallback?.(event);
    this.actionClicked.emit({ Action: event.action, Source: 'Grid', data: event.data });
  }

  getExportColumns(): { field: string; headerName: string }[] {
    const cols: { field: string; headerName: string }[] = [];

    // Helper to check if a column is an action column (should be excluded from export)
    const isActionCol = (col: any): boolean => {
      const field = (col.field || '').toLowerCase();
      const header = (col.headerName || '').toLowerCase();
      return field === 'action' || field === 'actions' || header === 'action' || header === 'actions';
    };

    // 1. If JSON specifies full exportColumns, use those definitions
    if (this.config?.exportColumns && Array.isArray(this.config.exportColumns)) {
      for (const col of this.config.exportColumns) {
        if (isActionCol(col)) continue;
        cols.push({
          field: col.field,
          headerName: this._translateService.instant(col.headerName || col.field.toUpperCase()) || col.headerName || col.field.toUpperCase()
        });
      }
      return cols;
    }

    // 2. Default: fetch from columnDefs that have fields and are not action columns
    if (this.columnDefs && Array.isArray(this.columnDefs)) {
      for (const col of this.columnDefs) {
        if (col.field && col.headerName && !isActionCol(col) && col.headerName !== 'ACTIONS') {
          cols.push({
            field: col.field,
            headerName: this._translateService.instant(col.headerName) || col.headerName
          });
        }
      }
    }

    // 3. Append additional columns specified in the JSON config
    if (this.config?.additionalExportColumns && Array.isArray(this.config.additionalExportColumns)) {
      for (const col of this.config.additionalExportColumns) {
        if (isActionCol(col)) continue;
        cols.push({
          field: col.field,
          headerName: this._translateService.instant(col.headerName || col.field.toUpperCase()) || col.headerName || col.field.toUpperCase()
        });
      }
    }

    return cols;
  }

  getExportRows(): any[] {
    const rows: any[] = [];
    if (this.gridApi) {
      this.gridApi.forEachNode((node) => {
        if (node.data) {
          rows.push(node.data);
        }
      });
    }
    if (rows.length === 0) {
      return this.filteredRows ?? this.listData() ?? [];
    }
    return rows;
  }

  exportGridData(format: 'csv' | 'xlsx'): void {
    const cols = this.getExportColumns();
    const rows = this.getExportRows();

    // Build human-readable date-time: DD-MM-YYYY_HH-MM-SS
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
    const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const baseName = this.listName() || 'export';
    const filename = `${baseName}_${dateStr}_${timeStr}.${format === 'csv' ? 'csv' : 'xls'}`;
    const sheetName = `${baseName}_1`;

    if (!rows || rows.length === 0) {
      alert('No data available to export.');
      return;
    }

    // Helper: detect ISO date strings and format them as DD-MM-YYYY HH:MM:SS (local time)
    const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    const formatExportValue = (val: any): string => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && ISO_DATE_RE.test(val)) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ` +
            `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        }
      }
      return String(val);
    };

    const headers = cols.map(c => c.headerName);
    const dataRows = rows.map(row => {
      return cols.map(col => {
        const val = _.get(row, col.field);
        return formatExportValue(val);
      });
    });

    if (format === 'csv') {
      const csvHeaders = cols.map(c => `"${c.headerName.replace(/"/g, '""')}"`);
      const csvRows = dataRows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`));
      const csvContent = "\uFEFF" + [csvHeaders.join(','), ...csvRows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else {
      this.exportToExcelML(headers, dataRows, filename, sheetName);
    }
  }

  exportToExcelML(headers: string[], rows: any[][], filename: string, sheetName: string = 'Sheet1'): void {
    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="${this.escapeXml(sheetName)}">
  <Table>`;

    // Headers
    xml += '\n   <Row>';
    for (const h of headers) {
      xml += `\n    <Cell><Data ss:Type="String">${this.escapeXml(h)}</Data></Cell>`;
    }
    xml += '\n   </Row>';

    // Rows
    for (const r of rows) {
      xml += '\n   <Row>';
      for (const val of r) {
        const strVal = val === null || val === undefined ? '' : String(val);
        xml += `\n    <Cell><Data ss:Type="String">${this.escapeXml(strVal)}</Data></Cell>`;
      }
      xml += '\n   </Row>';
    }

    xml += `\n  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  escapeXml(unsafe: string): string {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  @ViewChild('mobileFilterDialog') mobileFilterDialog!: TemplateRef<any>;
  private mobileFilterDialogRef: any = null;
  private lastMobileFilterEvent: any = null;

  get isMobile(): boolean {
    return this._breakpointObserver.isMatched([Breakpoints.Handset, Breakpoints.TabletPortrait]);
  }

  openMobileFilter() {
    this.lastMobileFilterEvent = null;
    this.mobileFilterDialogRef = this._dialogService.openDialog(
      this.mobileFilterDialog,
      '95%',
      'auto',
      null,
      true,
      false,
      'mobile-filter-dialog-panel'
    );
  }

  closeMobileFilter() {
    if (this.mobileFilterDialogRef) {
      this.mobileFilterDialogRef.close();
      this.mobileFilterDialogRef = null;
    } else {
      this._dialogService.CloseALL();
    }
  }

  onMobileFilterChanged(event: any) {
    this.lastMobileFilterEvent = event;
  }

  applyMobileFilters(filterComponent: any) {
    if (filterComponent) {
      let emittedEvent: any = null;
      const sub = filterComponent.filterValue.subscribe((event: any) => {
        emittedEvent = event;
      });
      filterComponent.triggerFilter(false);
      sub.unsubscribe();

      if (emittedEvent) {
        this.onFilterValue(emittedEvent);
      }
    }
    this.closeMobileFilter();
    this._cdr.detectChanges();
  }

  resetMobileFilters(filterComponent: any) {
    if (this.filterOptions && this.filterOptions.length > 0) {
      this.filterOptions.forEach((opt: any) => {
        opt.selectedValue = undefined;
        if (opt.type === 'autocomplete') {
          opt.selectedValue = '';
        }
      });
    }
    if (filterComponent) {
      let emittedEvent: any = null;
      const sub = filterComponent.filterValue.subscribe((event: any) => {
        emittedEvent = event;
      });
      filterComponent.triggerFilter(false);
      sub.unsubscribe();

      if (emittedEvent) {
        this.onFilterValue(emittedEvent);
      } else {
        this.onFilterValue({ filterQuery: undefined, filterParams: [] });
      }
    } else {
      this.onFilterValue({ filterQuery: undefined, filterParams: [] });
    }
    this.closeMobileFilter();
    this._cdr.detectChanges();
  }
}
