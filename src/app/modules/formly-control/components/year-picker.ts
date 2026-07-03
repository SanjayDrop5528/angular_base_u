import { DatePipe } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormControl } from '@angular/forms';

import { FieldType } from '@ngx-formly/core';
import moment from 'moment';
import { Moment } from 'moment';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import { DialogService } from '../../../core/services/dialog.service';
import { Subscription } from 'rxjs';

export const YEAR_MODE_FORMATS = {
  parse: {
    dateInput: null,
  },
  display: {
    dateInput: { year: 'numeric' },
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};

@Component({
  selector: 'date-input', standalone: false,
  template: ` 
  <mat-form-field>
  <input matInput 
         [matDatepicker]="year" 
         [formControl]="localFormControl" 
         [disabled]="isDisabled" 
         [min]="minFromDate" 
         [max]="maxFromDate" 
         [required]="this.opt?.required" 
         [id]="field.key" 
         maxlength="4"
         [readonly]="field.props?.disable_input"
         [style.cursor]="field.props?.disable_input ? 'pointer' : 'auto'"
         (click)="field.props?.disable_input ? year.open() : null"
         (keypress)="onlyNumbers($event)"
         (input)="sanitizeInput($event)"
         (blur)="onBlur()" >
  <mat-label>{{field.props!['label']}}</mat-label>

  <mat-datepicker-toggle matSuffix [for]="year"></mat-datepicker-toggle>
  <mat-datepicker #year
                  startView="multi-year"
                  (yearSelected)="chosenYearHandler($event, year)">
  </mat-datepicker>
 
  @if (
   this.formControl?.touched && this?.formControl?.errors?.required
   ) {
        <mat-error>{{ this.field.props?.label }} is required</mat-error>
      } 
      @if (
        this.formControl?.touched && (
          this?.formControl?.errors?.['pattern'] || 
          this?.formControl?.errors?.['matDatepickerMax'] || 
          this?.formControl?.errors?.['matDatepickerMin'] || 
          this?.formControl?.errors?.['matDatepickerParse']
        )
       ) {
        <mat-error> Invalid Format  {{ this.field.props?.label }}</mat-error>
      }  
</mat-form-field>
  `, providers: [

    { provide: MAT_DATE_FORMATS, useValue: YEAR_MODE_FORMATS },
  ],
})

export class yearInput extends FieldType<any> implements OnInit, OnDestroy {

  opt: any
  minFromDate!: any;
  maxFromDate!: any | null;
  minToDate!: Date | null;
  maxToDate!: Date;
  required: any
  currentField: any
  disabled: boolean = true
  secondDate: any
  firstDate: any
  isDisabled = false;
  role: any;

  localFormControl = new FormControl();
  private _subscriptions: Subscription[] = [];

  public get FormControl() {
    return this.formControl as FormControl;
  }
  constructor(private datePipe: DatePipe, private dialogSerivce: DialogService, private cdRef: ChangeDetectorRef, private ngZone: NgZone) {
    super();
    let user: any = sessionStorage.getItem('auth');
    if (user) {
      try {
        let parsedValue: any = JSON.parse(user);
        this.role = parsedValue?.data?.LoginResponse?.role?.[0]?.role || '';
      } catch (e) {
        console.error(e);
      }
    }
  }
  chosenYearHandler(normalizedYear: any, dp: any) {
    let yearVal: number;
    if (normalizedYear instanceof Date) {
      yearVal = normalizedYear.getFullYear();
    } else if (moment.isMoment(normalizedYear)) {
      yearVal = normalizedYear.year();
    } else {
      yearVal = new Date(normalizedYear).getFullYear();
    }
    if (this?.opt?.hidefutureyear === true || this?.opt?.hidefuture === true || this?.opt?.hideFuture === true) {
      const currentYear = new Date().getFullYear();
      if (yearVal > currentYear) {
        this.dialogSerivce.openSnackBar("Future years are not allowed.", "OK");
        return;
      }
    }
    if (this?.opt?.attributes?.minyear) {
      const minAllowedYear = new Date().getFullYear() - Number(this?.opt?.attributes?.minyear);
      if (yearVal < minAllowedYear) {
        this.dialogSerivce.openSnackBar(`Years before ${minAllowedYear} are not allowed.`, "OK");
        return;
      }
    }
    const dateValue = new Date(yearVal, 0, 1);
    this.localFormControl.setValue(dateValue);
    if (this.formControl) {
      this.formControl.markAsTouched();
    }
    dp.close();
    console.log(this.localFormControl.value);
  }
  onlyNumbers(event: any) {
    const pattern = /[0-9]/;
    const inputChar = String.fromCharCode(event.charCode || event.keyCode);

    // Prevent entering '0' if it is the first character
    const target = event.target;
    if (target.value.length === 0 && inputChar === '0') {
      event.preventDefault();
      return;
    }

    if (event.charCode !== 0 && !pattern.test(inputChar)) {
      event.preventDefault();
    }
  }
  sanitizeInput(event: any) {
    const input = event.target;
    let cleanValue = input.value.replace(/[^0-9]/g, '');

    // Strip leading zeros
    while (cleanValue.startsWith('0')) {
      cleanValue = cleanValue.substring(1);
    }

    if (cleanValue !== input.value) {
      input.value = cleanValue;
      this.localFormControl.setValue(cleanValue, { emitEvent: true });
    }
  }
  onBlur() {
    if (this.formControl) {
      this.formControl.markAsTouched();
    }
    const val = this.localFormControl.value;
    if (val) {
      let yearNum: number | null = null;
      if (val instanceof Date && !isNaN(val.getTime())) {
        yearNum = val.getFullYear();
      } else {
        const valStr = String(val).trim();
        const num = Number(valStr);
        if (!isNaN(num) && valStr.length === 4 && num >= 1000 && num < 3000) {
          yearNum = num;
        }
      }

      if (yearNum !== null) {
        if (this?.opt?.hidefutureyear === true || this?.opt?.hidefuture === true || this?.opt?.hideFuture === true) {
          const currentYear = new Date().getFullYear();
          if (yearNum > currentYear) {
            this.dialogSerivce.openSnackBar("Future years are not allowed.", "OK");
            this.localFormControl.setErrors({ futureYear: true });
            if (this.formControl) {
              this.formControl.setValue(null);
            }
            return;
          }
        }
        if (this?.opt?.attributes?.minyear) {
          const minAllowedYear = new Date().getFullYear() - Number(this?.opt?.attributes?.minyear);
          if (yearNum < minAllowedYear) {
            this.dialogSerivce.openSnackBar(`Years before ${minAllowedYear} are not allowed.`, "OK");
            this.localFormControl.setErrors({ minYear: true });
            if (this.formControl) {
              this.formControl.setValue(null);
            }
            return;
          }
        }
        if (!(val instanceof Date)) {
          this.localFormControl.setValue(new Date(yearNum, 0, 1), { emitEvent: false });
        }
        this.localFormControl.setErrors(null);
      } else {
        // Mark as parse error if not a valid 4-digit year
        this.localFormControl.setErrors({ matDatepickerParse: true });
        if (this.formControl) {
          this.formControl.setValue(null);
        }
      }
    }
  }
  ngOnInit(): void {

    this.currentField = this.field
    this.required = this.field.props?.required
    this.opt = this.to

    // Convert initial number/string value from model to Date object for the picker UI
    if (this.formControl) {
      let initialVal = this.formControl.value;
      if (initialVal) {
        const yearNum = Number(initialVal);
        if (!isNaN(yearNum) && yearNum > 1000 && yearNum < 3000) {
          this.localFormControl.setValue(new Date(yearNum, 0, 1), { emitEvent: false });
        }
      }

      // Bidirectional synchronization between local control and parent formControl
      const sub1 = this.formControl.valueChanges.subscribe((val: any) => {
        if (val) {
          const yearNum = Number(val);
          if (!isNaN(yearNum) && yearNum > 1000 && yearNum < 3000) {
            const currentLocalVal = this.localFormControl.value;
            if (!currentLocalVal || (currentLocalVal instanceof Date && currentLocalVal.getFullYear() !== yearNum)) {
              this.localFormControl.setValue(new Date(yearNum, 0, 1), { emitEvent: false });
            }
          }
        } else {
          this.localFormControl.setValue(null, { emitEvent: false });
        }
      });
      this._subscriptions.push(sub1);
    }

    // Bidirectional synchronization between local control and parent formControl
    const sub2 = this.localFormControl.valueChanges.subscribe((val: any) => {
      let yearNum: number | null = null;
      if (val instanceof Date && !isNaN(val.getTime())) {
        yearNum = val.getFullYear();
      } else if (val && (typeof val === 'string' || typeof val === 'number')) {
        const valStr = String(val).trim();
        const num = Number(valStr);
        if (!isNaN(num) && valStr.length === 4 && num >= 1000 && num < 3000) {
          yearNum = num;
        }
      }

      if (this.formControl) {
        if (yearNum !== null) {
          if (this?.opt?.hidefutureyear === true || this?.opt?.hidefuture === true || this?.opt?.hideFuture === true) {
            const currentYear = new Date().getFullYear();
            if (yearNum > currentYear) {
              this.formControl.setValue(null);
              this.localFormControl.setErrors({ futureYear: true });
              return;
            }
          }
          if (this?.opt?.outputFormat === 'string') {
            this.formControl.setValue(String(yearNum));
          } else {
            this.formControl.setValue(yearNum);
          }
        } else {
          this.formControl.setValue(null);
        }
        this.formControl.markAsDirty();
      }
    });
    this._subscriptions.push(sub2);

    const sub3 = this.localFormControl.statusChanges.subscribe(() => {
      if (!this.formControl) return;
      const errors = this.localFormControl.errors;
      if (errors) {
        this.formControl.setErrors({ ...this.formControl.errors, ...errors });
      } else {
        const currentErrors = this.formControl.errors;
        if (currentErrors) {
          const newErrors = { ...currentErrors };
          delete newErrors['matDatepickerMin'];
          delete newErrors['matDatepickerMax'];
          delete newErrors['matDatepickerParse'];
          this.formControl.setErrors(Object.keys(newErrors).length ? newErrors : null);
        }
      }
    });
    this._subscriptions.push(sub3);

    if (this?.opt?.attributes?.constant) {
      this.minFromDate = moment().year(1980).startOf('year');
    }
    if (this?.opt?.attributes?.minyear) {
      this.minFromDate = moment().subtract(Number(this?.opt?.attributes?.minyear), 'years').startOf('year');
    }
    if (this?.opt?.attributes?.hide == "past_date") {
      this.minFromDate = moment().add(this?.opt?.attributes?.add_days || 0, 'day')
    }

    if (this?.model?.isEdit == true && this?.opt?.dynamic == true && this.formControl) {
      this.minFromDate = this.formControl.value
    }

    if (this?.opt?.attributes?.hide == "future_date") {
      this.maxFromDate = moment().add(this?.opt?.attributes?.add_days || 0, 'day')
    }

    if (this?.opt?.hidefutureyear === true || this?.opt?.hidefuture === true || this?.opt?.hideFuture === true) {
      this.maxFromDate = moment();
    }

    if (this?.opt?.pastYears) {
      this.minFromDate = moment().subtract(this.opt.pastYears, 'years').startOf('year');
    }

    if (this?.opt?.attributes?.hide == "dob") {
      let presentDate = moment();
      this.maxFromDate = presentDate
      let differenceInYears = moment(presentDate).diff(18, 'years');
      this.minFromDate = differenceInYears
    }

    if (this?.opt?.attributes?.today && this.FormControl) {
      let date = moment()
      this.FormControl.setValue(date)
    }

    if (this?.model?.isEdit == true && this?.opt?.overrideFromDate?.dynamic == true && this.formControl) {
      const todate: any = this.form.get(this.opt.overrideFromDate.ToDAtekey)
      this.minFromDate = this.formControl.value
      this.maxFromDate = moment(todate?.value);
      const sub4 = todate?.valueChanges.subscribe((val: any) => {
        this.maxFromDate = val
        this.convertMomentsToDates();
      });
      if (sub4) this._subscriptions.push(sub4);
    }

    if (this.currentField.parentKey != "") {
      (this.field.hooks as any).afterViewInit = (f: any) => {
        let field = this.currentField.parentKey
        const parentControl = this.form.get(field)
        const sub5 = parentControl?.valueChanges.subscribe((val: any) => {
          this.minFromDate = val;
          this.convertMomentsToDates();

          // Validate current value against the new minimum year
          const minYear = Number(val);
          const currentVal = this.formControl?.value;
          if (currentVal !== null && currentVal !== undefined && currentVal !== '') {
            const currentYear = Number(currentVal);
            if (!isNaN(minYear) && !isNaN(currentYear) && currentYear < minYear) {
              this.localFormControl.setErrors({ minYear: true });
              if (this.formControl) {
                this.formControl.setValue(null);
                this.formControl.setErrors({ minYear: true });
                this.formControl.markAsTouched();
              }
              this.localFormControl.setValue(null, { emitEvent: false });
            }
          }
        });
        if (sub5) this._subscriptions.push(sub5);
      }
    }
    this.convertMomentsToDates();
    setTimeout(() => {
      this.isDisabled = !!this.opt['ACL']?.find((entry: any) => entry.role === this.role && entry.readonly === true);
      if (this.formControl) {
        if (this.isDisabled) {
          this.FormControl.disable();
          this.localFormControl.disable();
        } else {
          this.FormControl.enable();
          this.localFormControl.enable();
        }
      } else {
        if (this.isDisabled) {
          this.localFormControl.disable();
        } else {
          this.localFormControl.enable();
        }
      }
      this.ngZone.run(() => this.cdRef.markForCheck());
    });
  }

  ngOnDestroy(): void {
    this._subscriptions.forEach(sub => sub.unsubscribe());
  }

  convertMomentsToDates() {
    if (this.minFromDate) {
      if (moment.isMoment(this.minFromDate)) {
        this.minFromDate = (this.minFromDate as any).toDate();
      } else if (typeof this.minFromDate === 'string' || typeof this.minFromDate === 'number') {
        const num = Number(this.minFromDate);
        if (!isNaN(num) && num > 1000 && num < 3000) {
          this.minFromDate = new Date(num, 0, 1);
        } else {
          this.minFromDate = new Date(this.minFromDate);
        }
      }
    }
    if (this.maxFromDate) {
      if (moment.isMoment(this.maxFromDate)) {
        this.maxFromDate = (this.maxFromDate as any).toDate();
      } else if (typeof this.maxFromDate === 'string' || typeof this.maxFromDate === 'number') {
        const num = Number(this.maxFromDate);
        if (!isNaN(num) && num > 1000 && num < 3000) {
          this.maxFromDate = new Date(num, 0, 1);
        } else {
          this.maxFromDate = new Date(this.maxFromDate);
        }
      }
    }
  }

  currentPeriodClicked(data: any) {
    console.log(this.field.validiotionType);

    if (this.field.dynamicvaltidateDate == true) {
      console.log(this.field.validiotionType == "dob");

      if (this.field.validiotionType == "dob") {
        let presentDate = moment();
        let differenceInYears = moment(presentDate).diff(data.value, 'years');

        console.log(differenceInYears);

        if (differenceInYears <= 18) {
          this.dialogSerivce.openSnackBar(`The Date You Chose (${this.opt.label}) should be 18 years or more.`, "OK");
          if (this.formControl) {
            this.formControl.setErrors({ dob: true });
          }
        }
      }
    }

    if (this.field.valtidateDate == true) {
      if (this.field.childKey) {
        if (typeof this.model[this.field.childKey] === 'string') {
          this.secondDate = moment(this.model[this.field.childKey]);
        } if (this.model[this.field.childkey2] === true) {
          this.secondDate = moment();
        }
        else {
          this.secondDate = this.model[this.field.childKey];
        }
        this.firstDate = data.value;
        if (this.formControl) {
          this.formControl.setValue(data.value);
        }

      } else if (this.field.parentKey) {
        if (typeof this.model[this.field.parentKey] === 'string') {
          this.firstDate = moment(this.model[this.field.parentKey]);
        } else {
          this.firstDate = this.model[this.field.parentKey];
        }
        this.secondDate = data.value;
        if (this.formControl) {
          this.formControl.setValue(data.value);
        }
      }

      let yearsDiff = this.secondDate.year() - this.firstDate.year();
      let monthsDiff = this.secondDate.month() - this.firstDate.month();

      if (monthsDiff < 0) {
        yearsDiff--;
        monthsDiff += 12;
      }

      let a = `${yearsDiff}.${monthsDiff}`;
      const cleanStr = a.replace(/[^0-9.-]/g, '');
      const number = parseFloat(cleanStr);

      let formattedNumber;
      if (Number.isInteger(number)) {
        formattedNumber = number.toFixed(2);
      } else {
        formattedNumber = number;
      }

      if (this.formControl && this.field.formControl.parent) {
        const parentControls = (this.field.formControl.parent as any).controls;
        if (parentControls && parentControls[this.field.props.onValueChangeUpdate.key]) {
          parentControls[this.field.props.onValueChangeUpdate.key].setValue(formattedNumber);
        }
      }
    }
  }
}
