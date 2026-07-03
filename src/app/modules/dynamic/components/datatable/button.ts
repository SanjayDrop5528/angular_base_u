
import { ChangeDetectorRef, Component, inject, TemplateRef, ViewChild } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import _ from 'lodash';
import { TitleStrategy } from '@angular/router';
import { DialogService } from '../../../../core/services/dialog.service';
import { UtilsService } from '../../../../core/services/utils/utils.service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { HelperService } from '../../../../core/services/utils/helper.service';
import { DataManipulatorService } from '../../../../core/services/utils/data-manipulator-service.service';
import { ReasonDialogComponent } from '../../../shared/components/dialogComponents/reason-dialog';
@Component({
  standalone: false,
  selector: 'app-button-renderer',
  template: `
<style>
    ::ng-deep.mat-mdc-dialog-container .mdc-dialog__surface {
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden !important;
}</style>
@if (this.params?.label!='route' && this.params?.label != 'review' && this.params?.label != 'status'&& this.params?.label != 'editIcon') {
  <!-- <div *appVisible="{config:actions,value:params.data,type:'arr'}"  >
    *appVisible="{config:actions,value:rowData,type:'arr'}" 
     -->
  <div *ngIf="hasVisibleActions()"> 
    <mat-icon  style="margin-top:9px;cursor:pointer" [matMenuTriggerFor]="menu" (click)="click()" >more_vert</mat-icon>
  </div>
}

@if (this.params?.label=='route') {
  <div>
    <mat-icon (click)="onClickMenuItem(this.params)" style="margin-top:11px;font-size: large;cursor:pointer">{{this.params.icon}}</mat-icon>
  </div>
}

@if (this.params?.label=='status' && _permissionService.isvisibility(actions[0],rowData)) {
  <div style="display: flex; align-items: center; justify-content: center; height: 100%;" (click)="actions[0]?.preventClick && $event.stopPropagation()">
  <app-toggle-switch [checked]="checked"
  [matTooltip]="statusTooltip" (valueChanged)="sliderChange($event,actions[0])"></app-toggle-switch> 
            </div>
}
<mat-menu [overlapTrigger]="false" #menu="matMenu" >
  @for (item of actions; track $index) {
    @if (_permissionService.isvisibility(item,rowData) && !item?.label_hide && !isHidden(item)) {
      <span>
        <button mat-menu-item  (click)="onClickMenuItem(item)">
          @if(item?.isSvgIcon){
            <mat-icon [svgIcon]="item.icon" [ngClass]="item.class ? item.icon : '' "  ></mat-icon>
          } @else if(item?.isFavIcon){ 
            <i [class]="item['icon']" style="margin-right:var(--mat-menu-item-spacing) flex-shrink: 0;
                  height: var(--mat-menu-item-icon-size);
                  width: var(--mat-menu-item-icon-size);">
                </i>
           }@else if (item?.icon) {
            <mat-icon>{{item?.icon ?? ' '}}</mat-icon>
          }
        {{ (item?.label || item?.name) | translate }}

        </button> 
      </span>
    }
  }

</mat-menu>
`,
  styles: [
    `
  .orange-btn {
    background-color: orange !important;
    color: white !important;
  }
`
  ]
})

export class ActionButtonComponent implements ICellRendererAngularComp {
  params: any
  rowData: any
  actions: any
  // ? Status Change (or) Soft Delete
  checked: any;
  statusTooltip: any;

  dialogService = inject(DialogService)

  utilsService = inject(UtilsService)
  _permissionService = inject(PermissionService)
  _dataManipulationService = inject(DataManipulatorService)

  constructor(public helperService: HelperService,
    private cdr: ChangeDetectorRef
  ) { }

  click() {
    this.rowData = this.params?.context?.componentParent?.gridApi?.getRowNode(this.rowData["_id"])?.data ?? this.params.data;
  }


