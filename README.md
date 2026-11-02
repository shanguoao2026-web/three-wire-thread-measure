# three-wire-thread-measure

螺纹三针测量 M 值计算 — a TypeScript CLI for three-wire thread pitch-diameter measurement. Requires Node.js 18 or newer. No runtime dependencies.

```sh
npm install
npm run build
node dist/cli.js --help
npm test
```

The package bin is `three-wire-thread-measure`, pointing to `dist/cli.js`.
After building, `npm link` makes that command available locally.

All lengths are in millimetres. Supply a positive `--pitch` and exactly one positive input: `--d2` to compute over-wire M, or `--m` to compute actual pitch diameter.

```sh
node dist/cli.js --pitch 1.5 --d2 9.026
# Best wire size: 0.8660 mm; Over-wire M: 10.3250 mm

node dist/cli.js --pitch 1.5 --m 10.3250
# Pitch diameter d2: 9.0260 mm

node dist/cli.js --pitch 1.5 --d2 9.026 --wire 1.0
# Over-wire M: 10.7270 mm; Warning: wire not near best size

node dist/cli.js --pitch 4 --angle 30 --d2 18 --json --decimals 6
```

`--angle` is the included thread angle in degrees (default 60; strictly between 0 and 120, including 55, 30, and 29). `--wire` supplies a positive wire diameter; otherwise the best-size wire is used. `--decimals` is an integer from 0 to 6 (default 4). `--json` emits a single JSON object with numeric fields `pitch`, `angle`, `bestWire`, `wire`, `d2`, `m`, a `mode`, and a `warnings` array. Numeric JSON values are rounded to the requested precision; trailing zeroes are not preserved. Text output uses fixed decimal places.

Both formats always include best wire size and wire used. A relative difference greater than 15% from the best size produces `wire not near best size`. The 1.0 mm wire at pitch 1.5 and angle 60 differs by about 15.47%, so it triggers the warning. Warnings appear in text stdout or in the JSON warnings array. Invalid input produces an error on stderr and exit status 1.

For pitch P, wire diameter dD, and included angle a:

- Best wire: `P / (2*cos(a/2))`
- Forward: `M = d2 + dD*(1 + 1/sin(a/2)) - (P/2)*cot(a/2)`
- Reverse: `d2 = M - dD*(1 + 1/sin(a/2)) + (P/2)*cot(a/2)`

Angles are converted to radians for trigonometry. Calculations use full precision before output rounding.

MIT license; author shanguoao2026-web.
