import { ChangeDetectorRef, Component, inject, NgZone, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { FieldType } from "@ngx-formly/core"; 
import { isEmpty } from "lodash";
import * as _ from "lodash"; 
import { DataService } from "../../../core/services/data.service";
@Component({
  selector: "mat-prefix-input", standalone: false,
  template: `
   


 <style>
   


.phone-container {
  position: relative;
    border: 1px solid black;
    margin-top: 5px;
    border-radius: 4px;
    padding: 0px 0 3px 11px;
    display: flex;
    align-items: center;
    transition: border-color 0.3s ease;
}



/* .phone-container.error {
  border-color: black;
} */

.floating-label {
  position: absolute;
  top: -13px;
  left: 12px;
  background-color: white;
  padding: 0 4px;
  font-size: 13px;
  /* color: inherit; default = inherit, no color unless error */
  
}
/*  

.floating-label span {
  color: inherit;  

}

.phone-container.error .floating-label {
  color: inherit !important;  
}

.floating-label span {
  color: inherit ;
}
 */


    .isdisable{
      border: 1px solid #b0b0b03b !important;
    }
    .isdisableinput{
      color:#b0b0b0 !important;
    }
    select {
      outline: none;
      font-size: 16px;
      border: none; 
      cursor: pointer;
      height: 51px;
      background: white;
    }

    
    input {
      flex: 1;
      padding: 8px;
      font-size: 16px;
      border: none;
      outline: none;
      height: 100%;
      width: -webkit-fill-available;
      
    }
    ::placeholder {
      font-family: var(--mdc-outlined-text-field-label-text-font, var(--mat-sys-body-large-font));
    font-size: var(--mdc-outlined-text-field-label-text-size, var(--mat-sys-body-large-size));
    font-weight: var(--mdc-outlined-text-field-label-text-weight, var(--mat-sys-body-large-weight));
    letter-spacing: var(--mdc-outlined-text-field-label-text-tracking, var(--mat-sys-body-large-tracking));

}

::-ms-input-placeholder { /* Edge 12-18 */
  font-family: var(--mdc-outlined-text-field-label-text-font, var(--mat-sys-body-large-font));
    font-size: var(--mdc-outlined-text-field-label-text-size, var(--mat-sys-body-large-size));
    font-weight: var(--mdc-outlined-text-field-label-text-weight, var(--mat-sys-body-large-weight));
    letter-spacing: var(--mdc-outlined-text-field-label-text-tracking, var(--mat-sys-body-large-tracking));

}





    button {
      padding: 8px;
      font-size: 16px;
      background: #007bff;
      color: white;
      border: none;
      cursor: pointer;
      border-radius: 5px;
    }
    
    button:disabled {
      background: #ccc;
    }


    mat-hint{
     
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    font-family: var(--mat-form-field-subscript-text-font, var(--mat-sys-body-small-font));
    line-height: var(--mat-form-field-subscript-text-line-height, var(--mat-sys-body-small-line-height));
    font-size: var(--mat-form-field-subscript-text-size, var(--mat-sys-body-small-size));
    letter-spacing: var(--mat-form-field-subscript-text-tracking, var(--mat-sys-body-small-tracking));
    font-weight: var(--mat-form-field-subscript-text-weight, var(--mat-sys-body-small-weight));
    color: var(--mat-form-field-error-text-color, var(--mat-sys-error));
    font-weight: lighter;
    font-size: 12px; line-height: 1; padding: 2px 0; margin-left: 14px;
} 
/* .phone-container {
  position: relative;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 24px 12px 12px 12px;
  margin-top: 20px;
} */
 
  /* .floating-label span {
  color: red ;
} */

        </style> 
 
  
<!-- new control -->
<div  
  class="phone-container" 
  [ngStyle]="{
    border: formvaluError ? '1px solid red' : '1px solid #ccc'
  }"
  [class.isdisable]="isDisabled" 
  [class.error]="FormControl.invalid"
> 
<label class="floating-label"  
[ngStyle]="{
    color: formvaluError ? 'red' : 'black'
  }">
  

  {{ this.field.props?.label }}
  <!-- @if(hasRequiredValidator(FormControl)){ -->
  @if(this.field?.props?.required){

  *
  }


<span [ngStyle]="{
    color: formvaluError ? 'red' : 'black'
  }"></span></label>

  <select id="country" (change)="onCountryChange($event)" [(ngModel)]="selectedCountryCode" [disabled]="isDisabled">
    <option *ngFor="let country of countries" [value]="country.dialCode">
      {{ country.flag }} {{ country.dialCode }}
    </option>
  </select>

  <input matInput type="text" [formControl]="FormControl" [formlyAttributes]="field" 
    [class.isdisableinput]="isDisabled"
    [placeholder]="field.props.placeholder"
    (input)="inputValidation($event)" (change)="onselect($event)" 
    [disabled]="isDisabled">
</div>


<!-- @if ((this.FormControl.touched == true||this.FormControl.dirty == true) &&   (this.FormControl.value == null || this.FormControl.value == undefined) ) {
  <mat-hint   >{{ this.field.props?.label }} is Required</mat-hint>
}  -->
@if (this.FormControl.touched && this?.formControl?.errors?.required && !formvaluError) {
  <mat-hint   >{{ this.field.props?.label }} is required</mat-hint>
} 
<mat-hint *ngIf="FormControl.hasError('invalidFormat')" style="font-weight: bold;">
  {{ field.props?.label }}  
  Invalid Format 
</mat-hint>





@if (this.FormControl.touched && this.FormControl.hasError("uniqueItems")) {
  <mat-hint  style="font-weight: bold;">{{ this.field.props?.label }} is Already Existed </mat-hint>
} 


    <!-- {{this?.FormControl?.errors|json}} -->
    `,
})
export class MatPrefixInput extends FieldType<any> implements OnInit {
  opt: any;
  label: any;
  currentField: any;
  linguisticsValue: any;
  parent_field: any
  formvaluError: any
  selectedCountryCode: any = "+1"
  isDisabled = false;
  private cdr = inject(ChangeDetectorRef)
  role: any;
  constructor(private dataService: DataService, private cdRef: ChangeDetectorRef, private ngZone: NgZone) {
    super();
    let user: any = sessionStorage.getItem('auth');
    let parsedValue: any = JSON.parse(user)
    this.role = parsedValue?.data?.LoginResponse?.role[0]?.role
  }
  hasRequiredValidator(control: FormControl): boolean {
    const validator = control.validator ? control.validator({} as any) : null;
    return !!(validator && validator['required']);
  }
  public get FormControl() {
    return this.formControl as FormControl;
  }

  ngOnInit(): void {
    this.getCountryDetails()
    // console.log(this.model?.country_code);
    console.log(this.model[this.field?.key]);
    this.FormControl.setErrors({ invalidFormat: true });

    // this.model[this.field?.key]
    this.label = this.field.props?.label;
    this.opt = this.field.props || {};
    this.currentField = this.field;
    this.linguisticsValue = this.opt.linguistics_value || ''
    if (this.currentField.parentKey != "") {
      let prefixvalueType = this?.opt?.patchtype ? this?.opt?.patchtype : this?.opt?.type
      if (prefixvalueType == "Simple") {
        this.linguisticsValue = this.model[this.currentField.parentKey] + "-";
        this.model["ChangeKey"] = this.currentField.parentKey; //todo remove
      } if (prefixvalueType == "local") {
        this.linguisticsValue = sessionStorage.getItem(this.currentField.parentKey) + "-";
        // this.model["ChangeKey"]=this.currentField.parentKey; //todo remove
      }
      // (this.field.hooks as any).afterViewInit = (f: any) => {
      //   console.log(f);
      if (prefixvalueType == "Linked") {
        const parentControl: any = this.form.get(this.currentField.parentKey);
        console.log(parentControl);
        // ! To Avaiod 1 Time
        this.linguisticsValue = this.model[this.currentField.parentKey] + "-"
        // After than we can get here
        parentControl.valueChanges.subscribe((val: any) => {
          console.log(val);

          this.linguisticsValue = val + "-"
          this.onselect('')
        });
      };
    }
    // console.log(this.formControl);
    setTimeout(() => {
      this.isDisabled = !!this.opt['ACL']?.find((entry: any) => entry.role === this.role && entry.readonly === true);
      if (this.isDisabled) {
        this.FormControl.disable();
      } else {
        this.FormControl.enable();
      }
      this.ngZone.run(() => this.cdRef.markForCheck());
    });




  }
  CurrentVAlue: any
  onselect(event: any) {
    let data = event !== '' ? event.target.value : this.CurrentVAlue

    let pathcData: any = this.linguisticsValue + data
    this.CurrentVAlue = data
    if (this.field.props.searchableField) {
      let query: any = { start: 0, end: 1000, filter: [] }
      let value: any
      if (this?.opt?.multifiltertype == "local") {
        value = sessionStorage.getItem(this.opt.filtervalueKey)
      } else if (this.opt.valueType == "Dynamic") {
        value = pathcData
      } else {
        value = this.model[this.opt.filtervalueKey]

      }

      if (!_.isEmpty(this?.opt?.multifilter_condition)) {

        this?.opt?.multifilter_condition?.conditions.map((res: any) => {
          res.value = value
        })
        query.filter.push(this.opt.multifilter_condition)
      } else if (this.opt.seachColumn != '') {
        query.filter = [{
          "clause": "AND",
          "conditions": [
            {
              "column": this.opt.seachColumn,
              "operator": "EQUALS",
              "type": "string",
              "value": value
            }]
        }]

      }
      //   }
      this.dataService.getDataByFilter(this.field.templateOptions.searchCollectionName, query).subscribe(
        (result: any) => {
          console.log(result.data[0].response);
          if (!isEmpty(result.data[0].response)) {
            this.field.formControl.setErrors({ uniqueItems: false }) //we are setting the error manually
          } else {

            this.field.formControl.setErrors({ required: true }) //we are setting the error manually
            if (this.CurrentVAlue !== '') {
              this.field.formControl.setErrors()

            }

          }
        },
        error => {
          //Show the error popup
          console.error('There was an error!', error);
        }
      );
    }
  }
  inputValidation(event: any) {
    if (this.opt.mobileNumber) {
      this.validateNumberInput(event)
    }
  }
  validateNumberInput(event: any): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.value.replace(/\D/g, ''); // Remove non-numeric characters

    // Enforce first digit between 6-9 for mobile numbers
    // if (value.length > 0 && !/^[0-9]/.test(value)) {
    //   value = '';
    // }
    // Limit input to 10 digits
    // value = value.substring(0, this.selectedCountry?.max);

    // Update the input field & form control
    inputElement.value = value;

    this.checkValidation(value);
  }
  checkValidation(value: string): void {
    value = value.trim();

    // Check for required field
    if (_.isEmpty(value)) {
      if (this.field?.props?.required) {
        this.FormControl.setErrors({ required: true });
        this.formvaluError = true
        return;
      }
      this.FormControl.setErrors(null);
      return;
    }

    if (value.length == 10) {
      this.formvaluError = false
      // this.FormControl.setErrors({ invalidFormat: false });
      this.FormControl.setErrors(null);

      return
    }

    if (value.length < 10) {
      if (this.field?.props?.required) {
        this.formvaluError = true
      }

      // this.FormControl.setErrors({invalidFormat:false});
      this.FormControl.setErrors({ invalidFormat: true });
      return
    }

    // // Validate minimum length
    // if (this.selectedCountry?.min && value.length < this.selectedCountry.min) {
    //   this.FormControl.setErrors({ minlength: true });
    //   return;
    // }

    this.FormControl.setErrors(null);
    this.form.get('country_code')?.setValue(this.selectedCountryCode);

  }

  countries: any[] = []
  selectedCountry: any = 0
  onCountryChange(event: Event) {
    const selectedCode = (event.target as HTMLSelectElement).value;
    this.selectedCountry = this.countries.find(c => c.code === selectedCode);
    console.log(selectedCode);
    this.selectedCountryCode = (event.target as HTMLSelectElement).value;

    this.form.get('country_code')?.setValue(this.selectedCountryCode);

    console.log("Selected Country:", this.form);
  }



  getCountryDetails() {
    this.dataService.getDataByFilter("countries", {}).subscribe((res: any) => {
      this.selectedCountry = res.data[0].response[0]
      this.countries = res.data[0].response
      if (this.form.get('country_code')?.value) {
        this.selectedCountryCode = this.form.get('country_code')?.value
      }
      this.form.get('country_code')?.setValue(this.selectedCountryCode);
      // const value = this.model?.[this.field?.key];
      // if (value !== undefined) {
      //   this.FormControl?.setValue(value);
      //   this.FormControl.setErrors(null);
      //   this.FormControl?.markAsPristine();
      //   this.FormControl?.markAsUntouched();
      // }
      this.cdr.detectChanges()
    })
  }

}
// !outer the form 
// "Change_id": true,
// "changekeyfield":"project_id",
// ! inside the form
// {
//   "type": "matprefix-input",
//   "parentKey": "client_name", // ! it used to take the dynamic parent key
//   "className": "flex-6",
//   "props": {
//     "label": "Project ID",
// "type": "Linked", //! Linked <==> dynamic change  // Simple <==> Static
//     "placeholder": "Project ID",
//      "linguistics":"prefix" , 
//     "required": true,
//     "maxLength": 10,
//     "pattern": "^[A-Z][a-zA-Z]{1,}$"
//   },
//   "hideExpression": "model.isEdit || !model.client_name"
// }