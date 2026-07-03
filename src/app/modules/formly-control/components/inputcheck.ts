
import { Component, NgZone, OnInit } from '@angular/core';  
import { FormControl } from '@angular/forms';
import { FieldType } from '@ngx-formly/core';
import _, { isEmpty } from 'lodash';
import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DataService } from '../../../core/services/data.service';


@Component({
  selector: 'formly-field-input', standalone: false,
  template: ` <mat-form-field class="example-full-width" [ngStyle]="to.style">
  <mat-label>{{ to.label }}</mat-label>
  <input
    matInput
    #input
    [id]="id"
    [type]="to.type || 'text'"
     [readonly]="isFormReadOnly || to.readonly"
    [required]="to.required"
    [formControl]="FormControl"
    [formlyAttributes]="field"
    [pattern]="opt?.pattern"
    [tabIndex]="to.tabindex"
    [placeholder]="to.placeholder"
    (blur)="frmSubmit($event, field)"
    (input)="inputEvent(input, $event)"  
    [min]="to?.min"
    (focus)="onFocus($event)"
  />

  <!-- Always visible label for class amount inside the form field -->
  <mat-hint *ngIf="opt?.intitalgetvalue" style="color: black; font-weight: bold; font-size: 12px; margin-top: 4px;">
    Class Amount is <span>$</span>{{ model?.class_amount || 0 }}
  </mat-hint>

  <!-- Validation Errors -->
  <mat-error *ngIf="formControl?.errors?.required">
    {{ field.props?.label }} is required
  </mat-error> 
  <mat-error *ngIf="formControl?.errors?.pattern">
    {{ field.props?.label }} does not match the pattern
  </mat-error>

  <!-- <mat-error *ngIf="formControl?.errors?.uniqueItems==false && value && !formControl?.errors?.pattern">
    {{ field.props?.label }} already present
  </mat-error> -->
  
<mat-error *ngIf="formControl?.errors?.uniqueItems === false && !formControl?.errors?.pattern">
  {{ field.props?.label }} already present
</mat-error>


  <mat-error *ngIf="formControl?.errors?.DiscountAmount === true">
    Discount cannot exceed class amount
  </mat-error>
</mat-form-field>


`,
})

// (input)="inputEvent(input, $event)"   // this used for upper case input but last letter is working but it in small letter ex LLLl
// (keydown.enter)="frmSubmit($event,field)" // this used for enter button functionality
// (keydown.tab)="frmSubmit($event,field)"
export class FormlyFieldInputTextEnterKey extends FieldType<any> implements OnInit {
 
  isFormReadOnly: boolean = false;
  public get FormControl() {
    return this.formControl as FormControl;

  }
  sameinput!: boolean
  constructor(private dataService: DataService) {
    super();
   
  }

  opt: any
  ngOnInit() {

    this.opt = this.field.props
    // this.FormControl.disable({ emitEvent: false });
    // this.field.props.disabled = true;


    if (this.model['isEdit']) {
      this.oldValue = this.formControl?.value
    }

    if (this.field.props.intitalvalue != null || this.field.props.intitalvalue != undefined) {
      const fieldKey: string | undefined = this.field?.key;
      const initialValue: any = this.field.props.intitalvalue;
      let valueToSet;

      if (typeof initialValue === 'number') {
        valueToSet = Number(initialValue);
      } else if (initialValue === 'float') {
        valueToSet = parseFloat(initialValue);
      } else {
        valueToSet = String(initialValue);
      }

      if (fieldKey && this.form.get(fieldKey)) {
        this.form.get(fieldKey)?.patchValue(valueToSet);
      }
    }



    this.formControl.valueChanges.subscribe((res: any) => {
      if (this.opt?.intitalgetvalue) {
        const class_amount = parseFloat(this.model['class_amount']);
        const discountAmount = Number(res);

        if (discountAmount > class_amount) {
          this.formControl.setErrors({ DiscountAmount: true });
          // this.ngZone.run(() => this.cdRef.markForCheck());

          return
        }
        else {
          this.formControl.setErrors(null);
          // this.ngZone.run(() => this.cdRef.markForCheck());

          return
        }
      }
      if (this.to?.['triggerOnChange']) {
        this.frmLeave(this.formControl.value, this.field)
      }

    });
 
    if (!this.model['isEdit']) {
      this.frmLeave(null, this.field)
    }

  }

