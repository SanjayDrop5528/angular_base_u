import { Component, Input, Output, EventEmitter, forwardRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardNodeConfig, CardActionEvent } from '../models/core-card.interface';
import { CoreCardUtils } from '../utils/core-card.utils';
import { CoreCardRendererComponent } from './core-card-renderer.component';

@Component({
  selector: 'app-card-list',
  standalone: true,
  imports: [CommonModule, forwardRef(() => CoreCardRendererComponent)],
  styles: [':host { display: block; min-width: 0; }'],
  template: `
    <div [ngClass]="getListClass()" [ngStyle]="getStyles()" style="position: relative; display: inline-flex; flex-wrap: wrap;">
      @for (item of getVisibleItems(); track $index; let last = $last) {
        <ng-container *ngIf="config.itemConfig">
          <app-core-card-renderer
            [config]="resolveItemConfig(item)"
            [data]="item"
            (actionTriggered)="onAction($event)">
          </app-core-card-renderer>

          @if (config.separator && !last) {
            <span style="color:#80808052; margin: 0 4px;">{{ getSeparator() }}</span>
          }
        </ng-container>
      }

      @if (hasExtraItems()) {
        <span *ngIf="config.separator && getVisibleItems().length > 0" style="color:#80808052; margin: 0 4px;">{{ getSeparator() }}</span>
        <span class="extra-items-badge" (click)="togglePopup($event)" style="cursor: pointer;width:fit-content; color: var(--primary-color, #1A73E8); font-weight: 500; font-size: 11px; display: inline-flex; align-items: center; padding: 2px 6px; background-color: rgba(26,115,232,0.08); border-radius: 4px; transition: all 0.2s ease;">
          +{{ getExtraCount() }}
        </span>

        <div *ngIf="showPopup" (click)="$event.stopPropagation()" class="extra-items-popup" style="position: absolute; bottom: 100%; right: 0; margin-bottom: 8px; z-index: 1000; background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); padding: 12px; display: flex; flex-direction: column; gap: 6px; min-width: 140px; text-align: left;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 6px; margin-bottom: 4px; font-weight: 600; font-size: 11px; color: #5f6368; letter-spacing: 0.3px; text-transform: uppercase;">
            <span>{{ config.labelKey || config.key || 'Items' }}</span>
            <span (click)="closePopup($event)" style="cursor: pointer; color: #dadce0; font-size: 16px; font-weight: bold; line-height: 1; transition: color 0.2s;">&times;</span>
          </div>
          <div style="max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px;">
            @for (item of getListItems(); track $index) {
              <app-core-card-renderer
                [config]="resolveItemConfig(item)"
                [data]="item"
                (actionTriggered)="onAction($event)">
              </app-core-card-renderer>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class CardListComponent {
  @Input() config!: CardNodeConfig;
  @Input() data: any;
  @Output() actionTriggered = new EventEmitter<CardActionEvent>();

  showPopup = false;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    this.showPopup = false;
  }

  get limit(): number | undefined {
    return this.config.limit || this.config.itemConfig?.['limit'];
  }

  getVisibleItems(): any[] {
    const items = this.getListItems();
    const lim = this.limit;
    if (lim && items.length > lim) {
      return items.slice(0, lim);
    }
    return items;
  }

  hasExtraItems(): boolean {
    const items = this.getListItems();
    const lim = this.limit;
    return !!(lim && items.length > lim);
  }

  getExtraCount(): number {
    const items = this.getListItems();
    const lim = this.limit;
    return lim ? items.length - lim : 0;
  }

  togglePopup(event: MouseEvent) {
    event.stopPropagation();
    this.showPopup = !this.showPopup;
  }

  closePopup(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.showPopup = false;
  }

  getListClass(): string {
    return this.config.className || '';
  }

  getStyles() {
    const styles: { [key: string]: string } = {
      display: 'flex',
      'flex-direction': this.config.direction === 'column' ? 'column' : 'row',
      'flex-wrap': this.config.direction === 'column' ? 'nowrap' : 'wrap',
      gap: '6px',
      ...CoreCardUtils.getNodeStyles(this.config)
    };
    return styles;
  }
  getSeparator(): string {
    switch (this.config.separator) {
      case 'pipe':
        return ' | ';

      case 'slash':
        return ' / ';

      case 'dash':
        return ' - ';

      case 'comma':
      default:
        return ', ';
    }
  }
  getListItems(): any[] {
    const items = CoreCardUtils.getValue(this.data, this.config.key);
    return Array.isArray(items) ? items : [];
  }

  /**
   * If the list item is a primitive (string/number), inject it as `value`
   * directly into the itemConfig so renderers like badge/text display it correctly.
   */
  resolveItemConfig(item: any): CardNodeConfig {
    const base = { ...this.config.itemConfig! };

    if (typeof item !== 'object' || item === null) {
      return {
        ...base,
        value: item
      };
    }

    if (base.labelKey) {
      return {
        ...base,
        value: item[base.labelKey]
      };
    }

    return base;
  }

  onAction(event: CardActionEvent) {
    this.actionTriggered.emit(event);
  }
}
