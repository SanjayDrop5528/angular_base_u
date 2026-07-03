import { Component, OnInit, OnDestroy, ElementRef, HostListener, inject, ChangeDetectorRef, DoCheck } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormControl, Validators } from '@angular/forms';
import { FieldType, FormlyModule } from '@ngx-formly/core';
import { HttpClient } from '@angular/common/http';
import { MatSelectModule } from '@angular/material/select';
import { DataService } from '../../../core/services/data.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'dropdown-dynamic-input',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    FormlyModule,
    MatSelectModule,
    TranslateModule
  ],
  styles: [`
    .custom-mff-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      box-sizing: border-box;
      margin-bottom: 20px;
    }

    /* ── Floating label (starts centered inside, floats to top border on click) ── */
    .custom-mff-label {
      position: absolute;
      left: var(--mff-padding-x, 14px);
      top: 50%;
      transform: translateY(-50%) scale(1);
      transform-origin: left center;
      font-family: var(--mff-font-family, inherit);
      font-size: var(--mff-font-size, 0.93rem);
      font-weight: 400;
      color: var(--mff-placeholder-color, rgba(255, 255, 255, 0.6));
      pointer-events: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: calc(100% - 28px);
      z-index: 2;
      line-height: 1;
      padding: 0 2px;
      border-radius: 2px;
      transition: top 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                  transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                  font-size 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                  color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 0.2s ease,
                  padding 0.2s ease,
                  background 0.15s ease,
                  left 0.2s ease,
                  max-width 0.2s ease;
    }

    /* Hide in-field label when prefix occupies that space */
    .custom-mff-label:not(.floating).has-prefix-space {
      left: 110px;
      max-width: calc(100% - 124px);
    }

    /* Floated state: normal = grey, focused = primary, error = red */
    .custom-mff-label.floating {
      top: 0;
      transform: translateY(-50%) scale(1);
      font-size: 0.72rem;
      font-weight: 500;
      color: var(--mff-label-color, rgba(255, 255, 255, 0.6));
      background: var(--mff-label-float-bg);
      padding: 0 5px;
    }

    .custom-mff-container.focused .custom-mff-label.floating {
      color: var(--mff-border-focus-color, #1a73e8);
    }

    .custom-mff-container.has-error .custom-mff-label.floating {
      color: var(--mff-error-text-color, #ef4444);
    }

    // .required-star {
    //   color: var(--mff-border-error-color, #ef4444);
    // }

    .custom-mff-wrapper {
      position: relative;
      overflow: visible;
      display: flex;
      align-items: center;
      width: 100%;
      height: var(--mff-height, 48px);
      background: var(--mff-bg, rgba(255, 255, 255, 0.04));
      border: var(--mff-border-width, 1.5px) solid var(--mff-border-color, rgba(255, 255, 255, 0.12));
      border-radius: var(--mff-border-radius, 10px);
      padding: 0 var(--mff-padding-x, 14px);
      box-sizing: border-box;
      transition: var(--mff-transition, all 0.25s ease);
    }

    .custom-mff-wrapper:hover {
      border-color: rgba(255, 255, 255, 0.25);
    }

    .custom-mff-container.focused .custom-mff-wrapper {
      border-color: var(--mff-border-focus-color, #1a73e8);
      background: var(--mff-bg-focus, rgba(255, 255, 255, 0.07));
      box-shadow: 0 0 0 1px var(--mff-border-focus-color, #1a73e8);
    }

    /* Error state: red border + red label */
    .custom-mff-container.has-error .custom-mff-wrapper {
      border-color: var(--mff-border-error-color, #ef4444);
      box-shadow: 0 0 0 1px var(--mff-border-error-color, #ef4444);
    }

    /* Error takes priority over hover when in error state */
    .custom-mff-container.has-error .custom-mff-wrapper:hover {
      border-color: var(--mff-border-error-color, #ef4444);
    }

    .custom-input {
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      --tw-ring-shadow: 0 0 #0000 !important;
      background: transparent !important;
      color: var(--mff-input-color, #f1f3f9);
      font-family: var(--mff-font-family, inherit);
      font-size: var(--mff-font-size, 0.93rem);
      box-sizing: border-box;
      line-height: normal;
    }

    .custom-input:focus,
    .custom-input:active,
    .custom-input:hover {
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      --tw-ring-shadow: 0 0 #0000 !important;
      background: transparent !important;
    }

    /* Custom Material select panel overlay */
    .custom-select-container {
      position: relative;
      cursor: pointer;
      user-select: none;
      display: flex;
      align-items: center;
      height: 100%;
    }

    .prefix-select {
      width: 80px;
    }

    .suffix-select {
      width: 90px;
    }

    .select-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      height: 100%;
      font-size: var(--mff-font-size, 0.93rem);
      color: var(--mff-placeholder-color, rgba(255, 255, 255, 0.25));
      padding: 0 4px;
    }

    .select-trigger.has-value {
      color: var(--mff-input-color, #f1f3f9);
    }

    .trigger-value {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .arrow-icon {
      font-size: 0.55rem;
      margin-left: 6px;
      color: var(--mff-icon-color, rgba(255, 255, 255, 0.45));
      transition: transform 0.2s ease, color 0.2s ease;
    }

    .custom-select-container.open .arrow-icon {
      transform: rotate(180deg);
      color: var(--mff-border-focus-color, #1a73e8);
    }

    .custom-dropdown-panel {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      min-width: 130px;
      background: var(--mff-select-panel-bg, #1e293b);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--mff-border-radius, 8px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
      z-index: 1000;
      overflow-y: auto;
      max-height: 200px;
      padding: 4px;
      animation: dropdownFadeIn 0.15s ease-out;
    }

    .custom-dropdown-option {
      padding: 8px 12px;
      font-size: 0.88rem;
      border-radius: 6px;
      color: var(--mff-select-option-color, #f1f3f9);
      transition: background 0.15s ease, color 0.15s ease;
      white-space: nowrap;
    }

    .custom-dropdown-option:hover {
      background: var(--mff-select-hover-bg, rgba(255, 255, 255, 0.06));
    }

    .custom-dropdown-option.selected {
      background: var(--mff-select-selected-bg, rgba(26, 115, 232, 0.15));
      color: var(--mff-select-selected-color, #1a73e8);
      font-weight: 500;
    }

    .divider {
      width: 1.5px;
      height: 50%;
      background: var(--mff-border-color, rgba(255, 255, 255, 0.12));
      margin: 0 8px;
    }

    .main-input {
      flex: 1;
      width: 100%;
      padding: 0 4px;
    }

    .main-input::placeholder {
      color: transparent; /* label acts as placeholder */
    }

    /* Show placeholder only when label has floated (so both aren't visible) */
    .custom-mff-container.focused .main-input::placeholder {
      color: var(--mff-placeholder-color, rgba(255, 255, 255, 0.25));
      transition: color 0.15s ease 0.1s;
    }

    /* Light theme: label float background matches light card */
    ::ng-deep [data-theme="morning"] .custom-mff-label.floating {
      background: var(--mff-label-float-bg-light, #f0f4f8);
    }

    .custom-mff-error {
      /* Matches .mat-mdc-form-field-error from mat-form-field-theme.scss */
      color: var(--mff-error-text-color, var(--color-error, #ef4444));
      font-size: 0.7rem;
      font-weight: 500;
      font-family: var(--mff-font-family, inherit);
      margin-top: 4px;
      margin-left: 4px;
    }

    @keyframes dropdownFadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Angular Material select integration styles */
    .custom-mat-select {
      display: flex;
      align-items: center;
      width: 100%;
      height: 100%;
      font-family: var(--mff-font-family, inherit);
      font-size: var(--mff-font-size, 0.93rem);
    }

    ::ng-deep .custom-mat-select .mat-mdc-select-value {
      color: var(--mff-input-color, #f1f3f9) !important;
      font-family: var(--mff-font-family, inherit);
      font-size: var(--mff-font-size, 0.93rem);
    }
    
    ::ng-deep .custom-mat-select .mat-mdc-select-placeholder {
      color: var(--mff-placeholder-color, rgba(255, 255, 255, 0.25)) !important;
    }
    
    ::ng-deep .custom-mat-select .mat-mdc-select-arrow svg {
      fill: var(--mff-icon-color, rgba(255, 255, 255, 0.45)) !important;
    }

    .select-search-container {
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(8px);
    }

    .select-search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      width: 14px;
      height: 14px;
      color: rgba(255, 255, 255, 0.4);
      pointer-events: none;
      transition: color 0.15s ease;
    }

    .select-search-input {
      width: 100%;
      box-sizing: border-box;
      padding: 6px 28px 6px 28px;
      font-size: 0.8rem;
      font-family: inherit;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      outline: none;
      background: rgba(255, 255, 255, 0.03);
      color: var(--mff-input-color, #f8fafc);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .select-search-input:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .select-search-input:focus {
      border-color: var(--mff-border-focus-color, #3b82f6);
      background: rgba(15, 23, 42, 0.6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }

    .select-search-input:focus ~ .search-icon {
      color: var(--mff-border-focus-color, #3b82f6);
    }

    .clear-button {
      position: absolute;
      right: 6px;
      background: transparent;
      border: none;
      padding: 3px;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      transition: all 0.15s ease;
    }

    .clear-button:hover {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.8);
    }

    .clear-button svg {
      width: 12px;
      height: 12px;
    }

    /* ── Light Mode override ("morning" theme) ── */
    ::ng-deep [data-theme="morning"] .select-search-container {
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    ::ng-deep [data-theme="morning"] .search-icon {
      color: rgba(0, 0, 0, 0.4);
    }

    ::ng-deep [data-theme="morning"] .select-search-input {
      background: rgba(0, 0, 0, 0.02);
      border-color: rgba(0, 0, 0, 0.08);
      color: #0f172a;
    }

    ::ng-deep [data-theme="morning"] .select-search-input:hover {
      background: rgba(0, 0, 0, 0.04);
      border-color: rgba(0, 0, 0, 0.12);
    }

    ::ng-deep [data-theme="morning"] .select-search-input:focus {
      border-color: var(--mff-border-focus-color, #3b82f6);
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    ::ng-deep [data-theme="morning"] .select-search-input:focus ~ .search-icon {
      color: var(--mff-border-focus-color, #3b82f6);
    }

    ::ng-deep [data-theme="morning"] .clear-button {
      color: rgba(0, 0, 0, 0.4);
    }

    ::ng-deep [data-theme="morning"] .clear-button:hover {
      background: rgba(0, 0, 0, 0.06);
      color: rgba(0, 0, 0, 0.8);
    }
  `],
  template: `
    <div class="custom-mff-container" [class.focused]="isFocused" [class.has-error]="showError || hasAnyValidationError">

      <div class="custom-mff-wrapper">
        <!-- Floating Label: floats up on focus OR when field has a value -->
        <label class="custom-mff-label"
          [class.floating]="isFocused || hasAnyValue"
          [class.has-prefix-space]="hasPrefix"
        >
            {{ props.label }}
          <span *ngIf="required" class="required-star">*</span>
        </label>

        <!-- Custom Prefix Dropdown -->
        <div 
          *ngIf="hasPrefix" 
          class="custom-select-container prefix-select" 
          [class.open]="isPrefixDropdownOpen"
          (click)="togglePrefixDropdown($event)"
        >
          <div class="select-trigger" [class.has-value]="prefixControl.value">
            <span class="trigger-value">{{ (getSelectedPrefixLabel() | translate) || prefixLableName }}</span>
            <span class="arrow-icon">▼</span>
          </div>

          <div class="custom-dropdown-panel" *ngIf="isPrefixDropdownOpen">
            <div class="select-search-container" *ngIf="hasPrefixSearch" (click)="$event.stopPropagation();">
              <div class="select-search-wrapper">
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  class="select-search-input"
                  placeholder="Search..."
                  [value]="prefixSearchTerm"
                  (input)="onPrefixSearchInput($event)"
                  (keydown)="$event.stopPropagation();"
                  #prefixSearchInput
                />
                <button 
                  *ngIf="prefixSearchTerm"
                  type="button" 
                  class="clear-button" 
                  (click)="clearPrefixSearch($event); prefixSearchInput.focus();"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            <div 
              *ngFor="let opt of filteredPrefixOptions" 
              class="custom-dropdown-option" 
              [class.selected]="prefixControl.value === opt.value"
              (click)="selectPrefix(opt.value, $event)"
            >
              {{ opt.label | translate }}
            </div>
          </div>
        </div>

        <div class="divider" *ngIf="hasPrefix"></div>

        <!-- Main Input -->
        <ng-container [ngSwitch]="datatype">
          <!-- Angular Material mat-select integration -->
          <mat-select
            *ngSwitchCase="'select'"
            [formControl]="valueControl"
            placeholder="Select..."
            class="main-input custom-mat-select"
            (focus)="onFocus()"
            (blur)="onBlur()"
          >
            <mat-option *ngFor="let opt of mainSelectOptions" [value]="opt.value">
              {{ opt.label | translate }}
            </mat-option>
          </mat-select>

          <!-- Number input -->
          <input
            *ngSwitchCase="'number'"
            type="text"
            inputmode="numeric"
            [placeholder]="(props.placeholder | translate) || ''"
            [formControl]="valueControl"
            class="custom-input main-input"
            [maxLength]="props.maxLength"
            (focus)="onFocus()"
            (blur)="onBlur()"
            (input)="sanitizeInput($event)"
          />

          <!-- Default text input -->
          <input
            *ngSwitchDefault
            type="text"
            [attr.inputmode]="props.onlyNumbers ? 'numeric' : null"
            [placeholder]="(props.placeholder | translate) || ''"
            [formControl]="valueControl"
            class="custom-input main-input"
            [maxLength]="props.maxLength"
            (focus)="onFocus()"
            (blur)="onBlur()"
            (input)="props.onlyNumbers ? sanitizeInput($event) : null"
          />
        </ng-container>

        <div class="divider" *ngIf="hasSuffix"></div>

        <!-- Custom Suffix Dropdown -->
        <div 
          *ngIf="hasSuffix" 
          class="custom-select-container suffix-select" 
          [class.open]="isSuffixDropdownOpen"
          (click)="toggleSuffixDropdown($event)"
        >
          <div class="select-trigger" [class.has-value]="suffixControl.value">
            <span class="trigger-value">{{ (getSelectedSuffixLabel() | translate) || suffixLableName }}</span>
            <span class="arrow-icon">▼</span>
          </div>

          <div class="custom-dropdown-panel" *ngIf="isSuffixDropdownOpen">
            <div class="select-search-container" *ngIf="hasSuffixSearch" (click)="$event.stopPropagation();">
              <div class="select-search-wrapper">
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  class="select-search-input"
                  placeholder="Search..."
                  [value]="suffixSearchTerm"
                  (input)="onSuffixSearchInput($event)"
                  (keydown)="$event.stopPropagation();"
                  #suffixSearchInput
                />
                <button 
                  *ngIf="suffixSearchTerm"
                  type="button" 
                  class="clear-button" 
                  (click)="clearSuffixSearch($event); suffixSearchInput.focus();"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            <div 
              *ngFor="let opt of filteredSuffixOptions" 
              class="custom-dropdown-option" 
              [class.selected]="suffixControl.value === opt.value"
              (click)="selectSuffix(opt.value, $event)"
            >
              {{ opt.label | translate }}
            </div>
          </div>
        </div>
      </div>

      <!-- Errors -->
      <div class="custom-mff-error" *ngIf="showError || hasAnyValidationError">
        {{ combinedErrorMessage }}
      </div>
    </div>
  `
})
export class DropdownDynamicInput extends FieldType<any> implements OnInit, OnDestroy, DoCheck {

