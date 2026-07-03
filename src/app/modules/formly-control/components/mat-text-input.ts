import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FieldType, FormlyModule } from '@ngx-formly/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Subscription } from 'rxjs';

/**
 * Standalone Material text input formly type.
 * Register as: { name: 'mat-text-input', component: MatTextInput }
 */
@Component({
  selector: 'mat-text-input',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormlyModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <mat-form-field style="width: 100%;">
      <mat-label>{{ field.props?.label }}</mat-label>
      <input
        matInput
        [type]="inputType"
        [placeholder]="field.props?.placeholder || ''"
        [required]="!!field.props?.required"
        [readonly]="!!field.props?.readonly"
        [formControl]="formControl"
        [formlyAttributes]="field"
        [attr.maxlength]="field.props?.maxLength"
        (keypress)="field.props?.onlyNumbers ? onlyNumbers($event) : (field.props?.onlyLetters ? onlyLetters($event) : null)"
        (input)="onInput($event)"
        (paste)="field.props?.onlyNumbers ? preventPasteNonNumeric($event) : (field.props?.onlyLetters ? preventPasteNonLetters($event) : null)"
      />
      <mat-error *ngIf="formControl.hasError('required')">
        {{ field.props?.label }} is required
      </mat-error>
      <mat-error *ngIf="formControl.hasError('email')">
        Invalid email address
      </mat-error>
      <mat-error *ngIf="formControl.hasError('pattern')">
        {{ field.props?.patternErrorMessage || 'Invalid format' }}
      </mat-error>
      <mat-error *ngIf="formControl.hasError('minlength')">
        {{ field.props?.label }} must be at least {{ field.props?.minLength }} digits
      </mat-error>
      <mat-error *ngIf="formControl.hasError('maxlength')">
        {{ field.props?.label }} cannot exceed {{ field.props?.maxLength }} digits
      </mat-error>
    </mat-form-field>
    <div class="template-variable-preview" *ngIf="shouldShowTemplateVariables">
      <div class="template-variable-heading">Detected variables</div>
      <div class="template-variable-list" *ngIf="templateVariables.length; else noTemplateVariables">
        <span class="template-variable-chip" *ngFor="let variable of templateVariables">
          {{ variable }}
        </span>
      </div>
      <ng-template #noTemplateVariables>
        <div class="template-variable-empty">No variables detected</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .template-variable-preview {
      margin-top: -12px;
      margin-bottom: 16px;
    }

    .template-variable-heading {
      color: #5f6368;
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 6px;
    }

    .template-variable-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .template-variable-chip {
      background: #eef3ff;
      border: 1px solid #c9d8ff;
      border-radius: 999px;
      color: #244a9b;
      font-size: 12px;
      line-height: 1;
      padding: 6px 10px;
      word-break: break-word;
    }

    .template-variable-empty {
      color: #8a8f98;
      font-size: 12px;
    }
  `],
})
export class MatTextInput extends FieldType<any> implements OnInit, OnDestroy {
  templateVariables: string[] = [];
  private valueChangesSubscription?: Subscription;

  get shouldShowTemplateVariables(): boolean {
    return !!this.field.props?.['detectTemplateVariables'];
  }

  get inputType(): string {
    return this.field.props?.type === 'json' ? 'text' : (this.field.props?.type || 'text');
  }

  ngOnInit(): void {
    this.updateTemplateVariables();
    this.valueChangesSubscription = this.formControl.valueChanges.subscribe(() => {
      this.updateTemplateVariables();
    });
  }

  ngOnDestroy(): void {
    this.valueChangesSubscription?.unsubscribe();
  }

  onlyNumbers(event: any) {
    const k = event.charCode;
    return (k >= 48 && k <= 57);
  }

  onInput(event: Event): void {
    if (this.field.props?.['onlyLetters']) {
      const input = event.target as HTMLInputElement;
      const cleanValue = input.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
      if (cleanValue !== input.value) {
        input.value = cleanValue;
        this.formControl.setValue(cleanValue, { emitEvent: false });
      }
    }

    if (
      this.field.props?.['firstletter'] ||
      this.field.props?.['firstLetter'] ||
      this.field.props?.['firstLetterCaps'] ||
      this.field.props?.['capitalize']
    ) {
      this.capitalizeInput(event);
    }

     if (
    this.field.props?.['commaSeparation'] ||
    this.field.props?.['commaSeparator']
  ) {
    this.formatAmountWithLocale(event);
  }

    this.updateTemplateVariables();
  }



formatAmountWithLocale(event: Event): void {
  const input = event.target as HTMLInputElement;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const originalLength = input.value.length;

  const rawValue = input.value.replace(/[^\d.]/g, '');

  if (!rawValue) {
    return;
  }

  // Default locale = India
  const locale = this.field.props?.locale || 'en-IN';

  const numberValue = Number(rawValue);

  if (!isNaN(numberValue)) {
    const formatted = numberValue.toLocaleString(locale);

    input.value = formatted;

    this.formControl.setValue(formatted, {
      emitEvent: false
    });
    
    // Attempt to keep cursor in somewhat the right place after formatting
    if (start !== null && end !== null) {
      try {
        const lengthDiff = formatted.length - originalLength;
        input.setSelectionRange(start + lengthDiff, end + lengthDiff);
      } catch (e) {
        // Ignore errors
      }
    }
  }
}

  capitalizeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    let value = input.value;
    if (value.length > 0) {
      value = value.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    input.value = value;
    this.formControl.setValue(value, { emitEvent: false });
    
    if (start !== null && end !== null) {
      try {
        input.setSelectionRange(start, end);
      } catch (e) {
        // Ignore errors
      }
    }
  }

  preventPasteNonNumeric(event: ClipboardEvent): void {
    const pasteData = event.clipboardData?.getData('text') || '';
    if (!/^\d+$/.test(pasteData)) {
      event.preventDefault();
    }
  }

  onlyLetters(event: any) {
    const k = event.charCode || event.keyCode;
    if (k === 0 || k === 8 || k === 13 || k === 9) {
      return true;
    }
    const inputChar = String.fromCharCode(k);
    return /^[a-zA-ZÀ-ÿ\s]$/.test(inputChar);
  }

  preventPasteNonLetters(event: ClipboardEvent): void {
    const pasteData = event.clipboardData?.getData('text') || '';
    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(pasteData)) {
      event.preventDefault();
    }
  }

  updateTemplateVariables(): void {
    if (!this.shouldShowTemplateVariables) {
      this.templateVariables = [];
      return;
    }

    const value = `${this.formControl.value || ''}`;
    const variables: string[] = [];
    const seen = new Set<string>();
    const matcher = /{{\s*([a-zA-Z_][a-zA-Z0-9_.-]*)\s*}}/g;
    let match: RegExpExecArray | null;

    while ((match = matcher.exec(value)) !== null) {
      const variable = match[1];
      if (!seen.has(variable)) {
        seen.add(variable);
        variables.push(variable);
      }
    }

    this.templateVariables = variables;
  }
}
