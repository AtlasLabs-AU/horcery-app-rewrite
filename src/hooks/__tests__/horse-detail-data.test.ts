import type { IAnimal } from '@acme/services/api/animal-management/animal';
import type { IStall } from '@acme/services/api/stall-monitor-management/stall';
import {
  buildPassport,
  formatDateOfBirth,
  formatHeight,
  formatWeight,
  monitorDeviceId,
} from '@/hooks/horse-detail-data';

const stall = (overrides: Partial<IStall> = {}) => ({ name: 'Stall 4', ...overrides }) as IStall;

describe('passport formatting', () => {
  it('converts height and weight for imperial users', () => {
    // 163 cm is 16.04 hands (1 hand = 4in = 10.16cm); 520 kg is 1146.40 lbs.
    expect(formatHeight(163, false)).toBe('16.04 hands');
    expect(formatHeight(163, true)).toBe('163.00 cm');
    expect(formatWeight(520, false)).toBe('1146.40 lbs');
    expect(formatWeight(520, true)).toBe('520.00 kg');
  });

  it('says a fact is missing rather than printing an empty row', () => {
    expect(formatHeight(undefined, true)).toBe('Not recorded');
    expect(formatWeight(undefined, false)).toBe('Not recorded');
    expect(formatDateOfBirth(undefined)).toBe('Not recorded');
    expect(formatDateOfBirth('not-a-date')).toBe('Not recorded');
  });

  it('formats a date of birth without applying a timezone', () => {
    // A date-only value must not shift by zone — a horse born on the 14th is
    // not born on the 13th because the phone is west of the barn.
    expect(formatDateOfBirth('2019-03-14')).toBe('14 March 2019');
  });
});

describe('monitorDeviceId', () => {
  it('returns the printed device id only when the relation is expanded', () => {
    expect(
      monitorDeviceId(
        stall({ current_stall_monitor_deviceinstance: { device_id: 'SM-4417' } as never }),
      ),
    ).toBe('SM-4417');
  });

  it('never shows a bare relation id as if it were the device id', () => {
    // Unexpanded, the API sends the relation's own uuid. Printing that as
    // "Stall monitor" would show a number that is on no device anywhere.
    expect(monitorDeviceId(stall({ current_stall_monitor_deviceinstance: 'a-uuid' }))).toBeUndefined();
    expect(monitorDeviceId(stall({ current_stall_monitor_deviceinstance: null }))).toBeUndefined();
    expect(monitorDeviceId(undefined)).toBeUndefined();
  });
});

describe('buildPassport', () => {
  const animal: IAnimal = {
    id: 'a1',
    animal_name: 'Storm',
    registered_name: 'Storm Over Ashford',
    gender: 'gelding',
    dob: '2019-03-14',
    breed: 'thoroughbred',
    height: 163,
    weight: 520,
  };

  it('folds the old settings page fields in, in order', () => {
    const rows = buildPassport({
      animal,
      stall: stall({ current_stall_monitor_deviceinstance: { device_id: 'SM-1' } as never }),
      groupNames: ['Mares', 'In Training'],
      isMetric: true,
    });

    expect(rows.map((row) => row.id)).toEqual([
      'registeredName',
      'gender',
      'dob',
      'breed',
      'height',
      'weight',
      'stall',
      'groups',
      'device',
    ]);
    expect(rows.find((row) => row.id === 'stall')?.value).toBe('Stall 4');
    expect(rows.find((row) => row.id === 'groups')?.value).toBe('Mares, In Training');
    expect(rows.find((row) => row.id === 'device')?.value).toBe('SM-1');
  });

  it('pluralises the group label and speaks plainly when there are none', () => {
    const one = buildPassport({ animal, stall: undefined, groupNames: ['Mares'], isMetric: true });
    expect(one.find((row) => row.id === 'groups')?.label).toBe('Group');

    const none = buildPassport({ animal, stall: undefined, groupNames: [], isMetric: true });
    expect(none.find((row) => row.id === 'groups')?.label).toBe('Groups');
    expect(none.find((row) => row.id === 'groups')?.value).toBe('No groups');
    expect(none.find((row) => row.id === 'stall')?.value).toBe('No stall assigned');
    expect(none.find((row) => row.id === 'device')?.value).toBe('None assigned');
  });

  it('title-cases free-text fields without hiding an empty one', () => {
    const rows = buildPassport({
      animal: { ...animal, gender: '  ', breed: 'warmblood' },
      stall: undefined,
      groupNames: [],
      isMetric: true,
    });
    expect(rows.find((row) => row.id === 'gender')?.value).toBe('Not recorded');
    expect(rows.find((row) => row.id === 'breed')?.value).toBe('Warmblood');
  });

  it('always returns every row, so a missing fact cannot look like a missing field', () => {
    const rows = buildPassport({
      animal: undefined,
      stall: undefined,
      groupNames: [],
      isMetric: false,
    });
    expect(rows).toHaveLength(9);
    expect(rows.every((row) => row.value.length > 0)).toBe(true);
  });
});
