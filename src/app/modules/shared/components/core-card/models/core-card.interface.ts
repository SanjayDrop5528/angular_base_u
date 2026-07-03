/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CORE CARD — Node Type Reference
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * LAYOUT / STRUCTURAL TYPES
 * ─────────────────────────
 * container  — A flex/grid wrapper. Use className ('row', 'column', 'col-6' …)
 *              to control direction and sizing. Never renders anything by itself;
 *              its children do the work. Hidden automatically when every
 *              data-bearing descendant is empty.
 *
 * divider    — A horizontal <hr> rule. Automatically suppressed when it would
 *              appear at the start or end of a sibling list.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTENT TYPES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * text       — The general-purpose text field. Renders an optional label above
 *              a value. Supports variants via `variant`:
 *
 *              variant: 'default'   — standard label + value pair (13px / 500)
 *              variant: 'title'     — large bold heading (16px / 700)
 *              variant: 'subtitle'  — small muted line (12px / muted color)
 *              variant: 'stat'      — oversized accent number/value (18px / 700)
 *              variant: 'numeric'   — like default but right-aligned; hides
 *                                     non-numeric values gracefully. Supports
 *                                     `compact` (1 400 000 → 1.4M) and
 *                                     `prefix` / `suffix` (e.g. "$", "%").
 *
 *              Common props: key, label, value, prefix, suffix,
 *                            fontSize, fontWeight, textColor,
 *                            labelFontSize, labelFontWeight, labelColor
 *
 * date       — Parses and formats a date value from data.
 *              Accepts ISO strings, dd-MM-yyyy, MM-yyyy, yyyy, etc.
 *              `elapsed: true`  → shows time elapsed since the date
 *                                 e.g. "2 yrs", "4 mos" (replaces old `calculate`)
 *              `format`         → reserved for future custom format strings.
 *
 * number     — Dedicated numeric display with compact notation support.
 *              `compact: true`  → abbreviates large values (K / M / B).
 *              `prefix` / `suffix` → e.g. prefix: "₹", suffix: " hrs".
 *              (For most cases, prefer `text` with `variant: 'numeric'`.)
 *
 * boolean    — Renders a check or close icon for truthy/falsy values.
 *              `trueColor` / `falseColor` override icon colors.
 *              `fontSize` controls icon size in px.
 *              `shape: 'circle' | 'square'` adds a background shape.
 *
 * status     — Icon + label chip for workflow statuses.
 *              Built-in mappings: active, approved, inactive, rejected,
 *              hold, draft, pending, pending approval.
 *              Unknown values fall back to a neutral grey help icon.
 *              Reads its value from `key`.
 *
 * badge      — A compact pill/chip (uses Angular Material mat-chip).
 *              `badgeColor: 'primary' | 'accent' | 'warn' | 'success' | 'info'`
 *              Value comes from `key` or falls back to `label`.
 *
 * icon       — A Material icon glyph.
 *              If `icon` is set, renders that literal icon name.
 *              If `key` is set, reads the data value and maps it to an icon via:
 *                1. `iconMap` (your custom value→icon overrides)
 *                2. Built-in map (male/female/active/inactive/true/false …)
 *                3. The raw value itself (assumes it's already an icon name).
 *
 * contact    — A tappable link for phone, email, or website values.
 *              `subType: 'phone'`   → tel: link
 *              `subType: 'email'`   → mailto: link
 *              `subType: 'website'` → https:// link (prefixed if missing)
 *              Renders a dash when the value is empty.
 *
 * avatar     — A circular image with a letter-initial fallback.
 *              `key`           → dot-path to the image filename or full URL.
 *              `nameKey`       → dot-path to the name used for the fallback
 *                                initial. Falls back to name / full_name / title.
 *              `avatarFolder`  → subfolder under ImageBaseUrl (default: 'profiles').
 *              Never hides itself — always renders image or initial.
 *
 * list       — Iterates an array field and renders each item using `itemConfig`.
 *              `key`        → dot-path to the array.
 *              `itemConfig` → CardNodeConfig applied to each element.
 *              `direction`  → 'row' (default) | 'column'
 *              `separator`  → 'comma' | 'pipe' | 'slash' | 'dash' | 'bullet'
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ACTION TYPES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * button     — An icon-button or label-button that emits a CardActionEvent.
 *              `icon`   → Material icon name shown inside the button.
 *              `label`  → Text shown when no icon (also used as tooltip).
 *              `action` → String emitted in the CardActionEvent.
 *              `color`  → 'primary' | 'accent' | 'warn'
 *
 *              MENU MODE — set `menu: true` to turn this into a ⋮ kebab-menu:
 *              `menuItems` → array of { label, icon?, action } entries.
 *              Each item click emits its own action string.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEPRECATED / REMOVED
 * ─────────────────────────────────────────────────────────────────────────────
 * 'action'    → use type: 'button'  (both still handled in renderer for compat)
 * 'stat'      → use type: 'text', variant: 'stat'
 * 'field'     → use type: 'text', variant: 'default'
 * 'title'     → use type: 'text', variant: 'title'
 * 'subtitle'  → use type: 'text', variant: 'subtitle'
 * calculate   → renamed to `elapsed` on the date node
 * dot         → renamed to `menu` on the button node
 * actions     → renamed to `menuItems` on the button node
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Node type union ─────────────────────────────────────────────────────────

export type CardNodeType =
  // layout
  | 'container'
  | 'divider'
  // content
  | 'text'
  | 'date'
  | 'number'
  | 'boolean'
  | 'status'
  | 'badge'
  | 'icon'
  | 'contact'
  | 'avatar'
  | 'list'
  // action
  | 'button'
  // ── backward-compat aliases (still handled in renderer) ──
  | 'action'      // → button
  | 'stat'        // → text variant:stat
  | 'field'       // → text variant:default
  | 'title'       // → text variant:title
  | 'subtitle';   // → text variant:subtitle

/** Text display variants. Applies type-specific typography without separate node types. */
export type CardTextVariant = 'default' | 'title' | 'subtitle' | 'stat' | 'numeric' | 'payment';

export type CardBooleanVariant = 'payment';

/** Contact link sub-types. */
export type CardContactSubType = 'phone' | 'email' | 'website';

/** Separator character used between list items. */
export type CardListSeparator = 'comma' | 'pipe' | 'slash' | 'dash' | 'bullet';

/** Badge colour tokens matching the CSS classes in core-card.scss. */
export type CardBadgeColor = 'primary' | 'accent' | 'warn' | 'success' | 'info';

/** Material colour tokens for buttons and icons. */
export type CardThemeColor = 'primary' | 'accent' | 'warn';

// ─── Menu item (used inside button nodes with menu:true) ──────────────────────

export interface CardMenuItem {
  /** Display text for this menu item. Passed through ngx-translate. */
  label: string;
  /** Optional Material icon name shown beside the label. */
  icon?: string;
  /** Action string emitted in CardActionEvent when this item is clicked. */
  action: string;
  color?: string
}

// ─── hideExpression ───────────────────────────────────────────────────────────

export interface CardHideExpressionObject {
  /** Dot-path into data whose value is compared. */
  keyfield: string;
  /** The value (or array of values) to match against. */
  value: any | any[];
  /**
   * IN  → hide when resolved value IS in the list  (default)
   * NOT_IN → hide when resolved value is NOT in the list
   */
  type?: 'IN' | 'NOT_IN';
}

// ─── Main config interface ────────────────────────────────────────────────────

export interface CardNodeConfig {
  // ── Identity & structure ────────────────────────────────────────────────
  /** The component type to render. Defaults to 'text' when omitted. */
  type?: CardNodeType;

  /** CSS class(es) added to the root element of this node. */
  className?: string;
  boxview?: boolean;
  /** Dot-notation path into data, e.g. 'address.city' or 'patient.dob'. */
  key?: string;
  limit?: number;
  /** Static fallback value used when key is absent or resolves to nothing. */
  value?: any;

  // ── Text / label display ────────────────────────────────────────────────
  /**
   * Small uppercase label rendered above the value.
   * Supports ngx-translate keys.
   */
  label?: string;

  /**
   * Visual variant for `type: 'text'` nodes.
   *
   * 'default'  — standard label + value (13 px / 500)
   * 'title'    — large heading (16 px / 700)
   * 'subtitle' — small muted value (12 px)
   * 'stat'     — oversized accent value (18 px / 700)
   * 'numeric'  — right-aligned number; compact + prefix/suffix aware
   */
  variant?: CardTextVariant | CardBooleanVariant;

  /**
   * String prepended to the displayed value.
   * Works on `text` (all variants) and `number` nodes.
   * Example: prefix: '₹' → '₹1,500'
   */
  prefix?: string;

  /**
   * String appended to the displayed value.
   * Works on `text` (all variants) and `number` nodes.
   * Example: suffix: ' hrs' → '8 hrs'
   */
  suffix?: string;

  // ── Value label (for icon / list item lookups) ───────────────────────────
  /**
   * For `list` itemConfig: dot-path inside each list item object whose
   * value should be used as the display label.
   * Example: labelKey: 'name' when each item is { id, name }.
   */
  labelKey?: string;

  // ── Date-specific ────────────────────────────────────────────────────────
  /**
   * When true, instead of formatting the date the component shows the
   * elapsed time since that date (e.g. "2 yrs", "4 mos").
   * Renamed from the old `calculate` flag.
   */
  elapsed?: boolean;

  /* show till text length others ... */
  textLength?: number;

  /**
   * Reserved for future custom date format strings (e.g. 'DD/MM/YYYY').
   * Currently unused by the renderer.
   */
  format?: string;

  // ── Number-specific ──────────────────────────────────────────────────────
  /**
   * Abbreviates large numbers using K / M / B suffixes.
   * Works on `number` nodes and `text` nodes with `variant: 'numeric'`.
   * 1 400 000 → '1.4M'
   */
  compact?: boolean;

  // ── Contact-specific ─────────────────────────────────────────────────────
  /**
   * Determines the href scheme for `contact` nodes.
   * 'phone'   → tel:
   * 'email'   → mailto:
   * 'website' → https:// (auto-prefixed)
   */
  subType?: CardContactSubType;

  // ── List-specific ────────────────────────────────────────────────────────
  /**
   * Layout direction for `list` nodes.
   * 'row'    → horizontal flex (default)
   * 'column' → vertical flex
   */
  direction?: 'row' | 'column';

  /**
   * Separator character rendered between list items.
   * Only used when `direction` is 'row'.
   */
  separator?: CardListSeparator;

  /**
   * Node config applied to each item in a `list`.
   * Use `key` inside itemConfig to pluck a sub-field from each item object.
   * If the list contains primitives, the item itself is injected as `value`.
   */
  itemConfig?: CardNodeConfig;

  // ── Avatar-specific ──────────────────────────────────────────────────────
  /** Dot-path to the name field used to generate the placeholder initial. */
  nameKey?: string;

  /**
   * Sub-folder appended to the ImageBaseUrl when constructing avatar URLs.
   * Default: 'profiles'.  Example: 'employees' → <base>/employees/<filename>
   */
  avatarFolder?: string;

  // ── Icon-specific ────────────────────────────────────────────────────────
  /**
   * Literal Material icon name. Used for static decorative icons.
   * When key is also set, icon takes precedence.
   */
  icon?: string;

  /**
   * Custom value → icon name mapping for data-driven icons.
   * Example: { pending: 'hourglass_empty', done: 'check' }
   * Falls back to the built-in VALUE_ICON_MAP, then to the raw value.
   */
  iconMap?: Record<string, string>;

  // ── Boolean-specific ─────────────────────────────────────────────────────
  /** Icon colour when the resolved value is truthy. Default: --success-color. */
  trueColor?: string;

  /** Icon colour when the resolved value is falsy. Default: --warn-color. */
  falseColor?: string;

  /**
   * Wraps the icon in a shaped background.
   * 'circle' → border-radius 50 %
   * 'square' → border-radius 6 px
   */
  shape?: 'circle' | 'square';

  // ── Badge-specific ───────────────────────────────────────────────────────
  /** Colour token for badge chips. */
  badgeColor?: CardBadgeColor;

  // ── Button-specific ──────────────────────────────────────────────────────
  /**
   * Action string emitted as CardActionEvent.action when the button is clicked.
   * For menu buttons this is unused — each menuItem carries its own action.
   */
  action?: string;

  /**
   * When true, renders a ⋮ kebab icon-button that opens a dropdown menu.
   * Supply `menuItems` with the list of entries.
   * Renamed from the old `dot` flag.
   */
  menu?: boolean;

  /**
   * Menu entries shown when `menu: true`.
   * Each entry emits its own action string on click.
   * Renamed from the old `actions` array.
   */
  menuItems?: CardMenuItem[];

  // ── Shared colour tokens ─────────────────────────────────────────────────
  /** Material theme colour token for buttons and icons. */
  color?: CardThemeColor;

  /** Text / icon foreground colour (any valid CSS colour string). */
  textColor?: string;

  /** Background colour for the node's root element. */
  backgroundColor?: string;

  // ── Typography ───────────────────────────────────────────────────────────
  /**
   * Font size for the **value** span.
   * Accepts px numbers (18 → '18px') or any CSS string ('1.2rem').
   */
  fontSize?: string | number;

  /** Font weight for the **value** span (e.g. 400, 600, 'bold'). */
  fontWeight?: string | number;

  // ── Label-specific typography ────────────────────────────────────────────
  /** Foreground colour applied to the label span only. */
  labelColor?: string;

  /**
   * Font size for the **label** span (the small uppercase line above the value).
   * Accepts px numbers or CSS strings.
   */
  labelFontSize?: string | number;

  /** Font weight for the **label** span. */
  labelFontWeight?: string | number;

  // ── Border & shape ───────────────────────────────────────────────────────
  /** border-radius applied to the node's root element. */
  borderRadius?: string | number;

  // ── Arbitrary overrides ──────────────────────────────────────────────────
  /** Any additional inline CSS properties to merge in. */
  customStyles?: Record<string, string>;

  // ── Children ─────────────────────────────────────────────────────────────
  /** Nested child nodes — only meaningful on `container` nodes. */
  children?: CardNodeConfig[];

  // ── Visibility ───────────────────────────────────────────────────────────
  /**
   * Hides this node when the condition is true.
   *
   * String form  → evaluated as a JS expression with `model` in scope.
   *   e.g.  "model.status === 'inactive'"
   *
   * Object form  → declarative key-match check.
   *   { keyfield: 'status', value: ['draft','inactive'], type: 'IN' }
   *   type 'IN'     → hide when value IS in the list
   *   type 'NOT_IN' → hide when value is NOT in the list
   */
  hideExpression?: string | CardHideExpressionObject;

  // ── Backward-compat shims (do not use in new configs) ────────────────────
  /** @deprecated Use `elapsed` instead. */
  calculate?: boolean;
  /** @deprecated Use `menu` instead. */
  dot?: boolean;
  /** @deprecated Use `menuItems` instead. */
  actions?: CardMenuItem[];
  /** @deprecated Use `variant` on a text node instead. */
  titleKey?: any;
  /** @deprecated Use `variant` on a text node instead. */
  subtitleKey?: any;
  /** @deprecated Internal use by list renderer only. */
  fields?: any;
  /** @deprecated Use `nameKey` on avatar nodes. */
  avatarKey?: any;
  /** @deprecated Not implemented. */
  virtualScroll?: any;
}

// ─── Event emitted by action nodes ───────────────────────────────────────────

export interface CardActionEvent {
  /** Action string matching the `action` (or `menuItems[n].action`) on the config. */
  action: string;
  /** The full data object bound to the card that triggered the event. */
  data: any;
}

// ─── Alias kept for backward compatibility ────────────────────────────────────

/** @deprecated Use CardNodeConfig directly. */
export type CardSchema = CardNodeConfig;