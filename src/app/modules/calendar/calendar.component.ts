import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import { Calendar, User } from './calendar.model';
import { forkJoin, Observable } from 'rxjs';
import { CalendarApiService } from './calendar-api.service';
import { CalendarDialogComponent } from './dialog/calendar-dialog.component';
import { RecurringEventsService } from './recurring-events.service';
import { UserRole, CalendarView, RecurrenceType, RoasterType } from '../../enums/enum';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';

interface EventLog {
  timestamp: Date;
  type: 'created' | 'updated' | 'deleted';
  message: string;
  details: any;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FullCalendarModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatCardModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    TranslateModule
  ],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarCalendarComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @ViewChild('draggableContainer') draggableContainer!: ElementRef;
  @ViewChild('calendarComponent') calendarComponent!: FullCalendarComponent;
  private draggable: any;
  doctorCases: any[] = [];
  private casesSubscription?: any;

  // Configurable Inputs
  private hasExternalPeoples = false;

  @Input() set peoples(value: User[]) {
    this.users = value;
    this.hasExternalPeoples = true;
  }
  get peoples(): User[] {
    return this.users;
  }
  private _role: UserRole = UserRole.OWNER;

  @Input() set activeRole(value: UserRole | string) {
    this._role = value as UserRole;
    this.activeRoleState = value as UserRole;
  }

  @Input() set role(value: UserRole | string) {
    this._role = value as UserRole;
    this.activeRoleState = value as UserRole;
  }
  get role(): UserRole | string {
    return this._role;
  }
  @Input() calendarEndpoint = '/roasters';
  @Input() defaultTab: CalendarView | string = CalendarView.MONTH;
  @Input() editable = true;
  @Input() set initialDate(value: Date | string | undefined) {
    if (value) {
      this._initialDate = typeof value === 'string' ? new Date(value) : value;
      this.calendarOptions = {
        ...this.calendarOptions,
        initialDate: this._initialDate
      };
      if (this.calendarComponent) {
        const calendarApi = this.calendarComponent.getApi();
        calendarApi.gotoDate(this._initialDate);
      }
    }
  }
  get initialDate(): Date | string | undefined {
    return this._initialDate;
  }
  private _initialDate?: Date;

  @Input() currentUserId = ''; // Set to specific user ID to filter by that user initially
  @Input() apiBaseUrl = '';
  @Input() allowedTabs: string[] = [];
  @Input() dayStartTime = '00:00';
  @Input() dayEndTime = '24:00';
  @Input() slotDurationMinutes: string | number = 30;
  @Input() height: string | number = '100%';
  @Input() calendarName = 'Calendar';
  @Input() isMockMode: boolean = false;
  @Input() recurrenceOptions: (RecurrenceType | string)[] = [
    RecurrenceType.DAILY,
    RecurrenceType.WEEKLY,
    RecurrenceType.MONTHLY
  ];
  @Input() peopleListLabel = 'Employees';
  @Input() roasterType: string | string[] = '';
  @Input() isReservationMode = false;
  @Input() allowReschedule = false;
  /** Slot already booked for this case — highlighted green in reservation mode */
  @Input() preSelectedSlot: { start: any; end: any } | null = null;



  // Outputs
  @Output() calendarCreated = new EventEmitter<Calendar>();
  @Output() calendarUpdated = new EventEmitter<Calendar>();
  @Output() calendarDeleted = new EventEmitter<string>();
  @Output() slotSelected = new EventEmitter<{ calendar: Calendar; userId: string; userName: string }>();

  // Interactive Local State (Allows changing config directly from UI)
  activeRoleState: UserRole = UserRole.OWNER;
  get activeRole(): UserRole {
    return this.activeRoleState;
  }
  private authService = inject(AuthService);
  get isPatientUser(): boolean {
    const currentUser = this.authService.getCurrentUser();
    const role = (currentUser?.roleType || currentUser?.entity_type || currentUser?.role_name || '').toLowerCase();
    return role === 'patient';
  }
  activeCalendarEndpoint = '/roasters';
  activeDefaultView: CalendarView | string = CalendarView.MONTH;
  activeEditable = true;
  activeCurrentUserId = 'u2';
  activeViews: string[] = [CalendarView.MONTH, CalendarView.WEEK, CalendarView.DAY];


  // Component Internal Data State
  @Input() users: User[] = [];
  calendars: Calendar[] = [];
  allBookings: any[] = [];
  loading = false;
  error: string | null = null;
  calendarEvents: any[] = [];
  calendarOptions!: CalendarOptions;
  isDraggingEvent = false;
  droppedInTrash = false;
  private calendarViewInitialized = false;

  // Event emission logs printed directly inside component
  eventLogs: EventLog[] = [];

  currentCalendarView: CalendarView | string = CalendarView.MONTH;

  isWeekOrDayView(): boolean {
    return this.currentCalendarView === CalendarView.WEEK || this.currentCalendarView === CalendarView.DAY;
  }

  setLoading(isLoading: boolean): void {
    this.loading = isLoading;
    this.cdr.detectChanges();
  }

  selectActiveUser(userId: string): void {
    this.activeCurrentUserId = userId;
    this.mapEventsToCalendar();
  }

  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  constructor(
    private apiService: CalendarApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private recurringEventsService: RecurringEventsService,
    private translateService: TranslateService
  ) {
    this.calendarOptions = {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, resourceTimeGridPlugin],
      firstDay: 1, // Start week on Monday
      navLinks: true,
      navLinkDayClick: 'day',
      dayMaxEvents: false,
      allDaySlot: false,
      height: this.height,
      selectOverlap: true,
      eventOverlap: true,
      themeSystem: 'standard',
      showNonCurrentDates: false,
      fixedWeekCount: false,
      datesSet: this.handleDatesSet.bind(this),
      views: {
        month: {
          type: 'dayGridMonth',
          buttonText: 'Month'
        },
        week: {
          type: 'timeGridWeek',
          buttonText: 'Week'
        },
        day: {
          type: 'resourceTimeGridDay',
          buttonText: 'Day'
        },
        timeGridDay: {
          type: 'resourceTimeGridDay',
          buttonText: 'Day'
        }
      }
    };
  }

  ngOnInit(): void {
    if (this.apiBaseUrl) {
      this.apiService.setCustomBaseUrl(this.apiBaseUrl);
    }
    // Initialize active state from inputs
    this.activeCalendarEndpoint = this.calendarEndpoint;
    this.activeDefaultView = this.defaultTab;
    this.activeEditable = this.editable;
    if (this.isReservationMode) {
      this.activeCurrentUserId = this.currentUserId || '';
    } else if (this.activeRole === UserRole.OWNER || this.activeRole === UserRole.ADMIN) {
      this.activeCurrentUserId = 'all';
    } else if (this.activeRole === UserRole.DOCTOR) {
      // Doctor: always scoped to their own user ID
      this.activeCurrentUserId = this.currentUserId || '';
    } else if (this.currentUserId) {
      this.activeCurrentUserId = this.currentUserId;
    } else {
      this.activeCurrentUserId = '';
    }

    this.resolveViews();
    this.updateCalendarConfig();

    if (this.activeRole === UserRole.DOCTOR && !this.isReservationMode) {
      // Removed casesStateService.init() to prevent redundant case API calls
      // this.casesSubscription = this.casesStateService.cases$.subscribe({
      //   next: (casesList) => {
      //     this.doctorCases = casesList || [];
      //     this.mapEventsToCalendar();
      //   }
      // });
    }

    this.loadCalendars();
  }

  ngOnDestroy(): void {
    if (this.casesSubscription) {
      this.casesSubscription.unsubscribe();
    }
  }

  private resolveViews(): void {
    if (this.activeRole === UserRole.BUDDY) {
      this.activeViews = [CalendarView.DAY];
      this.activeDefaultView = CalendarView.DAY;
      return;
    }

    if (this.allowedTabs && this.allowedTabs.length > 0) {
      this.activeViews = this.allowedTabs;
    } else {
      this.activeViews = [CalendarView.MONTH, CalendarView.WEEK, CalendarView.DAY];
    }

    if (this.activeViews.length > 0 && !this.activeViews.includes(this.activeDefaultView)) {
      this.activeDefaultView = this.activeViews[0] as CalendarView;
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initExternalDrag();
      if (this.calendarComponent) {
        const calendarApi = this.calendarComponent.getApi();
        if (calendarApi && this.activeDefaultView) {
          calendarApi.changeView(this.activeDefaultView);
        }
      }
    }, 200);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Keep active states in sync with external input changes
    if (changes['role'] || changes['activeRole']) {
      if (this.isReservationMode) {
        this.activeCurrentUserId = this.currentUserId || '';
      } else if (this.activeRole === UserRole.DOCTOR) {
        this.activeCurrentUserId = this.currentUserId || '';
      } else if (this.activeRole === UserRole.OWNER || this.activeRole === UserRole.ADMIN) {
        this.activeCurrentUserId = 'all';
      }
    }
    if (changes['apiBaseUrl'] && this.apiBaseUrl) {
      this.apiService.setCustomBaseUrl(this.apiBaseUrl);
    }
    if (changes['allowedTabs']) {
      this.resolveViews();
    }
    if (changes['calendarEndpoint']) this.activeCalendarEndpoint = this.calendarEndpoint;
    if (changes['defaultTab']) {
      this.activeDefaultView = this.defaultTab;
      this.calendarViewInitialized = false; // allow changeView to run with new default
    }
    if (changes['editable']) this.activeEditable = this.editable;
    if (changes['currentUserId']) {
      if (this.isReservationMode) {
        this.activeCurrentUserId = this.currentUserId;
      } else if (this.activeRole === UserRole.DOCTOR) {
        this.activeCurrentUserId = this.currentUserId;
      } else if (this.activeRole === UserRole.OWNER || this.activeRole === UserRole.ADMIN) {
        this.activeCurrentUserId = 'all';
      } else {
        this.activeCurrentUserId = this.currentUserId;
      }
    }

    if (changes['peoples'] || changes['users'] || changes['role'] || changes['activeRole'] || changes['currentUserId'] || changes['preSelectedSlot']) {
      this.mapEventsToCalendar();
      setTimeout(() => this.initExternalDrag(), 200);
    }

    if (changes['peoples'] || changes['users'] || changes['role'] || changes['editable'] || changes['defaultTab'] || changes['allowedTabs'] ||
      changes['dayStartTime'] || changes['dayEndTime'] || changes['slotDurationMinutes'] || changes['height'] || changes['currentUserId']) {
      this.updateCalendarConfig();
    }

  }



  private handleDatesSet(info: any): void {
    this.currentCalendarView = info.view.type;
    this.cdr.detectChanges();
    setTimeout(() => this.initExternalDrag(), 100);
  }

  public updateCalendarConfig(): void {
    const isReadOnly = this.activeRole === UserRole.USER || this.isPatientUser || this.activeRole === UserRole.BUDDY || this.isReservationMode || !this.editable; // Read-only if user/buddy/patient role or in reservation mode
    const calendarEditable = this.activeEditable && (!isReadOnly || (this.isReservationMode && this.allowReschedule) || this.activeRole === UserRole.DOCTOR);

    const dayViewType = this.isReservationMode ? 'resourceTimeGridDay' : 'timeGridDay';
    const resources = (this.users || []).map(user => ({
      id: user.id,
      title: user.name
    }));

    this.calendarOptions = {
      ...this.calendarOptions,
      resources: this.isReservationMode ? resources : undefined,
      views: {
        month: {
          type: 'dayGridMonth',
          buttonText: 'Month',
          dayHeaderFormat: { weekday: 'narrow' } // S, M, T, W, T, F, S
        },
        week: {
          type: 'timeGridWeek',
          buttonText: 'Week',
          dayHeaderFormat: { weekday: 'short', month: 'numeric', day: 'numeric', omitCommas: true } // MON 6/29
        },
        day: {
          type: dayViewType,
          buttonText: 'Day',
          dayHeaderFormat: { weekday: 'short', month: 'numeric', day: 'numeric', omitCommas: true }
        },
        timeGridDay: {
          type: dayViewType,
          buttonText: 'Day',
          dayHeaderFormat: { weekday: 'short', month: 'numeric', day: 'numeric', omitCommas: true }
        }
      },
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: this.activeViews.join(',')
      },
      initialView: this.activeDefaultView,
      height: this.height,
      slotMinTime: this.formatTime(this.dayStartTime),
      slotMaxTime: this.formatTime(this.dayEndTime),
      slotDuration: this.formatDuration(this.slotDurationMinutes),
      editable: calendarEditable,
      selectable: !isReadOnly,
      eventStartEditable: calendarEditable,
      eventDurationEditable: calendarEditable,
      droppable: (this.activeRole === UserRole.OWNER || this.activeRole === UserRole.ADMIN || this.activeRole === UserRole.DOCTOR || this.isReservationMode) && this.activeRole !== UserRole.BUDDY,
      eventReceive: this.handleEventReceive.bind(this),
      select: this.handleDateSelect.bind(this),
      eventClick: this.handleEventClick.bind(this),
      eventDrop: this.handleEventDrop.bind(this),
      eventResize: this.handleEventResize.bind(this),
      eventDragStart: this.handleEventDragStart.bind(this),
      eventDragStop: this.handleEventDragStop.bind(this),
      displayEventTime: true,
      eventTimeFormat: {
        hour: 'numeric',
        minute: '2-digit',
        meridiem: 'short',
        omitZeroMinute: true
      },
      eventContent: (arg: any) => {
        const props = arg.event.extendedProps;

        // Format start/end time
        const start = arg.event.start;
        const end = arg.event.end;
        let timeText = arg.timeText;
        if (start && end) {
          const fmt = (date: Date) => {
            let h = date.getHours();
            const m = date.getMinutes();
            const ampm = h >= 12 ? 'pm' : 'am';
            h = h % 12 || 12;
            const mStr = m === 0 ? '' : `:${m < 10 ? '0' + m : m}`;
            return `${h}${mStr}${ampm}`;
          };
          timeText = `${fmt(start)} - ${fmt(end)}`;
        }

        // All display decisions come from extendedProps — no role checks here
        const rType     = props['roasterType'] || '';
        const isClosed  = props['isClosed']    || false;
        const isBooked  = props['isBooked']    || !!(props['caseId'] || props['patientNames']);
        const mainText  = props['displayLabel'] || '';
        const patientNames = props['patientNames'] || '';
        const caseId    = props['caseId']       || '';
        const createdOn = props['createdOn']    || '';

        const rTypeLabel = rType
          ? `<span class="custom-event-chip">${rType}</span>` : '';

        const closedBadge = '';

        const patientPill = patientNames
          ? `<div class="custom-event-detail-pill custom-event-patients"><span class="pill-icon">&#9679;</span> ${patientNames}</div>`
          : '';

        const casePill = caseId
          ? `<div class="custom-event-detail-pill custom-event-case"><span class="pill-icon">&#9632;</span> ${caseId}</div>`
          : '';

        let createdOnPill = '';
        if (createdOn) {
          try {
            const d = new Date(createdOn);
            const day   = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year  = d.getFullYear();
            createdOnPill = `<div class="custom-event-detail-pill">🗓 ${day}/${month}/${year}</div>`;
          } catch (_) {}
        }

        const detailsBlock = isBooked
          ? `<div class="custom-event-details">${patientPill}${casePill}${closedBadge}</div>`
          : '';

        return {
          html: `
            <div class="custom-event-content${isBooked ? ' custom-event-booked' : ''}">
              <div class="custom-event-header">
                <span class="custom-event-time">${timeText}</span>
                <span style="display:flex;align-items:center;gap:4px;">${rTypeLabel}</span>
              </div>
              ${mainText ? `<div class="custom-event-body">${mainText}</div>` : ''}
              ${detailsBlock}
            </div>
          `
        };
      }
    };
    this.cdr.detectChanges();

    if (this.calendarComponent && !this.calendarViewInitialized) {
      const calendarApi = this.calendarComponent.getApi();
      if (calendarApi && this.activeDefaultView) {
        calendarApi.changeView(this.activeDefaultView);
        this.calendarViewInitialized = true;
      }
    }
  }

  private formatDuration(minutes: string | number): string {
    const minStr = String(minutes);
    if (minStr.includes(':')) {
      return minStr;
    }
    const mins = parseInt(minStr, 10);
    if (isNaN(mins)) return '00:30:00';
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${String(hrs).padStart(2, '0')}:${String(remainingMins).padStart(2, '0')}:00`;
  }

  private formatTime(timeStr: string): string {
    if (!timeStr) return '00:00:00';
    const parts = timeStr.split(':');
    if (parts.length === 1) {
      const hrs = parseInt(parts[0], 10);
      return `${String(isNaN(hrs) ? 0 : hrs).padStart(2, '0')}:00:00`;
    }
    if (parts.length === 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
    }
    return timeStr;
  }

  initExternalDrag(): void {
    const shouldAllowDrag = (this.activeRole === UserRole.ADMIN || this.activeRole === UserRole.OWNER || this.activeRole === UserRole.DOCTOR || this.isReservationMode);

    if (shouldAllowDrag && this.draggableContainer) {
      if (this.draggable) {
        this.draggable.destroy();
      }
      this.draggable = new Draggable(this.draggableContainer.nativeElement, {
        itemSelector: '.active-user-pill:not(.all-employees-pill)',
        eventData: (eventEl) => {
          const userId = eventEl.getAttribute('data-user-id') || '';
          const userName = eventEl.getAttribute('data-user-name') || '';
          const color = eventEl.getAttribute('data-user-color') || '#3b82f6';
          return {
            title: `Shift [${userName}]`,
            backgroundColor: color,
            borderColor: color,
            textColor: '#ffffff',
            create: true,
            extendedProps: {
              userId: userId,
              userName: userName,
              notes: ''
            }
          };
        }
      });
    } else {
      if (this.draggable) {
        this.draggable.destroy();
        this.draggable = null;
      }
    }
  }

  private handleEventReceive(info: any): void {
    const event = info.event;
    const userId = event.extendedProps.userId;
    const userName = event.extendedProps.userName;

    if (this.activeRole !== UserRole.ADMIN && this.activeRole !== UserRole.OWNER && this.activeRole !== UserRole.DOCTOR) {
      info.revert();
      return;
    }

    const startTime = event.start;
    const slotMins = Number(this.slotDurationMinutes) || 30;
    const defaultShiftMins = 8 * 60; // 8 hours
    const roundedShiftMins = Math.round(defaultShiftMins / slotMins) * slotMins;
    const endTime = new Date(startTime.getTime() + roundedShiftMins * 60 * 1000);

    // Prevent scheduling calendar entries in the past
    const now = new Date();
    const buffer = new Date(now.getTime() - 5 * 60 * 1000); // 5 minute buffer matching reschedule checks
    if (startTime < buffer) {
      this.showToast('Cannot schedule shifts in the past', 'error');
      event.remove();
      return;
    }

    event.remove(); // Remove temporary event, dialog will create the actual one on save

    const dialogRef = this.dialog.open(CalendarDialogComponent, {
      width: '500px',
      data: {
        userId: userId,
        userName: userName,
        startTime: startTime,
        endTime: endTime,
        notes: '',
        role: this.activeRole,
        users: this.users,
        currentUserId: this.activeCurrentUserId,
        calendarName: this.calendarName,
        peopleListLabel: this.peopleListLabel,
        slotDurationMinutes: this.slotDurationMinutes,
        recurrenceOptions: this.recurrenceOptions,
        dayStartTime: this.dayStartTime,
        dayEndTime: this.dayEndTime,
        roasterType: this.roasterType
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'create' && result.calendar) {
        this.setLoading(true);
        this.createCalendarEntries(result.calendar, result.recurrence, result.repeatCount, result.roasterConfig);
      }
    });
  }
  private loadCalendars(): void {
    if (this.isPatientUser) {
      this.setLoading(true);
      const bookingParams: any = {};
      this.apiService.getBookings(bookingParams).subscribe({
        next: (bookings) => {
          this.allBookings = bookings || [];
          this.calendars = [];
          console.log('[loadCalendars] Patient bookings loaded:', this.allBookings.length);
          this.mapEventsToCalendar();
          this.updateCalendarConfig();
          this.setLoading(false);
        },
        error: (err) => {
          this.setLoading(false);
          this.error = 'Failed to load patient bookings.';
          this.showToast('Error loading bookings', 'error');
          console.error(err);
        }
      });
      return;
    }

    if (this.activeRole === UserRole.BUDDY && !this.isReservationMode) {
      forkJoin({
        roasters: this.apiService.getCalendar('/roasters'),
        participants: this.apiService.getBookingParticipants(this.currentUserId),
        bookings: this.apiService.getBookings()
      }).subscribe({
        next: ({ roasters, participants, bookings }) => {
          console.log('[loadCalendars] Buddy raw responses:', { roasters, participants, bookings });
          // Filter roasters to type 'visit'
          const visitRoasters = roasters.filter(r => r.roasterType === 'visit');

          // Find bookings where buddy is participant
          const participantBookingIds = new Set((participants || []).map(p => p.booking_id || p.bookingId).filter(Boolean));
          const buddyBookings = (bookings || []).filter(b => participantBookingIds.has(b.id));

          // Map buddy bookings to Calendar type
          const bookingCalendars: Calendar[] = buddyBookings.map(b => ({
            id: b.id,
            userId: b.user_id || b.userId || '',
            userName: b.notes || 'Buddy Appointment',
            startTime: new Date(b.start_time || b.startTime),
            endTime: new Date(b.end_time || b.endTime),
            notes: b.notes || '',
            roasterType: 'consultation' as any,
            status: b.booking_status || b.bookingStatus || 'scheduled',
            entityType: b.entity_type || b.entityType || ''
          }));

          this.calendars = [...visitRoasters, ...bookingCalendars];
          console.log('[loadCalendars] Total buddy calendars loaded:', this.calendars.length);
          this.mapEventsToCalendar();
          this.updateCalendarConfig();
          this.setLoading(false);
        },
        error: (err) => {
          this.setLoading(false);
          this.error = 'Failed to load buddy calendar schedule.';
          this.showToast('Error loading buddy calendar schedule', 'error');
          console.error(err);
        }
      });
      return;
    }

    const params: any = {};
    if (this.isReservationMode && this.roasterType) {
      if (Array.isArray(this.roasterType)) {
        if (this.roasterType.length > 0) {
          params.roaster_type = this.roasterType[0];
        }
      } else {
        params.roaster_type = this.roasterType;
      }
    }
    if (this.activeCurrentUserId && this.activeCurrentUserId !== 'all' && !this.isPatientUser) {
      params.user_id = this.activeCurrentUserId;
    }

    // Scope bookings to the same user_id as the roster so doctor sees only their own bookings
    const bookingParams: any = {};
    if (this.activeCurrentUserId && this.activeCurrentUserId !== 'all' && !this.isPatientUser) {
      bookingParams.user_id = this.activeCurrentUserId;
    }

    forkJoin({
      calendars: this.apiService.getCalendar(this.activeCalendarEndpoint, params),
      bookings: this.apiService.getBookings(bookingParams)
    }).subscribe({
      next: ({ calendars, bookings }) => {
        this.allBookings = bookings || [];
        console.log('[loadCalendars] Raw response received:', calendars);
        if (this.roasterType) {
          if (Array.isArray(this.roasterType)) {
            this.calendars = calendars.filter(c => !!c.roasterType && (this.roasterType as string[]).includes(c.roasterType));
          } else {
            this.calendars = calendars.filter(c => c.roasterType === this.roasterType);
          }
          console.log(`[loadCalendars] Filtered by roasterType="${JSON.stringify(this.roasterType)}":`, this.calendars);
        } else {
          this.calendars = calendars;
        }
        console.log('[loadCalendars] Total calendars loaded:', this.calendars.length);
        this.mapEventsToCalendar();
        this.updateCalendarConfig();
        this.setLoading(false);
      },
      error: (err) => {
        this.setLoading(false);
        this.error = 'Failed to load calendar schedule.';
        this.showToast('Error loading calendars schedule', 'error');
        console.error(err);
      }
    });
  }
  public mapEventsToCalendar(): void {
    let filteredCalendars = this.calendars;

    if ((this.activeRole === UserRole.USER || this.activeRole === UserRole.DOCTOR) && !this.isPatientUser) {
      filteredCalendars = this.calendars.filter(calendar => calendar.userId === this.activeCurrentUserId);
    } else if (this.isPatientUser && !this.isReservationMode) {
      filteredCalendars = this.calendars;
    } else if (this.activeRole === UserRole.BUDDY && !this.isReservationMode) {
      filteredCalendars = this.calendars;
    } else {
      if (this.activeCurrentUserId && this.activeCurrentUserId !== 'all') {
        filteredCalendars = this.calendars.filter(calendar => calendar.userId === this.activeCurrentUserId);
      }
    }

    const matchedBookingIds = new Set<string>();

    this.calendarEvents = filteredCalendars.map(calendar => {
      const user = this.users.find(u => u.id === calendar.userId);
      // Color priority: peoples list (hash-based) → userColor from API → fallback blue
      const rosterDoctorColor = user?.color || (calendar as any).userColor || '#3b82f6';
      const title = user?.name || calendar.userName || 'User';

      // Find matching bookings for this roster entry
      const matchingBookings = this.allBookings.filter(b => {
        const bDoctorId = b.user_id || b.userId;
        const doctorMatch = bDoctorId === calendar.userId;
        const bStatus = b.booking_status || b.status || '';
        const statusMatch = bStatus.toLowerCase() !== 'cancelled';
        const bStartVal = b.start_time || b.appointment_date;
        if (!bStartVal) return false;
        const bStart = new Date(bStartVal);
        // Compare timestamps in ms to avoid timezone issues
        const timeMatch = bStart.getTime() >= calendar.startTime.getTime() &&
                          bStart.getTime() < calendar.endTime.getTime();
        return doctorMatch && statusMatch && timeMatch;
      });

      matchingBookings.forEach(b => {
        if (b.id) matchedBookingIds.add(b.id);
        if (b.booking_id) matchedBookingIds.add(b.booking_id);
      });

      const patientNames = matchingBookings
        .map(b => {
          const bookingCaseId = b.case_id || b.caseId || b.case_no || b.caseNo;
          if (bookingCaseId) {
            const matchedCase = this.doctorCases.find(c => 
              c.id === bookingCaseId || 
              c.case_no === bookingCaseId || 
              c.caseNo === bookingCaseId
            );
            if (matchedCase && matchedCase.patientName && matchedCase.patientName !== 'N/A') {
              return matchedCase.patientName;
            }
          }

          if (b.patient_name || b.patientName) {
            return b.patient_name || b.patientName;
          }
          // Extract from notes: "Booking for Case #CAS-xxx: <name>"
          const notes = b.notes || b.note || '';
          if (notes && notes.includes(': ')) {
            const extracted = notes.split(': ').slice(1).join(': ').trim();
            if (extracted) return extracted;
          }
          const patientId = b.reserved_by || b.reservedBy;
          if (patientId) {
            const pUser = this.users.find(u => u.id === patientId);
            if (pUser && pUser.name) {
              return pUser.name;
            }
          }
          return null;
        })
        .filter(Boolean);

      const patientNamesStr = Array.from(new Set(patientNames)).join(', ');

      let finalPatientNames = patientNamesStr;
      if (this.isPatientUser && !finalPatientNames && (calendar as any).patientName) {
        finalPatientNames = (calendar as any).patientName;
      }

      const caseIds = matchingBookings
        .map(b => b.case_id || b.caseId || b.case_no || b.caseNo)
        .filter(Boolean);
      const caseIdsStr = Array.from(new Set(caseIds)).join(', ');

      const createdOnDates = matchingBookings
        .map(b => b.created_at || b.createdAt || b.created_on || b.createdOn)
        .filter(Boolean);
      const createdOnStr = createdOnDates.length > 0 ? createdOnDates[0] : '';

      // Slot is booked if there are matching confirmed bookings
      const isBooked = matchingBookings.length > 0;
      const isClosed = (calendar as any).isClosed || matchingBookings.some(b => {
        // Use case_status from the API response (set by backend)
        const caseStatus = (b.case_status || '').toLowerCase();
        if (caseStatus === 'closed' || caseStatus === 'completed' || caseStatus === 'report_ready') {
          return true;
        }
        const s = (b.booking_status || b.status || '').toLowerCase();
        return s === 'closed' || s === 'completed';
      });
      const eventColor = rosterDoctorColor;
      const eventBorder = isClosed ? '#94a3b8' : rosterDoctorColor;

      // Check if this slot matches the pre-selected (already booked) slot
      const isPreSelected = !!(
        this.isReservationMode &&
        this.preSelectedSlot &&
        Math.abs(new Date(calendar.startTime).getTime() - new Date(this.preSelectedSlot.start).getTime()) < 60000
      );

      return {
        id: calendar.id,
        title: title,
        start: calendar.startTime,
        end: calendar.endTime,
        backgroundColor: isPreSelected ? '#10b981' : eventColor,
        borderColor: isPreSelected ? '#059669' : eventBorder,
        textColor: '#ffffff',
        classNames: [
          `fc-event-roaster-${calendar.roasterType || 'available'}`,
          ...(isClosed ? ['fc-event-closed'] : []),
          ...(isPreSelected ? ['fc-event-preselected'] : [])
        ],
        display: 'block',
        resourceId: calendar.userId,
        editable: !isClosed,
        startEditable: !isClosed,
        durationEditable: !isClosed,
        extendedProps: {
          userId: calendar.userId,
          userName: user?.name || calendar.userName || 'User',
          notes: calendar.notes || '',
          roasterType: calendar.roasterType || '',
          patientNames: finalPatientNames,
          caseId: caseIdsStr || (calendar as any).caseId || '',
          createdOn: createdOnStr || (calendar as any).createdOn || '',
          isClosed: isClosed || (calendar as any).isClosed || false,
          isBooked: isBooked || !!(caseIdsStr || finalPatientNames),
          // Pre-compute display label — role logic stays here, not in eventContent
          displayLabel: (() => {
            // Try to get doctor name from user list, then from booking (doctor_name), then userName, then title
            let doctorName = user?.name;
            if (!doctorName && matchingBookings.length > 0) {
              // Use doctor_name from the first booking if available
              doctorName = matchingBookings[0].doctor_name || matchingBookings[0].doctorName;
            }
            if (!doctorName) {
              doctorName = calendar.userName || title;
            }
            
            const evUserId = calendar.userId;
            const showName = (
              this.activeRole === UserRole.OWNER ||
              this.activeRole === UserRole.ADMIN ||
              this.isPatientUser ||
              this.isReservationMode
            ) && !(evUserId && this.currentUserId && evUserId === this.currentUserId && !this.isPatientUser);
            const isDoctorOwnSlot = this.activeRole === UserRole.DOCTOR && !this.isReservationMode;
            if (!showName || isDoctorOwnSlot) return '';
            const doctorLabel = this.translateService.instant('DOCTOR') || 'Doctor';
            return `${doctorLabel}: ${doctorName || 'User'}`;
          })()
        }
      };
    });

    const unmatchedBookings = this.allBookings.filter(b => {
      const bId = b.id || b.booking_id;
      const bDoctorId = b.user_id || b.userId;
      // For patient role, show all their bookings regardless of doctor user_id
      if (!this.isPatientUser && this.activeCurrentUserId && this.activeCurrentUserId !== 'all' && bDoctorId !== this.activeCurrentUserId) {
        return false;
      }
      return !matchedBookingIds.has(bId) && b.status?.toLowerCase() !== 'cancelled';
    });

    const unmatchedEvents = unmatchedBookings.map(b => {
      const doctorId = b.user_id || b.userId;
      const user = this.users.find(u => u.id === doctorId);
      const doctorColor = user?.color || '#3b82f6'; // Use doctor's color from peoples list

      let pName = '';
      const bookingCaseId = b.case_id || b.caseId || b.case_no || b.caseNo;
      if (bookingCaseId) {
        const matchedCase = this.doctorCases.find(c => 
          c.id === bookingCaseId || 
          c.case_no === bookingCaseId || 
          c.caseNo === bookingCaseId
        );
        if (matchedCase && matchedCase.patientName && matchedCase.patientName !== 'N/A') {
          pName = matchedCase.patientName;
        }
      }

      if (!pName) {
        pName = b.patient_name || b.patientName;
      }
      if (!pName && b.reserved_by) {
        const pUser = this.users.find(u => u.id === b.reserved_by);
        if (pUser) pName = pUser.name;
      }
      if (!pName) pName = 'Patient';

      const startVal = b.start_time || b.appointment_date;
      const endVal = b.end_time || (startVal ? new Date(new Date(startVal).getTime() + 60 * 60 * 1000).toISOString() : null);

      // Use case_status from API response
      const caseStatus = (b.case_status || '').toLowerCase();
      const isClosed = b.status?.toLowerCase() === 'closed' || b.status?.toLowerCase() === 'completed' || 
                       caseStatus === 'closed' || caseStatus === 'completed' || caseStatus === 'report_ready';

      return {
        id: b.id || b.booking_id,
        title: pName,
        start: startVal ? new Date(startVal) : new Date(),
        end: endVal ? new Date(endVal) : new Date(),
        backgroundColor: doctorColor,
        borderColor: isClosed ? '#94a3b8' : doctorColor,
        textColor: '#ffffff',
        classNames: ['fc-event-roaster-consultation', ...(isClosed ? ['fc-event-closed'] : [])],
        display: 'block',
        resourceId: doctorId,
        editable: !isClosed,
        startEditable: !isClosed,
        durationEditable: !isClosed,
        extendedProps: {
          userId: doctorId,
          userName: user?.name || b.doctor_name || b.doctorName || 'Doctor',
          notes: b.notes || '',
          roasterType: 'consultation',
          patientNames: pName,
          caseId: b.case_id || b.caseId || b.case_no || b.caseNo || '',
          caseStatus: b.case_status || '',
          createdOn: b.created_at || b.createdAt || b.created_on || b.createdOn || '',
          isClosed: !!isClosed,
          displayLabel: (() => {
            const doctorName = user?.name || b.doctor_name || b.doctorName || 'Doctor';
            const showName = (
              this.activeRole === UserRole.OWNER ||
              this.activeRole === UserRole.ADMIN ||
              this.isPatientUser ||
              this.isReservationMode
            ) && !(doctorId && this.currentUserId && doctorId === this.currentUserId && !this.isPatientUser);
            const isDoctorOwnSlot = this.activeRole === UserRole.DOCTOR && !this.isReservationMode;
            if (!showName || isDoctorOwnSlot) return '';
            const doctorLabel = this.translateService.instant('DOCTOR') || 'Doctor';
            return `${doctorLabel}: ${doctorName}`;
          })()
        }
      };
    });

    this.calendarEvents = [...this.calendarEvents, ...unmatchedEvents];

    this.calendarOptions = {
      ...this.calendarOptions,
      events: this.calendarEvents
    };
    this.cdr.detectChanges();
  }

  // ----------------------------------------------------
  // FullCalendar Callbacks
  // ----------------------------------------------------

  private handleDateSelect(selectInfo: DateSelectArg): void {
    if (this.activeRole === UserRole.USER || this.isPatientUser || this.activeRole === UserRole.BUDDY || this.isReservationMode) return;
    // DOCTOR falls through — they are allowed to create their own roster slots

    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();

    // Prevent creating calendar entries in the past
    const now = new Date();
    if (selectInfo.allDay) {
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (selectInfo.start < todayMidnight) {
        this.showToast(`Cannot create ${this.calendarName} for past dates.`, 'error');
        return;
      }
    } else {
      const buffer = new Date(now.getTime() - 5 * 60 * 1000); // 5 minute buffer
      if (selectInfo.start < buffer) {
        this.showToast(`Cannot create ${this.calendarName} for past times.`, 'error');
        return;
      }
    }

    const dialogRef = this.dialog.open(CalendarDialogComponent, {
      width: '500px',
      data: {
        startTime: selectInfo.start,
        endTime: selectInfo.end,
        allDay: selectInfo.allDay,
        users: this.users,
        role: this.activeRole,
        userId: this.activeRole === UserRole.DOCTOR ? this.activeCurrentUserId : undefined,
        userName: this.activeRole === UserRole.DOCTOR
          ? (this.users.find(u => u.id === this.activeCurrentUserId)?.name || this.calendarName)
          : undefined,
        currentUserId: this.activeCurrentUserId,
        calendarName: this.calendarName,
        peopleListLabel: this.peopleListLabel,
        slotDurationMinutes: this.slotDurationMinutes,
        recurrenceOptions: this.recurrenceOptions,
        dayStartTime: this.dayStartTime,
        dayEndTime: this.dayEndTime,
        roasterType: this.roasterType
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      if (result.action === 'create') {
        this.setLoading(true);
        this.createCalendarEntries(result.calendar, result.recurrence, result.repeatCount, result.roasterConfig);
      }
    });
  }

  private handleEventClick(clickInfo: EventClickArg): void {
    if (this.isPatientUser) {
      return;
    }
    if (clickInfo.event.extendedProps['isClosed']) {
      this.showToast('Closed consultation calendar entries cannot be edited.', 'error');
      return;
    }
    const calendarId = clickInfo.event.id;
    const calendar = this.calendars.find(r => r.id === calendarId);

    if (!calendar) return;

    // Reservation mode: emit the slot directly without opening a dialog
    if (this.isReservationMode) {
      const user = this.users.find(u => u.id === calendar.userId);
      this.slotSelected.emit({
        calendar,
        userId: calendar.userId,
        userName: user?.name || calendar.userName || ''
      });
      return;
    }

    const dialogRef = this.dialog.open(CalendarDialogComponent, {
      width: '500px',
      data: {
        calendar: calendar,
        users: this.users,
        role: this.activeRole,
        currentUserId: this.activeCurrentUserId,
        calendarName: this.calendarName,
        peopleListLabel: this.peopleListLabel,
        slotDurationMinutes: this.slotDurationMinutes,
        isReservationMode: this.isReservationMode,
        allowReschedule: this.allowReschedule,
        dayStartTime: this.dayStartTime,
        dayEndTime: this.dayEndTime,
        roasterType: this.roasterType
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      if (result.action === 'update') {
        this.setLoading(true);

        this.apiService.updateCalendar(this.activeCalendarEndpoint, result.calendar).subscribe({
          next: (updated) => {
            console.log('[updateCalendar] Response received:', updated);
            this.setLoading(false);
            this.showToast('Calendar entry updated successfully');
            this.calendarUpdated.emit(updated);
            this.loadCalendars();
          },
          error: (err) => {
            this.showToast('Failed to update calendar entry', 'error');
            this.setLoading(false);
            console.error(err);
          }
        });
      } else if (result.action === 'delete') {
        this.setLoading(true);
        this.apiService.deleteCalendar(this.activeCalendarEndpoint, result.id).subscribe({
          next: () => {
            console.log('[deleteCalendar] Entry deleted successfully. ID:', result.id);
            this.setLoading(false);
            this.showToast('Calendar entry deleted successfully');
            this.calendarDeleted.emit(result.id);
            this.loadCalendars();
          },
          error: (err) => {
            this.showToast('Failed to delete calendar entry', 'error');
            this.setLoading(false);
            console.error(err);
          }
        });
      }
    });
  }

  private handleEventDrop(changeInfo: EventDropArg): void {
    this.processEventTimeChange(changeInfo);
  }

  private handleEventResize(changeInfo: any): void {
    this.processEventTimeChange(changeInfo);
  }

  private processEventTimeChange(changeInfo: any): void {
    const event = changeInfo.event;
    if (event.extendedProps['isClosed']) {
      this.showToast('Closed consultation calendar entries cannot be rescheduled.', 'error');
      changeInfo.revert();
      return;
    }
    const calendarId = event.id;
    const calendar = this.calendars.find(r => r.id === calendarId);

    if (!calendar) {
      changeInfo.revert();
      return;
    }

    if (this.droppedInTrash) {
      changeInfo.revert();
      this.droppedInTrash = false;
      return;
    }

    // Role verification — DOCTOR can drag/resize their own slots
    if ((this.activeRole === UserRole.USER || this.isPatientUser || this.activeRole === UserRole.BUDDY) && !(this.isReservationMode && this.allowReschedule)) {
      this.showToast('You cannot reschedule calendar entries.', 'error');
      changeInfo.revert();
      return;
    }

    const slotDuration = Number(this.slotDurationMinutes) || 30;
    const newStart = event.start;
    const newEnd = event.end || new Date(newStart.getTime() + slotDuration * 60 * 1000);

    // Validate slot duration difference
    const diffMs = newEnd.getTime() - newStart.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    if (diffMins % slotDuration !== 0) {
      this.showToast(`Duration must be a multiple of ${slotDuration} minutes.`, 'error');
      changeInfo.revert();
      return;
    }

    // Prevent rescheduling to past date/time
    const now = new Date();
    if (event.allDay) {
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (newStart < todayMidnight) {
        this.showToast('Cannot reschedule calendar entries to past dates.', 'error');
        changeInfo.revert();
        return;
      }
    } else {
      const buffer = new Date(now.getTime() - 5 * 60 * 1000); // 5 minute buffer
      if (newStart < buffer) {
        this.showToast('Cannot reschedule calendar entries to past times.', 'error');
        changeInfo.revert();
        return;
      }
    }



    const updatedCalendar: Calendar = {
      ...calendar,
      startTime: newStart,
      endTime: newEnd
    };

    this.setLoading(true);
    this.apiService.updateCalendar(this.activeCalendarEndpoint, updatedCalendar).subscribe({
      next: (res) => {
        console.log('[processEventTimeChange] Reschedule response received:', res);
        this.setLoading(false);
        this.showToast('Calendar event rescheduled successfully');
        this.calendarUpdated.emit(res);
        this.loadCalendars();
      },
      error: (err) => {
        changeInfo.revert();
        this.showToast('Failed to reschedule calendar slot', 'error');
        this.setLoading(false);
        console.error(err);
      }
    });
  }

  // ----------------------------------------------------
  // Local Event Logs Handler
  // ----------------------------------------------------

  private logEvent(type: 'created' | 'updated' | 'deleted', message: string, details: any): void {
    this.eventLogs.unshift({
      timestamp: new Date(),
      type,
      message,
      details
    });
  }

  clearLogs(): void {
    this.eventLogs = [];
  }

  // ----------------------------------------------------
  // Helpers
  // ----------------------------------------------------

  private createCalendarEntries(baseCalendar: Omit<Calendar, 'id'>, recurrence: RecurrenceType | string, repeatCount: number, roasterConfig?: any): void {
    console.log('[createCalendarEntries] Config:', roasterConfig);

    if (roasterConfig && (roasterConfig.freq || roasterConfig.slot === true || roasterConfig.windows?.length > 0)) {
      // New multi-window flow: POST config (with windows) → then generate-slots
      this.apiService.createRoasterConfig(roasterConfig).subscribe({
        next: (savedConfig: any) => {
          console.log('[createCalendarEntries] Config saved:', savedConfig);
          const configId = savedConfig?.id;
          if (configId) {
            this.apiService.generateSlots(configId).subscribe({
              next: (result: any) => {
                console.log('[createCalendarEntries] Slots generated:', result);
                this.setLoading(false);
                this.showToast(`Availability created — ${result.generated || 0} slots generated`);
                this.loadCalendars();
                this.calendarCreated.emit(baseCalendar as Calendar);
              },
              error: (err: any) => {
                console.error('[createCalendarEntries] Slot generation failed:', err);
                this.setLoading(false);
                this.showToast('Availability saved, but slot generation failed', 'error');
                this.loadCalendars();
              }
            });
          } else {
            this.setLoading(false);
            this.showToast('Availability created successfully');
            this.loadCalendars();
          }
        },
        error: (err: any) => {
          console.error('[createCalendarEntries] Config save failed:', err);
          this.setLoading(false);
          this.showToast('Failed to create availability', 'error');
        }
      });
    } else {
      // Legacy single-slot flow (no windows)
      this.doCreateEntries(baseCalendar, recurrence, repeatCount);
    }
  }


  private doCreateEntries(baseCalendar: Omit<Calendar, 'id'>, recurrence: RecurrenceType | string, repeatCount: number): void {
    console.log('[doCreateEntries] Building entries. roasterConfigId:', (baseCalendar as any).roasterConfigId);
    baseCalendar = {
      ...baseCalendar,
      roasterType: baseCalendar.roasterType
    };
    const entriesToCreate: Omit<Calendar, 'id'>[] = [baseCalendar];

    if (recurrence && recurrence !== RecurrenceType.NONE && repeatCount > 0) {
      if (this.recurringEventsService && typeof this.recurringEventsService.generateOccurrences === 'function') {
        const occurrences = this.recurringEventsService.generateOccurrences(
          baseCalendar.startTime,
          baseCalendar.endTime,
          recurrence,
          repeatCount
        );
        console.log('[createCalendarEntries] Generated occurrences:', occurrences);
        occurrences.forEach((occ: any) => {
          entriesToCreate.push({
            ...baseCalendar,
            startTime: occ.startTime,
            endTime: occ.endTime
          });
        });
      } else {
        const startBase = new Date(baseCalendar.startTime);
        const endBase = new Date(baseCalendar.endTime);

        for (let i = 1; i < repeatCount; i++) {
          const nextStart = new Date(startBase);
          const nextEnd = new Date(endBase);

          if (recurrence === RecurrenceType.DAILY) {
            nextStart.setDate(startBase.getDate() + i);
            nextEnd.setDate(endBase.getDate() + i);
          } else if (recurrence === RecurrenceType.WEEKLY) {
            nextStart.setDate(startBase.getDate() + (7 * i));
            nextEnd.setDate(endBase.getDate() + (7 * i));
          } else if (recurrence === RecurrenceType.MONTHLY) {
            nextStart.setMonth(startBase.getMonth() + i);
            nextEnd.setMonth(endBase.getMonth() + i);
          }

          entriesToCreate.push({
            ...baseCalendar,
            startTime: nextStart,
            endTime: nextEnd
          });
        }
      }
    }

    console.log('[createCalendarEntries] Final entries list to create:', entriesToCreate);

    const requests = entriesToCreate.map(entry =>
      this.apiService.createCalendar(this.activeCalendarEndpoint, entry)
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        console.log('[createCalendarEntries] Successfully created entries:', results);
        this.setLoading(false);
        this.showToast(`${this.calendarName} created successfully${requests.length > 1 ? ' (' + requests.length + ' entries)' : ''}`);
        this.loadCalendars();
        if (results.length > 0) {
          this.calendarCreated.emit(results[0]);
        }
      },
      error: (err) => {
        console.error('[createCalendarEntries] Failed to create entries:', err);
        this.setLoading(false);
        this.showToast(`Failed to create ${this.calendarName}`, 'error');
        console.error(err);
      }
    });
  }


  private handleEventDragStart(info: any): void {
    this.isDraggingEvent = true;
    this.droppedInTrash = false;
    this.cdr.detectChanges();
  }

  private handleEventDragStop(info: any): void {
    this.isDraggingEvent = false;
    if (info.event.extendedProps['isClosed']) {
      this.showToast('Closed consultation calendar entries cannot be deleted.', 'error');
      this.cdr.detectChanges();
      return;
    }
    const trashEl = document.getElementById('calendar-trash-zone');
    if (trashEl) {
      const rect = trashEl.getBoundingClientRect();
      const x = info.jsEvent.clientX;
      const y = info.jsEvent.clientY;
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        this.droppedInTrash = true;
        this.deleteCalendarEntry(info.event.id);
      }
    }
    this.cdr.detectChanges();
  }

  private deleteCalendarEntry(id: string): void {
    const calendar = this.calendars.find(c => c.id === id);
    if (!calendar) return;

    // roaster/Admin Mode: delete the slot entirely
    this.setLoading(true);
    this.apiService.deleteCalendar(this.activeCalendarEndpoint, id).subscribe({
      next: () => {
        console.log('[deleteCalendarEntry] Entry deleted via trash. ID:', id);
        this.setLoading(false);
        this.showToast('roaster slot deleted successfully');
        this.calendarDeleted.emit(id);
        this.loadCalendars();
      },
      error: (err) => {
        this.showToast('Failed to delete roaster slot', 'error');
        this.setLoading(false);
        console.error(err);
      }
    });
  }

  private getToastTranslationKey(message: string): string | null {
    if (message === 'Cannot schedule shifts in the past') return 'CALENDAR_MODULE.TOAST.CANNOT_SCHEDULE_PAST';
    if (message === 'Error loading buddy calendar schedule') return 'CALENDAR_MODULE.TOAST.ERROR_LOADING_BUDDY';
    if (message === 'Error loading calendars schedule') return 'CALENDAR_MODULE.TOAST.ERROR_LOADING_CALENDARS';
    if (message.startsWith('Cannot create ') && message.endsWith(' for past dates.')) return 'CALENDAR_MODULE.TOAST.CANNOT_CREATE_PAST_DATES';
    if (message.startsWith('Cannot create ') && message.endsWith(' for past times.')) return 'CALENDAR_MODULE.TOAST.CANNOT_CREATE_PAST_TIMES';
    if (message === 'Calendar entry updated successfully') return 'CALENDAR_MODULE.TOAST.ENTRY_UPDATED_SUCCESS';
    if (message === 'Failed to update calendar entry') return 'CALENDAR_MODULE.TOAST.FAILED_UPDATE_ENTRY';
    if (message === 'Calendar entry deleted successfully') return 'CALENDAR_MODULE.TOAST.ENTRY_DELETED_SUCCESS';
    if (message === 'Failed to delete calendar entry') return 'CALENDAR_MODULE.TOAST.FAILED_DELETE_ENTRY';
    if (message === 'You cannot reschedule calendar entries.') return 'CALENDAR_MODULE.TOAST.CANNOT_RESCHEDULE';
    if (message.startsWith('Duration must be a multiple of ')) return 'CALENDAR_MODULE.TOAST.DURATION_MULTIPLE';
    if (message === 'Cannot reschedule calendar entries to past dates.') return 'CALENDAR_MODULE.TOAST.CANNOT_RESCHEDULE_PAST_DATES';
    if (message === 'Cannot reschedule calendar entries to past times.') return 'CALENDAR_MODULE.TOAST.CANNOT_RESCHEDULE_PAST_TIMES';
    if (message === 'Calendar event rescheduled successfully') return 'CALENDAR_MODULE.TOAST.EVENT_RESCHEDULED_SUCCESS';
    if (message === 'Failed to reschedule calendar slot') return 'CALENDAR_MODULE.TOAST.FAILED_RESCHEDULE';
    if (message.startsWith('Availability created — ') && message.endsWith(' slots generated')) return 'CALENDAR_MODULE.TOAST.AVAILABILITY_CREATED_COUNT';
    if (message === 'Availability saved, but slot generation failed') return 'CALENDAR_MODULE.TOAST.AVAILABILITY_SAVED_GEN_FAILED';
    if (message === 'Availability created successfully') return 'CALENDAR_MODULE.TOAST.AVAILABILITY_CREATED_SUCCESS';
    if (message === 'Failed to create availability') return 'CALENDAR_MODULE.TOAST.FAILED_CREATE_AVAILABILITY';
    if (message.includes(' created successfully')) {
      if (message.includes(' entries)')) {
        return 'CALENDAR_MODULE.TOAST.CREATED_SUCCESS_PLURAL';
      }
      return 'CALENDAR_MODULE.TOAST.CREATED_SUCCESS';
    }
    if (message.startsWith('Failed to create ')) return 'CALENDAR_MODULE.TOAST.FAILED_CREATE_NAME';
    if (message === 'roaster slot deleted successfully') return 'CALENDAR_MODULE.TOAST.SLOT_DELETED_SUCCESS';
    if (message === 'Failed to delete roaster slot') return 'CALENDAR_MODULE.TOAST.FAILED_DELETE_SLOT';
    return null;
  }

  private getToastParams(message: string): any {
    if (message.startsWith('Cannot create ') && message.endsWith(' for past dates.')) {
      const name = message.substring('Cannot create '.length, message.length - ' for past dates.'.length);
      return { name };
    }
    if (message.startsWith('Cannot create ') && message.endsWith(' for past times.')) {
      const name = message.substring('Cannot create '.length, message.length - ' for past times.'.length);
      return { name };
    }
    if (message.startsWith('Duration must be a multiple of ')) {
      const duration = message.substring('Duration must be a multiple of '.length, message.indexOf(' minutes.'));
      return { duration };
    }
    if (message.startsWith('Availability created — ') && message.endsWith(' slots generated')) {
      const count = message.substring('Availability created — '.length, message.length - ' slots generated'.length);
      return { count };
    }
    if (message.includes(' created successfully')) {
      if (message.includes(' entries)')) {
        const match = message.match(/(.+) created successfully \((.+) entries\)/);
        if (match) {
          return { name: match[1], count: match[2] };
        }
      } else {
        const name = message.substring(0, message.indexOf(' created successfully'));
        return { name };
      }
    }
    if (message.startsWith('Failed to create ')) {
      const name = message.substring('Failed to create '.length);
      return { name };
    }
    return {};
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    const translationKey = this.getToastTranslationKey(message);
    const params = this.getToastParams(message);
    const translatedMessage = translationKey ? this.translateService.instant(translationKey, params) : message;
    this.snackBar.open(translatedMessage, undefined, {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: type === 'success' ? ['toast-success'] : ['toast-error']
    });
  }

  public refresh(): void {
  }
}