  override get model(): any {
    let currentField = this.field;
    while (currentField && currentField.parent) {
      const parent = currentField.parent;
      if (parent.key && parent.model) {
        const modelVal = parent.model[parent.key as string];
        if (modelVal) {
          return modelVal;
        }
      }
      currentField = parent;
    }
    return super.model;
  }

  // simaple field in stringify => {"key":"primary_phone","type":"dropdown-dynamic-input","props":{"label":"Primary Contact Phone","required":true,"datatype":"number","placeholder":"Enter Phone Number","prefixOptions":{"lable":"Country Code","key":"phone_code","options":[{"label":"+1","value":"+1"},{"label":"+91","value":"+91"},{"label":"+44","value":"+44"}]},"suffixOptions":{"lable":"Phone Type","key":"phone_type","options":[{"label":"Mobile","value":"mob"},{"label":"Work","value":"work"},{"label":"Home","value":"home"}]}}}

  prefixControl = new FormControl('');
  valueControl = new FormControl('');
  suffixControl = new FormControl('');

  datatype = 'text';
  required = false;
  prefixRequired = false;
  suffixRequired = false;
  isFocused = false;

  isPrefixDropdownOpen = false;
  isSuffixDropdownOpen = false;

  prefixOptions: any[] = [];
  suffixOptions: any[] = [];
  mainSelectOptions: any[] = [];

