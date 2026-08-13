import GenericService from '../../base/generic-service';

export interface IStallAdjustmentCheck {
  stall_id: string;
  organization_id: string;
}

class StallAdjustmentCheckService extends GenericService<IStallAdjustmentCheck> {
  endPointURL: string =
    'stall_monitor_management/api/instance_management/stall_adjustment_check';
}

export const stallAdjustmentCheckService = new StallAdjustmentCheckService();
