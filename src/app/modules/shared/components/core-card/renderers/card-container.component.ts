import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardNodeConfig, CardActionEvent } from '../models/core-card.interface';
import { CoreCardUtils } from '../utils/core-card.utils';
import { CoreCardRendererComponent } from './core-card-renderer.component';

@Component({
  selector: 'app-card-container',
  standalone: true,
  imports: [CommonModule, forwardRef(() => CoreCardRendererComponent)],
  styles: [':host { display: contents; }'],
  template: `
    @if (shouldRender()) {
      <div [ngClass]="config.className" [ngStyle]="getStyles()">
        @for (child of visibleChildren(); track $index) {
          <app-core-card-renderer 
            [config]="child" 
            [data]="data"
            (actionTriggered)="onAction($event)">
          </app-core-card-renderer>
        }
      </div>
    }
  `
})
export class CardContainerComponent {
  @Input() config!: CardNodeConfig;
  @Input() data: any;
  @Output() actionTriggered = new EventEmitter<CardActionEvent>();

  getStyles() {
    return CoreCardUtils.getNodeStyles(this.config);
  }

  shouldRender(): boolean {
    return CoreCardUtils.containerHasVisibleContent(this.config, this.data);
  }

  visibleChildren(): CardNodeConfig[] {
    return CoreCardUtils.getVisibleChildren(this.config, this.data);
  }

  onAction(event: CardActionEvent) {
    this.actionTriggered.emit(event);
  }
}