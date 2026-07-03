/**
 * HeaderLayoutComponent
 * Shell layout: Top header only (no sidenav).
 * Supports both mega-menu and normal-menu header types.
 */
import {
  Component, Input, Output, EventEmitter,
  OnInit, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutConfig, NavItem } from '../../layout.types';
import { LayoutService } from '../../layout.service';
import { LayoutHeaderComponent } from '../layout-header/layout-header.component';

@Component({
  selector: 'app-header-layout',
  standalone: true,
  imports: [CommonModule, LayoutHeaderComponent],
  template: `
    <div class="header-layout-shell">
      <app-layout-header
        [config]="config"
        [user]="user"
        [org]="org"
        (navItemClick)="navItemClick.emit($event)"
        (profileClick)="profileClick.emit()"
        (logoClick)="logoClick.emit()">
        <!-- Pass through projected header actions -->
        <ng-content select="[header-actions]"></ng-content>
      </app-layout-header>

      <main class="header-layout-content" role="main">
        <ng-content></ng-content>
      </main>
    </div>
  `,
  styles: [`
    .header-layout-shell {
      display: flex;
      flex-direction: column;
      max-height: 100vh;
      overflow: hidden;
    }
    .header-layout-content {
      flex: 1;
      padding: 1rem 1.5rem;
      overflow-y: auto;
      background: var(--bg-dark);
    }
    @media (max-width: 1200px) {
      .header-layout-content {
        padding: 0.5rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderLayoutComponent implements OnInit {
  @Input() config!: LayoutConfig;
  @Input() user: any = {};
  @Input() org: any = {};

  @Output() navItemClick = new EventEmitter<NavItem>();
  @Output() profileClick = new EventEmitter<void>();
  @Output() logoClick = new EventEmitter<void>();

  constructor(private layoutService: LayoutService) { }

  ngOnInit(): void {
    this.layoutService.setConfig(this.config);
  }
}
