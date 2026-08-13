import GenericService from '../../base/generic-service';
import { IAnimalStall } from './animal-stall';
import { IDeviceInstance } from './device-instance';

export interface IStall {
  id: string;
  name: string;
  animal_stalls?: IAnimalStall[];
  in_stall_time: string | null;
  is_shared: boolean;
  AppMetaData?: Record<string, unknown>;
  UserMetaData: {
    stall_feed?: number;
    stall_check?: number;
    stall_clean?: number;
    audio_enable?: boolean;
    last_dismissed_at?: string | null;
    last_checked_at?: string | null;
  };
  secret_key_1_app_enc: string;
  secret_key_2_app_enc: string;
  access_key_app_enc: string;
  stallgroups: any[];
  organization_id: string;
  current_device_instance_id: string;
  stall_url: string;
  temp: number | null;
  humidity: number | null;
  prometheus_url: string;
  hide_metrics_till: string;
  stall_blur_hash?: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  monitoring_mode: number;
  current_stall_monitor_deviceinstance: string | null | IDeviceInstance;
}

class StallService extends GenericService<IStall> {
  endPointURL = 'stall_monitor_management/api/instance_management/stalls';
}

export const stallService = new StallService();
