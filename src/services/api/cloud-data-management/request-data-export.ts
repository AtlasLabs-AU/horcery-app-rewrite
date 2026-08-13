import GenericService from '../../base/generic-service';

export interface IRequestDataExport {
  organization_id: string;
  member_id: string[];
  chart_names: string[];
  date_time: string;
  user_timezone: string;
  stall_id?: string;
  animal_id?: string;
  event_types?: number[];
  export_fields?: string[];
}

class RequestDataExportService extends GenericService<any> {
  endPointURL: string =
    'cloud_data_management/api/upload_handler/request_data_export';
}

export const requestDataExportService = new RequestDataExportService();
