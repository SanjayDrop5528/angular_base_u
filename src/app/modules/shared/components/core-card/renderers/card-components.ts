// ════════════════════════════════════════════════════════════════════════════
// card-badge.component.ts
// ════════════════════════════════════════════════════════════════════════════
/**
 * CardBadgeComponent — Compact pill/chip display using Angular Material.
 *
 * Renders a small coloured badge for status labels, tags, or category values.
 * Value is resolved from `key` in data, falling back to the static `label`.
 *
 * Config options:
 *   badgeColor → 'primary' | 'accent' | 'warn' | 'success' | 'info'
 *                Maps to CSS class badge-<color> (see core-card.scss)
 *   key        → dot-path to the value in data
 *   label      → static fallback text when key is absent
 *   className  → extra CSS classes
 *
 * Usage examples:
 *   { type: 'badge', key: 'category', badgeColor: 'info' }
 *   { type: 'badge', label: 'New', badgeColor: 'success' }
 */
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { CardNodeConfig } from '../models/core-card.interface';
import { CoreCardUtils } from '../utils/core-card.utils';

@Component({
    selector: 'app-card-badge',
    standalone: true,
    imports: [CommonModule, MatChipsModule],
    styles: [':host { display: contents; }'],
    template: `
    <mat-chip [ngClass]="getBadgeClass()" [ngStyle]="getStyles()">
      {{ getValue() }}
    </mat-chip>
  `
})
export class CardBadgeComponent {
    @Input() config!: CardNodeConfig;
    @Input() data: any;

    getStyles() { return CoreCardUtils.getNodeStyles(this.config); }

    getValue(): string {
        return CoreCardUtils.getLeafValue(this.config, this.data) ?? this.config.label ?? '';
    }

    getBadgeClass(): string {
        const classes = ['badge-' + (this.config.badgeColor || 'primary')];
        if (this.config.className) classes.push(this.config.className);
        return classes.join(' ');
    }
}


// ════════════════════════════════════════════════════════════════════════════
// card-boolean.component.ts
// ════════════════════════════════════════════════════════════════════════════
/**
 * CardBooleanComponent — Icon indicator for true / false values.
 *
 * Resolves the value at `key` as a boolean and renders:
 *   true  → check icon  (trueColor  or --success-color)
 *   false → close icon  (falseColor or --warn-color)
 *
 * Config options:
 *   key         → dot-path to the boolean field in data
 *   trueColor   → CSS colour for the check icon (default: var(--success-color))
 *   falseColor  → CSS colour for the close icon (default: var(--warn-color))
 *   fontSize    → icon size in px (default: 18)
 *   shape       → 'circle' | 'square' — wraps icon in a shaped background
 *   backgroundColor → fill colour for the shape background
 *
 * Usage examples:
 *   { type: 'boolean', key: 'isActive' }
 *   { type: 'boolean', key: 'verified', trueColor: '#2196f3', shape: 'circle' }
 */
import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-card-boolean',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    styles: [':host { display: contents; } .boolean-wrapper { display: inline-flex; align-items: center; justify-content: center; }'],
    template: `
    <div class="boolean-wrapper" [ngStyle]="getWrapperStyles()">
      <mat-icon [ngStyle]="getIconStyles()">{{ icon }}</mat-icon>
    </div>
  `
})
export class CardBooleanComponent {
    @Input() config!: CardNodeConfig;
    @Input() data: any;

    get value(): boolean { return !!CoreCardUtils.getValue(this.data, this.config.key); }
    get icon(): string { return this.value ? 'check' : 'close'; }

    getWrapperStyles(): Record<string, string> {
        const s: Record<string, string> = {};
        if (this.config.backgroundColor) s['background'] = this.config.backgroundColor;
        if (this.config.shape === 'circle') s['border-radius'] = '50%';
        if (this.config.shape === 'square') s['border-radius'] = '6px';
        return s;
    }

    getIconStyles(): Record<string, string> {
        const size = CoreCardUtils.toCssUnit(this.config.fontSize || 18);
        return {
            'font-size': size,
            'width': size,
            'height': size,
            'color': this.value
                ? (this.config.trueColor || 'var(--success-color, #4caf50)')
                : (this.config.falseColor || 'var(--warn-color,    #f44336)')
        };
    }
}


// ════════════════════════════════════════════════════════════════════════════
// card-contact.component.ts
// ════════════════════════════════════════════════════════════════════════════
/**
 * CardContactComponent — Tappable link for phone, email, or website values.
 *
 * Renders an <a> tag with the appropriate href scheme.
 * Renders a dash when the value is empty.
 *
 * Config options:
 *   key      → dot-path to the contact value in data
 *   subType  → 'phone'   → tel:<value>
 *              'email'   → mailto:<value>
 *              'website' → https://<value>  (auto-prefixed when missing)
 *
 * Usage examples:
 *   { type: 'contact', key: 'phone',   subType: 'phone'   }
 *   { type: 'contact', key: 'email',   subType: 'email'   }
 *   { type: 'contact', key: 'website', subType: 'website' }
 */
