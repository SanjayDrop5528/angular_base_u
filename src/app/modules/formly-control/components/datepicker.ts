import { DatePipe } from '@angular/common';
import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormControl } from '@angular/forms';

import { FieldType } from '@ngx-formly/core';
import  moment from 'moment'; 
import _ from 'lodash';
import { DialogService } from '../../../core/services/dialog.service';

@Component({
  selector: 'date-input', standalone: false,
  template: `
  <mat-form-field class="example-full-width" appearance="outline" subscriptSizing="dynamic" style="width: 100%; margin-bottom: 0.9rem;">
    <mat-label>{{field.props!['label']}}</mat-label>
    <input [placeholder]="'DD/MM/YYYY'" matInput (dateChange)="currentPeriodClicked($event)" [disabled]="isDisabled" [formControl]="formControl" [formlyAttributes]="field" [min]="minFromDate" [max]="maxFromDate" [matDatepicker]="frompicker" [required]="this.opt.required" [readonly]="field.props?.disable_input" [style.cursor]="field.props?.disable_input ? 'pointer' : 'auto'" (click)="field.props?.disable_input ? frompicker.open() : null" />
    <mat-datepicker-toggle matSuffix [for]="frompicker" [disabled]="field.props?.readonly || isDisabled"></mat-datepicker-toggle>
    <mat-datepicker #frompicker  [disabled]="false || isDisabled" ></mat-datepicker>
    
    @if (this?.formControl?.errors?.dob) {
      <mat-error>{{ this.field.props?.label }} is more than 18 years </mat-error>
    }
    @if (
   this.formControl.touched && this?.formControl?.errors?.required && !
   (this?.formControl?.errors?.['pattern'] || this?.formControl?.errors?.['minlength'] 
   || this?.formControl?.errors?.['maxlength'] || this?.formControl?.errors?.['matDatepickerMax'] 
   || this?.formControl?.errors?.['matDatepickerMin']  || this?.formControl?.errors?.['matDatepickerParse'])
   ) {
        <mat-error>{{ this.field.props?.label }} is required</mat-error>
      } 
    @if (
                this?.formControl?.errors?.['pattern'] 
              || this?.formControl?.errors?.['minlength'] 
              || this?.formControl?.errors?.['maxlength']
              || this?.formControl?.errors?.['matDatepickerParse']
       ) {
        <mat-error> Invalid Format  {{ this.field.props?.label }}</mat-error>
      }  
      <mat-error *ngIf="formControl?.errors?.['matDatepickerMax']">
  Maximum allowed date is {{ formControl.errors?.['matDatepickerMax'].max | date: 'mediumDate' }}
</mat-error>

<mat-error *ngIf="formControl?.errors?.['matDatepickerMin']">
  Minimum allowed date is {{ formControl.errors?.['matDatepickerMin'].min | date: 'mediumDate' }}
</mat-error>

  </mat-form-field>
  `,
  styles: [`
    /* Style for disabled dates in the calendar */
    ::ng-deep .mat-calendar-body-disabled {
      background-color: #f5f5f5 !important;
      color: #bdbdbd !important;
      cursor: not-allowed !important;
      opacity: 0.5 !important;
    }

    ::ng-deep .mat-calendar-body-cell:not(.mat-calendar-body-disabled):hover .mat-calendar-body-cell-content:not(.mat-calendar-body-selected):not(.mat-calendar-body-comparison-identical) {
      background-color: rgba(0, 0, 0, 0.04);
    }

    /* Additional styling for disabled dates */
    ::ng-deep .mat-datepicker-content .mat-calendar-body-disabled > .mat-calendar-body-cell-content {
      background-color: #e0e0e0 !important;
      color: #9e9e9e !important;
    }

    /* Style for dark theme */
    [data-theme="dark"] ::ng-deep .mat-calendar-body-disabled {
      background-color: rgba(255, 255, 255, 0.05) !important;
      color: rgba(255, 255, 255, 0.3) !important;
    }

    [data-theme="dark"] ::ng-deep .mat-datepicker-content .mat-calendar-body-disabled > .mat-calendar-body-cell-content {
      background-color: rgba(255, 255, 255, 0.08) !important;
      color: rgba(255, 255, 255, 0.3) !important;
    }
  `],
  host: { style: 'display: block; width: 100%;' }
})

