/**
 * LayoutModule — Public barrel
 *
 * Import this module (or individual components) to use the layout system.
 * All components are standalone; this NgModule just re-exports them
 * as a convenience bundle.
 */
import { NgModule } from '@angular/core';

import { AppLayoutComponent }            from './components/app-layout/app-layout.component';
import { HeaderLayoutComponent }         from './components/header-layout/header-layout.component';
import { SidenavLayoutComponent }        from './components/sidenav-layout/sidenav-layout.component';
import { HeaderSidenavLayoutComponent }  from './components/header-sidenav-layout/header-sidenav-layout.component';
import { LayoutHeaderComponent }         from './components/layout-header/layout-header.component';
import { LayoutSidenavComponent }        from './components/layout-sidenav/layout-sidenav.component';
import { SimpleLayoutComponent }         from './components/simple-layout/simple-layout.component';

const LAYOUT_COMPONENTS = [
  AppLayoutComponent,
  HeaderLayoutComponent,
  SidenavLayoutComponent,
  HeaderSidenavLayoutComponent,
  LayoutHeaderComponent,
  LayoutSidenavComponent,
  SimpleLayoutComponent,
];

@NgModule({
  imports: LAYOUT_COMPONENTS,
  exports: LAYOUT_COMPONENTS,
})
export class LayoutModule {}

// Re-export types for convenience
export * from './layout.types';
export * from './layout.service';
export { AppLayoutComponent };
export { HeaderLayoutComponent };
export { SidenavLayoutComponent };
export { HeaderSidenavLayoutComponent };
export { LayoutHeaderComponent };
export { LayoutSidenavComponent };
export { SimpleLayoutComponent };
