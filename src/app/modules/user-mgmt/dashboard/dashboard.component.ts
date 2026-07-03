import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { fromEvent, Subscription } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { UserMgmtService } from '../service/user-mgmt.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslateService } from '@ngx-translate/core';

// Child components import
import { UsersComponent } from '../users/users.component';
import { SessionsComponent } from '../sessions/sessions.component';
import { SettingsComponent } from '../settings/settings.component';
import { DashboardHomeComponent } from './dashboard-home.component';
import { NotificationsComponent } from '../../notifications/notifications.component';
import { StorageSettingsComponent } from '../../storage/components/storage-settings.component';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    UsersComponent,
    SessionsComponent,
    SettingsComponent,
    DashboardHomeComponent,
    NotificationsComponent,
    StorageSettingsComponent,
    SharedModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  activeTab = 'dashboard';
  user: any = {};
  org: any = {};
  mails: any[] = [];
  showMailbox = false;
  isSidebarOpen = false;
  private mailboxInterval: any;

  constructor(
    private authService: AuthService,
    private apiService: UserMgmtService,
    private router: Router,
    private translateService: TranslateService
  ) { }

  private clickSub!: Subscription;
  private hoverSub!: Subscription;

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/iam/login']);
      return;
    }

    this.user = this.authService.getCurrentUser() || {};
    this.org = this.authService.getCurrentOrg() || {};

    // Watch for dynamic updates to tenant organization
    this.authService.currentOrg$.subscribe(org => {
      if (org) this.org = org;
    });

    // Sync current user on session updates
    this.authService.currentUser$.subscribe(user => {
      if (user) this.user = user;
    });

    this.fetchMails();

    // Poll for mock mailbox outbox updates (for ease of developer testing)
    this.mailboxInterval = setInterval(() => {
      this.fetchMails();
    }, 4000);

    // Throttled global click listener (3 seconds)
    this.clickSub = fromEvent(document, 'click')
      .pipe(throttleTime(3000))
      .subscribe((event: any) => {
        const target = event.target;
        if (target) {
          const text = target.innerText?.trim().slice(0, 30) || target.id || target.tagName;
          this.apiService.logActivity('click', this.activeTab, 'click_element', `Clicked element: ${text}`).subscribe();
        }
      });

    // Throttled global hover listener (10 seconds)
    this.hoverSub = fromEvent(document, 'mouseover')
      .pipe(throttleTime(10000))
      .subscribe((event: any) => {
        const target = event.target;
        if (target && (target.closest('.group-card') || target.closest('.user-card') || target.closest('.metric-card') || target.closest('.nav-item'))) {
          const container = target.closest('.group-card') || target.closest('.user-card') || target.closest('.metric-card') || target.closest('.nav-item');
          const text = container.innerText?.trim().split('\n')[0].slice(0, 30) || 'element';
          this.apiService.logActivity('hover', this.activeTab, 'hover_element', `Hovered: ${text}`).subscribe();
        }
      });
  }

  ngOnDestroy(): void {
    if (this.mailboxInterval) {
      clearInterval(this.mailboxInterval);
    }
    if (this.clickSub) this.clickSub.unsubscribe();
    if (this.hoverSub) this.hoverSub.unsubscribe();
  }

  t(key: string): string {
    return this.translateService.instant(key);
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  navigate(tab: string): void {
    let allowed = true;
    let module = 'user-management-module';
    let submodule = '';
    let action = 'list';

    if (tab === 'users') {
      submodule = 'all-users';
    } else if (tab === 'groups') {
      submodule = 'user-groups';
    } else if (tab === 'sessions') {
      submodule = 'all-users';
    } else if (tab === 'organisation') {
      submodule = 'user-profile';
      action = 'create';
    } else if (tab === 'notifications') {
      module = 'notification-module';
      submodule = 'notification-center';
    } else if (tab === 'storage') {
      submodule = '';
    }

    if (submodule) {
      allowed = this.authService.hasPermission(module, submodule, action);
    }

    if (allowed) {
      this.activeTab = tab;
      this.isSidebarOpen = false;
      this.apiService.logActivity('navigate', submodule || 'dashboard', 'view', `Navigated to ${tab} tab`).subscribe();
    } else {
      this.activeTab = 'unauthorized';
      this.isSidebarOpen = false;
      this.apiService.logActivity('unauthorized_access', submodule, 'view', `Attempted unauthorized navigation to ${tab} screen`).subscribe();
    }
  }

  toggleMailbox(): void {
    this.showMailbox = !this.showMailbox;
    if (this.showMailbox) {
      this.fetchMails();
    }
  }

  fetchMails(): void {
    this.apiService.getMailbox().subscribe({
      next: (res) => {
        this.mails = res || [];
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/iam/login']);
  }
}
