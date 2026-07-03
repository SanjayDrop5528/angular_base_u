import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CardNodeConfig } from '../models/core-card.interface';
import { CoreCardUtils } from '../utils/core-card.utils';

/** Maps common data values to Material icon names */
const VALUE_ICON_MAP: Record<string, string> = {
  male: 'male',
  female: 'female',
  other: 'transgender',
  active: 'check_circle',
  inactive: 'cancel',
  true: 'check_circle',
  false: 'cancel',
};

@Component({
  selector: 'app-card-icon',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
  <mat-icon
    [ngClass]="config.className"
    [style.color]="getIconColor()"
    [ngStyle]="getStyles()">
    {{ getIcon() }}
  </mat-icon>
`,
  styles: [`
  :host { display: contents; }
  mat-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
`]
})
export class CardIconComponent {
  @Input() config!: CardNodeConfig;
  @Input() data: any;

  // CardIconComponent.getStyles() — must emit BOTH font-size AND matching width/height
  // so the new global .mat-icon { width:1em; height:1em } fallback gets overridden correctly:
 getStyles(): Record<string, string> {
  const styles = CoreCardUtils.getNodeStyles(this.config);
  const size = CoreCardUtils.toCssUnit(this.config.fontSize || 18);

  const iconStyles: Record<string, string> = {
    'font-size': size,
    width: size,
    height: size,
    ...styles
  };

  if (this.config.boxview) {
    iconStyles['padding'] = '5px';
    iconStyles['border-radius'] = '5px';
    iconStyles['background-color'] = this.getLightColor(
      this.config.color || '#000000'
    );
  }

  return iconStyles;
}
  /** Returns color only when it is a Material theme token */
  getMatColor(): string {
    const c = this.config.color;
    return (c === 'primary' || c === 'accent' || c === 'warn') ? c : '';
  }

  getIcon(): string {
    if (this.config.icon) return this.config.icon;

    if (this.config.key) {
      const raw = CoreCardUtils.getValue(this.data, this.config.key);
      if (raw != null && raw !== '') {
        const normalized = String(raw).toLowerCase().trim();
        // 1. check iconMap on the config (user-defined overrides)
        if (this.config.iconMap && this.config.iconMap[normalized]) {
          return this.config.iconMap[normalized];
        }
        // 2. check built-in value → icon map
        if (VALUE_ICON_MAP[normalized]) {
          return VALUE_ICON_MAP[normalized];
        }
        // 3. assume the value itself is already an icon name
        return normalized;
      }
    }

    return 'help_outline';
  }
  getIconColor(): string {
    const c = this.config.color;
    if (c === 'primary') return 'var(--primary-color)';
    if (c === 'accent') return 'var(--secondary-color)';
    if (c === 'warn') return 'var(--color-error)';
    return '';
  }
 getLightColor(color: string): string {
  switch (color) {
    case 'primary':
      return 'rgba(var(--primary-color-rgb, 59,130,246), 0.12)';

    case 'accent':
      return 'rgba(var(--secondary-color-rgb, 16,185,129), 0.12)';

    case 'warn':
      return 'rgba(var(--color-error-rgb, 239,68,68), 0.12)';
  }

  // Hex color (#RRGGBB)
  if (color?.startsWith('#')) {
    const r = parseInt(color.substring(1, 3), 16);
    const g = parseInt(color.substring(3, 5), 16);
    const b = parseInt(color.substring(5, 7), 16);

    return `rgba(${r}, ${g}, ${b}, 0.12)`;
  }

  return 'rgba(0,0,0,0.06)';
}
}
