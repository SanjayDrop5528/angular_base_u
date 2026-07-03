import { Injectable } from "@angular/core";
import { BaseService } from "../../../core/services/base.service";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";
import _ from "lodash";

// Injectable service available throughout the app
@Injectable({
    providedIn: 'root'
})
export class ScreenLoaded extends BaseService {

    public loadFormConfigJson(screenId: string, collectionName?: any): Observable<any> {
        return this._loadConfig(screenId, collectionName);
    }
    /**
     * This method used for Screen List Json
     * @screenId Screen only List Json Name Because we ADD Screen name + -list
     */
    public loadListConfigJson(screenlistId: string): Observable<any> {
        return this._loadConfig(screenlistId + "-list");
    }
    /**
     * This method used for Screen View Json
     * @screenId Screen only View Json Name Because we ADD Screen name + -view
     */
    public loadViewConfigJson(screenViewId: string): Observable<any> {
        return this._loadConfig(screenViewId + "-view");
    }

    private _loadConfig(screenId: any, collectionName: any = "screen"): Observable<any> {
        return environment.loadScreenFromDatabase ? this._loadFromDatabase(screenId, collectionName) : this._loadFromAssert(screenId)
    }

    /**
     * This method used for Screen Json Asserts
     */
    private _loadFromAssert(screenId: string): Observable<any> {
        return this.http.get(`assets/jsons/${screenId}.json`)
    }

    /**
     * This method used for Screen Json Database
     * Api Method GET 
     */
    private _loadFromDatabase(screenId: string, prefix = "entities", collectionName: any = "screen", dataDrivedFrom = "data.0.config") {
        return new Observable((observer) => {
            this.http.get(prefix + "/" + collectionName + "/" + screenId).subscribe(
                (result: any) => {
                    try {
                        let configString = JSON.parse(_.get(result, dataDrivedFrom))
                        observer.next(configString);
                    } catch (error) {
                        console.error(error);
                        observer.next({});
                    }
                }
            );
        });
    }

}