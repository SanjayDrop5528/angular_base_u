import { CardNodeConfig } from '../models/core-card.interface';

/**
 * CoreCardUtils — Pure static helpers used across all card components.
 *
 * No Angular dependencies — safe to call from any component or service.
 *
 * Key responsibilities:
 *  • Deep value resolution via dot-path keys  (getValue)
 *  • Empty-value detection                    (isEmptyValue, isFieldEmpty)
 *  • Visibility evaluation (expressions)      (isHiddenByExpression, isNodeVisible)
 *  • Container visibility (recursive)         (containerHasVisibleContent)
 *  • Visible-children filtering with divider  (getVisibleChildren)
 *  • Leaf value resolution (key vs static)    (getLeafValue, hasLeafValue)
 *  • Inline style object construction         (getNodeStyles)
 *  • CSS unit normalisation                   (toCssUnit)
 */
export class CoreCardUtils {

  // ── Value resolution ──────────────────────────────────────────────────────

  /**
   * Resolves a dot-path key against a data object.
   *
   * @param data  The data object to read from (e.g. a patient record).
   * @param key   Dot-notation path, e.g. 'address.city' or 'stats.total'.
   * @returns     The resolved value, or null if any segment is missing.
   *
   * @example
   *   getValue({ a: { b: 42 } }, 'a.b')  // → 42
   *   getValue({ a: null },      'a.b')  // → null
   */
  static getValue(data: any, key?: string): any {
    if (!data || !key) return null;
    return key.split('.').reduce((acc, k) => (acc != null ? acc[k] : null), data);
  }

  // ── Empty-value checks ────────────────────────────────────────────────────

  /**
   * Returns true when a value should be treated as "empty" for card purposes.
   * Handles null, undefined, empty string, and empty arrays.
   */
  static isEmptyValue(v: any): boolean {
    if (v === null || v === undefined || v === '') return true;
    if (Array.isArray(v)) return v.length === 0;
    return false;
  }

  /**
   * Returns true when a node's effective value is empty.
   * Avatar and nodes without a key are never considered empty (always render).
   */
  static isFieldEmpty(config: CardNodeConfig, data: any): boolean {
    if (this.isHiddenByExpression(config, data)) return true;
    if (config.type === 'avatar') return false; // always shows image or initial
    if (!config.key) return false; // decorative — no key to check
    return this.isEmptyValue(this.getValue(data, config.key));
  }

  // ── Expression-based visibility ───────────────────────────────────────────

  /**
   * Evaluates a JS expression string with `model` in scope.
   * Used for string-form hideExpression values.
   *
   * @example
   *   evaluateExpression("model.status === 'inactive'", data)
   */
  static evaluateExpression(expr: string, data: any): boolean {
    try {
      const model = data ?? {};

      const keys = Object.keys(model);
      const values = Object.values(model);

      // eslint-disable-next-line no-new-func
      const fn = new Function(
        'model',
        ...keys,
        `return (${expr});`
      );

      return !!fn(model, ...values);
    } catch (e) {
      console.error('Hide expression error:', expr, e);
      return false;
    }
  }

  /**
   * Returns true when the node should be hidden based on its hideExpression.
   *
   * Accepts two forms:
   *   String → evaluated as JS: "model.role === 'admin'"
   *   Object → declarative key match:
   *     { keyfield: 'status', value: ['draft','inactive'], type: 'IN' }
   *     type 'IN'     → hide when resolved value IS     in the list
   *     type 'NOT_IN' → hide when resolved value is NOT in the list
   */
  static isHiddenByExpression(config: CardNodeConfig, data: any): boolean {
    const expr = config.hideExpression;
    if (!expr) return false;

    if (typeof expr === 'string') {
      return this.evaluateExpression(expr, data);
    }

    const resolved = this.getValue(data, expr.keyfield);
    const matches = Array.isArray(expr.value)
      ? expr.value.includes(resolved)
      : expr.value === resolved;

    return expr.type === 'NOT_IN' ? !matches : matches;
  }

  // ── Node / container visibility ───────────────────────────────────────────

  /**
   * Returns true when a node carries a real data field anywhere in its subtree.
   *
   * Used to distinguish:
   *   - "data-bearing" nodes  → containers that might be empty → conditionally shown
   *   - "decorative" nodes    → icons, static labels → always shown
   *
   * Avatar nodes never make a parent hideable (they always render).
   */
  static hasAnyKeyedDescendant(config: CardNodeConfig): boolean {
    if (config.type === 'avatar') return false;
    if (config.key || config.hideExpression) return true;
    if (!config.children) return false;
    return config.children.some(c => this.hasAnyKeyedDescendant(c));
  }

