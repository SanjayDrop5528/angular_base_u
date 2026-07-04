import { inject, Injectable } from '@angular/core';
import { UtilsService } from './utils.service';
import _ from 'lodash';
import { FormGroup } from '@angular/forms';
import moment from 'moment';
 
@Injectable({
  providedIn: 'root'
})
export class DataManipulatorService {

  private _utilsService=inject(UtilsService)

 /**
   * Dynamically processes values from one object to another based on the given configuration.
   * 
   * @param {Object} from - The source object.  
   * @param {Object} to - The destination object.
   * @param {Array} config - Array of configurations containing from_key, to_key, and type.
   * @param {String} from_key - from_key.
   *  @param {Array} to_key - to_key.
   *  @param {String} type - it used for add/detele/(token i.e from value from token).
   *  @param {String} defaultValue - set the defaultValue .
   *  @param {Boolean} patchLocalValue - Set the local/session storage to obj.
    "config": [
      {
        "from_key": "hierarchyCode",
        "to_key": "selectedModel.hierarchyCode"
      },
      {
        "from_key": "_id",
        "to_key": "selectedModel.hierarchyRefId"
      },
      {
        "from_key": "formName",
        "to_key": "formName","defaultValue":"today"
      }
    ]
    // ? formGroupKey It used To Get From Group To Set Value
      */
  //? Future dataType="any"
  processValues(from: any, to: any, config: any[]) {
    config.forEach(({ from_key, to_key, type = 'add', defaultValue = '', valuelocal = false, sessionType = false ,formGroupKey=false}) => {
      const patchLocalValue = valuelocal
      let froms: any = new Object(from)
      _.set(to, to_key, "");
      if (patchLocalValue) this._utilsService.bindAllSession(froms)
      const _defaultValue= this._utilsService.findDefaultValue(defaultValue)
      let _value = _.get(froms, from_key,_defaultValue);
      if (type === 'add') {
        if (sessionType) {
          try {
            _value = this._utilsService.getStoredValue(from_key, sessionType); 
          } catch (error) {
            console.error("Invalid JSON data:", error);
            _value = null;  
          }

        }
        // ? Patch in Form Control 
        if(formGroupKey){
          const formGroup = _.get(to, formGroupKey) as FormGroup;
          if(formGroup.contains(to_key)){
            formGroup.get(to_key)?.patchValue(_value);
            formGroup.get(to_key)?.updateValueAndValidity();
            formGroup.get(to_key)?.markAsDirty();
            formGroup.get(to_key)?.markAsTouched();
            formGroup.get(to_key)?.markAsPristine();
          }
        }else{
          if(_.isEmpty(_value)) {
            _.set(to, to_key, _defaultValue);
          }else{
            _.set(to, to_key, _value);
          }
        }
      } else if (type === 'token') {
        const tokenDetails = this._utilsService.getDecodeToken()
        _.set(to, to_key, _.get(tokenDetails, from_key, defaultValue));
      } else if (type === 'delete') {
        _.unset(to, to_key);
        delete to[to_key]
      }
    });
  }

  appendDateConfig(ctrl: any, config: any, appendToConfigKey: any = false) {
    let appendCtrl: any = appendToConfigKey != false ? _.get(ctrl, appendToConfigKey) : config
    const { attributes } = config;
    if (!attributes) return;
    const addDays = attributes.add_days || 0;
    if (attributes?.['hide'] == "past_date") {
      appendCtrl.minDate = moment().add(addDays || 0, 'day')
    } else if (attributes?.['hide'] == "future_date") {
      appendCtrl.maxDate = moment().add(addDays || 0, 'day')
    } else if (attributes?.['hide'] == "dob") {
      let presentDate = moment();
      appendCtrl.maxDate = presentDate
      let differenceInYears = moment(presentDate).diff(18, 'years');
      appendCtrl.minDate = differenceInYears
    }
  }

