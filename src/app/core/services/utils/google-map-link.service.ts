import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GoogleMapLinkService {

  getDMS(dd: any, longOrLat: any) {

    let hemisphere = /^[WE]|(?:lon)/i.test(longOrLat)
      ? dd < 0
        ? "W"
        : "E"
      : dd < 0
        ? "S"
        : "N";

    const absDD = Math.abs(dd);
    const degrees = this.truncate(absDD);
    const minutes = this.truncate((absDD - degrees) * 60);
    const seconds = ((absDD - degrees - minutes / 60) * Math.pow(60, 2)).toFixed(2);

    let dmsArray = [degrees, minutes, seconds, hemisphere];
    return `${dmsArray[0]}°${dmsArray[1]}'${dmsArray[2]}" ${dmsArray[3]}`;
  }
  truncate(n: any) {
    return n > 0 ? Math.floor(n) : Math.ceil(n);
  }
  getMapTag(data:any){
    const latitude = data[0];
    const longitude = data[1];
    if (latitude == null || longitude == null) {
      console.error("NO DATA AVAILABLE");
      return "";  // Return a message if no data is available
    }

    // Call the method 'changetodegree' to convert the coordinates to the required format
    const lat = this.getDMS(latitude, 'lat');
    const long = this.getDMS(longitude, 'long');

    // Generate the Google Maps link dynamically
    const mapUrl = `https://www.google.com/maps/place/${latitude},${longitude}`;

    // Return the anchor tag with the proper href
    return `<a href="${mapUrl}" target="_blank" rel="noopener noreferrer">
                  ${lat}, ${long}
                </a>`;
  }
  getMapDetails(data:any){
    const latitude = data[0];
    const longitude = data[1];
    if (latitude == null || longitude == null) {
      console.error("NO DATA AVAILABLE");
      return "";  // Return a message if no data is available
    }

    // Call the method 'changetodegree' to convert the coordinates to the required format
    const lat = this.getDMS(latitude, 'lat');
    const long = this.getDMS(longitude, 'long');

    // Generate the Google Maps link dynamically
    const mapUrl = `https://www.google.com/maps/place/${latitude},${longitude}`;

    // Return the anchor tag with the proper href
    return{
      mapUrl,lat,long
    }
    //  `<a href="${mapUrl}" target="_blank">
    //               ${lat}, ${long}
    //             </a>`;
  }
}
