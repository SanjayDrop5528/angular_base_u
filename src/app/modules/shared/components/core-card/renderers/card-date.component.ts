import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardNodeConfig } from '../models/core-card.interface';
import { CoreCardUtils } from '../utils/core-card.utils';

/**
 * CardDateComponent — Parses and displays date values from data.
 *
 * Supported input formats (auto-detected, no config needed):
 * ─────────────────────────────────────────────────────────
 *   NUMBER  2012                    → Jan 1 of year 2012
 *   STRING  "2012"                  → Jan 1 of year 2012
 *   STRING  "2008-06-02T00:00:00Z" → ISO 8601 full datetime
 *   STRING  "2008-06-02"           → ISO date-only
 *   STRING  "09-06-2008"           → dd-MM-yyyy
 *   STRING  "06-2008"              → MM-yyyy  (first of month)
 *   DATE    new Date(...)          → native JS Date object
 *
 * Display modes (controlled by `elapsed` flag):
 * ─────────────────────────────────────────────
 *   elapsed: false (default) → formatted date   e.g. "02-06-2008"
 *   elapsed: true            → time elapsed      e.g. "14 yrs", "4 mos"
 *                              (legacy `calculate: true` also works)
 *
 * Config options:
 *   key        → dot-path to the date value in data
 *   elapsed    → show elapsed time instead of formatted date
 *   prefix     → string prepended to output
 *   suffix     → string appended to output
 *   textColor  → foreground CSS colour
 *   fontSize   → number (px) or CSS string
 *   fontWeight → number or string
 *
 * Examples:
 *   { type:'date', key:'date_of_birth' }
 *   // "2008-06-02T00:00:00Z" → "02-06-2008"
 *
 *   { type:'date', key:'working_since', elapsed:true, fontWeight:700 }
 *   // 2012  →  "14 yrs"
 *
 *   { type:'date', key:'date_of_birth', elapsed:true, className:'age' }
 *   // "2008-06-02T00:00:00Z"  →  "17 yrs"
 */
@Component({
    selector: 'app-card-date',
    standalone: true,
    imports: [CommonModule],
    styles: [':host { display: contents; }'],
    template: `
    <span [class]="config.className" [ngStyle]="getStyles()">
      {{ displayValue }}
    </span>
  `
})
export class CardDateComponent {
    @Input() config!: CardNodeConfig;
    @Input() data: any;

    // ── Styles ───────────────────────────────────────────────────────────────
    getStyles(): Record<string, string> {
        if (!this.config) return {};
        const s: Record<string, string> = {};
        if (this.config.textColor) s['color'] = this.config.textColor;
        if (this.config.fontSize != null) s['font-size'] = CoreCardUtils.toCssUnit(this.config.fontSize);
        if (this.config.fontWeight != null) s['font-weight'] = String(this.config.fontWeight);
        return s;
    }

    // ── Display value ────────────────────────────────────────────────────────
    get displayValue(): string {
        // Guard: config or data not yet bound
        if (!this.config) return '';

        const raw = CoreCardUtils.getValue(this.data, this.config.key);

        // Treat numeric 0 as empty (unlikely for a date, safe to skip)
        if (raw === null || raw === undefined || raw === '') return '—';

        const date = this.parseDate(raw);
        if (!date) return String(raw);

        // Support both `elapsed` (new) and `calculate` (legacy shim)
        // Use explicit cast via bracket notation to handle JSON-loaded configs
        // where TypeScript's type stripping might hide the property at runtime
        const cfg = this.config as any;
        const useElapsed: boolean = !!(cfg['elapsed'] ?? cfg['calculate'] ?? false);

        const core = useElapsed ? this.calcElapsed(date) : this.formatDate(date);
        const prefix = (this.config.prefix ?? '');
        const suffix = (this.config.suffix ?? '');
        return `${prefix}${core}${suffix}`;
    }

    // ── Date parsing ─────────────────────────────────────────────────────────
    /**
     * Parsing priority (ORDER MATTERS):
     *
     *  1. native Date object
     *  2. number in 1900–2100  → treat as year  ← KEY FIX for working_since:2012
     *  3. string "yyyy"        → treat as year
     *  4. string "MM-yyyy" / "MM/yyyy"
     *  5. string "dd-MM-yyyy" / "dd/MM/yyyy"
     *  6. string "dd-MM-yy"   / "dd/MM/yy"
     *  7. everything else      → let JS Date parse it (handles ISO 8601)
     *
     * WHY THE OLD CODE FAILED:
     *   new Date(2012) = Jan 1 1970 + 2012 milliseconds ≠ year 2012
     *   The number check (step 2) must come BEFORE the JS Date fallback (step 7).
     */
    parseDate(value: any): Date | null {
        if (value === null || value === undefined) return null;

        // ── 1. Already a Date ────────────────────────────────────────────────
        if (value instanceof Date) {
            return isNaN(value.getTime()) ? null : value;
        }

        // ── 2. Pure number → year (e.g. working_since: 2012) ────────────────
        if (typeof value === 'number') {
            if (value >= 1900 && value <= 2100) {
                return new Date(value, 0, 1); // Jan 1 of that year, local time
            }
            return null;
        }

        const text = String(value).trim();
        if (!text) return null;

        // ── 3. "yyyy" string ─────────────────────────────────────────────────
        if (/^\d{4}$/.test(text)) {
            return new Date(+text, 0, 1);
        }

        // ── 4. "MM-yyyy" or "MM/yyyy" ────────────────────────────────────────
        let m = text.match(/^(\d{1,2})[-/](\d{4})$/);
        if (m) return new Date(+m[2], +m[1] - 1, 1);

        // ── 5. "dd-MM-yyyy" or "dd/MM/yyyy" ─────────────────────────────────
        m = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (m) return new Date(+m[3], +m[2] - 1, +m[1]);

        // ── 6. "dd-MM-yy" or "dd/MM/yy" ─────────────────────────────────────
        m = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
        if (m) return new Date(2000 + +m[3], +m[2] - 1, +m[1]);

        // ── 7. ISO 8601 and anything else JS can parse ───────────────────────
        //    "2008-06-02T00:00:00Z", "2008-06-02", "June 2 2008" etc.
        const iso = new Date(text);
        return isNaN(iso.getTime()) ? null : iso;
    }

    // ── Elapsed calculation ──────────────────────────────────────────────────
    /**
     * Returns elapsed time between `date` and today as a readable string.
     *
     *  < 12 months → "N mos"
     *  ≥ 12 months → "N yrs"  (whole) or "N.N yrs" (fractional)
     *
     *  Correctly handles partial years:
     *    working_since: 2012 → today Jun 2026 → 14.4 → "14.4 yrs"
     *    date_of_birth: "2008-06-02" → today Jun 2026 → 18.0 → "18 yrs"
     */
    private calcElapsed(date: Date): string {
        const today = new Date();

        const diffMs = today.getTime() - date.getTime();
        const totalYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);

        const rounded = parseFloat(totalYears.toFixed(1));

        return `${rounded} yrs`;
    }

    // ── Date formatting ──────────────────────────────────────────────────────
    /** Formats a Date as "dd-MM-yyyy". */
    private formatDate(date: Date): string {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        return `${d}-${m}-${date.getFullYear()}`;
    }
}