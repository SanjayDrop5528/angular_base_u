import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FieldType, FormlyModule } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-qa',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormlyModule,
  ],
  template: `
    <div class="qa-container">
      <div class="qa-question" *ngIf="to.label">
        <span class="qa-indicator">?</span>
        {{ to.label }}
        <span *ngIf="to.required" class="required-asterisk">*</span>
      </div>
      
      <!-- Text input / Textarea at the bottom - show if mode is not 'options' -->
      <div class="qa-answer-container" *ngIf="to.mode !== 'options'">
        <textarea
          *ngIf="to.rows; else defaultInput"
          [rows]="to.rows"
          [placeholder]="to.placeholder || 'Type your answer...'"
          [formControl]="formControl"
          [formlyAttributes]="field"
          class="qa-textarea"
        ></textarea>
        <ng-template #defaultInput>
          <input
            type="text"
            [placeholder]="to.placeholder || 'Type your answer...'"
            [formControl]="formControl"
            [formlyAttributes]="field"
            class="qa-input"
          />
        </ng-template>
      </div>

      <!-- If options are present, show options below - show if mode is not 'text' -->
      <div class="qa-options-container" *ngIf="to.mode !== 'text' && to.options && to.options.length">
        <div class="qa-options-label" *ngIf="to.optionsLabel">{{ to.optionsLabel }}</div>
        <div class="qa-options-list">
          <button
            type="button"
            *ngFor="let opt of to.options"
            [class.selected]="isOptionSelected(opt.value)"
            (click)="selectOption(opt.value)"
            class="qa-option-btn"
          >
            <span class="selected-icon" *ngIf="isOptionSelected(opt.value)">✓</span>
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div class="error-feedback" *ngIf="showError && formControl.errors">
        <formly-validation-message [field]="field"></formly-validation-message>
      </div>
    </div>
  `,
  styles: [`
    .qa-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
      background: var(--bg-card, rgba(18, 22, 31, 0.7));
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      border-left: 4px solid var(--primary-color, #1a73e8);
      border-radius: 4px var(--card-radius, 12px) var(--card-radius, 12px) 4px;
      padding: 24px;
      font-family: var(--font-family);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }
    .qa-container:hover {
      box-shadow: var(--glass-shadow, 0 8px 32px 0 rgba(0, 0, 0, 0.15));
      transform: translateY(-2px);
    }
    .qa-question {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-main, #f1f3f9);
      line-height: 1.4;
      font-family: var(--font-family);
    }
    .qa-indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      background: rgba(var(--primary-color-rgb, 26, 115, 232), 0.12);
      color: var(--primary-color, #1a73e8);
      border-radius: 50%;
      font-size: 12px;
      font-weight: bold;
    }
    .required-asterisk {
      color: var(--color-error, #ef4444);
      margin-left: 2px;
    }
    .qa-answer-container {
      width: 100%;
    }
    .qa-input {
      width: 100%;
      height: 42px;
      padding: 10px 14px;
      background: var(--hover-bg, rgba(0, 0, 0, 0.05));
      border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
      border-radius: var(--input-radius, 10px);
      color: var(--text-main, #0f172a);
      outline: none;
      font-size: 14px;
      font-family: var(--font-family);
      transition: var(--transition-smooth, all 0.3s cubic-bezier(0.4, 0, 0.2, 1));
    }
    .qa-input::placeholder {
      color: var(--text-muted, #64748b);
      opacity: 0.7;
    }
    .qa-input:focus {
      border-color: var(--border-focus, #1a73e8);
      background: var(--bg-card, #ffffff);
      box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb, 26, 115, 232), 0.15);
    }
    .qa-textarea {
      width: 100%;
      padding: 10px 14px;
      background: var(--hover-bg, rgba(0, 0, 0, 0.05));
      border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
      border-radius: var(--input-radius, 10px);
      color: var(--text-main, #0f172a);
      outline: none;
      font-size: 14px;
      font-family: var(--font-family);
      resize: vertical;
      transition: var(--transition-smooth, all 0.3s cubic-bezier(0.4, 0, 0.2, 1));
    }
    .qa-textarea::placeholder {
      color: var(--text-muted, #64748b);
      opacity: 0.7;
    }
    .qa-textarea:focus {
      border-color: var(--border-focus, #1a73e8);
      background: var(--bg-card, #ffffff);
      box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb, 26, 115, 232), 0.15);
    }
    .qa-options-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 4px;
    }
    .qa-options-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted, #64748b);
      font-family: var(--font-family);
    }
    .qa-options-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .qa-option-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--hover-bg, rgba(0, 0, 0, 0.04));
      border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
      border-radius: var(--btn-radius, 10px);
      padding: 10px 18px;
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text-muted, #64748b);
      font-family: var(--font-family);
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
      transition: var(--transition-smooth, all 0.3s cubic-bezier(0.4, 0, 0.2, 1));
    }
    .qa-option-btn:hover {
      background: rgba(var(--primary-color-rgb, 26, 115, 232), 0.06);
      border-color: rgba(var(--primary-color-rgb, 26, 115, 232), 0.35);
      color: var(--text-main, #0f172a);
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(var(--primary-color-rgb, 26, 115, 232), 0.1);
    }
    .qa-option-btn.selected {
      background: rgba(var(--primary-color-rgb, 26, 115, 232), 0.12);
      border: 1.5px solid var(--primary-color, #1a73e8);
      color: var(--primary-color, #1a73e8) !important;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(var(--primary-color-rgb, 26, 115, 232), 0.08);
      transform: translateY(-1.5px);
    }
    .selected-icon {
      margin-right: 6px;
      font-size: 14px;
      font-weight: bold;
      animation: iconScale 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes iconScale {
      from { transform: scale(0); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .error-feedback {
      font-size: 12px;
      color: var(--color-error, #ef4444);
      margin-top: 4px;
    }
  `]
})
export class FormlyFieldQA extends FieldType<any> {
  isOptionSelected(optValue: string): boolean {
    const currentVal = this.formControl.value;
    if (!currentVal) return false;
    if (Array.isArray(currentVal)) {
      return currentVal.includes(optValue);
    }
    if (typeof currentVal === 'string') {
      const parts = currentVal.split(',').map(s => s.trim());
      return parts.includes(optValue);
    }
    return currentVal === optValue;
  }

  selectOption(value: string) {
    if (!this.formControl) return;

    if (this.to.multiple) {
      const currentVal = this.formControl.value;
      let values: string[] = [];
      if (Array.isArray(currentVal)) {
        values = [...currentVal];
      } else if (typeof currentVal === 'string') {
        values = currentVal ? currentVal.split(',').map(s => s.trim()).filter(Boolean) : [];
      }
      
      const idx = values.indexOf(value);
      if (idx > -1) {
        values.splice(idx, 1);
      } else {
        values.push(value);
      }

      if (this.to.mode === 'options') {
        this.formControl.setValue(values);
      } else {
        this.formControl.setValue(values.join(', '));
      }
    } else {
      this.formControl.setValue(value);
    }
    this.formControl.markAsTouched();
    this.formControl.markAsDirty();
  }
}
