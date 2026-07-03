import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CardNodeConfig } from '../models/core-card.interface';
import { CoreCardUtils } from '../utils/core-card.utils';

/**
 * CardTextComponent — General-purpose text/label renderer.
 *
 * Handles ALL of these former separate types via `variant`:
 *   variant: 'default'  → standard label + value pair        (replaces type:'text', type:'field')
 *   variant: 'title'    → large bold heading                  (replaces type:'title')
 *   variant: 'subtitle' → small muted secondary line          (replaces type:'subtitle')
 *   variant: 'stat'     → oversized accent value              (replaces type:'stat')
 *   variant: 'numeric'  → right-aligned number; compact aware (replaces type:'number' for display)
 *
 * New features vs old CardTextComponent:
 *   • `prefix` / `suffix` — prepended/appended to the displayed value
 *   • `labelFontSize`     — now correctly applied to the label span (was broken before)
 *   • `labelFontWeight`   — applied to the label span
 *   • `labelColor`        — applied to the label span
 *   • `compact`           — abbreviates large numbers in 'numeric' variant (1 400 000 → 1.4M)
 *   • Backward-compat: old type:'title' / 'subtitle' / 'stat' are mapped via getVariant()
 *
 * Usage examples:
 * ─────────────────────────────────────────────────────────────────
 * // Standard label + value
 * { type: 'text', key: 'patient.name', label: 'Patient Name' }
 *
 * // Title heading
 * { type: 'text', variant: 'title', key: 'patient.name' }
 *
 * // Stat block
 * { type: 'text', variant: 'stat', key: 'totalCases', label: 'Total Cases' }
 *
 * // Currency with prefix
 * { type: 'text', variant: 'numeric', key: 'salary', prefix: '₹', suffix: ' /mo', compact: true }
 *
 * // Custom label font size (was broken before — now fixed)
 * { type: 'text', key: 'dept', label: 'Department', labelFontSize: 12, labelColor: '#888' }
 * ─────────────────────────────────────────────────────────────────
 */
@Component({
  selector: 'app-card-text',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  styles: [':host { display: contents; }'],
  template: `
    <div
      class="card-text-wrapper"
      [ngClass]="getWrapperClasses()"
      [ngStyle]="getWrapperStyles()">

      <!-- Label — small uppercase line above the value -->
      <span
        *ngIf="config.label"
        class="card-label"
        [ngStyle]="getLabelStyles()">
        {{ config.label | translate }}
      </span>

      <!-- Value — main content -->
      <span
        *ngIf="hasValue()"
        class="card-value"
        [ngStyle]="getValueStyles()">
        {{ getDisplayValue() }}
      </span>

    </div>
  `
})
export class CardTextComponent {
  @Input() config!: CardNodeConfig;
  @Input() data: any;

  // ── Variant resolution ──────────────────────────────────────────────────
  /**
   * Resolves the effective variant, supporting:
   *   1. Explicit config.variant
   *   2. Old type aliases: 'title', 'subtitle', 'stat', 'field'
   *   3. Default: 'default'
   */
  private getVariant(): string {
    if (this.config.variant) return this.config.variant;
    // map legacy type aliases
    if (this.config.type === 'title') return 'title';
    if (this.config.type === 'subtitle') return 'subtitle';
    if (this.config.type === 'stat') return 'stat';
    if (this.config.type === 'field') return 'default';
    return 'default';
  }

  // ── CSS classes ─────────────────────────────────────────────────────────
  getWrapperClasses(): string {
    const classes: string[] = [];
    if (this.config.className) classes.push(this.config.className);
    // Always add variant class so SCSS typography rules apply
    classes.push('variant-' + this.getVariant());
    // Keep old type-* class for backward compat with existing SCSS
    if (this.config.type) classes.push('type-' + this.config.type);
    if (this.getVariant() === 'numeric') classes.push('numeric-value');
    return classes.join(' ');
  }

  // ── Wrapper styles (layout only — NOT typography) ───────────────────────
  getWrapperStyles(): Record<string, string> {
    return CoreCardUtils.getNodeStyles(this.config);
  }

  // ── Label styles ────────────────────────────────────────────────────────
  /**
   * FIX: Previously fontSize / fontWeight / textColor on the config were
   * applied to the wrapper, meaning they bled onto the label. Now:
   *   - labelFontSize    → label span only
   *   - labelFontWeight  → label span only
   *   - labelColor       → label span only
   * These are independent from the value typography below.
   */
  getLabelStyles(): Record<string, string> {
    const s: Record<string, string> = {};
    if (this.config.labelColor) {
      s['color'] = this.config.labelColor;
    }
    if (this.config.labelFontSize != null) {
      s['font-size'] = CoreCardUtils.toCssUnit(this.config.labelFontSize);
    }
    if (this.config.labelFontWeight != null) {
      s['font-weight'] = String(this.config.labelFontWeight);
    }
    return s;
  }

  // ── Value styles ────────────────────────────────────────────────────────
  getValueStyles(): Record<string, string> {
    const s: Record<string, string> = {};
    if (this.config.textColor) {
      s['color'] = this.config.textColor;
    }
    if (this.config.fontSize != null) {
      s['font-size'] = CoreCardUtils.toCssUnit(this.config.fontSize);
    }
    if (this.config.fontWeight != null) {
      s['font-weight'] = String(this.config.fontWeight);
    }
    if (this.getVariant() === 'numeric') {
      s['text-align'] = 'right';
      s['font-variant-numeric'] = 'tabular-nums';
    }
    return s;
  }

  // ── Value resolution ────────────────────────────────────────────────────
  hasValue(): boolean {
    return CoreCardUtils.hasLeafValue(this.config, this.data);
  }

  /**
   * Returns the final display string including prefix/suffix and compact
   * formatting (numeric variant only).
   */
  getDisplayValue(): string {
    const raw = CoreCardUtils.getLeafValue(this.config, this.data);
    if (raw === null || raw === undefined || raw === '') return '';

    let formatted: string;

    if (this.getVariant() === 'numeric') {
      const num = Number(raw);
      if (!isNaN(num)) {
        formatted = this.config.compact
          ? this.compactNumber(num)
          : this.formatNumber(num);
      } else {
        formatted = String(raw);
      }
    } else {
      formatted = String(raw);

      // Apply text length limit if provided
      if (
        this.config.textLength &&
        formatted.length > this.config.textLength
      ) {
        formatted =
          formatted.substring(0, this.config.textLength) + '...';
      }
    }

    const prefix = this.config.prefix ?? '';
    const suffix = this.config.suffix ?? '';
    return `${prefix}${formatted}${suffix}`;
  }

  // ── Numeric helpers ─────────────────────────────────────────────────────
  private compactNumber(num: number): string {
    const abs = Math.abs(num);
    if (abs >= 1_000_000_000) return `${this.round(num / 1_000_000_000)}B`;
    if (abs >= 1_000_000) return `${this.round(num / 1_000_000)}M`;
    if (abs >= 1_000) return `${this.round(num / 1_000)}K`;
    return this.formatNumber(num);
  }

  private formatNumber(num: number): string {
    return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
  }

  private round(value: number): string {
    return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
  }
}