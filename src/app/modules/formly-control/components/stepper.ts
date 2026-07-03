 
import { Component } from '@angular/core';
import { FieldType, FormlyFieldConfig } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-stepper',standalone:false,
  template: `
  @if ( 'vertical' == to.type) {
    <div>
      <mat-vertical-stepper>
        @for (step of field.fieldGroup; track step; let index = $index; let last = $last) {
          <mat-step >
            <ng-template matStepLabel>{{ step.props!.label }}</ng-template>
            <formly-field [field]="step"></formly-field>
            <div>
              @if (index !== 0) {
                <button matStepperPrevious mat-button  type="button">Back</button>
              }
              @if (!last) {
                <button matStepperNext mat-raised-button  type="button" [disabled]="!isValid(step)">
                  Next
                </button>
              }
            </div>
          </mat-step>
        }
      </mat-vertical-stepper>
    </div>
  }
  
  @if ( 'horizontal' == to.type) {
    <div>
      <mat-stepper>
        @for (step of field.fieldGroup; track step; let index = $index; let last = $last) {
          <mat-step >
            <ng-template matStepLabel>{{ step.props!.label }}</ng-template>
            <formly-field [field]="step"></formly-field>
            <div>
              @if (index !== 0) {
                <button matStepperPrevious mat-button  type="button">Back</button>
              }
              @if (!last) {
                <button matStepperNext mat-raised-button  type="button" [disabled]="!isValid(step)">
                  Next
                </button>
              }
            </div>
          </mat-step>
        }
      </mat-stepper>
    </div>
  }
  
  `,
})

export class FormlyFieldStepper extends FieldType {
  isLinear = false;
  ngOnInit(): void {
    if(!this.to.type){
      this.to.type= 'vertical'
    }
  }
  isValid(field: FormlyFieldConfig): any {
    if (field.key) {
      return field.formControl?.valid;
    }
    return field.fieldGroup?.every(f => this.isValid(f));
  }
}

 

//[linear]="isLinear"

 