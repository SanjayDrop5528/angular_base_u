import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencySymbol',
  standalone: true
})
export class CurrencySymbolPipe implements PipeTransform {

  transform(currencyCode: string): string {
    if (!currencyCode) return '';

    try {
      return (0).toLocaleString('en', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).replace(/[0-9.,\s]/g, '').trim();
    } catch {
      return currencyCode;
    }
  }
}