// =============================================================================
// TAMERLANE SIEGE — AI Web Worker
// src/ai/worker.ts
//
// Runs the alpha-beta search off the main thread.
// GameState is passed as a TFEN string (Maps aren't structurally cloneable).
//
// Message protocol:
//   IN:  { command: 'search', tfen: string, difficulty: number }
//   OUT: { bestMove: Move, eval: number, depth: number }
//        | { error: string }
// =============================================================================

import { tFENtoState } from '../core/notation'
import { findBestMove } from './search'
import { getDifficultyParams, addRandomness } from './difficulty'
import type { Move } from '../core/types'

export interface WorkerInMessage {
  command:    'search'
  tfen:       string
  difficulty: number
}

export interface WorkerOutMessage {
  bestMove: Move
  eval:     number
  depth:    number
}

export interface WorkerErrorMessage {
  error: string
}

// Vite module worker — `self` is the DedicatedWorkerGlobalScope
self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const { command, tfen, difficulty } = event.data

  if (command !== 'search') return

  try {
    const state  = tFENtoState(tfen)
    const params = getDifficultyParams(difficulty)
    const result = findBestMove(state, params.maxDepth, params.timeLimit)

    // Apply randomness to the reported eval (not the move selection — that
    // already happened inside findBestMove; here we just nudge the display
    // value for cosmetic variation at low levels).
    const noisyEval = addRandomness(result.eval, params.randomness)

    const out: WorkerOutMessage = {
      bestMove: result.move,
      eval:     noisyEval,
      depth:    result.depth,
    }

    self.postMessage(out)
  } catch (err) {
    const out: WorkerErrorMessage = { error: String(err) }
    self.postMessage(out)
  }
}
