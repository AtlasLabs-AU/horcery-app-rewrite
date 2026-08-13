import GenericService from '../../base/generic-service';

export interface ISuggestedAlert {
  id: string;
  deleted_at: string | null;
  deleted_by_cascade: boolean;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  condition: string;
  threshold_value: number;
  evaluation_start_time: string;
  evaluation_end_time: string;
  trigger_duration: string;
  query_range_duration?: string;
  apply_condition: number;
  apply_type: number;
  notify_condition: number;
  is_active: boolean;
  alert_type: string;
}

class SuggestedAlertService extends GenericService<ISuggestedAlert> {
  endPointURL: string =
    'alert_management/api/alert_handler/available_suggested_alerts';
}

export const suggestedAlertService = new SuggestedAlertService();
