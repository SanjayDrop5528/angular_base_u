import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardNodeConfig } from '../models/core-card.interface';
import { CoreCardUtils } from '../utils/core-card.utils';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-card-boolean',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div
      class="boolean-wrapper"
      [ngStyle]="getWrapperStyles()">

      <ng-container *ngIf="config.variant === 'payment'; else defaultBoolean">

        <span
          class="payment-chip"
          [style.background-color]="value ? '#d0ffd4' : '#ffd5dc'"
          [style.color]="value ? '#2e7d32' : '#c62828'">

          <mat-icon
            [style.color]="value ? '#2e7d32' : '#c62828'">
            {{ icon }}
          </mat-icon>

          {{ value ? 'Paid' : 'Unpaid' }}

        </span>

      </ng-container>

      <ng-template #defaultBoolean>
        <mat-icon [ngStyle]="getIconStyles()">
          {{ icon }}
        </mat-icon>
      </ng-template>

    </div>
  `,
  styles: [`
    .boolean-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .payment-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 500;
      line-height: 1;
      white-space: nowrap;
    }

    .payment-chip mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
  `]
})
export class CardBooleanComponent {

  @Input() config!: CardNodeConfig;
  @Input() data: any;

  get value(): boolean {
    return !!CoreCardUtils.getValue(this.data, this.config.key);
  }

  get icon(): string {
    return this.value ? 'check' : 'close';
  }

  getWrapperStyles() {
    const styles: any = {};

    if (this.config.backgroundColor) {
      styles.background = this.config.backgroundColor;
    }

    if (this.config.shape === 'circle') {
      styles['border-radius'] = '50%';
    }

    if (this.config.shape === 'square') {
      styles['border-radius'] = '6px';
    }

    return styles;
  }

  getIconStyles() {
    const styles: any = {};

    const size = this.config.fontSize || 18;

    styles['font-size'] = CoreCardUtils.toCssUnit(size);
    styles.width = CoreCardUtils.toCssUnit(size);
    styles.height = CoreCardUtils.toCssUnit(size);

    styles.color = this.value
      ? (this.config.trueColor || 'var(--success-color, #4caf50)')
      : (this.config.falseColor || 'var(--warn-color, #f44336)');

    return styles;
  }
}