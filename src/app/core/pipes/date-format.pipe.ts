import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateFormat'
})
export class DateFormatPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]) {
    if(value &&typeof value =="string"){
      if(isNaN(Date.parse(value))){
        return value
      }else{
        return new Date(value).toLocaleDateString('en-IN',{hour:"numeric",minute:"numeric",second:"numeric"})
      }
    }else{
      return value
    }
  }

}
