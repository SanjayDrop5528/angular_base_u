/**
 * HeaderSidenavLayoutComponent
 * Shell layout: Header shows top-level section names.
 * Sidenav shows children of the active section.
 */
import {
  Component, Input, Output, EventEmitter,
  OnInit, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutConfig, NavItem, NavSection } from '../../layout.types';
import { LayoutService } from '../../layout.service';
import { LayoutHeaderComponent } from '../layout-header/layout-header.component';
import { LayoutSidenavComponent } from '../layout-sidenav/layout-sidenav.component';

@Component({
  selector: 'app-header-sidenav-layout',
  standalone: true,
  imports: [CommonModule, LayoutHeaderComponent, LayoutSidenavComponent],
  template: `
    <div class="hs-layout-shell">
      <!-- Top header: sections as nav items -->
      <app-layout-header
        [config]="config"
        [user]="user"
        [org]="org"
        (sectionClick)="sectionClick.emit($event)"
        (navItemClick)="navItemClick.emit($event)"
        (profileClick)="profileClick.emit()"
        (logoClick)="logoClick.emit()">
        <ng-content select="[header-actions]"></ng-content>
      </app-layout-header>

      <!-- Body: sidenav (section children) + main content -->
      <div class="hs-layout-body">
        <app-layout-sidenav
          [config]="config"
          [user]="user"
          [org]="org"
          (navItemClick)="navItemClick.emit($event)"
          (logoClick)="logoClick.emit()">
        </app-layout-sidenav>

        <main class="hs-layout-content" role="main">
          <ng-content></ng-content>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .hs-layout-shell {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .hs-layout-body {
      display: flex;
      flex: 1;
      overflow: hidden;
      min-height: 0;
    }
    .hs-layout-content {
      flex: 1;
      padding: 2rem 2.5rem;
      overflow-y: auto;
      background: var(--bg-dark);
      min-width: 0;
    }
    @media (max-width: 1200px) {
      .hs-layout-content {
        padding: 1rem;
        /* sidenav is position:fixed on mobile — content takes full width */
        width: 100%;
        max-width: 100%;
      }
      /* Remove sidenav's flex contribution on mobile so it doesn't squeeze content */
      ::ng-deep app-layout-sidenav {
        position: static !important;
        width: 0 !important;
        min-width: 0 !important;
        flex: 0 0 0 !important;
        overflow: visible !important;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderSidenavLayoutComponent implements OnInit {
  @Input() config!: LayoutConfig;
  @Input() user: any = {};
  @Input() org: any = {};

  @Output() navItemClick = new EventEmitter<NavItem>();
  @Output() sectionClick = new EventEmitter<NavSection>();
  @Output() profileClick = new EventEmitter<void>();
  @Output() logoClick = new EventEmitter<void>();

  constructor(private layoutService: LayoutService) {}

  ngOnInit(): void {
    this.layoutService.setConfig(this.config);
  }
}
