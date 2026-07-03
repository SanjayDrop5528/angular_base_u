import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CoreGrid, GridOutputEvent } from '../shared/components/core-grid/core-grid';
import { DataService } from '../../core/services/data.service';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, Subject, catchError, filter, forkJoin, of, takeUntil } from 'rxjs';
import { InAppNotification, InAppNotificationService } from '../../core/services/notification/in-app-notification.service';
import { AuthService } from '../../core/services/auth.service';

type RecipientField = {
  key: 'name' | 'email' | 'mobile' | 'whatsapp' | 'telegram_id' | 'device_token' | 'user_id';
  label: string;
  type: string;
};

type TestRecipient = {
  name: string;
  email: string;
  mobile: string;
  whatsapp: string;
  telegram_id: string;
  device_token: string;
  user_id: string;
};

type TemplateTestState = {
  recipient: TestRecipient;
  variablesText: string;
  response: any;
  error: string;
};

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, CoreGrid, TranslateModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  @ViewChild('channelsGrid') channelsGrid!: CoreGrid;
  @ViewChild('eventsGrid') eventsGrid!: CoreGrid;
  @ViewChild('templatesGrid') templatesGrid!: CoreGrid;
  @ViewChild('deliveryLogsGrid') deliveryLogsGrid!: CoreGrid;

  activeSubTab = 'channels'; // 'inbox', 'channels', 'events', 'templates', 'check', 'delivery-logs'
  inboxNotifications: InAppNotification[] = [];
  inboxUnreadCount = 0;
  eventSearchText = '';
  channels: any[] = [];
  events: any[] = [];
  templates: any[] = [];
  selectedEvent: any = null;
  selectedTemplate: any = null;
  selectedDeliveryLog: any = null;
  isDeliveryLogDrawerOpen = false;
  testVariablesText = '{}';
  testRecipient: TestRecipient = {
    name: 'Test Patient',
    email: 'test.patient@sds.org',
    mobile: '+919876543210',
    whatsapp: '',
    telegram_id: '',
    device_token: '',
    user_id: ''
  };
  testResponse: any = null;
  testError = '';
  isSendingTest = false;
  isLoadingLists = false;
  isLoadingEventTemplates = false;
  private previewUrlCache: { html: string; url: SafeResourceUrl } | null = null;

  private readonly defaultTestRecipient: TestRecipient = {
    name: 'Test Patient',
    email: 'test.patient@sds.org',
    mobile: '+919876543210',
    whatsapp: '',
    telegram_id: '',
    device_token: '',
    user_id: ''
  };
  private templateTestState: Record<string, TemplateTestState> = {};

  private readonly recipientFieldMap: Record<string, RecipientField> = {
    email: { key: 'email', label: 'Email', type: 'email' },
    mobile: { key: 'mobile', label: 'Mobile', type: 'text' },
    phone: { key: 'mobile', label: 'Mobile', type: 'text' },
    sms: { key: 'mobile', label: 'Mobile', type: 'text' },
    whatsapp: { key: 'whatsapp', label: 'WhatsApp', type: 'text' },
    telegram: { key: 'telegram_id', label: 'Telegram ID', type: 'text' },
    telegram_id: { key: 'telegram_id', label: 'Telegram ID', type: 'text' },
    push: { key: 'user_id', label: 'User ID', type: 'text' },
    user_id: { key: 'user_id', label: 'User ID', type: 'text' },
    recipient_user_id: { key: 'user_id', label: 'User ID', type: 'text' },
    recipient_id: { key: 'user_id', label: 'User ID', type: 'text' },
    device_token: { key: 'device_token', label: 'Device Token', type: 'text' },
    fcm_token: { key: 'device_token', label: 'Device Token', type: 'text' },
    push_token: { key: 'device_token', label: 'Device Token', type: 'text' }
  };

  private dataService = inject(DataService);
  private inAppNotificationService = inject(InAppNotificationService);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  deliveryLogApi = (filter: any, sort: any, start: any, end: any): Observable<any> =>
    this.dataService.getDataByFilter('notification-log', { filter, sort, start, end });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.setActiveTab(this.resolveActiveTab(), true);
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.setActiveTab(this.resolveActiveTab());
      });

    this.inAppNotificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.inboxNotifications = notifications;
        this.cdr.detectChanges();
      });

    this.inAppNotificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.inboxUnreadCount = count;
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onGridAction(event: GridOutputEvent): void {
    if (event.Source !== 'Form') {
      return;
    }
    setTimeout(() => {
      this.loadLists();
    }, 150);
  }

  onChannelDeleteRequest(channel: any): void {
    const id = channel.id || channel._id;
    this.dataService.deleteDataById('notification-channel', id).subscribe({
      next: () => {
        this.loadChannels();
      }
    });
  }

  onEventDeleteRequest(eventItem: any): void {
    const id = eventItem.id || eventItem._id;
    this.dataService.deleteDataById('notification-event', id).subscribe({
      next: () => {
        this.loadEvents();
      }
    });
  }

  onTemplateDeleteRequest(template: any): void {
    const id = template.id || template._id;
    this.dataService.deleteDataById('notification-template', id).subscribe({
      next: () => {
        this.loadTemplates();
      }
    });
  }

  loadLists(): void {
    if (this.activeSubTab === 'inbox') {
      this.loadInbox();
      return;
    }
    if (this.activeSubTab === 'channels') {
      this.loadChannels();
      return;
    }
    if (this.activeSubTab === 'events') {
      this.loadEvents();
      return;
    }
    if (this.activeSubTab === 'check') {
      this.loadCheckLists();
      return;
    }
    if (this.activeSubTab === 'delivery-logs') {
      return;
    }
    this.loadTemplates();
  }

  private setActiveTab(tab: string, force = false): void {
    const nextTab = tab || 'channels';
    const changed = this.activeSubTab !== nextTab;
    this.activeSubTab = nextTab;

    if (changed || force) {
      this.loadLists();
    }
    this.cdr.detectChanges();
  }

  private resolveActiveTab(): string {
    const url = this.router.url.split('?')[0].split('#')[0];
    const tab = url.split('/').filter(Boolean).pop();
    if (['inbox', 'channels', 'events', 'templates', 'check', 'delivery-logs'].includes(tab || '')) {
      return tab as string;
    }

    const routeTab = this.route.snapshot.data?.['activeTab'];
    if (routeTab) return routeTab;

    return 'channels';
  }

  loadInbox(): void {
    this.inAppNotificationService.loadLatest(20, true);
  }

  markInboxNotificationRead(notification: InAppNotification): void {
    this.inAppNotificationService.markRead(notification);
  }

  markAllInboxNotificationsRead(): void {
    this.inAppNotificationService.markAllRead();
  }

  getInboxNotificationTime(notification: InAppNotification): string {
    const date = new Date(notification.createdAt);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private loadChannels(): void {
    this.isLoadingLists = true;
    this.dataService.getDataByFilter('notification-channel', { start: 0, end: 1000 })
      .pipe(catchError(() => of(null)))
      .subscribe((res: any) => {
        this.channels = this.extractRows(res);
        this.isLoadingLists = false;
        this.cdr.detectChanges();
      });
  }

  private loadEvents(): void {
    this.isLoadingLists = true;
    this.dataService.getDataByFilter('notification-event', { start: 0, end: 1000 })
      .pipe(catchError(() => of(null)))
      .subscribe((res: any) => {
        this.events = this.extractRows(res);
        this.isLoadingLists = false;
        this.cdr.detectChanges();
      });
  }

  private loadTemplates(): void {
    this.isLoadingLists = true;
    this.dataService.getDataByFilter('notification-template', { start: 0, end: 1000 })
      .pipe(catchError(() => of(null)))
      .subscribe((res: any) => {
        this.templates = this.extractRows(res);
        this.syncSelectedTemplate();
        this.isLoadingLists = false;
        this.cdr.detectChanges();
      });
  }

  onDeliveryLogAction(event: GridOutputEvent): void {
    if (event.Action !== 'rowDoubleClicked' || !event.data) {
      return;
    }
    this.selectedDeliveryLog = event.data;
    this.isDeliveryLogDrawerOpen = true;
  }

  closeDeliveryLogDrawer(): void {
    this.isDeliveryLogDrawerOpen = false;
  }

  getDeliveryDateTime(log: any): string {
    return this.formatDateTime(log?.sent_at || log?.delivery_date_time || log?.delivered_at || log?.created_at);
  }

  getDeliveryStatusClass(status: any): string {
    const value = `${status || ''}`.toLowerCase();
    if (['success', 'delivered'].includes(value)) return 'success';
    if (['error', 'failed', 'failure'].includes(value)) return 'error';
    if (value === 'pending') return 'pending';
    return 'unknown';
  }

  getDeliveryStatusLabel(status: any): string {
    const value = `${status || 'unknown'}`.toUpperCase();
    return `NOTIFICATION_MODULE.LOG_STATUS.${value}`;
  }

  formatDateTime(value: any): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return `${value}`;
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }

  getBooleanLabel(value: any): string {
    if (value === true) return 'NOTIFICATION_MODULE.DELIVERY_LOGS.YES';
    if (value === false) return 'NOTIFICATION_MODULE.DELIVERY_LOGS.NO';
    return '-';
  }

  private loadCheckLists(): void {
    this.isLoadingLists = true;
    forkJoin({
      events: this.dataService.getDataByFilter('notification-event', { start: 0, end: 1000 })
        .pipe(catchError(() => of(null))),
      channels: this.dataService.getDataByFilter('notification-channel', { start: 0, end: 1000 })
        .pipe(catchError(() => of(null)))
    }).subscribe((res: any) => {
      this.events = this.extractRows(res.events);
      this.channels = this.extractRows(res.channels);
      this.templates = [];
      this.syncSelectedEventAndTemplate();
      this.isLoadingLists = false;
      this.cdr.detectChanges();
    });
  }

  selectEvent(event: any): void {
    this.persistSelectedTemplateState();
    this.selectedEvent = event;
    this.templates = [];
    this.selectedTemplate = null;
    this.testResponse = null;
    this.testError = '';
    this.testVariablesText = '{}';
    this.testRecipient = { ...this.defaultTestRecipient };
    this.loadTemplatesForEvent(event);
  }

  selectTemplate(template: any): void {
    this.persistSelectedTemplateState();
    this.selectedTemplate = template;
    this.loadTemplateTestState(template);
  }

  getTemplateId(template: any): string {
    return `${template?._id ?? template?.id ?? ''}`;
  }

  getEventId(event: any): string {
    const zeroUuid = '00000000-0000-0000-0000-000000000000';
    const candidates = [
      event?.id,
      event?.event_id,
      event?.name,
      event?._id
    ];
    const value = candidates.find(candidate => {
      const text = `${candidate ?? ''}`.trim();
      return text && text !== zeroUuid;
    });
    return `${value ?? ''}`;
  }

  getTemplateChannel(template: any): any {
    const channelId = `${template?.channel_id || ''}`.toLowerCase();
    return this.channels.find(channel =>
      `${channel?._id || channel?.id || ''}`.toLowerCase() === channelId ||
      `${channel?.name || ''}`.toLowerCase() === channelId
    );
  }

  getTemplateEvent(template: any): any {
    const eventId = `${template?.event_id || ''}`.toLowerCase();
    return this.events.find(event =>
      `${event?.id || event?.event_id || event?._id || ''}`.toLowerCase() === eventId
    );
  }

  getTemplateVariables(template: any): string[] {
    const source = `${template?.subject || ''}\n${template?.body || ''}`;
    const matcher = /{{\s*([a-zA-Z_][a-zA-Z0-9_.-]*)\s*}}/g;
    const variables: string[] = [];
    const seen = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = matcher.exec(source)) !== null) {
      if (!seen.has(match[1])) {
        seen.add(match[1]);
        variables.push(match[1]);
      }
    }
    return variables;
  }

  getRecipientFieldsForTemplate(template: any): RecipientField[] {
    const channelConfig = this.getChannelConfig(template);
    const channelType = this.getTemplateChannelType(template);
    if (channelType === 'push') {
      return [this.recipientFieldMap['user_id']];
    }

    const configuredField = `${channelConfig?.recipient_field || ''}`.trim().toLowerCase();
    const configuredRecipient = this.recipientFieldMap[configuredField];
    if (configuredRecipient) {
      return [configuredRecipient];
    }

    if (channelType === 'email') return [this.recipientFieldMap['email']];
    if (channelType === 'sms') return [this.recipientFieldMap['mobile']];
    if (channelType === 'whatsapp') return [this.recipientFieldMap['whatsapp']];
    if (channelType === 'telegram') return [this.recipientFieldMap['telegram_id']];
    if (channelType === 'push') return [this.recipientFieldMap['device_token']];

    return [this.recipientFieldMap['email']];
  }

  getActiveEventTemplates(): any[] {
    return this.templates.filter(template =>
      `${template?.status || 'active'}`.toLowerCase() === 'active'
    );
  }

  getFilteredEvents(): any[] {
    const query = this.eventSearchText.trim().toLowerCase();
    if (!query) {
      return this.events;
    }

    return this.events.filter(event => {
      const searchable = [
        event?.name,
        event?.id,
        event?.event_id,
        event?.entity_id
      ].join(' ').toLowerCase();
      return searchable.includes(query);
    });
  }

  getTemplateRecipientValue(template: any, key: RecipientField['key']): string {
    return this.ensureTemplateTestState(template).recipient[key] || '';
  }

  setTemplateRecipientValue(template: any, key: RecipientField['key'], value: string): void {
    const state = this.ensureTemplateTestState(template);
    state.recipient = this.applyRecipientDefaultsForTemplate(template, {
      ...state.recipient,
      [key]: value
    });
    this.syncRecipientVariables(template, state, key);

    if (this.getTemplateId(template) === this.getTemplateId(this.selectedTemplate)) {
      this.testRecipient = { ...state.recipient };
      this.testVariablesText = state.variablesText;
      this.testResponse = state.response;
      this.testError = state.error;
    }
  }

  getRenderedPreview(value: string): string {
    if (!this.selectedTemplate) return '';
    try {
      const variables = JSON.parse(this.testVariablesText || '{}');
      return this.renderTemplate(value || '', variables);
    } catch {
      return value || '';
    }
  }

  isEmailTemplate(template: any): boolean {
    return this.getTemplateChannelType(template) === 'email';
  }

  getRenderedEmailPreviewDocument(): string {
    if (!this.selectedTemplate) {
      return this.wrapEmailPreviewBody('<div class="empty-preview">Select an email template</div>');
    }

    const body = this.normalizePreviewHtml(this.getRenderedPreview(this.selectedTemplate.body)).trim();
    if (!body) {
      return this.wrapEmailPreviewBody('<div class="empty-preview">No HTML body entered</div>');
    }

    if (/<html[\s>]/i.test(body) || /<body[\s>]/i.test(body)) {
      return body;
    }

    return this.wrapEmailPreviewBody(body);
  }

  getRenderedEmailPreviewUrl(): SafeResourceUrl {
    const html = this.getRenderedEmailPreviewDocument();
    if (this.previewUrlCache?.html === html) {
      return this.previewUrlCache.url;
    }

    const url = this.sanitizer.bypassSecurityTrustResourceUrl(
      `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
    );
    this.previewUrlCache = { html, url };
    return url;
  }

  sendTemplateTest(): void {
    if (!this.templates.length || this.isSendingTest) return;

    this.testResponse = null;
    this.testError = '';
    this.persistSelectedTemplateState();

    const activeTemplates = this.getActiveEventTemplates();
    if (!activeTemplates.length) {
      this.testError = 'No active templates configured for this event.';
      return;
    }

    const validationErrors: string[] = [];
    const requests = activeTemplates.map(template => {
      const state = this.ensureTemplateTestState(template);
      const recipientError = this.validateTemplateRecipient(template, state);
      if (recipientError) {
        validationErrors.push(recipientError);
        return null;
      }

      let variables: any;
      try {
        variables = JSON.parse(state.variablesText || '{}');
      } catch {
        validationErrors.push(`${template.name || 'Template'}: Variables must be valid JSON.`);
        return null;
      }
      variables = this.variablesForTemplate(template, state.recipient, variables);
      state.variablesText = JSON.stringify(variables, null, 2);

      const payload = this.buildTestPayloadForTemplate(template, state.recipient, variables);
      return this.dataService.save('notification/api/notifications/templates/test', payload).pipe(
        catchError((err: any) => of({
          __notificationTestError: true,
          template_id: this.getTemplateId(template),
          template_name: template?.name,
          error: err?.error?.error || 'Failed to send test notification.'
        }))
      );
    }).filter(Boolean);

    if (validationErrors.length) {
      this.testError = validationErrors.join(' ');
      return;
    }

    this.isSendingTest = true;
    forkJoin(requests as any[]).subscribe({
      next: (results: any[]) => {
        results.forEach((result, index) => {
          const state = this.ensureTemplateTestState(activeTemplates[index]);
          if (result?.__notificationTestError) {
            state.error = result.error;
            state.response = null;
          } else {
            state.response = result;
            state.error = '';
          }
        });

        const failed = results.filter(result => result?.__notificationTestError);
        this.testResponse = results;
        this.testError = failed.map(result => `${result.template_name}: ${result.error}`).join(' ');
        this.isSendingTest = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.testError = err?.error?.error || 'Failed to send test notification.';
        this.isSendingTest = false;
      }
    });
  }

  getTestResultTitle(): string {
    if (Array.isArray(this.testResponse)) {
      const failed = this.testResponse.filter(result => result?.__notificationTestError).length;
      const sent = this.testResponse.length - failed;
      if (failed) return `${sent} sent, ${failed} failed`;
      return `${sent} test notification${sent === 1 ? '' : 's'} sent`;
    }
    return this.testResponse?.message || 'Test notification sent';
  }

  getTestResultSummary(): string {
    if (Array.isArray(this.testResponse)) {
      return this.testResponse
        .filter(result => !result?.__notificationTestError)
        .map(result => `${result.channel || 'channel'} -> ${result.recipient || 'recipient'}`)
        .join(', ');
    }
    return `${this.testResponse?.channel || ''} -> ${this.testResponse?.recipient || ''}`;
  }

  private defaultVariablesForTemplate(template: any, recipient: TestRecipient = this.testRecipient): Record<string, any> {
    return this.variablesForTemplate(template, recipient);
  }

  private variablesForTemplate(template: any, recipient: TestRecipient, existing: Record<string, any> = {}): Record<string, any> {
    return this.getTemplateVariables(template).reduce((variables, variable) => {
      variables[variable] = Object.prototype.hasOwnProperty.call(existing, variable)
        ? existing[variable]
        : this.defaultValueForVariable(variable, recipient);
      return variables;
    }, {} as Record<string, any>);
  }

  private defaultValueForVariable(variable: string, recipient: TestRecipient): string {
    const normalized = variable.toLowerCase();
    if (['name', 'recipient_name', 'patient_name', 'user_name'].includes(normalized)) {
      return recipient.name;
    }
    if (normalized === 'email') {
      return recipient.email;
    }
    if (['mobile', 'phone'].includes(normalized)) {
      return recipient.mobile;
    }
    if (normalized === 'whatsapp') {
      return recipient.whatsapp || recipient.mobile;
    }
    if (['telegram', 'telegram_id', 'chat_id'].includes(normalized)) {
      return recipient.telegram_id;
    }
    if (['device_token', 'fcm_token', 'push_token'].includes(normalized)) {
      return recipient.device_token;
    }
    if (['user_id', 'recipient_user_id', 'recipient_id'].includes(normalized)) {
      return recipient.user_id;
    }
    if (['otp', 'code', 'verification_code'].includes(normalized)) {
      return '123456';
    }
    if (['expiry_minutes', 'expires_in', 'valid_minutes'].includes(normalized)) {
      return '10';
    }
    if (normalized.endsWith('_link') || normalized.endsWith('_url')) {
      return 'https://sds.org/verify';
    }
    return `sample_${variable}`;
  }

  private applyRecipientDefaultsForTemplate(template: any, recipient: TestRecipient): TestRecipient {
    const nextRecipient = { ...recipient };
    const channelType = this.getTemplateChannelType(template);
    if (channelType === 'whatsapp' && !nextRecipient.whatsapp) {
      nextRecipient.whatsapp = nextRecipient.mobile;
    }
    if (channelType === 'push' && !nextRecipient.user_id) {
      nextRecipient.user_id = this.getCurrentUserId();
    }
    if (channelType === 'push' && nextRecipient.user_id) {
      nextRecipient.device_token = '';
    }
    return nextRecipient;
  }

  private buildTestPayloadForTemplate(template: any, recipient: TestRecipient, variables: Record<string, any>): any {
    const payloadVariables = { ...variables };
    if (recipient.user_id && !payloadVariables['user_id']) {
      payloadVariables['user_id'] = recipient.user_id;
    }
    const payloadRecipient = { ...recipient };
    if (this.getTemplateChannelType(template) === 'push' && payloadRecipient.user_id) {
      payloadRecipient.device_token = '';
    }

    return {
      template_id: template?._id || template?.id,
      recipient: payloadRecipient,
      variables: payloadVariables
    };
  }

  private validateTemplateRecipient(template: any, state: TemplateTestState): string {
    if (this.getTemplateChannelType(template) === 'push') {
      const hasUserID = !!`${state.recipient.user_id || ''}`.trim();
      const hasDeviceToken = !!`${state.recipient.device_token || ''}`.trim();
      return hasUserID || hasDeviceToken ? '' : `${template?.name || 'Template'}: User ID or Device Token is required.`;
    }

    const missingField = this.getRecipientFieldsForTemplate(template).find(field =>
      !`${state.recipient[field.key] || ''}`.trim()
    );
    return missingField ? `${template?.name || 'Template'}: ${missingField.label} is required.` : '';
  }

  private syncRecipientVariables(template: any, state: TemplateTestState, key: RecipientField['key']): void {
    let variables: Record<string, any>;
    try {
      variables = JSON.parse(state.variablesText || '{}');
    } catch {
      return;
    }

    const templateVariables = this.getTemplateVariables(template);
    const setIfUsed = (variableName: string, value: string) => {
      if (Object.prototype.hasOwnProperty.call(variables, variableName) || templateVariables.includes(variableName)) {
        variables[variableName] = value;
      }
    };

    if (key === 'name') {
      setIfUsed('name', state.recipient.name);
      setIfUsed('patient_name', state.recipient.name);
    }
    if (key === 'email') {
      setIfUsed('email', state.recipient.email);
    }
    if (key === 'mobile') {
      setIfUsed('mobile', state.recipient.mobile);
      setIfUsed('phone', state.recipient.mobile);
    }
    if (key === 'whatsapp') {
      setIfUsed('whatsapp', state.recipient.whatsapp);
    }
    if (key === 'telegram_id') {
      setIfUsed('telegram_id', state.recipient.telegram_id);
    }
    if (key === 'device_token') {
      setIfUsed('device_token', state.recipient.device_token);
    }
    if (key === 'user_id') {
      setIfUsed('user_id', state.recipient.user_id);
      setIfUsed('recipient_user_id', state.recipient.user_id);
      setIfUsed('recipient_id', state.recipient.user_id);
    }

    state.variablesText = JSON.stringify(variables, null, 2);
  }

  private getCurrentUserId(): string {
    const user = this.authService.getCurrentUser();
    return `${user?.user_id || user?.id || ''}`.trim();
  }

  private persistSelectedTemplateState(): void {
    if (!this.selectedTemplate) return;
    const templateId = this.getTemplateId(this.selectedTemplate);
    if (!templateId) return;

    this.templateTestState[templateId] = {
      recipient: { ...this.testRecipient },
      variablesText: this.testVariablesText,
      response: this.testResponse,
      error: this.testError
    };
  }

  private loadTemplateTestState(template: any): void {
    const state = this.ensureTemplateTestState(template);
    this.normalizeTemplateTestVariables(template, state);
    this.testRecipient = { ...state.recipient };
    this.testVariablesText = state.variablesText;
    this.testResponse = state.response;
    this.testError = state.error;
  }

  private ensureTemplateTestState(template: any): TemplateTestState {
    const templateId = this.getTemplateId(template);
    if (templateId && this.templateTestState[templateId]) {
      const state = this.templateTestState[templateId];
      this.normalizeTemplateTestVariables(template, state);
      return state;
    }

    const recipient = this.applyRecipientDefaultsForTemplate(template, this.defaultTestRecipient);
    const state: TemplateTestState = {
      recipient,
      variablesText: JSON.stringify(this.defaultVariablesForTemplate(template, recipient), null, 2),
      response: null,
      error: ''
    };

    if (templateId) {
      this.templateTestState[templateId] = state;
    }
    return state;
  }

  private normalizeTemplateTestVariables(template: any, state: TemplateTestState): void {
    let existing: Record<string, any> = {};
    try {
      existing = JSON.parse(state.variablesText || '{}');
    } catch {
      existing = {};
    }
    state.variablesText = JSON.stringify(this.variablesForTemplate(template, state.recipient, existing), null, 2);
  }

  private getTemplateChannelType(template: any): string {
    const channel = this.getTemplateChannel(template);
    const channelConfig = this.getChannelConfig(template);
    const source = [
      template?.channel_id,
      channel?.name,
      channelConfig?.provider,
      channelConfig?.type,
      channelConfig?.channel
    ].join(' ').toLowerCase();

    if (source.includes('smtp') || source.includes('mail')) return 'email';
    if (source.includes('whatsapp')) return 'whatsapp';
    if (source.includes('telegram')) return 'telegram';
    if (source.includes('sms') || source.includes('twilio')) return 'sms';
    if (source.includes('push') || source.includes('fcm') || source.includes('firebase')) return 'push';
    return '';
  }

  private getChannelConfig(template: any): any {
    const channel = this.getTemplateChannel(template);
    const rawConfig = channel?.config;
    if (!rawConfig) return {};
    if (typeof rawConfig === 'object') return rawConfig;

    try {
      const parsed = JSON.parse(rawConfig);
      if (typeof parsed === 'string') {
        return JSON.parse(parsed);
      }
      return parsed;
    } catch {
      return {};
    }
  }

  private renderTemplate(value: string, variables: Record<string, any>): string {
    return value.replace(/{{\s*([a-zA-Z_][a-zA-Z0-9_.-]*)\s*}}/g, (_, key) => {
      return variables?.[key] ?? `{{${key}}}`;
    });
  }

  private wrapEmailPreviewBody(body: string): string {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      html, body {
        margin: 0;
        min-height: 100%;
        background: #eef2f7;
      }
      body {
        padding: 18px;
        box-sizing: border-box;
      }
      .empty-preview {
        color: #64748b;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
        padding: 18px;
        text-align: center;
      }
    </style>
  </head>
  <body>${body}</body>
</html>`;
  }

  private normalizePreviewHtml(value: string): string {
    let normalized = value || '';
    for (let i = 0; i < 2; i += 1) {
      const decoded = this.decodeHtmlEntities(normalized);
      if (decoded === normalized) {
        break;
      }
      normalized = decoded;
    }
    return normalized;
  }

  private decodeHtmlEntities(value: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
  }

  private extractRows(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) {
      const first = res.data[0];
      if (Array.isArray(first?.response)) return first.response;
      if (Array.isArray(first)) return first;
    }
    if (Array.isArray(res?.data?.response)) return res.data.response;
    if (Array.isArray(res?.response)) return res.response;
    return [];
  }

  private loadTemplatesForEvent(event: any): void {
    const eventId = this.getEventId(event);
    if (!eventId) {
      this.templates = [];
      this.selectedTemplate = null;
      this.testVariablesText = '{}';
      this.testRecipient = { ...this.defaultTestRecipient };
      this.cdr.detectChanges();
      return;
    }

    this.isLoadingEventTemplates = true;
    this.dataService.getDataByFilter('notification-template', {
      start: 0,
      end: 1000,
      filter: [
        {
          clause: 'AND',
          conditions: [
            {
              column: 'event_id',
              operator: 'EQUALS',
              type: 'string',
              value: eventId
            }
          ]
        }
      ]
    }).pipe(catchError(() => of(null))).subscribe((res: any) => {
      if (this.getEventId(this.selectedEvent) !== eventId) {
        return;
      }
      this.templates = this.extractRows(res);
      this.syncSelectedTemplate();
      this.isLoadingEventTemplates = false;
      this.cdr.detectChanges();
    });
  }

  private syncSelectedTemplate(): void {
    if (!this.templates.length) {
      this.selectedTemplate = null;
      this.testVariablesText = '{}';
      this.testRecipient = { ...this.defaultTestRecipient };
      return;
    }

    const selectedId = this.getTemplateId(this.selectedTemplate);
    if (selectedId) {
      const updatedSelection = this.templates.find(template =>
        this.getTemplateId(template) === selectedId
      );
      if (updatedSelection) {
        this.selectTemplate(updatedSelection);
        return;
      }
    }

    this.selectTemplate(this.templates[0]);
  }

  private syncSelectedEventAndTemplate(): void {
    if (!this.events.length) {
      this.selectedEvent = null;
      this.selectedTemplate = null;
      this.testVariablesText = '{}';
      this.testRecipient = { ...this.defaultTestRecipient };
      return;
    }

    const selectedEventId = this.getEventId(this.selectedEvent);
    const updatedEvent = selectedEventId
      ? this.events.find(event => this.getEventId(event) === selectedEventId)
      : null;

    this.selectedEvent = updatedEvent || this.events[0];
    this.templates = [];
    this.selectedTemplate = null;
    this.testVariablesText = '{}';
    this.testRecipient = { ...this.defaultTestRecipient };
    this.loadTemplatesForEvent(this.selectedEvent);
  }
}
