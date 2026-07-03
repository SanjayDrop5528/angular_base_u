import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, FormArray, ReactiveFormsModule,
  Validators, AbstractControl, ValidationErrors
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';
import { CircularTimepickerComponent } from '../circular-timepicker/circular-timepicker.component';
import { Calendar, User } from '../calendar.model';
import { UserRole, RecurrenceType, AvailabilityType, MonthlyPattern, WeekNumber } from '../../../enums/enum';

export interface CalendarDialogData {
  calendar?: Calendar;
  userId?: string;
  userName?: string;
  startTime?: Date;
  endTime?: Date;
  allDay?: boolean;
  users: User[];
  role: UserRole;
  currentUserId: string;
  calendarName?: string;
  peopleListLabel?: string;
  slotDurationMinutes?: number;
  recurrenceOptions?: (RecurrenceType | string)[];
  isReservationMode?: boolean;
  allowReschedule?: boolean;
  dayStartTime?: string;
  dayEndTime?: string;
  roasterType?: string | string[];
}

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-calendar-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatMenuModule,
    MatDatepickerModule, MatNativeDateModule,
    MatRadioModule, MatDividerModule,
    CircularTimepickerComponent,
    TranslateModule
  ],
  templateUrl: './calendar-dialog.component.html',
  styleUrl: './calendar-dialog.component.scss'
})
export class CalendarDialogComponent implements OnInit, OnDestroy {
  calendarForm!: FormGroup;
  isEditMode = false;
  canEdit = false;
  canDelete = false;

  AvailabilityType = AvailabilityType;
  MonthlyPattern = MonthlyPattern;
  WeekNumber = WeekNumber;

  readonly weekDays = [
    { code: 'MO', label: 'Monday' }, { code: 'TU', label: 'Tuesday' },
    { code: 'WE', label: 'Wednesday' }, { code: 'TH', label: 'Thursday' },
    { code: 'FR', label: 'Friday' }, { code: 'SA', label: 'Saturday' },
    { code: 'SU', label: 'Sunday' }
  ];
  readonly weekNumbers = [
    { value: 'first', label: 'First' }, { value: 'second', label: 'Second' },
    { value: 'third', label: 'Third' }, { value: 'fourth', label: 'Fourth' },
    { value: 'last', label: 'Last' }
  ];

  // Track timepicker values per window separately from form (Date objects)
  windowStartTimes: Date[] = [];
  windowEndTimes: Date[] = [];

  private subs = new Subscription();

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CalendarDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CalendarDialogData,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.isEditMode = !!this.data.calendar;
    this.determinePermissions();
    this.buildForm();
    this.listenAvailabilityType();
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  // ── Permissions ───────────────────────────────────────────────────────────

  private determinePermissions() {
    if (this.data.isReservationMode) {
      this.canEdit = true; this.canDelete = false;
    } else if (this.data.role === UserRole.OWNER || this.data.role === UserRole.ADMIN || this.data.role === UserRole.DOCTOR) {
      this.canEdit = true; this.canDelete = this.isEditMode;
    } else {
      this.canEdit = false; this.canDelete = false;
    }
  }

  // ── Form Build ────────────────────────────────────────────────────────────

