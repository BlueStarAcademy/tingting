import type { FaceGeom, Vec } from './faces';

export type DebugPath = { pts: Vec[]; closed: boolean; color: string };

const LIP_OUTER = '#FF4FA3';
const LIP_INNER = '#36E0FF';
const EYE = '#FFE04F';
const OVAL = '#5CFF8A';
const POINT = '#FFFFFF';

/** face-space point: u along the eye line, v toward the forehead, both in pixels */
const at = (f: FaceGeom, origin: Vec, u: number, v: number): Vec => ({
  x: origin.x + f.ax.x * u + f.up.x * v,
  y: origin.y + f.ax.y * u + f.up.y * v,
});

/**
 * The lip outline exactly as the lip tint sees it (lipMask in beauty-core): outer curve, plus the
 * inner gap when the mouth is open enough for the shader to cut it out.
 */
export function lipCurves(f: FaceGeom, steps = 24): { outer: Vec[]; inner: Vec[] | null } {
  const hw = f.mouthHalfWidth;
  const hh = f.lipHalfHeight;
  const cv = f.lipCorner;
  const curve = (edge: number, exp: number, reverse: boolean) => {
    const pts: Vec[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const u = reverse ? 1 - (2 * i) / steps : -1 + (2 * i) / steps;
      const s = Math.max(0, 1 - u * u);
      pts.push(at(f, f.mouth, u * hw, cv + (edge - cv) * Math.pow(s, exp)));
    }
    return pts;
  };
  const outer = [...curve(hh, 0.8, false), ...curve(-hh, 0.8, true)];
  const feather = Math.max(1, hh * 0.14);
  const inner =
    f.lipInnerTop - f.lipInnerBottom > feather * 0.5
      ? [...curve(f.lipInnerTop, 1.1, false), ...curve(f.lipInnerBottom, 0.8, true)]
      : null;
  return { outer, inner };
}

function ellipse(f: FaceGeom, c: Vec, rx: number, ry: number, steps = 32): Vec[] {
  return Array.from({ length: steps }, (_, i) => {
    const a = (Math.PI * 2 * i) / steps;
    return at(f, c, Math.cos(a) * rx, Math.sin(a) * ry);
  });
}

function cross(f: FaceGeom, c: Vec, r: number): DebugPath[] {
  return [
    { pts: [at(f, c, -r, 0), at(f, c, r, 0)], closed: false, color: POINT },
    { pts: [at(f, c, 0, -r), at(f, c, 0, r)], closed: false, color: POINT },
  ];
}

/** Polylines of what the tracker found: lips, eyes, face oval and anchor points. */
export function faceDebugPaths(f: FaceGeom): DebugPath[] {
  const { outer, inner } = lipCurves(f);
  const out: DebugPath[] = [{ pts: outer, closed: true, color: LIP_OUTER }];
  if (inner) out.push({ pts: inner, closed: true, color: LIP_INNER });
  out.push({ pts: [at(f, f.mouth, -f.mouthHalfWidth, f.lipCorner), at(f, f.mouth, f.mouthHalfWidth, f.lipCorner)], closed: false, color: LIP_INNER });
  for (const eye of [f.leftEye, f.rightEye]) out.push({ pts: ellipse(f, eye, f.eyeRadius, f.eyeRadius * 0.45, 20), closed: true, color: EYE });
  out.push({ pts: [f.leftEye, f.rightEye], closed: false, color: EYE });
  out.push({ pts: ellipse(f, f.center, f.radius.x, f.radius.y, 48), closed: true, color: OVAL });
  out.push({ pts: [f.leftJaw, f.chin, f.rightJaw], closed: false, color: OVAL });
  const r = Math.max(2, f.eyeRadius * 0.25);
  for (const p of [f.nose, f.leftCheek, f.rightCheek, f.chin]) out.push(...cross(f, p, r));
  return out;
}