export class DateInput extends FieldType<any> implements OnInit {

  opt: any
  minFromDate!: any;
  maxFromDate!: any | null;
  minToDate!: Date | null;
  maxToDate!: Date;
  required: any
  currentField: any
  disabled: boolean = true
  secondDate: any
  firstDate: any
  isDisabled = false; 

  public get FormControl() {
    return this.formControl as FormControl;
  }
  constructor(private dialogSerivce: DialogService) {
    super(); 
  }
  ngOnInit(): void {

    this.currentField = this.field
    this.required = this.field.props?.required
    this.opt = this.field.props
    
   if (this.model?.['isClone'] && _.hasIn(this.model, this.field.key)) {
  this.FormControl.markAllAsTouched();
}
    
    if (this?.opt?.attributes?.hide == "past_date") {

      this.minFromDate = moment().add(this?.opt?.attributes?.add_days || 0, 'day').toDate()
      if (this.opt?.attributes?.existingDateKey) {
        const existingMinDate = _.get(this.model, this.opt.attributes.existingDateKey);
        const localExistingMinDate = moment(existingMinDate).local();
      
        if (localExistingMinDate.isSameOrAfter(this.minFromDate)) {
          this.minFromDate = localExistingMinDate.toDate();
        }
      }
      
    }

    if (this?.model?.isEdit == true && this?.opt?.dynamic == true) {
      this.minFromDate = this.formControl.value
    }

    if (this?.opt?.attributes?.hide == "future_date") {
      this.maxFromDate = moment().add(this?.opt?.attributes?.add_days || 0, 'day').toDate()
        if (this.opt?.attributes?.existingDateKey) {
        const existingMinDate = _.get(this.model, this.opt.attributes.existingDateKey);
        const localExistingMinDate = moment(existingMinDate).local();
      
        if (localExistingMinDate.isSameOrAfter(this.maxFromDate)) {
          this.maxFromDate = localExistingMinDate.toDate();
        }
      }
    }

    
    if (this?.opt?.attributes?.hide == "both") {
  
         if (this?.opt?.attributes?.future_date) {
      this.maxFromDate = moment().add(this?.opt?.attributes?.future_date?.add_days || 0, 'day').toDate()
        if (this.opt?.attributes?.future_date?.existingDateKey) {
        const existingMinDate = _.get(this.model, this.opt.attributes?.future_date.existingDateKey);
        const localExistingMinDate = moment(existingMinDate).local();
      
        if (localExistingMinDate.isSameOrAfter(this.maxFromDate)) {
          this.maxFromDate = localExistingMinDate.toDate();
        }
      }
    }

       if (this?.opt?.attributes?.past_date) {
      this.minFromDate = moment().add(this?.opt?.attributes?.past_date?.add_days || 0, 'day').toDate()
      if (this.opt?.attributes?.past_date?.existingDateKey) {
        const existingMinDate = _.get(this.model, this.opt.attributes?.past_date.existingDateKey);
        const localExistingMinDate = moment(existingMinDate).local();
      
        if (localExistingMinDate.isSameOrAfter(this.minFromDate)) {
          this.minFromDate = localExistingMinDate.toDate();
        }
      }
      
    }
    console.table(this);
    

    }

    if ( this?.opt?.attributes?.hide == "dob" ) { 
      let differenceInYears = moment().subtract( Number(this?.opt?.attributes?.maxlimt ?? 18), 'years');
      this.maxFromDate = differenceInYears.toDate()
      if (this?.opt?.attributes?.minyear || this?.opt?.attributes?.minyears) {
        const yearsVal = Number(this?.opt?.attributes?.minyear || this?.opt?.attributes?.minyears);
        let minDifference = moment().subtract(yearsVal, 'years');
        this.minFromDate = minDifference.toDate();
      }
    }

    if ( this?.opt?.attributes?.today && this?.model?.isEdit != true ) {
      let date = moment()
      this.FormControl.setValue(date)

    } 
    if (this?.model?.isEdit == true && this?.opt?.overrideFromDate?.dynamic == true) {
      const todate: any = this.form.get(this.opt.overrideFromDate.ToDAtekey)
      this.minFromDate = this.formControl.value
      this.maxFromDate = moment(todate?.value);
      const attr = this?.opt?.attributes;
      todate?.valueChanges.subscribe((val: any) => {
        this.maxFromDate = val
        //   if (attr?.hide === 'past_date') {
        //     this.minFromDate = moment().add(attr?.add_days || 0, 'days');
        //   } 
          // this.maxFromDate = moment(val);
          // const day = moment().add(attr?.add_days || 0, 'days');
          
          // if (attr?.hide === 'past_date' && this.maxFromDate.isAfter(day)) {
          //   this.maxFromDate = day;
          // }
     })
    }


    if (_.hasIn(this.currentField, 'parentKey') && this.currentField.parentKey != "") {
      (this.field.hooks as any).afterViewInit = (f: any) => {
        let field = this.currentField.parentKey
      const attr = this?.opt?.attributes;
      const parentControl = this.form.get(field)
        parentControl?.valueChanges.subscribe((val: any) => {
          this.minFromDate = val
// const day = moment().add(attr?.add_days || 0, 'days');

// if (attr?.hide === 'past_date' && this.minFromDate.isAfter(day)) {
//   this.minFromDate = day;
// }

        })

      }
    }
  }
  // currentPeriodClicked(data:any){}

