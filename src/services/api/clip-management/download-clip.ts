import GenericService from '../../base/generic-service';

export interface IClipDownload {
  clip_id?: string;
  organization_id?: string;
  name?: string;
  url?: string;
}

class ClipDownloadService extends GenericService<IClipDownload> {
  endPointURL: string = 'hls_clip_management/api/clip_handler/download_clip';
}

export const clipDownloadService = new ClipDownloadService();
