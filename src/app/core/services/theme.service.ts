import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  themeMode$ = new BehaviorSubject<'night' | 'morning'>('night');

  private defaultTheme = {
    name: 'SynapseMD',
    tagline: 'Synapsed',
    primaryColor: '#0d9488',
    secondaryColor: '#0891b2',
    themeTemplate: 'template_teal',
    logoUrl: '/assets/healthcare-login.png',
    loginLayout: 'split',
    loginImageUrl: '/assets/healthcare-login.png'
  };

  private templates: { [key: string]: { primaryColor: string, secondaryColor: string } } = {
    template_classic: { primaryColor: '#1a73e8', secondaryColor: '#9c27b0' },
    template_teal: { primaryColor: '#009688', secondaryColor: '#00bcd4' },
    template_sunset: { primaryColor: '#2e7d32', secondaryColor: '#ffc107' }
  };

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      const mode = (localStorage.getItem('theme_mode') as 'night' | 'morning') || 'night';
      this.setThemeMode(mode);
    }
  }

  setThemeMode(mode: 'night' | 'morning') {
    if (!isPlatformBrowser(this.platformId)) return;
    this.themeMode$.next(mode);
    localStorage.setItem('theme_mode', mode);
    document.documentElement.setAttribute('data-theme', mode);
  }

  toggleThemeMode() {
    const nextMode = this.themeMode$.value === 'night' ? 'morning' : 'night';
    this.setThemeMode(nextMode);
  }

  applyTheme(org: any) {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!org) return;

    const theme = { ...this.defaultTheme, ...org };
    const templateName = theme.theme_template || theme.ThemeTemplate || 'template_classic';

    // Explicit colors from the caller take priority.
    // Only fall back to the template palette if no color was provided.
    const hasExplicitColors = !!(org.primaryColor || org.PrimaryColor || org.primary_color ||
                                  org.secondaryColor || org.SecondaryColor || org.secondary_color);

    let primary = theme.primaryColor || theme.PrimaryColor || theme.primary_color || '#1a73e8';
    let secondary = theme.secondaryColor || theme.SecondaryColor || theme.secondary_color || '#9c27b0';

    if (!hasExplicitColors && this.templates[templateName]) {
      primary = this.templates[templateName].primaryColor;
      secondary = this.templates[templateName].secondaryColor;
    }

    // Inject CSS variables
    document.documentElement.style.setProperty('--primary-color', primary);
    document.documentElement.style.setProperty('--secondary-color', secondary);

    // Inject RGB breakdown for rgba() usage in SCSS
    document.documentElement.style.setProperty('--primary-color-rgb', this.hexToRgb(primary));
    document.documentElement.style.setProperty('--secondary-color-rgb', this.hexToRgb(secondary));

    // Custom data attributes for global styling toggles
    document.documentElement.setAttribute('data-login-layout', theme.loginLayout || theme.LoginLayout || 'split');
    document.documentElement.setAttribute('data-theme-template', templateName);

    // Save to local storage for persistence across reloads
    localStorage.setItem('org_theme', JSON.stringify({
      ...theme,
      primaryColor: primary,
      secondaryColor: secondary,
      theme_template: templateName
    }));
  }

  getCurrentTheme() {
    if (!isPlatformBrowser(this.platformId)) return this.defaultTheme;

    const stored = localStorage.getItem('org_theme');
    return stored ? JSON.parse(stored) : this.defaultTheme;
  }

  /** Convert #rrggbb → "r, g, b" for use in rgba(var(--primary-color-rgb), 0.2) */
  private hexToRgb(hex: string): string {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
}
