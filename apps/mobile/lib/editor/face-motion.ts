import type { FaceGeom } from './faces';

/**
 * Turns face detections that arrive a few times a second (and ~70 ms late) into continuous
 * per-frame face geometry for the live camera.
 *
 * - Each detection is filtered with a One Euro style low-pass whose cutoff rises with head speed:
 *   detector jitter is suppressed when still, motion stays responsive when moving.
 * - Between detections every rendered frame extrapolates the filtered pose with its velocity
 *   (only while the head is actually moving, capped), which hides the detection latency.
 * - A short exponential follower on the render side turns each correction into a glide.
 *
 * All state lives in preallocated typed arrays and the returned faces are reused objects that are
 * mutated in place, so sampling every frame allocates nothing.
 */

const CH = 32;
/** channels below this index are geometry and get velocity prediction; the rest are expressions */
const PREDICTED = 29;
const I_CX = 0;
const I_CY = 1;
const I_RX = 2;
const I_SMILE = 30;
const I_EYES = 31;

/** Hz, cutoff while the head is still */
const MIN_CUTOFF = 1.5;
/** extra Hz per face-width/s of head speed */
const BETA = 12;
/** Hz, smoothing of the speed estimate itself */
const SPEED_CUTOFF = 2;
const VELOCITY_ALPHA = 0.85;
const EXPRESSION_ALPHA = 0.6;
/** s, how far past the last capture we extrapolate */
const MAX_PREDICT_S = 0.15;
/** s, time constant of the render-side follower */
const FOLLOW_TAU_S = 0.05;
/** prediction never moves the face more than this fraction of its width */
const MAX_SHIFT = 0.35;
/** detection rounds a track survives without being matched */
const MISS_LIMIT = 3;
const MATCH_RADIUS = 1.2;

type Track = {
  x: Float64Array;
  v: Float64Array;
  out: Float64Array;
  geom: FaceGeom;
  tMeas: number;
  tOut: number;
  speed: number;
  missed: number;
  fresh: boolean;
  matched: boolean;
};

const lowpass = (dt: number, cutoff: number) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function pack(f: FaceGeom, v: Float64Array) {
  v[0] = f.center.x;
  v[1] = f.center.y;
  v[2] = f.radius.x;
  v[3] = f.radius.y;
  v[4] = f.leftEye.x;
  v[5] = f.leftEye.y;
  v[6] = f.rightEye.x;
  v[7] = f.rightEye.y;
  v[8] = f.nose.x;
  v[9] = f.nose.y;
  v[10] = f.noseHalfWidth;
  v[11] = f.mouth.x;
  v[12] = f.mouth.y;
  v[13] = f.mouthHalfWidth;
  v[14] = f.lipHalfHeight;
  v[15] = f.chin.x;
  v[16] = f.chin.y;
  v[17] = f.leftJaw.x;
  v[18] = f.leftJaw.y;
  v[19] = f.rightJaw.x;
  v[20] = f.rightJaw.y;
  v[21] = f.leftCheek.x;
  v[22] = f.leftCheek.y;
  v[23] = f.rightCheek.x;
  v[24] = f.rightCheek.y;
  v[25] = f.eyeRadius;
  v[26] = f.ax.x;
  v[27] = f.ax.y;
  v[28] = f.yaw;
  v[29] = f.mouthOpen;
  v[30] = f.smile;
  v[31] = f.eyesOpen;
}

function unpack(v: Float64Array, f: FaceGeom) {
  f.center.x = v[0];
  f.center.y = v[1];
  f.radius.x = v[2];
  f.radius.y = v[3];
  f.leftEye.x = v[4];
  f.leftEye.y = v[5];
  f.rightEye.x = v[6];
  f.rightEye.y = v[7];
  f.nose.x = v[8];
  f.nose.y = v[9];
  f.noseHalfWidth = v[10];
  f.mouth.x = v[11];
  f.mouth.y = v[12];
  f.mouthHalfWidth = v[13];
  f.lipHalfHeight = v[14];
  f.chin.x = v[15];
  f.chin.y = v[16];
  f.leftJaw.x = v[17];
  f.leftJaw.y = v[18];
  f.rightJaw.x = v[19];
  f.rightJaw.y = v[20];
  f.leftCheek.x = v[21];
  f.leftCheek.y = v[22];
  f.rightCheek.x = v[23];
  f.rightCheek.y = v[24];
  f.eyeRadius = v[25];
  const l = Math.hypot(v[26], v[27]) || 1;
  f.ax.x = v[26] / l;
  f.ax.y = v[27] / l;
  f.up.x = f.ax.y;
  f.up.y = -f.ax.x;
  f.angle = Math.atan2(f.ax.y, f.ax.x);
  f.yaw = v[28];
  f.mouthOpen = v[29];
  f.smile = v[30];
  f.eyesOpen = v[31];
}

const vec = () => ({ x: 0, y: 0 });

