import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'globaldatepipe'
})
export class GlobaldatePipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]) {
    if (value && typeof value == "string") {
      if (isNaN(Date.parse(value))) {
        if (value.length === 8) {
          let date  = value.toString()
          return date.slice(2,4) + '/' + date.slice(0,2) + '/' + date.slice(4)
        }
        return value
      } else {
        let date = new Date(value),
          month = '' + (date.getMonth() + 1),
          day = '' + date.getDate(),
          year = '' + date.getFullYear(),
          time = new Date(value).toLocaleTimeString('en-US')

        if (month.length < 2) {
          month = '0' + month
        }

        if (day.length < 2) {
          day = '0' + day
        }

        let joinDate = [day, month, year].join('/')

        return [joinDate, time].join(' ')
      }
    } else {
      return value
    }
  }

}
