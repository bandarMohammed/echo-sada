/**
 * Deterministic RNG so seeded demo data is reproducible across runs.
 * mulberry32 — small, fast, good enough for synthetic data.
 */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    /** float in [0, 1) */
    float: next,
    /** int in [min, max] inclusive */
    int(min: number, max: number) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    /** float in [min, max) rounded to `decimals` */
    range(min: number, max: number, decimals = 1) {
      const v = next() * (max - min) + min;
      const p = 10 ** decimals;
      return Math.round(v * p) / p;
    },
    /** true with probability p */
    chance(p: number) {
      return next() < p;
    },
    /** pick one element */
    pick<T>(arr: readonly T[]): T {
      return arr[Math.floor(next() * arr.length)];
    },
    /** pick n distinct elements (or fewer if arr is small) */
    sample<T>(arr: readonly T[], n: number): T[] {
      const pool = [...arr];
      const out: T[] = [];
      while (out.length < n && pool.length > 0) {
        out.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
      }
      return out;
    },
    /** gaussian-ish value via central limit, clamped */
    gaussian(mean: number, sd: number) {
      const u = (next() + next() + next() + next() - 2) / 2;
      return mean + u * sd * 2;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Fixed "now" for deterministic relative dates (matches project date). */
export const NOW = new Date("2026-09-07T00:00:00.000Z");

export function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY_MS);
}

export function daysFromNow(days: number): Date {
  return new Date(NOW.getTime() + days * DAY_MS);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}
