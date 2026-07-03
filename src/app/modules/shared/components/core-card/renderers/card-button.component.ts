import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { CardNodeConfig, CardActionEvent } from '../models/core-card.interface';
import { CoreCardUtils } from '../utils/core-card.utils';

/**
 * CardButtonComponent — Action trigger node (icon button or kebab menu).
 *
 * TWO MODES
 * ──────────────────────────────────────────────────────────────────
 * 1. Single button (default)
 *    Renders a Material icon-button (or label-only button when no icon).
 *    Clicking emits CardActionEvent with the configured `action` string.
 *
 *    { type: 'button', icon: 'edit', action: 'edit', label: 'Edit record' }
 *    { type: 'button', label: 'View', action: 'view', color: 'primary' }
 *
 * 2. Kebab / overflow menu  (menu: true)
 *    Renders a ⋮ icon-button that opens a dropdown.
 *    Each `menuItems` entry emits its own action string when clicked.
 *    Renamed from old `dot: true` / `actions: [...]` pattern.
 *
 *    {
 *      type: 'button',
 *      menu: true,
 *      menuItems: [
 *        { label: 'Edit',   icon: 'edit',   action: 'edit'   },
 *        { label: 'Delete', icon: 'delete', action: 'delete' }
 *      ]
 *    }
 *
 * Config options:
 * ──────────────────────────────────────────────────────────────────
 * icon       → Material icon name inside the button
 * label      → Tooltip text (single button) or visible text (no icon)
 *              Passed through ngx-translate.
 * action     → Emitted string on click (single button only)
 * color      → 'primary' | 'accent' | 'warn'  (Material theme token)
 * menu       → true → kebab menu mode           (was: dot)
 * menuItems  → menu entry list                  (was: actions)
 * ──────────────────────────────────────────────────────────────────
 *
 * Backward compatibility:
 *   `dot: true`           → treated as `menu: true`
 *   `actions: [...]`      → treated as `menuItems: [...]`
 *   `type: 'action'`      → rendered by this same component
 */
@Component({
  selector: 'app-card-button',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    TranslateModule
  ],
  // CardButtonComponent — strip the Material padding explicitly
  styles: [`
  :host { display: contents; }
  button.mat-mdc-icon-button {
    padding: 0;
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
`],
  template: `
    <!-- ── KEBAB / OVERFLOW MENU MODE ─────────────────────────── -->
    @if (isMenuMode() && getMenuItems()?.length > 0) {
      <button
        mat-icon-button
        [ngClass]="config.className"
        [ngStyle]="getStyles()"
        [color]="config.color || 'primary'"
        [matMenuTriggerFor]="overflowMenu"
        [attr.aria-label]="'More actions'">
        <mat-icon>more_vert</mat-icon>
      </button>

      <mat-menu #overflowMenu="matMenu">
        @for (item of getMenuItems(); track item.action) {
          <button mat-menu-item (click)="onMenuItemClick(item.action)">
            @if (item.icon) {
              <mat-icon>{{ item.icon }}</mat-icon>
            }
            <span>{{ item.label | translate }}</span>
          </button>
        }
      </mat-menu>
    }

    <!-- ── SINGLE BUTTON MODE ──────────────────────────────────── -->
    @else {
      <button
        mat-icon-button
        [ngClass]="config.className"
        [ngStyle]="getStyles()"
        [color]="config.color || 'primary'"
        [matTooltip]="getTooltip() | translate"
        (click)="onButtonClick()">

        <!-- Icon button -->
        <mat-icon *ngIf="config.icon">{{ config.icon }}</mat-icon>

        <!-- Label-only button (no icon) -->
        <span *ngIf="!config.icon">{{ config.label | translate }}</span>

      </button>
    }
  `
})
export class CardButtonComponent {
  @Input() config!: CardNodeConfig;
  @Input() data: any;
  @Output() actionTriggered = new EventEmitter<CardActionEvent>();

  // ── Mode resolution ─────────────────────────────────────────────────────
  /**
   * Returns true when this button should render as a kebab/overflow menu.
   * Supports both new `menu` flag and legacy `dot` flag.
   */
  isMenuMode(): boolean {
    return !!(this.config.menu ?? this.config.dot);
  }

  /**
   * Returns the menu items array.
   * Supports both new `menuItems` and legacy `actions`.
   */
  getMenuItems() {
    const menuItems:any = this.config?.menuItems ?? this.config?.actions ?? [];
    return menuItems?.filter((item: any) =>
      !this.isHidden(item)
    );
  }
  isHidden(item: any): boolean {
    const expr = item?.hideexpression;
    if (!expr || !expr.keyfield) return false;

    const fieldValue = this.data?.[expr.keyfield];
    const configValues = Array.isArray(expr.value)
      ? expr.value
      : [expr.value];

    switch ((expr.type ?? 'IN').toUpperCase()) {
      case 'IN':
        return configValues.includes(fieldValue);

      case 'NOT_IN':
        return !configValues.includes(fieldValue);

      default:
        return false;
    }
  }
  // ── Styles & tooltip ────────────────────────────────────────────────────
  getStyles(): Record<string, string> {
    return CoreCardUtils.getNodeStyles(this.config);
  }

  getTooltip(): string {
    return this.config.label || this.config.action || '';
  }

  // ── Event emission ──────────────────────────────────────────────────────
  onButtonClick(): void {
    if (this.config.action) {
      this.actionTriggered.emit({ action: this.config.action, data: this.data });
    }
  }

  onMenuItemClick(action: string): void {
    this.actionTriggered.emit({ action, data: this.data });
  }
}