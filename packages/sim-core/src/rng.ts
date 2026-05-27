// xorshift128+ — a fast, statistically sound PRNG. Deterministic from a seed.
// Reference: Vigna, "Further scramblings of Marsaglia's xorshift generators"
//
// We use BigInt for the 64-bit state (Node 22 BigInt is fine; perf is fine for
// the simulator tick loop). Output is mapped to the [0, 1) range like Math.random.
//
// Invariants:
// - Same seed → same sequence, byte-for-byte, across Node/browser/runtime.
// - Independent instances do not share state.

const MASK_64 = (1n << 64n) - 1n;
const TWO_53 = 2 ** 53;

export class SeededRng {
  private s0: bigint;
  private s1: bigint;

  constructor(seed: bigint | number | string) {
    const seedBig = normaliseSeed(seed);
    // splitmix64 to expand a single seed into two 64-bit lanes.
    let z = seedBig;
    z = (z + 0x9e3779b97f4a7c15n) & MASK_64;
    this.s0 = splitmix64(z);
    z = (z + 0x9e3779b97f4a7c15n) & MASK_64;
    this.s1 = splitmix64(z);
    // Avoid the all-zeros state (xorshift would lock at 0).
    if (this.s0 === 0n && this.s1 === 0n) {
      this.s1 = 1n;
    }
  }

  /** Advance the state once and return the raw 64-bit unsigned integer. */
  nextUint64(): bigint {
    let s1 = this.s0;
    const s0 = this.s1;
    this.s0 = s0;
    s1 ^= (s1 << 23n) & MASK_64;
    this.s1 = (s1 ^ s0 ^ (s1 >> 17n) ^ (s0 >> 26n)) & MASK_64;
    return (this.s1 + s0) & MASK_64;
  }

  /** Floating-point in [0, 1) with 53 bits of entropy (like Math.random). */
  nextFloat(): number {
    return Number(this.nextUint64() >> 11n) / TWO_53;
  }

  /** Uniform integer in [min, max] inclusive. */
  nextInt(min: number, max: number): number {
    if (max < min) throw new RangeError('nextInt: max must be >= min');
    const span = max - min + 1;
    return min + Math.floor(this.nextFloat() * span);
  }

  /** Uniform float in [min, max). */
  nextRange(min: number, max: number): number {
    return min + this.nextFloat() * (max - min);
  }

  /** Box-Muller normal sample (mean, stddev). */
  nextNormal(mean = 0, stdDev = 1): number {
    const u1 = Math.max(this.nextFloat(), Number.EPSILON);
    const u2 = this.nextFloat();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /** Bernoulli trial — true with probability p. */
  nextBoolean(p = 0.5): boolean {
    return this.nextFloat() < p;
  }

  /** Pick one element. Throws on empty arrays. */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new RangeError('pick: array is empty');
    const item = arr[this.nextInt(0, arr.length - 1)];
    // Safe: index is guaranteed in range.
    return item as T;
  }

  /** Fork — derived child seed deterministic from the parent's current state. */
  fork(): SeededRng {
    return new SeededRng(this.nextUint64());
  }
}

function splitmix64(seed: bigint): bigint {
  let z = seed & MASK_64;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK_64;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK_64;
  z = (z ^ (z >> 31n)) & MASK_64;
  return z;
}

function normaliseSeed(seed: bigint | number | string): bigint {
  if (typeof seed === 'bigint') return seed & MASK_64;
  if (typeof seed === 'number') {
    if (!Number.isFinite(seed)) throw new TypeError('seed must be finite');
    return BigInt(Math.trunc(seed)) & MASK_64;
  }
  // String seed: FNV-1a 64-bit hash. Stable across runtimes.
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < seed.length; i++) {
    hash ^= BigInt(seed.charCodeAt(i));
    hash = (hash * prime) & MASK_64;
  }
  return hash;
}
