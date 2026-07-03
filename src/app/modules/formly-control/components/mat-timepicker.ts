import { DatePipe } from '@angular/common';
import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { FieldType } from '@ngx-formly/core'; 
import _ from 'lodash';

@Component({
  selector: 'mat-time-input',standalone:false,
  template: `
  <mat-form-field >
    <mat-label>{{field.props!['label']}}</mat-label>
    <input  [matTimepickerMin]="min"
      [matTimepickerMax]="max" [placeholder]="field.props!['placeholder']"
      [formControl]="FormControl"   [formlyAttributes]="field" 
      matInput [matTimepicker]="picker" [required]="this.field.props.required" [disabled]="this.field.props.disabled" />
    
      @if (this.FormControl.touched && this?.formControl?.errors?.required) {
        <mat-error>{{ this.field.props?.label }} is required</mat-error>
      } 
      @if (this?.FormControl?.errors?.['matTimepickerParse'] || this?.FormControl?.errors?.['matTimepickerMin'] || this?.FormControl?.errors?.['matTimepickerMax']) {
        <mat-error> Invalid Format  {{ this.field.props?.label }}</mat-error>
      } 
      @if (this.FormControl.touched && this.FormControl.hasError("uniqueItems")) {
        <mat-error>{{ this.field.props?.label }} is Already Existed </mat-error>
      } 
  <mat-timepicker-toggle matIconSuffix [for]="picker"/>
  <mat-timepicker #picker/> 
   </mat-form-field>  
  `,
})
export class MatTimeInput extends FieldType<any> implements  OnInit {

//   @ViewChild('picker') picker: any;
 

  public get FormControl() {
    return this.formControl as FormControl;
  }
  constructor(private datePipe: DatePipe) {
    super();
  }
  // '08:00 am'
  min:any=null
  // '09:00 pm'
  max:any=null
  currentField: any

  ngOnInit(): void {
    // console.error(this.to);
    this.currentField = this.field
  //  if( this.to?.timeFormat && (this.to?.timeFormat == 12 || this.to?.timeFormat == 24  )){
  //     this.Timeformat = this.to.timeFormat
  //     console.warn(this.Timeformat);
  //  }
   if( this.to?.attributes){
    this.min = this.to.attributes.min || null
    this.max = this.to.attributes.max || null
 }


    if (_.hasIn(this.currentField, 'parentKey') && this.currentField.parentKey != "") {
      (this.field.hooks as any).afterViewInit = (f: any) => {
        let field = this.currentField.parentKey
        const parentControl = this.form.get(field)
        parentControl?.valueChanges.subscribe((val: any) => {
          this.min = val
        })

      }
    }
  }
}