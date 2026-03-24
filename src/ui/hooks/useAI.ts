// =============================================================================
// TAMERLANE SIEGE — useAI React Hook (Web Worker-based)
// src/ui/hooks/useAI.ts
//
// Runs the AI search in a dedicated Web Worker so the main thread stays
// responsive during deep searches.
// =============================================================================

import { useRef, useState, useCallback } from 'react'
import type { GameState, Move } from '../../core/types'
import { stateToTFEN } from '../../core/notation'
import { getAIWorker } from '../../ai/aiWorkerInstance'
import type { WorkerOutMessage, WorkerErrorMessage } from '../../ai/worker'

export function useAI() {
  const [isThinking, setIsThinking] = useState(false)

  // Holds resolve/reject for the in-flight Promise; null when idle or cancelled
  const callbackRef = useRef<{
    resolve: (move: Move) => void
    reject: (err: Error) => void
  } | null>(null)

  const cancelSearch = useCallback(() => {
    callbackRef.current = null
    setIsThinking(false)
  }, [])

  const makeAIMove = useCallback(
    (state: GameState, difficulty: number): Promise<Move> => {
      // Cancel any previous in-flight search
      callbackRef.current = null

      return new Promise<Move>((resolve, reject) => {
        setIsThinking(true)
        callbackRef.current = { resolve, reject }

        const worker = getAIWorker()

        worker.onmessage = (e: MessageEvent<WorkerOutMessage | WorkerErrorMessage>) => {
          if (!callbackRef.current) return // cancelled

          if ('error' in e.data) {
            callbackRef.current.reject(new Error(e.data.error))
          } else {
            callbackRef.current.resolve(e.data.bestMove)
          }
          callbackRef.current = null
          setIsThinking(false)
        }

        worker.onerror = (err) => {
          if (!callbackRef.current) return
          callbackRef.current.reject(new Error(err.message))
          callbackRef.current = null
          setIsThinking(false)
        }

        const tfen = stateToTFEN(state)
        worker.postMessage({ command: 'search', tfen, difficulty })
      })
    },
    [],
  )

  return { isThinking, makeAIMove, cancelSearch }
}
