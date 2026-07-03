import { HttpClient } from "@angular/common/http";
import {
  Injectable,
  Output,
  ViewChild,
  EventEmitter,
  Input,
  inject,
} from "@angular/core";
import * as _ from "lodash";
import { async, catchError, finalize, tap } from "rxjs";
import { Observable, Subject } from "rxjs";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import { UtilsService } from "./utils/utils.service";
import { DataManipulatorService } from "./utils/data-manipulator-service.service";
import { DynamicQueryBuilderService } from "./utils/dynamic-query-builder-service.service";
import { HelperService } from "./utils/helper.service";
import { DialogService } from "./dialog.service";
import { DataService } from "./data.service";
import { AggridHelperService } from "./ag-grid/aggrid-helper.service";
import { expressionCheck } from "../interfaces/filter-builder";
import { ScreenLoaded } from "../../modules/shared/services/screenloader.service";
import { AuthService } from "./auth.service";

@Injectable({
  providedIn: "root",
})
export class FormService {
  private _dynamicQueryBuilderService = inject(DynamicQueryBuilderService)
  private _dataManipulationService = inject(DataManipulatorService)
  private dialogService = inject(DialogService)
  constructor(
    private helperService: HelperService,
    private dataService: DataService,

  ) { }

  utilsService = inject(UtilsService);
  screenService = inject(ScreenLoaded);
  authService = inject(AuthService);

  LoadMasterInitData(ctrl: any) {
    this.screenService.loadFormConfigJson(ctrl.formName)
      .subscribe(async (config: any) => {
        ctrl.config = config;
        ctrl.pageHeading = config.pageHeading;
        ctrl.collectionName = config.form.collectionName;
        // ctrl.model = config.model ? config.model : {};
        // ctrl.isPopupEdit=ctrl.detailForm.isPopupEdit
        // ctrl.detailModel=ctrl.detailForm.fields
        ctrl.mode = config.addEditMode ? config.addEditMode : "popup";
        ctrl.fields = config.form.fields;
        this.LoadData(ctrl);
        // this.loadSupportData(ctrl)
        // if (config.getWeightFromMachine) {
        //   this.serialPortService.init()
        // }
      });
  }
  /**
   * This Main method We CAll in form Services
   * @id if id availabe ,IT  load the existing data
   * @ctrl This is Total content from the parent componet.
   */
  LoadInitData(ctrl: any) {
    if (ctrl.id) {
      ctrl.collectionName = ctrl.formName;
      this.LoadConfig(ctrl, ctrl.id);
      // this.LoadData(ctrl).subscribe((res: any) => {
      //   console.log(ctrl, "existing data loaded")
      //   this.LoadConfig(ctrl)
      // })
    } else {
      this.LoadConfig(ctrl);
    }
  }

  loadCloneData(ctrl: any, cloneId: any): Observable<boolean> {
    var nextValue = new Subject<boolean>();
    if (cloneId) {
      let Obeservable = this.dataService.getDataById(
        ctrl.collectionName,
        cloneId
      );
      if (ctrl["config"]?.getendpoint) {
        const endpoint = this.utilsService.templateProcessor(
          ctrl,
          ctrl["config"]?.getendpoint
        );
        Obeservable = this.dataService.getMethodApi(endpoint);
      }
      Obeservable.subscribe(
        (result: any) => {
          if (result && result.data && result != null) {
            //  result data is array of index 0
            ctrl.model = result.data[0] || {};
            let removefield = ctrl.config.keyField || "id";
            delete ctrl.model[removefield];
            _.unset(ctrl.model, removefield);
            ctrl.model["isClone"] = true;
            nextValue.next(true);
          }
        },
        (error) => {
          console.error("There was an error!", error);
          nextValue.next(false);
        }
      );
    } else {
      nextValue.next(false);
    }
    return nextValue.asObservable();
  }
  /**
   * This Function help to get the screen config from data base
   * @ctrl This is Total content from the parent componet.
   */
  LoadConfig(ctrl: any, id?: any) {
    this.screenService.loadFormConfigJson(ctrl.formName)
      .subscribe(async (config) => {
        ctrl.collectionName = config.form.collectionName;
        ctrl.config = config;
        if (id) {
          ctrl.id = id;
          this.LoadData(ctrl).subscribe((res: any) => {
            ctrl.id = id;
            this.formPatchMethod(ctrl, config);
          });
        } else {
          /*  
            ? Mainly used Form Action Add With Data 
            ? Clone Id Available in Query Params Means
            ? It Need TO Fetch The Data Then Load The Form Details 
          */
          if (ctrl.route.snapshot.queryParamMap.has("cloneId")) {
            let cloneId = ctrl.route.snapshot.queryParams["cloneId"];
            this.loadCloneData(ctrl, cloneId).subscribe((res: any) => {
              ctrl.id = undefined;
              this.formPatchMethod(ctrl, config);
            });
          } else {
            this.formPatchMethod(ctrl, config);
          }
        }
      });
  }

