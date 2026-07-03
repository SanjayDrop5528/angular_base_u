import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms'; 
import { FieldType } from '@ngx-formly/core'; 
import { FormlyFieldCheckbox } from '@ngx-formly/material/checkbox';


@Component({
    selector: 'app-checkbox-input',standalone:false,
    template: `
    <style>
    .checkbox {
      margin: 0px 7px 25px 10px;
  }
    </style>
    <div>
            <mat-form-field>
                <mat-checkbox [formControl]="FormControl" [required]="to?.['required']||false">{{to.label}}</mat-checkbox>
            </mat-form-field>
    </div>
     
  `,

})
export class CheckboxInputFieldComponent extends FieldType<any>{
     
    public get FormControl() {
        return this.formControl as FormControl;
      }
 
   
     
}


