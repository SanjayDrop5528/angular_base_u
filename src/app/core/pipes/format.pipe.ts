import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'format'
})
export class FormatPipe implements PipeTransform {

  transform(value: string, ...args: unknown[]): unknown {
    if(value){
      let result=value.replace(/([A-Z])/g," $1");
      return result.charAt(0).toUpperCase() +result.slice(1)
    }
    return null;
  }

}
