import GenericService from '../../base/generic-service';

export interface IAlertType {
  id?: string;
  /** Stable key for form fields, icons, and summary templates (e.g. `lying-down-time`). */
  slug?: string;
  name: string;
  interval?: number | null;
  category: number;
  threshold_type: number;
  prometheus_metric_name: string;
  duration?: string | null;
  /** Unit labels for threshold display (e.g. "stall" / "stalls") */
  display_unit_singular?: string | null;
  display_unit_plural?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  AppMetaData?: any;
}

class AlertTypeService extends GenericService<IAlertType> {
  endPointURL: string = 'alert_management/api/alert_handler/alert_types';
}

export const alertTypeService = new AlertTypeService();
