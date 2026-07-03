import { Component, OnInit, Input, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { CommonModule } from "@angular/common";
import { TranslateModule } from "@ngx-translate/core";
import { Observable } from "rxjs";
import { RowModelType } from "ag-grid-community";
import * as _ from "lodash";

import { CoreGrid } from "../../../shared/components/core-grid/core-grid";
import { DataService } from "../../../../core/services/data.service";
import { FilterService } from "../../../../core/services/utils/filter.service";
import { environment } from "../../../../../environments/environment";

@Component({
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    CoreGrid,
  ],
  selector: "app-datatable",
  templateUrl: "./datatable.component.html",
  styleUrls: ["./datatable.component.css"],
})
export class DatatableComponent implements OnInit {
  listName!: string;
  config: any;
  collectionName!: string;

  @Input("mode") mode: string = "page";

  private route = inject(ActivatedRoute);
  private DataService = inject(DataService);
  private _filterService = inject(FilterService);

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this._filterService.getPramsFromParent(this.route.snapshot.params, this.route.snapshot.queryParams);
      if (params["form"]) {
        this.listName = params["form"];
        this.loadConfig();
      }
    });
  }

  loadConfig() {
    this.DataService.loadListConfigJson(this.listName).subscribe(
      (config: any) => {
        this.config = config;
        this.collectionName = config.collectionName || this.listName;
      }
    );
  }

  get rowModelType(): RowModelType {
    return (this.config?.rowModelType || environment?.rowModelType || 'serverSide') as RowModelType;
  }

  apihandler = (gridFilter: any, gridSort: any, start: any, end: any): Observable<any> => {
    const filtercondition: any = { start, end, filter: gridFilter, sort: gridSort };

    if (this.config?.dataset) {
      const compFilterParams = _.get(this, 'filterParams');
      if (compFilterParams && !_.isEmpty(compFilterParams)) {
        filtercondition['filterParams'] = compFilterParams;
      }
      return this.DataService.dataset_Get_Data(this.config.dataset['name'], filtercondition);
    } else {
      return this.DataService.getDataByFilter(this.collectionName, filtercondition);
    }
  }
}
