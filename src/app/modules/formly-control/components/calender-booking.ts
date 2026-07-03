import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FieldType, FormlyModule } from '@ngx-formly/core';
import { Subscription } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface TimeSlot {
  label: string;       // e.g. "09:00 AM – 09:30 AM"
  start: string;       // ISO string
  end: string;
  available: boolean;
  thisCase?: boolean;  // true when this slot is booked for the current case
}

/**
 * Formly custom type: `callender-Booking-slot`
 *
 * Reads sibling field values for `doctor` and `bookingDate` from the parent
 * form model, then renders a grid of available time slots for that day.
 *
 * Props (all optional):
 *   - slotDurationMinutes: number  (default 30)
 *   - doctorFieldKey: string       (default 'doctor')
 *   - dateFieldKey: string         (default 'bookingDate')
 *   - calenderType: string         (default 'roaster')
 *   - isMockMode: boolean          (default false) - if true, use localStorage
 *   - roasterApiUrl: string         (API endpoint to fetch roaster data)
 */
@Component({
  selector: 'calender-booking-slot',
  standalone: true,
  imports: [
    CommonModule,
    FormlyModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
  ],
  template: `
    <div class="booking-slot-wrapper">

      <!-- Waiting for selections -->
      <div *ngIf="!selectedDoctor || !selectedDate" class="slot-placeholder">
        <mat-icon>info_outline</mat-icon>
        <span>Please select a <strong>Doctor</strong> and a <strong>Booking Date</strong> to view available slots.</span>
      </div>

      <!-- Loading -->
      <div *ngIf="selectedDoctor && selectedDate && loading" class="slot-loading">
        <mat-spinner diameter="28"></mat-spinner>
        <span>Loading available slots…</span>
      </div>

      <!-- No slots -->
      <div *ngIf="selectedDoctor && selectedDate && !loading && slots.length === 0" class="slot-placeholder slot-placeholder-warn">
        <mat-icon>event_busy</mat-icon>
        <span>No slots available for the selected date and doctor.</span>
      </div>

      <!-- Slot section -->
      <ng-container *ngIf="selectedDoctor && selectedDate && !loading && slots.length > 0">

        <!-- Section header -->
        <div class="slot-section-header">
          <mat-icon class="slot-header-icon">schedule</mat-icon>
          <span class="slot-header-title">Available Time Slots</span>
          <span class="slot-header-count">{{ getAvailableCount() }} available</span>
        </div>

        <!-- Slot grid -->
        <div class="slot-grid">
          <button
            *ngFor="let slot of slots"
            class="slot-btn"
            [class.slot-available]="slot.available && !isSlotSelected(slot) && !slot.thisCase"
            [class.slot-selected]="isSlotSelected(slot)"
            [class.slot-taken]="!slot.available && !slot.thisCase"
            [class.slot-this-case]="slot.thisCase && !isSlotSelected(slot)"
            [disabled]="!slot.available"
            (click)="selectSlot(slot)"
            type="button"
          >
            <mat-icon class="slot-btn-icon">
              {{ isSlotSelected(slot) ? 'check_circle' : (slot.thisCase ? 'check_circle' : (slot.available ? 'schedule' : 'block')) }}
            </mat-icon>
            <span class="slot-btn-label">{{ slot.label }}</span>
          </button>
        </div>

      </ng-container>

    </div>
  `,
  styles: [`
    .booking-slot-wrapper {
      padding: 0;
      width: 100%;
    }

    /* ── Placeholder / empty states ── */
    .slot-placeholder {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      color: #64748b;
      font-size: 13.5px;
    }

    .slot-placeholder-warn {
      background: #fff7ed;
      border-color: #fed7aa;
      color: #92400e;
    }
    .slot-placeholder-warn mat-icon { color: #f97316; }

    /* ── Loading ── */
    .slot-loading {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 0;
      color: #64748b;
      font-size: 14px;
    }

    /* ── Section header ── */
    .slot-section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .slot-header-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #6366f1;
    }
    .slot-header-title {
      font-size: 13.5px;
      font-weight: 600;
      color: #334155;
      flex: 1;
    }
    .slot-header-count {
      font-size: 12px;
      font-weight: 500;
      color: #10b981;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 999px;
      padding: 2px 10px;
    }

    /* ── Slot grid ── */
    .slot-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    /* ── Base slot button ── */
    .slot-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 10px !important;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border: 1.5px solid transparent;
      background: transparent;
      transition: all 0.18s ease;
      outline: none;
      white-space: nowrap;
      line-height: 1.4;
    }

    .slot-btn-icon {
      font-size: 15px;
      height: 15px;
      width: 15px;
      flex-shrink: 0;
    }

    .slot-btn-label {
      letter-spacing: 0.01em;
    }

    /* available (unselected) */
    .slot-available {
      border-color: #34d399 !important;
      color: #065f46 !important;
      background: #ecfdf5 !important;
    }
    .slot-available:hover {
      background: #d1fae5 !important;
      border-color: #059669 !important;
      box-shadow: 0 2px 8px rgba(16,185,129,0.18);
      transform: translateY(-1px);
    }

    /* selected */
    .slot-selected {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
      color: #fff !important;
      border-color: #4f46e5 !important;
      box-shadow: 0 3px 10px rgba(99,102,241,0.35) !important;
      transform: translateY(-1px);
    }
    .slot-selected:hover {
      background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%) !important;
      border-color: #4338ca !important;
      box-shadow: 0 4px 14px rgba(99,102,241,0.4) !important;
    }

    /* taken / disabled */
    .slot-taken {
      border-color: #e2e8f0 !important;
      color: #94a3b8 !important;
      background: #f8fafc !important;
      cursor: not-allowed;
      opacity: 0.65;
    }
    .slot-taken .slot-btn-icon { color: #cbd5e1; }

    /* previously booked for this case */
    .slot-this-case {
      border-color: #f59e0b !important;
      color: #92400e !important;
      background: #fffbeb !important;
    }
    .slot-this-case:hover {
      background: #fef3c7 !important;
      border-color: #d97706 !important;
      box-shadow: 0 2px 8px rgba(245,158,11,0.18);
      transform: translateY(-1px);
    }

    /* ── Selected confirmation banner ── */
    .slot-confirmation {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 14px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
      border: 1px solid #c7d2fe;
      border-radius: 10px;
    }
    .slot-confirmation-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #6366f1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .slot-confirmation-icon mat-icon {
      color: #fff;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .slot-confirmation-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .slot-confirmation-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6366f1;
    }
    .slot-confirmation-value {
      font-size: 14px;
      font-weight: 600;
      color: #1e1b4b;
    }

    @keyframes animate-in {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .animate-in {
      animation: animate-in 0.25s ease forwards;
    }
  `],
})
export class CalendarBookingSlotComponent extends FieldType<any> implements OnInit, OnDestroy {

