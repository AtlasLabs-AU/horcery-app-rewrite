import { DateTime } from 'luxon';

import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';
import GenericService from '../../base/generic-service';
import { IAnimal } from '../animal-management/animal';
import { IStall } from '../stall-monitor-management/stall';
import { IUser } from '../user-management/user';

export interface IEvent {
  id?: string;
  animal_stalls?: string[];
  feeding_plan_id?: string;
  rule_object?: {
    name?: string;
    description?: string;
    frequency?: string;
    params?: string;
  };
  created_by?: string | IUser;
  start_time?: string;
  end_time?: string;
  duration?: string;
  title: string;
  event_blur_hash?: string;
  description?: string;
  event_type?: number;
  end_recurring_period?: string;
  color_event?: string;
  animal_stall_id?: string;
  animal_id?: string;
  animal?: IAnimal;
  stall_id?: string | IStall;
  stall?: IStall;
  organization_id?: string;
  relation_id?: string;
  relation_type?: string;
  event_data?: Record<string, any>;
  UnattestedMetaData?: Record<string, any>;
  activeness_min?: number;
  activeness_avg?: number;
  activeness_max?: number;
  location?: string;
  rule?: number;
  calendar?: number;
  special_instruction?: number;
  value?: number;
  device_instance_id?: string;
  created_at?: string;
  updated_at?: string;
}
class EventService extends GenericService<IEvent> {
  endPointURL: string = 'event_management/api/schedule/event';

  protected constructQueryParams(
    filterSortObject?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ): string {
    const defaultParams: IAdditionalParam[] = [
      { key: 'timezone', value: DateTime.local().zoneName },
    ];
    const mergedParams = [...defaultParams, ...(additionalParams || [])];

    return super.constructQueryParams(filterSortObject, mergedParams, query);
  }
}

export const eventService = new EventService();
