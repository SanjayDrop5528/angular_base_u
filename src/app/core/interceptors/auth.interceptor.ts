import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, filter, take, switchMap } from 'rxjs/operators';
import { throwError, of, BehaviorSubject, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { JwtHelperService } from '@auth0/angular-jwt';
import { DialogService } from '../services/dialog.service';
import { EncryptionService } from '../services/encryption/encryption.service';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<any>(null);

function isTokenExpired(token: string, jwtHelper: JwtHelperService, bufferSeconds = 10): boolean {
  console.log('[Auth Interceptor] Checking token expiry...');
  try {
    const expired = jwtHelper.isTokenExpired(token, bufferSeconds);
    console.log('[Auth Interceptor] Token expired check result:', expired);
    return expired;
  } catch (e) {
    console.error('[Auth Interceptor] Error parsing token expiry:', e);
    return false; // Safely fall back if parsing fails
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const snackbar = inject(DialogService);
  const router = inject(Router);
  const encryption = inject(EncryptionService);
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);
  const jwtHelper = inject(JwtHelperService);

  const isBrowser = isPlatformBrowser(platformId);
  const token = isBrowser ? (sessionStorage.getItem('token') || localStorage.getItem('auth_token')) : null;

  console.log('[Auth Interceptor] Intercepted request:', req.url, 'method:', req.method, 'hasToken:', !!token);

  const shouldSkip = [
    'assets/',
  ].some(url => req.url.includes(url));

  if (shouldSkip) {
    console.log('[Auth Interceptor] Skipping request (asset/public):', req.url);
    return next(req);
  }

  const isRefreshRequest = req.url.includes('/api/auth/refresh');
  const method = req.method.toUpperCase();
  const isReadOnlyMethod = ['GET', 'HEAD', 'OPTIONS'].includes(method);
  const decryptionNotRequired = req.params.get('eNR') === 'true';

  const encryptionEnabled =
    environment.encryptRequired && !decryptionNotRequired && !req.url.includes('assets/');

  // Helper to prepare, set auth header, and encrypt request payload if needed
  const prepareRequest = (request: typeof req, authToken?: string) => {
    let headers = request.headers;
    const activeToken = authToken || token;
    if (activeToken) {
      headers = headers.set('Authorization', `Bearer ${activeToken}`);
    }

    let cloned = request.clone({ headers });

    try {
      if (encryptionEnabled) {
        cloned = cloned.clone({
          responseType: 'arraybuffer' as 'json'
        });
      }

      if (
        encryptionEnabled &&
        !isReadOnlyMethod &&
        request.body &&
        !(request.body instanceof FormData)
      ) {
        cloned = cloned.clone({
          body: encryption.encrypt(request.body)
        });
      }
    } catch (err) {
      console.error('[Auth Interceptor] Payload encryption failed:', err);
      snackbar.openSnackBar('Encryption Failed!', 'OK');
      throw err;
    }
    return cloned;
  };

  const processResponse = (event: any) => {
    // ── Populate Event and Channel Dropdowns in Template Config ───────────
    // ── Populate Group and Role Dropdowns in Members Config ───────────
    if (
      encryptionEnabled &&
      event instanceof HttpResponse &&
      event.body instanceof ArrayBuffer &&
      event.body.byteLength > 32
    ) {
      try {
        return event.clone({
          body: encryption.decrypt(event.body)
        });
      } catch (err) {
        console.error('[Auth Interceptor] Response decryption failed:', err);
        snackbar.openSnackBar('Decryption Failed!', 'OK');
      }
    }

    return event;
  };

  const handleRequest = (clonedReq: typeof req): Observable<any> => {
    console.log('[Auth Interceptor] handleRequest forwarding:', clonedReq.url);
    return next(clonedReq).pipe(
      map(processResponse),
      catchError((error: HttpErrorResponse) => {
        console.error('[Auth Interceptor] Request failed:', clonedReq.url, 'status:', error.status, 'error:', error.message);
        const err: any = { ...error };

        if (
          encryptionEnabled &&
          error.error instanceof ArrayBuffer
        ) {
          try {
            if (error.error.byteLength > 32) {
              err.error = encryption.decrypt(error.error);
            } else {
              err.error = new TextDecoder().decode(error.error);
            }
          } catch (e) {
            console.warn('[Auth Interceptor] Encrypted error decryption failed, attempting plain text decode', e);
            try {
              err.error = new TextDecoder().decode(error.error);
            } catch (decodeErr) {
              console.error('[Auth Interceptor] Failed to decode error buffer as UTF-8', decodeErr);
            }
          }
        }

        if (err.status === 403) {
          console.error('[Auth Interceptor] Forbidden access (403). Logging out.');
          snackbar.openSnackBar('Access Denied!', 'OK');
          // authService.logout();
          // router.navigate(['/iam/login']);
          return throwError(() => err);
        }

        const isAuthError = err.status === 401;
        const isRetry = clonedReq.headers.has('X-Retry-Count');

        if (isAuthError && !isRefreshRequest && !isRetry && authService.isLoggedIn()) {
          console.warn('[Auth Interceptor] Auth error caught. Initiating refresh flow.');
          if (!isRefreshing) {
            isRefreshing = true;
            refreshTokenSubject.next(null);

            return authService.refreshToken().pipe(
              switchMap((res: any) => {
                isRefreshing = false;
                if (res && res.token) {
                  console.log('[Auth Interceptor] Refresh successful on auth error retry.');
                  refreshTokenSubject.next(res.token);
                  const retryReq = prepareRequest(req, res.token);
                  const markedReq = retryReq.clone({ headers: retryReq.headers.set('X-Retry-Count', '1') });
                  return handleRequest(markedReq);
                } else {
                  console.error('[Auth Interceptor] Refresh returned no token on retry. Logging out.');
                  authService.logout();
                  router.navigate(['/iam/login']);
                  return throwError(() => err);
                }
              }),
              catchError((refreshErr) => {
                console.error('[Auth Interceptor] Refresh failed with error on retry. Logging out.', refreshErr);
                isRefreshing = false;
                authService.logout();
                router.navigate(['/iam/login']);
                return throwError(() => refreshErr);
              })
            );
          } else {
            console.log('[Auth Interceptor] Refresh already in progress. Queuing request retry:', req.url);
            return refreshTokenSubject.pipe(
              filter(newToken => newToken != null),
              take(1),
              switchMap((newToken) => {
                console.log('[Auth Interceptor] Retrying queued request with new token:', req.url);
                const retryReq = prepareRequest(req, newToken);
                const markedReq = retryReq.clone({ headers: retryReq.headers.set('X-Retry-Count', '1') });
                return handleRequest(markedReq);
              })
            );
          }
        } else if (isAuthError && (isRetry || !authService.isLoggedIn())) {
          console.error('[Auth Interceptor] Auth error on retry or user not logged in. Logging out.');
          authService.logout();
          router.navigate(['/iam/login']);
        }

        let msg = err?.error?.error_msg || err?.error?.message || err?.error?.error || err?.error || 'Something went wrong!';
        if (typeof msg !== 'string') {
          try {
            msg = JSON.stringify(msg) || 'Something went wrong!';
          } catch (e) {
            msg = 'Something went wrong!';
          }
        }

        if (msg && msg.includes('interface {} is nil')) {
          msg =
            'Invalid data received. Please check your input and try again.';
        }

        if (msg === 'Password expired. Please reset your password') {
          localStorage.clear();
          sessionStorage.clear();
          router.navigate(['/iam/login']);
          return throwError(() => err.error);
        }

        switch (err.status) {
          case 400:
          case 404:
          case 410:
          case 500:
            snackbar.openSnackBar(msg, 'OK');
            break;

          case 401:
          case 403:
            snackbar.openSnackBar('Session Expired or Access Denied!', 'OK');
            break;
        }

        return throwError(() => err);
      })
    );
  };

  // Pre-emptive refresh flow
  if (token && !isRefreshRequest && isTokenExpired(token, jwtHelper)) {
    console.warn('[Auth Interceptor] Token is expired or about to expire. Triggering pre-emptive refresh.');
    if (!isRefreshing) {
      isRefreshing = true;
      refreshTokenSubject.next(null);

      return authService.refreshToken().pipe(
        switchMap((res: any) => {
          isRefreshing = false;
          if (res && res.token) {
            console.log('[Auth Interceptor] Pre-emptive refresh successful!');
            refreshTokenSubject.next(res.token);
            const retryReq = prepareRequest(req, res.token);
            const markedReq = retryReq.clone({ headers: retryReq.headers.set('X-Retry-Count', '1') });
            return handleRequest(markedReq);
          } else {
            console.error('[Auth Interceptor] Pre-emptive refresh returned no token. Logging out.');
            authService.logout();
            router.navigate(['/iam/login']);
            return throwError(() => new Error('Session Expired'));
          }
        }),
        catchError((refreshErr) => {
          console.error('[Auth Interceptor] Pre-emptive refresh failed with error. Logging out.', refreshErr);
          isRefreshing = false;
          authService.logout();
          router.navigate(['/iam/login']);
          return throwError(() => refreshErr);
        })
      );
    } else {
      console.log('[Auth Interceptor] Pre-emptive refresh already in progress. Queuing request:', req.url);
      return refreshTokenSubject.pipe(
        filter(newToken => newToken != null),
        take(1),
        switchMap((newToken) => {
          console.log('[Auth Interceptor] Retrying queued request with new token:', req.url);
          const retryReq = prepareRequest(req, newToken);
          const markedReq = retryReq.clone({ headers: retryReq.headers.set('X-Retry-Count', '1') });
          return handleRequest(markedReq);
        })
      );
    }
  }

  // Normal flow
  const initialReq = prepareRequest(req);
  return handleRequest(initialReq);
};
