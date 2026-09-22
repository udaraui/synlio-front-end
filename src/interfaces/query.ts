export interface QueryParam {
  filters: QueryParamFilter[];
  first: number;
  rows: number;
  multiSorts: QueryParamSort[];
}

export interface QueryParamFilter {
  field: string;
  value?: any;
  matchMode?: string;
}

export interface QueryParamSort {
  field: string;
  order: string;
}

