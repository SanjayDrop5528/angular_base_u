import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CardNodeConfig } from '../models/core-card.interface';
import { CoreCardUtils } from '../utils/core-card.utils';

@Component({
    selector: 'app-card-status',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    template: `
    <span class="status-chip" [style.color]="statusConfig.color">
      <mat-icon>{{ statusConfig.icon }}</mat-icon>
      {{ displayValue }}
    </span>
  `,
    styles: [`
    .status-chip {
      display: inline-flex;
      align-items: center;
      height: 24px !important;
      gap: 4px;
      font-weight: 500;
    }

    mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
  `]
})
export class CardStatusComponent {
    @Input() config!: CardNodeConfig;
    @Input() data: any;

    get value(): string {
        return CoreCardUtils.getValue(this.data, this.config.key) || '-';
    }

    get displayValue(): string {
        const val = this.value || '';
        return val.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    get statusConfig() {
        const status = (this.value || '')
            .toLowerCase()
            .trim();

        switch (status) {
            case 'approved':
                return {
                    icon: 'check_circle',
                    color: '#4caf50'
                };

            case 'active':
                return {
                    icon: 'check_circle',
                    color: '#4caf50'
                };

            case 'rejected':
                return {
                    icon: 'cancel',
                    color: '#f44336'
                };

            case 'inactive':
                return {
                    icon: 'cancel',
                    color: '#f44336'
                };

            case 'hold':
                return {
                    icon: 'pause_circle',
                    color: '#ff9800'
                };

            case 'draft':
                return {
                    icon: 'edit_note',
                    color: '#9c27b0'
                };

            case 'pending':
            case 'pending approval':
                return {
                    icon: 'schedule',
                    color: '#2196f3'
                };
            case 'new':
                return {
                    icon: 'fiber_new',
                    color: '#15c05c' // Blue
                };

            case 'under_review':
                return {
                    icon: 'rate_review',
                    color: '#FF9800' // Orange
                };

            case 'report_ready':
                return {
                    icon: 'description',
                    color: '#4CAF50' // Green
                };

            case 'doctor_assigned':
                return {
                    icon: 'person',
                    color: '#9C27B0' // Purple
                };

            case 'paid':
                return {
                    icon: 'payments',
                    color: '#009688' // Teal
                };

            case 'closed':
                return {
                    icon: 'check_circle',
                    color: '#f44336' // Grey
                };

            case 'success':
                return {
                    icon: 'check_circle',
                    color: '#4caf50'
                };
            case 'failed':
                return {
                    icon: 'cancel',
                    color: '#f44336'
                };
            case 'initiated':
                return {
                    icon: 'schedule',
                    color: '#2196f3'
                };
            default:
                return {
                    icon: 'help_outline',
                    color: '#9e9e9e'
                };
        }
    }
}
