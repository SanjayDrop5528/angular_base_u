import { Component, OnInit, DoCheck } from '@angular/core';
import { FieldType } from '@ngx-formly/core';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { DataService } from '../../../core/services/data.service';
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'numeric-input',
  standalone: false,
  template: `
    <mat-form-field class="example-full-width" style="flex:1;">
      <mat-label>{{ field.props.label }}</mat-label>

      <input
        matInput
        type="text"
        inputmode="numeric"
        [readonly]="field?.props?.readonly"
        [required]="field?.props?.required"
        [formControl]="displayControl"
        [placeholder]="field?.props?.placeholder"
        (keypress)="restrictInput($event)"
        (input)="validateInput($event)"
        (paste)="preventPasteNonNumeric($event)"
      />

      <mat-error *ngIf="displayControl.hasError('required') && !displayControl.hasError('minlength') && !displayControl.hasError('maxlength') && !displayControl.hasError('searchCondition')">
        {{ field?.props?.label }} is required.
      </mat-error>

      <mat-error *ngIf="displayControl.hasError('minlength') && !displayControl.hasError('searchCondition')">
        Minimum {{ field?.props?.minLength }} characters required.
      </mat-error>

      <mat-error *ngIf="displayControl.hasError('maxlength') && !displayControl.hasError('searchCondition')">
        Maximum {{ field?.props?.maxLength }} characters allowed.
      </mat-error>

      <mat-error *ngIf="displayControl.hasError('searchCondition')">
        {{ field?.props?.seardhError }}
      </mat-error>

    </mat-form-field>
  `,
})
export class CheckNumericInput extends FieldType<any> implements OnInit, DoCheck {

  constructor(private dataService: DataService) {
    super();
  }

  displayControl = new FormControl('');

  ngDoCheck(): void {
    if (this.showError && !this.displayControl.touched) {
      this.displayControl.markAsTouched();
    }
    if (this.formControl.touched && !this.displayControl.touched) {
      this.displayControl.markAsTouched();
    }
    // Sync errors dynamically if invalid
    if (this.formControl.invalid && this.displayControl.valid) {
      this.displayControl.setErrors(this.formControl.errors);
    }
  }

