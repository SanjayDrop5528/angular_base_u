import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'compactNumber',
  standalone: true,
})
export class CompactNumberPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) {
      return '0';
    }

    return new Intl.NumberFormat('en', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
}