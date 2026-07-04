import { inject, Injectable } from '@angular/core';

import { FormGroup, FormControl, FormArray, Validators } from '@angular/forms';
import { BehaviorSubject, catchError, map, Observable, of, retry, Subject, take, tap } from 'rxjs';
import { DatePipe, PlatformLocation, } from '@angular/common';
import * as uuid from 'uuid';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';

import { DataService } from '../data.service';
import { HttpClient } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Router } from '@angular/router';
import * as _ from 'lodash';
import { FilterOperations, FormType, OperatorType } from '../../interfaces/filter-builder';
import { LoaderService } from './loader.services';

@Injectable({
  providedIn: 'root'
})

export class HelperService {

  isEditmode = true;
  public dataService = inject(DataService)

  constructor(
    public loc: PlatformLocation,
    public router: Router,
    private jwtService: JwtHelperService,
    private httpClient: HttpClient,
    private datepipe: DatePipe,) {

  }

  public isLoggedIn(): boolean {
    // check for token expiry, will fail for no token or invalid token
    const token = sessionStorage.getItem('token');
    console.log("isTokenExpired",);

    try {
      return token && !this.jwtService.isTokenExpired(token) && true || false;
    } catch (e) {
      return false;
    }
  }

  toggleButtonVisibility(value: any, id: any): void {
    const element = document.getElementById(id) as HTMLSpanElement | null;
    if (element) {
      element.style.visibility = value ? 'visible' : 'hidden';
    }
  }


  getDataValidation(controls: any, invalidLabels: string = ''): any {
    for (const key in controls) {
      if (controls.hasOwnProperty(key)) {
        const control = controls[key];

        if (control instanceof FormGroup) {
          const label = this.getDataValidation(control?.controls)
          if (label != "") {
            invalidLabels += label + ",";
          }
        } else if (control instanceof FormControl && control?.status === 'INVALID') {
          if (controls[key]?._fields && controls[key]._fields[0]?.props?.label) {
            invalidLabels += controls[key]._fields[0].props.label + ",";
          }
        } else if (control instanceof FormArray && control.status === 'INVALID') {
          if (controls[key]?._fields && controls[key]._fields[0]?.props?.label) {
            invalidLabels += controls[key]._fields[0].props.label + ",";
          }
        }
      }
      // console.log(invalidLabels);
    }

    var value = invalidLabels.substring(0, invalidLabels.length - 1);
    return value;

  }

  ControlFormControl(formGroup: FormGroup, name: string, _delete: boolean = true, type?: FormType, required: boolean = false, defaultValue: any = null, pattern?: string) {
    if (_delete) {
      if (formGroup.contains(name)) formGroup.removeControl(name)
      console.warn("THE " + name + "Is Deleted", formGroup);
      return
    }

    if (type == 'Control') {
      formGroup.addControl(name, new FormControl())
    } else if (type == 'Array') {
      formGroup.addControl(name, new FormArray([]))

    } else if (type == 'Group') {
      formGroup.addControl(name, new FormGroup({}))
    }

    if (required) {
      formGroup.get(name)?.addValidators([Validators.required])
    }

    if (defaultValue != null) {
      formGroup.get(name)?.setValue(defaultValue)
    }

    console.warn("THE " + name, "VALUE" + formGroup.get(name)?.value);

  }
  public getToken() {
    return sessionStorage.getItem('token') ?? false
  }

  // ? BehaviorSubject / Subject 

  // ? Drag and drop Link for form design 
  public list = new BehaviorSubject<string[]>([]);


  private sideNav: BehaviorSubject<any> = new BehaviorSubject<any>(true);
  setSideNav(data: any) {
    this.sideNav.next(data);
  }
  getSideNavObservable(): Observable<any> {
    return this.sideNav.asObservable();
  }



  loaderService = inject(LoaderService)
  setLoader(data: any = false) {
    this.loaderService.setLoader(data);
  }

  getloader(): Observable<any> {
    return this.loaderService.getloader();
  }

  profilePhoto: Subject<string> = new Subject<string>();
  setProfilePhoto(data: any) {
    this.profilePhoto.next(data);
  }
  getProfilePhotoObservable(): Observable<any> {
    return this.profilePhoto.asObservable();
  }
  generateRandomId(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomValues = new Uint32Array(length);
    (window.crypto || (window as any).msCrypto).getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += chars.charAt(randomValues[i] % chars.length);
    }
    return result;
  }

  private sanitizer = inject(DomSanitizer);

  public bypassSecurityTrustResourceUrl(url: string, allowedPrefixes: string[] = []): SafeResourceUrl {
    if (!url) return this.sanitizer.bypassSecurityTrustResourceUrl('');
    const prefixes = [
      'assets/svgs/',
      'data:text/html;charset=utf-8,',
      'https://docs.google.com/gview',
      'http://localhost',
      'https://localhost',
      ...allowedPrefixes
    ];
    const isAllowed = prefixes.some(prefix => url.startsWith(prefix));
    if (isAllowed) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    console.warn(`Centralized sanitizer blocked resource URL: ${url}`);
    return this.sanitizer.bypassSecurityTrustResourceUrl('');
  }

  public bypassSecurityTrustHtml(html: string): SafeHtml {
    if (!html) return '';
    const clean = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\bon\w+\s*=\s*(['"][^'"]*['"]|[^\s>]*)/gi, '')
      .replace(/\b(href|src)\s*=\s*['"]\s*(javascript|data)\s*:[^'"]*['"]/gi, '');
    return this.sanitizer.bypassSecurityTrustHtml(clean);
  }
}
