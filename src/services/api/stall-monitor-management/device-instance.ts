import type { IStall } from './stall';
import GenericService from '../../base/generic-service';
import { ISpace } from './space';

export interface IDeviceInstance {
  id: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  device_id: string;
  organization_id: string;
  organization_subnet_id: string;
  name: string;
  AppMetaData?: Record<string, unknown>;
  UserMetaData: Record<string, unknown>;
  last_connected_at: string;
  hide_metrics_till: string;
  stall_monitor_url: string;
  prometheus_url: string;
  make: string;
  model: string;
  firmware_version: string;
  hardware_version: string;
  os_version: string;
  last_firmware_updated_at: string;
  network_ssid: string;
  local_ip_address: string;
  network_mac_address: string;
  device_type: number;
  device_sub_type: number | null;
  is_ethernet_connected: boolean;
  stall: string | IStall;
  space?: string | ISpace;
  parent_device_instance: string | null;
}

class DeviceInstanceService extends GenericService<IDeviceInstance> {
  endPointURL: string =
    'stall_monitor_management/api/instance_management/device_instances';
}

export const deviceInstanceService = new DeviceInstanceService();
