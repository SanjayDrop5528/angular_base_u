import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardNodeConfig } from '../models/core-card.interface';
import { CoreCardUtils } from '../utils/core-card.utils';

@Component({
  selector: 'app-card-divider',
  standalone: true,
  imports: [CommonModule],
  template: `<hr [ngClass]="config.className" [ngStyle]="getStyles()" class="card-divider" />`,
  styles: [':host { display: contents; }'],

})
export class CardDividerComponent {
  @Input() config!: CardNodeConfig;

  getStyles() {
    return CoreCardUtils.getNodeStyles(this.config);
  }
}