  prefixSearchTerm = '';
  suffixSearchTerm = '';

  get hasPrefixSearch(): boolean {
    const p = this.field.props?.prefixOptions;
    return !!(p?.['needSearch'] || p?.['needsearch'] || p?.['showSearch']);
  }

  get hasSuffixSearch(): boolean {
    const s = this.field.props?.suffixOptions;
    return !!(s?.['needSearch'] || s?.['needsearch'] || s?.['showSearch']);
  }

  onPrefixSearchInput(event: any) {
    this.prefixSearchTerm = event.target.value;
  }

  clearPrefixSearch(event: Event) {
    event.stopPropagation();
    this.prefixSearchTerm = '';
  }

  onSuffixSearchInput(event: any) {
    this.suffixSearchTerm = event.target.value;
  }

  clearSuffixSearch(event: Event) {
    event.stopPropagation();
    this.suffixSearchTerm = '';
  }

  get filteredPrefixOptions(): any[] {
    const opts = this.prefixOptions || [];
    if (!this.prefixSearchTerm) return opts;
    const term = this.prefixSearchTerm.toLowerCase();
    const p = this.field.props?.prefixOptions;
    const searchField = p?.['searchfield'] || p?.['searchField'];

    return opts.filter(opt => {
      const labelVal = String(opt?.label || '').toLowerCase();
      const valueVal = String(opt?.value || '').toLowerCase();
      if (labelVal.includes(term) || valueVal.includes(term)) return true;

      if (searchField) {
        const searchFieldVal = String(opt?.[searchField] || '').toLowerCase();
        if (searchFieldVal.includes(term)) return true;
      }
      return false;
    });
  }

