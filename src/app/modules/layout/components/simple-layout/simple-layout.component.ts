import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { AppLayoutComponent } from '../app-layout/app-layout.component';
import { LayoutConfig } from '../../layout.types';
import { AuthService } from '../../../../core/services/auth.service';
import { LayoutService } from '../../layout.service';

@Component({
  selector: 'app-simple-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AppLayoutComponent],
  template: `
    <ng-container *ngIf="isIframe; else normalLayout">
      <router-outlet></router-outlet>
    </ng-container>
    <ng-template #normalLayout>
      <app-layout
        *ngIf="layoutConfig"
        [config]="layoutConfig"
        [user]="user"
        [org]="org"
        (profileClick)="onLogout()">
        <router-outlet></router-outlet>
      </app-layout>
    </ng-template>
  `
})
export class SimpleLayoutComponent implements OnInit {
  layoutConfig?: LayoutConfig;
  user: any = {};
  org: any = {};
  isIframe = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private layoutService: LayoutService
  ) {}

  ngOnInit(): void {
    try {
      this.isIframe = window.self !== window.top || window.location.search.includes('new=true');
    } catch (e) {
      this.isIframe = true;
    }

    const currentUser = this.authService.getCurrentUser();
    this.user = currentUser ? {
      name: currentUser.name || currentUser.email || 'User',
      email: currentUser.email
    } : {};

    const currentOrg = this.authService.getCurrentOrg();
    this.org = currentOrg ? {
      name: currentOrg.name,
      logoUrl: currentOrg.logoUrl || ''
    } : { name: 'SynapseMD' };

    this.layoutConfig = {
      mode: 'simple-header',
      showLogo: false,
      appName: this.org.name,
      headerHeight: 64,
      navItems: [],
      navSections: []
    };
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/iam/login']);
  }
}
