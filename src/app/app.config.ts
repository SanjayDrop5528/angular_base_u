import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { provideTranslateService, TranslateModule, TranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { FormlyControlModule } from './modules/formly-control/formly-control.module';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldDefaultOptions } from '@angular/material/form-field';
import { IconLoadedService } from './core/services/utils/icon-loaded.service';
import { ConsoleToggleService } from './core/services/utils/console-stoper';
import { DatePipe } from '@angular/common';
const appearance: MatFormFieldDefaultOptions = {
  appearance: 'outline'
};
import { ModuleRegistry } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import { SharedModule } from './modules/shared/shared.module';
import { FORMLY_CONFIG } from '@ngx-formly/core';
import { registerTranslateExtension } from './modules/formly-control/extension/translation-extensions';
import { MenuService } from './core/services/utils/menu.service';

// ✅ Register *all* AG Grid Enterprise modules
ModuleRegistry.registerModules([AllEnterpriseModule]);

// Factory function to call IconLoader
export function initializeIcons(iconService: IconLoadedService) {
  return () => iconService.IconLoader();
}
export function initializeMenu(menuService: MenuService) {
  return () => menuService.loadMenu();
}
export function initializeConsoleStopper(consoleToggleService: ConsoleToggleService) {
  return () => consoleToggleService.disableConsoleInProduction();
}

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }),
  provideRouter(routes),
  provideAnimations(),
  provideHttpClient(
    withInterceptors([authInterceptor]),
  ),
  importProvidersFrom(
    SharedModule,
    FormlyControlModule,
    TranslateModule
  ),
  provideTranslateService({
    lang: 'english',
    fallbackLang: 'english',
    loader: provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json',
      enforceLoading: true,
      useHttpBackend: false
    })
  }),
    JwtHelperService,
  {
    provide: JWT_OPTIONS,
    useValue: {
      tokenGetter: () => localStorage.getItem('token'),
    },
  },
  {
    provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
    useValue: appearance
  },
    IconLoadedService,
  {
    provide: APP_INITIALIZER,
    useFactory: initializeIcons,
    deps: [IconLoadedService],
    multi: true
  },
    MenuService,
  {
    provide: APP_INITIALIZER,
    useFactory: initializeMenu,
    deps: [MenuService],
    multi: true
  },

  {
    provide: APP_INITIALIZER,
    useFactory: initializeConsoleStopper,
    deps: [ConsoleToggleService],
    multi: true
  },
  { provide: FORMLY_CONFIG, multi: true, useFactory: registerTranslateExtension, deps: [TranslateService] },
    DatePipe

  ]

};