  get filteredSuffixOptions(): any[] {
    const opts = this.suffixOptions || [];
    if (!this.suffixSearchTerm) return opts;
    const term = this.suffixSearchTerm.toLowerCase();
    const s = this.field.props?.suffixOptions;
    const searchField = s?.['searchfield'] || s?.['searchField'];

    return opts.filter(opt => {
      const labelVal = String(opt?.label || '').toLowerCase();
      const valueVal = String(opt?.value || '').toLowerCase();
      if (labelVal.includes(term) || valueVal.includes(term)) return true;

      if (searchField) {
        const searchFieldVal = String(opt?.[searchField] || '').toLowerCase();
        if (searchFieldVal.includes(term)) return true;
      }
      return false;
    });
  }

  private dataService = inject(DataService);
  private translateService = inject(TranslateService);
  private _formValueSub: any;

  constructor(private http: HttpClient, private elRef: ElementRef, private cdr: ChangeDetectorRef) {
    super();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      if (this.isPrefixDropdownOpen || this.isSuffixDropdownOpen || this.isFocused) {
        this.onBlur();
      }
      this.isPrefixDropdownOpen = false;
      this.isSuffixDropdownOpen = false;
      this.isFocused = false;
      this.prefixSearchTerm = '';
      this.suffixSearchTerm = '';
    }
  }

  get isPrefixErrorVisible(): boolean {
    return this.hasPrefix && this.prefixRequired &&
      (this.showError || this.prefixControl.touched || this.valueControl.touched || this.suffixControl.touched || this.formControl.touched) &&
      this.prefixControl.invalid;
  }

  get isMainErrorVisible(): boolean {
    return (this.showError || this.prefixControl.touched || this.valueControl.touched || this.suffixControl.touched || this.formControl.touched) &&
      this.valueControl.invalid;
  }

  get isSuffixErrorVisible(): boolean {
    return this.hasSuffix && this.suffixRequired &&
      (this.showError || this.prefixControl.touched || this.valueControl.touched || this.suffixControl.touched || this.formControl.touched) &&
      this.suffixControl.invalid;
  }

  get hasAnyValidationError(): boolean {
    return this.isPrefixErrorVisible || this.isMainErrorVisible || this.isSuffixErrorVisible;
  }

  get hasAnyValue(): boolean {
    return !!(this.prefixControl.value || this.valueControl.value || this.suffixControl.value);
  }

  get combinedErrorMessage(): string {
    // If the main input has specific errors like pattern/minlength, prioritize showing that.
    if (this.isMainErrorVisible && this.valueControl.errors) {
      const getMsg = (key: string) => {
        const localMsg = this.field.validation?.messages?.[key];
        if (localMsg) {
          if (typeof localMsg === 'function') {
            return localMsg(this.valueControl.errors?.[key], this.field);
          }
          return this.translateService?.instant(localMsg);
        }
        return null;
      };

      if (this.valueControl.errors['pattern']) {
        return getMsg('pattern') || this.translateService?.instant(this.field.props?.patternError || 'FORM.VALIDATION.INVALID_FORMAT') || 'Invalid format';
      }
      if (this.valueControl.errors['minlength']) {
        return getMsg('minlength') || this.translateService?.instant('FORM.VALIDATION.MIN_LENGTH_VALUE', { minLength: this.valueControl.errors['minlength'].requiredLength }) || `Minimum length is ${this.valueControl.errors['minlength'].requiredLength}`;
      }
      if (this.valueControl.errors['maxlength']) {
        return getMsg('maxlength') || this.translateService?.instant('FORM.VALIDATION.MAX_LENGTH_VALUE', { maxLength: this.valueControl.errors['maxlength'].requiredLength }) || `Maximum length is ${this.valueControl.errors['maxlength'].requiredLength}`;
      }
    }

    const missing: string[] = [];
    if (this.isPrefixErrorVisible && this.prefixControl.errors?.['required']) {
      missing.push(this.prefixLableName);
    }
    if (this.isMainErrorVisible && this.valueControl.errors?.['required']) {
      const lbl = this.props.label || 'Value';
      missing.push(this.translateService?.instant(lbl) || lbl);
    }
    if (this.isSuffixErrorVisible && this.suffixControl.errors?.['required']) {
      missing.push(this.suffixLableName);
    }

    if (missing.length === 0) return this.translateService?.instant('FORM.VALIDATION.INVALID_INPUT') || 'Invalid input';
    if (missing.length === 1) {
      return this.translateService?.instant('FORM.VALIDATION.FIELD_REQUIRED', { label: missing[0] }) || `${missing[0]} is required`;
    }
    if (missing.length === 2) {
      return this.translateService?.instant('FORM.VALIDATION.FIELDS_REQUIRED_2', { label1: missing[0], label2: missing[1] }) || `${missing[0]} and ${missing[1]} are required`;
    }
    return this.translateService?.instant('FORM.VALIDATION.FIELDS_REQUIRED_MULTIPLE', {
      list: missing.slice(0, -1).join(', '),
      last: missing[missing.length - 1]
    }) || `${missing.slice(0, -1).join(', ')}, and ${missing[missing.length - 1]} are required`;
  }

  get hasPrefix(): boolean {
    const p = this.field.props?.prefixOptions;
    if (!p) return false;
    return (p.options && p.options.length > 0) || !!p.optionsUrl || !!p.collectionName;
  }

  get hasSuffix(): boolean {
    const s = this.field.props?.suffixOptions;
    if (!s) return false;
    return (s.options && s.options.length > 0) || !!s.optionsUrl || !!s.collectionName;
  }

  get prefixLableName(): string {
    const p = this.field.props?.prefixOptions;
    const raw = p?.lable || p?.label || 'Code';
    return this.translateService?.instant(raw) || raw;
  }

  get suffixLableName(): string {
    const s = this.field.props?.suffixOptions;
    const raw = s?.lable || s?.label || 'Type';
    return this.translateService?.instant(raw) || raw;
  }
  buildLabel(template: string, data: any): string {
    if (!template || !data) {
      return '';
    }

    return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
      return data[key.trim()] ?? '';
    });
  }
  ngOnInit() {
    this.required = !!(this.field.props?.required || this.field.templateOptions?.required);
    this.datatype = this.field.props?.datatype || 'text';

    const p = this.field.props?.prefixOptions;
    const s = this.field.props?.suffixOptions;

    this.prefixRequired = !!p?.required;
    this.suffixRequired = !!s?.required;

    // Load hardcoded options
    this.prefixOptions = p?.options || [];
    this.suffixOptions = s?.options || [];
    this.mainSelectOptions = this.field.props?.selectOptions || [];

    // Load options from collections if present
    if (p?.collectionName) {
      this.dataService.getDataByFilter(p.collectionName, { start: 0, end: 1000 }).subscribe({
        next: (res: any) => {
          const opts = res?.data?.[0]?.response || [];
          this.prefixOptions = opts.map((opt: any) => ({
            ...opt,
            label:this.buildLabel(p?.labelProp,opt) || opt.name || opt.value,
            value: opt[p?.valueProp] || opt.id
          }));
          this.cdr.detectChanges();

          // After options are loaded, if a defaultValue was applied and the linked field is empty, set it too
          const currentPrefixVal = this.prefixControl.value;
          if (p?.defaultValue !== undefined && currentPrefixVal === p.defaultValue && this.to?.appendPrefixValueKey) {
            const appendKey = this.to.appendPrefixValueKey;
            const appendValueProp = this.to.appendValue || 'name';
            const linkedCtrl: any = this.form?.get(appendKey);
            // Only set if the linked control has no value yet (don't override existing data)
            if (linkedCtrl && !linkedCtrl.value) {
              const matchedOpt = this.prefixOptions.find((opt: any) => opt.value === currentPrefixVal);
              if (matchedOpt && matchedOpt[appendValueProp] !== undefined) {
                linkedCtrl.setValue(matchedOpt[appendValueProp]);
              }
            }
          }
        },
        error: (err) => console.error('Failed to load prefix options from collection', err)
      });
    }
    if (s?.collectionName) {
      this.dataService.getDataByFilter(s.collectionName, { start: 0, end: 1000 }).subscribe({
        next: (res: any) => {
          const opts = res?.data?.[0]?.response || [];
          this.suffixOptions = opts.map((opt: any) => ({
            ...opt,
            label: opt.label || opt.name || opt.value,
            value: opt.value || opt.id
          }));
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Failed to load suffix options from collection', err)
      });
    }

    // Load options from URLs if present
    if (p?.optionsUrl) {
      this.http.get<any[]>(p.optionsUrl).subscribe({
        next: (opts) => { this.prefixOptions = opts; this.cdr.detectChanges(); },
        error: (err) => console.error('Failed to load prefix options', err)
      });
    }
    if (s?.optionsUrl) {
      this.http.get<any[]>(s.optionsUrl).subscribe({
        next: (opts) => { this.suffixOptions = opts; this.cdr.detectChanges(); },
        error: (err) => console.error('Failed to load suffix options', err)
      });
    }
    if (this.field.props?.selectOptionsUrl) {
      this.http.get<any[]>(this.field.props.selectOptionsUrl).subscribe({
        next: (opts) => { this.mainSelectOptions = opts; this.cdr.detectChanges(); },
        error: (err) => console.error('Failed to load main select options', err)
      });
    }

    const key = this.field.key as string;
    const prefixKey = p?.key || 'prefix';
    const inputKey = this.field.props?.inputKey || key || 'value';
    const suffixKey = s?.key || 'suffix';

    // Register separate FormControls in the parent form
    const parentForm = this.form as any;
    if (parentForm && parentForm.addControl) {
      if (!parentForm.contains(prefixKey) && this.hasPrefix) {
        parentForm.addControl(prefixKey, this.prefixControl);
      }
      if (inputKey !== key && !parentForm.contains(inputKey)) {
        parentForm.addControl(inputKey, this.valueControl);
      }
      if (!parentForm.contains(suffixKey) && this.hasSuffix) {
        parentForm.addControl(suffixKey, this.suffixControl);
      }
    }

    // Set validation status
    const validators = [];
    if (this.required) {
      validators.push(Validators.required);
    }
    if (this.field.props?.pattern) {
      validators.push(Validators.pattern(this.field.props.pattern));
    }
    if (this.field.props?.minLength) {
      validators.push(Validators.minLength(this.field.props.minLength));
    }
    if (this.field.props?.maxLength) {
      validators.push(Validators.maxLength(this.field.props.maxLength));
    }
    if (validators.length > 0) {
      this.valueControl.setValidators(validators);
    }

    if (this.hasPrefix && this.prefixRequired) {
      this.prefixControl.setValidators(Validators.required);
    }
    if (this.hasSuffix && this.suffixRequired) {
      this.suffixControl.setValidators(Validators.required);
    }

    // Load initial values from model
    if (this.model) {
      if (this.model[prefixKey] !== undefined) this.prefixControl.setValue(this.model[prefixKey]);
      else if (p?.defaultValue !== undefined) this.prefixControl.setValue(p.defaultValue);

      if (this.model[inputKey] !== undefined) this.valueControl.setValue(this.model[inputKey]);
      else if (key && this.model[key] !== undefined) this.valueControl.setValue(this.model[key]);

      if (this.model[suffixKey] !== undefined) this.suffixControl.setValue(this.model[suffixKey]);
    } else if (p?.defaultValue !== undefined) {
      this.prefixControl.setValue(p.defaultValue);
    }

    // Subscribe to changes to update both the combined object AND any custom model keys
    const updateModel = () => {
      // Get the prefix key from prefixOptions
      const prefixKey = p?.key || 'prefix';
      
      // 1. Update separate model fields (phone_code and primary_phone)
      if (this.model) {
        if (prefixKey && prefixKey !== 'prefix') {
          // For composite fields like phone_code + primary_phone, set each separately
          this.model[prefixKey] = this.prefixControl.value; // e.g., model.phone_code = "+971"
          this.model[inputKey] = this.valueControl.value;   // e.g., model.primary_phone = "07094350136"
          if (this.model[suffixKey] !== undefined) {
            this.model[suffixKey] = this.suffixControl.value;
          }
        } else {
          // For simple cases, maintain backward compatibility
          this.model[prefixKey] = this.prefixControl.value;
          this.model[inputKey] = this.valueControl.value;
          if (key && inputKey !== key) {
            this.model[key] = this.valueControl.value;
          }
          this.model[suffixKey] = this.suffixControl.value;
        }
      }

      // 2. Update the parent Formly Control with JUST the phone number value (not a composite object)
      if (key) {
        this.formControl.setValue(this.valueControl.value, { emitEvent: true });
      }

        // Sync sibling form controls (like hidden fields for suffix/prefix)
        const parentGrp = this.formControl.parent;
        if (parentGrp) {
          if (suffixKey && suffixKey !== 'suffix') {
            const sufCtrl = parentGrp.get(suffixKey);
            if (sufCtrl && sufCtrl.value !== this.suffixControl.value) {
              sufCtrl.setValue(this.suffixControl.value, { emitEvent: true });
            }
          }
          if (prefixKey && prefixKey !== 'prefix') {
            const preCtrl = parentGrp.get(prefixKey);
            if (preCtrl && preCtrl.value !== this.prefixControl.value) {
              preCtrl.setValue(this.prefixControl.value, { emitEvent: true });
            }
          }
        }

      // 3. Validate manually and bubble up errors
      let errors: any = {};
      let hasError = false;

      // Check main value control errors (required, pattern, minlength, maxlength)
      if (this.valueControl.errors) {
        Object.assign(errors, this.valueControl.errors);
        hasError = true;
      }

      if (this.hasPrefix && this.prefixRequired) {
        if (!this.prefixControl.value) {
          this.prefixControl.setErrors({ required: true });
          errors.required = true;
          hasError = true;
        } else {
          this.prefixControl.setErrors(null);
        }
      }
      if (this.hasSuffix && this.suffixRequired) {
        if (!this.suffixControl.value) {
          this.suffixControl.setErrors({ required: true });
          errors.required = true;
          hasError = true;
        } else {
          this.suffixControl.setErrors(null);
        }
      }

      if (hasError) {
        this.formControl.setErrors(errors);
      } else {
        this.formControl.setErrors(null);
      }
    };

    this.prefixControl.valueChanges.subscribe(() => updateModel());
    this.valueControl.valueChanges.subscribe(() => updateModel());
    this.suffixControl.valueChanges.subscribe(() => updateModel());

    // Keep internal controls in sync if the parent form/model is updated after init
    try {
      const prefixKey = p?.key || 'prefix';
      const inputKey = this.field.props?.inputKey || key || 'value';
      const suffixKey = s?.key || 'suffix';
      this._formValueSub = (this.form as any)?.valueChanges?.subscribe(() => {
        // prefix
        const parentPrefixVal = (this.form as any).get(prefixKey)?.value ?? this.model?.[prefixKey];
        if (parentPrefixVal !== undefined && parentPrefixVal !== this.prefixControl.value) {
          this.prefixControl.setValue(parentPrefixVal, { emitEvent: false });
        }
        // input/main
        const parentInputVal = (this.form as any).get(inputKey)?.value ?? (this.model ? (this.model[inputKey] !== undefined ? this.model[inputKey] : this.model[key]) : undefined);
        if (parentInputVal !== undefined && parentInputVal !== this.valueControl.value) {
          this.valueControl.setValue(parentInputVal, { emitEvent: false });
        }
        // suffix
        const parentSuffixVal = (this.form as any).get(suffixKey)?.value ?? this.model?.[suffixKey];
        if (parentSuffixVal !== undefined && parentSuffixVal !== this.suffixControl.value) {
          this.suffixControl.setValue(parentSuffixVal, { emitEvent: false });
        }
      });
    } catch (e) {
      // ignore
    }
  }

  ngDoCheck() {
    const p = this.field.props?.prefixOptions;
    const s = this.field.props?.suffixOptions;
    const key = this.field.key as string;
    const prefixKey = p?.key || 'prefix';
    const inputKey = this.field.props?.inputKey || key || 'value';
    const suffixKey = s?.key || 'suffix';

    if (this.model) {
      const modelPrefix = this.model[prefixKey];
      if (modelPrefix !== undefined && modelPrefix !== this.prefixControl.value) {
        this.prefixControl.setValue(modelPrefix, { emitEvent: false });
        this.cdr.detectChanges();
      }

      const modelInput = this.model[inputKey] !== undefined ? this.model[inputKey] : this.model[key];
      if (modelInput !== undefined && modelInput !== this.valueControl.value) {
        this.valueControl.setValue(modelInput, { emitEvent: false });
        this.cdr.detectChanges();
      }

      const modelSuffix = this.model[suffixKey];
      if (modelSuffix !== undefined && modelSuffix !== this.suffixControl.value) {
        this.suffixControl.setValue(modelSuffix, { emitEvent: false });
        this.cdr.detectChanges();
      }
    }
  }

  onlyNumbers(event: KeyboardEvent) {
    const charCode = event.key;
    if (!/^\d$/.test(charCode)) {
      event.preventDefault();
    }
  }

  sanitizeInput(event: any) {
    const input = event.target as HTMLInputElement;
    const cleanValue = input.value.replace(/\D/g, '');
    if (input.value !== cleanValue) {
      input.value = cleanValue;
    }
    this.valueControl.setValue(cleanValue);
  }

  togglePrefixDropdown(event: Event) {
    event.stopPropagation();
    this.isPrefixDropdownOpen = !this.isPrefixDropdownOpen;
    this.isSuffixDropdownOpen = false;
    this.isFocused = true;
  }

  toggleSuffixDropdown(event: Event) {
    event.stopPropagation();
    this.isSuffixDropdownOpen = !this.isSuffixDropdownOpen;
    this.isPrefixDropdownOpen = false;
    this.isFocused = true;
  }

  selectPrefix(value: any, event: Event) {
    event.stopPropagation();
    this.prefixControl.setValue(value);
    this.prefixControl.markAsTouched();
    this.isPrefixDropdownOpen = false;
    this.prefixSearchTerm = '';
    if(this.to.appendPrefixValueKey){
      const control:any = this.form.get(this.to.appendPrefixValueKey);
    var  currentObject = this.filteredPrefixOptions.find((opt: any) => opt.value === value);
      control.setValue(currentObject[this.to.appendValue]);
    }
  }

  selectSuffix(value: any, event: Event) {
    event.stopPropagation();
    this.suffixControl.setValue(value);
    this.suffixControl.markAsTouched();
    this.isSuffixDropdownOpen = false;
    this.suffixSearchTerm = '';
  }

  getSelectedPrefixLabel(): string {
    const val = this.prefixControl.value;
    if (val === undefined || val === null || val === '') return '';
    const cleanVal = String(val).replace(/^\+/, '');
    const opt = this.prefixOptions.find(o => {
      const cleanOVal = String(o.value || '').replace(/^\+/, '');
      return cleanOVal === cleanVal;
    });
    return opt ? opt.label : '';
  }

  getSelectedSuffixLabel(): string {
    const val = this.suffixControl.value;
    if (val === undefined || val === null || val === '') return '';
    const opt = this.suffixOptions.find(o => String(o.value) === String(val));
    return opt ? opt.label : '';
  }

  onFocus() {
    this.isFocused = true;
  }

  onBlur() {
    this.isFocused = false;
    this.prefixSearchTerm = '';
    this.suffixSearchTerm = '';
    this.valueControl.markAsTouched();
    if (this.hasPrefix) {
      this.prefixControl.markAsTouched();
    }
    if (this.hasSuffix) {
      this.suffixControl.markAsTouched();
    }
    this.formControl.markAsTouched();
  }

  ngOnDestroy() {
    const p = this.field.props?.prefixOptions;
    const s = this.field.props?.suffixOptions;
    const key = this.field.key as string;
    const prefixKey = p?.key || 'prefix';
    const inputKey = this.field.props?.inputKey || key || 'value';
    const suffixKey = s?.key || 'suffix';

    const parentForm = this.form as any;
    if (parentForm && parentForm.removeControl) {
      if (parentForm.contains(prefixKey)) parentForm.removeControl(prefixKey);
      if (inputKey !== key && parentForm.contains(inputKey)) parentForm.removeControl(inputKey);
      if (parentForm.contains(suffixKey)) parentForm.removeControl(suffixKey);
    }
    try { if (this._formValueSub && this._formValueSub.unsubscribe) this._formValueSub.unsubscribe(); } catch (e) {}
  }
}
