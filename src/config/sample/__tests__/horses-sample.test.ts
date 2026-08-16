import {
  filterSampleHorses,
  SAMPLE_HORSES,
  SAMPLE_HORSE_GROUPS,
} from '@/config/sample/horses-sample';

describe('Horses sample preview', () => {
  it('covers every thumbnail fallback and has usable group variety', () => {
    expect(new Set(SAMPLE_HORSES.map((horse) => horse.imageKind))).toEqual(
      new Set(['camera', 'profile', 'none']),
    );
    expect(SAMPLE_HORSE_GROUPS.length).toBeGreaterThanOrEqual(2);
    expect(SAMPLE_HORSES.length).toBeGreaterThanOrEqual(6);
  });

  it('applies group and search together', () => {
    expect(filterSampleHorses('sample-mares').map((horse) => horse.name)).toEqual([
      'Willow',
      'Juniper',
    ]);
    expect(filterSampleHorses('sample-mares', 'stall 5').map((horse) => horse.name)).toEqual([
      'Willow',
    ]);
  });
});
