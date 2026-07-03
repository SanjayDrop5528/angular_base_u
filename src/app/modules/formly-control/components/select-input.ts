import { ChangeDetectorRef, Component, inject, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { FieldType } from "@ngx-formly/core";
import { isEmpty } from "lodash";
import * as _ from "lodash";
import { HelperService } from "../../../core/services/utils/helper.service";
import { DialogService } from "../../../core/services/dialog.service";
import { DataService } from "../../../core/services/data.service";
import { UtilsService } from "../../../core/services/utils/utils.service";
import { DynamicQueryBuilderService } from "../../../core/services/utils/dynamic-query-builder-service.service";
import { DataManipulatorService } from "../../../core/services/utils/data-manipulator-service.service";
import { AggridFilterConverterService } from "../../../core/services/ag-grid/aggrid-filter-converter.service";
import { Observable } from "rxjs";

@Component({
  selector: "select-input", standalone: false,
  template: `
    <!-- <div class="center"><span>{{field.props!['label']}}</span></div> -->
    <!-- {{this.opt.options|json}} -->
    @if(!this.hide){
      @if(this.opt?.['renderAs'] === 'stacked-chips') {
        <div class="stacked-chips-wrapper">
          <label class="stacked-chips-label">{{ field.props!["label"] | translate }} <span *ngIf="this.field.props?.required" class="required-asterisk">*</span></label>
          <mat-chip-listbox
            class="stacked-chips-list"
            hideSingleSelectionIndicator="true"
            [multiple]="this.opt.multiple || false"
            [formControl]="thisFormControl"
            (change)="bindToModel($event)">
            @for (op of filteredOptions; track op) {
              <mat-chip-option 
                [value]="this.opt?.['fullObject'] ? op : getDate(op,this.valueProp)"
                [style.--chip-selected-bg]="this.to?.['chipIconMap']?.[getDate(op,this.labelProp)]?.bgColor || ''"
                [style.--chip-selected-text]="this.to?.['chipIconMap']?.[getDate(op,this.labelProp)]?.color || ''"
              >
                @if (!this.to?.['labeltype']) {
                  <span [innerHTML]="(getDate(op,this.labelProp) | translate)"></span>
                }
                @if (this.to?.['labeltype'] && this.to?.['labeltype']=='name' ) {
                  <span> {{ op["first_name"] }} {{ op["last_name"] }}</span>
                }
              </mat-chip-option>
            }
          </mat-chip-listbox>
          @if (this.showError && this.formControl.hasError("required")) {
            <mat-error class="stacked-chips-error" style="font-size: 75%; margin-top: 4px; color: #f44336;">
              {{ this.field.props?.label }} is required
            </mat-error>
          }
        </div>
      } @else {
      <mat-form-field style="width: 100%;">
        <mat-label>{{ field.props!["label"] | translate }}</mat-label>
      @if (!to.readonly) {
        <mat-select
          #matSelectInput [multiple]="this.opt.multiple || false"
          [formlyAttributes]="field"
          [formControl]="thisFormControl"
          (selectionChange)="bindToModel($event)"
          [required]="this.field.props.required"
          (openedChange)="onOpenedChange($event)"
          >
              @if (hasSearchEnabled) {
                <div class="select-search-container" (click)="$event.stopPropagation();">
                  <div class="select-search-wrapper">
                    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                      type="text"
                      class="select-search-input"
                      placeholder="Search..."
                      [value]="searchTerm"
                      (input)="onSearchInput($event)"
                      (keydown)="$event.stopPropagation();"
                      #searchInput
                    />
                    @if (searchTerm) {
                      <button 
                        type="button" 
                        class="clear-button" 
                        (click)="clearSearch($event); searchInput.focus();"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    }
                  </div>
                </div>
              }
              @if (this.to?.['showSelectAll']==true) {
                @if(selectAllOptions){ 
                  <mat-option value="selectAll" (click)="selectAll()">
                  <span> Select All </span>
                </mat-option>
                }@else{ 
                  <mat-option value="unselectAll" (click)="unselectAll()">
                  <span>Unselect All </span>
                </mat-option>
                }
              }
              @if (this.to?.['showNone']==true) {
                <mat-option [value]="''" (click)="showNone()">
                  <span> None </span>
                </mat-option>
              }
              
          @for (op of filteredOptions; track op) {
            <mat-option
              [value]="this.opt?.['fullObject'] ? op : getDate(op,this.valueProp)"

              >
              @if (!this.to?.['labeltype']) {
<span [innerHTML]="(resolveLabel(op) | translate)"></span>
              }
              @if (this.to?.['labeltype'] && this.to?.['labeltype']=='name' ) {
                <span> {{ op["first_name"] }} {{ op["last_name"] }}</span>
              }
            </mat-option>
          }
     </mat-select>
      }
      @if (this.formControl.hasError("required")) {
        <mat-error
          >{{ this.field.props?.label }} is required</mat-error
          >
        } 
      @if (this.formControl.hasError("pattern")) {
        <mat-error>{{ this.field.props?.label }} is Pattern Not Match</mat-error>
      } 
      @if (this.formControl.hasError("uniqueItems")) {
        <mat-error>{{ this.field.props?.label }}  Already Present </mat-error>
      }
        @if (to.readonly) {
          <input
            matInput
            readonly
            [formlyAttributes]="field"
            [value]="selectedLabel"
            />
        }
      </mat-form-field>
      }
    }
    `,
  styles: [`
    .select-search-container {
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      position: sticky;
      top: -4px;
      z-index: 1000;
      backdrop-filter: blur(8px);
    }

    .select-search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      width: 15px;
      height: 15px;
      color: rgba(255, 255, 255, 0.4);
      pointer-events: none;
      transition: color 0.15s ease;
    }

    .select-search-input {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 32px 8px 32px;
      font-size: 0.85rem;
      font-family: inherit;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      outline: none;
      background: rgba(255, 255, 255, 0.03);
      color: var(--mff-input-color, #f8fafc);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .select-search-input:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .select-search-input:focus {
      border-color: var(--mff-border-focus-color, #3b82f6);
      background: rgba(15, 23, 42, 0.6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }

    .select-search-input:focus ~ .search-icon {
      color: var(--mff-border-focus-color, #3b82f6);
    }

    .clear-button {
      position: absolute;
      right: 8px;
      background: transparent;
      border: none;
      padding: 4px;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      transition: all 0.15s ease;
    }

    .clear-button:hover {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.8);
    }

    .clear-button svg {
      width: 14px;
      height: 14px;
    }

    /* ── Light Mode override ("morning" theme) ── */
    ::ng-deep [data-theme="morning"] .select-search-container {
      background: #ffffff !important;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    ::ng-deep [data-theme="morning"] .search-icon {
      color: rgba(0, 0, 0, 0.4);
    }

    ::ng-deep [data-theme="morning"] .select-search-input {
      background: rgba(0, 0, 0, 0.02);
      border-color: rgba(0, 0, 0, 0.08);
      color: #0f172a;
    }

    ::ng-deep [data-theme="morning"] .select-search-input:hover {
      background: rgba(0, 0, 0, 0.04);
      border-color: rgba(0, 0, 0, 0.12);
    }

    ::ng-deep [data-theme="morning"] .select-search-input:focus {
      border-color: var(--mff-border-focus-color, #3b82f6);
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    ::ng-deep [data-theme="morning"] .select-search-input:focus ~ .search-icon {
      color: var(--mff-border-focus-color, #3b82f6);
    }

    ::ng-deep [data-theme="morning"] .clear-button {
      color: rgba(0, 0, 0, 0.4);
    }

    ::ng-deep [data-theme="morning"] .clear-button:hover {
      background: rgba(0, 0, 0, 0.06);
      color: rgba(0, 0, 0, 0.8);
    }

    /* Stacked Chips Styles */
    .stacked-chips-wrapper {
      margin-bottom: 16px;
      width: 100%;
      border: 1px solid var(--mff-border-color, rgba(255,255,255,0.12));
      border-radius: 8px;
      padding: 12px 16px 16px 16px;
      background: var(--mff-input-bg, rgba(255,255,255,0.02));
      box-sizing: border-box;
    }
    ::ng-deep [data-theme="morning"] .stacked-chips-wrapper {
      border-color: rgba(0,0,0,0.12);
      background-color: rgba(246, 246, 247, 1);
    }
    .stacked-chips-label {
      display: block;
      margin-bottom: 12px;
      font-size: 13px;
      color: var(--mff-label-color, rgba(255,255,255,0.7));
    }
    ::ng-deep [data-theme="morning"] .stacked-chips-label {
      color: rgba(0, 0, 0, 0.6);
    }
    ::ng-deep .stacked-chips-list .mdc-evolution-chip-set__chips {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      gap: 8px !important;
    }
    ::ng-deep .stacked-chips-list .mat-mdc-chip {
      width: auto !important;
      border-radius: 16px !important;
      background: var(--mff-input-bg, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--mff-border-color, rgba(255,255,255,0.1));
      color: var(--mff-input-color, #f8fafc);
      margin: 0 !important;
      min-height: 36px;
      transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease !important;
    }
    ::ng-deep [data-theme="morning"] .stacked-chips-list .mat-mdc-chip {
      background: #ffffff;
      border: 1px solid rgba(0,0,0,0.2);
      color: rgba(0,0,0,0.87);
    }
    ::ng-deep .stacked-chips-list .mat-mdc-chip-selected {
      background: var(--chip-selected-bg, rgba(59, 130, 246, 0.12)) !important;
      border-color: var(--chip-selected-text, #3b82f6) !important;
      color: var(--chip-selected-text, #3b82f6) !important;
    }
    ::ng-deep [data-theme="morning"] .stacked-chips-list .mat-mdc-chip-selected {
      background: var(--chip-selected-bg, rgba(59, 130, 246, 0.12)) !important;
      border-color: var(--chip-selected-text, #3b82f6) !important;
      color: var(--chip-selected-text, #1d4ed8) !important;
    }
    ::ng-deep .stacked-chips-list .mat-mdc-chip-selected .mdc-evolution-chip__text-label {
      font-weight: 600 !important;
    }

    .stacked-chip-icon-wrapper {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .stacked-chip-custom-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
  `],
  host: { style: 'display: block; width: 100%;' }
})
export class SelectInput extends FieldType<any> implements OnInit {
  opt: any;
  data: any;
  hide: boolean = false;
  currentField: any;
  valueProp = "id";
  labelProp = "name";
  selectedLabel = "";
  searchTerm = "";

  get hasSearchEnabled(): boolean {
    return !!(
      this.to?.['needSearch'] ||
      this.field.props?.['needSearch'] ||
      this.to?.['needsearch'] ||
      this.field.props?.['needsearch'] ||
      this.to?.['showSearch'] ||
      this.field.props?.['showSearch']
    );
  }

  onSearchInput(event: any) {
    this.searchTerm = event.target.value;
  }

  clearSearch(event: Event) {
    event.stopPropagation();
    this.searchTerm = "";
  }

  onOpenedChange(opened: boolean) {
    if (!opened) {
      this.searchTerm = "";
    }
  }

  getExistingValues(): any[] {
    let repeatField: any = this.field?.parent;
    while (repeatField && repeatField.type !== 'repeat' && !repeatField.fieldArray) {
      repeatField = repeatField.parent;
    }
    if (!repeatField) return [];

    const parentModel = repeatField.model;
    if (!parentModel) return [];

    let rows: any[] = [];
    if (Array.isArray(parentModel)) {
      rows = parentModel;
    } else if (repeatField.key) {
      rows = _.get(parentModel, repeatField.key);
    }

    if (!Array.isArray(rows)) return [];

    const currentKey = this.field.key;
    if (!currentKey) return [];

    const currentModel = this.model;
    const values: any[] = [];

    rows.forEach((row: any) => {
      if (row && row !== currentModel) {
        const val = _.get(row, currentKey);
        if (val !== undefined && val !== null && val !== '') {
          const valToCompare = (typeof val === 'object' && this.valueProp) ? _.get(val, this.valueProp) : val;
          values.push(valToCompare);
        }
      }
    });

    return values;
  }

  get filteredOptions(): any[] {
    let opts = this.opt?.options || [];

    if (this.opt?.['preventRepeat']) {
      const existingValues = this.getExistingValues();
      if (existingValues.length > 0) {
        opts = opts.filter((op: any) => {
          const val = this.getDate(op, this.valueProp);
          return !existingValues.includes(val);
        });
      }
    }

    if (!this.searchTerm) return opts;
    const term = this.searchTerm.toLowerCase();
    const searchField = this.to?.['searchfield'] || this.field.props?.['searchfield'] ||
      this.to?.['searchField'] || this.field.props?.['searchField'];

    return opts.filter((op: any) => {
      const label = String(this.resolveLabel(op) || '').toLowerCase();
      if (this.to?.['labeltype'] === 'name') {
        const nameVal = `${op['first_name'] || ''} ${op['last_name'] || ''}`.toLowerCase();
        if (nameVal.includes(term)) return true;
      } else {
        if (label.includes(term)) return true;
      }

      // Also match the value
      const value = String(this.getDate(op, this.valueProp) || '').toLowerCase();
      if (value.includes(term)) return true;

      // Also match the custom searchField if specified
      if (searchField) {
        const searchFieldVal = String(op?.[searchField] || '').toLowerCase();
        if (searchFieldVal.includes(term)) return true;
      }

      return false;
    });
  }
  // dropdown: any;
  addonFeild: any;
  selectedValue: any = "";
  private _utilsService = inject(UtilsService)
  selectedObject: any;
  // optionsValue:any;
  public dataService = inject(DataService)
  private helperservice = inject(HelperService)
  public dialogServices = inject(DialogService)
  private cf = inject(ChangeDetectorRef)
  private _dynamicQueryBuilderService = inject(DynamicQueryBuilderService)
  private _dataManipulatorService = inject(DataManipulatorService)

  public get thisFormControl() {
    return this.formControl as FormControl;
  }

  getDate(value: any, key: any) {
    return _.get(value, key)
  }

  getSelectedObj() {
    const arrValue = this.thisFormControl.value;
    if (arrValue.length) {
      const filteredValues = this.opt.options.filter((option: any) =>
        arrValue.includes(option[this.valueProp])
      );
      // Map to labelProp values and join them
      this.selectedLabel = filteredValues.map((option: any) => option[this.labelProp]).join(", ");
    }


  }

  resolveLabel(op: any): string {
    const template = this.labelProp;
    if (typeof template === 'string' && template.includes('{{')) {
      return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, path) => {
        const val = _.get(op, String(path).trim());
        return val !== undefined && val !== null ? String(val) : '';
      });
    }
    return _.get(op, template);
  }


  valueSlected() {
    this.selectedValue = this.formControl.value;
    this.thisFormControl?.setValue(this.selectedValue);
    this.bindToModel({ value: this.selectedValue })
    if (
      _.isEmpty(this.opt.options) &&
      ![undefined, null, ''].includes(this.formControl?.value) &&
      !this.opt?.endPoint &&
      !this.opt?.datasetName &&
      !this.opt?.optionsDataSource
    ) {
      // ? Data Has been reset
      setTimeout(() => {
        console.log("Data Has been reset");
        this.thisFormControl.reset();
        this.thisFormControl.setValue(null)
      }, 10);

    }
    // if (this.props?.['setmodelkey']) {
    //   this.model[this.props?.['setmodelkey']] = selectedObject[this.props?.['setmodelkey']]
    // }
  }
  selectAllOptions: any = true
  unselectAll() {
    this.formControl.setValue('')
    this.selectAllOptions = true
    this.syncAddFieldToModel()
  }
  selectAll() {
    const values = this.opt.options.map((res: any) => _.get(res, this.valueProp))
    this.formControl.setValue(values)
    this.selectAllOptions = false
    this.syncAddFieldToModel()
  }
  ngOnInit() {
    this.opt = this.field.props || {};
    console.log("SelectInput ngOnInit", this);

    this.labelProp = this.opt.labelProp;
    this.valueProp = this.opt.valueProp;
    this.currentField = this.field;

    this.thisFormControl.valueChanges.subscribe((res) => {
      if (!this.to.appendLabel) return
      this.getSelectedObj()
    })

    // Handle dynamicHideExpression
    if (this.opt?.['dynamicHideExpression']) {
      this.setupDynamicHideExpression();
    }
    if (this?.opt?.['methodType'] && this?.opt?.['fetch'] != 'staic') {
      try {
        // Await the response from dataHandler
        this.dataService.dataHandler(this.opt, this.model).then((res: any) => {
          this._dataManipulatorService.buildOptions(res, this.opt);
          if (this.currentField && this.currentField.formControl) {
            this.currentField.formControl.setValue(this.formControl.value);
            if (this.model?.isEdit || _.hasIn(this.model, this.field.key)) {
              this.valueSlected();
            }
          }
          this.cf.markForCheck();
        });
      } catch (error) {
        console.error("Error handling data:", error);
      }
      return
    }
    // ? For Dataset
    if (this.opt && this.opt['datasetName'] && this.opt['filterParams']) {
      this._dynamicQueryBuilderService.buildFilterParams(this, 'opt');

      let filtercondition: any = { start: 0, end: 200 };

      if (_.hasIn(this, 'filterParams') && !_.isEmpty(_.get(this, 'filterParams'))) {
        filtercondition['filterParams'] = _.get(this, 'filterParams');
      }

      if (this.opt['parentFilter']) {
        let parentControlKey: string = this.opt['parentFilter']['key'] as string;
        let parentControl: FormControl = this.form.get(parentControlKey) as FormControl;
        let parentValue: any = parentControl?.value; // Get initial value
        let valueChanged: boolean = false
        parentControl?.valueChanges.subscribe((val: any) => {
          valueChanged = true
          this.thisFormControl.reset()
          setTimeout(() => {
            if (this.model && this.opt['setmodelkey'] in this.model) {
              parentValue = this.model[this.opt['setmodelkey']];
              let filter: any = _.cloneDeep(this.opt['parentFilter']['filter']);
              if (Array.isArray(filter) && filter.length > 0 && Array.isArray(filter[0]?.conditions)) {
                let filterconditions = filter[0].conditions.map((res: any) => ({
                  "column": res['column'],
                  "operator": res['operator'],
                  "type": res['type'],
                  value: res?.['useDefault'] ? res['value'] : res.operator === "IN" ? [parentValue] : parentValue,
                }));
                filter[0].conditions = filterconditions;
              }

              filtercondition["filter"] = filter;

              this.dataService.dataset_Get_Data(this.opt['datasetName'], filtercondition).subscribe((res: any) => {
                console.log(res);
                this._dataManipulatorService.buildOptions(res.data[0].response, this.opt);
                this.currentField.formControl.setValue(this.formControl.value);
                if (this.model?.isEdit || _.hasIn(this.model, this.field.key)) {
                  this.valueSlected();
                }

                if (this.opt['selectDefaultOne'] && !this.model?.isEdit) {
                  this.makeFirstOneDefault()
                }
              });

            }
          }, 200);
        });
        if (!valueChanged && parentValue != undefined) {
          this.dataService.dataset_Get_Data(this.opt['datasetName'], filtercondition).subscribe((res: any) => {
            console.log(res);
            this._dataManipulatorService.buildOptions(res.data[0].response, this.opt);
            this.currentField.formControl.setValue(this.formControl.value);
            if (this.model?.isEdit || _.hasIn(this.model, this.field.key)) {
              this.valueSlected();
            }
          });
        }
      } else {
        this.dataService.dataset_Get_Data(this.opt['datasetName'], filtercondition).subscribe((res: any) => {
          console.log(res);
          this._dataManipulatorService.buildOptions(res.data[0].response, this.opt);
          this.currentField.formControl.setValue(this.formControl.value);
          if (this.model?.isEdit || _.hasIn(this.model, this.field.key)) {
            this.valueSlected();
          }
          if (this.opt['selectDefaultOne'] && !this.model?.isEdit) {
            this.makeFirstOneDefault()
          }
        });
      }
    }



    //  ? With Filter
    if (!this.opt?.Collections && (this?.opt?.multifilter && this?.opt?.multifiltertype) || !_.isEmpty(this?.opt?.multifilter_condition) && this.currentField.parentKey == undefined && !this?.opt?.lookup) {
      this?.opt?.multifilter_condition?.conditions.map((res: any) => {
        if (this?.opt?.multifiltertype == "local") {
          let value = sessionStorage.getItem(this.opt.local_name);
          res.value = value;
        }

        if (this?.opt?.multifiltertype == "fetchFromModel") {
          if (typeof res.value === 'string' && res.value.includes('{{')) {
            res.value = this._utilsService.processText(res.value, this.model);
          }
        }

      });

      let filter_condition = {
        start: 0, end: 100,
        filter: [{ ...this.opt.multifilter_condition }],
      };
      this.dataService
        .getDataByFilter(this.opt?.Collections, filter_condition)
        .subscribe((res: any) => {
          let values: any[] = [];
          console.log(this.opt?.['path'], ":::");

          console.log(res.data[0]);

          // let values = _.get(res,_.get(this.opt,'path', "data[0].response"), [])??[];
          let responseData = _.get(res, 'data[0].response', []);
          if (_.hasIn(this.opt, 'path')) {
            responseData = _.get(res, _.get(this.opt, 'path'), []);

          }
          // let values: any[] = _.get(this.opt?.['path'],"res.data[0].response")
          console.log(values, ":::");

          if (this.opt.specification) {
            responseData.forEach((element: any) => {
              if (element && element[this.opt.specification]) {
                this.cf.detectChanges();
                values.push(element[this.opt.specification]);
              }
            });

            // Update the options array within the subscription
            let totalvalue: any[] = [];
            values.forEach((data: any) => {
              let val: any = { ...data };
              if (!isEmpty(val)) {
                totalvalue.push({
                  label: val[0][this.opt.innerArray],
                  value: val[0][this.opt.innerArray],
                });
              }
            });
            this.field.props.options = totalvalue;
            this.opt.options = totalvalue;
            if (totalvalue.length === 1) {
              let autoVal = totalvalue[0].value;
              let finalVal = this.opt.multiple ? [autoVal] : autoVal;
              this.formControl.setValue(finalVal);
              this.bindToModel({ value: finalVal });
            }
            this.cf.detectChanges();
          } else {
            responseData.forEach((data: any) => {
              // console.log(data);
              let datas: any = {};
              datas[this.labelProp] = data[this.labelProp];
              datas[this.valueProp] = data[this.valueProp];

              values.push(datas);
              // console.log(values, "PPPPPPPPPPPPPPPPPP");
            });
            // this.dropdown=values
            // this.optionsValue=values
            this.opt.options = values;
            if (values.length === 1) {
              let autoVal = this.opt?.['fullObject'] ? values[0] : values[0][this.valueProp];
              let finalVal = this.opt.multiple ? [autoVal] : autoVal;
              this.formControl.setValue(finalVal);
              this.bindToModel({ value: finalVal });
            }
            this.cf.detectChanges();
            this._dataManipulatorService.buildOptions(responseData, this.opt);
          }
        });
      this.cf.detectChanges();
    }
    //  ? Without Filter
    if (this?.opt?.optionsDataSource?.collectionName != undefined && _.isEmpty(this?.opt?.multifilter_condition)) {
      let name = this.opt.optionsDataSource.collectionName;
      let Observable = this.dataService.getDataByFilter(name, { start: 0, end: 1000 })
      if (this.opt['datasetName']) {
        Observable = this.dataService.dataset_Get_Data(this.opt['datasetName'], { start: 0, end: 1000 })
      }
      Observable.subscribe((res: any) => {
        this._dataManipulatorService.buildOptions(res.data[0].response, this.opt);
        this.currentField.formControl.setValue(this.formControl.value);
        if (this.model.isEdit) {
          this.valueSlected();
        }
      });
      this.cf.detectChanges();
    }
    //  ? get by Id
    if (this?.opt?.optionsDataSource?.collectionNameById != undefined) {
      let name = this.opt.optionsDataSource.collectionNameById;
      let id: any;
      if (this.opt.type == "local") {
        id = sessionStorage.getItem(this.opt.local_name);
      }
      this.dataService.getDataById(name, id).subscribe((res: any) => {
        this._dataManipulatorService.buildOptions(res, this.opt);
        if (this.model.isEdit) {
          this.valueSlected();
        }
        if (this.field.props.attribute) {
          //if the data in array of object
          let data = this.field.key
            .split(".")
            .reduce((o: any, i: any) => o[i], this.model);
          this.field.formControl.setValue(data);
        } else {
          this.field.formControl.setValue(this.model[this.field.key]);
        }
        this.cf.detectChanges();
      });
    }
    // ? Parent
    if (this.currentField.parentKey != undefined) {

      // (this.field.hooks as any).afterViewInit = (f: any) => {
      let parentControl: any = this.form.get(this.currentField.parentKey); //this.opt.parent_key);
      if (this.opt['isControlFromSuperParent']) parentControl = _.get(this.form, `parent._parent.controls.${this.currentField.parentKey}`)
      if (parentControl.value != null && parentControl.value != '') {
        this.parentkey(parentControl, parentControl.value)
      }
      parentControl?.valueChanges.subscribe((val: any) => {
        console.log(val);
        this.parentkey(parentControl, val)
      });
    }

    if (this.currentField?.['ChildValue']) {
      const parentControl: any = this.form.get(this.currentField?.['ChildValue'])
      let parentValue: any = parentControl?.value
      if (parentValue) {
        this.takevaluefromParent(parentValue)
      }
      parentControl.valueChanges.subscribe((val: any) => {
        if (val) {
          this.takevaluefromParent(parentValue)
        }
      })
    }



  }



  takevaluefromParent(value: any) {
    let formattedString = value;
    let matches = [...formattedString.matchAll(/\{\{([^}]+)\}\}/g)];
    let labelPropTemplates = matches.map(match => match[1].trim());
    console.log(labelPropTemplates);
    this.opt.options = labelPropTemplates
  }

  getNestedValue(tableValue: any, path: string): any {
    let data: any = path.split('.').reduce((acc, current) => acc?.[current], tableValue) || '';
    return data
  }

  parentkey(parentControl: any, val: any) {

    if (val == undefined) return;
    var apiobservable: any
    let filter_condition: any = { start: 0, end: 200 };
    // if (this?.opt?.Properties?.formVAlueChange && val !== undefined) {
    if (this.opt && this.opt['datasetName'] && this.opt['filterParams']) {
      this._dynamicQueryBuilderService.buildFilterParams(this, 'opt');
      if (_.hasIn(this, 'filterParams') && !_.isEmpty(_.get(this, 'filterParams'))) {
        filter_condition['filterParams'] = _.get(this, 'filterParams');
        console.log(filter_condition, ">>>>>>>>><<<<<<<<<<");

      }
      let filter: any = _.cloneDeep(this.opt.multifilter_condition);
      filter.conditions.map((res: any) => {
        res.value = val;
        if (this.opt.multifiltertype == "Simple") {
          if (res['noChangeNeed'] == true) {
            res.value = res['defautValue'];
            delete res['noChangeNeed']
          }
          else {
            res.value = val ?? parentControl.defaultValue;
          }
        }
        if (res['fetchtype'] == "model") {
          res['value'] = _.get(this.model, res['fetchkey'])
        }
        if (res['noChangeNeed'] == true) {
          res.value = res['defautValue'];
          delete res['noChangeNeed']
        }
        if (this.opt.multifiltertype == "Local") {
          res.value = sessionStorage.getItem(this.opt.local_name);
        }
      });
      filter_condition['filter'] = [filter]
      apiobservable = this.dataService.dataset_Get_Data(this.opt['datasetName'], filter_condition);
    }
    else {
      let filter: any = _.cloneDeep(this.opt.multifilter_condition);
      filter.conditions.map((res: any) => {
        res.value = val;

        if (this.opt.multifiltertype == "Simple") {
          if (res['noChangeNeed'] == true) {
            res.value = res['defautValue'];
            delete res['noChangeNeed']
          }
          else {
            res.value = val ?? parentControl.defaultValue;
          }
        }

        if (res['fetchtype'] == "model") {
          res['value'] = _.get(this.model, res['fetchkey'])
        }
        if (res['noChangeNeed'] == true) {
          res.value = res['defautValue'];
          delete res['noChangeNeed']
        }
        if (this.opt.multifiltertype == "Local") {
          res.value = sessionStorage.getItem(this.opt.local_name);
        }
      });
      filter_condition['filter'] = [filter]
      let collectionName: any = this?.field?.parentCollectionName ? this?.field?.parentCollectionName : this.opt?.optionsDataSource?.collectionName;
      apiobservable = this.dataService.getDataByFilter(collectionName, filter_condition)
    }

    apiobservable.subscribe((res: any) => {
      // this.dataService.buildOptions(res.data[0].response, this.opt);
      console.log(res, ">>>>>>>>>>>>>>>>>>>");

      if (isEmpty(res?.data[0]?.response) && val !== undefined) {
        let parentField: any = this.currentField.parentKey
          .toUpperCase()
          .replace("_", " ");
        let currentField: any = this.currentField.key
          .toUpperCase()
          .replace("_", " ");
        // ? To referesh the data
        this.opt.options = [];
        this.field.props.options = [];
        // this.dialogServices.openSnackBar(`No Data ${currentField} Available ${parentField}:- ${val}`,"OK")

        this.dialogServices.openSnackBar(
          `No Data ${currentField} Available ${parentField}`,
          "OK"
        );
        return;
      }

      if (this?.opt?.multifilterFieldName !== undefined) {
        //! To Take the value of array
        let specificField: any =
          res?.data[0]?.response[0]?.[this?.opt?.multifilterFieldName];
        if (specificField) {
          this.field.props.options = specificField.map((name: any) => {

            return { label: name, value: name };
          });

          if (this.model.isEdit) {
            this.valueSlected();
            this.cf.detectChanges();
          }
          this.cf.detectChanges();
        }
      } else if (this?.opt && this?.opt?.changefield) {
        // this.dataService.buildOptions(res.data[0].response, this.opt);
        this.field.props.options = res.data[0].response.map(
          (values: any) => {
            return {
              label: values[this.opt.changefield],
              value: values[this.opt.changefield],
            };
          }
        );
        this.opt.options = this.field.props.options;
        if (this.opt.options.length === 1) {
          let autoVal = this.opt?.['fullObject'] ? this.opt.options[0] : this.opt.options[0][this.valueProp];
          let finalVal = this.opt.multiple ? [autoVal] : autoVal;
          this.formControl.setValue(finalVal);
          this.bindToModel({ value: finalVal });
        }
      } else {
        // this.opt.options=[]
        // this.dataService.buildOptions(res.data[0].response, this.opt);
        let dataDrivenPath = this.opt?.["dataDrivenPath"] ?? "data[0].response"
        this.field.props.options = _.get(res, dataDrivenPath, []);
        // // res.data[0].response.map((values: any) => {
        // //     return { label: values[this.labelProp], value: values[this.valueProp] };
        // // });
        let options = _.get(res, dataDrivenPath, []);
        this._dataManipulatorService.buildOptions(options, this.opt);

        this.opt.options = options;
        if (options.length === 1) {
          let autoVal = this.opt?.['fullObject'] ? options[0] : options[0][this.valueProp];
          let finalVal = this.opt.multiple ? [autoVal] : autoVal;
          this.formControl.setValue(finalVal);
          this.bindToModel({ value: finalVal });
        }
        this.cf.detectChanges();

        if (this.model.isEdit) {
          this.valueSlected();
          this.currentField.formControl.setValue(
            this.formControl.value
          );
        }
      }
    });

  }

  selectionChange(selectedObject: any) {
    if (this.opt.onValueChangeUpdate) {
      this.field.form.controls[this.opt.onValueChangeUpdate.key].setValue(
        selectedObject[this.opt.onValueChangeUpdate.key]
      );
      selectedObject = {};
    }


    if (this.opt?.onclick == 'set_option') {

      console.log("set_option clicked", selectedObject);


      let options = selectedObject
      if (this.props?.['setkeyfilter']) {
        options = _.get(selectedObject, this.props?.['setkeyfilter']);
      }
      if (this.props?.['makeDefulatmap']) {
        const option = options.map((name: any) => {
          return { label: name, value: name };
        });
        options = option
      }

      if (this.props?.['setmodelkey']) {
        this.model[this.props?.['setmodelkey']] = selectedObject[this.props?.['setmodelkey']]
      }
    }
  }
  showNone() {
    if (this.to?.['appendFieldToModel']) {
      this.model['isExistingStudent'] = false
    }
  }
  subscribeOnValueChangeEvent() {
    // on ParentKey changes logic to be implemented
    if (this.field.parentKey != undefined) {
      console.log(this.field.parent_key);

      (this.field.hooks as any).afterViewInit = (f: any) => {
        const parentControl: any = this.form.get(this.field.parentKey); //this.opt.parent_key);
        parentControl?.valueChanges.subscribe((val: any) => {
          this.selectedObject = val;
          console.log(val);
          if (this?.opt?.Properties?.formVAlueChange) {
            this.opt.multifilter_condition.conditions.map((res: any) => {
              if (this.opt.multifiltertype == "Simple") {
                // if(res.value){
                res.value = val ?? parentControl.defaultValue;
                // }
              }
              if (this.opt.multifiltertype == "Local") {
                res.value = sessionStorage.getItem(this.opt.local_name);
              }
            });
            let filter_condition = { filter: [this.opt.multifilter_condition] };
            let collectionName: any = this?.field?.parentCollectionName
              ? this?.field?.parentCollectionName
              : this.opt?.optionsDataSource?.collectionName;
            this.dataService
              .getDataByFilter(collectionName, filter_condition)
              .subscribe((res: any) => {
                let specificField: any =
                  res?.data[0]?.response[0]?.[this?.opt?.multifilterFieldName];

                if (specificField) {
                  this.field.props.options = specificField.map((name: any) => {
                    return { label: name, value: name };
                  });
                  if (this.model.isEdit || _.hasIn(this.model, this.field.key)) {
                    this.valueSlected();
                  }
                } else {
                  // Handle the case when specificField is undefined
                  console.error("specificField is undefined");
                }
              });
          }
        });
      };
    }

    if (this.field.key === "modelName") {
      let model_name = sessionStorage.getItem("model_name");
      console.log(model_name);
      console.log(this.field);
      var filterCondition1 = {
        filter: [
          {
            clause: "AND",
            conditions: [
              { column: "model_name", operator: "NOTEQUAL", value: model_name },
            ],
          },
        ],
      };
      // model_config
      //! to chnage
      // this.dataService.getotherModuleName(model_name)
      this.dataService
        .getDataByFilter("model_config", filterCondition1)
        .subscribe((abc: any) => {
          console.log(abc);

          const unmatchedNames = abc.data[0].response;

          // Update the options array within the subscription
          this.field.props.options = unmatchedNames.map((name: any) => {
            return { label: name.model_name, value: name.model_name };
          });
          this.opt.options = this.field.props.options;
          console.log(this.opt.options);
        });
    }
  }
  // setSelectedField(selectedOptions: any[]) {
  //   if (!this.addonFeild) {
  //     this.addonFeild = [];
  //   } 
  //   const childValue = this.form.get("trade_input")?.value || [];

  // const mergedOptions = selectedOptions.map((selected: any) => {
  //   const existing = childValue.find((item: any) => item._id === selected._id);
  //   return {
  //     ...selected,
  //     value: existing?.value ?? '',  // preserve value if exists, else empty string
  //   };
  // });

  // this.addonFeild = mergedOptions;
  // this.form.get("trade_input")?.patchValue(mergedOptions);
  // }

  bindToModel(event: any): void {
    let eventValue: any[] = event.value;

    //     if(Array.isArray(this.opt?.options)&& this.opt?.addonFeild){
    //       const selected: any = this.opt.options.filter((res: any) =>
    //   eventValue.includes(_.get(res, this.valueProp))
    // );
    //       // const selected:any= this.opt.options.filter((res:any)=>_.get(res,this.valueProp) == event.value)
    //       console.log(selected);
    //      this.setSelectedField(selected);
    //       this.selectionChange(selected)
    //        this.addonFeild = this.addonFeild.filter((item: any) =>
    //       eventValue.includes(_.get(item, this.valueProp))
    //     ); 
    //       this.form.get('trade_input')?.setValue(this.addonFeild);
    //       return
    //     }
    if (Array.isArray(this.opt.options)) {
      const selected: any = this.findSelectedObject()
      this.selectionChange(selected)
    }

    // Handle setchieldData/setchildData - set child form control values from selected option data
    const childDataMapping = this.opt?.['setchieldData'] || this.opt?.['setchildData'];
    if (childDataMapping && Array.isArray(childDataMapping)) {
      const selectedOption = this.opt.options.find((option: any) =>
        _.get(option, this.valueProp) === event.value
      );

      if (selectedOption) {
        childDataMapping.forEach((mapping: any) => {
          const fromKey = mapping.from;
          const toKey = mapping.to;
          const valueToSet = _.get(selectedOption, fromKey);

          if (valueToSet !== undefined) {
            const targetControl = this.form.get(toKey);
            if (targetControl) {
              targetControl.setValue(valueToSet);
              // Also update the model
              _.set(this.model, toKey, valueToSet);
            }
          }
        });
      }
    }

    if (this.to?.['showSelectAll']) {
      const values: any = event.value || [];
      // let value:any
      if (!_.isEmpty(event.value) && values.includes('selectAll')) {
        this.selectAllOptions = true;
        // value = values.filter((v:any) => v !== 'selectAll');
        // this.thisFormControl.setValue(value);
        this.selectAll();
        return;
      }

      if (!_.isEmpty(event.value) && values.includes('unselectAll')) {
        this.selectAllOptions = false;
        // value = values.filter((v:any) => v !== 'unselectAll');
        // this.thisFormControl.setValue(value);
        this.unselectAll();
        return;
      }
    }

    this.syncAddFieldToModel();


    // Exit early if subObjectConfict is not set
    if (!this.opt['subObjectConfict']) return;
    // Ensure arrValue is always an array Because when we use multiple it return as []
    const arrValue = Array.isArray(event.value) ? event.value : [event.value];
    // If arrValue has elements, filter the options and process values
    if (arrValue.length) {
      const filteredValues = this.opt.options.filter((option: any) =>
        arrValue.includes(option[this.valueProp])
      );
      console.log(filteredValues);
      filteredValues.forEach((element: any) => {
        this._dataManipulatorService.processValues(element, this.model, this.opt['subObjectConfict']);
        console.log(this.model);
        this.form.patchValue(this.model)
      });
    }
  }


  getSelectedObject() {
    return this.opt.options.find((option: any) => option.id === this.thisFormControl.value);
  }

  makeFirstOneDefault() {
    if (this.model?.['isEdit'] || this.model?.['isClone']) {
      console.log("Edit Mode / Clone Mode");
      return;
    }
    // Return early if no options are available
    if (!this.opt.options || this.opt.options.length < 1) {
      return;
    }
    let selectedObj: any;
    if (this.opt['chooseDefault']) {
      selectedObj = this.opt.options.find((opt: any) => opt?.['isDefaultTeacher']);
    }
    if (!selectedObj) {
      selectedObj = this.opt.options[0];
    }
    let selectedValue = selectedObj[this.valueProp];
    if (this.opt?.['multiple']) {
      selectedValue = [selectedValue];
    }
    this.thisFormControl.setValue(selectedValue);
    this.bindToModel({ value: selectedValue });
  }


  /**
 * This method finds and returns the list of selected option objects based on the form control's value.
 * It allows appending a custom label key if specified via 'appendLabel' in `to`.
 * 
 * @returns {any[]} Array of selected option objects. Logs and returns nothing if no value is selected.
 */
  findSelectedObject() {
    // Check if formControl has value
    if (this.formControl.value == "" || this.formControl.value == null || this.formControl.value == undefined) {
      console.log("NO Value is available");
      return;
    }

    let label = this.labelProp;
    if (this.to?.['appendLabel']) {
      label = this.to.appendLabel;
    }

    // Make it an array
    let formValue = _.isArray(this.formControl.value) ? this.formControl.value : [this.formControl.value];

    const selectedOptions = (this.opt.options || []).reduce((acc: string[], res: any) => {
      const value = _.get(res, this.valueProp);
      if (formValue.includes(value)) {
        if (this.opt?.['sendFullObject']) {
          acc.push(res);
        } else {
          acc.push(_.get(res, label));
        }
      }

      return acc;
    }, []);

    if (_.isEmpty(selectedOptions)) {
      console.log("Selected Options is empty");
      return;
    }
    return this.opt?.['multiple'] ? selectedOptions : selectedOptions[0];
  }

  syncAddFieldToModel() {
    if (this.to?.['addFieldToModel']) {
      const labelKey = this.to['addFieldToModel'];
      const val = this.findSelectedObject();
      this.model[labelKey] = val;
      const ctrl = this.form.get(labelKey);
      if (ctrl) {
        ctrl.setValue(val, { emitEvent: false });
      }
    }
  }

  setupDynamicHideExpression() {
    const config = this.opt['dynamicHideExpression'];
    const rules = config?.rules || [];

    rules.forEach((rule: any) => {
      const evaluateAndApply = (value: any) => {
        let compareValue;

        // Get comparison value from storage if specified
        if (rule.getValue === 'local') {
          compareValue = localStorage.getItem(rule.field) || rule.value;
        } else if (rule.getValue === 'session') {
          compareValue = sessionStorage.getItem(rule.field) || rule.value;
        }

        let conditionMet = false;
        if (rule.operator === 'EQUALS') {
          conditionMet = value === compareValue;
        } else if (rule.operator === 'NOTEQUALS') {
          conditionMet = value !== compareValue;
        }

        if (conditionMet && rule.condition) {
          this.hide = true;
          if (rule.condition.setValue && rule.condition.field) {
            let valueToSet;

            if (rule.condition.getValue === 'local') {
              valueToSet = localStorage.getItem(rule.condition.field) || rule.value;
            } else if (rule.condition.getValue === 'session') {
              valueToSet = sessionStorage.getItem(rule.condition.field) || rule.value;
            }

            this.thisFormControl.setValue(valueToSet);
          }
        } else {
          this.hide = false;
        }
      };

      evaluateAndApply(rule.value);
    });
  }

}
/*
? Sample json
{
"type": "select-input",
"key": "org_id",
"className": "flex-6",
"props": {
"label": "Organizatiom",
"labelPropTemplate": "{{org_name}}",
"optionsDataSource": {
"collectionName": "organisation"
},
"labelProp": "org_name",
"valueProp": "_id",
"required": true
},"expressions": {
"hide": "(model.access !=='SA')"
}
}
?  with Filter
{
  "type": "select-input",
  "key": "from_warehouse_id",
  "props": {
    "label": "From Warehouse Name",
    "Collections": "facility",
    "labelProp": "name",
    "valueProp": "_id",
    "required": true,
    "multifilter_condition": {
      "clause": "AND",
      "conditions": [
        {
          "column": "hierarchyCode",
          "operator": "EQUALS",
          "type": "string",
          "value": "WH"
        }
      ]
    },
    "placeholder": "From Warehouse Name"
  },
  "expressions": {
    "hide": "!(model.stock_move_to && model.stock_move_to != '' && model.access_to == 'All') "
  }
}
?  with Filter & parent Key
{
  "type": "select-input",
  "key": "to_warehouse_id",
  "parentKey": "from_warehouse_id",
  "props": {
    "label": "To Warehouse Name",
    "multifiltertype": "Simple",
    "labelProp": "name",
    "valueProp": "_id",
    "required": true,
    "optionsDataSource": {
      "collectionName": "facility"
    },
    "multifilter_condition": {
      "clause": "AND",
      "conditions": [
        {
          "column": "hierarchyCode",
          "operator": "EQUALS",
          "defautValue": "WH",
          "noChangeNeed": true,
          "type": "string",
          "value": "WH"
        },
        {
          "column": "_id",
          "operator": "NOTEQUAL",
          "type": "string",
          "value": ""
        }
      ]
    }
  },
  "expressions": {
    "hide": "!(model.stock_move_to && model.stock_move_to == 'W_T_W')"
  }
}*/