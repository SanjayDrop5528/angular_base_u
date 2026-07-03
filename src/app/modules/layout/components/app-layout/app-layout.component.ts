/**
 * AppLayoutComponent — Smart layout switcher
 *
 * Usage:
 *   <app-layout [config]="myConfig" [user]="user" [org]="org"
 *               (navItemClick)="onNav($event)">
 *     <page-content></page-content>
 *   </app-layout>
 *
 * config.mode controls which shell is rendered:
 *   'header-only'     → HeaderLayoutComponent   (mega-menu or normal-menu)
 *   'sidenav-only'    → SidenavLayoutComponent
 *   'header-sidenav'  → HeaderSidenavLayoutComponent
 */
import {
  Component, Input, Output, EventEmitter,
  OnInit, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutConfig, NavItem, NavSection } from '../../layout.types';
import { LayoutService } from '../../layout.service';
import { HeaderLayoutComponent } from '../header-layout/header-layout.component';
import { SidenavLayoutComponent } from '../sidenav-layout/sidenav-layout.component';
import { HeaderSidenavLayoutComponent } from '../header-sidenav-layout/header-sidenav-layout.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    HeaderLayoutComponent,
    SidenavLayoutComponent,
    HeaderSidenavLayoutComponent
  ],
  template: `
    <!-- Header Only (mega or normal) -->
    <app-header-layout
      *ngIf="config.mode === 'header-only' || config.mode === 'simple-header'"
      [config]="config"
      [user]="user"
      [org]="org"
      (navItemClick)="navItemClick.emit($event)"
      (profileClick)="profileClick.emit()"
      (logoClick)="logoClick.emit()">
      <ng-container *ngTemplateOutlet="contentTemplate"></ng-container>
    </app-header-layout>

    <!-- Header + Sidenav -->
    <app-header-sidenav-layout
      *ngIf="config.mode === 'header-sidenav'"
      [config]="config"
      [user]="user"
      [org]="org"
      (navItemClick)="navItemClick.emit($event)"
      (sectionClick)="sectionClick.emit($event)"
      (profileClick)="profileClick.emit()"
      (logoClick)="logoClick.emit()">
      <ng-container *ngTemplateOutlet="contentTemplate"></ng-container>
    </app-header-sidenav-layout>

    <!-- Sidenav Only -->
    <app-sidenav-layout
      *ngIf="config.mode === 'sidenav-only'"
      [config]="config"
      [user]="user"
      [org]="org"
      (navItemClick)="navItemClick.emit($event)"
      (logoClick)="logoClick.emit()">
      <ng-container *ngTemplateOutlet="contentTemplate"></ng-container>
    </app-sidenav-layout>

    <ng-template #contentTemplate>
      <ng-content></ng-content>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppLayoutComponent implements OnInit {
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
