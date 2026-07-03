import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class IconLoadedService {
  public iconRegistry = inject(MatIconRegistry)
  private httpClient = inject(HttpClient)
  public sanitizer = inject(DomSanitizer)

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
          // Register the icon as an SVG if the extension is '.svg'
          this.iconRegistry.addSvgIcon(name, this.sanitizer.bypassSecurityTrustResourceUrl(iconUrl));
        });
      }

    });
  }
}
