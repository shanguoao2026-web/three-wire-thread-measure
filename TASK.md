# three-wire-thread-measure

Build a small TypeScript Node CLI (Node 18+, no runtime deps; devDeps typescript + @types/node only; tests with node:test) for three-wire thread pitch-diameter measurement (螺纹三针测量 M 值计算).

Inputs: --pitch <mm> (required, > 0). --angle <deg> thread angle (default 60; allow e.g. 55, 60, 30, 29; must be >0 and <120). Exactly one of --d2 <mm> (pitch diameter, compute M) or --m <mm> (measured over-wire value, compute actual d2). Optional --wire <mm> wire diameter; default is the best-size wire dD = P / (2*cos(angle/2)). --decimals <d> (0-6, default 4). --json; --help.
- M = d2 + dD*(1 + 1/sin(a/2)) - (P/2)*cot(a/2), where a = angle.
- Reverse: d2 = M - dD*(1 + 1/sin(a/2)) + (P/2)*cot(a/2).
- Always report the best wire size, the wire used, and warn "wire not near best size" if |wire - best| / best > 0.15.
- Validate: pitch <= 0, angle out of range, both or neither of d2/m, wire <= 0, d2/m <= 0, decimals out of 0-6 → error to stderr, exit 1.
- Readable text output by default, README with examples, MIT LICENSE (author shanguoao2026-web), .gitignore with node_modules/ dist/ *.log .npm-cache/.
- package.json "bin" must point to the built CLI. npm test must build and pass. No secrets, no personal info.

Check values (must be in tests; compute exactly from the formulas, 4 decimals):
- pitch1.5 d2 9.026 (angle 60, best wire) → best wire 0.8660, M 10.3250
- pitch1.5 m 10.3250 → d2 9.0260
- pitch1.5 d2 9.026 wire 1.0 → M 10.7270 and no warning (1.0 vs 0.866 is 15.5% → warning shown, assert the warning)
- pitch4 angle30 d2 18 → best wire 2.0706, M from formula
- pitch0, angle0, angle120, d2+m together, neither, wire0, decimals9 → exit 1