  agInit(params: any): void {

    this.params = params;
    this.rowData = params.data;
    let actions: any = _.hasIn(this.params, 'actionKey') ? _.get(this.params, this.params?.['actionKey']) : _.get(this.params, 'context.componentParent.config.actions') ?? []
    if (_.has(this.params, 'context.componentParent.config.defaultActions')) {
      actions = [..._.get(this.params, 'context.componentParent.config.defaultActions')]
    }

    if (_.get(this.params, 'context.componentParent.config.buildActionhierarchystructure')) {
      const structuredKey = _.get(this.params, 'context.componentParent.Addkey')
      let value = structuredKey?.[this.params.data['hierarchyCode']] || []
      actions = [...value, ...actions]
    }

    if (this.params?.label == 'status') {
      const { match, message } = this.getStatus(actions[0], this.rowData)
      this.checked = match
      this.statusTooltip = message
    }

    this.actions = actions
    // actionKey:"actions",
    //  this.actions = this.params.context.componentParent.actions
  }

  onClickMenuItem(item: any) {

    if (item['dynamicActions'] == true) {
      item.formAction = 'add'
      // this.formName=item,
    }

    if (typeof this.params.context.componentParent[item.method] === 'function') {
      this.params.context.componentParent[item.method].apply(
        this.params.context.componentParent,
        [item, this.params.data || this.params.node?.data]
      )
    }
    if (_.get(this.params, 'context.componentParent.config.buildActionhierarchystructure') && item['default']) {
      const structuredKey = _.get(this.params, 'context.componentParent.editkey')
      item['formName'] = structuredKey[this.params.data['hierarchyCode']]['formName']
    }
    if (item['formNameCheck']) {
      item['formName'] = _.hasIn(this.params.data, 'ref_id') ? 'subcategory' : 'category'
    }
    this.params.context.componentParent.onActionButtonClick(item, this.params.data)
  }

