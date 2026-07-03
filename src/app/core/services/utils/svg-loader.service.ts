import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SvgLoaderService {
  docBasePath = environment.ImageBaseUrl
  loadSVG(url: string, containerId: string): void {
    setTimeout(() => {
      fetch(this.docBasePath + url)
        .then(response => {
          if (!response.ok) {
            console.log(`Failed to load SVG: ${response.statusText}`);
          }
          return response.text();
        })
        .then(svg => {
          const container = document.getElementById(containerId);
          if (container) {
            container.innerHTML = svg;
          } else {
            console.log("container", container);
          }
        })
        .catch(error => console.error("Error loading SVG:", error));
    }, 100); // 2 seconds delay
  }
}
