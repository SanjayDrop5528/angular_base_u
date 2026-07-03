import { Component, OnInit, OnDestroy, DoCheck } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { FieldType } from '@ngx-formly/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'numeric-input',
  standalone: false,
  template: `
    <mat-form-field class="example-full-width" style="flex: 1;">
      <mat-label>{{ field.props.label }}</mat-label>
      <input
        matInput
        [type]="field?.props?.commaSeparation ? 'text' : 'number'"
        [min]="field?.props?.min"
        [max]="field?.props?.max"
        [attr.minlength]="field?.props?.minLength"
        [attr.maxlength]="field?.props?.maxLength"
        inputmode="numeric"
        [readonly]="field?.props?.readonly"
        [required]="field?.props?.required"
        [placeholder]="field?.props?.placeholder"
        [formControl]="displayControl"
        (keypress)="restrictInput($event, field.props.label)"
        (input)="validateInput($event)"
        (paste)="preventPasteNonNumeric($event)"
        (blur)="onBlur()"
      />

      <mat-error *ngIf="formControl.hasError('required')">
        {{ field?.props?.label }} is required.
      </mat-error>

      <mat-error *ngIf="formControl.hasError('minlength')">
        Minimum {{ field?.props?.minLength }} characters required.
      </mat-error>

      <mat-error *ngIf="formControl.hasError('maxlength')">
        Maximum {{ field?.props?.maxLength }} characters allowed.
      </mat-error>

      <mat-error *ngIf="formControl.hasError('min')">
        {{ field?.props?.minErrorMessage || ('Value must be ≥ ' + field?.props?.min) }}
      </mat-error>

      <mat-error *ngIf="formControl.hasError('max')">
        {{ field?.props?.maxErrorMessage || ('Value must be ≤ ' + field?.props?.max) }}
      </mat-error>
    </mat-form-field>
  `,
  host: { style: 'display: block; width: 100%;' }
})
export class NumericInput extends FieldType<any> implements OnInit, OnDestroy, DoCheck {
  displayControl = new FormControl('');
  private _sub: Subscription | undefined;
  private _statusSub: Subscription | undefined;

  ngDoCheck(): void {
    if (this.showError && !this.displayControl.touched) {
      this.displayControl.markAsTouched();
    }
    if (this.formControl.touched && !this.displayControl.touched) {
      this.displayControl.markAsTouched();
    }
    
    // Always sync errors if invalid
    if (this.formControl.invalid && this.displayControl.valid) {
      this.displayControl.setErrors(this.formControl.errors);
    }
  }

  ngOnInit(): void {
    if (this.field?.props?.min !== undefined) {
      this.formControl.addValidators(Validators.min(this.field.props.min));
    }
    if (this.field?.props?.max !== undefined) {
      this.formControl.addValidators(Validators.max(this.field.props.max));
    }
    this.formControl.updateValueAndValidity({ emitEvent: false });
    
    this.displayControl.setErrors(this.formControl.errors);

    if (this.formControl.value !== null && this.formControl.value !== undefined) {
      this.updateDisplayValue(this.formControl.value);
    }

    this._sub = this.formControl.valueChanges.subscribe((val: any) => {
      this.updateDisplayValue(val);
    });

    this._statusSub = this.formControl.statusChanges.subscribe(() => {
      this.displayControl.setErrors(this.formControl.errors);
    });
  }

  ngOnDestroy(): void {
    if (this._sub) {
      this._sub.unsubscribe();
    }
    if (this._statusSub) {
      this._statusSub.unsubscribe();
    }
  }

  updateDisplayValue(val: any): void {
    if (val === null || val === undefined || val === '') {
      this.displayControl.setValue('', { emitEvent: false });
      return;
    }
    let strVal = '';
    if (this.field?.props?.commaSeparation) {
      const locale = this.field?.props?.locale || 'en-US';
      strVal = Number(val).toLocaleString(locale);
    } else {
      strVal = String(val);
    }
    this.displayControl.setValue(strVal, { emitEvent: false });
  }

  onBlur(): void {
    this.formControl.markAsTouched();
    this.displayControl.markAsTouched();
    this.displayControl.setErrors(this.formControl.errors);
  }

  restrictInput(event: KeyboardEvent, label: string): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, ''); // strip commas for length check
    
    const isBackspace = event.key === 'Backspace';

    // Allow only digits and commas (if enabled)
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
      return;
    }

    const maxLength = this.field?.props?.maxLength || (label === 'Contact Number' ? 10 : 15);
    if (value.length >= maxLength && !isBackspace) {
      event.preventDefault();
    }
  }

  preventPasteNonNumeric(event: ClipboardEvent): void {
    const pasteData = event.clipboardData?.getData('text') || '';
    const clean = pasteData.replace(/,/g, '');
    if (!/^\d+$/.test(clean)) {
      event.preventDefault();
    }
  }

  validateInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Remove non-numeric characters
    value = value.replace(/\D/g, '');

    // Remove leading zeros (optional, but keep single 0)
    if (value.length > 1) {
      value = value.replace(/^0+/, '');
    }

    // Limit length
    const maxLength = this.field?.props?.maxLength || 15;
    if (value.length > maxLength) {
      value = value.substring(0, maxLength);
    }

    let formattedValue = value;
    if (this.field?.props?.commaSeparation && value) {
      const locale = this.field?.props?.locale || 'en-US';
      formattedValue = Number(value).toLocaleString(locale);
    }

    input.value = formattedValue;
    this.displayControl.setValue(formattedValue, { emitEvent: false });

    // Set as Number, or null if empty
    const numericValue = value ? Number(value) : null;
    this.formControl.setValue(numericValue);
    this.formControl.markAsDirty();
    this.formControl.markAsTouched();
    this.displayControl.markAsDirty();
    this.displayControl.markAsTouched();
    
    // Force sync errors immediately on input
    this.displayControl.setErrors(this.formControl.errors);
  }
}
