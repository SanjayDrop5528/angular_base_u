import { ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, ViewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FieldArrayType } from '@ngx-formly/core';
import * as _ from 'lodash';
import { TranslateService } from '@ngx-translate/core';
import { DataService } from '../../../core/services/data.service';
import { DialogService } from '../../../core/services/dialog.service';
import { DynamicStepperComponent } from './dynamic-stepper/dynamic-stepper.component';


@Component({
  selector: 'formly-repeat-section',
  standalone: false,
  template: `
    <div class="repeat-section-wrapper" [ngClass]="props['repeatClassName']" [class.has-prevent-add]="props['preventAdd'] === true">

      <div class="repeat-header">
        <div class="repeat-header-left" *ngIf="props.label || props['description']">
          <h3 class="repeat-title" *ngIf="props.label">{{ props.label | translate }}</h3>
          <p class="repeat-desc" *ngIf="props['description']">{{ props['description'] | translate }}</p>
        </div>
        @if (buttonShow) {
          <button #headerAddBtn type="button" class="repeat-header-add-btn" (click)="addNewItem()">
            <mat-icon>add</mat-icon>
            <span>{{ 'FORM.REPEAT.ADD_NEW' | translate }}</span>
          </button>
        }
      </div>

      <!-- Empty state — shown when no items yet -->
      <div class="repeat-empty-state" *ngIf="!field.fieldGroup || field.fieldGroup.length === 0">
        <mat-icon class="empty-icon">inbox</mat-icon>
        <p class="empty-text">{{ 'FORM.REPEAT.NO_ITEMS_ADDED' | translate:{ label: (props.label | translate) || ('FORM.REPEAT.ITEMS' | translate) } }}</p>
        <p class="empty-hint" [innerHTML]="'FORM.REPEAT.EMPTY_HINT' | translate"></p>
      </div>

      <!-- Card list -->
      <div class="repeat-list" *ngIf="field.fieldGroup && field.fieldGroup.length > 0">
        @for (fieldGroupItem of field.fieldGroup; track i; let i = $index) {
          <div class="premium-repeat-card" (click)="editItem(i)">

            <div class="card-index-box">
              <span>{{ formatIndex(i + 1) }}</span>
            </div>

            <div class="card-content">
              <h4 class="card-title">{{ getCardTitle(getItemModel(i), i) }}</h4>
              <div class="card-details-row" *ngIf="getCardDetails(getItemModel(i)).length > 0">
                <span class="detail-chip" *ngFor="let detail of getCardDetails(getItemModel(i))">
                  <span class="detail-label">{{ detail.label }}:</span>
                  <span class="detail-value">{{ detail.value }}</span>
                </span>
              </div>
              <div class="card-placeholder" *ngIf="getCardDetails(getItemModel(i)).length === 0">
                {{ 'FORM.REPEAT.CLICK_ENTER_DETAILS' | translate }}
              </div>
            </div>

            <div class="card-actions" (click)="$event.stopPropagation()">
              <button type="button" class="card-action-btn" [matMenuTriggerFor]="actionMenu" [title]="'FORM.COMMON.ACTIONS' | translate">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #actionMenu="matMenu" xPosition="before">
                <button mat-menu-item (click)="editItem(i)">
                  <mat-icon>edit</mat-icon>
                  <span>{{ 'FORM.COMMON.EDIT' | translate }}</span>
                </button>
                @if (buttonShow) {
                  <button mat-menu-item (click)="deleteItem(i)">
                    <mat-icon style="color: #ef4444;">delete_outline</mat-icon>
                    <span style="color: #ef4444;">{{ 'FORM.COMMON.DELETE' | translate }}</span>
                  </button>
                }
              </mat-menu>
            </div>

          </div>
        }
      </div>


      <!-- Slide-out Drawer Overlay & Panel (appended to body, uses global rpt-drawer-* classes) -->
      <div #drawerWrapper>
        <div #drawerOverlay class="rpt-drawer-overlay" *ngIf="isDrawerOpen" (click)="closeDrawer(true)"></div>
        <div #drawerContainer class="rpt-drawer-panel" [class.open]="isDrawerOpen" *ngIf="isDrawerOpen" [ngStyle]="this.props['sliderWidth'] ? {'max-width': this.props['sliderWidth'],'width': this.props['sliderWidth']} : {}">
          <div class="rpt-drawer-header">
            <div class="rpt-drawer-header-left">
              <mat-icon>edit_note</mat-icon>
              <span>{{ drawerTitle }}</span>
            </div>
            <button type="button" class="rpt-drawer-close-btn" (click)="closeDrawer(true)" [title]="'FORM.COMMON.CLOSE' | translate">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="rpt-drawer-body" *ngIf="activeEditIndex !== null && activeFieldConfig">
            <formly-field [field]="activeFieldConfig"></formly-field>
          </div>

          <div class="rpt-drawer-footer">
            <button type="button" class="rpt-btn-cancel" (click)="closeDrawer(true)">{{ 'FORM.COMMON.CANCEL' | translate }}</button>
            <button type="button" class="rpt-btn-save" (click)="saveDrawer()">{{ 'FORM.COMMON.SAVE_CLOSE' | translate }}</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`

    /* ── Wrapper ───────────────────────────────────────────── */
    .repeat-section-wrapper {
      margin-bottom: 16px;
      width: 100%;
      position: relative;
    }

    /* ── Header ────────────────────────────────────────────── */
    .repeat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      width: 100%;
    }

    .repeat-header-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
      text-align: left;
    }

    .repeat-title {
      display: none;
    }
 
    .repeat-desc {
      display: none;
    }

    .has-prevent-add .repeat-title {
      display: block !important;
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-main, #0f172a);
      text-align: left;
    }

    .has-prevent-add .repeat-desc {
      display: block !important;
      margin: 2px 0 0 0;
      font-size: 12px;
      color: var(--text-muted, #64748b);
      text-align: left;
    }

    .repeat-header-add-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: var(--bg-subtle);
      border: 1.2px dashed rgba(var(--primary-color-rgb), 0.25);
      border-radius: 6px;
      color: var(--primary-color);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .repeat-header-add-btn:hover {
      background: rgba(var(--primary-color-rgb), 0.1);
      border-color: var(--primary-color);
    }

    .repeat-header-add-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* ── Empty state ───────────────────────────────────────── */
    .repeat-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 20px;
      border: 1.5px dashed var(--border-color, rgba(15,23,42,0.12));
      border-radius: 10px;
      background: var(--bg-subtle);
      margin-bottom: 12px;
      text-align: center;
      gap: 4px;
    }

    .empty-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: var(--text-muted, #94a3b8);
      margin-bottom: 4px;
    }

    .empty-text {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main, #0f172a);
      margin: 0;
    }

    .empty-hint {
      font-size: 12px;
      color: var(--text-muted, #64748b);
      margin: 0;
    }

    /* ── Card list ─────────────────────────────────────────── */
    .repeat-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 12px;
    }

    .premium-repeat-card {
      display: flex;
      align-items: center;
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border-color, rgba(15,23,42,0.1));
      border-left: 3px solid var(--primary-color, #3b82f6);
      border-radius: 10px;
      padding: 14px 18px;
      cursor: pointer;
      transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
    }

    .premium-repeat-card:hover {
      background: var(--bg-card-hover, rgba(241,245,249,0.95));
      border-left-color: var(--primary-color, #3b82f6);
      box-shadow: 0 4px 14px rgba(0,0,0,0.05);
      transform: translateY(-1px);
    }

    .card-grip {
      display: flex;
      align-items: center;
      color: var(--text-muted, #718096);
      margin-right: 12px;
      cursor: grab;
    }

    .card-grip mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .card-index-box {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(var(--primary-color-rgb), 0.08);
      border: 1px solid rgba(var(--primary-color-rgb), 0.2);
      color: var(--primary-color);
      border-radius: 6px;
      font-weight: 700;
      font-family: monospace;
      font-size: 13px;
      margin-right: 14px;
      flex-shrink: 0;
    }

    .card-content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
      text-align: left;
      align-items: flex-start;
    }

    .card-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main, #0f172a);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
    }

    .card-details-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 2px;
    }

    .detail-chip {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      background: rgba(var(--primary-color-rgb), 0.06);
      border: 1px solid rgba(var(--primary-color-rgb), 0.15);
      border-radius: 4px;
      padding: 2px 7px;
      font-size: 11px;
      line-height: 1.4;
    }

    .detail-label {
      color: var(--text-muted, #64748b);
      font-weight: 500;
    }

    .detail-value {
      color: var(--text-main, #0f172a);
      font-weight: 600;
    }

    .card-placeholder {
      font-size: 12px;
      font-style: italic;
      color: var(--text-muted, #94a3b8);
    }

    .card-actions {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-shrink: 0;
      margin-left: 8px;
    }

    .card-action-btn {
      background: var(--hover-bg, rgba(0,0,0,0.04));
      color: var(--text-muted, #64748b);
      border: none;
      width: 30px;
      height: 30px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .card-action-btn mat-icon { font-size: 17px; width: 17px; height: 17px; }

    .card-action-btn.edit-btn:hover {
      background: rgba(var(--primary-color-rgb), 0.1);
      color: var(--primary-color);
    }

    .card-action-btn.delete-btn {
      background: rgba(239,68,68,0.08);
      color: #ef4444;
    }

    .card-action-btn.delete-btn:hover { background: rgba(239,68,68,0.16); }


    /* ── Drawer overlay ────────────────────────────────────── */
    .drawer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(2px);
      z-index: 1200;
    }

    /* ── Drawer panel ──────────────────────────────────────── */
    .drawer-container {
      position: fixed;
      top: 0;
      right: -650px;
      width: 600px;
      max-width: 90vw;
      height: 100dvh;
      background: var(--drawer-bg, #ffffff);
      border-left: 1px solid var(--border-color, rgba(15,23,42,0.1));
      box-shadow: -8px 0 32px rgba(0,0,0,0.12);
      z-index: 1201;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: right 0.28s cubic-bezier(0.25,0.8,0.25,1);
    }

    .drawer-container.open { right: 0; }

    /* Header — fixed height, never scrolls */
    .drawer-header {
      flex-shrink: 0;
      padding: 14px 18px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--drawer-header-bg, var(--drawer-bg, #fff));
    }

    .drawer-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-main);
    }

    .drawer-header-icon {
      color: var(--primary-color);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .drawer-header h3 {
      font-size: 14px;
      font-weight: 700;
      margin: 0;
    }

    .drawer-close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      padding: 0;
      border-radius: 50%;
      transition: all 0.2s;
    }

    .drawer-close-btn:hover {
      background: var(--hover-bg);
      color: var(--text-main);
    }

    /*
     * Body — fills ALL remaining space between header and footer.
     * flex: 1 1 0 + min-height: 0 is the key combination that prevents
     * the body from expanding past the drawer height and causing a scrollbar
     * on the container. overflow-y: auto lets content scroll ONLY when it
     * truly exceeds the available body height.
     */
    .drawer-body {
      flex: 1 1 0;
      min-height: 0;
      padding: 18px 18px 12px;
      overflow-y: auto;
      overflow-x: hidden;
      background: var(--drawer-bg, #fff);
    }

    /* Remove any extra bottom margin from the last formly field */
    .drawer-body ::ng-deep formly-field:last-child .mat-form-field,
    .drawer-body ::ng-deep formly-field:last-child .mat-mdc-form-field {
      margin-bottom: 0;
    }

    /* Constrain nested grids so they don't blow out the drawer width */
    .drawer-body ::ng-deep .form-grid-2,
    .drawer-body ::ng-deep .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 14px;
    }

    .drawer-body ::ng-deep .form-row-3,
    .drawer-body ::ng-deep .form-grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px 14px;
    }

    @media (max-width: 560px) {
      .drawer-body ::ng-deep .form-grid-2,
      .drawer-body ::ng-deep .form-row-2,
      .drawer-body ::ng-deep .form-row-3,
      .drawer-body ::ng-deep .form-grid-3 {
        grid-template-columns: 1fr;
      }
    }

    /* Footer — fixed height, never scrolls */
    .drawer-footer {
      flex-shrink: 0;
      padding: 12px 18px;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      background: var(--drawer-header-bg, var(--drawer-bg, #fff));
    }

    .btn-drawer-cancel {
      background: var(--hover-bg, #f1f5f9);
      color: var(--text-main);
      border: 1px solid var(--border-color);
      padding: 8px 18px;
      border-radius: var(--btn-radius, 6px);
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      transition: background 0.2s;
    }

    .btn-drawer-cancel:hover {
      background: rgba(var(--primary-color-rgb), 0.08);
    }

    .btn-drawer-save {
      background: var(--primary-color);
      color: var(--text-inverse, #ffffff);
      border: none;
      padding: 8px 20px;
      border-radius: var(--btn-radius, 6px);
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      transition: filter 0.2s;
      box-shadow: 0 3px 10px rgba(var(--primary-color-rgb), 0.2);
    }

    .btn-drawer-save:hover { filter: brightness(1.08); }

  `]
})
export class RepeatTypeComponent extends FieldArrayType implements OnDestroy {
  constructor() { super(); }

  buttonShow: any;
  isDrawerOpen = false;
  activeEditIndex: number | null = null;
  activeFieldConfig: any = null;
  drawerTitle = '';
  backupModel: any = null;
  isNewItem = false;

  private cdr = inject(ChangeDetectorRef);
  private dataService = inject(DataService);
  private dialogService = inject(DialogService);
  private translateService = inject(TranslateService);
  private stepper = inject(DynamicStepperComponent, { optional: true });
  private doc = inject(DOCUMENT);
  private relocatedBtn: HTMLElement | null = null;

  @ViewChild('drawerWrapper') drawerWrapper!: ElementRef;
  drawerContainerEl: ElementRef | null = null;
  drawerOverlayEl: ElementRef | null = null;

  private getDrawerContainerTarget(): HTMLElement {
    let el = this.drawerWrapper?.nativeElement as HTMLElement;
    while (el) {
      if (
        el.classList?.contains('detail-drawer') ||
        el.classList?.contains('onboarding-drawer') ||
        el.classList?.contains('mat-drawer') ||
        el.classList?.contains('mat-drawer-inner-container')
      ) {
        return el;
      }
      el = el.parentElement as HTMLElement;
    }
    return this.doc.body;
  }

  @ViewChild('drawerContainer') set drawerContainer(el: ElementRef) {
    if (el) {
      this.drawerContainerEl = el;
      const target = this.getDrawerContainerTarget();
      if (target !== this.doc.body) {
        el.nativeElement.classList.add('nested-in-drawer');
      } else {
        el.nativeElement.classList.remove('nested-in-drawer');
      }
      if (el.nativeElement.parentElement !== target) {
        target.appendChild(el.nativeElement);
      }
    }
  }

  @ViewChild('drawerOverlay') set drawerOverlay(el: ElementRef) {
    if (el) {
      this.drawerOverlayEl = el;
      const target = this.getDrawerContainerTarget();
      if (target !== this.doc.body) {
        el.nativeElement.classList.add('nested-in-drawer');
      } else {
        el.nativeElement.classList.remove('nested-in-drawer');
      }
      if (el.nativeElement.parentElement !== target) {
        target.appendChild(el.nativeElement);
      }
    }
  }

  @ViewChild('headerAddBtn') set headerAddBtn(el: ElementRef) {
    if (el && this.props['preventAdd'] != true && window.innerWidth >= 768) {
      const target = this.doc.getElementById('stepper-header-actions');
      if (target) {
        if (el.nativeElement.parentElement !== target) {
          target.innerHTML = '';
          target.appendChild(el.nativeElement);
        }
        this.relocatedBtn = el.nativeElement;
      }
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  formatIndex(index: number): string {
    return index < 10 ? `0${index}` : `${index}`;
  }

  /**
   * Flatten one level: if all top-level values are plain objects (keyless
   * wrapper pattern), merge them into one flat map.  Otherwise clone as-is.
   */
  private flattenRaw(raw: any): any {
    if (!raw || typeof raw !== 'object') return {};
    const keys = Object.keys(raw);
    const allObjects = keys.length > 0 && keys.every(k => {
      const v = raw[k];
      return v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
    });
    if (allObjects) {
      return keys.reduce((acc: any, k: string) => Object.assign(acc, raw[k]), {});
    }
    return { ...raw };
  }

  /**
   * Returns flattened data from the form control ONLY.
   * Used for API payloads — keeps the same structure the backend expects.
   */
  getItemModelForApi(index: number): any {
    const ctrl = this.formControl?.at(index);
    const raw = ctrl?.value ?? this.model?.[index] ?? {};
    return this.flattenRaw(raw);
  }

  /**
   * Returns flattened data merged from BOTH the form control and the model.
   * Model values take priority because saveDrawer updates them.
   * Used for card display so the UI reflects the latest edits even if
   * the form control was reset by formly's field destruction.
   */
  getItemModel(index: number): any {
    const ctrl = this.formControl?.at(index);
    const ctrlRaw = ctrl?.value ?? {};
    const modelRaw = this.model?.[index] ?? {};

    const flatCtrl = this.flattenRaw(ctrlRaw);
    const flatModel = this.flattenRaw(modelRaw);

    // Merge — model values take priority (they're updated by saveDrawer)
    return { ...flatCtrl, ...flatModel };
  }

  private extractDisplayValue(val: any): string {
    if (val === undefined || val === null || val === '') return '';
    if (Array.isArray(val)) {
      return val.map(item => {
        if (item && typeof item === 'object') {
          return item.name || item.label || item.value || item.id || String(item);
        }
        return String(item);
      }).join(', ');
    }
    if (typeof val === 'object') {
      return val.name || val.label || val.value || val.id || String(val);
    }
    return String(val);
  }

  getCardTitle(item: any, index: number): string {
    if (!item) return `Item ${index + 1}`;
    const previewFields = this.props['previewFields'];
    console.log("getCardTitle item:", item);
    console.log("getCardTitle previewFields:", previewFields);
    if (previewFields?.length > 0) {
      const val = item[previewFields[0].key];
      const display = this.extractDisplayValue(val);
      if (display !== '') {
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        const jsDateStringRegex = /^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4} \d{2}:\d{2}:\d{2} GMT[+-]\d{4}/;
        if (val instanceof Date || isoDateRegex.test(display) || jsDateStringRegex.test(display)) {
          const d = val instanceof Date ? val : new Date(display);
          if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          }
        }
        return display;
      }
    }
    // fallback: first non-empty string value in the object
    const firstVal = Object.values(item).find(v => v !== undefined && v !== null && v !== '');
    return firstVal ? this.extractDisplayValue(firstVal) : `Item ${index + 1}`;
  }

  getCardDetails(item: any): { label: string; value: string }[] {
    if (!item) return [];
    const previewFields = this.props['previewFields'];
    const details: { label: string; value: string }[] = [];

    if (!previewFields || previewFields.length <= 1) return details;

    for (let i = 1; i < previewFields.length; i++) {
      const f = previewFields[i];
      let val = item[f.key];
      if (val === undefined || val === null || val === '') continue;

      // Merge dosage + dosage_unit into one chip
      if (f.key === 'dosage') {
        const unitVal = item['dosage_unit'] || item['Unit'];
        console.log("Found dosage key. item:", item, "unitVal:", unitVal, "val:", val);
        if (unitVal) {
          const unitStr = this.extractDisplayValue(unitVal);
          val = `${this.extractDisplayValue(val)} ${unitStr}`;
        }
      } else if (f.key === 'dosage_unit' || f.key === 'Unit') {
        continue; // already merged with dosage
      }

      let display = this.extractDisplayValue(val);
      if (display === '[object Object]') display = ''; // fallback
      if (display === '') continue;

      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      const jsDateStringRegex = /^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4} \d{2}:\d{2}:\d{2} GMT[+-]\d{4}/;

      if (val instanceof Date || isoDateRegex.test(display) || jsDateStringRegex.test(display)) {
        const d = val instanceof Date ? val : new Date(display);
        if (!isNaN(d.getTime())) {
          display = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      } else if (f.key && String(f.key).toLowerCase().includes('amount')) {
        const num = Number(display);
        if (!isNaN(num)) {
          display = num.toLocaleString('en-IN');
        }
      } else if (display.includes('_')) {
        display = display.split('_')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      } else if (display === 'true') { display = 'Yes'; }
      else if (display === 'false') { display = 'No'; }

      // Resolve the label from previewFields — translate if it's an i18n key
      const rawLabel: string = f.label || f.key || '';
      const translatedLabel = rawLabel.includes('.')
        ? (this.translateService?.instant(rawLabel) || rawLabel.split('.').pop() || rawLabel)
        : rawLabel;

      details.push({ label: translatedLabel, value: display });
    }
    return details;
  }

  // ── Drawer actions ────────────────────────────────────────────────────────

  addNewItem() {
    this.add();
    if (this.options && (this.options as any).build) {
      (this.options as any).build();
    }

    setTimeout(() => {
      const newIndex = (this.field.fieldGroup?.length || 1) - 1;
      this.isNewItem = true;
      this.activeEditIndex = newIndex;
      this.activeFieldConfig = this.field.fieldGroup?.[newIndex] || null;
      const lbl = this.translateService.instant(this.props.label || 'Item');
      this.drawerTitle = this.translateService.instant('FORM.REPEAT.ADD_NEW_LABEL', { label: lbl }) || `Add New ${lbl}`;
      this.backupModel = null;
      this.isDrawerOpen = true;
      this.cdr.detectChanges();
    });
  }

  editItem(index: number) {
    this.isNewItem = false;
    this.activeEditIndex = index;
    this.activeFieldConfig = this.field.fieldGroup?.[index] || null;
    const lbl = this.translateService.instant(this.props.label || 'Item');
    this.drawerTitle = this.translateService.instant('FORM.REPEAT.EDIT_LABEL', { label: lbl, index: index + 1 }) || `Edit ${lbl} #${index + 1}`;
    this.backupModel = _.cloneDeep(this.model[index]);
    this.isDrawerOpen = true;
    this.cdr.detectChanges();
  }

  saveDrawer() {
    if (this.activeEditIndex === null) {
      this.closeDrawer();
      return;
    }

    const index = this.activeEditIndex;
    const control = this.formControl.at(index);
    if (control) {
      control.markAllAsTouched();
      if (control.invalid) {
        this.dialogService.openSnackBar(this.translateService.instant('FORM.REPEAT.FILL_REQUIRED_FIELDS') || 'Please fill all required fields correctly.');
        return;
      }
    }

    // Use getItemModelForApi (form control only) for the API payload so
    // we don't accidentally send array-typed label fields to the backend.
    const item = this.getItemModelForApi(index);

    const collectionName = this.props['collectionName'];
    const parentField = this.props['parentField'];
    const parentId = this.stepper?.onboardingModel?.id || this.stepper?.onboardingModel?.patient_id;

    const callSupportApi = () => {
      const supportApi = this.props['supportApi'];
      if (supportApi && parentId) {
        let url = supportApi.replace('{{parentField}}', parentId);
        url = url.replace(/([^:]\/)\/+/g, "$1");
        if (url.startsWith('/')) {
          url = url.substring(1);
        }
        this.dataService.save(url, {}).subscribe({
          next: () => console.log('PATCH supportApi success', url),
          error: (err: any) => console.error('PATCH supportApi error', url, err)
        });
      }
    };

    if (collectionName && parentId) {
      const payload = { ...item };
      if (parentField != null && parentField != undefined && parentField != "") {
        payload[parentField] = parentId;
      }

      const itemId = item.id || this.model[index]?.id;

      if (itemId) {
        this.dataService.update(collectionName, itemId, payload).subscribe({
          next: (res: any) => {
            // Merge flattened new values INTO existing model —
            // preserves addFieldToModel labels (allergy_name_label etc.)
            this.model[index] = { ...this.model[index], ...item };
            this.dialogService.openSnackBar(this.translateService.instant('FORM.REPEAT.RECORD_UPDATED') || 'Record updated successfully!');
            callSupportApi();
            this.finishSaveDrawer();
          },
          error: (err: any) => {
            console.error('Failed to update record via dynamic API', err);
            this.dialogService.openSnackBar(err.error?.error || this.translateService.instant('FORM.REPEAT.FAILED_UPDATE') || 'Failed to update record. Please try again.');
          }
        });
      } else {
        this.dataService.save(`entities/${collectionName}`, payload).subscribe({
          next: (res: any) => {
            const newId = res?.data?.['insert ID'] || res?.insertId || res?.id;
            if (newId) {
              payload.id = newId;
            }
            this.model[index] = { ...this.model[index], ...item, ...(newId ? { id: newId } : {}) };
            this.dialogService.openSnackBar(this.translateService.instant('FORM.REPEAT.RECORD_ADDED') || 'Record added successfully!');
            callSupportApi();
            this.finishSaveDrawer();
          },
          error: (err: any) => {
            console.error('Failed to create record via dynamic API', err);
            this.dialogService.openSnackBar(err.error?.error || this.translateService.instant('FORM.REPEAT.FAILED_CREATE') || 'Failed to create record. Please try again.');
          }
        });
      }
    } else {
      this.model[index] = { ...this.model[index], ...item };
      this.finishSaveDrawer();
    }
  }

  private moveElementsBack() {
    const wrapper = this.drawerWrapper?.nativeElement;
    const container = this.drawerContainerEl?.nativeElement;
    const overlay = this.drawerOverlayEl?.nativeElement;
    if (wrapper) {
      if (container) wrapper.appendChild(container);
      if (overlay) wrapper.appendChild(overlay);
    }
  }

  private finishSaveDrawer() {
    const savedIndex = this.activeEditIndex;
    const savedNestedValue = savedIndex !== null && this.formControl.at(savedIndex)
      ? _.cloneDeep(this.formControl.at(savedIndex).value)
      : null;

    this.moveElementsBack();
    this.isDrawerOpen = false;
    this.activeEditIndex = null;
    this.activeFieldConfig = null;
    this.isNewItem = false;

    // First pass: destroy the drawer DOM (formly-field gets removed)
    this.cdr.detectChanges();

    // After the drawer is fully destroyed, re-sync the form control
    // with the saved nested value so the card list shows the new data.
    if (savedIndex !== null && savedNestedValue) {
      try {
        this.formControl.at(savedIndex)?.patchValue(savedNestedValue, { emitEvent: false });
      } catch (e) {
        // patchValue can fail if the control structure changed; ignore safely
      }
    }
    this.formControl.updateValueAndValidity();
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  closeDrawer(isCancel = false) {
    this.moveElementsBack();
    if (isCancel && this.activeEditIndex !== null) {
      if (this.isNewItem) {
        this.remove(this.activeEditIndex);
      } else if (this.backupModel) {
        this.model[this.activeEditIndex] = this.backupModel;
        this.formControl.at(this.activeEditIndex)
          .patchValue(this.backupModel, { emitEvent: false });
      }
    }
    this.isDrawerOpen = false;
    this.activeEditIndex = null;
    this.activeFieldConfig = null;
    this.isNewItem = false;
    this.cdr.detectChanges();
  }
  deleteItem(index: number) {
    const item = this.model?.[index];
    const itemId = item?._id || item?.id;
    const currentStep = this.stepper?.visibleSteps?.[this.stepper.activeStepIndex];
    const collectionName = this.props['collectionName'] || currentStep?.collectionName;

    const confirmMsg = this.translateService?.instant('CONFIRM_MSG.DELETE_RECORD')
      || 'Do you wish to delete this record?';

    this.dialogService.openConfirmation(confirmMsg).afterClosed().subscribe((res: any) => {
      if (!res) return;
      if (itemId && collectionName) {
        this.dataService.deleteDataById(collectionName, itemId).subscribe({
          next: () => {
            this.remove(index);
            this.cdr.detectChanges();
            this.dialogService.openSnackBar(this.translateService.instant('FORM.REPEAT.RECORD_DELETED') || 'Record deleted successfully!');
          },
          error: (err: any) => {
            console.error('Failed to delete record from DB', err);
            this.dialogService.openSnackBar(err.error?.error || this.translateService.instant('FORM.REPEAT.FAILED_DELETE') || 'Failed to delete record. Please try again.');
          }
        });
      } else {
        this.remove(index);
        this.cdr.detectChanges();
      }
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.buttonShow = _.hasIn(this.field, 'buttonShow')
      ? _.get(this.field, 'buttonShow')
      : true;

    if (_.hasIn(this.field, 'parentKey')) {
      const parentKey: any = _.get(this.field, 'parentKey') || '';
      const parentControl = this.form.get(parentKey);
      if (parentControl != null && parentControl.value > 0) {
        this.generateBasedOnParentValue(parentControl.value);
      }
      if (parentControl != null) {
        parentControl.valueChanges.subscribe((res: any) => {
          this.generateBasedOnParentValue(res);
        });
      }
    }

    const registerFn = this.props?.['registerFieldPopulator'];
    if (typeof registerFn === 'function' && this.field.key) {
      const arrayKey = String(this.field.key);
      registerFn(arrayKey, (rows: any[]) => this.populateRows(rows));
    }
  }

  ngAfterViewInit() {
    // Intentionally empty — list starts empty, no auto-add.
  }

  // ── Populator (for edit/reload scenarios) ────────────────────────────────

  populateRows(rows: any[]): void {
    const current = this.field.fieldGroup?.length || 0;
    for (let i = current - 1; i >= 0; i--) { this.remove(i); }
    rows.forEach((rowData: any) => this.add(undefined, rowData));
    this.cdr.detectChanges();
  }

  // ── Parent-value-driven generation ──────────────────────────────────────

  generateBasedOnParentValue(value: any) {
    const fieldLength = this.field.fieldGroup?.length || 0;
    const resCount = Number(value);
    if (isNaN(resCount)) return;
    if (resCount < fieldLength) {
      for (let i = fieldLength - 1; i >= resCount; i--) { this.remove(i); }
    } else if (resCount > fieldLength) {
      for (let i = fieldLength; i < resCount; i++) { this.add(undefined, {}); }
    }
  }

  addWithIndex(index?: any) { this.add(index, {}); }
  removeWithIndex(index: any) { this.remove(index); }

  ngOnDestroy(): void {
    if (this.relocatedBtn) {
      this.relocatedBtn.remove();
    }
    if (this.drawerContainerEl) {
      this.drawerContainerEl.nativeElement.remove();
    }
    if (this.drawerOverlayEl) {
      this.drawerOverlayEl.nativeElement.remove();
    }
  }
}
