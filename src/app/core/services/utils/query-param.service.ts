import { inject, Injectable } from '@angular/core';
 import moment from 'moment';
 import _ from 'lodash';
import { ActivatedRoute, Router } from '@angular/router';
import { FilterOperations } from '../../interfaces/filter-builder';

@Injectable({
  providedIn: 'root'
})
export class QueryParamService {

  constructor() { }
  ConstructQueryParamsIntoFilterObj(query:any,searchKeyName:any,conditions:any=[],changeStartdateEnddate:any="created_on"){
      for (let column of Object.keys(query)) { 
          let operator = column == searchKeyName ? 'CONTAINS':'EQUALS'
          let type= 'string'
          let value = query[column] || 'notexist' 
            
            if(column=="start_date" ){ 
              operator= FilterOperations.GREATERTHANOREQUAL;
              type = "date" ;
              value= moment(value).format("yyyy-MM-DDT00:00:00.000Z") 
              column =changeStartdateEnddate
            }
            
            if(column=="end_date"){ 
              operator= FilterOperations.LESSTHANOREQUAL;
              type = "date" ;
              value= moment(value).format("yyyy-MM-DDT23:59:59.000Z") 
              column =changeStartdateEnddate
            }
            
            if (typeof value === 'string' && value.startsWith('@')) {
                operator = 'CONTAINS';
                // remove the '@'
                value = value.substring(1); 
            }

            if(value != 'notexist'){
              value = (value == "true" || value == "false") ? Boolean(value) : value
              let condition :any={column,operator ,type,value};
              conditions.push(condition)
            }
        
            if (!query[column]) {
              delete query[column]
            }
      }
  }
  router=inject(Router)
  route =inject(ActivatedRoute)
  ConstructorFilterColumnIntoQueryParams(obj:any,sendFullObject:any=false){
    if(sendFullObject) this.router.navigate([], {queryParams: {filter:JSON.stringify(obj)}, queryParamsHandling: 'merge'})
  }
}
