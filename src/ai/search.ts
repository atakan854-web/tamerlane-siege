// =============================================================================
// TAMERLANE SIEGE — Alpha-Beta Search with Iterative Deepening
// src/ai/search.ts
//
// findBestMove(state, maxDepth, timeLimit) → { move, eval, depth }
//
// Algorithm:
//   1. Iterative deepening: search depth 1, 2, … maxDepth
//   2. At each depth: negamax alpha-beta (white-positive convention)
//   3. Move ordering: captures first (MVV-LVA), then promotions, quiet
//   4. Transposition table: TFEN string → { depth, score, flag, bestMove }
//   5. Time check every N nodes; abort when timeLimit exceeded
// =============================================================================

import type { GameState, Move } from '../core/types'
import { getAllLegalMoves, getGameResult } from '../core/rules'
import { makeMove }                        from '../core/game'
import { stateToTFEN }                    from '../core/notation'
import { evaluate }                        from './eval'
import { orderMoves }                      from './moveOrder'
import { TranspositionTable }              from './transposition'

// =============================================================================
// Result type
// =============================================================================

export interface SearchResult {
  move:  Move
  eval:  number
  depth: number
}

// =============================================================================
// Internal search context (avoids passing many args recursively)
// =============================================================================

interface SearchCtx {
  tt:         TranspositionTable
  startTime:  number
  timeLimit:  number
  nodes:      number
  aborted:    boolean
}

// How often (nodes) to check the clock
const TIME_CHECK_INTERVAL = 2000

// =============================================================================
// Negamax alpha-beta
// =============================================================================

/**
 * Negamax from the perspective of the side to move.
 * Returns a score where higher = better for the side currently moving.
 */
function negamax(
  state:  GameState,
  depth:  number,
  alpha:  number,
  beta:   number,
  ctx:    SearchCtx,
): number {
  // Time check
  ctx.nodes++
  if (ctx.nodes % TIME_CHECK_INTERVAL === 0) {
    if (Date.now() - ctx.startTime > ctx.timeLimit) {
      ctx.aborted = true
      return 0
    }
  }

  if (ctx.aborted) return 0

  // Transposition table lookup
  const key = stateToTFEN(state)
  const tte = ctx.tt.get(key)
  if (tte && tte.depth >= depth) {
    if (tte.flag === 'exact')                   return tte.score
    if (tte.flag === 'lower' && tte.score > alpha) alpha = tte.score
    if (tte.flag === 'upper' && tte.score < beta)  beta  = tte.score
    if (alpha >= beta) return tte.score
  }

  // Leaf node — quiescent / terminal
  if (depth === 0) {
    // From current player's perspective (negamax convention)
    const raw = evaluate(state)
    return state.turn === 'w' ? raw : -raw
  }

  // Terminal position check
  const result = getGameResult(state)
  if (result !== null) {
    const raw = evaluate(state)
    return state.turn === 'w' ? raw : -raw
  }

  // Generate and order moves
  const moves = orderMoves(getAllLegalMoves(state.turn, state))
  if (moves.length === 0) {
    const raw = evaluate(state)
    return state.turn === 'w' ? raw : -raw
  }

  let bestScore = -Infinity
  let bestMove: Move | null = null
  let ttFlag: 'exact' | 'lower' | 'upper' = 'upper'

  for (const move of moves) {
    if (ctx.aborted) break

    const next  = makeMove(state, move)
    const score = -negamax(next, depth - 1, -beta, -alpha, ctx)

    if (score > bestScore) {
      bestScore = score
      bestMove  = move
    }

    if (score > alpha) {
      alpha   = score
      ttFlag  = 'exact'
    }

    if (alpha >= beta) {
      ttFlag = 'lower'
      break
    }
  }

  // Store in transposition table
  ctx.tt.set(key, {
    depth:    depth,
    score:    bestScore,
    flag:     ttFlag,
    bestMove: bestMove,
  })

  return bestScore
}

// =============================================================================
// findBestMove — iterative deepening entry point
// =============================================================================

export function findBestMove(
  state:     GameState,
  maxDepth:  number,
  timeLimit: number,
): SearchResult {
  const tt  = new TranspositionTable()
  const ctx: SearchCtx = {
    tt,
    startTime: Date.now(),
    timeLimit,
    nodes:    0,
    aborted:  false,
  }

  const legalMoves = getAllLegalMoves(state.turn, state)

  // Fallback if no moves (shouldn't happen in a live game)
  if (legalMoves.length === 0) {
    throw new Error('findBestMove called on terminal position')
  }

  let bestResult: SearchResult = {
    move:  orderMoves(legalMoves)[0],
    eval:  0,
    depth: 0,
  }

  for (let depth = 1; depth <= maxDepth; depth++) {
    ctx.aborted = false

    let bestScore = -Infinity
    let bestMove  = bestResult.move

    const ordered = orderMoves(legalMoves)

    for (const move of ordered) {
      if (Date.now() - ctx.startTime > timeLimit) {
        ctx.aborted = true
        break
      }

      const next  = makeMove(state, move)
      const score = -negamax(next, depth - 1, -Infinity, Infinity, ctx)

      if (score > bestScore) {
        bestScore = score
        bestMove  = move
      }
    }

    if (!ctx.aborted) {
      // Full depth completed — commit this result
      const absScore = state.turn === 'w' ? bestScore : -bestScore
      bestResult = { move: bestMove, eval: absScore, depth }
    } else {
      // Aborted mid-depth — keep previous depth's result
      break
    }
  }

  return bestResult
}
