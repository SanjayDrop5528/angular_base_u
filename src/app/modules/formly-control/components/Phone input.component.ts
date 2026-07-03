import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  HostListener,
  inject,
  ChangeDetectorRef,
  forwardRef,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormControl,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  Validator,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { DataService } from '../../../core/services/data.service';
import { Subscription } from 'rxjs';

export interface PhoneValue {
  countryCode: string;
  number: string;
}

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true,
    },
  ],
  styles: [`
    :host { display: block; width: 100%; }

    .phone-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
    }

    /* ── Country trigger ── */
    .country-trigger {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 10px 0 14px;
      height: 100%;
      cursor: pointer;
      border-right: 1.5px solid rgba(255,255,255,0.12);
      white-space: nowrap;
      user-select: none;
      min-width: 76px;
      flex-shrink: 0;
    }
    .country-trigger.disabled { cursor: not-allowed; opacity: 0.5; }
    .country-trigger:not(.disabled):hover .trigger-code { color: #fff; }

    .trigger-code {
      font-size: 0.88rem;
      color: var(--mff-input-color, #f1f3f9);
      transition: color 0.15s ease;
    }
    .trigger-placeholder {
      font-size: 0.88rem;
      color: rgba(255,255,255,0.35);
    }
    .arrow-icon {
      font-size: 0.5rem;
      color: rgba(255,255,255,0.4);
      transition: transform 0.2s ease, color 0.2s ease;
      margin-left: 2px;
    }
    .country-trigger.open .arrow-icon {
      transform: rotate(180deg);
      color: #1a73e8;
    }

    /* ── Number input ── */
    .phone-number-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      color: var(--mff-input-color, #f1f3f9);
      font-family: inherit;
      font-size: 0.93rem;
      padding: 0 14px;
      height: 100%;
      box-sizing: border-box;
      min-width: 0;
    }
    .phone-number-input::placeholder { color: rgba(255,255,255,0.25); }
    .phone-number-input:disabled { cursor: not-allowed; }

    /* ── Dropdown panel ── */
    .dropdown-panel {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 230px;
      background: var(--mff-select-panel-bg, #1e293b);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.45), 0 8px 10px -6px rgba(0,0,0,0.4);
      z-index: 9999;
      overflow: hidden;
      animation: fadeSlideIn 0.15s ease-out;
    }

    /* ── Search ── */
    .search-wrap {
      padding: 8px 10px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 18px;
      width: 13px;
      height: 13px;
      color: rgba(255,255,255,0.35);
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      padding: 5px 26px 5px 28px;
      font-size: 0.8rem;
      font-family: inherit;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 5px;
      outline: none;
      background: rgba(255,255,255,0.03);
      color: #f8fafc;
      box-sizing: border-box;
      transition: border-color 0.2s, background 0.2s;
    }
    .search-input:focus { border-color: #1a73e8; background: rgba(15,23,42,0.5); }
    .clear-btn {
      position: absolute;
      right: 16px;
      background: transparent;
      border: none;
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: rgba(255,255,255,0.35);
      border-radius: 50%;
      transition: background 0.15s, color 0.15s;
    }
    .clear-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }
    .clear-btn svg { width: 11px; height: 11px; }

    /* ── Options list ── */
    .options-list {
      max-height: 190px;
      overflow-y: auto;
      padding: 4px;
    }
    .options-list::-webkit-scrollbar { width: 4px; }
    .options-list::-webkit-scrollbar-track { background: transparent; }
    .options-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

    .option-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.12s;
      font-size: 0.85rem;
      color: #f1f3f9;
    }
    .option-item:hover { background: rgba(255,255,255,0.06); }
    .option-item.selected {
      background: rgba(26,115,232,0.14);
      color: #1a73e8;
      font-weight: 500;
    }
    .option-code { font-weight: 600; min-width: 38px; font-size: 0.82rem; }
    .option-name {
      color: rgba(255,255,255,0.55);
      font-size: 0.78rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .option-item.selected .option-name { color: rgba(26,115,232,0.75); }

    .empty-state {
      padding: 14px 12px;
      font-size: 0.8rem;
      color: rgba(255,255,255,0.3);
      text-align: center;
    }
    .loading-state {
      padding: 14px 12px;
      font-size: 0.8rem;
      color: rgba(255,255,255,0.3);
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255,255,255,0.1);
      border-top-color: #1a73e8;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Light (morning) theme ── */
    ::ng-deep [data-theme="morning"] .country-trigger { border-right-color: rgba(0,0,0,0.12); }
    ::ng-deep [data-theme="morning"] .trigger-code { color: #0f172a; }
    ::ng-deep [data-theme="morning"] .trigger-placeholder { color: rgba(0,0,0,0.35); }
    ::ng-deep [data-theme="morning"] .dropdown-panel {
      background: #ffffff;
      border-color: rgba(0,0,0,0.08);
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15);
    }
    ::ng-deep [data-theme="morning"] .search-wrap { border-bottom-color: rgba(0,0,0,0.06); }
    ::ng-deep [data-theme="morning"] .search-input {
      background: rgba(0,0,0,0.02);
      border-color: rgba(0,0,0,0.1);
      color: #0f172a;
    }
    ::ng-deep [data-theme="morning"] .search-input:focus { background: #fff; border-color: #1a73e8; }
    ::ng-deep [data-theme="morning"] .option-item { color: #0f172a; }
    ::ng-deep [data-theme="morning"] .option-item:hover { background: rgba(0,0,0,0.04); }
    ::ng-deep [data-theme="morning"] .option-name { color: rgba(0,0,0,0.45); }
  `],
  template: `
    <div class="phone-wrapper" #wrapperRef>

      <!-- Country Code Trigger -->
      <div
        class="country-trigger"
        [class.open]="isOpen"
        [class.disabled]="isDisabled"
        (click)="!isDisabled && toggleDropdown($event)"
      >
        <span *ngIf="selectedOption; else noCode" class="trigger-code">{{ selectedOption.value }}</span>
        <ng-template #noCode>
          <span class="trigger-placeholder">{{ placeholder }}</span>
        </ng-template>
        <span class="arrow-icon">▼</span>
      </div>

      <!-- Number Input -->
      <input
        type="text"
        class="phone-number-input"
        [placeholder]="numberPlaceholder"
        [formControl]="numberControl"
        [attr.disabled]="isDisabled ? true : null"
        (keypress)="onlyNumbers($event)"
        (input)="onNumberInput($event)"
      />

      <!-- Dropdown Panel -->
      <div class="dropdown-panel" *ngIf="isOpen" (click)="$event.stopPropagation()">

        <!-- Search -->
        <div class="search-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            #searchRef
            type="text"
            class="search-input"
            placeholder="Search country..."
            [value]="searchTerm"
            (input)="onSearch($event)"
            (keydown)="$event.stopPropagation()"
          />
          <button *ngIf="searchTerm" type="button" class="clear-btn"
                  (click)="clearSearch(); searchRef.focus()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Options -->
        <div class="options-list">
          <div *ngIf="isLoading" class="loading-state">
            <span class="spinner"></span> Loading…
          </div>
          <ng-container *ngIf="!isLoading">
            <div
              *ngFor="let opt of filteredOptions"
              class="option-item"
              [class.selected]="selectedOption?.value === opt.value"
              (click)="selectOption(opt)"
            >
              <span class="option-code">{{ opt.value }}</span>
              <span class="option-name">{{ opt.label }}</span>
            </div>
            <div *ngIf="filteredOptions.length === 0" class="empty-state">
              No results for "{{ searchTerm }}"
            </div>
          </ng-container>
        </div>

      </div>
    </div>
  `
})
export class PhoneInputComponent implements OnInit, OnDestroy, ControlValueAccessor, Validator {

