import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../auth.service';
import { InAppNotificationService } from './in-app-notification.service';

@Injectable({
  providedIn: 'root'
})
export class FcmService {
  private messaging: any;
  private isListening = false;
  private isServiceWorkerMessageListening = false;
  private serviceWorkerRegistration?: ServiceWorkerRegistration;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private authService: AuthService,
    private inAppNotificationService: InAppNotificationService
  ) {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const app = initializeApp(environment.firebaseConfig);
        this.messaging = getMessaging(app);
        this.attachDebugHelpers();
      } catch (e) {
        console.error('Failed to initialize Firebase Messaging', e);
      }
    }
  }

  requestPermission(): void {
    if (!isPlatformBrowser(this.platformId) || !this.messaging) return;

    if (!this.authService.isLoggedIn()) return;

    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications.');
      return;
    }

    Notification.requestPermission().then((permission) => {
      console.log('[FCM] Notification permission:', permission);
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        this.getAndSaveToken();
      } else {
        console.warn('Unable to get permission to notify.', permission);
      }
    });
  }

  private async getAndSaveToken(): Promise<void> {
    if (!this.messaging) return;

    const tokenOptions: any = {};
    const serviceWorkerRegistration = await this.getServiceWorkerRegistration();
    if (serviceWorkerRegistration) {
      tokenOptions.serviceWorkerRegistration = serviceWorkerRegistration;
    }
    if (environment.firebaseVapidKey) {
      tokenOptions.vapidKey = environment.firebaseVapidKey;
    }

    getToken(this.messaging, tokenOptions)
      .then((currentToken) => {
        if (currentToken) {
          console.log('FCM Token received:', currentToken);
          console.log('[FCM] Token suffix:', currentToken.slice(-8));
          this.saveTokenToBackend(currentToken);
        } else {
          console.warn('No registration token available. Request permission to generate one.');
        }
      })
      .catch((err) => {
        console.error('An error occurred while retrieving token. ', err);
      });
  }

  private async getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | undefined> {
    if (this.serviceWorkerRegistration) {
      return this.serviceWorkerRegistration;
    }
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers are not supported in this browser.');
      return undefined;
    }

    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        updateViaCache: 'none'
      });
      await this.serviceWorkerRegistration.update();
      await navigator.serviceWorker.ready;
      console.log('[FCM] Firebase messaging service worker ready:', this.serviceWorkerRegistration.active?.scriptURL);
      return this.serviceWorkerRegistration;
    } catch (err) {
      console.error('Failed to register Firebase messaging service worker', err);
      return undefined;
    }
  }

  private saveTokenToBackend(token: string): void {
    const url = `${environment.apiBaseUrl}/user/api/users/fcm-token`;
    this.http.post(url, { fcm_token: token }).subscribe({
      next: () => console.log('FCM Token successfully saved to backend'),
      error: (err) => console.error('Failed to save FCM Token to backend', err)
    });
  }

  listenForMessages(): void {
    if (!isPlatformBrowser(this.platformId) || !this.messaging) return;
    if (this.isListening) return;
    this.isListening = true;
    this.listenForServiceWorkerMessages();

    onMessage(this.messaging, (payload) => {
      console.log('[FCM][FOREGROUND_RECEIVED]', payload);
      this.showForegroundNotification(payload);
      this.inAppNotificationService.pushFromFcm(payload, true);
    });
  }

  private listenForServiceWorkerMessages(): void {
    if (this.isServiceWorkerMessageListening || !('serviceWorker' in navigator)) return;
    this.isServiceWorkerMessageListening = true;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'FCM_BACKGROUND_RECEIVED') {
        const payload = event.data.payload;
        console.log('[FCM][BACKGROUND_RECEIVED]', payload);
        this.inAppNotificationService.pushFromFcm(payload, true);
      }
    });
  }

  private async showForegroundNotification(payload: any): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || Notification.permission !== 'granted') return;

    const notification = payload?.notification || {};
    const data = payload?.data || {};
    const title = notification.title || data.title || 'Notification';
    const body = notification.body || data.body || data.message || '';
    const targetUrl = data.route || data.path || data.url || '/user-mgmt/notifications';

    try {
      const registration = await this.getServiceWorkerRegistration();
      if (registration?.showNotification) {
        await registration.showNotification(title, {
          body,
          icon: notification.icon || '/favicon.ico',
          data: { url: targetUrl }
        });
        console.log('[FCM] Foreground browser notification shown:', { title, body, targetUrl });
        return;
      }
    } catch (err) {
      console.error('Failed to show foreground notification via service worker', err);
    }

    new Notification(title, {
      body,
      icon: notification.icon || '/favicon.ico',
      data: { url: targetUrl }
    });
    console.log('[FCM] Foreground browser notification shown with Notification API:', { title, body, targetUrl });
  }

  private attachDebugHelpers(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    (window as any).fcmDebug = {
      permission: () => Notification.permission,
      registrations: async () => {
        if (!('serviceWorker' in navigator)) return [];
        const registrations = await navigator.serviceWorker.getRegistrations();
        return registrations.map(registration => ({
          scope: registration.scope,
          active: registration.active?.scriptURL,
          waiting: registration.waiting?.scriptURL,
          installing: registration.installing?.scriptURL
        }));
      },
      showLocal: async () => {
        if (!('Notification' in window)) {
          console.warn('[FCM][DEBUG] Notification API is not available');
          return 'Notification API is not available';
        }

        if (Notification.permission !== 'granted') {
          const permission = await Notification.requestPermission();
          console.log('[FCM][DEBUG] Permission after request:', permission);
          if (permission !== 'granted') return permission;
        }

        const registration = await this.getServiceWorkerRegistration();
        await registration?.showNotification('FCM local browser test', {
          body: 'If this appears, browser notifications are working.',
          icon: '/favicon.ico',
          data: { url: '/user-mgmt/notifications' }
        });
        console.log('[FCM][DEBUG] Local notification requested');
        return 'shown';
      }
    };

    console.log('[FCM][DEBUG] Helpers ready: fcmDebug.permission(), fcmDebug.registrations(), fcmDebug.showLocal()');
  }
}