@Component({
    selector: 'app-card-contact',
    standalone: true,
    imports: [CommonModule],
    styles: [`
    :host { display: contents; }
    .contact-link { display: inline-flex; align-items: center; gap: 6px;
                    text-decoration: none; color: inherit; cursor: pointer; }
    .contact-link:hover { text-decoration: underline; }
  `],
    template: `
    <a *ngIf="value" [href]="href" class="contact-link"
       [ngClass]="config.className" [ngStyle]="getStyles()"
       target="_blank" rel="noopener">{{ value }}</a>

    <span *ngIf="!value" [ngClass]="config.className" [ngStyle]="getStyles()">—</span>
  `
})
export class CardContactComponent {
    @Input() config!: CardNodeConfig;
    @Input() data: any;

    get value(): string { return CoreCardUtils.getValue(this.data, this.config.key) || ''; }
    getStyles() { return CoreCardUtils.getNodeStyles(this.config); }

    get href(): string {
        switch (this.config.subType) {
            case 'phone': return `tel:${this.value}`;
            case 'email': return `mailto:${this.value}`;
            case 'website': return this.value.startsWith('http') ? this.value : `https://${this.value}`;
            default: return '#';
        }
    }
}


// ════════════════════════════════════════════════════════════════════════════
// card-status.component.ts
// ════════════════════════════════════════════════════════════════════════════
/**
 * CardStatusComponent — Icon + label chip for workflow/lifecycle statuses.
 *
 * Built-in status → icon/colour mappings:
 *   active / approved   → check_circle  (green)
 *   inactive / rejected → cancel        (red)
 *   hold                → pause_circle  (orange)
 *   draft               → edit_note     (purple)
 *   pending / pending approval → schedule (blue)
 *   (anything else)     → help_outline  (grey)
 *
 * Config options:
 *   key → dot-path to the status string in data
 *
 * Usage examples:
 *   { type: 'status', key: 'approvalStatus' }
 *   { type: 'status', key: 'patient.status' }
 */
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-card-status',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    styles: [`
    :host { display: contents; }
    .status-chip { display: inline-flex; align-items: center; gap: 4px; font-weight: 500; }
    mat-icon    { font-size: 18px; width: 18px; height: 18px; }
  `],
    template: `
    <span class="status-chip" [style.color]="statusConfig.color">
      <mat-icon>{{ statusConfig.icon }}</mat-icon>
      {{ value }}
    </span>
  `
})
export class CardStatusComponent {
    @Input() config!: CardNodeConfig;
    @Input() data: any;

    get value(): string { return CoreCardUtils.getValue(this.data, this.config.key) || '-'; }

    get statusConfig(): { icon: string; color: string } {
        switch ((this.value || '').toLowerCase().trim()) {
            case 'approved':
            case 'active': return { icon: 'check_circle', color: '#4caf50' };
            case 'rejected':
            case 'inactive': return { icon: 'cancel', color: '#f44336' };
            case 'hold': return { icon: 'pause_circle', color: '#ff9800' };
            case 'draft': return { icon: 'edit_note', color: '#9c27b0' };
            case 'pending':
            case 'pending approval': return { icon: 'schedule', color: '#2196f3' };
            default: return { icon: 'help_outline', color: '#9e9e9e' };
        }
    }
}


// ════════════════════════════════════════════════════════════════════════════
// card-icon.component.ts
// ════════════════════════════════════════════════════════════════════════════
/**
 * CardIconComponent — A Material icon, static or data-driven.
 *
 * Icon resolution order (when key is provided):
 *   1. config.iconMap[normalizedValue]  — your custom value → icon overrides
 *   2. Built-in VALUE_ICON_MAP          — common values (male/female/active…)
 *   3. The raw value itself             — assumes it's already an icon name
 *
 * When only `icon` is set, renders that literal icon name.
 * Falls back to 'help_outline' when nothing resolves.
 *
 * Config options:
 *   icon       → static Material icon name
 *   key        → dot-path whose value is mapped to an icon
 *   iconMap    → custom { value: iconName } override map
 *   color      → 'primary' | 'accent' | 'warn'  (CSS variable mapping)
 *   fontSize   → icon size in px
 *
 * Usage examples:
 *   { type: 'icon', icon: 'person' }
 *   { type: 'icon', key: 'gender', iconMap: { male: 'male', female: 'female' } }
 *   { type: 'icon', key: 'status', color: 'primary' }
 */
const VALUE_ICON_MAP: Record<string, string> = {
    male: 'boy', female: 'girl', other: 'person', blood: "Water Drop",
    doctor: 'Stethoscope', patient: "", bc: 'Supervisor Account', superadmin: 'Admin Panel Settings',
    active: 'check_circle', inactive: 'cancel',
    true: 'check_circle', false: 'cancel',
};

@Component({
    selector: 'app-card-icon',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    styles: [':host { display: contents; }'],
    template: `
    <mat-icon [ngClass]="config.className" [style.color]="getIconColor()" [ngStyle]="getStyles()">
      {{ getIcon() }}
    </mat-icon>
  `
})
export class CardIconComponent {
    @Input() config!: CardNodeConfig;
    @Input() data: any;

    getStyles() { return CoreCardUtils.getNodeStyles(this.config); }

    getIcon(): string {
        if (this.config.icon) return this.config.icon;
        if (this.config.key) {
            const raw = CoreCardUtils.getValue(this.data, this.config.key);
            if (raw != null && raw !== '') {
                const norm = String(raw).toLowerCase().trim();
                if (this.config.iconMap?.[norm]) return this.config.iconMap[norm];
                if (VALUE_ICON_MAP[norm]) return VALUE_ICON_MAP[norm];
                return norm;
            }
        }
        return 'help_outline';
    }

    getIconColor(): string {
        if (this.config.color === 'primary') return 'var(--primary-color)';
        if (this.config.color === 'accent') return 'var(--secondary-color)';
        if (this.config.color === 'warn') return 'var(--color-error)';
        return '';
    }
}


// ════════════════════════════════════════════════════════════════════════════
// card-divider.component.ts
// ════════════════════════════════════════════════════════════════════════════
/**
 * CardDividerComponent — A horizontal rule between card sections.
 *
 * Automatically suppressed by CoreCardUtils.getVisibleChildren() when it
 * would appear at the very start or end of a sibling list.
 *
 * Config options:
 *   className    → extra CSS classes on the <hr>
 *   customStyles → arbitrary inline styles
 */
@Component({
    selector: 'app-card-divider',
    standalone: true,
    imports: [CommonModule],
    styles: [':host { display: contents; }'],
    template: `<hr [ngClass]="config.className" [ngStyle]="getStyles()" class="card-divider" />`
})
export class CardDividerComponent {
    @Input() config!: CardNodeConfig;
    getStyles() { return CoreCardUtils.getNodeStyles(this.config); }
}


// ════════════════════════════════════════════════════════════════════════════
// card-list.component.ts
// ════════════════════════════════════════════════════════════════════════════
/**
 * CardListComponent — Iterates an array field and renders each item via itemConfig.
 *
 * Each item is rendered using a nested CoreCardRendererComponent so any node
 * type (badge, text, icon, contact …) can be used as the item template.
 *
 * If the array contains primitives (strings/numbers), the value is injected
 * directly into itemConfig as `value` so renderers display it correctly.
 *
 * Config options:
 *   key        → dot-path to the array in data
 *   itemConfig → CardNodeConfig applied to each element
 *   direction  → 'row' (default, horizontal flex) | 'column'
 *   separator  → 'comma' | 'pipe' | 'slash' | 'dash' | 'bullet'
 *                Shown between items only when direction is 'row'.
 *
 * Usage examples:
 *   // Render an array of strings as badges
 *   { type: 'list', key: 'tags', itemConfig: { type: 'badge', badgeColor: 'info' } }
 *
 *   // Render an array of objects, picking the 'name' field from each
 *   { type: 'list', key: 'contacts', direction: 'column',
 *     itemConfig: { type: 'text', key: 'name', label: 'Contact' } }
 */
import { forwardRef, EventEmitter, Output, HostListener } from '@angular/core';
import { CardActionEvent } from '../models/core-card.interface';
import { CoreCardRendererComponent } from './core-card-renderer.component';

@Component({
    selector: 'app-card-list',
    standalone: true,
    imports: [CommonModule, forwardRef(() => CoreCardRendererComponent)],
    styles: [':host { display: block; min-width: 0; }'],
    template: `
    <div [ngClass]="getListClass()" [ngStyle]="getStyles()" style="position: relative; display: inline-flex; align-items: center; flex-wrap: wrap;">
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
        <span class="extra-items-badge" (click)="togglePopup($event)" style="cursor: pointer; width:fit-content; color: var(--primary-color, #1A73E8); font-weight: 500; font-size: 11px; display: inline-flex; align-items: center; padding: 2px 6px; background-color: rgba(26,115,232,0.08); border-radius: 4px; transition: all 0.2s ease;">
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
        case 'pipe': return ' | ';
        case 'slash': return ' / ';
        case 'dash': return ' - ';
        case 'bullet': return ' • ';
        default: return ', ';
      }
    }

    getListItems(): any[] {
      const items = CoreCardUtils.getValue(this.data, this.config.key);
      return Array.isArray(items) ? items : [];
    }

    /** Injects primitives directly as `value`; uses labelKey for object arrays. */
    resolveItemConfig(item: any): CardNodeConfig {
      const base = { ...this.config.itemConfig! };
      if (typeof item !== 'object' || item === null) return { ...base, value: item };
      if (base.labelKey) return { ...base, value: item[base.labelKey] };
      return base;
    }

    onAction(event: CardActionEvent) {
      this.actionTriggered.emit(event);
    }
}