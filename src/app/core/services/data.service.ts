import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import * as _ from 'lodash';
import {
  BehaviorSubject,
  Observable,
  Subject,
  firstValueFrom,
  retry,
  tap,
} from "rxjs";
import { DialogService } from "./dialog.service";
import { FilterOperations } from '../interfaces/filter-builder';
import { UtilsService } from './utils/utils.service';
import { DynamicQueryBuilderService } from './utils/dynamic-query-builder-service.service';
import { environment } from '../../../environments/environment';
export declare type type = "filter" | "dataset";

@Injectable({
  providedIn: "root",
})
export class DataService {
  public dataSaved: Subject<any> = new Subject();
  public profilePhotoUploaded: Subject<void> = new Subject();
  constructor(private http: HttpClient) { }
  private dialogService = inject(DialogService)
  private _utilsService = inject(UtilsService)
  private _dynamicQueryBuilderService = inject(DynamicQueryBuilderService)

  public getWsBaseUrl() {
    const url = environment.apiBaseUrl;
    return url.endsWith('/') ? url : url + '/';
  }
  //#region //? Endpoint
  /**Api
   * @screenApi loadScreenConfigJson,loadListConfigJson,loadReportConfigJson
   *
   * @baseCrud
   * @getData It take input as Collectionname Get All data
   * @getDataById it take input collectioname , id(_id)
   * @deleteDataById it take input collectioname , id(_id)
   * @save it take input collectioname , data
   * @update it take the input collectioname,_id , data
   * @getDataByFilter it take input as filter condition and take the match data list
   */

  /**
   * This method mainly used for Form Json Name
   * IT Can used for both  Screen List Json (or) form Json (or) menu Json
   * @screenId Screen Name
   * @data must be in (Screen-Json-name-list) (or) (form-Json-name) (or) (menujosnname) && etc...
   */
  public loadScreenConfigJson(screenId: string, collectionName?: any): Observable<any> {
    return this.loadConfig(screenId, collectionName);
  }

  /**
   * This method used for Screen View Json
   * @screenId Screen only View Json Name Because we  Screen name + -view
   */
  public loadmenuConfigJson(screenViewId: string): Observable<any> {
    return this.loadConfig(screenViewId + "-menu");
  }

  /**
   * This method used for Screen List Json
   * @screenId Screen only List Json Name Because we ADD Screen name + -list
   */
  public loadListConfigJson(screenlistId: string): Observable<any> {
    return this.loadConfig(screenlistId + "-list");
  }

  /**
   * This method used for Screen List Json
   * @screenId Screen only Resport Json Name Because we ADD Screen name + -report
   */
  public loadReportConfigJson(screenreportId: string): Observable<any> {
    return this.loadConfig(screenreportId + "-report");
  }

  /**
   * This method used for Screen View Json
   * @screenId Screen only View Json Name Because we ADD Screen name + -view
   */
  public loadViewConfigJson(screenViewId: string): Observable<any> {
    return this.loadConfig(screenViewId + "-view");
  }

  public loadConfig(screenId: any, collectionName: any = "screen"): Observable<any> {
    //let config = sessionStorage.getItem(screenId)
    return new Observable((observer) => {
      // let orgId:any =  sessionStorage.getItem("org_id") || ""
      // let orgId: any = "DEFAULT";

      // var filterCondition = {
      //   filter: [
      //     {
      //       clause: "AND",
      //       conditions: [
      //         {
      //           column: "screen_id",
      //           operator: FilterOperations.EQUALS,
      //           value: screenId,
      //         },
      //         orgId != "" && {
      //           column: "org_id",
      //           operator: FilterOperations.EQUALS,
      //           value: orgId,
      //         },
      //       ].filter(Boolean),
      //     },
      //   ],
      // };
      // this.getDataByFilter(collectionName, filterCondition)

      this.getDataById(collectionName, screenId)
        .subscribe(
          (result: any) => {
            let data = result?.data?.[0];
            // _.get(result,'data.0.response.0.config')
            let configString = data?.config ? data?.config : [];
            observer.next(JSON.parse(configString));
          }
        );

      // let screen = orgId.toLowerCase() == "default" ? screenId : orgId + screenId;
      // this.getDataById(collectionName,screen).subscribe((result: any) => {
      //   let configString = result.data ? result.data[0].config : []
      //   observer.next(JSON.parse(configString))
      //   })
    });
  }

