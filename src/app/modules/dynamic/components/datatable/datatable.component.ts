import {
  Component,
  TemplateRef,
  ViewChild,
  OnInit,
  EventEmitter,
  Output,
  Input,
  inject,
  HostListener,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import {
  ColDef,
  FirstDataRenderedEvent,
  GetContextMenuItemsParams,
  GetRowIdFunc,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  iconSetAlpine,
  IServerSideDatasource,
  IServerSideGetRowsParams,
  KeyCreatorParams,
  MenuItemDef,
  ServerSideTransaction,
  themeAlpine,
  themeQuartz,
} from "ag-grid-community";
import moment from "moment";
import { ActionButtonComponent } from "./button";
import * as _ from "lodash";
import { MyLinkRendererComponent } from "./cellstyle";
import { distinctUntilChanged, firstValueFrom, Observable } from "rxjs";
import { BreakpointObserver } from "@angular/cdk/layout";
import { MatSidenav } from "@angular/material/sidenav";
import { QueryParamService } from "../../../../core/services/utils/query-param.service";
import { AggridHelperService } from "../../../../core/services/ag-grid/aggrid-helper.service";
import { DataService } from "../../../../core/services/data.service";
import { DialogService } from "../../../../core/services/dialog.service";
import { HelperService } from "../../../../core/services/utils/helper.service";
import { UtilsService } from "../../../../core/services/utils/utils.service";
import { DynamicQueryBuilderService } from "../../../../core/services/utils/dynamic-query-builder-service.service";
import { DataManipulatorService } from "../../../../core/services/utils/data-manipulator-service.service";
import { AggridFilterConverterService } from "../../../../core/services/ag-grid/aggrid-filter-converter.service";
import { PermissionService } from "../../../../core/services/permission/permission.service";
import { CommonModule } from "@angular/common";
import { DynamicFormComponent } from "../dynamic-form/dynamic-form.component";
import { DynamicFilterComponent } from "../dynamic-filter/dynamic-filter.component";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { MatDialog } from '@angular/material/dialog';
import { SharedModule } from "../../../shared/shared.module";
import { environment } from "../../../../../environments/environment";
import { FilterService } from "../../../../core/services/utils/filter.service";
import { expressionCheck } from "../../../../core/interfaces/filter-builder";
@Component({
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    DynamicFilterComponent,
    DynamicFormComponent,
    SharedModule,
  ],
  selector: "app-datatable",
  templateUrl: "./datatable.component.html",
  styleUrls: ["./datatable.component.css"],
})
export class DatatableComponent implements OnInit {

  collectionName!: string;
  listName!: string;
  config: any;
  pageHeading: any;
  columnDefs: any;
  filterOptions: any;
  listData: any;
  screenEditMode: string = "popup";
  fields: any;
  viewFields: any;
  viewModel: any = {};
  loading: boolean = false;
  id: any;
  gridApi!: GridApi;
  components: any;
  context: any;
  formAction: string = "add";
  selectedModel: any = {};
  showbutton!: boolean;
  dataExist = true;
  @ViewChild("editViewPopup", { static: true }) editViewPopup!: TemplateRef<any>;
  @ViewChild("Popup", { static: true }) Popup!: TemplateRef<any>;
  formName!: string;
  model: any;
  models: any = {};
  filterQuery: any;
  allFilter: any
  @Output("onClose") onClose = new EventEmitter<any>(); //UNDO
  @Input("mode") mode: string = "page";
  @ViewChild("drawer") drawer!: MatSidenav;
  queryParamService = inject(QueryParamService)
  // Template Config
  template_name: any
  template_id: any
  public gridOptions: any = {
    flex: 1,
    cacheBlockSize: environment?.cacheBlockSize,
    paginationPageSize: environment?.paginationPageSize || 20,
    rowModelType: environment?.rowModelType || 'serverSide',
    paginationPageSizeSelector: [10, 20, 25, 30, 50, 100],
  };

