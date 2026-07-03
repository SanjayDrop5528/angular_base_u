import { Component, inject, OnInit } from '@angular/core';
import { FieldType, FormlyFieldConfig } from '@ngx-formly/core';
import { DatePipe } from '@angular/common';
import   moment from 'moment';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'formly-field-label_view',
  standalone: false,
  template: `
    @if (!value_in_next_row) {
      @if (displayType == 'inputfield') {
        <mat-form-field class="example-full-width">
          <mat-label>{{ field.templateOptions?.label }}</mat-label>
          <input 
            matInput 
            [formControl]="formControl"  
            [placeholder]="field.props?.placeholder"
            [required]="to.required"
            [disabled]="isDisabled"
          >  
          <mat-hint *ngIf="formControl.hasError('required')" style="color: red;">
            {{ getErrormessage('required') }}
          </mat-hint>
          <mat-hint *ngIf="formControl.hasError('pattern')" style="color: red;">
            {{ getErrormessage('pattern') }}
          </mat-hint>
        </mat-form-field>
      } @else {
        <div style="margin: 10px; display: flex; flex-direction: row">
          <div style="font-weight: bold; width: {{label_width}}">{{this.field.templateOptions?.label}}</div>
          <b style="margin-right: 5px; font-weight: bold;">:</b>
          @if (displayType == 'text') {
            <div style="width: {{value_width}}; word-wrap: break-word;">{{getValue()}}</div>
          }
          @if (displayType != 'text') {
            <div style="width: {{value_width}}; word-wrap: break-word;" [innerHtml]="getValue()"></div>
          }
        </div>
      }
    }

    @if (value_in_next_row) {
      <div style="margin: 10px;">
        <div class="html-heading" style="font-weight: bold; width: {{label_width}}">{{this.field.templateOptions?.label}}</div>
        @if (displayType == 'text') {
          <div style="width: {{value_width}}; padding: 5px;">{{getValue()}}</div>
        }
        @if (displayType != 'text') {
          <div style="width: {{value_width}}; padding: 5px;" [innerHtml]="getValue()"></div>
        }
      </div>
    }
  `
})
export class LabelView extends FieldType<any> implements OnInit {
  displayType = 'text';
  opt: any;
  label_width: any;
  value_in_next_row!: boolean;
  value_width: any;
  isDisabled = false;
  role: any;
  fieldValue: any;
    // private datePipe=inject(DatePipe)

  constructor(
  ) {
    super();
    let user: any = sessionStorage.getItem('auth');
    let parsedValue: any = JSON.parse(user);
    this.role = parsedValue.data.LoginResponse.role[0].role;
  }

  ngOnInit(): void {
    this.opt = this.field.props || {};
    this.label_width = this.opt.label_width || "150px";
    this.displayType = this.opt.inputType || 'text';
    this.value_in_next_row = this.opt.value_in_next_row || false;
    this.value_width = this.opt.value_width;

    if (this.opt['ACL']) {
      const acl = this.opt['ACL'].find((entry: any) => entry.role === this.role && entry.readonly === true);
      this.isDisabled = !!acl;
      if (this.isDisabled) {
        this.formControl.disable({ emitEvent: false, onlySelf: true });
      }
    }

    console.log("Before Patching - Field Value:", this.formControl.value);
    setTimeout(() => {
      this.fieldValue = this.formControl.value;
      if (this.fieldValue !== undefined && this.fieldValue !== null) {
        this.model.patchValue(this.fieldValue);
      }
    }, 0);
  }

  getValue() {
    if (this.field.props?.inputType == "date") {
      moment(this.field.model[this.field.key]).format("dd-MM-YYYY")
      return moment(this.field.model[this.field.key]).format(this.to.format || "dd-MM-YYYY")
    } else {
      return this.formControl.value;
    }
  }

  getErrormessage(messageType: string): string {
    if (messageType === 'required') {
      return (this.field.props?.label || '') + ' is required';
    } else if (messageType === 'pattern') {
      return 'Invalid Format' + ' ' + (this.field.props?.label || '');
    }
    return '';
  }
}


/* Json Fromat

{
  "type": "label-view", //initialze 
  "key": "publish_date",
  "templateOptions": {            
    "attributes": { "pipe": "date" }, to set date
    "label": "Publish Date", 
"label_width":100,        label Width 
"value_width":200,        VAlue width 
"value_in_next_row":false, if we need it in next line or not 
    "placeholder": "publish_date",
    "required": true
  }
}
] 
*/