export type GroupByType = 'DayWise ' | 'WeekWise ' | 'MonthWise ' | 'YearWise ' | '';

import { Injectable } from '@angular/core';
import _ from 'lodash';
import moment from 'moment';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class FilterService {
  filter: Record<string, any> = {};        // { columnName: value }
  defaultfilter: Record<string, any> = {}; // { columnName: value }

  private $filterPayload = new BehaviorSubject<Record<string, any>>({});
  private $resetFilters = new BehaviorSubject<boolean>(false);


  private $paramsChange = new BehaviorSubject<Record<string, any>>({});


  /**
   * Set or update a filter value.
   * @param columnName Name of the column
   * @param value Filter value
   * @param isDefault Whether this should be saved as a default filter
   */
  configureFilter(columnName: string, value: any, isDefault: boolean = false) {
    if (!columnName) {
      console.error("Missing columnName in filter config");
      return;
    }
    this.filter[columnName] = value;
    if (isDefault) {
      this.defaultfilter[columnName] = value;
    }
  }

  /**
   * Remove a specific filter
   */
  removeFilter(columnName: string) {
    delete this.filter[columnName];
    this.emitFilterPayload();
  }

  /**
   * Clear all filters
   */
  clearAllFilters() {
    this.filter = {};
    this.emitFilterPayload();
  }

  /**
   * Reset filters to their default values
   */
  resetToDefaultFilters() {
    this.filter = { ...this.defaultfilter };
    this.emitFilterPayload();
    this.setResetFilter(true);
  }

  /**
   * Get observable of current filters
   */
  getFilterPayload() {
    return this.$filterPayload.asObservable();
  }

  /**
   * Emit current filters to subscribers
   */
  emitFilterPayload() {
    console.log("Emit Filter Payload", this.filter);
    this.$filterPayload.next({ ...this.filter });
  }

  /**
   * Flag for telling UI to react to a reset
   */
  setResetFilter(val: boolean) {
    this.$resetFilters.next(val);
  }

  getResetFilter() {
    return this.$resetFilters.asObservable();
  }




  buildFilterConfig(ctrl: any, configKey = 'filterconfig') {
    ctrl['filterQuery'] = []
    if (!ctrl?.[configKey]) return;
    var config = ctrl?.[configKey]
    var baseConditons: any = []
    this.makeFilterConditions(config, baseConditons, ctrl)
    if (!_.isEmpty(baseConditons)) {
      ctrl['filterQuery'] = [
        {
          clause: "AND",
          conditions: baseConditons
        },
      ];
    }
  }


  makeFilterConditions(filterConditions: any, conditions: any, model_data?: any) {
    if (filterConditions && filterConditions.length) {
      filterConditions.forEach((c: any) => {
        const value = _.get(model_data, c['fetchValueKey'], c['defaultValue']);
        if (c["fetchValueKey"] && (!_.isEmpty(value) || value === true || value === false)) {
          const val = c["operator"].toLowerCase() == "in" ? _.isArray(value) ? value : [value] : value;
          conditions.push({
            column: c["columnName"],
            operator: c["operator"],
            type: c["dataType"] || "string",
            value: val
          });
        }
      });
    }
  }

  dateformater(data: any) {
    return moment(data).local().format("DD MMM YYYY");
  }

  /**
   * Returns grouping convention for dashboard
   */
  getGroupConvention(startDate: any, endDate: any): GroupByType {
    if (!startDate || !endDate) {
      return '';
    }
    const diffInDays = moment(endDate).diff(moment(startDate), 'days');
    const start_date: any = this.dateformater(startDate);
    if (diffInDays <= 30) {
      return "";
    } else if (diffInDays > 30 && diffInDays <= 90) {
      return 'WeekWise ';
    } else if (diffInDays > 90 && diffInDays <= 360) {
      return 'MonthWise ';
    } else {
      return 'YearWise ';
    }
  }


  /*
    This method is used to get the params from the parent component and Filter Component If they Lisen 
  */
  getPramsFromParent(params: any = {}, queryParam: any = {}) {

    this.$paramsChange.next({ params, queryParam })
  }
  getParamsListener() {
    return this.$paramsChange.asObservable()
  }
}
