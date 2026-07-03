import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FieldType, FormlyModule } from '@ngx-formly/core';
import { MatSliderModule } from '@angular/material/slider';

@Component({
  selector: 'formly-field-mat-slider',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormlyModule,
    MatSliderModule,
  ],
  template: `
    <div class="slider-container">
      <label class="slider-label" *ngIf="to.label">
        {{ to.label }}
        <span *ngIf="to.required" class="required-asterisk">*</span>
      </label>
      <div class="slider-wrapper">
        <mat-slider
          class="custom-slider"
          [min]="to.min || 0"
          [max]="to.max || 100"
          [step]="to.step || 1"
          [disabled]="to.disabled || formControl.disabled"
          discrete
        >
          <input
            matSliderThumb
            [formControl]="formControl"
            [formlyAttributes]="field"
          />
        </mat-slider>
        <span class="slider-value">
          <span class="current-val">{{ formControl.value ?? to.min ?? 0 }}</span>
          <span class="val-separator">/</span>
          <span class="max-val">{{ to.max || 100 }}</span>
        </span>
      </div>
      <div class="error-feedback" *ngIf="showError && formControl.errors">
        <formly-validation-message [field]="field"></formly-validation-message>
      </div>
    </div>
  `,
  styles: [`
    .slider-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 20px;
    }

    .slider-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted, #8b9bb4);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-family: var(--font-family);
    }

    .required-asterisk {
      color: var(--color-error, #ef4444);
      margin-left: 2px;
    }

    .slider-wrapper {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .custom-slider {
      flex: 1;
    }

    .slider-value {
      font-size: 0.85rem;
      min-width: 64px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      text-align: center;
      font-family: var(--font-family);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transition: all 0.25s ease;
      display: flex;
      align-items: end;
      justify-content: center;
      gap: 2px;
    }

    .current-val {
      font-weight: 700;
      color: var(--primary-color, #1a73e8);
    }

    .val-separator {
      color: var(--text-muted, #8b9bb4);
      opacity: 0.6;
      margin: 0 1px;
    }

    .max-val {
      color: var(--text-muted, #8b9bb4);
      font-weight: 500;
      font-size: 12px;
    }

    /* Light theme overrides for the capsule badge */
    :host-context([data-theme="morning"]) .slider-value {
      background: rgba(15, 23, 42, 0.04);
      border-color: rgba(15, 23, 42, 0.1);
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
    }

    .error-feedback {
      font-size: 12px;
      color: var(--color-error, #ef4444);
      margin-top: 4px;
    }
  `]
})
export class FormlyFieldMatSlider extends FieldType<any> {}