import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { DataService } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private dataService = inject(DataService);
  private settings$ = new BehaviorSubject<any>(null);

  getSettings(): Observable<any> {
    return this.settings$.asObservable();
  }

  loadSettings(): Observable<any> {
    return this.dataService.getDataByFilter('system_settings', { start: 0, end: 1 }).pipe(
      map((res: any) => {
        const list = res?.data?.[0]?.response || [];
        const config = list[0] || null;
        this.settings$.next(config);
        return config;
      })
    );
  }

  saveSettings(id: string, data: any): Observable<any> {
    return this.dataService.update('system_settings', id, data).pipe(
      tap(() => {
        this.loadSettings().subscribe();
      })
    );
  }
}