  slots: TimeSlot[] = [];
  selectedSlot: TimeSlot | null = null;
  selectedSlots: TimeSlot[] = [];
  loading = false;

  selectedDoctor: string = '';
  selectedDate: string = '';
  selectedDoctorUserId: string = ''; // Stores the UUID for roster API calls

  private roasterData: any[] = [];
  private bookingsData: any[] = [];
  private valueChangeSub?: Subscription;
  private http = inject(HttpClient);

  constructor(private cdr: ChangeDetectorRef) {
    super();
  }

  ngOnInit(): void {
    // Watch the parent form model for changes to doctor & date fields
    const doctorKey = this.field.props?.['doctorFieldKey'] || 'doctor';
    const dateKey = this.field.props?.['dateFieldKey'] || 'bookingDate';

    // Initial render from existing model values
    this.syncFromModel(doctorKey, dateKey);

    // Re-render whenever any form value changes
    this.valueChangeSub = this.form.valueChanges.subscribe(() => {
      this.syncFromModel(doctorKey, dateKey);
    });
  }

  private loadFromLocalStorage(): void {
    const roasterDataStr = localStorage.getItem('calendar_entries');
    console.log('Loading from localStorage, calendar_entries:', roasterDataStr);

    if (roasterDataStr) {
      try {
        this.roasterData = JSON.parse(roasterDataStr);
        console.log('Parsed roaster data:', this.roasterData);
      } catch (error) {
        console.error('Failed to parse roaster data from localStorage:', error);
        this.roasterData = [];
      }
    } else {
      console.warn('No calendar_entries found in localStorage');
      this.roasterData = [];
    }
  }

  ngOnDestroy(): void {
    this.valueChangeSub?.unsubscribe();
  }

