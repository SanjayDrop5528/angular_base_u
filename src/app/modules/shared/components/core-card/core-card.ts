import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardNodeConfig, CardActionEvent } from './models/core-card.interface';
import { CoreCardRendererComponent } from './renderers/core-card-renderer.component';

@Component({
  selector: 'core-card',
  standalone: true,
  imports: [CommonModule, CoreCardRendererComponent],
  template: `
    <div class="core-card core-card--layout" (click)="onCardClick($event)">
      @if (cardLayout) {
        <app-core-card-renderer
          [config]="cardLayout"
          [data]="data"
          (actionTriggered)="onAction($event)">
        </app-core-card-renderer>
      }
    </div>
  `,
  styleUrl: './core-card.scss'
})
export class CoreCard {
  @Input() cardLayout?: CardNodeConfig;
  @Input() data: any = {};
  @Input() set cardSchema(val: any) { this.cardLayout = val; }
  @Input() fieldTemplateMap: any;
  @Input() actionCallback?: (event: CardActionEvent) => void;
  @Output() actionTriggered = new EventEmitter<CardActionEvent>();

  onCardClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('button, .card-actions')) return;
    this.onAction({ action: 'view', data: this.data });
  }

  onAction(event: CardActionEvent) {
    this.actionTriggered.emit(event);
    this.actionCallback?.(event);
  }
}

export type { CardSchema } from './models/core-card.interface';
