// app/core/interfaces/filter-builder.interfaces.ts

export interface FilterCondition {
  column?: string;
  operator?: string;
  type?: string;
  value?: any;
  valuetype?: string;
  valueType?: string;
  expression?: string;
  getdata?: string;
  addDays?: number;
  format?: string;
  field?: string;
  parse?: boolean;
  parmasName?: string;
  parmsDataType?: string;
  paramsvalue?: string;
}

export interface ProcessValueConfig {
  from_key: string;
  to_key: string;
  type?: 'add' | 'delete' | 'token';
  defaultValue?: any;
  valuelocal?: boolean;
  sessionType?: boolean | object;
  formGroupKey?: string | boolean;
}

export interface FilterParamConfig {
  columnName: string;
  dataType: string;
  defaultValue?: any;
  existValue?: any;
  // ? Used to {{}} to replace this 
  stringReplace?: any;
  stringReplaceKey?: string;
  valuekeyName: any;
}
// filter-constants.ts

// Define filter operations as constants
export const FilterOperations = Object.freeze({
  EQUALS: "EQUALS",
  NOTEQUAL: "NOTEQUAL",
  NOTIN: "NOTIN",
  NOTCONTAINS: "NOTCONTAINS",
  CONTAINS: "CONTAINS",
  STARTSWITH: "STARTSWITH",
  ENDSWITH: "ENDSWITH",
  LESSTHAN: "LESSTHAN",
  GREATERTHAN: "GREATERTHAN",
  LESSTHANOREQUAL: "LESSTHANOREQUAL",
  GREATERTHANOREQUAL: "GREATERTHANOREQUAL",
  INRANGE: "INRANGE",
  BLANK: "BLANK",
  NOTBLANK: "NOTBLANK",
  EXISTS: "EXISTS",
  IN: "IN",
} as const);

// Create type from values of the object
export type FilterOperation = (typeof FilterOperations)[keyof typeof FilterOperations];
export type FormType = 'Control' | 'Group' | 'Array';
export type Action = 'Add' | 'Edit' | 'Delete';
export type OperatorType = 'equal' | 'notequal' | 'checknotnun';
export type CarouselControl = 'Left' | 'Right';

export interface Control {
  name: string;
  type: FormType;
  required?: boolean;
  defaultValue?: any; // fixed typo: defualtValue → defaultValue
  pattern?: any;
}
export const expressionCheck = (
  model: Record<string, any>,
  expression: string
): boolean => {
  try {
    const fn = new Function(
      'model',
      `return (${expression});`
    ) as (model: Record<string, any>) => boolean;
    return fn(model);
  } catch (error) {
    console.error('Expression evaluation failed', {
      expression,
      error,
    });
    return false;
  }
};