  private buildForm() {
    const defaultStart = this.data.startTime || new Date();
    const defaultDate = defaultStart;

    let defaultUserId = '';
    if (this.isEditMode && this.data.calendar) {
      defaultUserId = this.data.calendar.userId;
    } else if (this.data.userId) {
      defaultUserId = this.data.userId;
    } else if (this.data.currentUserId && this.data.currentUserId !== 'all'
      && (this.data.role !== UserRole.OWNER && this.data.role !== UserRole.ADMIN)) {
      // Non-admin roles (including DOCTOR) use their own ID
      defaultUserId = this.data.currentUserId;
    } else {
      defaultUserId = this.data.role === UserRole.USER ? this.data.currentUserId : (this.data.users[0]?.id || '');
    }

    // Init timepicker tracking arrays FIRST
    const defTime = this.data.startTime || new Date();
    this.windowStartTimes = [new Date(defTime)];
    this.windowEndTimes   = [new Date(defTime.getTime() + 60 * 60 * 1000)];

    const isRoasterTypeArray = Array.isArray(this.data.roasterType);
    const defaultRoasterType = isRoasterTypeArray 
      ? (this.data.calendar?.roasterType || (this.data.roasterType as any)[0])
      : (this.data.calendar?.roasterType || (this.data.roasterType as any) || 'available');

    this.calendarForm = this.fb.group({
      userId: [{ value: defaultUserId, disabled: !this.canEdit || this.data.role === UserRole.USER || this.data.role === UserRole.DOCTOR || this.data.isReservationMode }],
      roasterType: [{ value: defaultRoasterType, disabled: !this.canEdit }],
      availabilityType: [{ value: AvailabilityType.SINGLE, disabled: this.isEditMode || !this.canEdit }],

      // Single day
      singleDate: [{ value: defaultDate, disabled: this.isEditMode || !this.canEdit }],

      // Date range
      fromDate: [{ value: defaultDate, disabled: this.isEditMode || !this.canEdit }],
      toDate:   [{ value: null, disabled: this.isEditMode || !this.canEdit }],

      // Recurring
      freq:      [{ value: 'daily', disabled: this.isEditMode || !this.canEdit }],
      interval_val: [{ value: 1, disabled: this.isEditMode || !this.canEdit }, [Validators.min(1)]],
      byday:     [{ value: [] as string[], disabled: this.isEditMode || !this.canEdit }],
      monthlyPattern: [{ value: MonthlyPattern.DAY_OF_MONTH, disabled: this.isEditMode || !this.canEdit }],
      day_of_month:   [{ value: 1, disabled: this.isEditMode || !this.canEdit }, [Validators.min(1), Validators.max(31)]],
      week_number: [{ value: 'first', disabled: this.isEditMode || !this.canEdit }],
      week_day:    [{ value: 'MO', disabled: this.isEditMode || !this.canEdit }],
      start_date:  [{ value: defaultDate, disabled: this.isEditMode || !this.canEdit }],
      end_date:    [{ value: null, disabled: this.isEditMode || !this.canEdit }],
      occurrence_count: [{ value: null, disabled: this.isEditMode || !this.canEdit }],

      notes: [{ value: this.data.calendar?.notes || '', disabled: !this.canEdit }, [Validators.maxLength(500)]],

      // Windows FormArray
      windows: this.fb.array([this.createWindowGroup(this.formatTimeString(this.windowStartTimes[0]), this.formatTimeString(this.windowEndTimes[0]))])
    });

    // Reservation mode OR Edit mode - keep existing start/end time fields
    if (this.data.isReservationMode || this.isEditMode) {
      const isReserved = false;
      const disableTimes = isReserved && !this.data.allowReschedule;
      this.calendarForm.addControl('startTime', this.fb.control({ value: this.data.calendar?.startTime || defTime, disabled: !this.canEdit || disableTimes }, [Validators.required]));
      this.calendarForm.addControl('endTime',   this.fb.control({ value: this.data.calendar?.endTime   || new Date(defTime.getTime() + 3600000), disabled: !this.canEdit || disableTimes }, [Validators.required]));
      
      if (this.data.isReservationMode) {
        this.calendarForm.addControl('reservedByName',  this.fb.control('', [Validators.required]));
        this.calendarForm.addControl('reservedByEmail', this.fb.control('', [Validators.required, Validators.email]));
      }
    }
  }

  createWindowGroup(startTime?: string, endTime?: string): FormGroup {
    return this.fb.group({
      startTime: [startTime || null, Validators.required],
      endTime:   [endTime   || null, Validators.required]
    });
  }

  private listenAvailabilityType() {
    const sub = this.calendarForm.get('availabilityType')?.valueChanges.subscribe(() => {
      this.calendarForm.updateValueAndValidity();
    });
    if (sub) this.subs.add(sub);
  }

  // ── FormArray Helpers ─────────────────────────────────────────────────────

  get windows(): FormArray {
    return this.calendarForm.get('windows') as FormArray;
  }

  addWindow(): void {
    const sTime = new Date();
    const eTime = new Date(Date.now() + 3600000);
    this.windowStartTimes.push(sTime);
    this.windowEndTimes.push(eTime);
    this.windows.push(this.createWindowGroup(this.formatTimeString(sTime), this.formatTimeString(eTime)));
  }

  removeWindow(i: number): void {
    if (this.windows.length <= 1) return;
    this.windows.removeAt(i);
    this.windowStartTimes.splice(i, 1);
    this.windowEndTimes.splice(i, 1);
  }

  // ── Window Timepicker Callbacks ───────────────────────────────────────────

