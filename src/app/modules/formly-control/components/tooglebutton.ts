import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { FieldType } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-toogle',standalone:false,
  template:`
  <style>
  
  </style>
  <div style="display: flex; align-items: center;">
    <!-- single and mulitiple -->
    <div style="justify-content: right;margin: 10px;">
      <h5>
        {{label}}
      </h5>
      @for (row of sub; track row) {
        <p>
          <span>{{row}}</span>
        </p>
      }
    </div>
    <div style="justify-content: left;">
  
      <mat-slide-toggle
  
        [formControl]="thisFormControl"
        [formlyAttributes]="field"
      ></mat-slide-toggle>
    </div>
  
  </div>
  
  
  <!-- <input type="hidden"
  [formControl]="thisFormControl"
  [formlyAttributes]="field"
  /> -->
  
  
  `
})
export class tooglebutton extends FieldType<any> implements OnInit {
  opt: any;
  sub: any;
  label: any;


  constructor(private http: HttpClient,private cf: ChangeDetectorRef) {
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

    //   {
    //                 "type": "toogle",
    //                 "key": "Org_logo",
    //                 "className": "flex-6",
    //                 "templateOptions": {
    //                     "label": "Organization Logo",
    //                     "sublabel":["HI - Organization","would you like to"]
    //                 }
    //             }
}
