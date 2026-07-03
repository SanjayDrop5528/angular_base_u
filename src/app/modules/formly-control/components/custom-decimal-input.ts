import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { FieldType } from '@ngx-formly/core';

@Component({
    selector: 'app-custom-decimal-input',standalone:false,
    template: `
    <mat-form-field class="numbers">
      <mat-label>{{this.label}}</mat-label>
      <input
        matInput
        type="number" onlyDecimal
        [placeholder]= "this.opt.placeholder"
        [required]="required"
        [readonly]=readonly
        #input
        [formlyAttributes]="field"
        [formControl]="FormControl"
        (Change)=onModelChange($event)
    
        />
      @if (required) {
        <mat-error>{{this.validationError}}</mat-error>
      }
    </mat-form-field>
    
    `,
})
export class CustomDecimalInputType extends FieldType<any> implements OnInit {
    label: any
    required: any
    intNumber:any
    error:any
    opt:any
    validationError:any
    pattern:any
    readonly:any
  

    public get FormControl() {
      return this.formControl as FormControl;
    }
    ngOnInit(): void {
      
      this.opt=this.props
      this.label = this.field.props?.label
      this.required = this.field.props?.required
      this.pattern = this.field.props.pattern
      this.readonly=this.field.props.readonly || false
      this.validationError = this.field.validation.messages.pattern
   
      
    }
    onModelChange(value: any) {
      
    }
}