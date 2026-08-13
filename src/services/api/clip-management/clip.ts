import GenericService from '../../base/generic-service';
import { IAnimal } from '../animal-management/animal';
import { IStall } from '../stall-monitor-management/stall';

export interface IClipOrganization {
  id?: string;
  name?: string;
  slug?: string;
  organizationType?: number;
  ownerId?: string;
}

export interface IPermission {
  id?: string;
  deleted?: string;
  deletedByCascade?: boolean;
  createdAt?: string;
  updatedAt?: string;
  expiry?: string;
  totpSecret?: string;
  user_email?: string;
  clip?: string;
}

export interface IClip {
  id?: string;
  is_expired?: boolean;
  thumbnail_url?: string;
  deleted_at?: string | null;
  deleted_by_cascade?: boolean;
  created_at?: string;
  updated_at?: string;
  name: string;
  description: string;
  device_instance_id: string;
  original_start_offset: number;
  original_end_offset: number;
  start_offset: number;
  end_offset: number;
  clip_source_type: number;
  organization_id: string;
  has_event_access?: boolean;
  cloud_video_exp_bucket?: string | null;
  access_type?: number;
  access_token?: string;
  password?: string | null;
  is_downloadable?: boolean;
  is_shareable?: boolean;
  sharing_url?: string | null;
  expiry_type?: number;
  expired_at?: string;
  clip_thumbnail_path?: string;
  clip_blur_hash?: string;
  created_by?: string | null;
  start_segment?: string;
  end_segment?: string;
  permissions?: IPermission | null;
  organization?: IClipOrganization | null;
  view_count?: number;
  download_count?: number;
  live_download_count?: number;
  live_view_count?: number;
  stall_id?: string;
  stall?: IStall;
  animal_id?: string;
  animal?: IAnimal;
  bucket_path?: string;
  muxed_at?: string;
  processed_at?: string;
  frame_urls?: string[];
  frame_keys?: string[];
}

class ClipService extends GenericService<IClip> {
  endPointURL: string = 'hls_clip_management/api/clip_handler/clips';
}

export const clipService = new ClipService();
