import type { IAnimal } from '@acme/services/api/animal-management/animal';
import type { IStall } from '@acme/services/api/stall-monitor-management/stall';
import { joinHorseRow } from '@/hooks/horses-data';

describe('joinRow', () => {
  it('prefers a monitored stall frame over the profile photo', () => {
    const animal = {
      id: 'horse-1',
      animal_name: 'Storm',
      animal_image: { small: 's', medium: 'profile.jpg', large: 'l', extra_large: 'xl' },
      animal_blur_hash: 'profile-blur',
    } satisfies IAnimal;
    const stall = {
      id: 'stall-1',
      name: 'Stall 1',
      stall_url: 'https://camera.example/',
      stall_blur_hash: 'camera-blur',
      current_stall_monitor_deviceinstance: 'device-1',
    } as IStall;

    const row = joinHorseRow(animal, stall, 12345);

    expect(row.stallName).toBe('Stall 1');
    expect(row.imageKind).toBe('camera');
    expect(row.imageUri).toContain('/frames/');
    expect(row.blurhash).toBe('camera-blur');
  });

  it('falls back from camera to profile photo, then to the horse placeholder', () => {
    const photo = joinHorseRow(
      {
        id: 'horse-2',
        registered_name: 'Willow',
        animal_image: { small: 's', medium: 'profile.jpg', large: 'l', extra_large: 'xl' },
      },
      undefined,
      1,
    );
    const empty = joinHorseRow(
      { id: 'horse-3', animal_name: 'Comet', animal_image: {} },
      undefined,
      1,
    );

    expect(photo).toMatchObject({ name: 'Willow', imageUri: 'profile.jpg', imageKind: 'profile' });
    expect(empty).toMatchObject({ name: 'Comet', imageKind: 'none' });
    expect(empty.imageUri).toBeUndefined();
  });

  it('only applies frame refresh when a camera frame exists', () => {
    const photo = joinHorseRow(
      {
        id: 'horse-camera',
        animal_name: 'Storm',
        animal_image: { small: 's', medium: 'profile.jpg', large: 'l', extra_large: 'xl' },
        animal_blur_hash: 'profile-blur',
      },
      {
        id: 'stall-1',
        name: 'Stall 1',
        stall_url: 'https://camera.example/',
        stall_blur_hash: 'camera-blur',
        current_stall_monitor_deviceinstance: 'device-1',
      } as IStall,
      12345,
      1,
    );
    const photoRefreshed = joinHorseRow(
      {
        id: 'horse-camera',
        animal_name: 'Storm',
        animal_image: { small: 's', medium: 'profile.jpg', large: 'l', extra_large: 'xl' },
        animal_blur_hash: 'profile-blur',
      },
      {
        id: 'stall-1',
        name: 'Stall 1',
        stall_url: 'https://camera.example/',
        stall_blur_hash: 'camera-blur',
        current_stall_monitor_deviceinstance: 'device-1',
      } as IStall,
      12345,
      2,
    );
    const photoRefreshSameToken = joinHorseRow(
      {
        id: 'horse-camera',
        animal_name: 'Storm',
        animal_image: { small: 's', medium: 'profile.jpg', large: 'l', extra_large: 'xl' },
        animal_blur_hash: 'profile-blur',
      },
      {
        id: 'stall-1',
        name: 'Stall 1',
        stall_url: 'https://camera.example/',
        stall_blur_hash: 'camera-blur',
        current_stall_monitor_deviceinstance: 'device-1',
      } as IStall,
      12345,
      2,
    );
    const profilePhoto = joinHorseRow(
      {
        id: 'horse-profile',
        registered_name: 'Willow',
        animal_image: { small: 's', medium: 'profile.jpg', large: 'l', extra_large: 'xl' },
      },
      undefined,
      12345,
      2,
    );

    expect(photo.imageUri).toContain('v=1');
    expect(photoRefreshed.imageUri).toContain('v=2');
    expect(photoRefreshed.imageUri).toBe(photoRefreshSameToken.imageUri);
    expect(photo.imageUri).not.toBe(photoRefreshed.imageUri);
    expect(profilePhoto.imageUri).toBe('profile.jpg');
  });
});
