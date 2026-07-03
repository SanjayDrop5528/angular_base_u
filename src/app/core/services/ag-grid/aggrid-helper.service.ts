import { inject, Injectable } from '@angular/core';
import _ from 'lodash';
import moment from 'moment';
import { CurrencyPipe, TitleCasePipe, UpperCasePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { GoogleMapLinkService } from '../utils/google-map-link.service';
import { UtilsService } from '../utils/utils.service';
import { GridFormlyCellComponent } from '../../../modules/formly-control/components/formlygridsupport';
import { DataManipulatorService } from '../utils/data-manipulator-service.service';
import { environment } from '../../../../environments/environment';
import { expressionCheck } from '../../interfaces/filter-builder';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class AggridHelperService {

  private _mapService = inject(GoogleMapLinkService)
  private _utilsService = inject(UtilsService)
  private _transalteService = inject(TranslateService)
  private sanitizer = inject(DomSanitizer)
  private _dataManipulationService = inject(DataManipulatorService)
  // ? Overall Aggrid Formatter
  // ? cellClass : right algin ==> right / left algin ==> left
  aggridSetter(ctrl: any, key: any, custom: any = false) {
    const canTransalte = environment.transalte ?? false;
    let columnDefs = _.get(ctrl, key);
    let hasSynchronousChange = false;
    let columnLength = columnDefs?.length || 0;
    columnDefs?.forEach((e: any) => {
      if (e.field === 'Action' || e.field === 'actions' || e.cellRenderer === 'buttonRenderer') {
        e.width = e.width ?? 50;
        e.maxWidth = e.maxWidth ?? 50;
        e.minWidth = e.minWidth ?? 50;
        e.headerName = e.headerName ?? '';
        if (e.translatableHeaderName) {
          delete e.translatableHeaderName;
        }
        return;
      }
      if (canTransalte && _.hasIn(e, 'headerName')) {
        const gridHeader = _.get(e, 'context.translatableHeaderName', _.get(e, 'translatableHeaderName', _.get(e, 'headerName')))
        e.context = { ...(e.context || {}), translatableHeaderName: gridHeader };
        let keyName = _.get(e, 'context.translatableHeaderName')
        if (keyName == "") {
          keyName = "EMPTY"
        }
        const transaltedHeaderName = this._transalteService.instant(keyName) ?? false
        if (transaltedHeaderName && transaltedHeaderName !== keyName) {
          if (e.headerName !== transaltedHeaderName) {
            _.set(e, 'headerName', transaltedHeaderName);
            hasSynchronousChange = true;
          }
        } else {
          this._transalteService.get(keyName).subscribe((resVal) => {
            if (resVal && resVal !== keyName) {
              if (e.headerName !== resVal) {
                _.set(e, 'headerName', resVal);
                // Dynamic minWidth based on header length
                const headerName = _.get(e, 'headerName');

                let calculatedMinWidth = Math.max(
                  headerName.length * 12, // character width approximation
                  100 // minimum fallback width
                );
                if (_.isEmpty(headerName.trim())) {
                  calculatedMinWidth = 20
                }
                if (calculatedMinWidth > 0 && columnLength > 4) {
                  _.set(e, 'minWidth', calculatedMinWidth);
                  // _.set(e, 'maxWidth', calculatedMinWidth+50);
                  console.log(`TRANSALTE SERVICE Set minWidth for column '${headerName}' to ${calculatedMinWidth}px based on header length.`);
                }

                const currentDefs = _.get(ctrl, key);
                if (currentDefs) {
                  _.set(ctrl, key, [...currentDefs]);
                }
                if (ctrl?.gridApi) {
                  ctrl.gridApi.refreshHeader();
                }
              }
            }
          });
        }
      }

      // Dynamic minWidth based on header length
      const headerName = _.get(e, 'headerName');
      let calculatedMinWidth = Math.max(
        headerName.length * 12, // character width approximation
        100 // minimum fallback width
      );
      if (_.isEmpty(headerName.trim())) {
        calculatedMinWidth = 20
      }
      if (calculatedMinWidth > 0 && columnLength > 4) {
        _.set(e, 'minWidth', calculatedMinWidth);
        // _.set(e, 'maxWidth', calculatedMinWidth+50);
        console.log(`Set minWidth for column '${headerName}' to ${calculatedMinWidth}px based on header length.`);
      }

      if (e.type == "proportion") {
        e.valueGetter = (params: any) => {
          const total = _.get(params.data, "totalCount", 0);
          const completed = _.get(params.data, "completed_count", 0);
          return `${completed}/${total}`;
        };
      }

      if (e.type === "paymentAmount") {
        e.valueGetter = (params: any) => {
          if (!params.data) return '';
          const amt = params.data[e.field];
          const curr = params.data.currency || 'INR';
          if (amt === undefined || amt === null) return '';
          const symbols: { [key: string]: string } = {
            USD: '$',
            EUR: '€',
            GBP: '£',
            INR: '₹',
            JPY: '¥',
            AUD: 'A$',
            CAD: 'C$'
          };
          const currSym = symbols[curr.toUpperCase()] || curr;
          return `${currSym} ${Number(amt).toFixed(2)}`;
        };
      }

      if (e.type === "paymentDate") {
        e.valueGetter = (params: any) => {
          const val = params.data?.[e.field];
          if (!val) return '';
          return moment(val).local().format('DD/MM/YYYY hh:mm A');
        };
      }

      if (e.type === "json") {
        e.valueFormatter = (params: any) => this.formatJsonValue(params.value);
        e.tooltipValueGetter = (params: any) => this.formatJsonValue(params.value, true);
        e.cellStyle = {
          ...(typeof e.cellStyle === 'object' ? e.cellStyle : {}),
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        };
      }

      if (e.type == "datetime" || e.type == "date") {
        const dateFormat = e.format || "DD MMM YYYY";
        const dateTimeZone = e.timeZone;
        const customDate = e.custom_date;

        e.valueGetter = (params: any) => {

          if (customDate == "invoice") {
            return this.dateFormatter(params)
          }

          if (params.data && _.get(params.data, e.field)) {
            if (dateTimeZone) {
              return this.formatDateTimeForTimeZone(
                _.get(params.data, e.field),
                dateTimeZone,
                dateFormat
              );
            }
            return moment(_.get(params.data, e.field)).local().format(
              dateFormat
            );
          }
          return;
          return moment().format(e.format || "DD-MM-YYYY "); //? set curent date
        };
        delete e.type;
        delete e.format;
        delete e.timeZone;
        delete e.custom_date;
        return;
      }
      if (e.type === "timing") {
        e.valueGetter = (params: any) => {
          if (params.data && _.get(params.data, e.field)) {
            return moment(_.get(params.data, e.field)).local().format('HH:mm')
          }
          return ""
        };
      }



      if (e.type === "minsToHours") {
        e.valueGetter = (params: any) => {

          const status = _.get(params.data, "attendanceStatus");   // your key
          const mins = _.get(params.data, e.field);                 // timing value

          if (status !== "PRESENT") {
            return "";
          }

          if (!mins) {
            return "0 mins";
          }

          const hours = Math.floor(mins / 60);
          const minutes = mins % 60;

          if (hours === 0) {
            return `${minutes} mins`;
          }

          return `${hours} hrs ${minutes} mins`;
        };
      }


      if (e.rowdragtext) {
        e.rowDragText = (params: any, dragItemCount: any) => {
          if (dragItemCount > 1) {
            return dragItemCount + ' athletes';
          }
          return params.rowNode!.data.name;
        }
      }
      if (e.type == "name") {
        e.valueGetter = (params: any) => {
          return params.data["first_name"] + " " + params.data["last_name"]
        }
      }
      if (e.type == "parentEmail") {
        e.valueGetter = (params: any) => {
          console.log(params.data?.parent_details);
          if (params.data?.parent_details?.length > 0) {
            return params.data?.parent_details?.map((item: any) => item.email_id).join(", ");
          }
          else {
            return ""
          }
        }

      }
      if (e.type === "attendanceDate") {
        e.valueGetter = (params: any) => {
          console.log(params.data.attendanceStatus);

          let value = '';

          if ((params.data?.attendanceStatus || '').toLowerCase() === 'present') {
            value = params?.data?.sign_in;
          } else {
            value = params?.data?.absent_date;
          }

          return value
            ? moment(value).local().format(e.format || "DD MMM YYYY")
            : '';
        };
      }

      if (e.type === "dataSource") {
        e.cellRenderer = (params: any) => {
          const data = _.get(params.data, e.field) || null;
          if (data == 'm') {
            params.data = 'Manual Entry'
            return 'Manual Entry'
          } else if (data == 's') {
            return 'System Entry'
          }
          return

        }
      }
      if (e.type === "attendance") {
        e.cellRenderer = (params: any) => {
          // ✅ If it's a group row, render the icon using the group value
          if (params.node && params.node.group) {
            const status = params.value?.toLowerCase();
            if (status === 'present') {
              return `PRESENT`;
            } else if (status === 'absent') {
              return `ABSENT`;
            } else {
              return 'BLANK';
            }
          }


          // ✅ For normal (non-grouped) rows
          const data = _.get(params.data, e.field) || null;
          const statuses = Array.isArray(data) ? data : [data];

          return statuses
            .map((status: string) => {
              if (status?.toLowerCase() === 'present') {
                return `<i class="fa-solid fa-circle-check" style="color: #4caf50;"></i>`;
              } else if (status?.toLowerCase() === 'absent') {
                return `<i class="fa-solid fa-circle-xmark" style="color: #f44336;"></i>`;
              } else {
                return ``;
              }
            })
            .join(' ');
        };
      }





      if (e.type == "boolean") {
        if (e.type == "boolean") {
          e.cellRenderer = (params: any) => {
            return params?.value
              ? `<span style="color:#4caf50;font-size:1.2rem;">✔</span>`
              : `<span style="color:#bbb;font-size:1.2rem;">—</span>`;
          };
        }
      }

      if (e.type == "labelTemplate") {
        e.valueGetter = (params: any) => {
          let data = this.stringReplace(e.label, params.data)
          console.log(data);

          return data
        }
      }
      if (e.type == "count") {
        e.valueGetter = (params: any) => {
          let arr = params.data[e.field] || 0;
          return Array.isArray(arr) ? arr.length : arr
        }
      }
      if (e.type === 'images') {
        e.cellRenderer = (params: any) => {
          const data = _.get(params.data, e.field) || false;
          const values = (data && Array.isArray(data)) ? data : (data ? [data] : []);
          if (params.data && values.length > 0) {
            return values.map((img: any) => `
                          <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
                              <img 
                                  src="${environment.ImageBaseUrl + img['storage_name']}" 
                                  alt="Logo" 
                                  style="width: 64px; height: 63px;" 
                                  onerror="this.style.display='none'"
                              />
                          </div>
                      `).join('');
          }
          return '';
        };
      }
      if (e.type == "currency") {
        e.cellRenderer = (params: any) => {


          var parentValue: any = params.data?.[e?.parentkey]
          let rawValue = params.data?.[e.field]

          if (e.custom == "invoice") {
            if (!parentValue) {
              rawValue = 0
            }
          } else {
            if (parentValue) {
              rawValue = 0
            }
          }

          let formattedValue = new CurrencyPipe('en-IN').transform(rawValue, e.Currency_Code ?? 'INR');
          if (!formattedValue) {
            formattedValue = ''
          }
          return `
            <div style="display: flex; justify-content: flex-end; align-items: center; height: 100%;">
              <div style=" 
                color: black;
                padding: 4px 8px;
                border-radius: 4px;
                font-weight: 500;
                font-size: 13px;
              ">
                ${formattedValue}
              </div>
            </div>
          `;
        };
      }





      if (e.type == "comma") {
        // ? 10,000
        e.valueGetter = (params: any) => {
          if (params.data && params.data[e.field]) {
            let value = new CurrencyPipe('en-IN').transform(params.data[e.field], 'INR')
            return value?.slice(1, -3)
          }
          return
        }
      }
      if (e.type == "map") {
        e.cellRenderer = (params: any) => {
          let data = _.get(params.data, e.field)
          if (!Array.isArray(data)) return ``
          return this._mapService.getMapTag(data)
          // const latitude = data[0];
          // const longitude = data[1];
          // if (latitude == null || longitude == null) {
          //   console.error("NO DATA AVAILABLE");
          //   return "";  // Return a message if no data is available
          // }

          // // Call the method 'changetodegree' to convert the coordinates to the required format
          // const lat = this.getDMS(latitude, 'lat');
          // const long = this.getDMS(longitude, 'long');

          // // Generate the Google Maps link dynamically
          // const mapUrl = `https://www.google.com/maps/place/${latitude},${longitude}`;

          // // Return the anchor tag with the proper href
          // return `<a href="${mapUrl}" target="_blank">
          //               ${lat}, ${long}
          //             </a>`;
        };
      }
      //  ? Role Based Hide
      if (e.type == "role") {
        // ! know lock is Done
        if (e.value !== this._utilsService.getRole()) {
          e.lockVisible = true
          // lockVisible: true,
          e.hide = true

          // hide:true
        }
      }
      if (e.type == "color") {
        e.cellStyle = (params: any) => {
          return { color: "blue" };
        };
      }





      if (e.type == 'uppercase') {
        e.valueFormatter = (params: any) => {
          if (!params.value) return "";
          return `  ${new UpperCasePipe().transform(params.value)} `;
        }
      }
      if (e.type == 'titleCase') {
        e.valueFormatter = (params: any) => {
          if (!params.value) return "";
          return `  ${new TitleCasePipe().transform(params.value)} `;
        }
      }
      if (e.type == 'removeUnderScore') {
        e.valueFormatter = (params: any) => {
          if (!params.value) return "";
          let replacedString = params.value.replaceAll('_', ' ');
          return `  ${new UpperCasePipe().transform(replacedString)} `;
        }
      }
      if (e.type == 'numericColumn') {
        e.valueFormatter = (params: any) => {
          if (params.value === undefined || params.value === null || params.value === '') return "";
          const num = Number(params.value);
          if (isNaN(num)) return params.value;
          return num.toLocaleString('en-US');
        }
      }
      if (e.type == 'compactNumber') {
        e.valueFormatter = (params: any) => {
          if (params.value === undefined || params.value === null || params.value === '') return "";
          const num = Number(params.value);
          if (isNaN(num)) return params.value;
          return new Intl.NumberFormat('en', {
            notation: 'compact',
            maximumFractionDigits: 1,
          }).format(num);
        }
      }
      if (e.type == "description") {
        e.cellRenderer = (params: any) => {
          const div = document.createElement('div');
          div.innerHTML = params.value;
          return div;
        };
        // e.cellRenderer = (params: any) => this.renderHtml(params.value)
      }

      if (e.field == "status" && !_.hasIn(e, 'type')) {
        e.cellRenderer = (params: any) => this.gridStatusChange(params.value)

      }




      if (e.type === "combineBox") {
        e.cellRenderer = (params: any) => {
          return this.ShowAsBoxcombined(params, e)
        }
      }

      if (e.type === "singleBox") {
        e.cellRenderer = (params: any) => {
          return this.ShowAsBox(params, e)
        }
      }

      if (e.type === "mobile") {
        e.cellRenderer = (params: any) => {
          return this.showMobileWithIcon(params, e)
        }
      }
      if (e.type === "email") {
        e.cellRenderer = (params: any) => {
          return this.showEmailWithIcon(params, e)
        }
      }


      if (e.type === "profileWithImage") {
        e.cellRenderer = (params: any) => {
          return this.profileImageWithEmailID(params, e)
        }
      }
      if (e.type === "userProfile") {
        e.cellRenderer = (params: any) => {
          return this.userProfile(params, e)
        }
        if (e.showHoverCard) {
          e.cellClass = e.cellClass ? `${e.cellClass} profile-cell` : 'profile-cell';
        }
      }



      if (e.type === "checkbox_selection") {
        e.checkboxSelection = (params: any) => {
          const payment_status = (params.data.payment_status as string)?.toLowerCase();
          // const allowedStatuses = ['due', 'reject', 'pending']; 
          const allowedStatuses = ['due', 'reject'];
          // Only show checkbox if status is in allowedStatuses
          return allowedStatuses.includes(payment_status);
        };
      }
      if (e.type === "arrayMerge") {
        console.log("ashok");

        e.cellRenderer = (params: any) => {
          const data = params.data?.[e.field];
          const mappedField = e.mapFeild || '';

          console.log("ashok", data);
          console.log(mappedField);

          if (!data || !mappedField) {
            return '';
          }

          // Handle array case
          if (Array.isArray(data)) {
            console.log("ashok - array case", data, mappedField);
            return data.map(item => item?.[mappedField]).filter(Boolean).join(', ');
          }

          // Handle single object case
          if (typeof data === 'object' && data[mappedField]) {
            console.log("ashok - single object case", data, mappedField);
            return data[mappedField];
          }

          return '';
        };
      }
      if (e.type === "checkbox_selection_not_paid") {
        e.checkboxSelection = (params: any) => {
          const payment_status = (params.data.payment_status as string)?.toLowerCase();
          const allowedStatuses = ['verification_pending', 'reject', 'pending', 'paid'];
          // const allowedStatuses = ['paid'];
          // const allowedStatuses = ['reject',null,''];
          // console.log("payment_status", payment_status);

          // Only show checkbox if status is in allowedStatuses
          // return !allowedStatuses.includes(payment_status);
          return !allowedStatuses.includes(payment_status);

        };
      }

      if (e.type === "activeArchived") {
        e.cellRenderer = (params: any) => {
          const isActive = params.value === true || params.value === 'true' || params.data?.is_active === true || params.data?.isActive === true;
          const bg = isActive ? '#e8f0fe' : '#f1f3f4';
          const fg = isActive ? '#0b57d0' : '#5f6368';
          const text = isActive ? 'Active' : 'Archived';
          const dot = isActive ? '<span style="color:#0b57d0; margin-right:6px; font-size:14px; font-weight:bold;">•</span>' : '';
          return `
            <div class="h-100 center" style="display:flex; align-items:center;">
              <div style="background-color: ${bg}; color:${fg}; border-radius: 100px; padding: 2px 10px; font-weight: 500; font-size: 12px; display: flex; align-items: center; line-height: 1;">
                ${dot}${text}
              </div>
            </div>
          `;
        };
      }

      if (e.type === "versionName") {
        e.cellRenderer = (params: any) => {
          if (!params.data) return '';
          const isLatest = params.node.rowIndex === 0;
          const floatVal = parseFloat(params.value);
          const formattedVal = isNaN(floatVal) ? params.value : floatVal.toFixed(1);
          const val = 'v' + formattedVal;
          if (isLatest) {
            return `<span style="color:#0284c7; font-weight:700;">${val}</span>`;
          } else {
            return `
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="material-icons" style="font-size:16px; color:#9ca3af; line-height: 1;">history</span>
                <span style="color:#4b5563; font-weight:500;">${val}</span>
              </div>
            `;
          }
        };
      }

      if (e.type === "versionActions") {
        e.cellRenderer = (params: any) => {
          const isSelected = params.node && params.node.isSelected && params.node.isSelected();
          const compareColor = isSelected ? '#0284c7' : '#9ca3af';
          return `
            <div style="display:flex; gap:16px; align-items:center; height:100%; font-size: 20px; justify-content: flex-start;">
              <span class="material-icons action-icon-btn eye-btn" data-action="view" style="cursor:pointer; color:#9ca3af; transition:color 0.2s;" title="View Live Template">visibility</span>
              <span class="material-icons action-icon-btn compare-btn" data-action="compare" style="cursor:pointer; color:${compareColor}; transition:color 0.2s;" title="Compare Selection">swap_horiz</span>
              <span class="material-icons action-icon-btn restore-btn" data-action="restore" style="cursor:pointer; color:#9ca3af; transition:color 0.2s;" title="Restore/Rollback Version">restore</span>
            </div>
            <style>
              .action-icon-btn:hover {
                color: #0284c7 !important;
              }
            </style>
          `;
        };
      }

      if (e.type === "statusColor") {
        const statusColorConfig = {
          ...e,
          backgroundColor: _.cloneDeep(e.backgroundColor),
          textColor: _.cloneDeep(e.textColor)
        };
        e.cellRenderer = (params: any) => {
          return this.statusColor(params, statusColorConfig)
        }
        e.cellClass = e.cellClass ? `${e.cellClass} center-cell` : 'center-cell';
      }
      if (e.type === "status") {
        e.cellRenderer = (params: any) => {
          return this.statusChipRenderer(params, e)
        }
        e.cellClass = e.cellClass ? `${e.cellClass} center-cell` : 'center-cell';
      }
      if (e.type === "ratings") {
        e.cellRenderer = (params: any) => {
          return this.ratingsRenderer(params, e)
        }
      }



      if (e.type === "payment_type") {
        e.cellRenderer = (params: any) => {
          return this.PaymentTypeStatus(params, e)
        }
      }

      if (e.custom_type === "payment_type") {
        e.cellRenderer = (params: any) => {
          return this.PaymentTypeStatus(params, e)
        }
      }





      if (e.type == "set_Filter" && e.filter == "agSetColumnFilter") {
        if (e.Diffkey == true) {
          e.filterParams = {
            values: (params: any) => {
              let filter: any = {
                start: 0,
                end: 1000,
                filter: ctrl.filterQuery,
              }
              if (ctrl.allFilter !== undefined) {
                filter = ctrl.allFilter;
              }
              ctrl.DataService.getDataByFilter(ctrl.collectionName, filter).subscribe((xyz: any) => {
                const apidata = xyz.data[0].response;
                const uniqueArray = Array.from(
                  new Map(apidata.map((obj: any) => [obj[e.field], obj])).values()
                );
                params.success(uniqueArray);
              });
            },
            keyCreator: (params: any) => {
              return [params.value[e.keyCreator], e.keyCreator, true];
            },
            valueFormatter: (params: any) => {
              return params.value[e.field];
            },
          };
        } else {
          e.filterParams = {
            values: (params: any) => {
              let filter: any = {
                start: 0,
                end: 1000,
                filter: ctrl.filterQuery,
              }
              if (ctrl.allFilter !== undefined) {
                filter = ctrl.allFilter;
              }
              ctrl.DataService.getDataByFilter(ctrl.collectionName, filter).subscribe((xyz: any) => {
                const apidata = xyz.data[0].response
                  .map((result: any) => {
                    let val = result[e.field];
                    if (val !== undefined) {
                      return val;
                    }
                  })
                  .filter((val: any) => val !== undefined); // Filter out undefined values
                params.success(apidata);
              });
            },
          };
        }
      }
      //if the object in nested array
      if (e.type == "set_Filter" && e?.filter == "agSetColumnFilter" && e?.object_type == "nested_array") {
        ;
        e.filterParams = {
          values: (params: any) => {
            let filter: any = {
              start: 0,
              end: 1000,
              filter: ctrl.filterQuery,
            }
            if (ctrl.allFilter !== undefined) {
              filter = ctrl.allFilter;
            }
            ctrl.DataService.getDataByFilter(ctrl.collectionName, filter).subscribe((xyz: any) => {
              const apidata = xyz.data[0].response
                .map((result: any) => {
                  //let val = result[e.field];
                  let val = e.field
                    .split(".")
                    .reduce((o: any, i: any) => o[i], result);
                  if (val !== undefined) {
                    return val;
                  }
                })
                .filter((val: any) => val !== undefined); // Filter out undefined values
              params.success(apidata);
            });
          },
        };
      }



















      //  ? Ag grid Ts Formly-form Config Done Below 
      if (!e.cellRendererChange && custom) {
        e.cellRenderer = GridFormlyCellComponent;
        e.wrapText = true;
        ctrl.fieldMap[e?.field] = ''
      }

      if (_.hasIn(e, 'hide')) {
        e.hide = hideExpression(ctrl, e.hide)
      }
      // if (_.hasIn(e, 'defaultValue')) {
      //   ctrl.fieldMap[e?.field] = e?.defaultValue
      // }
      if (_.hasIn(e, 'defaultValue')) {
        ctrl.fieldMap = ctrl.fieldMap || {};
        ctrl.fieldMap[e?.field] = e?.defaultValue;
      }


      //? validate :"past"
      if (e?.['validate'] == "past") {
        e.cellEditorParams = function (params: any) {
          let min = moment().format('YYYY-MM-DD')
          console.log(min);
          return {
            min: min,
          }
        }
      }
      //? validate :"past"

      if (e?.['validate'] == "basedondata") {
        e.cellEditorParams = function (params: any) {
          const minValue = 0;
          const maxValue = e['maxvalueKey'] ? _.get(params, e['maxvalueKey']) : params.data.checkData.available_stock;
          return {
            min: minValue,
            max: maxValue,
          }
        }
      }


      /* 
      ?  "customevalueSetter": true,
      ?  COnfig []
                "config":[
                  { "from_key": "newValue.product_batch_number", "to_key": "data.batch_number" },
                  { "from_key": "newValue.product_name", "to_key": "data.checkData.product_name" },
                  { "from_key": "newValue.available_stock", "to_key": "data.checkData.available_stock" },
                  { "from_key": "newValue.product_expiry_date", "to_key": "data.product_expiry_date" }
                  ],
      */

      if (e['cellEditorParams']?.['customevalueSetter']) {
        console.warn("customevalueSetter", e);

        e.valueSetter = (params: any) => {

          //  if(Object.hasOwn(e,'cellEditorParams.config')){
          if (_.hasIn(e, 'cellEditorParams.config')) {
            this._dataManipulationService.processValues(params, params, e['cellEditorParams'].config);
            // params.api.
          }
          console.log(params);

          return true;
        }
        e.valueFormatter = (params: any) => {
          if (_.hasIn(params, e?.['cellEditorParams']?.['valueFromatterKey'])) {
            return _.get(params, e?.['cellEditorParams']?.['valueFromatterKey']) || '';
          }
          return ''
        }

      }

      if (e.type) {
        delete e.type
      }
      if (e.translatableHeaderName) {
        delete e.translatableHeaderName
      }
      if (e.format) {
        delete e.format
      }
      if (e.timeZone) {
        delete e.timeZone
      }
      if (e.backgroundColor) {
        delete e.backgroundColor
      }
      if (e.textColor) {
        delete e.textColor
      }

      if (e.cellRendererChange) {
        delete e.cellRendererChange
      }
      if (e.autocomple) {
        delete e.autocomple
      }
      if (e?.['validate']) {
        delete e?.['validate']
      }
    });
    if (hasSynchronousChange) {
      _.set(ctrl, key, [...columnDefs]);
      if (ctrl?.gridApi) {
        ctrl.gridApi.refreshHeader();
      }
    }
    const hideExpression = expressionCheck
  }

  private formatDateTimeForTimeZone(value: any, timeZone: string, format: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    if (format === 'DD MMM YYYY hh:mm A') {
      return new Intl.DateTimeFormat('en-IN', {
        timeZone,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date);
    }

    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).formatToParts(date);

    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value ?? '';

    const replacements: Record<string, string> = {
      DD: part('day'),
      MMM: part('month'),
      YYYY: part('year'),
      hh: part('hour'),
      mm: part('minute'),
      A: part('dayPeriod').toUpperCase()
    };

    return format.replace(/YYYY|MMM|DD|hh|mm|A/g, (token) => replacements[token] ?? token);
  }

  private formatJsonValue(value: any, pretty = false): string {
    if (value === undefined || value === null || value === '') return '';
    const parsed = this.parseStringifiedJson(value);
    if (typeof parsed === 'string') {
      return pretty ? parsed : parsed.replace(/\s+/g, ' ').trim();
    }
    try {
      const formatted = JSON.stringify(parsed, null, pretty ? 2 : 0);
      return pretty ? formatted : formatted.replace(/\s+/g, ' ').trim();
    } catch {
      return `${value}`.replace(/\s+/g, ' ').trim();
    }
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

  ShowAsBoxcombined(params: any, columnDef: any) {
    if (params.data) {
      const field = params.data[columnDef.field];
      const field1 = params.data[columnDef?.field1];
      const field2 = params.data[columnDef?.field2];
      const field1Label = columnDef?.field1Label;
      const field2Label = columnDef?.field2Label;
      return `<div class="productCell">
        <div>
                <div>${field || ""}</div>
                <div>
                        <div style="background-color: #a3b5e2;color:white" class="stockCell"><span
                                        style="font-weight:bold">${field1Label}:</span> ${field1 || ""}</div>
                        <div style="background-color: #66752c;color:#ffffff" class="stockCell"><span
                                        style="font-weight:bold">${field2Label}:</span> ${field2 || ""}</div>
                </div>
        </div>
</div>
<style>
        .productCell {
                height: 100%;
                display: flex;
                flex-direction: row;
        }

        .productCell div:first-child {
                font-weight: 500;
        }

        .productCell div {
                padding-bottom: 0;
                line-height: 1.5;
        }

        .stockCell {
                width: fit-content;
                border: 1px solid #c0c0c057;
                border-radius: 6px;
                padding-top: 2px;
                margin-top: 4px;
                padding-right: 4px;
                padding-left: 4px;
                font-size: 13px;
        }
</style>
`;
    }
    return "";
  }
  ShowAsBox(params: any, columnDef: any) {
    if (params.data) {
      const field = params.data[columnDef.field];
      const field1 = params.data[columnDef?.field1];
      const field1Label = columnDef?.field1Label;

      return `<div>
        <div>
                <div>${field || ""}</div>
                <div class="productCell">
                        <div style="background-color: #a3b5e2;color:white" class="stockCell"><span
                      style="font-weight:bold">${field1Label} :</span> ${field1 || ""}</div>

                </div>
        </div>
</div>
<style>
        .productCell {
                height: 100%;
                display: flex;
                flex-direction: row;
        }


        .productCell div:first-child {
                font-weight: 500;
        }

        .productCell div {
                padding-bottom: 0;
                line-height: 1.5;
        }

        .stockCell {
                background-color: var(--color-bg-secondary);
                color: var(--color-text-secondary);
                width: fit-content;
                border: 1px solid #c0c0c057;
                border-radius: 6px;
                padding-top: 2px;
                margin-top: 4px;
                padding-right: 4px;
                padding-left: 4px;
                font-size: 12px;
        }
</style>
`;
    }
    return "";
  }
  showMobileWithIcon(params: any, columnDef: any) {
    if (params.data) {
      const field = params.data[columnDef.field];
      if (field) {
        return `
<div style="display:flex">
<img src="assets/images/mobile3.png" style="margin-right:5px;margin-top:11px" height="18px width="18px">
<span>${field || ""}</span></div>
`;
      }
    }
    return "";
  };
  showEmailWithIcon(params: any, columnDef: any) {
    if (params.data) {
      const field = params.data[columnDef.field];

      if (field) {
        return `
        <div style="display:flex">
       <img src="assets/images/email.png" style="margin-right:3px;margin-top:13px" height="15px width="15px">
       <span>${field || ""}</span></div>
        `;
      }
      return "";

    }
    return "";
  }
  /*
  config :[
    { status: "Pending", color: "yellow" },
    { status: "Approved", color: "green" },
    { status: "Rejected", color: "red" },
    { status: "Shipped", color: "purple" }
  ]
      */
  findColorBasedOnStatus(value: any, config: { status: string; color: string }[], defaultColor: any = "blue") {

    if (_.isEmpty(config) || value == undefined) {
      return defaultColor;
    }
    for (const item of config) {
      if (item.status.toLowerCase() === value.toLowerCase()) {
        defaultColor = item.color;
        break;
      }
    }

    return defaultColor;
  }

  findPaymentStatus(value: any, config: any) {
    // if (Array(config).length > 0) {
    const matched = config.filter((item: any) => {
      return item.value?.toString()?.toLowerCase() === value?.toString()?.toLowerCase();
    });
    return matched[0]?.label
    // }
    // return ''

  }

  // ? SAMPLE
  // {
  //   "headerName": "Status",
  //   "field": "status",
  //   "backgroundColor": {
  //     "defaultColor":"red",
  //     "config": [
  //       {
  //         "status": "Pending",
  //         "color": "yellow"
  //       } 
  //     ]
  //   }, "textColor": {
  //     "defaultColor":"red",
  //     "config": [
  //       {
  //         "status": "Pending",
  //         "color": "yellow"
  //       } 
  //     ]
  //   },






  statusColor(params: any, columnDef: any) {
    if (params.data) {
      const rawValue = params.data[columnDef.field];
      const statusValue = (rawValue !== undefined && rawValue !== null) ? rawValue.toString().toLowerCase() : '';
      const backgroundColor = this.findColorBasedOnStatus(statusValue, _.get(columnDef, 'backgroundColor.config'), _.get(columnDef, 'backgroundColor.defaultColor', "white"))
      const color = this.findColorBasedOnStatus(statusValue, _.get(columnDef, 'textColor.config'), _.get(columnDef, 'textColor.defaultColor', "black"))
      const statusLabels: Record<string, string> = {
        "new": "New",
        "under_review": "Under Review",
        "doctor_assigned": "Doctor Assigned",
        "report_ready": "Report Ready",
        "closed": "Closed",
        "pending_payment": "Pending Payment",
        "pending": "Pending",
        "initiated": "Initiated",
        "failed": "Failed",
        "success": "Completed",
        "completed": "Completed",
        "true": "Paid",
        "false": "Unpaid"
      };
      const iconMap: Record<string, string> = {
        "new": "fiber_new",
        "under_review": "rate_review",
        "doctor_assigned": "person",
        "report_ready": "description",
        "closed": "check_circle",
        "pending_payment": "schedule",
        "pending": "schedule",
        "initiated": "schedule",
        "failed": "cancel",
        "success": "check_circle",
        "completed": "check_circle",
        "true": "payments",
        "false": "cancel",
        "active": "check_circle",
        "inactive": "cancel",
        "approved": "check_circle",
        "rejected": "cancel",
        "hold": "pause_circle",
        "draft": "edit_note"
      };
      const statusKey = statusValue ? `NOTIFICATION_MODULE.LOG_STATUS.${statusValue.toUpperCase()}` : '';
      const translatedStatus = statusKey ? this._transalteService.instant(statusKey) : '';
      let data = translatedStatus && translatedStatus !== statusKey
        ? translatedStatus
        : (statusLabels[statusValue] || this.capitalizeFirstLetter(statusValue.replace(/_/g, ' ')));
      let icon = iconMap[statusValue] || "help_outline";
      return `
                    <div class="h-100 center">
                    <div  style="background-color: ${backgroundColor};color:${color}" class="stockCell1">
                      <span class="material-icons" style="font-size: 16px; margin-right: 4px; display: flex; align-items: center;">${icon}</span>
                      ${data || ""}
                    </div>
                    </div>
                      <style>
                        .stockCell1 {
                        border-radius: 100px;
                        padding-left: 8px !important;
                        padding-right: 12px;
                        height:26px;
                        line-height: 2;
                        font-weight: 500;
                        border: 1.5px solid rgba(91, 91, 91, .1);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        text-align :center
                        }
                      </style>
              `;
    }
    return "";
  }

  statusChipRenderer(params: any, columnDef: any) {
    if (params.data) {
      const rawValue = params.data[columnDef.field];
      const statusValue = (rawValue !== undefined && rawValue !== null) ? rawValue.toString().toLowerCase() : '';

      let displayText = rawValue;
      if (statusValue === 'true' || statusValue === 'active') {
        displayText = 'Active';
      } else if (statusValue === 'false' || statusValue === 'inactive') {
        displayText = 'Inactive';
      } else if (statusValue.includes('_')) {
        displayText = statusValue.split('_')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      } else {
        displayText = this.capitalizeFirstLetter(statusValue);
      }

      if (!columnDef?.noTranslate) {
        const statusKey = statusValue ? `NOTIFICATION_MODULE.LOG_STATUS.${statusValue.toUpperCase()}` : '';
        const translatedStatus = statusKey ? this._transalteService.instant(statusKey) : '';
        if (translatedStatus && translatedStatus !== statusKey) {
          displayText = translatedStatus;
        }
      }

      return `
        <div class="h-100 center" style="display: flex; align-items: center; justify-content: center; width: 100%;">
          <div class="status-chip status-${statusValue}">${displayText || ""}</div>
        </div>
      `;
    }
    return "";
  }

  ratingsRenderer(params: any, columnDef: any) {
    if (params.data) {
      const val = params.data[columnDef.field];
      const rating = (val !== undefined && val !== null) ? Number(val) : 0;
      const outOf = columnDef.outof ? Number(columnDef.outof) : 5;
      const viewType = columnDef.viewtype || 'number';

      if (viewType === 'star' || viewType === 'stars') {
        let starsHtml = '<div style="display: flex; align-items: center; gap: 2px;">';
        for (let i = 1; i <= outOf; i++) {
          if (rating >= i) {
            starsHtml += `<span class="material-icons" style="color: #fbbf24; font-size: 18px; line-height: 1;">star</span>`;
          } else if (rating > i - 1 && rating < i) {
            starsHtml += `<span class="material-icons" style="color: #fbbf24; font-size: 18px; line-height: 1;">star_half</span>`;
          } else {
            starsHtml += `<span class="material-icons" style="color: #d1d5db; font-size: 18px; line-height: 1;">star_border</span>`;
          }
        }
        starsHtml += '</div>';
        return starsHtml;
      } else {
        return `
          <div style="display: flex; align-items: center; font-weight: 500;">
            <span style="font-size: 13px; color: inherit;">${rating.toFixed(1)}</span>
            <span style="font-size: 11px; color: #9ca3af; margin-left: 3px;">/ ${outOf}</span>
          </div>
        `;
      }
    }
    return "";
  }



  PaymentTypeStatus(params: any, columnDef: any) {
    if (params.data) {
      const parentkey = params.data[columnDef?.parentkey];
      const statusValue = params.data[columnDef.field];
      if (!parentkey) {
        return val
      }
      var val: any = this.findPaymentStatus(statusValue, columnDef.options)

      const status = val?.toLowerCase();
      if (columnDef?.custom_type != 'payment_type') {
        return val
      }

      // switch (status) {
      //   case 'paid':
      //     return 'row-paid';
      //   case 'due':
      //     return 'row-due';
      //   case 'pending':
      //     return 'row-pending';
      //   default:
      //     return '';
      // }

      let color = '';
      let background = '';
      switch (status) {
        case 'paid':
          color = '#4CAF50';

          break;
        case 'due':
          color = '#F44336';
          break;
        case 'pending':
          color = '#FF9800';
          break;
        default:
          color = '#000'; // Default text color
          break;
      }

      return `
        <div style="
          display: flex; 
          align-items: center;
          height: 100%;
          padding-right: 8px;
          white-space: normal;
          word-wrap: break-word;
          text-align: right;
        ">
          <div style="
            color: ${color};
            // text-transform: uppercase;
            font-weight: bold;
            max-width: 100%;
            word-break: break-word;
          ">
            ${val}
          </div>
        </div>
      `;


    }
    return "";

  }
  // ? SAMPLE
  //    {
  //   "headerName": "Name",
  //   "field": "name",
  //   "emailId":"emailId",
  //   "profileImg":"profileImg",
  //   "type":"profileWithImage",
  //   "filter": "agTextColumnFilter"
  // }
  profileImageWithEmailID(params: any, columnDef: any) {

    if (params.data) {
      let name = params.data[columnDef.field];
      if (columnDef.name) name = this.stringReplace(columnDef.name, params.data)
      const emailId = params.data[columnDef?.emailId];
      // const lastName = params.data[columnDef?.lastName];
      const profileImg = params.data[columnDef?.profileImg];
      const imageSrc = profileImg
        ? profileImg
        : "assets/images/profile_pic.svg";

      return `
      <div class="productCell">
        <div class="profile">
          <img src="${imageSrc}"[alt]="image" />
        </div>
        <div>
          <div>${name || ""}</div>
          <div class="stockCell">${emailId || ""}</div>
        </div>
      </div>

  <style>
  .productCell {
      height: 100%;
      display: flex;
      gap:10px;
      flex-direction: row;
  }

  .profile {
      max-width: 100%;
      max-height: 100px;
      background-color: rgba(201, 201, 201, 0.2);
      border-radius: 8px; 
  }

  .profile img {
      width: 60px;
      height: -webkit-fill-available;
  }

  .productCell div:first-child {
      font-weight: 500;
  }

  .productCell div {
      padding-bottom: 0;
      line-height: 1.5;
  }

  .productCell img {
      border-radius: 8px;
  }

  .stockCell {
      background-color: #a3b5e2;
      color: white;
      width: fit-content;
      border: 1px solid #c0c0c057;
      border-radius: 6px;
      padding-top: 2px;
      margin-top: 4px;
      padding-right: 4px;
      padding-left: 4px;
      font-size: 13px;
  }

  </style>
`;
    }
    return "";
  }

  userProfile(params: any, columnDef: any) {
    if (!params.data) {
      return '';
    }

    const name = params.data[columnDef.field] || '';
    const firstLetter = name.charAt(0).toUpperCase();
    const initials = name.split(' ').map((n: string) => n.charAt(0)).join('').toUpperCase().slice(0, 2);
    const profileImage = columnDef.profileImageField ? params.data[columnDef.profileImageField] : null;

    let imageUrl = '';
    if (profileImage) {
      if (profileImage.startsWith('data:')) {
        imageUrl = profileImage;
      } else {
        const folder = columnDef.folder || 'doctor_profiles';
        const basePath = environment.ImageBaseUrl && environment.ImageBaseUrl.endsWith('/')
          ? environment.ImageBaseUrl
          : ((environment.ImageBaseUrl || '') + '/');
        imageUrl = basePath + profileImage;

      }
    }

    // Assign light google/pastel theme background and dark text color
    const colors = ['#e6fffa', '#fffaf0', '#ebf8ff', '#f0fdf4', '#fff5f5', '#faf5ff'];
    const textColors = ['#0d9488', '#dd6b20', '#3182ce', '#16a34a', '#e53e3e', '#7c3aed'];
    const charCodeSum = name.split('').reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
    const bg = colors[charCodeSum % colors.length];
    const fg = textColors[charCodeSum % textColors.length];

    return `
<div style="
  display:flex;
  align-items:center;
  gap:10px;
  height:100%;
">
  <div
    class="profile-preview-wrapper"
    style="
      width:36px;
      height:36px;
      border-radius:50%;
      position:relative;
      display:flex;
      align-items:center;
      justify-content:center;
      overflow:visible;
      cursor:pointer;
    "
  >
    ${profileImage ? `
      <img
        src="${imageUrl}"
        style="
          width:100%;
          height:100%;
          object-fit:cover;
          border-radius:50%;
        "
      />

      ${columnDef.showHoverCard ? `
        <div
          class="profile-preview-popup"
          style="
            position:absolute;
            top:45px;
            left:0;
            width:180px;
            height:180px;
            background:#fff;
            border-radius:12px;
            padding:4px;
            box-shadow:0 8px 24px rgba(0,0,0,0.15);
            opacity:0;
            visibility:hidden;
            transition:all .3s ease;
            z-index:9999;
          "
        >
          <img
            src="${imageUrl}"
            style="
              width:100%;
              height:100%;
              object-fit:cover;
              border-radius:10px;
            "
          />
        </div>
      ` : ''}
    ` : `
      <div
        style="
          width:100%;
          height:100%;
          border-radius:50%;
          background:${bg};
          color:${fg};
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight:600;
          font-size:12px;
        "
      >
        ${initials || firstLetter}
      </div>
    `}
    ${params.data.status ? `
      <span class="status-indicator-dot" style="
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 2px solid var(--bg-card, #fff);
background-color: ${['active', 'approved'].includes(params.data.status?.toLowerCase())
          ? '#22c55e'
          : ['inactive', 'rejected'].includes(params.data.status?.toLowerCase())
            ? '#ef4444'
            : ['pending', 'pending approval'].includes(params.data.status?.toLowerCase())
              ? '#f59e0b'
              : '#94a3b8'
        };        z-index: 10;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      "></span>
    ` : ''}
  </div>

  <span style="font-weight:500;color:inherit;">
    ${name}
  </span>
</div>
`;
  }
  renderHtml(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }

  gridStatusChange(value: string): string {
    const statusMap: Record<string, string> = {
      a: "Active",
      i: "Inactive",
      active: "Active",
      inactive: "Inactive",
    };
    return statusMap[value?.toLowerCase()] || value;
  }


  // Check for empty string or null
  capitalizeFirstLetter(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // "name":"{{first_name}} {{last_name}}",
  stringReplace(str: string, data: any): string {
    return str.replace(/{{(\w+)}}/g, (_match, field) => {
      const value = _.get(data, field);

      return value !== undefined && value !== null ? value : "";
    });
  }
  // dateFormatter(params: any): string {
  //   var paymentdata: any = params?.data[params.colDef.field]
  //   if (!paymentdata) return '';
  //   // if (params?.data?.payment_status == null || params?.data?.payment_status == undefined) {
  //   //   return ''
  //   // } 
  //   console.log("paymentdata", paymentdata);

  //   const date = new Date(paymentdata);
  //   const options: Intl.DateTimeFormatOptions = {
  //     month: 'short',
  //     year: 'numeric'
  //   };
  //   return date.toLocaleDateString('en-GB', options); // "Jan 2025"
  // }

  dateFormatter(params: any): string {
    const paymentdata = params?.data?.[params.colDef.field];
    if (!paymentdata) return '';

    // Make sure it’s a valid date string or Date object
    const date = new Date(paymentdata);
    if (isNaN(date.getTime())) return ''; // Invalid date check

    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'  // ✅ IMPORTANT
    };

    // Use toLocaleDateString with en-GB for "Jan 2025" output
    return date.toLocaleDateString('en-GB', options);
  }

}
