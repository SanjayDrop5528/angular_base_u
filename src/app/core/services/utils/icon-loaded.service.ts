import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { HelperService } from './helper.service';
import _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class IconLoadedService {
  public iconRegistry = inject(MatIconRegistry)
  private httpClient = inject(HttpClient)
  private helperService = inject(HelperService)

  IconLoader() {
    // Set default icon font to material-icons (ligature-based)
    this.iconRegistry.setDefaultFontSetClass('material-icons');

    // ? To Load Svg from Asseert
    // this.DataServices.loadConfig("icon")
    this.httpClient.get("assets/svgs/icon.json").subscribe((res: any) => {
      if (!_.isEmpty(res.icons)) {
        res.icons.map((iconName: any) => {
          const { fileName, name, extension = ".svg" } = iconName;
          const iconUrl = `assets/svgs/${fileName}${extension}`;
          // Register the icon as an SVG if the extension is '.svg' and path is safe
          if (iconUrl.startsWith('assets/svgs/')) {
            this.iconRegistry.addSvgIcon(name, this.helperService.bypassSecurityTrustResourceUrl(iconUrl));
          } else {
            console.warn(`Unsafe icon URL: ${iconUrl}`);
          }
        });
      }

    });
  }
}