function blankFace(): FaceGeom {
  return {
    center: vec(),
    radius: vec(),
    leftEye: vec(),
    rightEye: vec(),
    nose: vec(),
    noseHalfWidth: 0,
    mouth: vec(),
    mouthHalfWidth: 0,
    lipHalfHeight: 0,
    chin: vec(),
    leftJaw: vec(),
    rightJaw: vec(),
    leftCheek: vec(),
    rightCheek: vec(),
    eyeRadius: 0,
    ax: { x: 1, y: 0 },
    up: { x: 0, y: -1 },
    angle: 0,
    yaw: 0,
    mouthOpen: 0,
    smile: -1,
    eyesOpen: -1,
    contoured: false,
  };
}

export type FaceMotion = {
  /** feed one detection round; `at` is when the analysed frame was captured (performance.now ms) */
  update: (at: number, faces: readonly FaceGeom[]) => void;
  /** faces for a frame rendered at `at`; the array and objects are reused between calls */
  sample: (at: number) => readonly FaceGeom[];
  clear: () => void;
  readonly count: number;
};

export function createFaceMotion(maxFaces: number): FaceMotion {
  let tracks: Track[] = [];
  const meas = new Float64Array(CH);
  const output: FaceGeom[] = [];

  const newTrack = (at: number, m: Float64Array): Track => {
    const t: Track = {
      x: Float64Array.from(m),
      v: new Float64Array(CH),
      out: Float64Array.from(m),
      geom: blankFace(),
      tMeas: at,
      tOut: at,
      speed: 0,
      missed: 0,
      fresh: true,
      matched: true,
    };
    return t;
  };

  const correct = (t: Track, at: number, m: Float64Array) => {
    const dt = Math.max(0.016, (at - t.tMeas) / 1000);
    const { x, v } = t;
    const width = Math.max(1, 2 * x[I_RX]);
    const rawSpeed = Math.hypot(m[I_CX] - x[I_CX], m[I_CY] - x[I_CY]) / dt / width;
    t.speed += (rawSpeed - t.speed) * lowpass(dt, SPEED_CUTOFF);
    const a = lowpass(dt, MIN_CUTOFF + BETA * t.speed);
    for (let i = 0; i < PREDICTED; i += 1) {
      const prev = x[i];
      x[i] = prev + (m[i] - prev) * a;
      v[i] += ((x[i] - prev) / dt - v[i]) * VELOCITY_ALPHA;
    }
    for (let i = PREDICTED; i < CH; i += 1) {
      // smile / eyes-open are -1 when classification was not requested
      if ((i === I_SMILE || i === I_EYES) && (m[i] < 0 || x[i] < 0)) x[i] = m[i];
      else x[i] += (m[i] - x[i]) * EXPRESSION_ALPHA;
      v[i] = 0;
    }
    t.tMeas = at;
    t.missed = 0;
  };

  return {
    update(at, faces) {
      for (const t of tracks) t.matched = false;
      const added: Track[] = [];
      for (const f of faces) {
        let best: Track | null = null;
        let bestD = Infinity;
        for (const t of tracks) {
          if (t.matched) continue;
          const d = Math.hypot(t.x[I_CX] - f.center.x, t.x[I_CY] - f.center.y);
          if (d < bestD) {
            bestD = d;
            best = t;
          }
        }
        pack(f, meas);
        if (best && bestD < MATCH_RADIUS * Math.max(f.radius.x, best.x[I_RX])) {
          best.matched = true;
          best.geom.contoured = f.contoured;
          correct(best, at, meas);
        } else if (tracks.length + added.length < maxFaces) {
          const t = newTrack(at, meas);
          t.geom.contoured = f.contoured;
          added.push(t);
        }
      }
      for (const t of tracks) if (!t.matched) t.missed += 1;
      tracks = tracks.filter((t) => t.missed < MISS_LIMIT).concat(added);
    },

    sample(at) {
      output.length = 0;
      for (const t of tracks) {
        const { x, v, out } = t;
        const gain = smoothstep(0.15, 0.6, t.speed);
        let lead = 0;
        if (gain > 0) {
          const age = Math.min(MAX_PREDICT_S, Math.max(0, (at - t.tMeas) / 1000)) + FOLLOW_TAU_S;
          lead = age * gain;
          const shift = Math.hypot(v[I_CX], v[I_CY]) * lead;
          const limit = MAX_SHIFT * 2 * x[I_RX];
          if (shift > limit) lead *= limit / shift;
        }
        if (t.fresh) {
          for (let i = 0; i < CH; i += 1) out[i] = x[i] + v[i] * lead;
          t.fresh = false;
        } else {
          const dt = Math.min(0.1, Math.max(0, (at - t.tOut) / 1000));
          const k = 1 - Math.exp(-dt / FOLLOW_TAU_S);
          for (let i = 0; i < CH; i += 1) out[i] += (x[i] + v[i] * lead - out[i]) * k;
          if (x[I_SMILE] < 0) out[I_SMILE] = -1;
          if (x[I_EYES] < 0) out[I_EYES] = -1;
        }
        t.tOut = at;
        unpack(out, t.geom);
        output.push(t.geom);
      }
      return output;
    },

    clear() {
      tracks = [];
      output.length = 0;
    },

    get count() {
      return tracks.length;
    },
  };
}