  /**
   * This method Get Data By ID(_id) Dynamic Data from Data base using collectionName and ID
   * @collectionName Dynamic pass of Collection Name
   * @ID Dynamic pass of _id or any Primary key
   */
  public getDataById(collectionName: any, id: any) {
    return this.http.get(
      this.getWsBaseUrl() + "entities/" + collectionName + "/" + id
    );
  }

  //deleteDataByModel Chnage it parent detelet
  //PArent delete Child Delete
  public deleteDataByModel(collectionName: any, id: any) {
    return this.http.delete(
      this.getWsBaseUrl() + "entities/" + collectionName + "/_id/" + id
    );
  }
  public getMethodApi(endPoint: any) {
    return this.http.get(this.getWsBaseUrl() + endPoint);
  }
  public dataUpdate(endpoint: any, data: any) {
    return this.http.put(this.getWsBaseUrl() + `${endpoint}`, data);
  }
  /**
   * This method Delete Data By ID(_id) Dynamic Data from Data base using collectionName and ID
   * @collectionName Dynamic pass of Collection Name
   * @ID Dynamic pass of _id or any Primary key
   */
  public deleteDataById(collectionName: any, id: any) {
    return this.http.delete(
      this.getWsBaseUrl() + "entities/" + collectionName + "/" + id
    );
  }

  public deleteDataByEndpointId(endpoint: any, id: any) {
    return this.http.delete(this.getWsBaseUrl() + endpoint + "/" + id);
  }

  /**
   * This method Delete Image In S3
   * @collectionName Dynamic pass of Collection Name
   * @ID Dynamic pass of _id or any Primary key
   */
  public deleteImageS3(userfiles_id: any, stoagename: any) {
    return this.http.delete(
      this.getWsBaseUrl() + "file/delete/" + userfiles_id + "/" + stoagename
    );
  }

  public login(data: any, qp?: any) {
    return this.http.post(this.getWsBaseUrl() + "auth/login", data, {
      params: qp,
    });
  }
  /**
    This method USed To Get data Using Filter Condition
    @filter
    var filterCondition1 =
    {
    start: 0,
    end:1000,
    filter:[
    {
     clause: "AND",
     conditions: [
      { column: , operator: "EQUALS", value:  },
     ]
    }
    ]
    }
    @clause Type OR ,AND,$nor,$in,$nin 
    @conditions It Should Be in Array of Object
    @operator Type  "EQUALS","NOTEQUAL", "NOTCONTAINS","STARTSWITH","ENDSWITH","LESSTHAN","GREATERTHAN","LESSTHANOREQUAL","GREATERTHANOREQUAL","INRANGE","BLANK","NOTBLANK","EXISTS","IN"
    @column Key name
    @value Value For the Key to match
   */
  public getDataByFilter(collectionName: any, data: any) {
    return this.http.post(
      this.getWsBaseUrl() + "entities/filter/" + collectionName,
      data
    );
  }
  public getPhonecode(collectionName: any, data: any) {
    return this.http.post(
      this.getWsBaseUrl() + "entities/public/filter/" + collectionName,
      data
    );
  }
  public getSpecialists(data: any) {
    return this.http.post(
      this.getWsBaseUrl() + "entities/api/onboarding/specialists",
      data
    );
  }

  public approveSpecialist(specialistId: string) {
    return this.http.put(
      this.getWsBaseUrl() + `entities/api/onboarding/specialists/${specialistId}/status`,
      { status: "Approved" }
    );
  }

  public rejectSpecialist(specialistId: string, reason: string) {
    return this.http.put(
      this.getWsBaseUrl() + `entities/api/onboarding/specialists/${specialistId}/status`,
      { status: "Rejected", reason }
    );
  }

