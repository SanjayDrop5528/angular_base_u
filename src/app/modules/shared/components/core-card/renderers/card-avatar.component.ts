import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardNodeConfig } from '../models/core-card.interface';
import { CoreCardUtils } from '../utils/core-card.utils';
import { environment } from '../../../../../../environments/environment';

/**
 * CardAvatarComponent — Circular image with letter-initial fallback.
 *
 * Always renders something — either the resolved image or a coloured
 * circle containing the first letter of the person's name. Never blank.
 *
 * Image resolution order:
 *   1. `key` resolves to an absolute URL (http/https/data:) → used directly.
 *   2. `key` resolves to a filename → constructed as:
 *        <ImageBaseUrl>/<avatarFolder>/<filename>
 *      where avatarFolder defaults to 'profiles'.
 *   3. Image fails to load (`imgError = true`) → fallback initial shown.
 *
 * Initial fallback resolution order (via nameKey / automatic fallbacks):
 *   1. config.nameKey  → dot-path to the name in data
 *   2. data.name
 *   3. data.patient_name
 *   4. data.full_name
 *   5. data.title
 *   6. '#'  (guaranteed non-empty character)
 *
 * Config options:
 * ──────────────────────────────────────────────────────────────────
 * key            → dot-path to the image filename / full URL
 * nameKey        → dot-path to the name used for the fallback initial
 * avatarFolder   → sub-folder under ImageBaseUrl (default: 'profiles')
 * className      → extra CSS classes on the container div
 * backgroundColor, borderRadius, customStyles → forwarded via getStyles()
 * ──────────────────────────────────────────────────────────────────
 *
 * Usage examples:
 *   // Profile image with explicit nameKey
 *   { type: 'avatar', key: 'profileImage', nameKey: 'patient.name' }
 *
 *   // Employee photo from a custom folder
 *   { type: 'avatar', key: 'photo', avatarFolder: 'employees', nameKey: 'fullName' }
 *
 *   // Absolute URL (no folder construction)
 *   { type: 'avatar', key: 'avatarUrl' }   // e.g. 'https://cdn.../img.jpg'
 */
@Component({
  selector: 'app-card-avatar',
  standalone: true,
  imports: [CommonModule],
  styles: [':host { display: contents; }'],
  template: `
    <div
      class="core-card__avatar-container"
      [ngClass]="config.className"
      [ngStyle]="getStyles()">

      <img
        *ngIf="getAvatarUrl() && !imgError"
        [src]="getAvatarUrl()"
        class="core-card__avatar"
        [alt]="getFirstLetter()"
        (error)="imgError = true" />

      <div
        *ngIf="!getAvatarUrl() || imgError"
        class="core-card__avatar-placeholder"
        [style.background]="getAvatarColor()"
        [attr.aria-label]="getFirstLetter()">
        {{ getFirstLetter() }}
      </div>

    </div>
  `
})
export class CardAvatarComponent {
  @Input() config!: CardNodeConfig;
  @Input() data: any;
  imgError = false;

  constructor(private cdr: ChangeDetectorRef) { }

  getStyles(): Record<string, string> {
    return CoreCardUtils.getNodeStyles(this.config);
  }

  getAvatarUrl(): string {
    const val = CoreCardUtils.getLeafValue(this.config, this.data);
    if (!val || typeof val !== 'string') return '';
    if (val.startsWith('data:') || val.startsWith('http://') || val.startsWith('https://')) {
      return val;
    }
    const folder = this.config.avatarFolder || 'profiles';
    const base = (environment.ImageBaseUrl || '').replace(/\/$/, '') + '/';
    this.cdr.markForCheck();
    return val.startsWith(folder + '/') ? base + val : base + folder + '/' + val;
  }

  getFirstLetter(): string {
    const name = this.resolveName();
    if (name) {
      const trimmed = String(name).trim();
      if (trimmed.length > 0) return trimmed.charAt(0).toUpperCase();
    }
    return '#';
  }

  /**
   * Deterministic color per person — same name always produces the same
   * color (so a patient's avatar stays consistent across re-renders/sessions),
   * but different people get visually distinct colors.
   */
  private readonly palette = [
    '#818CF8', // soft indigo
    '#F472B6', // soft pink
    '#FBBF24', // soft amber
    '#34D399', // soft emerald
    '#60A5FA', // soft blue
    '#F87171', // soft red
    '#A78BFA', // soft violet
    '#2DD4BF', // soft teal
    '#FB923C', // soft orange
    '#67E8F9', // soft cyan
    '#C084FC', // soft purple
    '#A3E635'  // soft lime
  ];

  getAvatarColor(): string {
    // explicit override wins, e.g. { type: 'avatar', backgroundColor: '#123456' }
    if (this.config.backgroundColor) return this.config.backgroundColor;

    const name = this.resolveName() || this.getFirstLetter();
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % this.palette.length;
    return this.palette[index];
  }

  private resolveName(): string | null {
    if (this.config.nameKey) {
      const v = CoreCardUtils.getValue(this.data, this.config.nameKey);
      if (v != null && String(v).trim() !== '') return String(v);
    }
    const fallbacks = ['name', 'patient_name', 'full_name', 'title'];
    for (const k of fallbacks) {
      const v = CoreCardUtils.getValue(this.data, k);
      if (v != null && String(v).trim() !== '') return String(v);
    }
    return null;
  }
}