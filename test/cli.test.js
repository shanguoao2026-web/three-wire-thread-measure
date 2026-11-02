import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { measure } from '../dist/measurement.js';

const cli = (...args) => spawnSync(process.execPath, ['dist/cli.js', ...args.map(String)], { encoding: 'utf8' });
function json(...args) {
  const result = cli(...args, '--json');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
}
const rounded = value => Number(value.toFixed(4));

test('60 degree best wire forward check, computed from formula', () => {
  const result = json('--pitch', 1.5, '--d2', 9.026);
  const half = Math.PI / 6;
  const best = 1.5 / (2 * Math.cos(half));
  const m = 9.026 + best * (1 + 1 / Math.sin(half)) - 0.75 / Math.tan(half);
  assert.equal(result.bestWire, rounded(best));
  assert.equal(result.bestWire, 0.8660);
  assert.equal(result.wire, result.bestWire);
  assert.equal(result.m, rounded(m));
  assert.equal(result.m, 10.3250);
  assert.deepEqual(result.warnings, []);
});

test('reverse check', () => {
  const result = json('--pitch', 1.5, '--m', 10.3250);
  const half = Math.PI / 6;
  const expected = 10.325 - (1.5 / (2 * Math.cos(half))) * (1 + 1 / Math.sin(half)) + 0.75 / Math.tan(half);
  assert.equal(result.d2, rounded(expected));
  assert.equal(result.d2, 9.0260);
  assert.equal(result.mode, 'pitch-diameter');
});

test('custom wire produces required warning', () => {
  const result = json('--pitch', 1.5, '--d2', 9.026, '--wire', 1);
  assert.equal(result.m, rounded(9.026 + 1 * (1 + 1 / Math.sin(Math.PI / 6)) - 0.75 / Math.tan(Math.PI / 6)));
  assert.equal(result.m, 10.7270);
  assert.equal(result.wire, 1);
  assert.deepEqual(result.warnings, ['wire not near best size']);
});

test('30 degree example', () => {
  const half = Math.PI / 12;
  const best = 4 / (2 * Math.cos(half));
  const result = json('--pitch', 4, '--angle', 30, '--d2', 18);
  assert.equal(result.bestWire, 2.0706);
  assert.equal(result.bestWire, rounded(best));
  assert.equal(result.m, rounded(18 + best * (1 + 1 / Math.sin(half)) - 2 / Math.tan(half)));
});

test('round trips preserve full precision for supported angles', () => {
  for (const angle of [29, 30, 55, 60, 119]) {
    const forward = measure({ pitch: 2, angle, d2: 20, wire: 1.1 });
    const reverse = measure({ pitch: 2, angle, m: forward.m, wire: 1.1 });
    assert.ok(Math.abs(reverse.d2 - 20) < 1e-12);
  }
});

test('warning threshold on either side of best wire', () => {
  const best = measure({ pitch: 1.5, d2: 9 }).bestWire;
  for (const ratio of [0.851, 1, 1.149]) {
    assert.deepEqual(measure({ pitch: 1.5, d2: 9, wire: best * ratio }).warnings, []);
  }
  for (const ratio of [0.849, 1.151]) {
    assert.deepEqual(measure({ pitch: 1.5, d2: 9, wire: best * ratio }).warnings, ['wire not near best size']);
  }
});

const invalid = [
  ['--pitch', 0, '--d2', 9], ['--pitch', -1, '--d2', 9],
  ['--pitch', 1, '--angle', 0, '--d2', 9],
  ['--pitch', 1, '--angle', 120, '--d2', 9],
  ['--pitch', 1, '--angle', -30, '--d2', 9],
  ['--pitch', 1, '--d2', 9, '--m', 10], ['--pitch', 1],
  ['--pitch', 1, '--d2', 9, '--wire', 0],
  ['--pitch', 1, '--d2', 9, '--wire', -1],
  ['--pitch', 1, '--d2', 0], ['--pitch', 1, '--m', 0],
  ['--pitch', 1, '--d2', -1], ['--pitch', 1, '--m', -1],
  ['--pitch', 1, '--d2', 9, '--decimals', 9],
  ['--pitch', 1, '--d2', 9, '--decimals', -1],
  ['--pitch', 1, '--d2', 9, '--decimals', 1.5],
  [], ['--d2', 9], ['--pitch'], ['--pitch', 'NaN', '--d2', 9],
  ['--pitch', 'Infinity', '--d2', 9], ['--pitch', '1e999', '--d2', 9],
  ['--pitch', 'abc', '--d2', 9], ['--unknown'],
  ['--pitch', 1, '--pitch', 2, '--d2', 9],
];
for (const args of invalid) {
  test(`rejects ${args.join(' ') || 'empty arguments'}`, () => {
    const result = cli(...args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^Error: .+/);
    assert.equal(result.stdout, '');
  });
}

test('readable fixed precision and warning output', () => {
  const result = cli('--pitch', 1.5, '--d2', 9.026, '--wire', 1);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Best wire size: 0\.8660 mm/);
  assert.match(result.stdout, /Wire used: 1\.0000 mm/);
  assert.match(result.stdout, /Over-wire M: 10\.7270 mm/);
  assert.match(result.stdout, /Warning: wire not near best size/);
});

test('precision endpoints and scientific notation', () => {
  for (const decimals of [0, 6]) {
    const result = cli('--pitch', '1.5e0', '--d2', 9.026, '--decimals', decimals);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes(`Over-wire M: ${(10.325038105676658).toFixed(decimals)} mm`));
    const data = json('--pitch', 1.5, '--d2', 9.026, '--decimals', decimals);
    assert.equal(data.m, Number(measure({ pitch: 1.5, d2: 9.026 }).m.toFixed(decimals)));
  }
});

test('help succeeds without measurement inputs', () => {
  const result = cli('--help');
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /Usage:/);
  for (const option of ['--pitch', '--angle', '--d2', '--m', '--wire', '--decimals', '--json']) {
    assert.ok(result.stdout.includes(option));
  }
});