  private syncFromModel(doctorKey: string, dateKey: string): void {
    const model = this.form.value || {};
    const doctor = model[doctorKey] ?? '';
    const date = model[dateKey] ?? '';

    const doctorStr = doctor ? String(doctor) : '';
    const dateStr = date ? String(date) : '';

    console.log('syncFromModel called:', { doctorStr, dateStr, formModel: model });

    // Only rebuild slots when values actually change
    if (doctorStr === this.selectedDoctor && dateStr === this.selectedDate) return;

    const isInitialLoad = !this.selectedDoctor && !this.selectedDate;

    this.selectedDoctor = doctorStr;
    this.selectedDate = dateStr;

    // Fetch UUID when doctor changes (for SPC-format IDs)
    if (this.selectedDoctor && this.selectedDoctor.startsWith('SPC-')) {
      this.fetchDoctorUserId(this.selectedDoctor);
    } else {
      this.selectedDoctorUserId = this.selectedDoctor;
    }

    // Preserve existing value in formControl if it is the initial load (e.g. edit mode)
    const currentValue = this.formControl.value;
    let hasValidValue = false;
    if (isInitialLoad && currentValue) {
      if (Array.isArray(currentValue) && currentValue.length > 0) {
        hasValidValue = true;
        this.selectedSlots = [...currentValue];
        this.selectedSlot = currentValue[0];
        console.log('Edit mode: Preserved selected slots:', this.selectedSlots);
      } else if (!Array.isArray(currentValue) && currentValue.start) {
        hasValidValue = true;
        this.selectedSlot = currentValue;
        this.selectedSlots = [currentValue];
        console.log('Edit mode: Preserved selected slot:', this.selectedSlot);
      }
    }

    if (!hasValidValue) {
      this.selectedSlot = null;
      this.selectedSlots = [];
      this.formControl.setValue(null, { emitEvent: false });
    }

    if (this.selectedDoctor && this.selectedDate) {
      console.log('Calling buildSlots with:', { selectedDoctor: this.selectedDoctor, selectedDate: this.selectedDate, selectedDoctorUserId: this.selectedDoctorUserId });
      this.buildSlots();
    } else {
      console.log('Not calling buildSlots - missing doctor or date:', { selectedDoctor: this.selectedDoctor, selectedDate: this.selectedDate });
      this.slots = [];
    }

    this.cdr.markForCheck();
  }