  formPatchMethod(ctrl: any, config: any) {
    if (ctrl.model && ctrl.model.byday && typeof ctrl.model.byday === 'string') {
      ctrl.model.byday = ctrl.model.byday.split(',');
    }
    this.formatJsonFieldsForForm(ctrl.model, config?.form?.fields);
    ctrl.config = config;
    ctrl.pageHeading = config.pageHeading;
    ctrl.mode = config.screenEditMode ? config.screenEditMode : "popup";
    ctrl.model["keyField"] = config.keyField || "_id";
    ctrl.id = ctrl.model[config?.keyField] || ctrl?.model["_id"];
    ctrl.formAction = ctrl.id ? "Edit" : "Add";
    ctrl.actionHide = config?.actionHide ?? false;

    // buttons based on the id If But Text Available means 	"addButText":"Send Acceptance",
    ctrl.butText = ctrl.id ? ctrl?.config.updateButText ? ctrl?.config.updateButText : "Update" : ctrl?.config.addButText ? ctrl?.config.addButText : "Save";
    //   ctrl?.config.butText ? ctrl?.config.butText :
    if (ctrl.formAction == "Edit" && ctrl.config.mode == "page") {
      ctrl.model["isEdit"] = true;
      ctrl.isEditMode = true;
      ctrl.fields = config.form.fields;
    } else if (ctrl.formAction == "Edit" && ctrl.mode == "popup") {
      ctrl.model["isEdit"] = true;
      ctrl.model["isshow"] = true;
      ctrl.model["ishide"] = true;
      ctrl.isFormDataLoaded = true;
      ctrl.formAction = ctrl.config.formAction || "Edit";
      ctrl.isEditMode = true;
    }
    if (ctrl.formAction == "Add" && !ctrl.id && ctrl.initReset) {
      ctrl.model = {};
    }
    if (config && ctrl.formAction == "Add" && !ctrl.id && Array.isArray(config["initAddPatchData"])) this._dataManipulationService.processValues(ctrl, ctrl, config["initAddPatchData"]);
    if (config && ctrl.formAction == "Edit" && ctrl.id && Array.isArray(config["initEditPatchData"])) this._dataManipulationService.processValues(ctrl, ctrl, config["initEditPatchData"]);

    ctrl.fields = config.form.fields;

    // Auto-fill patient details and filter doctors if patient is logged in and form is registration
    if (ctrl.formName === 'registration') {
      if (ctrl.model && ctrl.model.start_time) {
        const startTime = new Date(ctrl.model.start_time);
        const endTime = new Date(ctrl.model.end_time);
        if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
          const year = startTime.getFullYear();
          const month = String(startTime.getMonth() + 1).padStart(2, '0');
          const date = String(startTime.getDate()).padStart(2, '0');
          ctrl.model.booking_date = `${year}-${month}-${date}`;

          const formatTime = (d: Date) => {
            let hours = d.getHours();
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            return `${hours}:${minutes} ${ampm}`;
          };

          const label = `${formatTime(startTime)} – ${formatTime(endTime)}`;
          ctrl.model.appointmentSlot = {
            start: ctrl.model.start_time,
            end: ctrl.model.end_time,
            label: label
          };
        }
      }

      if (ctrl.model && ctrl.model.reserved_by) {
        this.dataService.getMethodApi(`user/api/users/view/${ctrl.model.reserved_by}`).subscribe({
          next: (res: any) => {
            const patient = res?.data || res || {};
            const pName = patient.name || ((patient.first_name || '') + ' ' + (patient.last_name || '')).trim();
            const pEmail = patient.email || '';
            const pPhone = patient.mobile || patient.phone || '';
            let pDob = '';
            if (patient.onboarding_details && patient.onboarding_details.dob) {
              pDob = patient.onboarding_details.dob;
            }

            ctrl.model.patient_name = pName;
            ctrl.model.email = pEmail;
            ctrl.model.phone = pPhone;
            if (pDob) {
              try {
                ctrl.model.dob = new Date(pDob).toISOString().split('T')[0];
              } catch (e) {
                ctrl.model.dob = pDob;
              }
            }

            const fieldsToPatch = ['patient_name', 'email', 'phone', 'dob', 'booking_date', 'appointmentSlot'];
            fieldsToPatch.forEach(fieldKey => {
              if (ctrl.form && ctrl.form.get(fieldKey)) {
                ctrl.form.get(fieldKey).setValue(ctrl.model[fieldKey]);
              }
            });
            if (ctrl.ngZone) {
              ctrl.ngZone.run(() => ctrl.cdr?.detectChanges());
            } else {
              ctrl.cdr?.detectChanges();
            }
          },
          error: (err: any) => {
            console.error('Failed to fetch patient details for booking edit', err);
          }
        });
      }

      const currentUser = this.authService.getCurrentUser();
      const role = (currentUser?.role_name || currentUser?.roleType || currentUser?.entity_type || '').toLowerCase();
      if (role === 'user') {
        // Hide the patient details fields immediately to avoid UI flicker
        const fieldsToPatch = ['patient_name', 'email', 'phone', 'dob'];
        fieldsToPatch.forEach(fieldKey => {
          const field = this.findFieldByKey(ctrl.fields, fieldKey);
          if (field) {
            field.hide = true;
          }
        });

        if (ctrl.formAction === 'Add') {
          this.dataService.getMethodApi("entities/api/patients").subscribe({
            next: (res: any) => {
              const patients = res?.data || [];
              if (patients.length > 0) {
                const patient = patients[0];
                fieldsToPatch.forEach(fieldKey => {
                  let val = patient[fieldKey];
                  if (fieldKey === 'patient_name' && !val) {
                    val = patient.name;
                  }
                  if (val) {
                    if (fieldKey === 'dob') {
                      try {
                        const dateObj = new Date(val);
                        if (!isNaN(dateObj.getTime())) {
                          val = dateObj.toISOString().split('T')[0];
                        }
                      } catch (e) {
                        console.error('Failed to parse date of birth', e);
                      }
                    }
                    ctrl.model[fieldKey] = val;
                    if (ctrl.form && ctrl.form.get(fieldKey)) {
                      ctrl.form.get(fieldKey).setValue(val);
                    }
                  }
                });

                if (ctrl.ngZone) {
                  ctrl.ngZone.run(() => ctrl.cdr?.detectChanges());
                } else {
                  ctrl.cdr?.detectChanges();
                }
              }
            },
            error: (err: any) => {
              console.error('Failed to auto-fetch patient record for user', err);
            }
          });
        }

        // Filter the doctor dropdown to show only doctors
        const doctorField = this.findFieldByKey(ctrl.fields, 'user_id');
        if (doctorField && doctorField.props) {
          doctorField.props.endPoint = 'user/api/users?entity_type=doctor';
          if (doctorField.props.recordlist) {
            delete doctorField.props.recordlist;
          }
        }
      }
    }

    // Auto-fill and hide patient_id if patient is logged in
    if (ctrl.formName === 'cases') {
      const currentUser = this.authService.getCurrentUser();
      const role = (currentUser?.role_name || currentUser?.roleType || currentUser?.entity_type || '').toLowerCase();
      if (role === 'patient' || role === 'user') {
        const patientField = this.findFieldByKey(ctrl.fields, 'patient_id');
        if (patientField) {
          patientField.hide = true;
        }

        if (ctrl.formAction === 'Add') {
          this.dataService.getMethodApi("entities/api/patients").subscribe({
            next: (res: any) => {
              const patients = res?.data || [];
              if (patients.length > 0) {
                const patientId = patients[0].id;
                ctrl.model.patient_id = patientId;

                if (ctrl.form && ctrl.form.get('patient_id')) {
                  ctrl.form.get('patient_id').setValue(patientId);
                }

                if (ctrl.ngZone) {
                  ctrl.ngZone.run(() => ctrl.cdr?.detectChanges());
                } else {
                  ctrl.cdr?.detectChanges();
                }
              }
            },
            error: (err: any) => {
              console.error('Failed to auto-fetch patient record for user', err);
            }
          });
        }
      }
    }

