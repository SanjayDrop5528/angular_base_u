import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardNodeConfig, CardActionEvent } from '../models/core-card.interface';
import { CoreCardUtils } from '../utils/core-card.utils';

// ── Child components ──────────────────────────────────────────────────────────
import { CardTextComponent } from './card-text.component';
import { CardAvatarComponent } from './card-avatar.component';
import { CardIconComponent } from './card-icon.component';
import { CardButtonComponent } from './card-button.component';
import { CardBadgeComponent } from './card-badge.component';
import { CardDividerComponent } from './card-divider.component';
import { CardContainerComponent } from './card-container.component';
import { CardListComponent } from './card-list.component';
import { CardDateComponent } from './card-date.component';
import { CardContactComponent } from './card-contact.component';
import { CardStatusComponent } from './card-status.component';
import { CardBooleanComponent } from './card-boolean.component';
import { CardNumberComponent } from "./care-number.component";

/**
 * CoreCardRendererComponent — Central dispatch hub for the card DSL.
 *
 * Receives a single `config` node and `data` object, decides which child
 * component to render, and emits CardActionEvents upward.
 *
 * Visibility rules (applied BEFORE rendering):
 *   • hideExpression matches            → hidden
 *   • type === 'container'              → always rendered (container handles its own visibility)
 *   • type === 'avatar'                 → always rendered (shows initial on empty image)
 *   • All other nodes with a `key`      → hidden when the resolved value is empty
 *   • Nodes without a key (decorative)  → always rendered
 *
 * Type → component mapping:
 * ──────────────────────────────────────────────────────────────────────────
 *   container  → CardContainerComponent
 *   list       → CardListComponent
 *   avatar     → CardAvatarComponent
 *   icon       → CardIconComponent
 *   date       → CardDateComponent
 *   number     → CardNumberComponent
 *   boolean    → CardBooleanComponent
 *   status     → CardStatusComponent
 *   contact    → CardContactComponent
 *   badge      → CardBadgeComponent
 *   button     → CardButtonComponent
 *   action     → CardButtonComponent  (alias — backward compat)
 *   divider    → CardDividerComponent
 *   text       → CardTextComponent    (default fallback)
 *
 *   Deprecated aliases handled via CardTextComponent with variant:
 *   title      → CardTextComponent (variant:'title')
 *   subtitle   → CardTextComponent (variant:'subtitle')
 *   stat       → CardTextComponent (variant:'stat')
 *   field      → CardTextComponent (variant:'default')
 */
@Component({
  selector: 'app-core-card-renderer',
  standalone: true,
  imports: [
    CommonModule,
    CardContainerComponent,
    CardListComponent,
    CardAvatarComponent,
    CardIconComponent,
    CardDateComponent,
    CardButtonComponent,
    CardBadgeComponent,
    CardContactComponent,
    CardDividerComponent,
    CardTextComponent,
    CardBooleanComponent,
    CardStatusComponent,
    CardNumberComponent
  ],
  styles: [':host { display: contents; }'],
  template: `
    @if (isVisible()) {
      @switch (config.type) {

        <!-- ── Layout ───────────────────────────────────────────── -->
        @case ('container') {
          <app-card-container
            [config]="config" [data]="data"
            (actionTriggered)="onAction($event)">
          </app-card-container>
        }
        @case ('list') {
          <app-card-list
            [config]="config" [data]="data"
            (actionTriggered)="onAction($event)">
          </app-card-list>
        }

        <!-- ── Content ───────────────────────────────────────────── -->
        @case ('avatar') {
          <app-card-avatar [config]="config" [data]="data"></app-card-avatar>
        }
        @case ('icon') {
          <app-card-icon [config]="config" [data]="data"></app-card-icon>
        }
        @case ('date') {
          <app-card-date [config]="config" [data]="data"></app-card-date>
        }
        @case ('number') {
          <app-card-number [config]="config" [data]="data"></app-card-number>
        }
        @case ('boolean') {
          <app-card-boolean [config]="config" [data]="data"></app-card-boolean>
        }
        @case ('status') {
          <app-card-status [config]="config" [data]="data"></app-card-status>
        }
        @case ('contact') {
          <app-card-contact [config]="config" [data]="data"></app-card-contact>
        }
        @case ('badge') {
          <app-card-badge [config]="config" [data]="data"></app-card-badge>
        }

        <!-- ── Actions ───────────────────────────────────────────── -->
        @case ('button') {
          <app-card-button
            [config]="config" [data]="data"
            (actionTriggered)="onAction($event)">
          </app-card-button>
        }
        <!-- 'action' is a backward-compat alias for 'button' -->
        @case ('action') {
          <app-card-button
            [config]="config" [data]="data"
            (actionTriggered)="onAction($event)">
          </app-card-button>
        }

        <!-- ── Structural ─────────────────────────────────────────── -->
        @case ('divider') {
          <app-card-divider [config]="config"></app-card-divider>
        }

        <!-- ── Default: text (also handles title/subtitle/stat/field aliases) -->
        @default {
          <app-card-text [config]="config" [data]="data"></app-card-text>
        }

      }
    }
  `
})
export class CoreCardRendererComponent {
  @Input() config!: CardNodeConfig;
  @Input() data: any;
  @Output() actionTriggered = new EventEmitter<CardActionEvent>();

  constructor(private cdr: ChangeDetectorRef) { }

  /**
   * Determines whether this node should render at all.
   *
   * Visibility rules (in order):
   *  1. hideExpression matches → always hidden
   *  2. container              → always visible (handles its own children)
   *  3. avatar                 → always visible (shows initial as fallback)
   *  4. divider                → always visible (parent already filtered it)
   *  5. has a key              → visible only when the resolved value is non-empty
   *  6. no key (decorative)    → always visible
   */
  isVisible(): boolean {
    if (CoreCardUtils.isHiddenByExpression(this.config, this.data)) return false;
    if (this.config.type === 'container') return true;
    if (this.config.type === 'avatar') return true;
    if (this.config.type === 'divider') return true;
    return !CoreCardUtils.isFieldEmpty(this.config, this.data);
  }

  onAction(event: CardActionEvent): void {
    this.actionTriggered.emit(event);
  }
}