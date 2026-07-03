import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { FieldType } from '@ngx-formly/core';
import moment from 'moment';

@Component({
  selector: 'dob-input', standalone: false,
  template: `
  <mat-form-field class="example-full-width" appearance="outline" style="width: 100%;">
    <mat-label>{{field.props!['label']}}</mat-label>
    <input [placeholder]="'DD/MM/YYYY'" matInput (dateChange)="currentPeriodClicked($event)" [formControl]="formControl" [formlyAttributes]="field" [min]="minFromDate" [max]="maxFromDate" [matDatepicker]="frompicker" [required]="this.opt.required" />
    <mat-datepicker-toggle matSuffix [for]="frompicker" [disabled]="field.props?.readonly"></mat-datepicker-toggle>
    <mat-datepicker #frompicker></mat-datepicker>

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
    ::ng-deep .mat-calendar-body-disabled {
      background-color: #f5f5f5 !important;
      color: #bdbdbd !important;
      cursor: not-allowed !important;
      opacity: 0.5 !important;
    }
    ::ng-deep .mat-calendar-body-cell:not(.mat-calendar-body-disabled):hover .mat-calendar-body-cell-content:not(.mat-calendar-body-selected):not(.mat-calendar-body-comparison-identical) {
      background-color: rgba(0, 0, 0, 0.04);
    }
    ::ng-deep .mat-datepicker-content .mat-calendar-body-disabled > .mat-calendar-body-cell-content {
      background-color: #e0e0e0 !important;
      color: #9e9e9e !important;
    }
    [data-theme="dark"] ::ng-deep .mat-calendar-body-disabled {
      background-color: rgba(255, 255, 255, 0.05) !important;
      color: rgba(255, 255, 255, 0.3) !important;
    }
    [data-theme="dark"] ::ng-deep .mat-datepicker-content .mat-calendar-body-disabled > .mat-calendar-body-cell-content {
      background-color: rgba(255, 255, 255, 0.08) !important;
      color: rgba(255, 255, 255, 0.3) !important;
    }
  `]
})
export class DobInput extends FieldType<any> implements OnInit {
  opt: any;
  minFromDate!: any;
  maxFromDate!: any;
  
  public get FormControl() {
    return this.formControl as FormControl;
  }

  ngOnInit(): void {
    this.opt = this.field.props || {};
    this.maxFromDate = moment().toDate();
    this.minFromDate = moment().subtract(100, 'years').toDate();
  }

  currentPeriodClicked(data: any) {
    if (data?.value) {
      this.FormControl.setValue(data.value);
    }
  }
}
