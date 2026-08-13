import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

// import * as Sharing from 'expo-sharing';

import { warn } from '@acme/config/utils/logger';
import { clipDownloadService } from '@acme/services/api/clip-management/download-clip';

export interface IDownloadClipSlice {
  downloadingClipId: string | null;
  isDownloading: boolean;
  downloadClip: (
    id: string,
    organizationId: string,
    options?: {
      onSuccess?: (fileUri: string) => void;
      onError?: (errorMessage: string) => void;
      clipName?: string;
      shareWhenDone?: boolean;
    },
  ) => Promise<void>;
  shareClip: (fileUri: string) => Promise<void>;
}

export const createDownloadClipSlice = (
  set: (fn: (state: IDownloadClipSlice) => Partial<IDownloadClipSlice>) => void,
  get: () => IDownloadClipSlice,
): IDownloadClipSlice => {
  let downloadResumable: FileSystem.DownloadResumable | null = null;

  return {
    downloadingClipId: null,
    isDownloading: false,

    downloadClip: async (id, organizationId, options) => {
      if (get().isDownloading && get().downloadingClipId !== id) {
        options?.onError?.('Another clip is currently being downloaded.');
        return;
      }

      try {
        set(() => ({ isDownloading: true, downloadingClipId: id }));

        const response = await clipDownloadService.create({
          clip_id: id,
          organization_id: organizationId,
        });
        const downloadUrl = response.data?.url;
        if (!downloadUrl) throw new Error('Download URL is missing.');

        const tempDir = `${FileSystem.cacheDirectory}tmp/`;
        await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
        const fileName = options?.clipName ?? `${id}-${Date.now()}.mp4`;
        const fileUri = `${tempDir}${fileName}.mp4`;

        downloadResumable = FileSystem.createDownloadResumable(
          downloadUrl,
          fileUri,
        );

        const result = await downloadResumable.downloadAsync();
        if (!result || result.status !== 200) {
          throw new Error('Failed to download the clip.');
        }

        await MediaLibrary.createAssetAsync(result.uri);

        options?.onSuccess?.(result.uri);

        if (options?.shareWhenDone) {
          await get().shareClip(result.uri);
        }
      } catch (err: any) {
        const message = err?.message || 'Unknown download error.';
        options?.onError?.(message);
      } finally {
        try {
          const fileUri = downloadResumable?.fileUri;
          if (fileUri) {
            await FileSystem.deleteAsync(fileUri, { idempotent: true });
          }
        } catch {
          // ignore cleanup errors
        }

        downloadResumable = null;
        set(() => ({ isDownloading: false, downloadingClipId: null }));
      }
    },

    shareClip: async (fileUri: string) => {
      console.warn('This function has been disabled.');
      // try {
      //   if (await Sharing.isAvailableAsync()) {
      //     await Sharing.shareAsync(fileUri, {
      //       dialogTitle: 'Share this clip',
      //       mimeType: 'video/mp4',
      //     });
      //   }
      // } catch (err) {
      //   console.warn('Share failed:', err);
      // }
    },
  };
};
