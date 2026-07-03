import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule } from '@ngx-translate/core';
import { NavItem } from '../../layout.types';

@Component({
  selector: 'app-nav-dropdown-item',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatMenuModule, MatDividerModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <!-- Trigger button -->
    <button class="nav-btn" [class.active]="isActive"
            [matMenuTriggerFor]="dropMenu"
            #menuTrigger="matMenuTrigger"
            (mouseenter)="openMenu()"
            (mouseleave)="closeMenu()">
      <mat-icon *ngIf="item.icon" class="nav-icon">{{ item.icon }}</mat-icon>
      <span>{{ item.label | translate }}</span>
      <mat-icon class="chevron">expand_more</mat-icon>
    </button>

    <!-- Each component instance owns its own #dropMenu — no collision -->
    <mat-menu #dropMenu="matMenu" panelClass="layout-dropdown-menu">
      <div (mouseenter)="cancelClose()" (mouseleave)="closeMenu()" style="display: flex; flex-direction: column;">
        <ng-container *ngFor="let child of item.children">
          <button mat-menu-item
                  [class.active-item]="activeNavId === child.id"
                  (click)="itemClick.emit(child)">
            <mat-icon *ngIf="child.icon">{{ child.icon }}</mat-icon>
            <span>{{ child.label | translate }}</span>
          </button>
          <mat-divider *ngIf="child.dividerAfter"></mat-divider>
        </ng-container>
      </div>
    </mat-menu>
  `,
  styles: [`
    :host { display: contents; }

    .nav-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.5rem 0.85rem;
      border: none;
      background: var(--meagmenu-parent-bg-color, transparent);
      color: var(--header-font-color, var(--meagmenu-parent-font-color, #666));
      font-family: var(--font-family, inherit);
      font-size: 0.88rem;
      font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
      white-space: nowrap;
      user-select: none;
      transition: color 0.18s, background 0.18s;
    }
    .nav-btn:hover { background: var(--hover-bg, rgba(0,0,0,0.05)); }
    .nav-btn.active {
      background: var(--meagmenu-active-bg, rgba(26,115,232,0.1));
      color: var(--meagmenu-parent-active-font-color, #1a73e8);
      font-weight: 600;
    }
    .nav-icon { font-size: 1.05rem; width: 1.05rem; height: 1.05rem;
      color: var(--header-icon-color, currentColor); }
    .chevron  { font-size: 1rem; width: 1rem; height: 1rem; opacity: 0.65; }
    .active-item { font-weight: 600; }
  `]
})
export class NavDropdownItemComponent implements OnDestroy {
  @Input() item!: NavItem;
  @Input() activeNavId: string | null = null;
  @Input() isActive = false;
  @Output() itemClick = new EventEmitter<NavItem>();

  @ViewChild(MatMenuTrigger) trigger!: MatMenuTrigger;
  private timeoutId: any;

  openMenu(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.trigger.openMenu();
  }

  closeMenu(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      this.trigger.closeMenu();
    }, 150);
  }

  cancelClose(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}