  frmSubmit(event: any, field: any) {
    // if (!field.templateOptions.onEnterSubmit) {
    //   try {
    //     let ctrl = event.currentTarget.form.elements[event.currentTarget.tabIndex + 1]
    //     ctrl.focus()
    //     ctrl.click()
    //   } catch {

    //   }
    //   event.preventDefault()
    //   event.stopPropagation()
    // }
    if (this.value != null) {
      this.frmLeave(this.value, field)
    }

  }
  oldValue: any
  frmLeave(value: any, field: any) {
    this.value = value
    const regex = new RegExp(this.opt?.pattern || '');
    const isMatch = regex.test(value);
    if (!isMatch) {
      if (value && !regex.test(value)) {
        this.formControl.setErrors({ ...this.formControl.errors, pattern: true });
      }
      return
    }
    if (this.model['isEdit']) {
      if (this.oldValue === value) {
        return
      }
    }


    if (field.props?.searchableField) {

      //   let bookid= ''
      //   var filterQuery = [{
      //     clause: "$and",
      //     conditions: [
      //      {column: 'book_id', operator: "$eq", value:bookid}, // for book id
      //  {column: field.key, operator: "$eq", value:value} // same field in template option
      //  {column: field.props?.searchColumnName, operator: "$eq", value:value}, // diff field from template option
      //    ]
      //  }]
      //  const keys = field.key
      // let query:any={}
      // if(this.opt.multifilter==true){ 
      let query: any = { start: 0, end: 1000, filter: [] }
      this?.opt?.multifilter_condition?.conditions.map((res: any) => {

        if (this?.opt?.multifiltertype == "local") {
          let value = sessionStorage.getItem(this.opt.filtervalueKey)
          res.value = value
        } else if (this.opt.valueType == "Dynamic") {
          res.value = this.value
        } else {
          res.value = this.model[this.opt.filtervalueKey]

        }

      })
      query.filter.push(this.opt.multifilter_condition)
      //   } 
      this.CheckAlreadyExits(field, query)

      // this.dataService.getDataByFilter(field.props?.searchCollectionName, query).subscribe(
      //   (result: any) => {
      //     console.log(result.data[0].response);
      //     if (!isEmpty(result.data[0].response)) {
      //       field.formControl.setErrors({ uniqueItems: false }) //we are setting the error manually
      //     };
      //   },
      //   error => {
      //     //Show the error popup
      //     console.error('There was an error!', error);
      //   }
      // );
    } else if (field.props?.searchableKeyField) {


      let query: any = { start: 0, end: 1000, filter: [] }
      let filter: any = _.cloneDeep(this.opt.multifilter_condition);
      filter.conditions.map((res: any) => {
        if (this.opt.multifiltertype == "Simple") {
          if (res['takeFrom'] == "model") {
            res.value = _.get(this.model, res.value);
            delete res['takeFrom']
          }
          else {
            res.value = this.value ?? this.formControl.value
          }
        }
        if (this.opt.multifiltertype == "Local") {
          res.value = sessionStorage.getItem(this.opt.local_name);
        }
      });
      query.filter.push(filter)
      //   }

      this.CheckAlreadyExits(field, query)

      // this.dataService.getDataByFilter(field.props?.searchCollectionName, query).subscribe(
      //   (result: any) => {
      //     console.log(result.data[0].response);
      //     if (!isEmpty(result.data[0].response)) {
      //       field.formControl.setErrors({ uniqueItems: false }) //we are setting the error manually
      //     };
      //   },
      //   error => {
      //     //Show the error popup
      //     console.error('There was an error!', error);
      //   }
      // );
    } else {

      let query: any = {
        start: 0, end: 10, filter: [
          {
            "clause": "AND",
            "conditions": [
              {
                "column": this.to.seachColumn,
                "operator": "EQUALS",
                "type": "string",
                "value": this.to.type == "number" ? Number(this.value) : this.value
              }
            ]
          },
        ]
      }

      this.CheckAlreadyExits(field, query)

      // this.dataService.getDataByFilter(field.props?.searchCollectionName, query).subscribe(
      //   (result: any) => {
      //     console.log(result.data[0].response);
      //     if (!isEmpty(result.data[0].response)) {
      //       field.formControl.setErrors({ uniqueItems: false }) //we are setting the error manually
      //     };
      //   },
      //   error => {
      //     //Show the error popup
      //     console.error('There was an error!', error);
      //   }
      // );
    }
  }
  value: any
  inputEvent(input: any, event: any) {
    if (!this.opt['uppercase']) {
      input.value = event.target.value.toUpperCase();
    } else {
      input.value = event.target.value;
    }
    this.value = input.value
     if (this.value != null) {
      this.frmLeave(this.value, this.field)
    }
  }



