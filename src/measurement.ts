export interface MeasurementInput {
  pitch: number;
  angle?: number;
  d2?: number;
  m?: number;
  wire?: number;
}

export interface MeasurementResult {
  mode: 'over-wire' | 'pitch-diameter';
  pitch: number;
  angle: number;
  bestWire: number;
  wire: number;
  d2: number;
  m: number;
  warnings: string[];
}

function positive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a finite number greater than 0`);
  }
}

export function measure(input: MeasurementInput): MeasurementResult {
  const { pitch, d2, m } = input;
  const angle = input.angle ?? 60;
  positive('pitch', pitch);
  if (!Number.isFinite(angle) || angle <= 0 || angle >= 120) {
    throw new Error('angle must be greater than 0 and less than 120 degrees');
  }
  if ((d2 === undefined) === (m === undefined)) {
    throw new Error('provide exactly one of --d2 or --m');
  }
  if (d2 !== undefined) positive('d2', d2);
  if (m !== undefined) positive('m', m);
  const halfAngle = angle * Math.PI / 360;
  const bestWire = pitch / (2 * Math.cos(halfAngle));
  const wire = input.wire ?? bestWire;
  positive('wire', wire);
  const offset = wire * (1 + 1 / Math.sin(halfAngle))
    - (pitch / 2) / Math.tan(halfAngle);
  const result = {
    mode: d2 !== undefined ? 'over-wire' as const : 'pitch-diameter' as const,
    pitch, angle, bestWire, wire,
    d2: d2 ?? m! - offset,
    m: m ?? d2! + offset,
    warnings: Math.abs(wire - bestWire) / bestWire > 0.15
      ? ['wire not near best size'] : [],
  };
  if (![result.bestWire, result.wire, result.d2, result.m].every(Number.isFinite)) {
    throw new Error('calculation exceeds the supported numeric range');
  }
  return result;
}
