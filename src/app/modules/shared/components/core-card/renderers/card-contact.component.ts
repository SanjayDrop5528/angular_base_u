import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardNodeConfig } from '../models/core-card.interface';
import { CoreCardUtils } from '../utils/core-card.utils';

@Component({
    selector: 'app-card-contact',
    standalone: true,
    imports: [CommonModule],
    template: `
<a
  *ngIf="value"
  [href]="href"
  class="contact-link"
  [ngClass]="config.className"
  [ngStyle]="getStyles()"
  target="_blank"
  rel="noopener"
  (click)="onLinkClick($event)">
  {{ displayValue }}
</a>

<span
  *ngIf="!value"
  [ngClass]="config.className"
  [ngStyle]="getStyles()">
  -
</span>
  `,
    styles: [`
    .contact-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      color: inherit;
      cursor: pointer;
    }

    .contact-link:hover {
      text-decoration: underline;
    }
  `]
})
export class CardContactComponent {
    @Input() config!: CardNodeConfig;
    @Input() data: any;

    get value(): string {
        return CoreCardUtils.getValue(this.data, this.config.key) || '';
    }
    getStyles() {
        return CoreCardUtils.getNodeStyles(this.config);
    }
    get displayValue(): string {
        const value = this.value;

        if (
            this.config.textLength != null &&
            value.length > this.config.textLength
        ) {
            return value.substring(0, this.config.textLength) + '...';
        }

        return value;
    }
    onLinkClick(event: MouseEvent): void {
        event.stopPropagation();
    }
    get href(): string {
        switch (this.config.subType) {
            case 'phone':
                return `tel:${this.value}`;

            case 'email':
                return `mailto:${this.value}`;

            case 'website':
                return this.value.startsWith('http')
                    ? this.value
                    : `https://${this.value}`;

            default:
                return '#';
        }
    }
}