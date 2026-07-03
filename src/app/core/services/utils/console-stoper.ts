import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConsoleToggleService {
  constructor() {}

  disableConsoleInProduction(): void {
    if (environment.production) {
      // New ASCII-style Kriyatec
      const kriyatecAscii = `
      /$$   /$$           /$$                  /$$$$$$$$                 
      | $$  /$$/          |__/                 |__  $$__/                 
      | $$ /$$/   /$$$$$$  /$$ /$$   /$$  /$$$$$$ | $$  /$$$$$$   /$$$$$$$
      | $$$$$/   /$$__  $$| $$| $$  | $$ |____  $$| $$ /$$__  $$ /$$_____/
      | $$  $$  | $$  \\__/| $$| $$  | $$  /$$$$$$$| $$| $$$$$$$$| $$      
      | $$\\  $$ | $$      | $$| $$  | $$ /$$__  $$| $$| $$_____/| $$      
      | $$ \\  $$| $$      | $$|  $$$$$$$|  $$$$$$$| $$|  $$$$$$$|  $$$$$$$
      |__/  \\__/|__/      |__/ \\____  $$ \\_______/|__/ \\_______/ \\_______/
                              /$$  | $$                                  
                              |  $$$$$$/                                  
                              \\______/                                   
            `;
      console.log('%c' + kriyatecAscii, 'color: #0d47a1; font-weight: bold;');
      console.warn(`🚨 Console output is disabled on production!`);
      console.log('%c U R Not Permitted :', 'color: red; font-size: 20px;', '\u274C');
      console.log = function (): void {};
      console.debug = function (): void {};
      console.error = function (): void {};
      console.warn = function (): void {};
      console.info = function (): void {};
    }
  }
}
