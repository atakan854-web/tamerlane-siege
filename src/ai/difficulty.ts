// =============================================================================
// TAMERLANE SIEGE — Difficulty Level Mapping
// src/ai/difficulty.ts
// =============================================================================

export interface DifficultyParams {
  maxDepth:   number
  timeLimit:  number   // milliseconds
  randomness: number   // centipawn noise added to eval (±)
}

// Level → parameters table
const DIFFICULTY_TABLE: Record<number, DifficultyParams> = {
  1:  { maxDepth: 1, timeLimit:  500, randomness: 200 },
  2:  { maxDepth: 1, timeLimit:  500, randomness: 150 },
  3:  { maxDepth: 2, timeLimit: 1000, randomness: 100 },
  4:  { maxDepth: 2, timeLimit: 1000, randomness:  50 },
  5:  { maxDepth: 3, timeLimit: 1500, randomness:  30 },
  6:  { maxDepth: 3, timeLimit: 1500, randomness:  15 },
  7:  { maxDepth: 4, timeLimit: 2000, randomness:  10 },
  8:  { maxDepth: 4, timeLimit: 2000, randomness:   5 },
  9:  { maxDepth: 5, timeLimit: 2500, randomness:   0 },
  10: { maxDepth: 5, timeLimit: 3000, randomness:   0 },
}

/** Returns difficulty params for levels 1–10.  Clamps outside that range. */
export function getDifficultyParams(level: number): DifficultyParams {
  const clamped = Math.max(1, Math.min(10, Math.round(level)))
  return DIFFICULTY_TABLE[clamped]
}

/** Adds uniform random noise in [−randomness, +randomness] to an eval score. */
export function addRandomness(score: number, randomness: number): number {
  if (randomness === 0) return score
  const noise = (Math.random() * 2 - 1) * randomness
  return score + noise
}

/** Human-readable label for each difficulty level. */
export const DIFFICULTY_LABELS: Record<number, string> = {
  1:  'Başlangıç',
  2:  'Kolay',
  3:  'Kolay+',
  4:  'Orta−',
  5:  'Orta',
  6:  'Orta+',
  7:  'Zor−',
  8:  'Zor',
  9:  'Uzman',
  10: 'Uzman+',
}
