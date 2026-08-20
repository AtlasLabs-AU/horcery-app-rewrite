import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Horse event timestamp navigation', () => {
  it('moves the shared play-head to the event and returns to Summary', () => {
    const screen = readFileSync(
      join(__dirname, '..', '..', '..', 'app', '(tabs)', 'horses', '[id].tsx'),
      'utf8',
    );

    expect(screen).toContain('DateTime.fromISO(event.startTime, { setZone: true })');
    expect(screen).toContain('playhead.setCursor');
    expect(screen).toContain("setActiveTab('summary')");
    expect(screen).toContain('onOpenEventMoment(item)');
    expect(screen).toContain('tap to view this moment in Summary');
  });
});
