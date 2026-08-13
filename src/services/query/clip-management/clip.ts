import { createQueryKeys } from "@lukemorales/query-key-factory";

import { clipService } from "../../api/clip-management/clip";
import {
  IAdditionalParam,
  IFilterSortParams,
} from "../../base/generic-interfaces";

export const clip = createQueryKeys("clip", {
  detail: (
    clipId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: ["clip-management", "clip", "fetch", clipId, filters, additionalParams, query],
    queryFn: () => clipService.fetch(clipId, filters, additionalParams, query),
  }),
  list: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: ["clip-management", "clip", "fetchAll", filters, additionalParams, query],
    queryFn: () => clipService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      "clip-management",
      "clip",
      "fetchInfinite",
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      clipService.fetchAll(
        { page: pageParam, ...filters },
        additionalParams,
        query,
      ),
  })
});