  refresh(param: any): boolean {
    this.params = param;
    this.rowData = param.data;
    if (this.params?.label == 'status' && this.actions?.length) {
      const { match, message } = this.getStatus(this.actions[0], this.rowData)
      this.checked = match
      this.statusTooltip = message
    }
    this.cdr.detectChanges();
    return true
  }
  async sliderChange(event: any, slider_details: any) {
    const { showDeactivateType = false, type = false, skip_confirmation = false, bypass_confirmation = false } = slider_details
    const { currentValue, previousValue } = event
    this.checked = currentValue
    if (bypass_confirmation) {
      let config = this.actions[0]
      const key = this.checked ? 'activate' : 'deactivate';
      let updateObj: any = {}
      const updateValue = _.get(config, `setValue.${key}`)
      updateObj[config.sourceField] = updateValue
      _.set(config, "updateObj", updateObj)
      _.set(this.rowData, config.sourceField, updateValue)
      _.set(this.params.data, config.sourceField, updateValue)

      if (config['config']) this._dataManipulationService.processValues(this.params.data, updateObj, config['config'])
      this.params.context.componentParent.onActionButtonClick(config, this.params.data)
      return
    }
    if (skip_confirmation) {
      const confirmDialog = this.dialogService.openConfirmation(this.statusTooltip);
      confirmDialog.afterClosed().subscribe((result: boolean) => {
        if (result) {
          let config = this.actions[0]
          const key = this.checked ? 'activate' : 'deactivate';
          let updateObj: any = {}
          const updateValue = _.get(config, `setValue.${key}`)
          updateObj[config.sourceField] = updateValue
          _.set(config, "updateObj", updateObj)
          _.set(this.rowData, config.sourceField, updateValue)
          _.set(this.params.data, config.sourceField, updateValue)

          if (config['config']) this._dataManipulationService.processValues(this.params.data, updateObj, config['config'])
          this.params.context.componentParent.onActionButtonClick(config, this.params.data)
          if (config.changePartner || config.changeParent) {
            this.params.api.refreshCells({ rowNodes: [this.params.node] });
          }
        } else {
          this.checked = previousValue
        }
      });
      return
    }

    const dialogRef: any = this.dialogService.openDialog(ReasonDialogComponent, '400px', null, { title: this.statusTooltip, showDeactivateType, type, active: this.checked, rowData: this.params.data });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.confirm) {
        console.log('Reason provided:', result);

        let config = this.actions[0]
        const key = this.checked ? 'activate' : 'deactivate';
        const tooltipMessage = _.get(config, `tooltip.${key}`);
        const message = this.utilsService.templateProcessor(this.rowData, tooltipMessage);
        let updateObj: any = {}
        const updateValue = _.get(config, `setValue.${key}`)
        updateObj[config.sourceField] = updateValue
        _.set(config, "updateObj", updateObj)
        _.set(this.rowData, config.sourceField, updateValue)
        _.set(result, config.sourceField, updateValue)

        _.set(this.params.data, config.sourceField, updateValue)
        this.rowData['reason'] = result.reason
        this.params.data['reason'] = result.reason

        if (result?.deactivateType) {
          this.rowData['deactivateType'] = result.deactivateType
          this.params.data['deactivateType'] = result.deactivateType
        }
        if (result?.new_employee_id) {
          this.rowData['new_employee_id'] = result.new_employee_id
          this.params.data['new_employee_id'] = result.new_employee_id
        }
        _.set(config, "updateObj", result)

        this.statusTooltip = message
        if (config['config']) this._dataManipulationService.processValues(this.params.data, updateObj, config['config'])

        this.params.context.componentParent.onActionButtonClick(config, this.params.data)
        if (config.changePartner || config.changeParent) {
          this.params.api.refreshCells({ rowNodes: [this.params.node] });
        }

      } else {
        // User cancelled — revert the toggle back to its original state
        this.checked = previousValue;
        this.cdr.detectChanges();
        console.log('Dialog closed without reason');
      }
    });

  }
  hasVisibleActions(): boolean {
    return this.actions?.some((item: any) =>
      this._permissionService.isvisibility(item, this.rowData) && !this.isHidden(item)
    );
  }

  /**
   * Evaluates the `hideexpression` config on an action item against the current row data.
   * Supported types:
   *   - "equals"    : hide when rowData[keyfield] === value
   *   - "notEquals" : hide when rowData[keyfield] !== value
   *   - "contains"  : hide when rowData[keyfield] contains value (string)
   * If no hideexpression is defined, the action is always visible (returns false).
   */
  isHidden(item: any): boolean {
    const expr = item?.hideexpression;
    if (!expr || !expr.keyfield) return false;

    const fieldValue = this.rowData?.[expr.keyfield];
    const configValues = Array.isArray(expr.value)
      ? expr.value
      : [expr.value];

    switch ((expr.type ?? 'IN').toUpperCase()) {
      case 'IN':
        return configValues.includes(fieldValue);

      case 'NOT_IN':
        return !configValues.includes(fieldValue);

      default:
        return false;
    }
  }

  getStatus(config: any, data: Record<string, any>): { match: boolean; message: string } {
    const fieldValue = data[config.sourceField];
    const match = fieldValue === config.expectedValue;
    const key = match ? 'activate' : 'deactivate';
    const tooltipMessage = _.get(config, `tooltip.${key}`);
    const message = this.utilsService.templateProcessor(data, tooltipMessage);
    return { match, message };
  }


  // ? Json Definition
  /*
    ? For Status 
      "cellRendererParams": {
          ?  Type of Action		
          "label": "status",
          ?  Type of Action Derived From		
          "actionKey": "context.componentParent.config.statusActions"  
      }
     [ {
      ? Data Derived From
      "sourceField": "data.status",
      ? For Each Status one Tooltip
      "ActivateTooltip": "",
      "DeactivateTooltip": "",
      ? If the Expected Value Matched it return true
      "expectedValue": "Active",      
  }]
    ? Default Actions 
      {
        "label": "Delete",
        "formAction": "delete",
        "icon": "delete"
      }
  */
}