    if (ctrl.ngZone) {
      ctrl.ngZone.run(() => ctrl.cdr?.detectChanges());
    } else {
      ctrl.cdr?.detectChanges();
    }
  }

  private findFieldByKey(fields: any[], key: string): any {
    if (!fields) return null;
    for (const f of fields) {
      if (f.key === key) return f;
      if (f.fieldGroup) {
        const found = this.findFieldByKey(f.fieldGroup, key);
        if (found) return found;
      }
    }
    return null;
  }

  resetDetailModel(ctrl: any) {
    let form = ctrl.config.detailForm;
    if (form) {
      ctrl.detailModel = {};
      ctrl.isDetailEditMode = false;
      ctrl.butText = "Add";
      if (form.defaultFocusIndex) {
        form.fields[form.defaultFocusIndex].focus = true;
        //TODO ??
        // form.fields[form.defaultFocusIndex].defaultValue = ""
      }
    }
  }

  updateDetailFormData(ctrl: any): Promise<any> {
    return new Promise(async (resolve, reject) => {
      //validate all the form fields
      console.log(ctrl);

      if (!ctrl.detailForm.valid) {
        const invalidLabels: any = this.helperService.getDataValidation(
          ctrl.detailForm.controls
        );
        this.dialogService.openSnackBar("Error in " + invalidLabels, "OK");
        ctrl.detailForm.markAllAsTouched();
        ctrl.detailForm.fields[ctrl.detailDefaultFocusIndex].focus = true;
        resolve(false);
        return;
      }
      //get the form data

      var data = ctrl.detailForm.value;
      data[ctrl.config.detailForm.mapColumn] = ctrl.id;
      if (ctrl.config.mapColumnDiff == true) {
        data[ctrl.config.detailForm.mapColumn] =
          ctrl.model[ctrl.config.mapColumnfield];
      }
      // TO CREATE the STRUCT
      if (ctrl.config.extraData) {
        this.Create_struct(ctrl, data).then((val: any) => {
          console.log(val, "strusct");
          data = val; //! reassign the data from change the structure
          if (ctrl?.config?.detailForm?.customfilter) {
            data[ctrl.config.detailForm.mapColumn] =
              ctrl?.model?.model_name || sessionStorage.getItem("model_name");
          } else {
            data[ctrl.config.detailForm.mapColumn] = ctrl.id;
          }
          var findIndex = -1;
          console.log(ctrl);

          if (ctrl.butText == "Add") {
            var defaultValues = ctrl.config.detailForm.defaultValues || [];
            this.loadDefaultValues(defaultValues, data, ctrl.model);
            let collectionName = ctrl.config.detailForm.collectionName;
            let endpoint = "entities/" + collectionName;
            this.dataService
              .save(endpoint, data)
              .pipe(
                catchError((error: any) => {
                  this.dialogService.openSnackBar(error.error_msg, "OK");
                  return error;
                })
              )
              .subscribe(
                (res: any) => {
                  ctrl.isEditMode = false;
                  data["_id"] = res.data["insert ID"];
                  const transaction: any = {
                    add: [data],
                  };
                  const result = ctrl.gridApi.applyTransaction(transaction);
                  console.log(transaction, result);

                  this.resetDetailModel(ctrl);
                  this.dialogService.openSnackBar(
                    "Data has been updated successfully",
                    "OK"
                  );

                  // if (findIndex >= 0) {
                  //   //data already in the grid
                  //   ctrl.listData[findIndex] = data
                  // } else {
                  //   ctrl.listData.unshift(data)
                  // }
                  // ctrl.tempListData = ctrl.listData;
                  // ctrl.listData = [...ctrl.listData]
                  // ctrl.tempListData = ctrl.listData;
                  resolve(data);
                },
                (error) => {
                  // this.dialogService.openSnackBar("Data has been added successfully","OK")
                  resolve(undefined);
                }
              );
          } else {
            //! If Data Present means  it edit mode

            if (ctrl.keyColumn == undefined) {
              ctrl.keyColumn = "_id";
            }
            var id: any = ctrl.selectedRow[ctrl.keyColumn];

            var uniqueColumn = ctrl.config.detailForm.uniqueColumn;

            // data[ctrl.config.detailForm.mapColumnname] = ctrl.model.name
            if (uniqueColumn) {
              //grid level validation
              findIndex = ctrl.listData.findIndex(
                (e: any) => e[uniqueColumn] == data[uniqueColumn]
              ); //unique column
              if (!ctrl.isDetailEditMode && findIndex > -1) {
                //unique column data found in the grid
                console.log("column data found in the grid");

                this.dialogService.openSnackBar("Data already exists", "OK");
                resolve(undefined);
                return;
              }
            }
            // delete data._ids
            this.dataService
              .update(ctrl.config.detailForm.collectionName, id, data)
              .pipe(
                catchError((error: any) => {
                  this.dialogService.openSnackBar(error.error_msg, "OK");
                  return error;
                })
              )
              .subscribe(
                (res) => {
                  ctrl.isEditMode = false;

                  this.resetDetailModel(ctrl);
                  this.dialogService.openSnackBar(
                    "Data has been updated successfully",
                    "OK"
                  );
                  // if (findIndex >= 0) {
                  //   //data already in the grid
                  //   ctrl.listData[findIndex] = data
                  // } else {
                  //   ctrl.listData.unshift(data)
                  // }
                  // ctrl.tempListData = ctrl.listData;
                  // ctrl.listData = [...ctrl.listData]
                  // ctrl.tempListData = ctrl.listData;
                  data["_id"] = id;
                  const transaction: any = {
                    update: [data],
                  };
                  const result = ctrl.gridApi.applyTransaction(transaction);
                  console.log(transaction, result);

                  resolve(data);
                },
                (error) => {
                  resolve(undefined);
                } //this.dialogService.openSnackBar("Data has been added successfully","OK")
              );
          }
        });
      } else {
        var findIndex = -1;

        if (ctrl.butText == "Add") {
          console.log(ctrl?.config?.detailForm?.Change_id);
          var defaultValues = ctrl.config.detailForm.defaultValues || [];
          this.loadDefaultValues(defaultValues, data, ctrl.model);
          if (ctrl?.config?.detailForm?.Change_id) {
            data[ctrl?.config?.detailForm?.changekeyfield] =
              data[ctrl?.config?.detailForm?.addkeyfield] +
              "-" +
              data[ctrl?.config?.detailForm?.changekeyfield];
          } else if (ctrl?.config?.detailForm?.Change_id == false) {
            data["subject_id"] = sessionStorage.getItem("_id");
          }
          let collectionName = ctrl.config.detailForm.collectionName;
          let endpoint = "entities/" + collectionName;
          // if(differentSaveApi){
          //   endpoint =ctrl.config.saveEndPoint
          // }
          this.dataService.save(endpoint, data).subscribe(
            (res: any) => {
              ctrl.isEditMode = false;
              this.resetDetailModel(ctrl);
              this.dialogService.openSnackBar(
                "Data has been updated successfully",
                "OK"
              );
              // let values:any={}
              //   values["_id"]=res.data["insert ID"]
              // Object.assign(data,values)
              data["_id"] = res.data["insert ID"];
              data.Apitype = "Add";

              // if (findIndex >= 0) {
              //   //data already in the grid
              //   ctrl.listData[findIndex] = data
              // } else {
              //   ctrl.listData.unshift(data)
              // }
              // ctrl.tempListData = ctrl.listData;
              // ctrl.listData = [...ctrl.listData]
              // ctrl.tempListData = ctrl.listData;
              resolve(data);
            },
            (error) => {
              resolve(undefined);
            } //this.dialogService.openSnackBar("Data has been added successfully","OK")
          );
        } else {
          var uniqueColumn = ctrl.config.detailForm.uniqueColumn;
          // data[ctrl.config.detailForm.mapColumnname] = ctrl.model.name
          if (uniqueColumn) {
            //grid level validation
            findIndex = ctrl.listData.findIndex(
              (e: any) => e[uniqueColumn] == data[uniqueColumn]
            ); //unique column
            if (!ctrl.isDetailEditMode && findIndex > -1) {
              //unique column data found in the grid
              console.log("column data found in the grid");

              this.dialogService.openSnackBar("Data already exists", "OK");
              resolve(undefined);
              return;
            }
          }
          // let id =data._id
          if (ctrl.keyColumn == undefined) {
            ctrl.keyColumn = "_id";
          }
          var id: any = ctrl.selectedRow[ctrl.keyColumn];
          delete data._id; //? IdK

          this.dataService
            .update(ctrl.config.detailForm.collectionName, id, data)
            .subscribe(
              (res: any) => {
                ctrl.isEditMode = false;
                data.Apitype = "Update";
                this.resetDetailModel(ctrl);
                this.dialogService.openSnackBar(
                  "Data has been updated successfully",
                  "OK"
                );

                data._id = id;
                // if (findIndex >= 0) {
                //   //data already in the grid
                //   ctrl.listData[findIndex] = data
                // } else {
                //   ctrl.listData.unshift(data)
                // }
                // ctrl.tempListData = ctrl.listData;
                // ctrl.listData = [...ctrl.listData]
                // ctrl.tempListData = ctrl.listData;

                data["_id"] = id;
                // Object.assign(data,ctrl.model)

                resolve(data);
              },
              (error) => {
                resolve(undefined);
              } //this.dialogService.openSnackBar("Data has been added successfully","OK")
            );
        }
      }
    });
  }

  aggridHelperService = inject(AggridHelperService);

  LoadDetailConfig(ctrl: any) {
    ctrl.form.disable();

    ctrl.keyCol = ctrl.config.detailForm.keyColumn || "cno";
    ctrl.detailDefaultFocusIndex =
      ctrl.config.detailForm.defaultFocusIndex || 0;
    ctrl.detailFields = ctrl.config.detailForm.fields;
    ctrl.detailModel = ctrl.config.detailForm.model
      ? ctrl.config.detailForm.model
      : {};
    ctrl.isPopupEdit = ctrl.config.detailForm.isPopupEdit || false;
    ctrl.listData = [];

    ctrl.tempListData = ctrl.listData;
    ctrl.detailListConfig = ctrl.config.detailListConfig;
    ctrl.filterOptions = ctrl.config.detailListConfig.filterOptions;
    ctrl.actions = ctrl.config.detailListConfig.actions || [];
    ctrl.actionPopup = ctrl.config.detailListConfig.actionPopup || []; //popup form screen in master table
    ctrl.delete = ctrl.config.detailListConfig.delete || [];
    //TODO

    this.aggridHelperService.aggridSetter(
      ctrl,
      "config.detailListConfig.fields"
    );
    ctrl.detailListFields = ctrl.config.detailListConfig.fields;
  }

  LoadData(ctrl: any): Observable<boolean> {
    var nextValue = new Subject<boolean>();
    this.LoadFormData(ctrl).subscribe((exists: any) => {
      nextValue.next(exists);
      if (exists && ctrl.config.formType == "master-detail") {
        //load detailed form details and its data, if available

        this.LoadDetailConfig(ctrl);
        this.LoadDetailDataList(ctrl, ctrl.id);
        this.resetDetailModel(ctrl);
      }
    });
    return nextValue.asObservable();
  }

  // !Need TO do in same componenet for server side pagination
  LoadDetailDataList(ctrl: any, id: string, addtionalFilterConditions?: any) {
    let filterCondition: any;
    //master-detail mapping record filter condition
    if (ctrl?.config?.detailForm?.customfilter) {
      filterCondition = [
        {
          column: ctrl.config.detailForm.mapColumn,
          operator: "EQUALS",
          value: ctrl.model[ctrl?.config?.detailForm?.customkey],
        },
      ];
    } else {
      filterCondition = [
        {
          column: ctrl.config.detailForm.mapColumn,
          operator: "EQUALS",
          value: id,
        },
      ];
    }
    console.log(filterCondition);

    this._dynamicQueryBuilderService.makeFilterConditions(
      ctrl.detailListConfig.defaultFilter,
      filterCondition,
      ctrl.detailModel
    );
    this._dynamicQueryBuilderService.makeFilterConditions(
      ctrl.detailListConfig.fixedFilter,
      filterCondition,
      ctrl.detailModel
    );

    //when we apply filter the top filter controls,
    //this conditions to be merged with the above filter condition
    if (addtionalFilterConditions) {
      filterCondition = _.merge(filterCondition, addtionalFilterConditions);
    }
    //load detail (child) collection data
    var filterQuery = {
      filter: [
        {
          clause: "AND",
          conditions: filterCondition,
        },
      ],
    };

    this.dataService
      .getDataByFilter(ctrl.config.detailForm.collectionName, filterQuery)
      .subscribe(
        (result: any) => {
          ctrl.listData = result.data[0].response || [];
          ctrl.tempListData = ctrl.listData;
          ctrl.gridApi.sizeColumnsToFit();
        },
        (error) => {
          ctrl.listData = [];
          ctrl.tempListData = ctrl.listData;
          //Show the error popup
          console.error("There was an error!", error);
        }
      );
  }

  /**
   * This method used for the Get the data from the database
   * Take the Old Data in modelOldData
   * @ctrl This is Total content from the parent componet.
   */
  LoadFormData(ctrl: any): Observable<boolean> {
    var nextValue = new Subject<boolean>();
    if (ctrl.id) {
      let Obeservable = this.dataService.getDataById(
        ctrl.collectionName,
        ctrl.id
      );
      if (ctrl["config"]?.getendpoint) {
        const endpoint = this.utilsService.templateProcessor(
          ctrl,
          ctrl["config"]?.getendpoint
        );
        Obeservable = this.dataService.getMethodApi(endpoint);
      }
      Obeservable.subscribe(
        (result: any) => {
          if (result && result.data && result != null) {
            //we need old data, if update without any changes
            ctrl.modelOldData = _.cloneDeep(ctrl.model);
            //  result data is array of index 0
            ctrl.model = result.data[0] || {};
            ctrl.model["isEdit"] = true;
            ctrl.model["isshow"] = true;
            ctrl.model["ishide"] = true;
            ctrl.isFormDataLoaded = true;
            ctrl.isDataError = false; //???
            ctrl.formAction = ctrl.config.formAction || "Edit";
            ctrl.isEditMode = true;
            nextValue.next(true);
          } else {
            ctrl.model["isEdit"] = false;
            ctrl.formAction = "Add";
            ctrl.isFormDataLoaded = false;
            nextValue.next(false);
          }
        },
        (error) => {
          console.error("There was an error!", error);
          nextValue.next(false);
        }
      );
    } else {
      nextValue.next(false);
    }
    return nextValue.asObservable();
  }

  subsequentApicall(ctrl: any, apiDetails: any) {
    this.dataService
      .update(
        apiDetails["collectionName"],
        _.get(ctrl, apiDetails["primaryKey"]),
        apiDetails["value"]
      )
      .subscribe((res: any) => {
        console.log(res);
      });
  }

  makeSequentApiCall(collectionName: any, apiDetails: any) {
    this.dataService
      .dataUpdate(collectionName, apiDetails)
      .subscribe((res: any) => {
        console.log(res);
      });
  }

  /**
   * This method used Save or update the data / Add and update the form
   * Take the Old Data in modelOldData
   * @param ctrl This is Total content from the parent componet
   */
  async saveFormData(ctrl: any): Promise<any> {
    return new Promise((resolve, reject) => {   // ✅ removed `async` here
      try {                                      // ✅ wraps everything below

        if (!ctrl.form.valid) {
          const invalidLabels: any = this.utilsService.getDataValidations(
            ctrl.form.controls
          );
          this.dialogService.openSnackBar("Error in " + invalidLabels, "OK");
          ctrl.form.markAllAsTouched();
          ctrl.butonflag = false;
          reject('validation_failed');
          return;
        }
        if (ctrl.form.valid) {
          let value = ctrl.form.value;
          const errorMessage: any = this.customErrChecker(value, ctrl);
          if (errorMessage) {
            this.dialogService.openSnackBar(errorMessage);
            ctrl.butonflag = false;
            reject('custom_validation_failed');
            return;
          }
        }

        // ? For Some Scenrio We Change the Setting in Ctrl
        if (ctrl.config?.["loadDeafultValueInUpdate"])
          this._dataManipulationService.processValues(
            ctrl,
            ctrl,
            ctrl.config?.["loadDeafultValueInUpdate"]
          );

        var data = ctrl.form.value;
        data = this.parseJsonFieldsForSubmit(data, ctrl.config?.form?.fields);
        if (data && data.byday && Array.isArray(data.byday)) {
          data.byday = data.byday.join(',');
        }
        if (ctrl?.config?.addFormData) {
          this._dataManipulationService.processValues(ctrl, data, ctrl?.config?.addFormData);
        }
        // ? PREFIX
        if (
          ctrl?.config?.Change_id &&
          (ctrl.model.isEdit !== true || ctrl.formAction == "Add")
        ) {
          data[ctrl.config.changekeyfield] =
            data[ctrl.config.addkeyfield] +
            "-" +
            data[ctrl.config.changekeyfield];
        }

        if (ctrl.config["multilang"]) {
          delete data[ctrl.config?.["createkey"]];
        }
        delete data['isExistingStudent']
        var nextCollData: any;
        if (ctrl.config["aggrid"] == true) {
          nextCollData = _.cloneDeep(_.get(data, ctrl.config["referencefield"]));
          delete data[ctrl.config["referencefield"]];
        }
        let differentSaveApi = ctrl.config?.["diffMehthod"] || false;

        if (ctrl.formAction == "Add") {
          var defaultValues = ctrl.config.form.defaultValues || [];
          this.loadDefaultValues(defaultValues, data, ctrl.model);
          let collectionName = ctrl.config?.saveInCollection
            ? ctrl.config.saveInCollection
            : ctrl.config.form.collectionName;
          let endpoint = "entities/" + collectionName;
          if (differentSaveApi) {
            endpoint = ctrl.config.saveEndPoint;
          }

          this.dataService.save(endpoint, data).subscribe({   // ✅ no more .pipe(catchError)
            next: (res: any) => {
              if (res) {
                if (ctrl?.config?.user) {
                  this.updateuser(ctrl, res);
                }
                if (ctrl?.config?.["subSequentApiCall"]) {
                  this.subsequentApicall(ctrl, ctrl?.config?.["subSequentApiCall"]);
                }
                if (ctrl.config["aggrid"] == true) {
                  this.updateGridData(ctrl, nextCollData, res);
                }
                if (ctrl.config["multilang"]) {
                  this.updatelang(ctrl, res);
                }
                let message = "Data has been Inserted successfully";
                if (ctrl["config"]["saveMessage"]) {
                  message = this.utilsService.templateProcessor(data, ctrl["config"]["saveMessage"]);
                }
                if (ctrl['config']['apiMessage']) {
                  message = _.get(res, ctrl['config']['apiMessagePath'], message)
                }
                this.dialogService.openSnackBar(message, "OK");
                resolve(res);          // ✅ success path unchanged
              } else {
                ctrl.butonflag = false;
                this.dialogService.openSnackBar(res?.error_msg || 'Save failed.', "OK");
                reject('empty_response');   // ✅ was previously a dead end — now settles the promise
              }
            },
            error: (error: any) => {        // ✅ real HTTP errors land here now, not swallowed
              ctrl.butonflag = false;
              this.dialogService.openSnackBar(error?.error?.error || error?.message || 'Save failed.', "OK");
              reject(error);
            }
          });

        } else {
          let collectionName = ctrl.config?.saveInCollection
            ? ctrl.config.saveInCollection
            : ctrl.config.form.collectionName;

          delete data._id;

          let observable = this.dataService.update(collectionName, ctrl.id, data);
          if (differentSaveApi) {
            const endpoint = this.utilsService.templateProcessor(
              ctrl,
              ctrl["config"]?.updateEndPoint
            );
            observable = this.dataService.dataUpdate(endpoint, data);
          }

          observable.subscribe({          // ✅ no more .pipe(catchError)
            next: (res: any) => {
              if (ctrl?.config?.user) {
                this.updateUserEdit(ctrl);
              }
              let message = "Data has been Inserted successfully";
              if (ctrl["config"]["updateMessage"]) {
                message = this.utilsService.templateProcessor(data, ctrl["config"]["updateMessage"]);
              }
              this.dialogService.openSnackBar(message, "OK");
              if (ctrl.config["aggrid"] == true) {
                this.updateGridData(
                  ctrl,
                  nextCollData,
                  { data: { "insert ID": ctrl.id } },
                  true
                );
              }
              if (ctrl?.config?.["makeSequentApiCall"]) {
                let { apiUrl, config } = ctrl.config?.["makeSequentApiCall"];
                let seqData = {};
                this._dataManipulationService.processValues(ctrl, seqData, config);
                const endpoint = this.utilsService.templateProcessor(ctrl, apiUrl);
                this.makeSequentApiCall(endpoint, seqData);
              }
              if (ctrl.config["multilang"]) {
                this.updatelang(ctrl, res);
              }
              resolve(res);        // ✅ success path unchanged
            },
            error: (error: any) => {      // ✅ real HTTP errors land here now, not swallowed
              ctrl.butonflag = false;
              this.dialogService.openSnackBar(error?.error?.error || error?.message || 'Update failed.', "OK");
              reject(error);
            }
          });
        }

      } catch (err) {
        // ✅ THIS is the critical new block. It catches any synchronous throw —
        // e.g. templateProcessor() blowing up while resolving {{model.id}} —
        // that previously vanished silently inside the async-executor Promise,
        // leaving the drawer open and the grid un-refreshed forever.
        console.error('saveFormData: synchronous error before API call', err);
        ctrl.butonflag = false;
        this.dialogService.openSnackBar('Something went wrong while preparing the save. Please try again.', 'OK');
        reject(err);
      }
    });
  }

  updateGridData(ctrl: any, rowData: any[], res: any, update: boolean = false) {
    let sequence = ctrl.config.aggridsequence || false;
    let nextCollectionName = ctrl.config?.saveInNextCollection
      ? ctrl.config.saveInNextCollection
      : ctrl.config.nextCollectionName;

    rowData.forEach((data: any) => {
      //  delete data['checkData']
      _.unset(data, ["checkData"]);

      _.unset(data, "uniqueId");
      _.unset(data, "observable");
      delete data["observable"];
      // data[ctrl.config['refkeyField']] = res.data["InsertedID"]
      _.set(data, ctrl.config["refkeyField"], res.data["insert ID"]);

      if (ctrl.config["subObjectConfict"])
        this._dataManipulationService.processValues(
          ctrl,
          data,
          ctrl.config["subObjectConfict"]
        );

      if (!data["_id"]) {
        data["_id"] = uuidv4();
      }
      if (!update) {
        data["created_on"] = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ");
      }
      console.log();

      this.dataService
        .update(
          nextCollectionName,
          data["_id"],
          data
        )
        .subscribe((res: any) => {
          console.log(res);
        });
    });
  }

  //#region  //? STRUCT
  /**
   * This method used for the Get the data from model into Tag of String
   * @ctrl This is Total content from the parent componet.
   */
  Create_struct(ctrl: any, value: any): Promise<any> {
    return new Promise(async (resolve, reject) => {
      var data: any = {};

      // Get the column name and convert it to lowercase
      const attributesName = value.column_name.toLowerCase();

      // Capitalize the first letter of the column name
      const formattedName =
        attributesName.charAt(0).toUpperCase() +
        attributesName.slice(1).toLowerCase();

      // Initialize the Tag string with common values
      // let Tag = `json:"${attributesName}" bson:"${attributesName}" validate:"`;
      var jsonvalues =
        value.column_name === "ID" ||
          value.column_name === "Id" ||
          value.column_name === "_id"
          ? "_id"
          : value.column_name;

      // Initialize the Tag string with common values
      let Tag = `json:"${jsonvalues}" bson:"${jsonvalues}" validate:"`;
      // Set the type if it's not undefined
      if (value.type === undefined) {
        value.type = value.modelName;
      }

      // Add "[]" if it's an array field
      if (value.array_field === "yes") {
        value.type = "[]" + value.type;
      }

      // Add "required" or "omitempty" based on the "required" property
      Tag += value.required === "yes" ? "required" : "omitempty";
      //  ? If type string wiht "" else default
      if (value.default) {
        Tag += `" default:${value.type === "string" ? `"${value.default}` : value.default
          }`;
      }
      // Tag += value.default !== ""
      // ? `" default: ${value.type === 'string' ? `${value.default}` : value.default} `
      // : "";

      // Handle various enumerate_validation cases
      switch (value.enumerate_validation) {
        case "between_age":
          Tag += `,between_age=${value.validation}-${value.additional_input_advanced}`;
          break;
        case "regexp":
          Tag += `,regexp=${value.validation}`;
          break;
        case "eq":
          Tag += `,eq=${value.validation}`;
          break;
        case "ne":
          Tag += `,ne=${value.validation}`;
          break;
        case "gt":
          Tag += `,gt=${value.validation}`;
          break;
        case "gte":
          Tag += `,gte=${value.validation}`;
          break;
        case "lt":
          Tag += `,lt=${value.validation}`;
          break;
        case "lte":
          Tag += `,lte=${value.validation}`;
          break;
        case "within":
          Tag += `,within=${value.validation}`;
          break;
        case "in_between":
          if (value.validation && value.additional_input_advanced) {
            Tag += `,min=${value.validation},max=${value.additional_input_advanced}`;
          } else if (value.validation) {
            Tag += `,min=${value.validation}`;
          } else if (value.additional_input_advanced) {
            Tag += `,max=${value.additional_input_advanced}`;
          }
          break;
        case "min":
        case "max":
          Tag += `,${value.enumerate_validation}=${value.validation}`;
          break;
      }

      // Add the closing double quote to the Tag string
      Tag += '"';

      // Update the "data" object properties
      // data._id=ctrl.detailModel._id
      data.tag = Tag;
      data.max = undefined;
      data.min = undefined;
      data.column_name = value.column_name = formattedName;
      data.header = value.header;
      data.type = value.type;
      data.default = value.default;
      data.description = value.description;
      data.collection_name = value.collection_name;
      data.is_reference = value.is_reference;
      data.field = value.field;
      data.json_field = jsonvalues;

      resolve(data);
    });
  }

  extractValidationKeywords(tag: any) {
    const matchResult = tag.match(/validate:"(.*?)"/);
    if (matchResult && matchResult[1]) {
      const keywords = matchResult[1].split(",");
      return keywords.map((keyword: any) => keyword.trim());
    }
    return [];
  }

  //"json:"within" bson:"within"  validate:"omitempty,within=2d
  extractComparisonOperator(tag: any) {
    const matchResult = tag.match(
      /\b(eq|gt|gte|lt|lte|min|max|regexp|between_age|within|ne)\b/
    );
    if (matchResult) {
      return matchResult[0];
    }
    return null;
  }

  /**
   * @DynamicStruct This method used for the Get in String Format into Split
   * @example it make a string like this json:"efef" bson:"efef"  validate:"omitempty,min=4" in individual value
   * @ctrl This is Data TO split.
   */
  split_Struct(ctrl: any): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const operator = this.extractComparisonOperator(ctrl.tag);
      const validationKeywords = this.extractValidationKeywords(ctrl.tag);
      //json:"efef" bson:"efef"  validate:"omitempty,min=4"
      if (ctrl.tag.includes("required")) {
        ctrl.required = "yes";
      } else if (ctrl.tag.includes("omitempty")) {
        ctrl.required = "no";
      }

      const typeMapping: { [key: string]: string } = {
        string: "string",
        int: "number",
        int64: "number",
        float32: "number",
        float64: "number",
        bool: "boolean",
        "time.time": "Date",
      };

      const selectedType = ctrl.type;
      const selectedTypes = ctrl.type; //  "[]string"
      const arrayPart = selectedTypes?.replace(/[^[\]]+/g, ""); //  "[]"

      const cleanTypeString = selectedType?.replace("[]", "");
      if (arrayPart.includes("[]")) {
        ctrl.array_field = "yes";
      }

      if (cleanTypeString in typeMapping) {
        // const angularDataType = typeMapping[cleanTypeString];
        ctrl.select_field = "custom_datatype";
        ctrl.type = cleanTypeString;
      } else {
        ctrl.modelName = cleanTypeString;
        ctrl.select_field = "predefined";
      }

      if (operator) {
        ctrl.enumerate_validation = operator;
        const dynamicValueMatchResult = ctrl.tag.match(
          new RegExp(`${operator}=(\\d+)`)
        );
        if (dynamicValueMatchResult && dynamicValueMatchResult[1]) {
          const extractedValue = dynamicValueMatchResult[1];
          ctrl.validation = extractedValue;
        } else if (operator == "regexp") {
          const regexpMatchResult = ctrl.tag.match(/regexp=([^,]+)/);
          ctrl.validation = regexpMatchResult[1];
        }
      }
      const withinMatchResult = ctrl.tag.match(/within=(\d+)([ydmwYDMW])/);
      if (withinMatchResult && withinMatchResult[1] && withinMatchResult[2]) {
        const value = withinMatchResult[1];
        const unit = withinMatchResult[2];
        const withinValue = value + unit;
        ctrl.validation = withinValue;
      }

      //"json:"hh" bson:"hh"  validate:"required,min=5,max=10"
      const betweenAgeMatchResult = ctrl.tag.match(/between_age=(\d+)-(\d+)/);
      if (
        betweenAgeMatchResult &&
        betweenAgeMatchResult[1] &&
        betweenAgeMatchResult[2]
      ) {
        const value2 = betweenAgeMatchResult[2];
        ctrl.additional_input_advanced = value2;
      }
      const minMaxMatchResult = ctrl.tag.match(/min=(\d+).*max=(\d+)/);
      if (minMaxMatchResult && minMaxMatchResult[1] && minMaxMatchResult[2]) {
        const maxLimit = parseInt(minMaxMatchResult[2]);
        ctrl.enumerate_validation = "in_between";
        ctrl.additional_input_advanced = maxLimit;
      }

      resolve(ctrl);
    });
  }

  //#endregion

  /**
   * This method used load default values type
  // ? Format 
  "defaultValues": [
      {
        "colName": "status",
        "value": "Active",
        "type": "string"
      }
    ]
  */
  loadDefaultValues(defaultValues: any, formData: any, model: any) {
    if (!_.isArray(defaultValues)) {
      return;
    }
    //sync way
    defaultValues.map((obj: any) => {
      let totaVAlue = Object.assign({}, formData, model);
      if (obj["defaultValue"]) {
        formData[obj.colName] = obj["defaultValue"];
      }
      const valid = obj["expression"]
        ? expressionCheck(totaVAlue, obj["expression"])
        : true;
      if (valid) {
        this.pathFromValue(obj, formData, model);
      }
    });
  }

  private formatJsonFieldsForForm(model: any, fields: any[] = []): void {
    if (!model || !Array.isArray(fields)) return;
    fields.forEach((field: any) => {
      if (field?.fieldGroup?.length) {
        this.formatJsonFieldsForForm(model, field.fieldGroup);
      }
      if (!this.isJsonConfiguredField(field)) return;
      const key = field.key;
      const value = _.get(model, key);
      if (value === undefined || value === null || value === '') return;
      const parsed = this.parseStringifiedJson(value);
      _.set(model, key, JSON.stringify(parsed, null, 2));
    });
  }

  private parseJsonFieldsForSubmit(data: any, fields: any[] = []): any {
    if (!data || !Array.isArray(fields)) return data;
    const nextData = { ...data };
    fields.forEach((field: any) => {
      if (field?.fieldGroup?.length) {
        Object.assign(nextData, this.parseJsonFieldsForSubmit(nextData, field.fieldGroup));
      }
      if (!this.isJsonConfiguredField(field)) return;
      const key = field.key;
      const value = _.get(nextData, key);
      if (value === undefined || value === null || value === '') return;
      _.set(nextData, key, this.parseStringifiedJson(value));
    });
    return nextData;
  }

  private isJsonConfiguredField(field: any): boolean {
    const props = field?.props || {};
    return field?.type === 'json'
      || props?.type === 'json'
      || props?.dataType === 'json'
      || props?.valueType === 'json';
  }

  private parseStringifiedJson(value: any): any {
    let parsed = value;
    for (let index = 0; index < 3 && typeof parsed === 'string'; index += 1) {
      const trimmed = parsed.trim();
      if (!trimmed) return parsed;
      if (!/^[\[{"]/.test(trimmed)) return parsed;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return value;
      }
    }
    return parsed;
  }

  pathFromValue(obj: any, formData: any, model: any) {
    let val;
    if (obj.type == "date") {
      formData[obj.colName] = moment()
        .utc()
        .startOf("day")
        .add(obj.addDays || 0, "day")
        .format(obj.format || "yyyy-MM-DDT00:00:00.000Z");
    } else if (obj?.value && obj?.value?.startsWith("@")) {
      val = obj.value.slice(1);
      formData[obj.colName] = model[val];
    }
    // else if (obj.type == "exp") {
    //   if (obj.source == "local") {
    //     if (!obj.parse) {
    //       val = JSON.parse(sessionStorage.getItem(obj.value) || "");
    //       console.log("user update", val);

    //       if (obj?.array) {
    //         if (Array.isArray(val)) {
    //           formData[obj.colName] = obj?.index !== undefined ? val[obj.index] : val;
    //         } else {
    //           console.warn("Expected array for", obj.value, "but got:", typeof val);
    //         }
    //       } 
    //       let data = val[obj.object][obj.object1];
    //       formData[obj.colName] = data;
    //     } else if (obj.parse) {
    //       val = sessionStorage.getItem(obj.value);
    //       formData[obj.colName] = val;
    //     }
    //   }
    // }
    else if (obj.type === "exp") {
      if (obj.source === "local") {
        if (!obj.parse) {
          let raw = sessionStorage.getItem(obj.value);
          if (!raw) return;

          try {
            val = JSON.parse(raw);
            console.log("user update", val);

            if (obj?.array) {
              if (Array.isArray(val)) {
                formData[obj.colName] = obj?.index !== undefined ? val[obj.index] : val;
              } else {
                console.warn("Expected array for", obj.value, "but got:", typeof val);
              }
            } else if (obj.object && obj.object1) {
              let data = val?.[obj.object]?.[obj.object1];
              formData[obj.colName] = data;
            } else {
              formData[obj.colName] = val?.[obj.colName] ?? val;
            }
          } catch (e) {
            console.error("Failed to parse JSON for", obj.value, e);
          }

        } else {
          // If obj.parse is true
          val = sessionStorage.getItem(obj.value);
          formData[obj.colName] = val;
        }
      }
    }

    else if (obj.type == "prefix") {
      val = formData[obj.source];
      formData[obj.colName] = "SEQ|" + val;
    } else if (obj.type == "id") {
      const uuidWithoutHyphens = uuidv4().replace(/-/g, '');
      _.set(formData, obj.colName, uuidWithoutHyphens);
    } else {
      formData[obj.colName] = obj.value;
    }
  }

  //#region  //? Update other Collections
  updatemultilegalForm() { }

  updatelang(ctrl: any, refId: any) {
    let datas: any = {};
    this.dataService.save("user", datas).subscribe((res: any) => {
      console.log(res);
    });
  }

  // ? Sample JSON
  // "user": true,
  // "userAdd": [
  //   {
  //     "to_key": "name",
  //     "from_key": "model.managerName"
  //   },
  //   {
  //     "to_key": "_id",
  //     "from_key": "model.contactEmailId"
  //   },
  //   {
  //     "to_key": "role",
  //     "defaultValue": "Admin"
  //   },
  //   {
  //     "to_key": "contactMobileNumber",
  //     "from_key": "model.mobileNumber"
  //   }
  // ],
  updateuser(ctrl: any, parentResponse: any) {
    // if (ctrl.config["users"]) {
    //   // let parentid:any =refId.data['_id']
    //   let parentid: any = refId.data["_id"];

    //   Array(refId.users).forEach((res: any) => {
    //     if (res.exits) {
    //       res["refId"] = parentid;
    //       res["school_id"] = parentid;

    //       this.dataService
    //         .save("entities/user", datas)
    //         .subscribe((res: any) => {});
    //     }
    //   });
    //   return;
    // }

    let datas: any = {};
    datas["refId"] = parentResponse.data["insert ID"];
    this._dataManipulationService.processValues(ctrl, datas, ctrl.config["userAdd"]);

    this.dataService.save("entities/user", datas).subscribe((res: any) => {
      console.log(res);
    });
  }


  // ? Sample JSON
  // "user": true,
  // "userEdit": [
  //   {
  //     "to_key": "name",
  //     "from_key": "model.managerName"
  //   },
  //   {
  //     "to_key": "_id",
  //     "from_key": "model.contactEmailId"
  //   },
  //   {
  //     "to_key": "role",
  //     "defaultValue": "Admin"
  //   },
  //   {
  //     "to_key": "contactMobileNumber",
  //     "from_key": "model.mobileNumber"
  //   }
  // ],
  updateUserEdit(ctrl: any) {
    let datas: any = {};
    let updateEnpoint = ctrl.config["userEditEndpoint"] ?? "entities/user"
    this._dataManipulationService.processValues(ctrl, datas, ctrl.config["userEdit"]);
    let id = datas['_id'] ?? false
    if (!id) {
      this.dialogService.openSnackBar("Invalid Id")
      return
    }
    this.dataService.dataUpdate(updateEnpoint + "/" + id, datas).subscribe((res: any) => {
      console.log(res);
    });
  }

  //#endregion


  customErrChecker(data: any, ctrl: any): string | false {
    const config = ctrl?.config;
    if (config) {
      const flag = config['checkClassTimeing'] || false;
      if (!flag) return false;

      const classTiming = data['class_timing'];
      if (!Array.isArray(classTiming)) {
        return 'Invalid or missing Class Timing data';
      }

      const hasEnabledDay = classTiming.some((day: any) => day.isenabled === true);
      if (!hasEnabledDay) {
        return 'At least one day in Class Timing must be enabled';
      }
    }

    return false;
  }

}