  ngOnInit(): void {

    const validators = [];

    if (this.field?.props?.required) {
      validators.push(Validators.required);
    }

    // Custom validator for digit count (ignores spaces)
    if (this.field?.props?.minLength || this.field?.props?.maxLength) {
      validators.push((control: any) => {
        const value = control.value || '';
        const digitCount = value.replace(/\D/g, '').length;

        // If empty and required, let required validator handle it
        if (digitCount === 0) {
          return null;
        }

        if (this.field?.props?.minLength && digitCount < this.field.props.minLength) {
          return { minlength: { requiredLength: this.field.props.minLength, actualLength: digitCount } };
        }

        if (this.field?.props?.maxLength && digitCount > this.field.props.maxLength) {
          return { maxlength: { requiredLength: this.field.props.maxLength, actualLength: digitCount } };
        }

        return null;
      });
    }

    this.displayControl.setValidators(validators);
    this.displayControl.updateValueAndValidity();

    // Sync displayControl errors to formControl
    this.displayControl.statusChanges.subscribe(() => {
      if (this.displayControl.errors) {
        this.formControl.setErrors(this.displayControl.errors);
      } else {
        this.formControl.setErrors(null);
      }
    });

    if (this.formControl.value) {
      const formatted =
        this.field?.props?.inputType === 'aadhar'
          ? this.formatAadhar(this.formControl.value)
          : this.formControl.value;

      this.displayControl.setValue(formatted, { emitEvent: false });
    }

    // SEARCH API VALIDATION
    if (this.props?.searchableField == true) {

      const collectionName = this.props?.searchCollectionName;
      const filterCondition = this.props?.multifilter_condition;

      this.displayControl.valueChanges.pipe(
        debounceTime(400),
        filter((query): query is string => {
          if (typeof query !== 'string') return false;
          const digitCount = query.replace(/\D/g, '').length;
          if (digitCount !== (this.props?.minSearchLength || 0)) return false;

          // Skip API call if in edit mode and value hasn't changed
          if (this.model.isEdit) {
            const cleanQuery = query.replace(/\D/g, '');
            const currentValue = this.model[this.field.key];
            if (cleanQuery === currentValue) {
              // Clear search error since it's the same value
              if (this.displayControl.hasError('searchCondition')) {
                const errors = { ...this.displayControl.errors };
                delete errors['searchCondition'];
                this.displayControl.setErrors(Object.keys(errors).length ? errors : null);
              }
              return false;
            }
          }

          return true;
        }),
        switchMap((query: string) => {
          const cleanQuery = query.replace(/\D/g, '');
          if (cleanQuery) {
            filterCondition.conditions.map((res: any) => {

              if (res['takeFrom'] == "model") {
                res.value = this.model[res.value];
                delete res['takeFrom'];

              } else if (res['staticValue'] == true) {
                delete res['staticValue'];

              } else {
                res.value = cleanQuery;
              }

            });
          }

          const dynamicFilers: any = {
            start: 0,
            end: 1000,
            filter: [filterCondition],
          };

          return this.dataService.getDataByFilter(collectionName, dynamicFilers);
        })
      ).subscribe((value: any) => {

        if (value.status == 200) {

          const data = value.data?.[0]?.response;
          const searchCondition = this.props?.['searchCondition'];

          if (searchCondition === "NOTEQUALS" && data && data.length > 0) {
            this.displayControl.setErrors({ searchCondition: true });
            this.formControl.setErrors({ searchCondition: true });

          } else if (searchCondition === "EQUALS" && (!data || data.length === 0)) {
            this.displayControl.setErrors({ searchCondition: true });
            this.formControl.setErrors({ searchCondition: true });

          } else {
            // Clear search error if validation passes
            if (this.displayControl.hasError('searchCondition')) {
              const errors = { ...this.displayControl.errors };
              delete errors['searchCondition'];
              this.displayControl.setErrors(Object.keys(errors).length ? errors : null);
            }
          }
        }
      });
    }
  }

  restrictInput(event: KeyboardEvent): void {
    if (!/[0-9]/.test(event.key) && event.key !== 'Backspace') {
      event.preventDefault();
    }
  }

  preventPasteNonNumeric(event: ClipboardEvent): void {
    const pasteData = event.clipboardData?.getData('text') || '';

    if (!/^\d+$/.test(pasteData)) {
      event.preventDefault();
    }
  }

  validateInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    const maxLength = this.field?.props?.maxLength || 12;

    if (value.length > maxLength) {
      value = value.substring(0, maxLength);
    }

    // Store raw value in formControl
    this.formControl.setValue(value, { emitEvent: false });

    // Format display value
    const formatted =
      this.field?.props?.inputType === 'aadhar'
        ? this.formatAadhar(value)
        : value;

    const digitCount = value.length;
    const minSearch = this.props?.minSearchLength || 0;

    if (this.props?.searchableField == true && digitCount === minSearch) {
      // Emit so valueChanges fires → API re-runs → searchCondition error re-applied if needed
      this.displayControl.setValue(formatted);
    } else {
      // Update silently
      this.displayControl.setValue(formatted, { emitEvent: false });

      // Preserve searchCondition error if digit count is still at search length
      // Clear it only if digit count moved away from minSearch
      if (this.displayControl.hasError('searchCondition') && digitCount !== minSearch) {
        const errors = { ...this.displayControl.errors };
        delete errors['searchCondition'];
        const remaining = Object.keys(errors).length ? errors : null;
        this.displayControl.setErrors(remaining);
        this.formControl.setErrors(remaining);
      }
    }
  }

  formatAadhar(value: string): string {
    return value.replace(/(\d{4})(?=\d)/g, '$1 ');
  }
}