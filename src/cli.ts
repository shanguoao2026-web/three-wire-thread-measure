#!/usr/bin/env node
import { measure } from './measurement.js';

const help = `Three-wire thread pitch-diameter measurement (mm)

Usage:
  three-wire-thread-measure --pitch <mm> (--d2 <mm> | --m <mm>) [options]

Options:
  --pitch <mm>      Thread pitch, greater than 0 (required)
  --d2 <mm>         Pitch diameter: compute over-wire M
  --m <mm>          Measured over-wire M: compute pitch diameter
  --angle <deg>     Included thread angle, 0 < angle < 120 (default 60)
  --wire <mm>       Wire diameter (default: best wire size)
  --decimals <d>    Output decimal places, integer 0–6 (default 4)
  --json            Emit JSON, with rounded numeric values and warnings
  --help            Show this help
`;

function main(args: string[]): void {
  const values = new Map<string, number>();
  const flags = new Set<string>();
  const numeric = new Set(['--pitch', '--angle', '--d2', '--m', '--wire', '--decimals']);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (values.has(arg) || flags.has(arg)) throw new Error(`duplicate option: ${arg}`);
    if (arg === '--help' || arg === '--json') {
      flags.add(arg);
    } else if (numeric.has(arg)) {
      const raw = args[++i];
      if (raw === undefined || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)) {
        throw new Error(`${arg} requires a numeric value`);
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error(`${arg} must be finite`);
      values.set(arg, value);
    } else {
      throw new Error(`unknown option: ${arg}`);
    }
  }
  if (flags.has('--help')) {
    process.stdout.write(help);
    return;
  }
  if (!values.has('--pitch')) throw new Error('--pitch is required');
  const decimals = values.get('--decimals') ?? 4;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) {
    throw new Error('decimals must be an integer from 0 to 6');
  }
  const result = measure({
    pitch: values.get('--pitch')!, angle: values.get('--angle'),
    d2: values.get('--d2'), m: values.get('--m'), wire: values.get('--wire'),
  });
  if (flags.has('--json')) {
    process.stdout.write(JSON.stringify(Object.fromEntries(
      Object.entries(result).map(([key, value]) => [
        key, typeof value === 'number' ? Number(value.toFixed(decimals)) : value,
      ]),
    ), null, 2) + '\n');
  } else {
    const fmt = (value: number) => value.toFixed(decimals);
    process.stdout.write([
      `Pitch: ${fmt(result.pitch)} mm`,
      `Thread angle: ${fmt(result.angle)} deg`,
      `Best wire size: ${fmt(result.bestWire)} mm`,
      `Wire used: ${fmt(result.wire)} mm`,
      `Pitch diameter d2: ${fmt(result.d2)} mm`,
      `Over-wire M: ${fmt(result.m)} mm`,
      ...result.warnings.map(warning => `Warning: ${warning}`),
    ].join('\n') + '\n');
  }
}

try {
  main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