  /** DataService collection name to fetch country codes from */
  @Input() collectionName!: string;

  /** Field on each record to use as the dropdown value (e.g. 'dial_code') */
  @Input() valueProp: string = 'value';

  /**
   * Handlebar template for the option label.
   * Example: '{{name}}' or '{{country}} ({{dial_code}})'
   */
  @Input() labelProp: string = '{{label}}';

  /** Extra field to include in search filtering */
  @Input() searchField?: string;

  /** Placeholder shown before a code is selected */
  @Input() placeholder: string = '+Code';

  /** Placeholder for the number text input */
  @Input() numberPlaceholder: string = 'Enter number';

  /**
   * When true the entire control is locked (no dropdown, no typing).
   * Typically bound to mobileVerified in the parent form.
   */
  @Input() readonly: boolean = false;

  numberControl = new FormControl('');

  options: any[] = [];
  filteredOptions: any[] = [];
  selectedOption: any = null;
  searchTerm = '';
  isOpen = false;
  isLoading = false;
  isDisabled = false;

  /** Combined locked state: either Angular disables the control OR readonly=true */
  get isLocked(): boolean { return this.isDisabled || this.readonly; }

  private onChange: (val: PhoneValue) => void = () => { };
  private onTouched: () => void = () => { };
  private subs: Subscription[] = [];

