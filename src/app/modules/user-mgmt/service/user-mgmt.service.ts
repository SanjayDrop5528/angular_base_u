import { Injectable } from '@angular/core';
import { BaseService } from '../../../core/services/base.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserMgmtService extends BaseService {

  // --- Users management ---

  getUsers(includeDeleted = false): Observable<any> {
    return this.post('/user/api/users', { include_deleted: includeDeleted });
  }

  getUsersForGrid(filter: any, sort: any, start: any, end: any, includeDeleted = false): Observable<any> {
    return this.post('/user/api/users', { filter, sort, start, end, include_deleted: includeDeleted });
  }

  createUser(body: any): Observable<any> {
    return this.post('/user/api/users/create', body);
  }

  resendInvite(userId: string): Observable<any> {
    return this.post('/user/api/users/invite/resend', { user_id: userId });
  }

  getUserDetail(userId: string): Observable<any> {
    return this.get(`/user/api/users/view/${userId}`);
  }

  deleteUser(userId: string): Observable<any> {
    return this.delete(`/user/api/users/delete/${userId}`);
  }

  // --- Sessions & IP Blocking ---

  getSessions(): Observable<any> {
    return this.get('/user/api/sessions');
  }

  deactivateSession(sessionId: string): Observable<any> {
    return this.post('/user/api/sessions/deactivate', { session_id: sessionId });
  }

  blockIP(ipAddress: string, reason: string): Observable<any> {
    return this.post('/user/api/sessions/block-ip', { ip_address: ipAddress, reason });
  }

  getBlockedIPs(): Observable<any> {
    return this.get('/user/api/sessions/blocked-ips');
  }

  unblockIP(id: string): Observable<any> {
    return this.post('/user/api/sessions/unblock-ip', { id });
  }




  // --- Custom Logging & Metrics ---

  logActivity(eventType: string, module: string, action: string, metadata: string): Observable<any> {
    const body = { event_type: eventType, module, action, metadata };
    return this.post('/user/api/activities/log', body);
  }

  getDashboardMetrics(): Observable<any> {
    return this.get('/user/api/dashboard/metrics');
  }

  // --- Notification Service APIs ---

  getNotificationAnalytics(): Observable<any> {
    return this.get('/notification/api/notifications/analytics');
  }

  triggerNotification(body: any): Observable<any> {
    return this.post('/entities/cases/notify', body);
  }

  getNotificationConfigs(): Observable<any> {
    return this.get('/notification/api/notifications/configs');
  }

  updateNotificationConfig(body: any): Observable<any> {
    return this.put('/notification/api/notifications/configs', body);
  }

  getMailbox(): Observable<any> {
    return this.get('/user/api/mailbox');
  }

  // --- Roles management ---

  getRoles(): Observable<any> {
    return this.get('/user/api/roles');
  }

  createRole(body: any): Observable<any> {
    return this.post('/user/api/roles', body);
  }

  updateRole(id: string, body: any): Observable<any> {
    return this.put(`/user/api/roles/${id}`, body);
  }

  deleteRole(id: string): Observable<any> {
    return this.delete(`/user/api/roles/${id}`);
  }

  getAffectedRoleUsers(id: string): Observable<any> {
    return this.get(`/user/api/roles/${id}/affected-users`);
  }

  toggleRoleStatus(id: string, active: boolean): Observable<any> {
    return this.put(`/user/api/roles/${id}/status`, { is_active: active });
  }

  // --- Admin-level User Actions ---

  adminResetPassword(userId: string): Observable<any> {
    return this.post(`/user/api/users/reset-password/${userId}`, {});
  }

  adminResetMfa(userId: string): Observable<any> {
    return this.post(`/user/api/users/reset-mfa/${userId}`, {});
  }

  adminToggleUserStatus(userId: string): Observable<any> {
    return this.post(`/user/api/users/toggle-status/${userId}`, {});
  }

  editUser(userId: string, body: any): Observable<any> {
    return this.put(`/user/api/users/update/${userId}`, body);
  }

  // --- Broadcast Notifications ---

  broadcastNotification(body: any): Observable<any> {
    return this.post('/notification/api/notifications/broadcast', body);
  }

  getNotificationHistory(page = 1, limit = 50): Observable<any> {
    return this.get(`/notification/api/notifications/history?page=${page}&limit=${limit}`);
  }

  markNotificationRead(id: string): Observable<any> {
    return this.put(`/notification/api/notifications/read/${id}`, {});
  }

  markAllNotificationsRead(): Observable<any> {
    return this.post('/notification/api/notifications/read-all', {});
  }

  // --- Storage Stats ---

  getStorageStats(): Observable<any> {
    return this.get('/storage/api/storage/stats');
  }

  // --- SSO Configuration ---

  getSsoConfig(): Observable<any> {
    return this.get('/user/api/sso/config');
  }

  updateSsoConfig(body: any): Observable<any> {
    return this.put('/user/api/sso/config', body);
  }

  // --- Organisation Onboarding ---

  onboardOrganisation(body: any): Observable<any> {
    return this.post('/user/api/organisations/onboard', body);
  }

  listOrganisations(): Observable<any> {
    return this.get('/user/api/organisations');
  }

  getScreens(): Observable<any> {
    return this.get('/user/api/screens');
  }

  getModules(): Observable<any> {
    return this.get('/user/api/modules');
  }

  getCurrentUserProfile(): Observable<any> {
    return this.get('/user/api/users/me');
  }

  getConnectedDevices(): Observable<any> {
    return this.get('/user/api/users/me/devices');
  }

  connectDevice(deviceName: string, deviceMode: string): Observable<any> {
    return this.post('/user/api/users/me/devices', { device_name: deviceName, device_mode: deviceMode });
  }

  blockDevice(id: string): Observable<any> {
    return this.post(`/user/api/users/me/devices/${id}/block`, {});
  }

  unblockDevice(id: string): Observable<any> {
    return this.post(`/user/api/users/me/devices/${id}/unblock`, {});
  }

  disconnectDevice(id: string): Observable<any> {
    return this.delete(`/user/api/users/me/devices/${id}`);
  }

  getNotificationPreferences(): Observable<any> {
    return this.get('/user/api/users/me/preferences');
  }

  updateNotificationPreferences(prefs: any): Observable<any> {
    return this.put('/user/api/users/me/preferences', prefs);
  }

  getUserCustomPermissions(userId: string): Observable<any> {
    return this.get(`/user/api/users/${userId}/custom-permissions`);
  }

  updateUserCustomPermissions(userId: string, customPermissions: any[]): Observable<any> {
    return this.put(`/user/api/users/${userId}/custom-permissions`, { custom_permissions: customPermissions });
  }

  changePassword(body: any): Observable<any> {
    return this.post('/user/api/auth/change-password', body);
  }
}
