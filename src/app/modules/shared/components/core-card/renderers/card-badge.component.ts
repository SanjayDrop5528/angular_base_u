import { Component, forwardRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { CardNodeConfig } from '../models/core-card.interface';
import { CoreCardUtils } from '../utils/core-card.utils';
import { CoreCardRendererComponent } from './core-card-renderer.component';

@Component({
  selector: 'app-card-badge',
  standalone: true,
  imports: [
    CommonModule,
    MatChipsModule,
    forwardRef(() => CoreCardRendererComponent)
  ],
  styles: [':host { display: contents; }'],
  template: `
    <div
      [ngClass]="getBadgeClass()"
      [ngStyle]="getStyles()" class="custom-chip">
    <div class="inner">
      @if (hasChildren()) {
        @for (child of config.children ?? []; track $index) {
          <app-core-card-renderer
            [config]="child"
            [data]="data">
          </app-core-card-renderer>
        }
      } @else {
        {{ getValue() }}
      }
    </div>
    </div>
  `
})
export class CardBadgeComponent {
  @Input() config!: CardNodeConfig;
  @Input() data: any;

  getStyles() {
    return CoreCardUtils.getNodeStyles(this.config);
  }

  hasChildren(): boolean {
    return !!this.config.children?.length;
  }

  getValue(): any {
    return (
      CoreCardUtils.getLeafValue(this.config, this.data) ??
      this.config.label ??
      ''
    );
  }

  getBadgeClass(): string {
    const color = this.config.badgeColor || 'primary';
    const classes = ['badge-' + color];

    if (this.config.className) {
      classes.push(this.config.className);
    }

    return classes.join(' ');
  }
}