import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoaderService {


  protected $loader: BehaviorSubject<any> = new BehaviorSubject<any>(false);

  setLoader(data: any = false) {
    this.$loader.next(data);
  }

  getloader(): Observable<any> {
    return this.$loader.asObservable();
  }


}
