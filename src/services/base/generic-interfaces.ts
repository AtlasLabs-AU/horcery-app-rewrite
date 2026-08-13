interface IAdditionalParam {
  key: string;
  value: string;
}

interface IFilterSortParams {
  ordering?: string;
  search?: string;
  page?: number;
  page_size?: number;
  page_count?: number;
  include?: string;
  deleted_at__isnull?: boolean;
  organization_id?: string;
}

interface IGenericPagination {
  count: number;
  page_size: number;
  page_count: number;
  next: string;
  previous: string;
  has_next: boolean;
  has_previous: boolean;
}

interface IGenericResponse<T> {
  status: string;
  status_code: number;
  type: string;
  params: [];
  data: T;
  meta?: IGenericPagination;
}

export type {
  IFilterSortParams,
  IGenericPagination,
  IGenericResponse,
  IAdditionalParam,
};
