/** Fixed-size sample window for on-device timing stats; pushing never allocates. */
export class Samples {
  private readonly buf: Float64Array;
  private n = 0;
  private next = 0;

  constructor(capacity = 512) {
    this.buf = new Float64Array(capacity);
  }

  push(v: number) {
    this.buf[this.next] = v;
    this.next = (this.next + 1) % this.buf.length;
    if (this.n < this.buf.length) this.n += 1;
  }

  get count() {
    return this.n;
  }

  reset() {
    this.n = 0;
    this.next = 0;
  }

  /** Nearest-rank percentile (0..100) of the current window, rounded to 0.1; 0 when empty. */
  percentile(p: number): number {
    if (this.n === 0) return 0;
    const sorted = this.buf.slice(0, this.n).sort();
    const i = Math.min(this.n - 1, Math.max(0, Math.ceil((p / 100) * this.n) - 1));
    return Math.round(sorted[i] * 10) / 10;
  }

  max(): number {
    let m = 0;
    for (let i = 0; i < this.n; i += 1) if (this.buf[i] > m) m = this.buf[i];
    return Math.round(m * 10) / 10;
  }
}

export const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());
