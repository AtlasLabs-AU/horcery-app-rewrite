/**
 * The console guard, guarded.
 *
 * `jest.setup.js` fails any test that produces unexpected console.error /
 * console.warn output. That guard is invisible when it works, so if it ever
 * stopped discriminating, every suite would keep reporting PASS and we would
 * lose the signal without noticing. These tests call the guard's own filter —
 * not a copy — so a change that breaks it fails here.
 *
 * Draining also clears the buffer, which is what lets these tests emit output
 * deliberately without failing themselves.
 */

const drain = (): { level: string; text: string }[] =>
  (global as unknown as { __drainUnexpectedConsole: () => { level: string; text: string }[] })
    .__drainUnexpectedConsole();

describe('console guard', () => {
  it('captures console.error that no test opted into', () => {
    console.error('pretend React complaint');

    expect(drain()).toEqual([
      { level: 'error', text: 'pretend React complaint' },
    ]);
  });

  it('captures console.warn too', () => {
    console.warn('pretend deprecation');

    expect(drain()).toEqual([{ level: 'warn', text: 'pretend deprecation' }]);
  });

  it('permits output a test explicitly expects', () => {
    expectConsole(/deliberate/);
    console.warn('deliberate warning');

    expect(drain()).toEqual([]);
  });

  it('permits only what the pattern matches, in the same test', () => {
    expectConsole(/deliberate/);
    console.warn('deliberate warning');
    console.error('this one is not expected');

    expect(drain()).toEqual([
      { level: 'error', text: 'this one is not expected' },
    ]);
  });

  it('does not carry an allowance into the next test', () => {
    // The previous test called expectConsole(/deliberate/). If allowances
    // leaked between tests, this identical message would be permitted.
    console.warn('deliberate warning');

    expect(drain()).toEqual([{ level: 'warn', text: 'deliberate warning' }]);
  });

  it('reports Error arguments by stack rather than "[object Object]"', () => {
    console.error(new Error('boom'));

    const [entry] = drain();
    expect(entry.text).toContain('boom');
    expect(entry.text).not.toContain('[object Object]');
  });
});