  public holdSpecialist(specialistId: string, reason: string) {
    return this.http.put(
      this.getWsBaseUrl() + `entities/api/onboarding/specialists/${specialistId}/status`,
      { status: "Hold", reason }
    );
  }

  public getSpecialistDetails(specialistId: string) {
    return this.http.get(
      this.getWsBaseUrl() + `entities/api/onboarding/identity?email=${specialistId}`
    );
  }

  public getSpecialistQualifications(specialistId: string) {
    return this.http.get(
      this.getWsBaseUrl() + `entities/api/onboarding/specialists-qualifications?specialist_id=${specialistId}`
    );
  }

  public getSpecialistExperience(specialistId: string) {
    return this.http.get(
      this.getWsBaseUrl() + `entities/api/onboarding/specialists-experience?specialist_id=${specialistId}`
    );
  }

  public getSpecialistSpecialties(specialistId: string) {
    return this.http.get(
      this.getWsBaseUrl() + `entities/api/onboarding/specialists-specialties?specialist_id=${specialistId}`
    );
  }

  /**
   * Fetches a specialist's full profile (personal info, qualifications,
   * experience and specialties) in a single API call.
   * @param specialistId  The specialist's ID (e.g. "SPC-xxxxxxxxxxxxxxxx")
   */
  public getSpecialistFullDetails(specialistId: string) {
    return this.http.get<{
      specialist: any;
      qualifications: any[];
      experience: any[];
      specialties: any[];
      languages?: any[];
      skills?: any[];
    }>(this.getWsBaseUrl() + `entities/api/onboarding/specialists/${specialistId}/details`);
  }


  public getDashboardData(params: any): Observable<any> {
    return this.http.get(this.getWsBaseUrl() + 'static/dashboard', { params: params });
  }
  public updateLaberContractor(data: any) {
    return this.http.post(this.getWsBaseUrl() + `labour-contractor/update`, data);
  }
  /**
   * This method Send New Data
   * @collectionName Dynamic pass of Collection Name
   * @Data Any TYPE of Data
   */
  public save(endpoint: any, data: any) {
    return this.http.post(this.getWsBaseUrl() + endpoint, data);
  }
  public dataset_Get_Data(dataSetName: string, filterData: any = {}) {
    return this.http.post(
      this.getWsBaseUrl() + `dataset/data/${dataSetName}`,
      filterData
    );
  }
  public staticSwapUpdate(data: any) {
    return this.http.put(
      this.getWsBaseUrl() + `static/labour/swap-supervisor`,
      data
    );
  }

  //Post the data
  public bulkpost(endPoint: string, data: any) {
    return this.http.post(this.getWsBaseUrl() + `${endPoint}`, data, {
      reportProgress: true,
      observe: 'events'
    });
  }

  //! public getDataByFilter(collectionName: any, filter: any,c?: any,limit?: any) {
  //     return this.http.post(this.getWsBaseUrl() + 'search/' + collectionName +`/0/${limit||1000}`,filter);
  // }

  public fileupload(data: any) {
    return this.http.post(this.getWsBaseUrl() + "file/s3files/upload", data);
  }
  /**
   * This method Upset Method IT check If Data is Present it Updata Or Else in Create A new data
   * This Can used For Both Save and Update
   * @collectionName Dynamic pass of Collection Name
   * @id is Refered as Primarykey
   * @Data Any TYPE of Data
   */
  //! need to change the data before the
  public update(collectionName: any, id: any, data: any) {
    return this.http.put(
      this.getWsBaseUrl() + "entities/" + `${collectionName}` + `/${id}`,
      data
    );
  }
  public UpdateByStatic(collectionName: any, data: any) {
    return this.http.put(this.getWsBaseUrl() + `static/${collectionName}`, data);
  }
  //? Dataset
  public dataSetPreview(data: any) {
    return this.http.post(this.getWsBaseUrl() + "dataset/config", data);
  }

