import { inject, Pipe, PipeTransform } from '@angular/core';
import { HelperService } from '../services/utils/helper.service';

@Pipe({
    name: 'safeHtml'
})
export class SafeHtmlPipe implements PipeTransform {
    private helperService = inject(HelperService);

    transform(value: any) {
        if (!value) return '';
        return this.helperService.bypassSecurityTrustHtml(value);
    }
}
