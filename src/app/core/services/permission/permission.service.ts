import { inject, Injectable } from '@angular/core';
import _ from 'lodash';
import moment from 'moment';
import { UtilsService } from '../utils/utils.service';
import { AuthService } from '../auth.service';
import { expressionCheck } from '../../interfaces/filter-builder';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  utilsService = inject(UtilsService);
  private authService = inject(AuthService);

  /**
  * ACL config supports either a simple string role check or an object with
  * { module, submodule, action } for permission-based checks.
  *
  * config = {
  *   ACL: [
  *     { module: 'user-management-module', submodule: 'all-users', action: 'list' }
  *   ],
  *   ACL-CLAUSE: 'OR'  // optional: "AND" (default) or "OR"
  * }
  */
  isvisible(config: any): boolean {
    if (!config?.ACL) {
      return true;
    }

    const acl: any[] = config.ACL;
    const clause: string = (config['ACL-CLAUSE'] || 'AND').toUpperCase();

    const results = acl.map((rule: any) => {
      if (typeof rule === 'string') {
        // Legacy string check — skip (no role-name support anymore)
        return true;
      }
      if (rule.module && rule.submodule && rule.action) {
        return this.authService.hasPermission(rule.module, rule.submodule, rule.action);
      }
      return true;
    });

    return clause === 'OR'
      ? results.some(r => r)
      : results.every(r => r);
  }

  isvisibility(config: any, rowData: any): boolean {
    if ((!config?.key || !config?.value) && !config?.expression && !config?.permission && !config?.checkType) {
      return true;
    }
    let value: boolean = true;
    // ? LIKE FORMLY Expression
    // "expression": "(model.date.startDate !== null && model.date.startDate !== undefined && model.date.endDate !== null && model.date.endDate !== undefined)",
    // function expressionCheck(model: any, expressions: string) {
    //   try {
    //     return eval(expressions);
    //   } catch (error) {
    //     console.error('Invalid expression:', expressions, error);
    //     return false;
    //   }
    // }

    if (config?.expression && value) {
      let data = expressionCheck(rowData, config.expression)
      if (data == false) {
        return false
      }
      value = data;
    }

    //      "operator": "equal",  //? equal / notequal
    // 			"key": "type", //? String
    // 			"value": "List"  //? String || Array
    if (config.key && config.value && value) {
      let keyvalue = _.get(rowData, config.key)
      if (_.isUndefined(keyvalue) || _.isNull(keyvalue) || _.isEmpty(keyvalue)) {
        return false
      }

      const values = typeof rowData[config.key] === 'string' ? rowData[config.key].toLowerCase() : rowData[config.key];
      const operator = config.operator.toLowerCase();
      const isArray = Array.isArray(config.value);

      if (isArray) {
        if (operator === 'equal') {
          value = config.value.some((val: any) => {
            return typeof val === 'string' ? val.toLowerCase() === values : val === values;
          });
        } else if (operator === 'notequal') {
          value = !config.value.some((val: any) => {
            return typeof val === 'string' ? val.toLowerCase() === values : val === values;
          });
        }
      } else {
        if (typeof config.value === 'string') {
          if (operator === 'equal') {
            value = config.value.toLowerCase() === values;
          } else if (operator === 'notequal') {
            value = config.value.toLowerCase() !== values;
          }
        } else {
          if (operator === 'equal') {
            value = config.value === values;
          } else if (operator === 'notequal') {
            value = config.value !== values;
          }
        }
      }

    }

    if (config?.checkType === 'date' && value && rowData && rowData?.[config?.dateTimeKey]) {
      const { valueType, patchValue = false, operator, dateTimeKey, setTimer = false, unitOfTime } = config;
      let checkValue = moment(); // Default to current date/time
      if (valueType === "days" && patchValue) {
        checkValue = moment().add(patchValue, "days");
      } else if (valueType === "endTime" && patchValue && _.hasIn(rowData, patchValue)) {
        checkValue = moment(_.get(rowData, patchValue));
      }
      if (setTimer) {
        if (setTimer === "startOf") {
          checkValue = moment().startOf(unitOfTime);
        } else if (setTimer === "endTime") {
          checkValue = moment().endOf(unitOfTime);
        }
      }
      const dataTime = moment(rowData[dateTimeKey]);
      const result = this.utilsService.dateChecker(operator, checkValue, dataTime);
      value = config?.["useReversal"] ? !result : result;
    }

    return value;
  }

  checkVisibility(config: any, rowData: any) {
    let value: boolean = true;
    this.utilsService.bindAllSession(rowData)


    if (config?.expression && value) {
      let data = expressionCheck(rowData, config.expression);
      if (data == false || data == undefined) {
        return false;
      }
      value = data;
    }

    if (config?.key && config?.value && value) {
      let keyvalue = _.get(rowData, config.key);
      if (_.isUndefined(keyvalue) || _.isNull(keyvalue) || _.isEmpty(keyvalue)) {
        return false;
      }

      const values = typeof rowData[config.key] === 'string' ? rowData[config.key].toLowerCase() : rowData[config.key];
      const operator = config.operator.toLowerCase();
      const isArray = Array.isArray(config.value);

      if (isArray) {
        if (operator === 'equal') {
          value = config.value.some((val: any) => {
            return typeof val === 'string' ? val.toLowerCase() === values : val === values;
          });
        } else if (operator === 'notequal') {
          value = !config.value.some((val: any) => {
            return typeof val === 'string' ? val.toLowerCase() === values : val === values;
          });
        }
      } else {
        if (typeof config.value === 'string') {
          if (operator === 'equal') {
            value = config.value.toLowerCase() === values;
          } else if (operator === 'notequal') {
            value = config.value.toLowerCase() !== values;
          }
        } else {
          if (operator === 'equal') {
            value = config.value === values;
          } else if (operator === 'notequal') {
            value = config.value !== values;
          }
        }
      }
      if (!value) {
        return false;
      }
    }

    if (config?.checktype == 'date' && value) {
      if (config?.operator == "in_between") {
        let start_time = moment(rowData[config.start_time])
        // let start_time = moment(rowData[config.start_time]).subtract(10, 'minutes');
        let end_time = rowData[config.end_time];
        value = (moment().isSameOrAfter(start_time) && moment().isSameOrBefore(end_time));
      }
      if (config?.operator == "isSameAfter") {
        // let data_time = moment(rowData[config.date_time]).subtract(15,'minutes');
        let data_time = moment(rowData[config.date_time]);
        value = moment().isSameOrAfter(data_time);
      }
    }

    return value;
  }

}
