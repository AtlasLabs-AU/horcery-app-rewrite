import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IAnimal } from '@acme/services/api/animal-management/animal';
import type { IAnimalStall } from '@acme/services/api/stall-monitor-management/animal-stall';
import type { IStall } from '@acme/services/api/stall-monitor-management/stall';
import { buildSnapshots } from '@/hooks/snapshots-data';

describe('Snapshots data boundary', () => {
  it('keeps monitored stalls, drops unmonitored stalls, and joins the horse name', () => {
    const monitored = {
      id: 'stall-monitored',
      name: 'Stall 4',
      stall_url: 'https://camera.example/sm-4',
      current_stall_monitor_deviceinstance: 'monitor-4',
    } as IStall;
    const unmonitored = {
      id: 'stall-empty',
      name: 'Stall 5',
      current_stall_monitor_deviceinstance: null,
    } as IStall;
    const links = [
      { animal_id: 'horse-1', stall: monitored.id, deleted_at: null },
    ] as IAnimalStall[];
    const animals = [{ id: 'horse-1', animal_name: 'Willow' }] as IAnimal[];

    const rows = buildSnapshots([monitored, unmonitored], links, animals, 12345);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: monitored.id, name: 'Willow' });
    expect(rows[0]?.posterUri).toContain('/frames/');
  });

  it('uses complete-list queries and the server-side monitor filter', () => {
    const source = readFileSync(join(__dirname, '..', 'use-snapshots.ts'), 'utf8');

    expect(source.match(/\.listComplete\(/g)).toHaveLength(3);
    expect(source).toContain('current_stall_monitor_deviceinstance__isnull');
    expect(source).not.toMatch(/queries\.(stall|animalStall|animal)\.list\(/);
  });
});
