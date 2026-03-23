// =============================================================================
// TAMERLANE SIEGE — Transposition Table
// src/ai/transposition.ts
//
// Keyed by stateToTFEN string.  Stores the best result found at a given depth
// so that positions reached via different move orders aren't re-searched.
// =============================================================================

import type { Move } from '../core/types'

export type TTFlag = 'exact' | 'lower' | 'upper'

export interface TTEntry {
  depth:    number
  score:    number
  flag:     TTFlag
  bestMove: Move | null
}

// Simple in-process Map — cleared at the start of each search root call.
export class TranspositionTable {
  private readonly map = new Map<string, TTEntry>()

  get(key: string): TTEntry | undefined {
    return this.map.get(key)
  }

  set(key: string, entry: TTEntry): void {
    this.map.set(key, entry)
  }

  clear(): void {
    this.map.clear()
  }

  get size(): number {
    return this.map.size
  }
}
