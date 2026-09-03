import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { font } from '@/constants/fonts';
import { type } from '@/constants/tokens';

const SRC = join(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('Inter typography contract', () => {
  it('maps every app text step to an explicit Inter weight', () => {
    expect(type.largeTitle.fontFamily).toBe(font.bold);
    expect(type.title.fontFamily).toBe(font.semibold);
    expect(type.title3.fontFamily).toBe(font.semibold);
    expect(type.headline.fontFamily).toBe(font.semibold);
    expect(type.body.fontFamily).toBe(font.regular);
    expect(type.subhead.fontFamily).toBe(font.regular);
    expect(type.footnote.fontFamily).toBe(font.regular);
    expect(type.caption.fontFamily).toBe(font.regular);
    expect(type.micro.fontFamily).toBe(font.regular);
    expect(type.eyebrow.fontFamily).toBe(font.semibold);
  });

  it('does not reintroduce platform body fonts or synthetic weights', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(SRC, file);
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (/fontWeight\s*:|ui-rounded|system-ui|fontFamily\s*:\s*['"]Menlo['"]/.test(line)) {
          offenders.push(`${rel}:${index + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