  overlayNoRowsTemplate = '<span class="no-rows-overlay">No Data Found</span>';
  showdefaultFilter: boolean = true;
  isConfigLoaded: boolean = false;
  public getRowId: GetRowIdFunc = (params: GetRowIdParams) => `${params.data[this.config.keyField ? this.config.keyField : "_id"]}`;
  viewType: any = ""
  private agGridHelper = inject(AggridHelperService);
  public defaultColDef: ColDef = {
    resizable: true,
    filter: false,
    floatingFilter: false,
  };

  //? Fetch the parent Data 
  isParent: boolean = false;
  parent_id: any
  parentDetails: any = {}
  breakpointObserver = inject(BreakpointObserver)
  private _utilsService = inject(UtilsService)
  public _permissionService = inject(PermissionService)
  private _dynamicQueryBuilderService = inject(DynamicQueryBuilderService)
  private _dataManipulatorService = inject(DataManipulatorService)
  private _aggridFilterConverterService = inject(AggridFilterConverterService)
  bulkUploadType: string = '';
  uploadType: string = "";


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private DataService: DataService,
    public dialogService: DialogService,
    public helperService: HelperService,
    private matDialog: MatDialog
  ) {
    // this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    // router.events.subscribe((event) => {
    // if( event instanceof NavigationStart){ 
    // }})
    this.context = { componentParent: this };
    this.components = {
      buttonRenderer: ActionButtonComponent,
      linkRenderer: MyLinkRendererComponent,
    };
  }
  private _filterService = inject(FilterService)
  private _translateService = inject(TranslateService)
  ngOnInit() {
    if (this.gridOptions && this.gridOptions.rowModelType === 'clientSide') {
      delete this.gridOptions.cacheBlockSize;
    }
    this._translateService.onLangChange.subscribe((res) => {
      console.log(res);

      this.agGridHelper.aggridSetter(this, 'columnDefs')
      if (this?.gridApi) {
        console.log(this.columnDefs);

        this.gridApi.updateGridOptions({ 'columnDefs': this.columnDefs })
      }
    })
    // this.getFilter(this.filterQuery)
    //! Change TO NEW  
    this.route.params.subscribe((params) => {
      this._filterService.getPramsFromParent(this.route.snapshot.params, this.route.snapshot.queryParams)
      this.isParent = this.route.snapshot.data['parentData'] ?? false
      if (this.isParent) this.parent_id = this.route.snapshot.paramMap.get('parentId');
      if (params["form"]) {
        this.listName = params["form"];
        this.formName = this.listName;
        this.loadConfig();
      }
    });
  }



  // @HostListener('window:resize', ['$event'])
  // onResize(event?: any) {
  //   let screenwidth = window.innerWidth;
  //   if (screenwidth <= 768) {
  //     this.view = 'card'
  //   }
  //   else {
  //     this.view = 'list'
  //   }
  // }
  listenQueryParams() {
    this.route.queryParams.pipe(distinctUntilChanged()).subscribe(() => {
      this.getList()
    })
  }
  loadConfig() {
    this.DataService.loadListConfigJson(this.listName).subscribe(
      (config: any) => {
        this.config = config;
        if (config?.['onloadConfig']) this._dataManipulatorService.processValues(this, this, config?.['onloadConfig']);
        if (config?.['filterParams']) this._dynamicQueryBuilderService.buildFilterParams(this);
        if (config?.['listenQueryParams']) this.listenQueryParams();
        this.showbutton = config.showbutton; // show button used to show add button it should done in json
        _.set(this, 'h_id', sessionStorage.getItem("h_id"))
        if (_.hasIn(config, 'showbuttonExpression')) {
          this.showbutton = expressionCheck(this, config.showbuttonExpression)
        }
        let filter = this._dynamicQueryBuilderService.getFilterQuery(config, this);
        this.filterQuery = filter;
        if (this.isParent) this.fetchParentDetails()
        this.collectionName = config.collectionName; // collectionName used to show add button it should done in json
        this.filterOptions = config.filterOptions;
        this.showdefaultFilter = config.showdefaultFilter;
        this.pageHeading = config.pageHeading;
        console.log(config);
        // If it true it will make the open
        if (!_.isEmpty(config['CustombulkUpload'])) {
          this.template_name = config['templateName']
          this.template_id = config['templateId']
        }
        this.screenEditMode = config.screenEditMode || "popup"; // screenEditMode is type used for POP up And PAge Screen
        this.fields = [];
        this.columnDefs = this.config.columnDefs; // Thus  for AG Grid columnDefs
        this.agGridHelper.aggridSetter(this, 'columnDefs')
        this.isConfigLoaded = true;
        this.getList(this.filterQuery, config.sort);
        if (this?.gridApi) {
          this.gridApi.updateGridOptions({ columnDefs: this.columnDefs })
          // ?  "rowHeight": "60px",
          this.gridApi.resetRowHeights()
          if (this.config?.['rowHeight']) this.gridApi.updateGridOptions({ 'rowHeight': this.config?.['rowHeight'] })
        }
      }
    );
  }
  fetchParentDetails() {
    if (!this.parent_id) return
    this.DataService.getDataById(this.config['parentCollectionName'], this.parent_id).subscribe((res: any) => {
      console.log("Parent Details", res);
      this.parentDetails = res.data[0]
    })
  }
  rowdata: any[] = [];

  /**
   * This method Get All Data by Passing collectionName  in grid
   */
  getList(query?: any, sort?: any, triggerFilter: any = false) {
    //! DEfenie this for GridAPi Should not be undefined
    let filterQuery = query;
    let filterParmas = null;
    if (triggerFilter) {
      filterQuery = query?.['filterQuery']
      filterParmas = query?.['filterParams']
    }
    if (this.gridApi !== undefined) {
      const datasource: IServerSideDatasource = {
        getRows: async (params: IServerSideGetRowsParams) => {
          let obj: any = { start: params.request.startRow, end: params.request.endRow, filter: params.request.filterModel, sort: params.request.sortModel };
          this._aggridFilterConverterService.makeFiltersConditions(obj).then(async (filtercondition: any) => {
            let filter = filtercondition.filter;
            filtercondition.filter = [];
            if (this.filterQuery !== undefined && filterQuery !== undefined) {
              if (this.filterQuery == filterQuery) {
                filtercondition.filter = [...this.filterQuery, ...filter];
              } else {
                filtercondition.filter = [
                  ...this.filterQuery,
                  ...filter,
                  ...filterQuery,
                ];
              }
            } else if (this.filterQuery !== undefined) {
              filtercondition.filter = [...this.filterQuery, ...filter];
            } else if (filterQuery !== undefined) {
              filtercondition.filter = [...filter, ...filterQuery];
            } else {
              filtercondition.filter = [...filter];
            }
            if (sort != undefined) {
              if (Array.isArray(sort)) {
                filtercondition.sort = [...sort, ...filtercondition.sort];
              } else {
                filtercondition.sort = [sort, ...filtercondition.sort];
              }
            }
            if (this.config?.['buildWithQueryParams'] && !_.isEmpty(this.route.snapshot.queryParams)) {
              let condition: any = []
              this.queryParamService.ConstructQueryParamsIntoFilterObj(this.route.snapshot.queryParams, null, condition, this.config['dataKeyChange'])
              let filter = {
                clause: "AND",
                conditions: condition
              }
              filtercondition.filter = _.isEmpty(filtercondition.filter) ? [filter] : [...filtercondition.filter, filter]
            }
            this.allFilter = filtercondition
            let apiObservable: Observable<any>;
            // ? Because we are adding fixed filter in dynaic filter itselfs
            if (triggerFilter) {
              filtercondition.filter = filterQuery
              filtercondition['filterParams'] = filterParmas
            }
            if (this.config?.['queryParamsUse']) {
              this.queryParamService.ConstructorFilterColumnIntoQueryParams(filtercondition, true)
            }

            if (this.config.dataset) {
              if (_.hasIn(this, 'filterParams') && !_.isEmpty(_.get(this, 'filterParams'))) {
                filtercondition['filterParams'] = _.get(this, 'filterParams');
              }
              if (filterParmas != null) {
                // filtercondition['filterParams'] = []
                const param: any = _.get(this, 'filterParams')
                filtercondition['filterParams'] = _.isEmpty(filtercondition['filterParams']) ? filterParmas : [...param, ...filterParmas];
              }

              if (_.isEmpty(filtercondition['filterParams'])) delete filtercondition['filterParams'];
              apiObservable = this.DataService.dataset_Get_Data(this.config.dataset['name'], filtercondition);
            } else {
              apiObservable = this.DataService.getDataByFilter(this.collectionName, filtercondition);
            }
            //  this.DataService.getDataByFilter(this.collectionName, filtercondition).subscribe((response:any)=>{
            //   if (response?.data[0]?.pagination[0]?.totalDocs !== undefined) {
            //     params?.api?.hideOverlay();
            //     // params?.api?.setRowCount(params?.request?.endRow || environment?.paginationPageSize)
            //     params?.api?.sizeColumnsToFit();
            //     this.listData = response.data[0].response;
            //     console.warn(this.gridApi.paginationGetRowCount());
            //     params?.success( {
            //       rowData: response.data[0].response,
            //       rowCount: response.data[0].pagination[0].totalDocs
            //     });
            //   } else {
            //     params?.api?.showNoRowsOverlay();
            //     params?.success({
            //       rowData: [],
            //       rowCount: 0
            //     });
            //   }
            //  })
            // return
            try {
              const response = await firstValueFrom(apiObservable);
              this.rowdata = response.data[0].response
              if (response?.data[0]?.pagination[0]?.totalDocs !== undefined) {
                params?.api?.hideOverlay();
                // params?.api?.setRowCount(params?.request?.endRow || environment?.paginationPageSize)
                // params?.api?.sizeColumnsToFit();
                this.listData = response.data[0].response;
                params?.success({
                  rowData: response.data[0].response,
                  rowCount: response.data[0].pagination[0].totalDocs
                });
              } else {
                params?.api?.showNoRowsOverlay();
                params?.success({
                  rowData: [],
                  rowCount: 0
                });
              }
            } catch (err) {
              params.api.showNoRowsOverlay();
              params?.success({
                rowData: [],
                rowCount: 0
              });
            }
          }
          );
        },
      };
      // this.gridApi.updateGridOptions({serverSideDatasource:datasource})
      this.gridApi.setGridOption('serverSideDatasource', datasource)
      // this.gridApi.setServerSideDatasource(datasource);
    }
  }

  //#region  // ? AG GRID

  onGridReady(params: GridReadyEvent) {
    params.api.updateGridOptions({ paginationPageSize: environment.paginationPageSize })
    // ? Pending
    // params.api.paginationGoToPage()
    // params.api.setFilterModel()
    // params.api.setAdvancedFilterModel()
    this.gridApi = params.api;
    // params.api.sizeColumnsToFit();
    // this.gridApi.sizeColumnsToFit();
    this.getList(this.filterQuery, this.config?.['sort']);
    if (this.config?.['rowHeight']) this.gridApi.updateGridOptions({ 'rowHeight': this.config?.['rowHeight'] })
  }

  onFirstDataRendered(params: FirstDataRenderedEvent) {
    // params.api.sizeColumnsToFit();
  }

  onCellClicked(event: any) {
    console.log("Cell Clicked");

    let clickCell: any = event.column.getColId()
    // ? Because this is not used For view purpose
    const skipCells = new Set(["action", "actions", "0", "status", "invite_status"]);
    if (skipCells.has(clickCell.toLowerCase())) {
      return;
    }
    if (this.config.onSelect == true) {
      if (this.config.setItem) {
        sessionStorage.setItem("teacher_id", event.data["email_id"])
      }
      const updatedRoute: any = this.config.route.replace(
        /{{(\w+.)}}/g, (_match: any, field: any) => {
          console.log(field);

          let value: any = _.get(event.data, field) || undefined
          console.log(value);

          if (value != undefined && value != null) {
            return value
          }
        }
      );
      if (event.data.status != "Pending") {
        this.router.navigate([updatedRoute]);
      }
    } else if (this.config.screenEditMode == "popup") {
      this.formName = this.config.onSelectName;
      this.selectedModel = event.data
      this.formAction = "Edit";
      this.dialogService.openDialog(
        this.editViewPopup,
        this.config["screenWidth"],
        null,
        event.data,
        this.config["screenMinWidth"] ?? false,
        this.config["screenMinHeight"] ?? false

      );

    } else if (this.config?.['viewFormName']) {
      this.DataService.loadViewConfigJson(this.config?.['viewFormName']).subscribe((res: any) => {
        let config = res
        if (!_.hasIn(config, 'viewMode')) {
          console.log("Err in View Mode");
          return
        }
        // ? If it does not have the viewType then it should not open the drawer
        if (!_.hasIn(config, 'viewType')) {
          console.log("Err in View Type");
          return
        }
        if (_.get(config, 'viewMode') == "sideNav") {
          // ? Enum list-view / form-view
          this.viewType = config["viewType"]
          if (this.viewType == "list-view") {
            this.matDrawercolumnDef = config["colDefs"]
            this.agGridHelper.aggridSetter(this, 'matDrawercolumnDef')
            setTimeout(() => {
              this.matDrawerrowData = _.get(event.data, this.config?.['matdarwerDefsKey'])
              this.drawer.open()
            }, 100);
          } else if (this.viewType == "form-view") {
            this.viewFields = config["fields"]
            // let rowData = this.gridApi.getSelectedRows()[0]
            this.viewModel = event.data
            this.drawer.open()
          }
        }

      })

    }
    // else if (this.config.screenEditMode == "projectdashboard") {
    //   let filer:any={
    //     start:0,end:1000,filter:[{

    //         clause: "AND",
    //         conditions: [
    //           {column: "client_id",operator: "EQUALS",type: "string",value: event.data.client_id},
    //         ],

    //     }]
    //   }
    //    this.DataService.getDataByFilter('client',filer).subscribe((res:any)=>{
    //     console.log(res);
    //     let data={
    //       logo:res.data[0].response[0]?.['logo']?.['storage_name'],
    //       client_name:res.data[0].response[0]?.['client_name'],
    //       name: event?.['data']?.['project_name'],
    //       _id: event?.['data']?.['_id']
    //     }
    //   //   this.helperService.getProjectmenu(data)
    //   //   console.log("final Data",data);

    //    })
    // } 
    else {
      return;
    }
  }

  onbuttonexport() { }

  matDrawercolumnDef: any
  matDrawerrowData: any
  onRowDoubleClicked(event: any) {
    if (this.config?.['matdarwerDefs']) {
      this.matDrawercolumnDef = this.config?.['matdarwerDefs']
      this.agGridHelper.aggridSetter(this, 'matDrawercolumnDef')
      setTimeout(() => {
        this.matDrawerrowData = _.get(event.data, this.config?.['matdarwerDefsKey'])
        this.drawer.open()
      }, 100);
    } else if (this.config?.['matRoute']) {
      const updatedRoute: any = this.config?.['matRoute'].replace(
        /{{(\w+.)}}/g, (_match: any, field: any) => {
          console.log(field);

          let value: any = _.get(event.data, field) || undefined

          if (value != undefined && value != null) {
            return value
          }
        }
      );
      this.router.navigateByUrl(updatedRoute)
    }
  }

  checkthevaluemorethan(data: any) {
    const value = parseFloat(data)
    if (value >= 65) {
      return 'positive'
    }
    return 'negative'
  }
  //!  

  getContextMenuItems(params: GetContextMenuItemsParams): (any | MenuItemDef)[] {
    var result: (any | MenuItemDef)[] = [
      // 'autoSizeAll',
      // 'resetColumns',
      // 'expandAll',
      // 'contractAll',
      'copy',
      'copyWithHeaders',
      'separator',
      // 'paste',
      {
        name: 'Export To Excel',
        subMenu: [
          // {
          // name: 'Excel',
          // subMenu: [
          {
            name: 'Selected Data Only ',
            action: () => {
              if (params.context.componentParent.gridApi.getSelectedRows().length !== 0) {
                params.context.componentParent.onBtExport(false)
              } else {
                window.alert('No data Selected');
              }
            }
          },
          {
            name: 'All Data',
            action: () => { params.context.componentParent.onBtExport(true) }
          }
        ]
      }
      // ,{
      //   name: 'Test Completed',
      //   subMenu: [
      //   {
      //     name: 'Selected Data Only ',
      //     action: () => {
      //     if(params.context.componentParent.gridApi.getSelectedRows().length!==0){
      //         params.context.componentParent.onBtExport(false)
      //     }else{
      //         window.alert('No data Selected');
      //     }}
      //   },
      //   {
      //     name: 'All Data',
      //     action: () => { params.context.componentParent.onBtExport(true) }
      //   }]}

    ];

    return result;

  }

  onBtExport(flag?: any) {
    if (flag == true) {
      this.DataService.getDataByFilter(this.collectionName, {}).subscribe(async (xyz: any) => {
        // this.excelservice.exportAsExcelFile(xyz.data[0].response, this.pageHeading);
      })
    } else {
      let data = this.gridApi.getSelectedRows()
      // this.excelservice.exportAsExcelFile(data, this.pageHeading);
      this.gridApi.deselectAll();
    }

  }
  //#endregion

  //#region //? Action Button / Status Change

  // Method for add form
  onAddButonClick(event: any) {
    this.selectedModel = {};
    this.formAction = "add";
    this.doAction(this.selectedModel);
  }

  constructFilterOptionsValue(): Record<string, any> | undefined {
    if (!this.filterOptions || !Array.isArray(this.filterOptions)) {
      return undefined;
    }
    const filteredData: Record<string, any> = {};
    this.filterOptions.forEach((filter: any) => {
      if (filter?.selectedValue) {
        filteredData[filter.columnName] = filter.selectedValue;
        if (moment(filter.selectedValue).isValid() && !Array.isArray(filter.selectedValue)) {
          filteredData[filter.columnName] = filter.selectedValue.format("yyyy-MM-DDT00:00:00.000Z")

        }
      }
    });
    return Object.keys(filteredData).length > 0 ? filteredData : undefined;
  }

  // Method for action buttons
  onActionButtonClick(item: any, value: any = {}) {
    this.formAction = item.formAction ? item.formAction : item.label.toLowerCase();
    if (item.formName) this.formName = item.formName;
    let id = this.config.keyField ?? "_id";
    // ? crateing the new Refrence
    let data = _.cloneDeep(value)
    // ? for Taking the value from the selected record 
    _.set(this, 'selectedRow', data)
    if (item['addFilterValue']) Object.assign(data, this.constructFilterOptionsValue())
    if (item['config']) this._dataManipulatorService.processValues(this, data, item['config'])
    if (item?.type == "routing") {
      const updatedRoute: any = item.route.replace(
        /{{(\w+.)}}/g, (_match: any, field: any) => {
          let value: any = _.get(data, field) || undefined
          if (value != undefined && value != null) {
            return value
          }
        }
      );
      this.router.navigateByUrl(updatedRoute)
    } else if (this.formAction == "add") {
      if (item?.['addFormName']) {
        this.formName = item?.['addFormName'];
      }
      if (this.config['addFormName']) {
        this.formName = this.config['addFormName'];
      }

      this.doAction(data, undefined, item?.['openType']);
    } else if (this.formAction == "edit") {
      // "formAction":"edit",
      // "changeFormName": "trip_reschedule",
      this.selectedModel = data;
      if (item?.['changeFormName']) {
        this.formName = item?.['changeFormName'];
      }
      this.doAction(data, data[id]);
    } else if (this.formAction == "view") {
      //FROM Assert
      // this.httpclient
      //   .get("assets/jsons/" + this.formName + "-" + "view" + ".json")

      // From DAtabase

      this.DataService.loadViewConfigJson(this.formAction).subscribe(
        (frmConfig: any) => {
          // this.config = frmConfig;
          this.fields = frmConfig.form.fields;
          this.pageHeading = frmConfig.pageHeading;
          this.doAction(data, data[id]);
        }
      );
    } else if (this.formAction == "delete") {
      const dialogRef = this.dialogService.openConfirmation(this._translateService.instant('CONFIRM_MSG.DELETE_RECORD'));
      dialogRef.afterClosed().subscribe((result: boolean) => {
        if (result) {
          var endpoint: any = this.config?.deleteEndpoint ? this.config?.deleteEndpoint : this.collectionName

          let observable$: Observable<any>;


          if (this.config?.deleteEndpoint) {
            observable$ = this.DataService.deleteDataByEndpointId(endpoint, data._id);
          } else {
            observable$ = this.DataService.deleteDataById(this.collectionName, data._id);
          }

          observable$.subscribe((res: any) => {

            let message = this._translateService.instant('SUCCESS_MSG.DELETE_SUCCESS');
            if (this.config['deleteMessage']) {
              message = this._utilsService.templateProcessor(data, this.config['deleteMessage'])
            }
            this.dialogService.openSnackBar(message, this._translateService.instant('FORM.COMMON.OK'))

            const transaction: ServerSideTransaction = {
              remove: [data],
            };
            setTimeout(() => {
              let result;
              if (this.gridOptions?.rowModelType === 'serverSide') {
                result = this.gridApi.applyServerSideTransaction(transaction);
              } else {
                result = this.gridApi.applyTransaction(transaction);
              }
              console.log(transaction, result);
            }, 0);
          });
        }
      })
    } else if (this.formAction == "update") {
      const id = _.get(data, item['updateIdKey'] || '_id');
      const updateObj = item['updateObj'] || false
      const collectionName = item['updateCollectionName'] || false
      const isStatic = item?.static ?? false;

      const updateMessage = item['updateMessage'] || false
      if (id && updateObj && collectionName) {
        this.makeupdateCall(collectionName, id, updateObj, this._utilsService.templateProcessor(data, updateMessage), isStatic);
        this.gridApi.deselectAll();
      } else {
        console.error("Update call failed: Missing required fields", { id, updateObj, collectionName });
      }
    }
    _.unset(this, "selectedRow")
    _.omit(this, "selectedRow")
  }
  // Open dialog for add,edit and view
  doAction(data?: any, id?: string, mode?: any) {

    if (this.config.editMode == "popup" || mode == "popup") {
      if (this.formAction == "add") {
        var value: any = {};
        if (this.config['addCtrlValuetoData']) this._dataManipulatorService.processValues(this, value, this.config['addCtrlValuetoData'])
        console.log(this.config);
        this.dialogService.openDialog(
          this.editViewPopup,
          this.config["screenWidth"],
          this.config["screenHeight"] ?? false,
          value,
          this.config["screenMinWidth"] ?? false,
          this.config["screenMinHeight"] ?? false
        );
        return
      }
      this.dialogService.openDialog(
        this.editViewPopup,
        this.config["screenWidth"],
        this.config["screenHeight"] ?? false,
        data,
        this.config["screenMinWidth"] ?? false,
        this.config["screenMinHeight"] ?? false
      );

    } else {
      console.log("elese");

      if (this.formAction == "add") {
        console.log("add");
        this.router.navigate([`${this.config.addRoute}`]);
      } else if (this.formAction == "edit") {
        this.router.navigate([
          `${this.config.editRoute}`,
          data[this.config.keyField ?? "_id"],
        ]);
      } else if (this.formAction == "view") {
        this.router.navigate([
          `${this.config.viewRoute}`,
          data[this.config.keyField ?? "_id"],
        ]);
      } else {
        this.dialogService.openDialog(
          this.editViewPopup,
          this.config["screenWidth"],
          null,
          data,
          this.config["screenMinWidth"] ?? false,
          this.config["screenMinHeight"] ?? false
        );
      }
    }
  }
  //#endregion

  close(event: any) {

    console.log(event);

    this.dialogService.closeModal();
    if (this.drawer) {
      this.closeDrawer();
    }
    this.fields = undefined;
    if (!event) return
    if (event.action == "filter") {
      this.getList(event.data)
    }

    if (this.gridOptions?.rowModelType === 'serverSide') {
      if (event.action === "Add" && event.data) {
        setTimeout(() => {
          this.gridApi.deselectAll();
          this.gridApi.hideOverlay();
          const transaction: ServerSideTransaction = {
            add: [event.data],
          };
          const result = this.gridApi.applyServerSideTransaction(transaction);
          console.log(transaction, result)
        }, 0);
      } else if (event.action == "delete") {
        setTimeout(() => {
          const transaction: ServerSideTransaction = {
            remove: [event.data],
          };
          const result = this.gridApi.applyServerSideTransaction(transaction);
          console.log(transaction, result);
        }, 0);
      } else {
        setTimeout(() => {
          const transaction: ServerSideTransaction = {
            update: [event.data],
          };
          const result = this.gridApi.applyServerSideTransaction(transaction);
          console.log(transaction, result)
        }, 0);
      }
    } else {
      if (event.action === "Add" && event.data) {
        setTimeout(() => {
          this.gridApi.deselectAll();
          this.gridApi.hideOverlay();
          const transaction: ServerSideTransaction = {
            add: [event.data],
          };
          const result = this.gridApi.applyTransaction(transaction);
          console.log(transaction, result)
        }, 0);
      } else if (event.action == "delete") {
        setTimeout(() => {
          const transaction: ServerSideTransaction = {
            remove: [event.data],
          };
          const result = this.gridApi.applyTransaction(transaction);
          console.log(transaction, result);
        }, 0);
      } else {
        setTimeout(() => {
          const transaction: ServerSideTransaction = {
            update: [event.data],
          };
          const result = this.gridApi.applyTransaction(transaction);
          console.log(transaction, result)
        }, 0);
      }
    }
  }

  makeupdateCall(collectionName: any, id: any, updateObj: any, updateMessage: any = false, isStatic: any) {
    if (isStatic) {
      this.DataService.dataUpdate(collectionName, updateObj).subscribe((res: any) => {
        console.log(res);
        if (updateMessage) {
          this.dialogService.openSnackBar(updateMessage)
        } else {
          this.dialogService.openSnackBar("Update Success")

        }
      })
    } else {
      this.DataService.dataUpdate(collectionName + "/" + id, updateObj).subscribe((res: any) => {
        console.log(res);
        if (updateMessage) {
          this.dialogService.openSnackBar(updateMessage)
        } else {
          this.dialogService.openSnackBar("Update Success")

        }
      })
    }

  }

  closeDrawer() {
    this.drawer.close()
    this.viewType = ""
    this.viewModel = {}
    this.gridApi.deselectAll()
  }
  closesDrawer() {
    this.drawer.close()
    this.viewType = ""
    this.viewModel = {}
    this.gridApi.deselectAll()
    this.getList()
  }

  onGridReady1(params: GridReadyEvent) {
    params.api.updateGridOptions({ paginationPageSize: environment.paginationPageSize })
    // this.gridApi = params.api;
    params.api.autoSizeAllColumns();
    // this.gridApi.sizeColumnsToFit();
    // this.getList()

  }

}
