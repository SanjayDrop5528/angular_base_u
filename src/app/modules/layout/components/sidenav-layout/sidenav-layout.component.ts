/**
 * SidenavLayoutComponent
 * Shell layout: Left sidenav only (no top header).
 */
import {
  Component, Input, Output, EventEmitter,
  OnInit, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutConfig, NavItem } from '../../layout.types';
import { LayoutService } from '../../layout.service';
import { LayoutSidenavComponent } from '../layout-sidenav/layout-sidenav.component';

@Component({
  selector: 'app-sidenav-layout',
  standalone: true,
  imports: [CommonModule, LayoutSidenavComponent],
  template: `
    <div class="sidenav-layout-shell">
      <app-layout-sidenav
        [config]="config"
        [user]="user"
        [org]="org"
        (navItemClick)="navItemClick.emit($event)"
        (logoClick)="logoClick.emit()">
      </app-layout-sidenav>

      <div class="sidenav-layout-body">
        <!-- Optional mini topbar for mobile hamburger -->
        <header class="mobile-topbar">
          <button class="hamburger-btn" (click)="layoutService.toggleMobileDrawer()" aria-label="Open menu">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <span class="mobile-app-name">{{ config.appName || org?.name }}</span>
          <ng-content select="[topbar-actions]"></ng-content>
        </header>

        <main class="sidenav-layout-content" role="main">
          <ng-content></ng-content>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .sidenav-layout-shell {
      display: flex;
      min-height: 100vh;
    }
    .sidenav-layout-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .mobile-topbar {
      display: none;
      align-items: center;
      gap: 0.75rem;
      height: 56px;
      padding: 0 1rem;
      background: var(--bg-card);
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 150;
    }
    .hamburger-btn {
      background: none;
      border: none;
      color: var(--text-main);
      cursor: pointer;
      padding: 0.3rem;
      border-radius: 6px;
      display: flex;
      align-items: center;
      transition: background 0.2s;
      &:hover { background: rgba(255,255,255,0.06); }
    }
    .mobile-app-name {
      font-weight: 700;
      color: var(--text-main);
      font-size: 1rem;
    }
    .sidenav-layout-content {
      flex: 1;
      padding: 2rem 2.5rem;
      overflow-y: auto;
      background: var(--bg-dark);
    }
    @media (max-width: 1200px) {
      .mobile-topbar { display: flex; }
      .sidenav-layout-content { padding: 1rem; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidenavLayoutComponent implements OnInit {
  @Input() config!: LayoutConfig;
  @Input() user: any = {};
  @Input() org: any = {};

  @Output() navItemClick = new EventEmitter<NavItem>();
  @Output() logoClick = new EventEmitter<void>();

  constructor(public layoutService: LayoutService) {}

  ngOnInit(): void {
    this.layoutService.setConfig(this.config);
  }
}
