import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('horse detail refresh wiring', () => {
  it('passes the explicit refresh token to the frame cache-buster argument', () => {
    const source = readFileSync(join(__dirname, '..', 'use-horse-detail.ts'), 'utf8');

    expect(source).toMatch(
      /joinHorseRow\(animal, stall, quantisedEpoch\(\), refreshToken\)/,
    );
    expect(source).not.toContain('quantisedEpoch(refreshToken)');
  });

  it('keeps the spinner active until both detail and active-tab refreshes finish', () => {
    const source = readFileSync(
      join(__dirname, '..', '..', 'app', '(tabs)', 'horses', '[id].tsx'),
      'utf8',
    );

    expect(source).toContain('await Promise.all([horse.refresh(), tabRefresh])');
    expect(source).toContain('refreshing={isRefreshing || horse.isRefreshing}');
  });
});