  currentPeriodClicked(data: any) {
    console.log(data?.value);

    // Don't convert to UTC - use local date
    const dateValue = moment(data?.value).format("YYYY-MM-DD");
    const localDateTime = moment(dateValue).format("YYYY-MM-DDTHH:mm:ss");

    console.log(localDateTime);
    this.FormControl.setValue(data.value)

    console.log(this.field.dynamicvaltidateDate);
    console.log(this.field.validiotionType);

    if (this.field.dynamicvaltidateDate == true) {
      console.log(this.field.validiotionType == "dob");

      if (this.field.validiotionType == "dob") {
        let presentDate = moment();
        let differenceInYears = moment(presentDate).diff(data.value, 'years');

        console.log(differenceInYears);

        if (differenceInYears < 18) {
          this.dialogSerivce.openSnackBar(`The Date You Chose (${this.opt.label}) should be 18 years or more.`, "OK");
          this.formControl.setErrors({ dob: true })
        }

      }
    }

    if (this.field.valtidateDate == true) {
      if (this.field.childKey) {
        if (typeof this.model[this.field.childKey] === 'string') {
          // Parse the string date to a Moment.js object
          this.secondDate = moment(this.model[this.field.childKey]);
        } if (this.model[this.field.childkey2] === true) {
          // Parse the string date to a Moment.js object
          this.secondDate = moment()
        }
        else {
          this.secondDate = this.model[this.field.childKey];
        }
        this.firstDate = data.value
        this.formControl.setValue(data.value)

      } else if (this.field.parentKey) {
        if (typeof this.model[this.field.parentKey] === 'string') {
          // Parse the string date to a Moment.js object
          this.firstDate = moment(this.model[this.field.parentKey]);
        } else {
          this.firstDate = this.model[this.field.parentKey];
        }
        this.secondDate = data.value
        this.formControl.setValue(data.value)
      }

      let yearsDiff = this.secondDate.year() - this.firstDate.year();
      let monthsDiff = this.secondDate.month() - this.firstDate.month();

      if (monthsDiff < 0) {
        yearsDiff--;
        monthsDiff += 12;
      }

      let a = `${yearsDiff}.${monthsDiff}`;
      const cleanStr = a.replace(/[^0-9.-]/g, ''); // Remove non-numeric characters
      const number = parseFloat(cleanStr); // Parse the string as a float

      let formattedNumber;
      if (Number.isInteger(number)) {
        // If the number has no decimal part, add two decimal places
        formattedNumber = number.toFixed(2);
      } else {
        // Otherwise, remove trailing zeros after the decimal point
        formattedNumber = number
      }

      this.field.formControl.parent.controls[this.field.props.onValueChangeUpdate.key].setValue(formattedNumber);
    }
  }
}
/* JSON 
"attributes":{
? "hide":"future_date", 
? "hide":"past_date", 
? "hide":"dob", 
? today :true , used for patch Today Date
},
{
    "type": "date-input",
    "key": "registration_date",
    "props": {
      "label": "Registration Date",
      "attributes": {
        "hide": "future_date"
      },
      "required": true,
      "placeholder": "Registration Date"
    }
  },                        

            
                    */