  onFocus(event: any) {
    setTimeout(() => {
      event.target.select()
    }, 50);
  }

  CheckAlreadyExits(field: any, query: any) {

    if (field.props?.dataset) {
      // Single API call based on dataset
      this.dataService.dataset_Get_Data(field.props.dataset, query).subscribe(
        (result: any) => {
          if (!isEmpty(result?.data?.[0]?.response)) {
            // field.formControl.setErrors({ uniqueItems: false });

            this.formControl.setErrors({ ...this.formControl.errors, uniqueItems: false });

          } else {
            field.formControl.setErrors(null);
          }
        },
        error => {
          console.error('There was an error!', error);
        }
      );
    } else {
      // Multiple API calls based on collectionNames array
      const collectionNames = Array.isArray(field.props?.searchCollectionName)
        ? field.props.searchCollectionName
        : [field.props?.searchCollectionName];

      const observables = collectionNames.map((name: any) =>
        this.dataService.getDataByFilter(name, query)
      );

      forkJoin(observables).subscribe(
        (results: any) => {
          const hasMatch = results.some((res: any) => !isEmpty(res?.data?.[0]?.response));
          if (hasMatch) {
            field.formControl.setErrors({ uniqueItems: false });
          } else {
            // field.formControl.setErrors(null);
          }
        },
        (error: any) => {
          console.error('There was an error!', error);
        }
      );
    }

  }
}

/*
 Json Example

{
  "type": "input-text-enterkey",
  "key": "_id",
  "className": "flex-1",
  "templateOptions": {
    "label": "Title Id",
    "placeholder": "Title Id",
    "maxLength": 15,
    "required": true,
    "searchableField": true,  // used to for checking it is unique name
    "searchCollectionName": "book"						 // search in collection Name
    "multifilter_condition": {
      "clause": "AND",
      "conditions": [
        {
        "column": "client_id",
        "operator": "EQUALS",
        "type": "string",
        "value": ""
        }
      ]
      },
  } 
}

{
  "type": "input-text-enterkey",
  "key": "client_id",
  "className": "flex-6",
  "props": {
    "label": "Client Id",
    "placeholder": "Client Id",
    "pattern": "^[a-zA-Z0-9-_]*$",
    "valueType":"Dynamic",  "searchableField": true,"searchCollectionName":"client",
    "multifilter_condition": {
      "clause": "AND",
      "conditions": [
        {
        "column": "client_id",
        "operator": "EQUALS",
        "type": "string",
        "value": ""
        }
      ]
      },
    "required": true
  },
   "expressions": {
   
    "props.readonly": "model.isEdit"
  }
},

*/



