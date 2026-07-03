import { ChangeDetectionStrategy, Component, AfterViewInit, ChangeDetectorRef } from "@angular/core";
import { FieldType } from "@ngx-formly/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { validColorValidator } from "ngx-colors";
import { validate } from "uuid";
import _ from "lodash";
import { HtmlInput } from "./html-input";

@Component({
  selector: "color-picker-input",
  template: ` 
<style>
  .suffix {
    float: right;
    align-items: baseline;
    margin-right: 10px;
    margin-top: -10px;
  }
</style>
<mat-form-field class="example-full-width">
  <mat-label>{{ field.props?.label }}</mat-label>
  <div style="display: flex; align-items: center;">
     <input matInput [attr.placeholder]="placeholder"
     style="visibility: hidden;"
     [formControl]="formControl"
      [disabled]="isDisabled"
     readonly />
    
    <!-- Color Picker -->
    <ngx-colors
      class="suffix"
      (input)="onColorChange($event)"
      ngx-colors-trigger
       [disabled]="isDisabled"
      [formControl]="formControl"
      [formlyAttributes]="field"
    ></ngx-colors>

    <!-- Reset Icon -->
    <mat-icon 
      matSuffix 
      class="reseticon" 
      (click)="resetColor()" 
      fontSet="fas" 
       [class.disabled]="isDisabled"
      fontIcon="fa-undo">
    </mat-icon>
  </div>

  <!-- Validation Messages -->
  <mat-error *ngIf="formControl.touched && formControl.errors?.required">
    {{ field.props?.label }} is required
  </mat-error>
  <mat-error *ngIf="formControl.errors?.pattern">
    {{ field.props?.label }} pattern does not match
  </mat-error>
  <mat-error *ngIf="formControl.errors?.uniqueItems === false">
    {{ field.props?.label }} is already present
  </mat-error>
</mat-form-field>


`, standalone: false
})
export class ColorPickerInputComponent extends FieldType<any> {

  color: any;
  leftColor: any;
  placeholder: any;
  isDisabled = false;
  role: any;
  opt: any;
  constructor(private cf: ChangeDetectorRef) {
    super();
    let user: any = sessionStorage.getItem('auth');
    let parsedValue: any = JSON.parse(user)
    this.role = parsedValue.data.LoginResponse.role[0].role;
    console.log(this.role)
  }
  public get FormControl() {
    return this.formControl as FormControl;
  }
  ngOnInit(): void {
    this.opt = this.field.props || {};
    if (this.model.isEdit == true || _.hasIn(this.model, this.field.key)) {
      this.formControl.setValue(this.FormControl.value)
    } else {
      this.formControl.setValue('');
    }
    if (this.opt['ACL']) {
      const acl = this.opt['ACL'].find(
        (entry: any) => entry.role === this.role && entry.readonly === true
      );

      setTimeout(() => {
        this.isDisabled = !!acl;
        console.log("Is Disabled:", this.isDisabled);
        if (this.isDisabled) {
          this.formControl.disable();  // Disable form control
        } else {
          this.formControl.enable();   // Enable form control
        }
        this.cf.detectChanges();
      });
    }

  }

  onColorChange(event: any) {
    this.formControl.markAsTouched()
    if (typeof (event) == "string") {
      this.field.formControl?.setValue(event);
      let variableName: any = this.field?.name
      if (event != null && variableName) {
        document.documentElement.style.setProperty(variableName, event);
        console.log(event)
      }
    } else {
      this.resetColor()
    }
  }

  resetColor() {
    this.formControl.markAsTouched()
    this.formControl.setValue('');
    let variableName: any = this.field.name
    document.documentElement.style.setProperty(variableName, '');

  }

  ngOnDestroy(): void {
    let variableName: any = this.field?.name
    if (variableName) {
      document.documentElement.style.setProperty(variableName, this.field?.['defaultValue']);
    }
  }

}