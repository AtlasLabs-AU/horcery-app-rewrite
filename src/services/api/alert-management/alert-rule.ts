import type { AlertApplicationTypes } from '@acme/config/enums/alert-application-types';
import type { AlertCondition } from '@acme/config/enums/alert-conditions';
import type { AlertFilter } from '@acme/config/enums/alert-filter';

import type { IAlertType } from './alert-type';
import GenericService from '../../base/generic-service';

export interface IAlertApplicationRule {
  id: string;
  object_type: number;
  object_id: string;
  alert_rule: string;
  deleted_at?: string | null;
  deleted_by_cascade?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IAlertNotificationRule {
  id: string;
  object_type: number;
  object_id: string;
  alert_rule: string;
  deleted_at?: string | null;
  deleted_by_cascade?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IAlertRule {
  id?: string;
  alert_type: string | IAlertType;
  organization_id?: string | null;
  device_instance_id?: string | null;
  /** When creating from an available suggested alert, link back for analytics / backend attribution */
  suggested_alert_rule?: string | null;
  is_custom?: boolean;
  is_custom_duration?: boolean;
  condition: AlertCondition;
  threshold_value: number;
  evaluation_start_time?: string | null;
  evaluation_end_time?: string | null;
  trigger_duration?: string | null;
  query_range_duration?: string | null;
  /** Display-unit value when it differs from stored threshold (e.g. imperial input) */
  display_value?: number | null;
  UNATTESTED_META_DATA: Record<string, any>;
  apply_condition: AlertFilter;
  apply_type: AlertApplicationTypes;
  notify_condition: AlertFilter;
  is_sms: boolean;
  is_email: boolean;
  is_push: boolean;
  bucket_key?: string | null;

  rule_application_ids?: string[];
  rule_notification_ids?: string[];

  alert_application_rules?: IAlertApplicationRule[];
  alert_notification_rules?: IAlertNotificationRule[];
}

class AlertRuleService extends GenericService<IAlertRule> {
  endPointURL: string = 'alert_management/api/alert_handler/alert_rules';
}

export const alertRuleService = new AlertRuleService();
