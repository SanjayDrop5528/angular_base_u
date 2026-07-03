
import {Component, OnInit} from '@angular/core';
import { FormControl } from '@angular/forms';
import {MatChipsModule} from '@angular/material/chips';
import { FieldType } from '@ngx-formly/core';

@Component({
  selector: 'chips',standalone:false,
  template:`
  <mat-chip-listbox                 
  [formControl]="thisFormControl"
  >
  <mat-chip-option>AND</mat-chip-option>
  <mat-chip-option>OR</mat-chip-option>
</mat-chip-listbox>

  `,
})
export class Chips extends FieldType implements OnInit {
    opt: any;
    sub: any;
    label: any;
  
  
    constructor() {
      super();
    }
  
    ngOnInit(): void {
      this.opt = this.field.props || {};
      console.log(this.opt);
      
      this.label = this.opt.label ;
    this.sub=this.opt.sublabel||[]
  console.log(this.sub);
  
    }
  
    public get thisFormControl(): FormControl {
      return this.formControl as FormControl;
    }
  
}