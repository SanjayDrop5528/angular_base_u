import { Directive, Input, HostListener } from '@angular/core';
import { UserMgmtService } from '../../modules/user-mgmt/service/user-mgmt.service';

@Directive({
  selector: '[appLogActivity]',
  standalone: true
})
export class LogActivityDirective {
  @Input('appLogActivity') actionName = '';
  @Input() pageName = '';

  constructor(private apiService: UserMgmtService) {}

  @HostListener('click', ['$event'])
  onClick(event: Event) {
    const action = this.actionName || 'click_action';
    const page = this.pageName || 'unspecified_page';
    const timestamp = new Date().toISOString();
    
    this.apiService.logActivity('click', page, action, `User clicked element: ${action} on page ${page} [time: ${timestamp}]`).subscribe({
      next: () => {},
      error: (err) => console.error('Failed to log user activity:', err)
    });
  }
}
