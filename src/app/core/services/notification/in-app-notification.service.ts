import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, catchError, map, of, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  source: 'history' | 'fcm';
  route?: string;
  raw?: any;
}

@Injectable({
  providedIn: 'root'
})
export class InAppNotificationService {
  private readonly notificationsSubject = new BehaviorSubject<InAppNotification[]>([]);
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  private hasLoaded = false;

  readonly notifications$ = this.notificationsSubject.asObservable();
  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private router: Router
  ) { }

  loadLatest(limit = 20, force = false): void {
    if (this.hasLoaded && !force) {
      return;
    }

    this.hasLoaded = true;
    this.http.get(`${environment.apiBaseUrl}/notification/api/notifications/history?page=1&limit=${limit}`)
      .pipe(
        map(response => this.extractRows(response).map(row => this.fromHistory(row))),
        catchError(() => of([]))
      )
      .subscribe(notifications => {
        this.setNotifications(this.mergeNotifications(notifications, this.notificationsSubject.value));
      });
  }

  pushFromFcm(payload: any, showToast = true): void {
    const notification = this.fromFcm(payload);
    this.setNotifications(this.mergeNotifications([notification], this.notificationsSubject.value));

    if (showToast) {
      const snackRef = this.snackBar.open(
        `${notification.title}${notification.body ? ' - ' + notification.body : ''}`,
        'View',
        { duration: 8000, horizontalPosition: 'right', verticalPosition: 'top' }
      );

      snackRef.onAction().subscribe(() => {
        this.markRead(notification);
        this.router.navigate([notification.route || '/user-mgmt/notifications']);
      });
    }
  }

  markRead(notification: InAppNotification): void {
    if (!notification || notification.read) {
      return;
    }

    this.setNotifications(
      this.notificationsSubject.value.map(item =>
        item.id === notification.id ? { ...item, read: true } : item
      )
    );

    if (notification.source === 'history') {
      this.http.put(`${environment.apiBaseUrl}/notification/api/notifications/read/${notification.id}`, {})
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
  }

  markAllRead(): void {
    this.setNotifications(this.notificationsSubject.value.map(item => ({ ...item, read: true })));
    this.http.post(`${environment.apiBaseUrl}/notification/api/notifications/read-all`, {})
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  refresh(): void {
    this.loadLatest(20, true);
  }

  private setNotifications(notifications: InAppNotification[]): void {
    const sorted = notifications
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);
    this.notificationsSubject.next(sorted);
    this.unreadCountSubject.next(sorted.filter(item => !item.read).length);
  }

  private mergeNotifications(next: InAppNotification[], current: InAppNotification[]): InAppNotification[] {
    const merged = new Map<string, InAppNotification>();
    [...next, ...current].forEach(item => {
      merged.set(item.id, { ...merged.get(item.id), ...item });
    });
    return Array.from(merged.values());
  }

  private fromHistory(row: any): InAppNotification {
    return {
      id: `${row?.id || row?._id || row?.notification_id || this.makeLocalId()}`,
      title: `${row?.title || row?.subject || row?.event_name || 'Notification'}`,
      body: `${row?.body || row?.message || row?.content || row?.error_message || ''}`,
      createdAt: `${row?.sent_at || row?.created_at || row?.created_on || row?.delivered_at || new Date().toISOString()}`,
      read: !!(row?.is_read ?? row?.read ?? false),
      source: 'history',
      raw: row
    };
  }

  private fromFcm(payload: any): InAppNotification {
    const notification = payload?.notification || {};
    const data = payload?.data || {};
    return {
      id: `${data.id || data.notification_id || payload?.messageId || this.makeLocalId()}`,
      title: `${notification.title || data.title || 'Notification'}`,
      body: `${notification.body || data.body || data.message || ''}`,
      createdAt: `${data.created_at || data.sent_at || new Date().toISOString()}`,
      read: false,
      source: 'fcm',
      route: data.route || data.path || data.url,
      raw: payload
    };
  }

  private extractRows(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.notifications)) return response.notifications;
    if (Array.isArray(response?.items)) return response.items;
    if (Array.isArray(response?.data?.notifications)) return response.data.notifications;
    if (Array.isArray(response?.data?.items)) return response.data.items;
    if (Array.isArray(response?.data?.[0]?.response)) return response.data[0].response;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  }

  private makeLocalId(): string {
    return `local-${Date.now()}-${self.crypto.randomUUID().substring(0, 8)}`;
  }
}
