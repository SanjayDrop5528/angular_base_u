import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Calendar, User, RoasterConfigPayload } from './calendar.model';
import { RoasterType } from '../../enums/enum';
import { environment } from '../../../environments/environment';
import { BaseService } from '../../core/services/base.service';

@Injectable({ providedIn: 'root' })
export class CalendarApiService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
    this.baseUrl = this.apiBaseUrl;
  }

  private _customBaseUrl?: string;

  setCustomBaseUrl(url: string) {
    this._customBaseUrl = url;
    this.baseUrl = url;
  }

  private get apiBaseUrl(): string {
    if (this._customBaseUrl) return this._customBaseUrl;
    const envUrl = environment.apiBaseUrl || '';
    const base = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
    return `${base}/roaster/api`;
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  getUsers(endpoint: string = '/user/api/users'): Observable<User[]> {
    const baseUrl = endpoint.startsWith('/user') ? (environment.apiBaseUrl || '') : this.apiBaseUrl;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    const request$ = endpoint === '/user/api/users'
      ? this.http.post<any[]>(`${cleanBase}${cleanEndpoint}`, { include_deleted: false })
      : this.http.get<any[]>(`${cleanBase}${cleanEndpoint}`);

    return request$.pipe(
      map(users => (Array.isArray(users) ? users : []).map(u => ({
        id: u.id,
        name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User',
        email: u.email,
        color: u.profile_color || u.color || '#3b82f6',
        entityType: u.entity_type || u.entityType || ''
      })))
    );
  }

  // ── Roasters (Calendar Events) ────────────────────────────────────────────

  getCalendar(endpoint: string, params?: { [key: string]: any }): Observable<Calendar[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<any[]>(`${this.apiBaseUrl}${endpoint}`, { params: httpParams }).pipe(
      map(items => (Array.isArray(items) ? items : []).map(item => ({
        id: item.id || '',
        userId: item.user_id || item.userId || '',
        userName: item.user_name || item.userName || 'User',
        userColor: item.user_color || item.userColor || '',
        startTime: new Date(item.start_time || item.startTime),
        endTime: new Date(item.end_time || item.endTime),
        notes: item.notes || '',
        roasterType: item.roaster_type || '',
        status: item.status || '',
        entityType: item.entity_type || item.entityType || '',
        windowId: item.window_id || item.windowId || null
      })))
    );
  }

  createCalendar(endpoint: string, calendar: Omit<Calendar, 'id'>): Observable<Calendar> {
    const payload = {
      user_id: calendar.userId,
      entity_type: calendar.entityType || 'doctor',
      roaster_type: calendar.roasterType || 'available',
      start_time: calendar.startTime.toISOString(),
      end_time: calendar.endTime.toISOString(),
      notes: calendar.notes || '',
      status: calendar.status || 'available',
      roaster_config_id: (calendar as any).roasterConfigId || null,
      window_id: (calendar as any).windowId || null
    };
    return this.http.post<any>(`${this.apiBaseUrl}${endpoint}`, payload).pipe(
      map(item => this.mapRoaster(item))
    );
  }

  updateCalendar(endpoint: string, calendar: Calendar): Observable<Calendar> {
    const payload = {
      id: calendar.id,
      user_id: calendar.userId,
      entity_type: calendar.entityType || 'doctor',
      roaster_type: calendar.roasterType || 'available',
      start_time: calendar.startTime.toISOString(),
      end_time: calendar.endTime.toISOString(),
      notes: calendar.notes || '',
      status: calendar.status || 'available'
    };
    return this.http.put<any>(`${this.apiBaseUrl}${endpoint}/${calendar.id}`, payload).pipe(
      map(item => this.mapRoaster(item))
    );
  }

  deleteCalendar(endpoint: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}${endpoint}/${id}`);
  }

  private mapRoaster(item: any): Calendar {
    return {
      id: item.id || '',
      userId: item.user_id || item.userId || '',
      userName: item.user_name || item.userName || 'User',
      userColor: item.user_color || item.userColor || '',
      startTime: new Date(item.start_time || item.startTime),
      endTime: new Date(item.end_time || item.endTime),
      notes: item.notes || '',
      roasterType: item.roaster_type || item.roasterType || 'available',
      status: item.status || '',
      entityType: item.entity_type || item.entityType || '',
      windowId: item.window_id || item.windowId || null
    };
  }

  // ── RoasterConfig + Windows ───────────────────────────────────────────────

  getRoasterConfigs(userId?: string): Observable<any[]> {
    let url = `${this.apiBaseUrl}/roaster-configs`;
    if (userId) url += `?user_id=${userId}`;
    return this.http.get<any[]>(url).pipe(
      map(res => Array.isArray(res) ? res : (res as any)?.data || [])
    );
  }

  /** Create config with embedded windows array */
  createRoasterConfig(payload: RoasterConfigPayload): Observable<any> {
    const body = this.toBackendConfig(payload);
    return this.http.post<any>(`${this.apiBaseUrl}/roaster-configs`, body);
  }

  updateRoasterConfig(id: string, payload: Partial<RoasterConfigPayload>): Observable<any> {
    return this.http.put<any>(`${this.apiBaseUrl}/roaster-configs/${id}`, payload);
  }

  // Windows sub-resource
  getWindows(configId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBaseUrl}/roaster-configs/${configId}/windows`);
  }

  addWindow(configId: string, window: any): Observable<any> {
    return this.http.post<any>(`${this.apiBaseUrl}/roaster-configs/${configId}/windows`, window);
  }

  updateWindow(configId: string, windowId: string, window: any): Observable<any> {
    return this.http.put<any>(`${this.apiBaseUrl}/roaster-configs/${configId}/windows/${windowId}`, window);
  }

  deleteWindow(configId: string, windowId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/roaster-configs/${configId}/windows/${windowId}`);
  }

  /** Trigger server-side slot generation for a config */
  generateSlots(configId: string): Observable<any> {
    const tzOffset = new Date().getTimezoneOffset();
    return this.http.post<any>(`${this.apiBaseUrl}/roaster-configs/${configId}/generate-slots`, { timezone_offset: tzOffset });
  }

  getBookingParticipants(userId?: string): Observable<any[]> {
    let url = `${this.apiBaseUrl}/booking-participants`;
    if (userId) url += `?user_id=${userId}`;
    return this.http.get<any[]>(url);
  }

  getBookings(params?: any): Observable<any[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<any[]>(`${this.apiBaseUrl}/bookings`, { params: httpParams }).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        const response: any = res;
        if (response?.data && response.data[0] && Array.isArray(response.data[0].response)) {
          return response.data[0].response;
        }
        if (response?.data && Array.isArray(response.data)) {
          return response.data;
        }
        return [];
      })
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private toBackendConfig(p: RoasterConfigPayload): any {
    return {
      user_id: p.userId,
      availability_type: p.availabilityType,
      roaster_type: p.roasterType || 'available',
      freq: p.freq || null,
      interval_val: p.intervalVal || 1,
      byday: p.byDay || null,
      day_of_month: p.dayOfMonth || null,
      week_number: p.weekNumber || null,
      week_day: p.weekDay || null,
      start_date: p.startDate,
      end_date: p.endDate || null,
      occurrence_count: p.occurrenceCount || null,
      status: p.status || 'active',
      notes: p.notes || null,
      windows: (p.windows || []).map((w, i) => ({
        start_time: w.startTime,
        end_time: w.endTime,
        slot_duration: w.slotDuration,
        generate_slots: w.generateSlots,
        sequence_no: i + 1
      }))
    };
  }
}