  public updateTask(data: any) {
    return this.http.put(this.getWsBaseUrl() + "static/task", data);
  }
  public dataSetSave(methodName: any, data: any) {
    return this.http.post(
      this.getWsBaseUrl() + `dataset/config/${methodName}`,
      data
    );
  }
  public dataSetupdate(id: any, data: any) {
    return this.http.put(this.getWsBaseUrl() + `dataset/${id}`, data);
  }
  //Image Upload
  public imageupload(folder: any, refId: any, data: any) {
    const referenceId = refId.toLowerCase()
    return this.http.post(
      this.getWsBaseUrl() + `file/${folder}/${referenceId}`,
      data
    );
  }
  public fileuploadData(folder: any, refId: any, data: any) {
    const referenceId = refId.toLowerCase()
    return this.http.post(
      this.getWsBaseUrl() + `file/${folder}/${referenceId}`,
      data
    );
  }
  public steamDataset(collectionName: string, data: any) {
    return this.http.post(this.getWsBaseUrl() + `dataset/stream/${collectionName}`, data);
  }
  //Image Upload
  public deleteImage(folder: any, refId: any) {
    return this.http.delete(this.getWsBaseUrl() + `file/${folder}/${refId}`);
  }

  async dataHandler(data: any, model: any, attach_value: any = false) {
    if (!data || !data.methodType) {
      this.dialogService.openSnackBar("Data Structure is Not Valid");
      return;
    }

    let apiObservable: Observable<any>;

    // Determine method type
    switch (data.methodType) {
      case "get":
        let compressData: any = _.cloneDeep(data);
        if (
          !_.isEmpty(_.get(compressData, "conditions")) &&
          _.hasIn(compressData, "conditions")
        ) {
          let condtions = _.get(compressData, "conditions");
          condtions.forEach((element: any) => {
            let matches = [...element["params"].matchAll(/\{\{([^}]+)\}\}/g)];
            let keyarr = matches.map((match) => match[1].trim());
            let objectKey = keyarr[0];

            if (element["valueType"] != "static") {
              compressData[objectKey] = this._utilsService.valueFinder(
                element,
                compressData,
                "value"
              );
            } else {
              compressData[objectKey] = element["value"];
            }
            if (attach_value) {
              compressData[objectKey] = model[objectKey];
            }
          });
        }

        const endpointExtra = this._utilsService.processText(data["endPoint"], compressData);
        console.warn(endpointExtra);

        apiObservable = this.http.get(`${this.getWsBaseUrl()}${endpointExtra}`);
        break;
      case "post":
        if (!data.postendPoint) {
          this.dialogService.openSnackBar("Data Post End Point is Not Valid");
          return;
        }

        const filterData = this._dynamicQueryBuilderService.filterQuery(data, model);
        console.log(filterData);
        const filter: any = { start: 0, end: 20, filter: filterData };
        console.log("filter", filter);

        switch (data.postendPoint) {
          case "filter":
            apiObservable = this.getDataByFilter(data.collectionName, filter);
            break;
          case "dataset":
            filter["filterParams"] = [];
            const filterParams = this._dynamicQueryBuilderService.makeDataSetQuery(
              data["filterParams"],
              filter["filterParams"],
              model
            );
            console.log("filterParams", filterParams);

            apiObservable = this.dataset_Get_Data(data.collectionName, filter);
            break;
          default:
            this.dialogService.openSnackBar("Unsupported Post End Point");
            return;
        }
        break;
      default:
        this.dialogService.openSnackBar("Unsupported Method Type");
        return;
    }

    try {
      let resposnse = await firstValueFrom(apiObservable);

      if (attach_value) {
        return resposnse;
      }
      if (data.recordlist) {
        return _.get(resposnse, data.recordlist);
      }
      const entityRows = _.get(resposnse, 'data[0].response');
      if (Array.isArray(entityRows)) return entityRows;
      if (Array.isArray(resposnse)) return resposnse;
      if (Array.isArray((resposnse as any)?.data)) return (resposnse as any).data;
      return resposnse;
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  }

  public logout() {
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = '/login';
  }

  public ssouserRegister(payload: any, qr?: any) {
    return this.http.post(this.getWsBaseUrl() + "user/api/auth/sso-verify", payload, {
      params: qr,
    });
  }

 

}

