// Angular and utility imports
import { inject, Injectable, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { JwtHelperService } from '@auth0/angular-jwt';
import _ from 'lodash';
import moment from 'moment';

// Injectable service available throughout the app
@Injectable({
  providedIn: 'root'
})
export class UtilsService {
  // Injecting JWT helper service
  private _jwtService = inject(JwtHelperService);

  /**
   * Replace template variables (e.g., {{fieldName}}) with actual values from the control object
   */
  templateProcessor(ctrl: any, template: string) {
    return template.replace(/{{([\w.]+)}}/g, (_match: any, field: any) => {
      let value: any = _.get(ctrl, field) || undefined;
      return value !== undefined && value !== null ? value : "";
    });
  }
  /**
   * Process text with embedded variable references (e.g., "Hello, {{name}}!") and return the formatted string.
   *
   * @param template - The text template containing {{variable}} placeholders.
   * @param data - The data object containing values to substitute for the placeholders.
   * @returns The formatted string with all placeholders replaced by their corresponding values.
   * 
   * @example
   * const template = "User {{user.firstName}} {{user.lastName}} ({{user.id}})";
   * const data = { user: { firstName: "John", lastName: "Doe", id: 123 } };
   * const result = this.processText(template, data); // "User John Doe (123)"
   * 
   * @remarks
   * - Replaces all occurrences of {{path}} with values from the data object.
   * - Supports nested properties using dot notation (e.g., {{user.address.city}}).
   * - If a placeholder value is not found, it will be replaced with an empty string.
   * - If the template is not a string or doesn't contain {{}} placeholders, it's returned as-is.
   */
  public processText(template: string, data: any): string {
    if (typeof template !== 'string' || !template.includes('{{')) {
      return template;
    }
    return template.replace(/{{([\w.]+)}}/g, (_match: string, path: string) => {
      const value = _.get(data, path);
      if (value !== undefined && value !== null) return String(value);
      const fallback = this.getDataByPath(data, path);
      return fallback !== undefined && fallback !== null ? String(fallback) : '';
    }).trim();
  }



  public getDataByPath(data: any, path: string): any {
    if (!path) return data;
    if (path.startsWith("'")) return path.replace(/'/g, '');
    return path.split('.').reduce((acc, part) => acc?.[part], data);
  }

  /**
   * Validate an image link: return false if invalid or empty
   */
  validateImageLink(link: string | null | undefined): string | false {
    if (!link || typeof link !== 'string' || !link.trim()) return false;

    const trimmed = link.trim();
    if (trimmed.startsWith('https')) {
      return link;
    }
    return "";
  }

  /**
   * Return date value based on predefined keywords (like today, yesterday, etc.)
   */
  public findDefaultValue(value: any) {
    if (value == "today") return moment()
    if (value == "todayStart") return moment().startOf('day')
    if (value == "todayEnd") return moment().endOf('day')
    if (value == "yesterday") return moment().subtract(1, 'day')
    if (value == "tomorrow") return moment().add(1, 'day')
    return value
  }

  /**
   * Toggle visibility of a button by DOM ID
   */
  public toggleButtonVisibility(value: any, id: any): void {
    const element = document.getElementById(id) as HTMLSpanElement | null;
    if (element) {
      element.style.visibility = value ? 'visible' : 'hidden';
    }
  }

  /**
   * Check date logic based on various operators like isAfter, isWeekend, etc.
   */
  public dateChecker = (operator: string, checkValue: moment.Moment, dateTime: moment.Moment): boolean => {
    if (!checkValue.isValid() || !dateTime.isValid()) {
      console.warn("Invalid date provided");
      return false;
    }

    switch (operator) {
      case "isSameAfter":
        return checkValue.isSameOrAfter(dateTime);
      case "isSameBefore":
        return checkValue.isSameOrBefore(dateTime);
      case "isBefore":
        return checkValue.isBefore(dateTime);
      case "isAfter":
        return checkValue.isAfter(dateTime);
      case "isSame":
        return checkValue.isSame(dateTime);
      case "isWeekend":
        const day = checkValue.day();
        return day === 0 || day === 6;
      case "isWeekday":
        const weekday = checkValue.day();
        return weekday >= 1 && weekday <= 5;
      default:
        console.warn("Invalid operator provided:", operator);
        return false;
    }
  };


  /**
   * Bind all key-values from sessionStorage and localStorage to a given data object
   */
  public bindAllSession(data: any) {
    const sessionFields = Object.keys(sessionStorage);
    sessionFields.forEach(key => {
      if (data) {
        const value: any = sessionStorage.getItem(key);
        try {
          data[key] = JSON.parse(value);
        } catch (e) {
          data[key] = value;
        }
      }
    });
    const localFields = Object.keys(localStorage);
    localFields.forEach(key => {
      if (data) {
        const value: any = localStorage.getItem(key);
        try {
          data[key] = JSON.parse(value);
        } catch (e) {
          data[key] = value;
        }
      }
    });
  }

  valueFinder(parameter: any, model_data: any, checkKey: any) {
    let compressData = _.cloneDeep(model_data);
    this.bindAllSession(compressData);
    return _.get(compressData, parameter?.[checkKey]) || "";
  }

  /**
   * Get a stored value (parsed if possible) from local or session storage
   */
  public getStoredValue(key: any, storageType: any) {
    if (typeof storageType === "object" && storageType !== null && !Array.isArray(storageType)) {
      return this.getStoredString(storageType, key);
    }

    let data = storageType === 'local' ? localStorage.getItem(key) : sessionStorage.getItem(key);
    if (data) {
      try {
        return typeof data === "string" && (data.startsWith("{") || data.startsWith("["))
          ? JSON.parse(data)
          : data;
      } catch (error) {
        console.error("Invalid JSON format:", error);
        return data;
      }
    }
    return null;
  };

  /**
   * Get a string value from custom storage config object
   */
  public getStoredString(storageType: any, key: any): string | null {
    if (typeof storageType === "object" && storageType !== null && !Array.isArray(storageType)) {
      const raw = storageType?.type === localStorage ? localStorage.getItem(key) : sessionStorage.getItem(key);
      if (typeof raw === "string") {
        try {
          let parsed: any;
          if (storageType?.parse) {
            parsed = JSON.parse(raw);
          } else {
            return parsed;
          }
          if (Array.isArray(parsed) && typeof parsed[0] === "string") {
            return parsed[0];
          }
        } catch (e) {
          return raw;
        }
      }
    }
    return null;
  }

  /**
   * Recursively validate form controls and return comma-separated string of invalid field labels
   */
  public getDataValidations(controls: any, invalidLabels: string = ''): any {
    for (const key in controls) {
      if (controls.hasOwnProperty(key)) {
        const control = controls[key];

        if (control instanceof FormGroup) {
          const label = this.getDataValidations(control?.controls);
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
    }

    var value = invalidLabels.substring(0, invalidLabels.length - 1);
    return value;
  }

  //#region  Take Data From User Token
  public getUserId() {
    let value: any = this.getDecodeToken()
    return value['id']
  }

  public getName() {
    const auth: any = sessionStorage.getItem('auth');

    // Parse the data (assuming it's in JSON format)
    let name = '';
    try {
      const parsedAuth = JSON.parse(auth);
      name = parsedAuth?.data?.LoginResponse?.name || 'L';
    } catch (error) {
      console.error('Error parsing sessionStorage data:', error);
    }
    return name
  }
  /**
   * Decode the stored JWT token and return its payload
   */
  public getDecodeToken() {
    let token: any = this._getToken?.();
    let values: any = this._jwtService?.decodeToken?.(token);
    return values;
  }
  /**
   * Retrieve token from sessionStorage
   */
  private _getToken() {
    return sessionStorage.getItem('token') ?? false;
  }

  /**
   * Check whether the current user is logged in (based on token validity)
   */
  public isLoggedIn(): boolean {
    const token = sessionStorage.getItem('token');
    try {
      return token && !this._jwtService.isTokenExpired(token) && true || false;
    } catch (e) {
      return false;
    }
  }

  public getRole() {
    return sessionStorage.getItem("role")
  }
  //#endregion

  public localPaginateAndFilter(data: any[], filter: any, sort: any, start: number, end: number): any {
    let result = [...data];

    // 1. Filter
    if (filter && Array.isArray(filter) && filter.length > 0) {
      result = result.filter(item => {
        return filter.every(clause => {
          const condResults = clause.conditions.map((cond: any) => {
            const fieldVal = _.get(item, cond.column);
            const filterVal = cond.value;
            if (fieldVal === undefined || fieldVal === null) return false;

            switch (cond.operator) {
              case 'EQUALS':
                return String(fieldVal).toLowerCase() === String(filterVal).toLowerCase();
              case 'NOTEQUAL':
                return String(fieldVal).toLowerCase() !== String(filterVal).toLowerCase();
              case 'CONTAINS':
                return String(fieldVal).toLowerCase().includes(String(filterVal).toLowerCase());
              case 'NOTCONTAINS':
                return !String(fieldVal).toLowerCase().includes(String(filterVal).toLowerCase());
              case 'STARTSWITH':
                return String(fieldVal).toLowerCase().startsWith(String(filterVal).toLowerCase());
              case 'ENDSWITH':
                return String(fieldVal).toLowerCase().endsWith(String(filterVal).toLowerCase());
              case 'IN':
                if (Array.isArray(filterVal)) {
                  return filterVal.map(v => String(v).toLowerCase()).includes(String(fieldVal).toLowerCase());
                }
                return String(filterVal).toLowerCase().includes(String(fieldVal).toLowerCase());
              default:
                return true;
            }
          });

          if (clause.clause === 'OR') {
            return condResults.some((r: any) => r);
          } else {
            return condResults.every((r: any) => r);
          }
        });
      });
    }

    // 2. Sort
    if (sort && Array.isArray(sort) && sort.length > 0) {
      result.sort((a, b) => {
        for (const s of sort) {
          const valA = _.get(a, s.colId);
          const valB = _.get(b, s.colId);
          if (valA === valB) continue;
          const comp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
          return s.sort === 'desc' ? -comp : comp;
        }
        return 0;
      });
    }

    // 3. Paginate
    const total = result.length;
    const paginated = result.slice(start, end);

    return {
      data: [
        {
          response: paginated,
          pagination: [
            {
              totalDocs: total
            }
          ]
        }
      ]
    };
  }
}
