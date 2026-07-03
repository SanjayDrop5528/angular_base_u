import { inject, Injectable } from '@angular/core';
import moment from 'moment';
import _ from 'lodash';
import { UtilsService } from './utils.service';
import { DataManipulatorService } from './data-manipulator-service.service';
import { expressionCheck, FilterCondition, FilterParamConfig } from '../../interfaces/filter-builder';
@Injectable({
  providedIn: 'root'
})
export class DynamicQueryBuilderService {

  private _utilsService = inject(UtilsService);
  private _dataManipulationService = inject(DataManipulatorService);

  /**
   * Converts a list of FilterCondition objects into a backend-compatible filter array.
   *
   * @param filterConditions - Array of filter condition definitions.
   * @param conditions - The array to which the resulting conditions will be pushed.
   * @param modelData - Optional model data to resolve dynamic values.
   *
   * 🔹 Example usage:
   * const modelData = { user_id: '123' };
   * const filterConditions = [{ "column": "project_id", "type": "string", "value": "{{parent_id}}" }]
   * makeFilterConditions(filterConditions, [], modelData);
   */
  makeFilterConditions(filterConditions: FilterCondition[], conditions: any[], modelData?: any): void {
    if (!Array.isArray(filterConditions)) return;
    filterConditions.forEach(condition => {
      if (!_.hasIn(condition, 'expression') || expressionCheck(modelData, _.get(condition, 'expression', ""))) {
        const value = this._resolveValue(condition, modelData);
        conditions.push({
          column: condition.column,
          operator: condition.operator ?? 'EQUALS',
          type: condition.type || 'string',
          value,
        });
      }
    });
  }

  /**
   * Generates dataset query parameters from filter conditions.
   *
   * @param filterConditions - Array of filter param definitions.
   * @param conditions - The array where parameter objects will be added.
   * @param modelData - Optional model data to resolve dynamic values.
   *
   * 🔹 Example:
   * makeDataSetQuery([{ parmasName: 'user_id', getdata: 'local', type: 'string' }], [], {});
   */
  makeDataSetQuery(filterConditions: FilterCondition[], conditions: any[], modelData?: any): void {
    if (!Array.isArray(filterConditions)) return;
    filterConditions.forEach(condition => {
      const value = this._resolveValue(condition, modelData, 'paramsvalue');
      conditions.push({
        parmasName: condition.parmasName,
        parmsDataType: condition.parmsDataType || 'string',
        paramsvalue: value,
      });
    });
  }

