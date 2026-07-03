import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { FieldType } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-logo',standalone:false,
  template: `
    <section class="example-section">
      <mat-checkbox
      [(ngModel)]="checkboxValue"

        class="example-margin"
        (click)="patchData()"
      >
        {{ label }}
      </mat-checkbox>
    </section>
  `,
})
export class patchWork extends FieldType implements OnInit {
  opt: any;
  label: any;
  checkboxValue = false;

  constructor() {
    super();
  }

  ngOnInit(): void {
    this.opt = this.field.props || {};
    this.label = this.opt.label;
    if(this.model.isEdit==true) {
      let value: any = this.form.value;
      let valueKey: any = this.opt.patch;
      let patchKey: any = this.opt.patch_value;
      this.checkboxValue=true;
      for (const key in value[patchKey]) {
        // if (Object.prototype.hasOwnProperty.call(value[patchKey], key)) {
        //   const element = object[key];
          
        // }
      
        if(value[patchKey][key]!==value[valueKey][key]){
this.checkboxValue=false
        }

      }
      
    }
  }

  public get thisFormControl(): FormControl {
    return this.formControl as FormControl;
  }

  patchData() {
    let value: any = this.form.value;
    console.log(value);
    
    let valueKey: any = this.opt.patch;
    let patchKey: any = this.opt.patch_value;
    if(this.checkboxValue){
      let vals: any =this.replace(value[patchKey]);
      console.log(vals);
      
      this.form.get(valueKey)?.setValue(vals);
    }else{
      let vals: any =this.empty(value[patchKey]);
      this.form.get(valueKey)?.setValue(vals);
    }
   
  }

  replace(obj: any) {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = obj[key] === undefined ? '' : obj[key];
      }
    }
    return result;
  }
  
  empty(obj: any) {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = '' 
      }
    }
    return result;
  }
}