  private dataService = inject(DataService);

  constructor(private elRef: ElementRef, private cdr: ChangeDetectorRef) { }

  // ── Close dropdown when clicking outside ──────────────────────────────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
      this.searchTerm = '';
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    if (this.collectionName) {
      this.isLoading = true;
      this.dataService.getPhonecode(this.collectionName, { start: 0, end: 1000 }).subscribe({
        next: (res: any) => {
          const raw: any[] = res?.data?.[0]?.response || [];
          this.options = raw.map(item => ({
            ...item,
            label: this.buildLabel(this.labelProp, item),
            value: item[this.valueProp] ?? item.value ?? item.id,
          }));
          this.filteredOptions = [...this.options];
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[PhoneInput] Failed to load country codes:', err);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    }

    this.subs.push(
      this.numberControl.valueChanges.subscribe(() => this.emitChange())
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ── ControlValueAccessor ──────────────────────────────────────────────────
  writeValue(val: PhoneValue | null): void {
    if (!val) return;
    if (val.number !== undefined) {
      this.numberControl.setValue(val.number, { emitEvent: false });
    }
    if (val.countryCode) {
      this.selectedOption =
        this.options.find(o => o.value === val.countryCode) ||
        { value: val.countryCode, label: '' };
    }
    this.cdr.detectChanges();
  }

  registerOnChange(fn: (val: PhoneValue) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    isDisabled ? this.numberControl.disable({ emitEvent: false })
      : this.numberControl.enable({ emitEvent: false });
    this.cdr.detectChanges();
  }

  // ── Validator ─────────────────────────────────────────────────────────────
  validate(_control: AbstractControl): ValidationErrors | null {
    const hasCode = !!this.selectedOption?.value;
    const hasNumber = !!(this.numberControl.value?.trim());
    if (!hasCode && !hasNumber) return null;           // untouched — let required handle it
    if (!hasCode) return { phoneCodeMissing: true };
    if (!hasNumber) return { phoneNumberMissing: true };
    return null;
  }

  // ── Internal helpers ──────────────────────────────────────────────────────
  private emitChange() {
    this.onChange({
      countryCode: this.selectedOption?.value || '',
      number: this.numberControl.value || '',
    });
    this.onTouched();
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.filteredOptions = [...this.options];
      setTimeout(() => {
        (this.elRef.nativeElement.querySelector('.search-input') as HTMLInputElement)?.focus();
      }, 50);
    } else {
      this.searchTerm = '';
    }
  }

  selectOption(opt: any) {
    this.selectedOption = opt;
    this.isOpen = false;
    this.searchTerm = '';
    this.filteredOptions = [...this.options];
    this.emitChange();
    this.cdr.detectChanges();
  }

  onSearch(event: any) {
    this.searchTerm = event.target.value;
    this.applyFilter();
  }

  clearSearch() {
    this.searchTerm = '';
    this.filteredOptions = [...this.options];
  }

  applyFilter() {
    const term = this.searchTerm.toLowerCase();
    if (!term) { this.filteredOptions = [...this.options]; return; }
    this.filteredOptions = this.options.filter(opt => {
      const l = String(opt.label || '').toLowerCase().includes(term);
      const v = String(opt.value || '').toLowerCase().includes(term);
      const x = this.searchField
        ? String(opt[this.searchField] || '').toLowerCase().includes(term)
        : false;
      return l || v || x;
    });
  }

  onlyNumbers(event: KeyboardEvent) {
    if (!/^\d$/.test(event.key)) event.preventDefault();
  }

  onNumberInput(event: any) {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/\D/g, '');
    if (input.value !== clean) {
      input.value = clean;
      this.numberControl.setValue(clean, { emitEvent: true });
    }
  }

  private buildLabel(template: string, data: any): string {
    if (!template || !data) return '';
    return template.replace(/\{\{(.*?)\}\}/g, (_, key) => data[key.trim()] ?? '');
  }
}