import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { FieldType } from '@ngx-formly/core';

@Component({
  selector: 'app-rating-input',
  standalone: false,
  template: `
    <div class="rating-field-container">
      <label class="rating-label" *ngIf="to.label">
        {{ to.label }}
        <span *ngIf="to.required" class="required-asterisk">*</span>
      </label>
      <div class="stars-row">
        <mat-icon
          *ngFor="let star of [1, 2, 3, 4, 5]"
          [class.active]="(hoveredRating || formControl.value) >= star"
          (mouseenter)="hoveredRating = star"
          (mouseleave)="hoveredRating = 0"
          (click)="setRating(star)">
          {{ ((hoveredRating || formControl.value) >= star) ? 'star' : 'star_border' }}
        </mat-icon>
      </div>
      <div class="error-feedback" *ngIf="showError && formControl.errors">
        <formly-validation-message [field]="field"></formly-validation-message>
      </div>
    </div>
  `,
  styles: [`
    .rating-field-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 20px;
    }
    .rating-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted, #94a3b8);
    }
    .required-asterisk {
      color: #ef4444;
      margin-left: 2px;
    }
    .stars-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .stars-row mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      cursor: pointer;
      color: #475569; /* Slate-600 */
      transition: transform 0.15s ease, color 0.15s ease;
    }
    .stars-row mat-icon:hover {
      transform: scale(1.2);
    }
    .stars-row mat-icon.active {
      color: #fbbf24; /* Amber-400 */
      text-shadow: 0 0 8px rgba(251, 191, 36, 0.4);
    }
    .error-feedback {
      font-size: 12px;
      color: #ef4444;
      margin-top: 4px;
    }
  `]
})
export class RatingInputFieldComponent extends FieldType<any> {
  hoveredRating: number = 0;

  public get FormControl(): FormControl {
    return this.formControl as FormControl;
  }

  setRating(rating: number) {
    if (this.formControl) {
      this.formControl.setValue(rating);
      this.formControl.markAsTouched();
      this.formControl.markAsDirty();
    }
  }
}
