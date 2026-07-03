import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardNodeConfig } from '../models/core-card.interface';
import { CoreCardUtils } from '../utils/core-card.utils';

/**
 * CardNumberComponent — Dedicated numeric display node.
 *
 * For most cases you can use `type: 'text'` with `variant: 'numeric'`.
 * Use this component when you want a standalone number span without a label wrapper.
 *
 * Config options:
 * ──────────────────────────────────────────────────────────────────
 * key          → dot-path to the numeric value in data
 * compact      → abbreviates large numbers: 1 400 000 → '1.4M'
 * prefix       → prepended string,  e.g. '₹', '$', '+'
 * suffix       → appended string,   e.g. ' hrs', '%', ' pts'
 * textColor    → foreground colour
 * fontSize     → font size (number = px, string = any CSS unit)
 * fontWeight   → font weight
 * ──────────────────────────────────────────────────────────────────
 *
 * Usage examples:
 *   // Plain number
 *   { type: 'number', key: 'stats.totalCases' }
 *
 *   // Compact currency
 *   { type: 'number', key: 'revenue', prefix: '₹', compact: true }
 *
 *   // Percentage with suffix
 *   { type: 'number', key: 'completion', suffix: '%' }
 */
@Component({
    selector: 'app-card-number',
    standalone: true,
    imports: [CommonModule],
    styles: [':host { display: contents; }'],
    template: `
    <span
      [class]="config.className"
      [ngStyle]="getStyles()">
      {{ displayValue }}
    </span>
  `
})
export class CardNumberComponent {
    @Input() config!: CardNodeConfig;
    @Input() data: any;

    // ── Styles ──────────────────────────────────────────────────────────────
    getStyles(): Record<string, string> {
        const s: Record<string, string> = {};
        if (this.config.textColor) s['color'] = this.config.textColor;
        if (this.config.fontSize != null)
            s['font-size'] = CoreCardUtils.toCssUnit(this.config.fontSize);
        if (this.config.fontWeight != null)
            s['font-weight'] = String(this.config.fontWeight);
        s['font-variant-numeric'] = 'tabular-nums';
        return s;
    }

    // ── Display value ───────────────────────────────────────────────────────
    get displayValue(): string {
        const raw = CoreCardUtils.getValue(this.data, this.config.key);

        if (raw === null || raw === undefined || raw === '') return '—';

        const num = Number(raw);
        if (isNaN(num)) return String(raw);

        const core = this.config.compact
            ? this.compactNumber(num)
            : this.formatNumber(num);

        const prefix = this.config.prefix ?? '';
        const suffix = this.config.suffix ?? '';
        return `${prefix}${core}${suffix}`;
    }

    // ── Formatting helpers ──────────────────────────────────────────────────
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