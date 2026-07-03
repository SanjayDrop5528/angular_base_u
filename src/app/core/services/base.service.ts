import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BaseService {
  // Points to API Gateway (routes handle mapping: /user/api, /notification/api, /storage/api)
  protected baseUrl = environment.apiBaseUrl;

  constructor(protected http: HttpClient) { }

  protected getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  post(url: string, body: any, options: any = {}): Observable<any> {
    const headers = options.headers || this.getHeaders();
    return this.http.post(`${this.baseUrl}${url}`, body, { ...options, headers });
  }

  get(url: string, options: any = {}): Observable<any> {
    const headers = options.headers || this.getHeaders();
    return this.http.get(`${this.baseUrl}${url}`, { ...options, headers });
  }

  put(url: string, body: any, options: any = {}): Observable<any> {
    const headers = options.headers || this.getHeaders();
    return this.http.put(`${this.baseUrl}${url}`, body, { ...options, headers });
  }

  delete(url: string, options: any = {}): Observable<any> {
    const headers = options.headers || this.getHeaders();
    return this.http.delete(`${this.baseUrl}${url}`, { ...options, headers });
  }

  update(url: string, body: any, options: any = {}): Observable<any> {
    // Map UPDATE to PATCH (or PUT based on endpoint requirements)
    const headers = options.headers || this.getHeaders();
    return this.http.patch(`${this.baseUrl}${url}`, body, { ...options, headers });
  }
}