  /**
   * Returns true when a node should be rendered.
   *
   * Rules (in order):
   *   1. hideExpression → false
   *   2. avatar         → true (always shows image or initial)
   *   3. container      → delegates to containerHasVisibleContent
   *   4. has key        → true only when the resolved value is non-empty
   *   5. decorative     → true (icon/label with no data binding)
   */
  static isNodeVisible(config: CardNodeConfig, data: any): boolean {
    if (this.isHiddenByExpression(config, data)) return false;
    if (config.type === 'avatar') return true;
    if (config.children?.length) {
      return this.containerHasVisibleContent(config, data);
    }
    if (config.key) return !this.isEmptyValue(this.getValue(data, config.key));
    return true;
  }

  /**
   * A container is visible when:
   *   a) It has no non-divider children               → show (empty container)
   *   b) None of its children carry any data field    → show (purely decorative row)
   *   c) At least one data-bearing child is visible   → show
   *   d) All data-bearing children are empty          → hide
   *
   * This recursion handles deeply nested col containers correctly.
   */
  static containerHasVisibleContent(config: CardNodeConfig, data: any): boolean {
    if (this.isHiddenByExpression(config, data)) return false;

    const children = (config.children || []).filter(c => c.type !== 'divider');
    if (children.length === 0) return true;

    const dataCarriers = children.filter(c => this.hasAnyKeyedDescendant(c));
    if (dataCarriers.length === 0) return true; // purely decorative row

    return dataCarriers.some(c => this.isNodeVisible(c, data));
  }

  /**
   * Returns the visible subset of a container's children, with dividers
   * suppressed when they appear at the start or end, or immediately after
   * another divider.
   */
  static getVisibleChildren(config: CardNodeConfig, data: any): CardNodeConfig[] {
    const result: CardNodeConfig[] = [];

    for (const child of (config.children || [])) {
      if (child.type === 'divider') {
        // Only add divider when the previous item is real content
        const lastIsContent = result.length > 0 && result[result.length - 1].type !== 'divider';
        if (lastIsContent) result.push(child);
        continue;
      }
      if (this.isNodeVisible(child, data)) {
        result.push(child);
      }
    }

    // Strip any trailing divider
    while (result.length && result[result.length - 1].type === 'divider') {
      result.pop();
    }

    return result;
  }

  // ── Leaf value resolution ─────────────────────────────────────────────────

  /**
   * Resolves the display value for a leaf node (text, badge, number …).
   *
   * Priority:
   *   1. config.key  → resolved from data  (non-empty)
   *   2. config.value → static fallback    (non-empty)
   *   3. null
   */
  static getLeafValue(config: CardNodeConfig, data: any): any {
    if (config.key) {
      const v = this.getValue(data, config.key);
      if (v !== null && v !== undefined && v !== '') return v;
    }
    if (config.value !== undefined && config.value !== null && config.value !== '') {
      return config.value;
    }
    return null;
  }

  /** Returns true when getLeafValue would return a non-null, non-empty value. */
  static hasLeafValue(config: CardNodeConfig, data: any): boolean {
    const v = this.getLeafValue(config, data);
    return v !== null && v !== undefined && v !== '';
  }

  // ── Inline styles ─────────────────────────────────────────────────────────

  /**
   * Builds an Angular [ngStyle]-compatible object from the shared style props
   * on a CardNodeConfig.
   *
   * Props handled: textColor, backgroundColor, fontSize, fontWeight,
   *                borderRadius, customStyles.
   *
   * NOTE: label-specific props (labelColor, labelFontSize, labelFontWeight)
   * are intentionally NOT included here — CardTextComponent applies them
   * directly to the label <span> via getLabelStyles().
   */
  static getNodeStyles(config: CardNodeConfig): Record<string, string> {
    const styles: Record<string, string> = {};

    if (config.textColor) styles['color'] = config.textColor;
    if (config.backgroundColor) styles['background-color'] = config.backgroundColor;
    if (config.fontSize != null) styles['font-size'] = this.toCssUnit(config.fontSize);
    if (config.fontWeight != null) styles['font-weight'] = String(config.fontWeight);
    if (config.borderRadius != null) styles['border-radius'] = this.toCssUnit(config.borderRadius);

    if (config.customStyles) {
      Object.entries(config.customStyles).forEach(([prop, val]) => {
        styles[prop] = String(val);
      });
    }

    return styles;
  }

  // ── CSS unit helper ───────────────────────────────────────────────────────

  /**
   * Converts a size value to a CSS string.
   *   number → appends 'px'  (18 → '18px')
   *   string → returned as-is ('1.2rem' → '1.2rem')
   */
  static toCssUnit(v: string | number): string {
    return typeof v === 'number' ? `${v}px` : v;
  }
}