  private buildSlots(): void {
    this.loading = true;
    this.slots = [];
    this.cdr.markForCheck();

    const isMockMode = this.field.props?.['isMockMode'] === true;
    const roasterApiUrl = this.field.props?.['roasterApiUrl'] || '/roaster/api/roasters';
    const calendarType = this.field.props?.['calenderType'] || 'roaster';

    if (isMockMode) {
      this.loadFromLocalStorage();
      this.slots = this.generateSlots();
      this.loading = false;
      this.cdr.markForCheck();
    } else {
      if (!roasterApiUrl) {
        console.warn('No API URL provided');
        this.slots = [];
        this.loading = false;
        this.cdr.markForCheck();
        return;
      }

      // Format date as YYYY-MM-DD
      let dateParam = '';
      if (this.selectedDate) {
        try {
          const dateObj = new Date(this.selectedDate);
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          dateParam = `${year}-${month}-${day}`;
        } catch (e) {
          console.error('Invalid date format:', this.selectedDate, e);
        }
      }

      // Build full API URL with base URL from environment and filter by current doctor (user_id) and date
      const baseUrl = environment.apiBaseUrl || 'http://localhost:8000';
      let fullUrl = `${baseUrl}${roasterApiUrl}?roaster_type=${calendarType}&type=${calendarType}`;
      
      // Use UUID if available, otherwise use the selected doctor ID
      const doctorIdForApi = this.selectedDoctorUserId || this.selectedDoctor;
      if (doctorIdForApi) {
        fullUrl += `&user_id=${doctorIdForApi}`;
      }
      if (dateParam) {
        fullUrl += `&date=${dateParam}`;
      }

      console.log('Fetching live roaster data from:', fullUrl);

      try {
        this.http.get<any>(fullUrl).subscribe({
          next: (response) => {
            let rawData: any[] = [];
            if (Array.isArray(response)) {
              rawData = response;
            } else if (response.data && Array.isArray(response.data)) {
              rawData = response.data;
            } else if (response.data && response.data[0] && Array.isArray(response.data[0].response)) {
              rawData = response.data[0].response;
            }

            // Map snake_case from Go backend to camelCase for the synapse component
            this.roasterData = rawData.map((item: any) => ({
              id: item.id || '',
              userId: item.user_id || item.userId || '',
              userName: item.user_name || item.user_id || 'User',
              startTime: item.start_time || item.startTime,
              endTime: item.end_time || item.endTime,
              notes: item.notes || '',
              type: item.roaster_type || item.type || 'roaster',
            }));

            // Fetch bookings for this doctor and date to identify taken slots
            const doctorIdForBookings = this.selectedDoctorUserId || this.selectedDoctor;
            let bookingsUrl = `${baseUrl}/roaster/api/bookings?user_id=${doctorIdForBookings}`;
            if (dateParam) {
              bookingsUrl += `&date=${dateParam}`;
            }
            console.log('Fetching bookings from:', bookingsUrl);
            
            this.http.get<any>(bookingsUrl).subscribe({
              next: (bookingsResponse) => {
                const bData = Array.isArray(bookingsResponse) ? bookingsResponse : (bookingsResponse.data || []);
                this.bookingsData = bData;
                this.slots = this.generateSlots();
                this.autoSelectPreviousSlot();
                this.loading = false;
                this.cdr.markForCheck();
              },
              error: (err) => {
                console.error('Failed to load bookings data:', err);
                this.bookingsData = [];
                this.slots = this.generateSlots();
                this.autoSelectPreviousSlot();
                this.loading = false;
                this.cdr.markForCheck();
              }
            });
          },
          error: (error) => {
            console.error('Failed to load roaster data from API:', error);
            this.roasterData = [];
            this.slots = [];
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
      } catch (error) {
        console.error('Error setting up HTTP request:', error);
        this.roasterData = [];
        this.slots = [];
        this.loading = false;
        this.cdr.markForCheck();
      }
    }
  }

  private generateSlots(): TimeSlot[] {
    const slotDuration: number = Number(this.field.props?.['slotDurationMinutes'] ?? 30);
    const calendarType: string = this.field.props?.['calenderType'] || 'roaster';

    // Parse the booking date
    const rawDate: any = this.selectedDate;
    let baseDate: Date;
    try {
      // Handle moment/matDatepicker output (could be a Date object, ISO string, or moment)
      baseDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
      if (isNaN(baseDate.getTime())) throw new Error('invalid date');
    } catch {
      console.error('Invalid date:', rawDate);
      return [];
    }

    // Create a date at start of day in the user's local timezone, then get its date components
    const localYear = baseDate.getFullYear();
    const localMonth = baseDate.getMonth();
    const localDay = baseDate.getDate();

    // Create a UTC date matching the local calendar date (not the UTC equivalent)
    const normalizedDate = new Date(Date.UTC(localYear, localMonth, localDay, 0, 0, 0));

    // Check if roaster data is loaded
    if (!this.roasterData || this.roasterData.length === 0) {
      console.warn('No roaster data loaded');
      return [];
    }

    // Filter by type (roaster) - selected doctor (userId)
    const filteredroasters = this.roasterData.filter((item: any) => {
      const isTypeMatch = (item.type || '').toLowerCase() === (calendarType || '').toLowerCase();
      // Use selectedDoctorUserId (UUID) for comparison since roaster data uses user_id
      const doctorIdToMatch = this.selectedDoctorUserId || this.selectedDoctor;
      return isTypeMatch && item.userId === doctorIdToMatch;
    });

    if (filteredroasters.length === 0) {
      console.warn('No roasters found for doctor:', this.selectedDoctor);
      return [];
    }

    // Find all roasters for the selected date - use local date components to handle timezone offsets
    const selectedYear = localYear;
    const selectedMonth = localMonth;
    const selectedDay = localDay;

    console.log('Filtering roasters for date:', { selectedYear, selectedMonth, selectedDay, baseDate, localDate: this.selectedDate });

    const matchingRoasters = filteredroasters.filter((roaster: any) => {
      const roasterStartDate = new Date(roaster.startTime);
      const roasterYear = roasterStartDate.getFullYear();
      const roasterMonth = roasterStartDate.getMonth();
      const roasterDay = roasterStartDate.getDate();

      const matches = roasterYear === selectedYear &&
        roasterMonth === selectedMonth &&
        roasterDay === selectedDay;

      console.log('Roaster:', roaster.startTime, 'Date components:', { roasterYear, roasterMonth, roasterDay }, 'Matches:', matches);

      return matches;
    });

    if (matchingRoasters.length === 0) {
      console.warn('No roaster found for date:', baseDate);
      return [];
    }

    const slots: TimeSlot[] = [];
    const now = new Date();

    // Generate slots from all matching roasters
    for (const matchingroaster of matchingRoasters) {
      // Generate slots based on the roaster's start and end time
      const roasterStart = new Date(matchingroaster.startTime);
      const roasterEnd = new Date(matchingroaster.endTime);

      let current = new Date(roasterStart);

      while (current < roasterEnd) {
        const slotStart = new Date(current);
        const slotEnd = new Date(current.getTime() + slotDuration * 60 * 1000);

        // Don't create slot if it goes beyond roaster end time
        if (slotEnd > roasterEnd) {
          break;
        }

      const isPast = slotEnd <= now;
        let available = !isPast;

        // Check if slot is taken by another booking
        const slotStartISO = slotStart.toISOString();
        const currentBookingId = this.model?.id || this.model?._id;
        const currentCaseId = this.model?.case_id || this.field.props?.['caseId'];

        const matchingBooking = this.bookingsData.find((b: any) => {
          const bStatus = b.booking_status || b.status || '';
          if (bStatus.toLowerCase() === 'cancelled') {
            return false;
          }
          const bStartVal = b.start_time || b.appointment_date;
          if (!bStartVal) return false;
          const bStart = new Date(bStartVal).toISOString();
          return bStart === slotStartISO;
        });

        let thisCase = false;
        if (matchingBooking) {
          const bookedCaseId = matchingBooking.case_id || matchingBooking.caseId || '';
          if (currentCaseId && bookedCaseId === currentCaseId) {
            // Previously booked for this same case — keep available, flag it
            thisCase = true;
          } else if (matchingBooking.id !== currentBookingId) {
            available = false;
            console.log('Slot booked by:', matchingBooking.id);
          }
        }

        slots.push({
          label: `${this.formatTime(slotStart)} – ${this.formatTime(slotEnd)}`,
          start: slotStartISO,
          end: slotEnd.toISOString(),
          available,
          thisCase,
        });

        current = slotEnd;
      }
    }

    return slots;
  }

  selectSlot(slot: TimeSlot): void {
    if (!slot.available) return;

    const selectMultiple = this.field.props?.['selectMultipleSlots'] === true;

    if (selectMultiple) {
      // Toggle selection for multiple slots
      const index = this.selectedSlots.findIndex(s => s.start === slot.start);
      if (index > -1) {
        // Deselect if already selected
        this.selectedSlots.splice(index, 1);
      } else {
        // Add to selection
        this.selectedSlots.push(slot);
      }
      this.selectedSlot = this.selectedSlots.length > 0 ? this.selectedSlots[0] : null;
      // Write array of selected slots to formly control
      this.formControl.setValue(this.selectedSlots.map(s => ({ start: s.start, end: s.end, label: s.label })));
    } else {
      // Single selection mode
      this.selectedSlot = slot;
      this.selectedSlots = [slot];
      // Write single slot to formly control
      this.formControl.setValue({ start: slot.start, end: slot.end, label: slot.label });
    }

    this.cdr.markForCheck();
  }

  getAvailableCount(): number {
    return this.slots.filter(s => s.available).length;
  }

  autoSelectPreviousSlot(): void {
    // If no slot is currently selected, auto-select the previously booked slot for this case
    if (this.selectedSlot) return;
    const prevSlot = this.slots.find(s => s.thisCase && s.available);
    if (prevSlot) {
      this.selectSlot(prevSlot);
    }
  }

  isSlotSelected(slot: TimeSlot): boolean {    try {
      const selectMultiple = this.field.props?.['selectMultipleSlots'] === true;
      const slotTime = new Date(slot.start).getTime();

      if (selectMultiple) {
        return this.selectedSlots.some(s => new Date(s.start).getTime() === slotTime);
      }
      if (!this.selectedSlot) return false;
      return new Date(this.selectedSlot.start).getTime() === slotTime;
    } catch {
      return false;
    }
  }

  private fetchDoctorUserId(specialistId: string): void {
    // Fetch specialist details to get the user_id (UUID)
    const baseUrl = environment.apiBaseUrl || 'http://localhost:8000';
    const detailsUrl = `${baseUrl}/entities/api/onboarding/specialists/${specialistId}/details`;
    
    console.log('Fetching specialist details for user_id:', detailsUrl);
    
    this.http.get<any>(detailsUrl).subscribe({
      next: (response) => {
        // After backend restart, response will include user_id field
        if (response?.user_id) {
          this.selectedDoctorUserId = response.user_id;
          console.log('Retrieved user_id for specialist:', this.selectedDoctorUserId);
          
          // Rebuild slots with the correct UUID
          if (this.selectedDoctor && this.selectedDate) {
            this.buildSlots();
          }
        } else {
          console.warn('Specialist details response does not include user_id field. Backend may need restart.');
          // Fallback: use the SPC-ID (will fail UUID validation but better than nothing)
          this.selectedDoctorUserId = specialistId;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to fetch specialist details for user_id:', err);
        // Fallback: use the SPC-ID
        this.selectedDoctorUserId = specialistId;
        this.cdr.markForCheck();
      }
    });
  }

  private formatTime(date: Date): string {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minStr = minutes === 0 ? '00' : String(minutes).padStart(2, '0');
    return `${hours}:${minStr} ${ampm}`;
  }
}
