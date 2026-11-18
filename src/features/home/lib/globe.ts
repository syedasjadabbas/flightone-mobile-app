/**
 * Tiny 3D maths for the Home globe: points on a unit sphere, rotation,
 * orthographic projection and great-circle arcs. Pure — no React.
 */

export type Vec3 = [number, number, number];
export type Projected = { x: number; y: number; z: number };

const DEG = Math.PI / 180;

/** Evenly spread points on a sphere (Fibonacci lattice). */
export function fibonacciSphere(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    pts.push([Math.cos(theta) * r, y, Math.sin(theta) * r]);
  }
  return pts;
}

/** Latitude/longitude (degrees) → unit vector. +y is north, longitude 0 faces the viewer (+z). */
export function latLonToVec(lat: number, lon: number): Vec3 {
  const phi = lat * DEG;
  const lambda = lon * DEG;
  return [Math.cos(phi) * Math.sin(lambda), Math.sin(phi), Math.cos(phi) * Math.cos(lambda)];
}

/**
 * Spin around the vertical axis by `yaw`, then tilt toward the viewer by `tilt` (radians).
 * Returns screen coords in [-1, 1] (y down) plus depth z (> 0 = front).
 */
export function project([x, y, z]: Vec3, yaw: number, tilt: number): Projected {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const y2 = y * ct - z1 * st;
  const z2 = y * st + z1 * ct;
  return { x: x1, y: -y2, z: z2 };
}

/** Points along the great circle a→b, lifted off the surface in the middle (`lift` 0..1). */
export function greatCircle(a: Vec3, b: Vec3, steps: number, lift = 0.18): Vec3[] {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  const out: Vec3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let p: Vec3;
    if (omega < 1e-6) p = a;
    else {
      const s = Math.sin(omega);
      const k1 = Math.sin((1 - t) * omega) / s;
      const k2 = Math.sin(t * omega) / s;
      p = [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
    }
    const h = 1 + lift * Math.sin(Math.PI * t) * Math.min(1, omega / 1.2);
    out.push([p[0] * h, p[1] * h, p[2] * h]);
  }
  return out;
}

/** Yaw that turns a longitude to face the viewer. */
export function yawFacing(lon: number): number {
  return -lon * DEG;
}

export const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  LHE: { lat: 31.52, lon: 74.4 },
  KHI: { lat: 24.9, lon: 67.16 },
  ISB: { lat: 33.55, lon: 72.83 },
  DXB: { lat: 25.25, lon: 55.36 },
  DOH: { lat: 25.27, lon: 51.61 },
  JED: { lat: 21.68, lon: 39.16 },
  IST: { lat: 41.27, lon: 28.75 },
  LHR: { lat: 51.47, lon: -0.45 },
  BKK: { lat: 13.69, lon: 100.75 },
  JFK: { lat: 40.64, lon: -73.78 },
  HND: { lat: 35.55, lon: 139.78 },
};
