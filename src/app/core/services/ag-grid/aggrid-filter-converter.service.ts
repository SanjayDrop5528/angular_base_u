import { Injectable } from '@angular/core';
import _ from 'lodash';
import moment from 'moment';

@Injectable({
  providedIn: 'root',
})
export class AggridFilterConverterService {
  constructor() { }

  async makeFiltersConditions(input: any, deafultReturn: boolean = false): Promise<any> {
    return new Promise((resolve) => {
      const result: any = {
        start: input.start,
        end: input.end,
        filter: [],
        sort: input.sort,
      };
      if (deafultReturn) return result
      const overallFilter: any[] = [];

      if (!_.isEmpty(input.filter)) {
        for (let column in input.filter) {
          const filter = input.filter[column];
          const conditions: any[] = [];

          const clause = filter.operator || 'AND';

          const processEntry = (entry: any, columnName: string) => {
            if (entry.filterType === 'set') {
              entry.filterType = 'string';
              entry.type = 'IN';
            }

            const operator = entry.type?.toUpperCase() || 'EQUALS';
            const isRange = entry.type === 'inRange';
            let col = columnName;
            // Process dynamic column from [val, key, true]
            if (_.get(entry, 'values[0][2]') === true) {
              col = entry.values[0][1];
              entry.filter = entry.values.map((v: any) => v[0]);
            } else {
              entry.filter = entry.values ?? entry.filter;
            }

            if (entry.filterType === 'date') {
              if (isRange) {
                return {
                  column: col,
                  operator,
                  type: entry.filterType,
                  value: [
                    moment(entry.dateFrom).format('yyyy-MM-DDT00:00:00.000Z'),
                    moment(entry.dateTo).format('yyyy-MM-DDT00:00:00.000Z'),
                  ],
                };
              } else {
                return {
                  column: col,
                  operator,
                  type: entry.filterType,
                  value: moment(entry.dateFrom).format('yyyy-MM-DDT00:00:00.000Z'),
                };
              }
            } else {
              return {
                column: col,
                operator,
                type: entry.filterType,
                value: isRange ? [entry.filter, entry.filterTo] : entry.filter,
              };
            }
          };

          if (_.isArray(filter.conditions) && filter.conditions.length) {
            filter.conditions.forEach((entry: any) => {
              const processed = processEntry(entry, column);
              if (processed) conditions.push(processed);
            });
          } else {
            const processed = processEntry(filter, column);
            if (processed) conditions.push(processed);
          }

          overallFilter.push({ clause, conditions });
        }

        result.filter = overallFilter;
      }

      resolve(result);
    });
  }
}
