import { Component, EventEmitter, inject, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import moment from 'moment';
import _ from 'lodash';
import { Observable } from 'rxjs';
import { DataService } from '../../../../core/services/data.service';
import { HelperService } from '../../../../core/services/utils/helper.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { DataManipulatorService } from '../../../../core/services/utils/data-manipulator-service.service';
import { DynamicQueryBuilderService } from '../../../../core/services/utils/dynamic-query-builder-service.service';
import { FilterOperations } from '../../../../core/interfaces/filter-builder';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../shared/shared.module';
@Component({
  standalone: true,
  imports: [
    CommonModule, SharedModule,
  ],
  selector: 'app-dynamic-filter',
  templateUrl: './dynamic-filter.component.html',
  styleUrls: ['./dynamic-filter.component.scss']
})
export class DynamicFilterComponent {
  dateBind: boolean = true
  projectData: any
  constructor(
    private dataService: DataService,
    private helpService: HelperService,
    public dialogService: DialogService
  ) { }
  ranges: any = {
    Today: [
      moment().startOf('day'),
      moment().endOf('day')
    ],
    Yesterday: [
      moment().subtract(1, 'days').startOf('day'),
      moment().subtract(1, 'days').endOf('day')  // End of yesterday
    ],
    'Last 7 Days': [
      moment().subtract(6, 'days').startOf('day'),
      moment().endOf('day')
    ],
    'Last 10 Days': [
      moment().subtract(9, 'days').startOf('day'),
      moment().endOf('day')
    ],
    'Last 30 Days': [
      moment().subtract(29, 'days').startOf('day'),
      moment().endOf('day')
    ],
    'This Month': [
      moment().startOf('month').startOf('day'),
      moment().endOf('day')
    ],
    'Last Month': [
      moment().subtract(1, 'month').startOf('month'),
      moment().subtract(1, 'month').endOf('month')  // End of previous month
    ],
    'Last 3 Months': [
      moment().subtract(3, 'month').startOf('month'),
      moment().endOf('day')
    ],
    'Last 6 Months': [
      moment().subtract(6, 'month').startOf('month'),
      moment().endOf('day')
    ]
  };
  private _dataManipulatorService = inject(DataManipulatorService)
  private _dynamicQueryBuilderService = inject(DynamicQueryBuilderService)

  poppageHeading: any
  popfields: any
  @Input('filterOptions') filterOptions: any;
  @Input('listData') listData: any
  @Input('config') config: any
  @Input('showdefaultFilter') showdefaultFilter: any
  @Output('filterValue') filterValue = new EventEmitter<any>();
  @Output('pdf') pdf = new EventEmitter<any>();
  @ViewChild("formlypopup", { static: true }) formlypopup!: TemplateRef<any>;

  ngOnChanges(): void {
    let shouldEmitOnInit = false;
    this.filterOptions.forEach((element: any) => {
      console.log(element);
      if (element['type'] == 'date_range') {
        element['selectedValue'] =
        {
          startDate: this.ranges[element['defaultvalue']][0],
          endDate: this.ranges[element['defaultvalue']][1]
        }
      }
      if (element?.['dateConfig']) {
        console.log("INSIDE", element);

        this._dataManipulatorService.appendDateConfig(this, element)
      }
      if (element.dataSource == "api") {
        const { dataSourceType = 'defaultType', collectionName, fixedFilter = false, defaultFilter = false } = element;
        let conditions: any = []
        if (fixedFilter) this._dynamicQueryBuilderService.makeFilterConditions(fixedFilter, conditions)
        if (defaultFilter) this._dynamicQueryBuilderService.makeFilterConditions(defaultFilter, conditions)

        let apiObservable: Observable<any>;
        let filtercondition: any = {
          start: 0,
          end: 100,
          filter: [
            !_.isEmpty(conditions) && {
              "clause": "AND",
              "conditions": conditions
            }
          ].filter(Boolean),
          sort: _.hasIn(element, 'sort') ? element['sort'] : [],
        }
        if (dataSourceType == 'dataset') {
          if (_.hasIn(element, 'filterParams') && !_.isEmpty(_.get(element, 'filterParams'))) {
            filtercondition['filterParams'] = _.get(this, 'filterParams')
          }
          apiObservable = this.dataService.dataset_Get_Data(collectionName, filtercondition);
        } else {
          apiObservable = this.dataService.getDataByFilter(collectionName, filtercondition);
        }
        apiObservable.subscribe((response: any) => {
          element['options'] = response.data[0].response
        })
      }
      if (element.emitOnInit && element.selectedValue) {
        shouldEmitOnInit = true;
      }
    });
    if (this.config?.['ShowFilterButton']) {
      this.filterOptions.push({ type: "button" })
    }
    if (shouldEmitOnInit) {
      setTimeout(() => this.triggerFilter(false), 0);
    }
  }
  cancel() {
    this.dialogService.CloseALL()
  }
  frmSubmit(data: any) {
    console.log(data);
    // data[data["columnName"]] = data["selectedValue"]
    console.log(this.filterOptions);
    this.dialogService.CloseALL()

  }
  OpenDialog(options: any) {

    if (!_.hasIn(options, 'field')) {
      console.error("No Formly Field Avalible", options);
      return
    }
    options[options["columnName"]] = options["selectedValue"]
    this.poppageHeading = options['heading'] ?? ""
    this.popfields = options['field'] ?? []
    this.dialogService.openDialog(this.formlypopup, "50%", "56%", options)
  }

  /*
    Sample filter control option

    "filterOptions": [
      {
        "columnName": "pc_code",   --> Database column name
        "label":"Pickup Center",   --> Control Label
        "dataSource":"collection", --> Dropdown control options take from DB
        "collectionName":"pickup_center",
        "multiSelection": false,
        "labelProp":"name",
        "valueProp":"_id"
      },
      ? Static Select
      {
        "columnName": "customer_type",
        "label":"Customer type",
        "dataSource":"list",
        "multiSelection": false,
        "labelProp":"label",
        "valueProp":"value",
        "options":[
          {"label":"Credit Customer", "value":"Cr"},
          {"label":"Cash Customer", "value":"Cash"}
        ]
      }
    ],
    ? Dynmic select
    {
      "columnName": "type_of_body",
      "label": "Body type",
      "dataSource": "api",
      "fixedFilter": [
        {
          "column": "type",
          "operator": "EQUALS",
          "type": "string",
          "value": "body_type"
        }
      ],
      "type": "select",
      "collectionName": "schematic",
      "labelProp": "name",
      "valueProp": "_id",
      "options": []
    },
    ? normal input 
    {
      "columnName": "capatity_tons",
      "label": "Approx Weight in tons",
      "operator": "GREATERTHANOREQUAL",
      "type": "input",
      "inputType": "number"
    },
    ? Date
    {
      "columnName": "schedule_end_date",
      "label": "End Date",
      "filterType": "filterParmas",
      "type": "datepicker",
      "dateConfig": true,
      "attributes": {
        "hide": "past_date"
      }
    },
    ? Map & popup 
    {
      "columnName": "lng_lat",
      "filterType": "filterParmas",
      "label": "Location", 
      "labelKey":"formattedAddress",
      "formattedAddress":"",
      "type": "popup",
      "field":[{
        "type": "location",
        "key": "selectedValue",
        "showsearchbar": true,
        "draggable": true,
        "props": {
          "reciprocal":true,
          "label": "",
          "placeholder": ""
        }
      }],
      "heading":"Search Address",
      "icon":"google-map",
      "isSvgIcon":true,
      "suffix":true
    }
     */
  filteredOptions: any
  filteredData(eneteredData: any) {

    // var conditions: any = []
    // this.filterOptions.forEach((opt: any) => {
    //   if (opt.selectedValue) {
    //  if (opt.type == 'autocomplete' && opt.selectedValue != "" || opt.type == 'text') {
    //       conditions.push({
    //         column: opt.columnName,
    //         operator: opt.operator,
    //         type: 'string',
    //         value: opt.selectedValue
    //       })
    //     }}})
    this.filteredOptions = this.projectData.filter((item: any) => {
      return item.project_name.toLowerCase().indexOf(eneteredData.toLowerCase()) > -1

    })


    // this.filterValue.emit(filterQuery);
  }

  toggleSelectAll(event: any) {
    if (event.source.selected) {
      event.source._parent.options.map((e: any) => {
        e.select()
      });
    } else {
      event.source._parent.options.map((e: any) => {
        e.deselect()
      });
    }
  }

  applyFilter(event: any) {
    const val = event.target.value.toLowerCase();
    this.filterValue.emit(val);
  }

  triggerFilter(inputTrigger = true) {
    if (this.config?.['ShowFilterButton'] && inputTrigger) return
    //build the condition for all filters
    var filterQuery: any = undefined
    var conditions: any = []
    var filterParams: any = []
    this.filterOptions.forEach((opt: any) => {
      let filtertype = opt['filterType'] ?? "filter";
      if (opt.selectedValue) {
        // Determine the value to use
        let value = (opt?.['inputType'] === 'number') ? Number(opt.selectedValue) : opt.selectedValue;

        // Helper function to handle filterParams
        const addFilterParams = (paramsName: string, dataType: string, paramsValue: any) => {
          filterParams.push({
            parmasName: paramsName,
            parmsDataType: dataType,
            paramsValue: paramsValue,
          });
        };

        // Helper function to handle conditions
        const addConditions = (column: string, operator: string, type: string, value: any) => {
          conditions.push({
            column: column,
            operator: operator || FilterOperations.EQUALS,
            type: type,
            value: value,
          });
        };

             if (opt.type === 'multiSearch' && Array.isArray(opt.columns)) {
          const orConditions = opt.columns.map((col: string) => ({
            column: col,
            operator: opt.operator || FilterOperations.CONTAINS,
            type: 'string',
            value,
          }));
          filterQuery = filterQuery ?? [];
          filterQuery.push({ clause: 'OR', conditions: orConditions });
        } else if (opt.type === 'select' || opt.type === 'text' || opt.type === 'input' || opt.type === 'autocomplete') {
          if (filtertype == 'filterParmas') {
            addFilterParams(opt['columnName'], opt['dataType'], opt.selectedValue);
          } else {
            addConditions(opt.columnName, opt.operator, 'string', value);
          }
        } else if (opt.type === 'datepicker') {
          // let startDate: any = opt.selectedValue.format(opt.filterFormat ?? "YYYY-MM-DDT00:00:00.SSS[Z]");
          // let endDate: any = opt.selectedValue.format(opt.filterFormat ?? "YYYY-MM-DDT23:59:59.SSS[Z]");
          let startDate: any = opt.selectedValue.clone().startOf('day').format();
          let endDate: any = opt.selectedValue.clone().endOf('day').format();
          if (opt.timeZone === 'Asia/Kolkata') {
            const selectedDate = opt.selectedValue.format('YYYY-MM-DD');
            startDate = `${selectedDate}T00:00:00.000+05:30`;
            endDate = `${selectedDate}T23:59:59.999+05:30`;
          }

        if (filtertype == 'filterParmas') {
          addFilterParams(opt['columnName'], 'date', opt.timeZone === 'Asia/Kolkata' ? startDate : opt.selectedValue.format(opt.filterFormat ?? "YYYY-MM-DDT01:01:00.SSS[Z]"));
        } else {
            if (opt.operator === FilterOperations.GREATERTHANOREQUAL) {
              addConditions(opt.columnName, FilterOperations.GREATERTHANOREQUAL, 'date', startDate);
            } else if (opt.operator === FilterOperations.LESSTHANOREQUAL) {
              addConditions(opt.columnName, FilterOperations.LESSTHANOREQUAL, 'date', endDate);
            } else {
              addConditions(opt.columnName, FilterOperations.GREATERTHANOREQUAL, 'date', startDate);
              addConditions(opt.columnName, FilterOperations.LESSTHANOREQUAL, 'date', endDate);
            }
        }
        } else if (opt.type === 'date_range') {
          let startDate: any = opt.selectedValue.startDate.format();
          let endDate: any = opt.selectedValue.endDate.format();

          if (filtertype == 'filterParmas') {
            addFilterParams(opt['startColumnName'], 'date', startDate);
            addFilterParams(opt['endColumnName'], 'date', endDate);
          } else {
            addConditions(opt.columnName, FilterOperations.GREATERTHANOREQUAL, 'date', startDate);
            addConditions(opt.columnName, FilterOperations.LESSTHANOREQUAL, 'date', endDate);
          }
        } else if (opt.type === "popup" && opt.selectedValue !== "") {
          if (filtertype == 'filterParmas') {
            addFilterParams(opt['columnName'], opt['dataType'] ?? 'any', opt.selectedValue);
          } else {
            addConditions(opt.columnName, opt.operator, 'string', opt.selectedValue);
          }
        }
      }
    });

    this._dynamicQueryBuilderService.makeFilterConditions(this.config?.fixedFilter, conditions)
    if (conditions.length > 0) {
      filterQuery = [{
        clause: "AND",
        conditions: conditions
      }]
    }
    console.log(filterQuery);

    this.filterValue.emit({ filterQuery, filterParams })
    // Add fixed (always) filter condition
    // this.dataService.makeFilterConditions(this.config.fixedFilter, conditions)
    // if (conditions.length > 0) {
    //   filterQuery = [{
    //     clause: "AND",
    //     conditions: conditions
    //   }]
    // }
    // this.onClick.emit(filterQuery)
  }

  generatePdf() {
    this.pdf.emit(true)
  }

}
