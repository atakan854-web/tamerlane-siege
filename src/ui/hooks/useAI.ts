// =============================================================================
// TAMERLANE SIEGE — useAI React Hook
// src/ui/hooks/useAI.ts
//
// IMPLEMENTATION NOTE:
//   Uses setTimeout on the main thread instead of a Web Worker.
//   The UI freezes briefly at depth 3+ but the logic is simple and reliable.
//   Swap back to a Worker once the bundler config is confirmed stable.
//
// Provides:
//   isThinking   — true while the engine is computing
//   makeAIMove   — run search, returns Promise<Move>
//   cancelSearch — abort any pending computation
// =============================================================================

import { useRef, useState, useCallback } from 'react'
import type { GameState, Move } from '../../core/types'
import { findBestMove }         from '../../ai/search'
import { getDifficultyParams, addRandomness } from '../../ai/difficulty'

export function useAI() {
  const [isThinking, setIsThinking] = useState(false)

  // True while a search is in flight — outlives effect cleanups
  const pendingRef   = useRef(false)
  // Set to true to abort the in-flight search
  const cancelledRef = useRef(false)

  const cancelSearch = useCallback(() => {
    cancelledRef.current = true
    pendingRef.current   = false
    setIsThinking(false)
  }, [])

  const makeAIMove = useCallback(
    (state: GameState, difficulty: number): Promise<Move> => {
      // Cancel any previous search
      cancelledRef.current = true

      return new Promise<Move>((resolve, reject) => {
        cancelledRef.current = false
        pendingRef.current   = true
        setIsThinking(true)

        // Let React render the "thinking" indicator before freezing
        setTimeout(() => {
          if (cancelledRef.current) {
            pendingRef.current = false
            reject(new Error('Cancelled'))
            return
          }
          try {
            const params = getDifficultyParams(difficulty)
            const result = findBestMove(state, params.maxDepth, params.timeLimit)
            // Apply cosmetic noise (doesn't affect the chosen move, only the
            // reported eval value — not currently displayed, but kept for future)
            addRandomness(result.eval, params.randomness)

            pendingRef.current   = false
            cancelledRef.current = false
            setIsThinking(false)
            resolve(result.move)
          } catch (err) {
            pendingRef.current   = false
            cancelledRef.current = false
            setIsThinking(false)
            reject(err instanceof Error ? err : new Error(String(err)))
          }
        }, 30) // 30 ms — enough time for React to flush the render
      })
    },
    [],
  )

  return { isThinking, makeAIMove, cancelSearch, pendingRef }
}