  /**
   * Resolves dynamic values using modelData, session/local storage, or utility service.
   * Supports expressions like `{{model.field}}`, date manipulations, parsing, etc.
   *
   * @param condition - FilterCondition object.
   * @param modelData - The data context used for dynamic resolution.
   * @param key - The field in condition to resolve (default: 'value').
   */
  private _resolveValue(condition: FilterCondition, modelData: any, key: string = 'value'): any {
    let value = _.get(condition, key);
    if (typeof value === 'string' && value.includes('{{')) {
      return this._utilsService.processText(value, modelData);
    }
    if (condition.type === 'date') {
      return moment().add(condition.addDays || 0, 'day').format(condition.format || 'yyyy-MM-DDT00:00:00.000Z');
    }
    if (condition.getdata === 'local') {
      value = sessionStorage.getItem(condition.field!);
    }
    if (condition.valueType === 'user_id') {
      value = sessionStorage.getItem('user_id');
    }
    if ((condition.valuetype || condition.valueType) === 'get') {
      value = this._utilsService.valueFinder(condition, modelData, key);
    }
    if (condition.parse && typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        console.warn('Failed to parse JSON:', value);
      }
    }
    return value;
  }

  /**
   * Builds the `filterQuery` array on a given controller using the config.
   * Also includes role-based filtering.
   *
   * @param ctrl - Controller or component instance.
   * @param configKey - Key in ctrl where config is stored (default: 'config').
   *
   * 🔹 Example:
   * buildMasterFilter(this, 'config');
   */
  public buildMasterFilter(ctrl: any, configKey = 'config', filterKey = 'filterconfig') {
    ctrl['filterQuery'] = [];
    if (!ctrl?.[configKey]) return;
    ctrl['role_type'] = this._utilsService.getRole?.();
    const baseFilter = this.getFilterQuery?.(_.get(ctrl, `${configKey}.${filterKey}`), this) ?? [];
    this.bindRoleBasedFilter?.(ctrl, configKey, baseFilter);
    if (!_.isEmpty(baseFilter)) {
      ctrl['filterQuery'] = baseFilter;
    }
  }

  /**
   * Builds a filter query from `defaultFilter` and `fixedFilter` config.
   *
   * @param config - Configuration object with filters.
   * @param model_data - Optional data model for dynamic binding.
     @JSON 	 
      "fixedFilter":[{ "column": "project_id", "type": "string", "value": "{{parent_id}}" }],
      "defaultFilter":[{ "column": "project_id", "type": "string", "value": "{{parent_id}}" }],
   * 🔹 Example:
   * getFilterQuery(config, { org_id: 123 });
   */
  public getFilterQuery(config: any, model_data?: any) {
    if (!config) return undefined;
    var conditions: any = [];
    this.makeFilterConditions(config.defaultFilter, conditions, model_data);
    this.makeFilterConditions(config.fixedFilter, conditions, model_data);
    if (conditions.length > 0)
      return [
        {
          clause: config.filtercondition || "AND",
          conditions: conditions,
        },
      ];
    return undefined;
  }
  /**
   * Dynamically builds `filterParams` on a given controller or component instance 
   * using a predefined configuration object.
   * 
   * This function reads a configuration object (usually stored in `ctrl.config`)
   * and populates the `filterParams` structure used for filtering data.
   * It can be extended to support conditional logic or expression-based filtering.
   *
   * @param ctrl - The controller or component instance on which the config exists.
   * @param configKey - The key on the controller that holds the configuration object (default: 'config').
   * @param filterParamsKey - The key within the configuration object that holds filter parameter definitions (default: 'filterParams').
   *
   * 🔹 Usage Example:
   * ```ts
   * buildFilterParams(this, 'config');
   * ```
   *
   * 🔹 Sample Config:
   * ```json
    {
      "filterParams": {
        "params": [
          {
            "columnName": "project_id",    
            "dataType": "string",          
            "valuekeyName": "project_id"   
          }
        ]
      }
    }
   * ```
   * 
   */

  public buildFilterParams(ctrl: any, configKey = 'config', filterParamsKey = 'filterParams') {
    const config = ctrl?.[configKey];
    if (!config?.[filterParamsKey]) return;
    const filterParamsConfig: any = config[filterParamsKey];
    if (!Array.isArray(config[filterParamsKey]['params'])) return;

    let filterParams = [];

    // Optional dynamic value injection
    if (config['addFieldConfig']) {
      this._dataManipulationService.processValues(ctrl, ctrl, config['addFieldConfig']);
    }


    // Conditional check using expression 
    if (!_.hasIn(filterParamsConfig, 'expression') || expressionCheck(ctrl, filterParamsConfig['expression'])) {
      // filterParams = filterParamsConfig['params'].map((filter: FilterParamConfig) => ({
      //     parmasName: filter['columnName'],
      //     parmsDataType: filter['dataType'],
      //     paramsValue: filter['defaultValue'] ?? _.get(ctrl, filter['valuekeyName'],filter['existValue'])
      //   })).filter((param:any) => !_.isEmpty(param?.['paramsValue']));
      filterParams = filterParamsConfig['params']
        .map((filter: FilterParamConfig) => {
          var value = _.get(ctrl, filter.valuekeyName);
          let paramsValue;
          if (!_.isNil(filter.defaultValue)) {
            paramsValue = filter.defaultValue;
          }
          else if (filter.stringReplace) {
            let hasValue = true;

            paramsValue = filter.stringReplace.replace(/{{(\w+)}}/g, (_match: any, field: any) => {
              const value = _.get(ctrl, field);
              if (value === undefined || value === null || value === '') {
                hasValue = false;
                return '';
              }
              return value !== undefined && value !== null
                ? JSON.stringify(value)
                : '';
            }
            );

            if (!hasValue) {
              paramsValue = '';
            } else {
              paramsValue = paramsValue
                .replace(/\$(\w+)/g, '"$$$1"')
                .replace(/\[(\w+)/g, '["$1"')
                .replace(/,(\w+)\]/g, ',"$1"]');

              paramsValue = JSON.parse(paramsValue);
            }
          }
          else if (!_.isNil(value)) {
            paramsValue = value;
          }
          if (_.isEmpty(paramsValue)) {
            paramsValue = filter.existValue;
          }

          return {
            parmasName: filter.columnName,
            parmsDataType: filter.dataType,
            paramsValue
          };
        })
        .filter((param: any) => !_.isEmpty(param?.paramsValue));

    }

    ctrl['filterParams'] = filterParams;
  }

  /**
   * Adds role-based filters to a filter query based on decoded token and config.
   *
   * @param ctrl - Component/controller.
   * @param configKey - Key to find config inside controller (default: 'config').
   * @param baseFilter - The filter array to append conditions into.
   *
   * 🔹 Example:
   * bindRoleBasedFilter(this, 'config', baseFilter);
   */
  bindRoleBasedFilter(ctrl: any, configKey: any = 'config', baseFilter: any[] = []) {
    const config = ctrl[configKey];
    const decodeToken: any = this._utilsService.getDecodeToken();
    const individualAccess: any = config?.individualAccess ?? false;

    if (individualAccess) {
      if (Array.isArray(individualAccess)) {
        const conditions = individualAccess.map((filter: any) => ({
          column: filter['columnName'],
          operator: filter?.['operator'] ?? "EQUALS",
          type: "string",
          value: decodeToken[filter['valuekeyName']],
        }));
        baseFilter.push({ clause: "AND", conditions });
      } else if (ctrl['role_type'] !== "SA" && expressionCheck(decodeToken, individualAccess['expression'])) {
        baseFilter.push({
          clause: "AND",
          conditions: [
            {
              column: individualAccess['columnName'],
              operator: individualAccess?.['operator'] ?? "EQUALS",
              type: "string",
              value: decodeToken[individualAccess['valuekeyName']],
            },
          ],
        });
      }
    }
  }

  /**
   * Processes complex filter structure with multiple grouped conditions.
   *
   * @param config - Configuration with a `filter` array.
   * @param model_data - Optional model for dynamic resolution.
   *
   * 🔹 Example:
   * const query = filterQuery({
   *   filter: [
   *     { clause: 'AND', conditions: [{ column: 'org_id', value: '123' }] }
   *   ]
   * }, { org_id: '123' });
   */
  public filterQuery(config: any, model_data?: any) {
    if (!config) return undefined;

    const filters: any = [];

    if (Array.isArray(config.filter)) {
      config.filter.forEach((indviFilter: any) => {
        const conditions: any = [];
        this.makeFilterConditions(
          indviFilter["conditions"],
          conditions,
          model_data
        );
        if (conditions.length > 0) {
          filters.push({
            clause: indviFilter["clause"] || "AND",
            conditions: conditions,
          });
        }
      });
    }

    return filters;
  }

}