    // Method to create a unique tree path structure for ag-Grid
    createTreePathData(data: any[], foreignField: string = 'parent_id', localField: string = '_id', sort: any = false, order: 'asc' | 'desc' = 'desc', nameKey: string = "name") {
      if (!data || data.length === 0) return [];
  
      // Step 1: Create a map to store unique items
      const uniqueMap = new Map<string, any>();
      data.forEach((item: any) => {
        uniqueMap.set(item[localField], { ...item }); // Clone to avoid mutating the original data
      });
  
      // Step 2: Create the tree structure
      const parentTreeData: any[] = [];
      let allNodes = Array.from(uniqueMap.values());
      if (sort) {
        allNodes = _.orderBy(allNodes, ['level'], [order]);
      }
      allNodes.forEach((node) => {
        if (!node[foreignField]) {
          node.treePath = [node[localField]];
          node.treeName = [node[nameKey] ?? ""];
          parentTreeData.push(node);
        } else {
          // Find the parent node in the unique data map
          const parent = uniqueMap.get(node[foreignField]);
          if (parent) {
            node.treeName = [...(parent.treeName || []), node[nameKey] ?? ""];
            node.treePath = [...(parent.treePath || []), node[localField]];
          } else {
            // Handle cases where parent is not found
            node.treePath = [node[localField]];
            node.treeName = [node[nameKey] ?? ""];
          }
          parentTreeData.push(node);
        }
      });
  
      // Step 3: Return unique tree data
      return parentTreeData;
    }
  
    /**
   * Constructs a tree structure from flat data based on parent-child relationships.
   *
   * @param {Array} data - The input array of flat data.
   * @param {string} foreignField - The key identifying the parent relationship (default: 'parent_id').
   * @param {string} localField - The key identifying the unique ID for each node (default: '_id').
   * @param {string} nameKey - The key for the display name (default: 'name').
   * @returns {Array} - The constructed tree structure.
   */
    createTreeStructData(data: any[], foreignField: string = "parent_id", localField: string = "_id", nameKey: string = "name"): any[] {
      if (!data || data.length === 0) return [];
      // Step 1: Create a map of unique entries to remove duplicates
      const uniqueMap = new Map<string, any>();
      data.forEach((item) => {
        uniqueMap.set(item[localField], item); // Ensure unique entries by `_id`
      });
  
      // Convert the map back to an array
      let uniqueData = Array.from(uniqueMap.values());
  
      // Step 2: Initialize all nodes and store them in the map for tree construction
      const nodeMap = new Map<string, any>();
      const parentTreeData: any[] = [];
  
      uniqueData.forEach((row: any) => {
        const node = {
          ...row,
          item: row[nameKey],
          children: [],
          treePath: [row[localField]],
          treeName: [row[nameKey]],
        };
        nodeMap.set(row[localField], node);
      });
  
      // Step 3: Build the tree structure
      uniqueData.forEach((row: any) => {
        const node = nodeMap.get(row[localField]);
  
        if (!row[foreignField]) {
          // Root node: No parent relationship
          parentTreeData.push(node);
        } else {
          // Child node: Find the parent and add the current node as its child
          const parent = nodeMap.get(row[foreignField]);
          if (parent) {
            node.treePath = [...parent.treePath, row[localField]];
            node.treeName = [...parent.treeName, row[nameKey]];
            parent.children.push(node);
          }
        }
      });
  
      return parentTreeData;
    }
    
    buildOptions(res: any, to: any) {
      var data: any[] = res.data ? res.data : res;
      if (to?.labelPropTemplate) {
        data.forEach((e: any) => {
          e[to.labelProp] = this._utilsService.processText(to.labelPropTemplate, e);
        });
      }
      data = _.sortBy(data, to.labelProp);
      if (to?.optionsDataSource?.firstOption) {
        data.unshift(to.optionsDataSource.firstOption);
      }
      to.options = data;
    }
    
}