  onWindowStartTimeChanged(val: Date, i: number): void {
    this.windowStartTimes[i] = val;
    this.windows.at(i).patchValue({ startTime: this.formatTimeString(val) });
    this.windows.at(i).get('startTime')?.markAsTouched();
  }

  onWindowEndTimeChanged(val: Date, i: number): void {
    this.windowEndTimes[i] = val;
    this.windows.at(i).patchValue({ endTime: this.formatTimeString(val) });
    this.windows.at(i).get('endTime')?.markAsTouched();
  }

  // ── Reservation mode timepicker ───────────────────────────────────────────

  get startTimeValue(): Date { return this.calendarForm.get('startTime')?.value || new Date(); }
  get endTimeValue():   Date { return this.calendarForm.get('endTime')?.value   || new Date(); }

  onStartTimeChanged(val: Date): void { this.calendarForm.patchValue({ startTime: val }); }
  onEndTimeChanged(val: Date):   void { this.calendarForm.patchValue({ endTime: val });   }

  // ── Computed Properties ───────────────────────────────────────────────────

  get isRoasterTypeArray(): boolean {
    return Array.isArray(this.data.roasterType);
  }

  get roasterTypeOptions(): string[] {
    return Array.isArray(this.data.roasterType) ? this.data.roasterType : [];
  }

  get availabilityTypeValue(): string {
    return this.calendarForm.get('availabilityType')?.value || AvailabilityType.SINGLE;
  }

  get freqValue(): string { return this.calendarForm.get('freq')?.value || ''; }
  get monthlyPatternValue(): string { return this.calendarForm.get('monthlyPattern')?.value || MonthlyPattern.DAY_OF_MONTH; }

  get recurrenceSummary(): string {
    const type  = this.availabilityTypeValue;
    const freq  = this.freqValue;
    const iv    = this.calendarForm.get('interval_val')?.value || 1;
    const byday: string[] = this.calendarForm.get('byday')?.value || [];
    const mp    = this.monthlyPatternValue;
    const dom   = this.calendarForm.get('day_of_month')?.value;
    const wn    = this.calendarForm.get('week_number')?.value;
    const wd    = this.calendarForm.get('week_day')?.value;
    const sd    = this.calendarForm.get('start_date')?.value;
    const ed    = this.calendarForm.get('end_date')?.value;
    const occ   = this.calendarForm.get('occurrence_count')?.value;

    if (type === AvailabilityType.SINGLE) {
      const d = this.calendarForm.get('singleDate')?.value;
      return d ? this.translateService.instant('CALENDAR_MODULE.SUMMARY.ON', { date: this.fmtDate(d) }) : '';
    }
    if (type === AvailabilityType.RANGE) {
      const f = this.calendarForm.get('fromDate')?.value;
      const t = this.calendarForm.get('toDate')?.value;
      return (f && t) ? this.translateService.instant('CALENDAR_MODULE.SUMMARY.EVERY_DAY_FROM_TO', { from: this.fmtDate(f), to: this.fmtDate(t) }) : '';
    }

    // Recurring
    const dayNames: Record<string, string> = {
      MO: this.translateService.instant('CALENDAR_MODULE.DIALOG.WEEK_DAYS.MO'),
      TU: this.translateService.instant('CALENDAR_MODULE.DIALOG.WEEK_DAYS.TU'),
      WE: this.translateService.instant('CALENDAR_MODULE.DIALOG.WEEK_DAYS.WE'),
      TH: this.translateService.instant('CALENDAR_MODULE.DIALOG.WEEK_DAYS.TH'),
      FR: this.translateService.instant('CALENDAR_MODULE.DIALOG.WEEK_DAYS.FR'),
      SA: this.translateService.instant('CALENDAR_MODULE.DIALOG.WEEK_DAYS.SA'),
      SU: this.translateService.instant('CALENDAR_MODULE.DIALOG.WEEK_DAYS.SU')
    };
    let summary = '';
    if (freq === 'daily') {
      summary = iv === 1 
        ? this.translateService.instant('CALENDAR_MODULE.SUMMARY.EVERY_DAY') 
        : this.translateService.instant('CALENDAR_MODULE.SUMMARY.EVERY_DAYS', { interval: iv });
    } else if (freq === 'weekly') {
      const dayStr = byday.map(d => dayNames[d] || d).join(', ') || this.translateService.instant('CALENDAR_MODULE.DIALOG.BY_DAYS');
      summary = iv === 1 
        ? this.translateService.instant('CALENDAR_MODULE.SUMMARY.EVERY_WEEK_DAYS', { days: dayStr }) 
        : this.translateService.instant('CALENDAR_MODULE.SUMMARY.EVERY_WEEKS_ON_DAYS', { interval: iv, days: dayStr });
    } else if (freq === 'monthly') {
      if (mp === MonthlyPattern.DAY_OF_MONTH) {
        summary = this.translateService.instant('CALENDAR_MODULE.SUMMARY.MONTHLY_DAY_OF_MONTH', { day: this.ordinal(dom) });
      } else {
        const weekNum = this.translateService.instant('CALENDAR_MODULE.DIALOG.WEEK_NUMBERS.' + (wn || 'first').toUpperCase());
        const dayName = dayNames[wd] || wd;
        summary = this.translateService.instant('CALENDAR_MODULE.SUMMARY.MONTHLY_WEEK_DAY', { week: weekNum, day: dayName });
      }
    }
    if (sd) summary += this.translateService.instant('CALENDAR_MODULE.SUMMARY.FROM_DATE', { date: this.fmtDate(sd) });
    if (ed) summary += this.translateService.instant('CALENDAR_MODULE.SUMMARY.TO_DATE', { date: this.fmtDate(ed) });
    else if (occ) {
      summary += occ > 1 
        ? this.translateService.instant('CALENDAR_MODULE.SUMMARY.OCCURRENCES', { count: occ }) 
        : this.translateService.instant('CALENDAR_MODULE.SUMMARY.OCCURRENCE');
    }
    return summary;
  }

  // ── Submission ────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (!this.canEdit) return;

    if (this.data.isReservationMode) {
      this.submitReservation();
      return;
    }

    if (this.isEditMode && this.data.calendar) {
      this.submitUpdate();
      return;
    }

    this.submitCreate();
  }

  private submitReservation(): void {
    const raw = this.calendarForm.getRawValue();
    const result: Calendar = {
      ...this.data.calendar!,
      startTime: new Date(raw.startTime),
      endTime: new Date(raw.endTime),
      notes: raw.notes
    };
    this.dialogRef.close({ action: 'update', calendar: result });
  }

  private submitUpdate(): void {
    const raw = this.calendarForm.getRawValue();

    // Preserve the original date but apply the new selected time
    const origStart = new Date(this.data.calendar!.startTime);
    if (raw.startTime) {
      const newStart = new Date(raw.startTime);
      origStart.setHours(newStart.getHours(), newStart.getMinutes(), 0, 0);
    }

    const origEnd = new Date(this.data.calendar!.endTime);
    if (raw.endTime) {
      const newEnd = new Date(raw.endTime);
      origEnd.setHours(newEnd.getHours(), newEnd.getMinutes(), 0, 0);
    }

    const result: Partial<Calendar> = {
      id: this.data.calendar!.id,
      userId: raw.userId,
      startTime: origStart,
      endTime: origEnd,
      notes: raw.notes,
      roasterType: raw.roasterType || this.data.calendar!.roasterType,
      status: this.data.calendar!.status || 'available',
      entityType: this.data.calendar!.entityType
    };
    this.dialogRef.close({ action: 'update', calendar: result });
  }

  private submitCreate(): void {
    const raw = this.calendarForm.getRawValue();
    const selectedUser = this.data.users.find(u => u.id === raw.userId);

    // Build windows
    const timeWindows = (raw.windows || []).map((w: any, i: number) => {
      const st = w.startTime || '09:00';
      const et = w.endTime || '17:00';
      
      let duration = 60;
      try {
        const [sh, sm] = st.split(':').map(Number);
        const [eh, em] = et.split(':').map(Number);
        duration = (eh * 60 + em) - (sh * 60 + sm);
        if (duration <= 0) duration = 60;
      } catch (e) { }

      return {
        startTime: st,
        endTime:   et,
        slotDuration: duration,
        generateSlots: true,
        sequenceNo: i + 1
      };
    });

    // Build config payload
    const config: any = {
      userId: raw.userId,
      availabilityType: raw.availabilityType,
      roasterType: raw.roasterType || (Array.isArray(this.data.roasterType) ? this.data.roasterType[0] : (this.data.roasterType || 'available')),
      status: 'active',
      notes: raw.notes || null,
      intervalVal: raw.interval_val || 1,
      windows: timeWindows
    };

    switch (raw.availabilityType) {
      case AvailabilityType.SINGLE:
        config.startDate = this.toISODate(raw.singleDate);
        config.endDate   = this.toISODate(raw.singleDate);
        break;
      case AvailabilityType.RANGE:
        config.startDate = this.toISODate(raw.fromDate);
        config.endDate   = this.toISODate(raw.toDate);
        break;
      case AvailabilityType.RECURRING:
        config.freq      = raw.freq;
        config.startDate = this.toISODate(raw.start_date);
        config.endDate   = raw.end_date ? this.toISODate(raw.end_date) : null;
        config.occurrenceCount = raw.occurrence_count || null;
        if (raw.freq === 'weekly') {
          config.byDay = Array.isArray(raw.byday) ? raw.byday.join(',') : raw.byday;
        }
        if (raw.freq === 'monthly') {
          if (raw.monthlyPattern === MonthlyPattern.DAY_OF_MONTH) {
            config.dayOfMonth = raw.day_of_month;
          } else {
            config.weekNumber = raw.week_number;
            config.weekDay    = raw.week_day;
          }
        }
        break;
    }

    // Base calendar entry (first window first slot, for immediate display)
    const baseCalendar: Omit<Calendar, 'id'> = {
      userId: raw.userId,
      userName: selectedUser?.name || 'Unknown',
      startTime: this.data.startTime || new Date(),
      endTime:   this.data.endTime   || new Date(Date.now() + 3600000),
      notes: raw.notes || '',
      roasterType: raw.roasterType || (Array.isArray(this.data.roasterType) ? this.data.roasterType[0] : (this.data.roasterType || 'available')),
      status: 'available',
      entityType: selectedUser?.entityType || 'doctor'
    };

    this.dialogRef.close({ action: 'create', calendar: baseCalendar, roasterConfig: config });
  }

  onDelete(): void {
    if (this.canDelete && this.data.calendar) {
      this.dialogRef.close({ action: 'delete', id: this.data.calendar.id });
    }
  }

  onCancel(): void { this.dialogRef.close(); }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatTimeDisplay(date: Date | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const h = d.getHours(), min = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const dh = h % 12 === 0 ? 12 : h % 12;
    return `${pad(dh)}:${pad(min)} ${ampm}`;
  }

  private formatTimeString(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private toISODate(val: any): string {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    
    // Always use Z for the database date columns, otherwise the postgres driver
    // will convert +05:30 to UTC and shift the day backwards by 1 (e.g. 13th to 12th).
    // The timezone offset is handled separately during generate-slots.
    return `${yyyy}-${mm}-${dd}T00:00:00Z`;
  }

  private fmtDate(val: any): string {
    if (!val) return '';
    const d = new Date(val);
    const locale = this.translateService.currentLang === 'hindi' ? 'hi-IN' :
                   this.translateService.currentLang === 'malay' ? 'ms-MY' :
                   this.translateService.currentLang === 'marathi' ? 'mr-IN' :
                   this.translateService.currentLang === 'nepali' ? 'ne-NP' :
                   this.translateService.currentLang === 'tamil' ? 'ta-IN' : 'en-GB';
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private ordinal(n: number): string {
    if (!n) return '';
    if (this.translateService.currentLang !== 'english') {
      return String(n);
    }
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  closeMenu(trigger: any): void {
    if (trigger && typeof trigger.closeMenu === 'function') trigger.closeMenu();
  }

  getUserName(userId: string | undefined): string {
    if (!userId) return this.data.userName || 'Unknown';
    const user = this.data.users?.find(u => u.id === userId);
    return user ? user.name : (this.data.userName || userId);
  }

  getUserColor(userId: string | undefined): string {
    if (!userId) return '#94a3b8';
    const user = this.data.users.find(u => u.id === userId);
    return user ? (user.color || '#94a3b8') : '#94a3b8';
  }

  getInitials(name: string | undefined): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : (parts[0]?.[0]?.toUpperCase() || 'U');
  }

  get minHourConstraint(): number {
    if (!this.data.dayStartTime) return 0;
    return parseInt(this.data.dayStartTime.split(':')[0], 10) || 0;
  }

  get maxHourConstraint(): number {
    if (!this.data.dayEndTime) return 23;
    return parseInt(this.data.dayEndTime.split(':')[0], 10) || 23;
  }
}
