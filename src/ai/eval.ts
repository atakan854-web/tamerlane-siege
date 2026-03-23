// =============================================================================
// TAMERLANE SIEGE — Static Position Evaluation
// src/ai/eval.ts
//
// evaluate(state) → number
//   Positive  = White advantage (in centipawn-like units)
//   Negative  = Black advantage
//
// Components:
//   a) Material balance              (weight 1.0)
//   b) Mobility                      (weight 0.15 per half-move difference)
//   c) Royal safety                  (weight 0.3 applied to safety score)
//   d) Pawn-of-Pawns stage bonus     (dynamic)
//   e) Citadel pressure              (weight 0.2)
//   f) Game-over shortcut            (±99999 / 0)
//
// Imports only from src/core/.
// =============================================================================

import {
  type GameState,
  type Square,
  type Color,
  PieceType,
  PawnOfPawnsStage,
  GameResult,
} from '../core/types'
import {
  getAdjacentSquares,
} from '../core/board'
import {
  PIECE_VALUES,
  WHITE_CITADEL,
  BLACK_CITADEL,
} from '../core/constants'
import { getAllLegalMoves, isRoyalInCheck, getGameResult } from '../core/rules'
import { isSquareAttackedBy } from '../core/moves'

// =============================================================================
// Helpers
// =============================================================================

/** Manhattan distance between two squares. */
function dist(a: Square, b: Square): number {
  return Math.abs(a.file - b.file) + Math.abs(a.rank - b.rank)
}

function oppColor(c: Color): Color { return c === 'w' ? 'b' : 'w' }
function ownCitadel(c: Color): Square { return c === 'w' ? WHITE_CITADEL : BLACK_CITADEL }
function oppCitadel(c: Color): Square { return c === 'w' ? BLACK_CITADEL : WHITE_CITADEL }

// =============================================================================
// (a) Material balance
// =============================================================================

function materialScore(state: GameState): number {
  let score = 0
  for (const piece of state.pieces.values()) {
    const val = PIECE_VALUES[piece.type]
    if (isFinite(val)) {
      score += piece.color === 'w' ? val : -val
    }
  }
  return score
}

// =============================================================================
// (b) Mobility
// =============================================================================

function mobilityScore(state: GameState): number {
  if (state.result !== null) return 0
  const wMoves = getAllLegalMoves('w', state).length
  const bMoves = getAllLegalMoves('b', state).length
  return (wMoves - bMoves) * 0.15
}

// =============================================================================
// (c) Royal safety  (applied with weight 0.3)
// =============================================================================

function royalSafetyScore(state: GameState): number {
  let score = 0

  function evalSide(royals: Square[], color: Color, sign: 1 | -1): void {
    const opp        = oppColor(color)
    const own        = ownCitadel(color)
    const oppRoyals  = color === 'w' ? state.blackRoyals : state.whiteRoyals

    for (const sq of royals) {
      // Check penalty
      if (isRoyalInCheck(sq, color, state)) score += sign * -50
      // Adjacent squares threatened by opponent
      const adj      = getAdjacentSquares(sq)
      const attacked = adj.filter(a => isSquareAttackedBy(a, opp, state)).length
      score += sign * -5 * attacked
      // Proximity to own citadel (safety / escape route bonus)
      const dOwn = dist(sq, own)
      if (dOwn > 0) score += sign * (10 / dOwn)
    }

    // Penalty: opponent royals approaching our citadel (draw threat)
    for (const oppSq of oppRoyals) {
      const d = dist(oppSq, own)
      if (d > 0) score += sign * (-15 / d)
    }
  }

  evalSide(state.whiteRoyals, 'w',  1)
  evalSide(state.blackRoyals, 'b', -1)

  return score * 0.3
}

// =============================================================================
// (d) Pawn-of-Pawns stage bonus
// =============================================================================

function ppBonus(state: GameState): number {
  let score = 0

  function evalPP(stage: PawnOfPawnsStage, color: Color, sign: 1 | -1): void {
    const ppKey = [...state.pieces.entries()]
      .find(([, p]) => p.type === PieceType.PAWN_OF_PAWNS && p.color === color)?.[0]

    switch (stage) {
      case PawnOfPawnsStage.UNPROMOTED:
      case PawnOfPawnsStage.STAGE1_TELEPORTED: {
        if (!ppKey) return
        const [, r] = ppKey.split(',').map(Number)
        // Advancement toward own back rank
        const advancement = color === 'w' ? r : (9 - r)
        score += sign * (PIECE_VALUES[PieceType.PAWN_OF_PAWNS] + advancement * 10)
        return
      }
      case PawnOfPawnsStage.STAGE1_ON_BACK_RANK:
        score += sign * 200  // immobile & invincible bonus
        return
      case PawnOfPawnsStage.STAGE2_ON_BACK_RANK:
        score += sign * 300
        return
      case PawnOfPawnsStage.STAGE2_RELOCATED:
        score += sign * 350
        return
      case PawnOfPawnsStage.PROMOTED_TO_ADV_KING:
        // Already counted in material (PIECE_VALUES[ADVENTITIOUS_KING] = 900)
        return
    }
  }

  evalPP(state.whitePawnOfPawnsStage, 'w',  1)
  evalPP(state.blackPawnOfPawnsStage, 'b', -1)
  return score
}

// =============================================================================
// (e) Citadel pressure  (applied with weight 0.2)
// =============================================================================

function citadelPressureScore(state: GameState): number {
  let score = 0

  function evalSide(royals: Square[], color: Color, sign: 1 | -1): void {
    const target = oppCitadel(color)
    for (const sq of royals) {
      const d = dist(sq, target)
      if (d <= 1)       score += sign * 100
      else if (d === 2) score += sign * 60
      else if (d === 3) score += sign * 30
    }
  }

  evalSide(state.whiteRoyals, 'w',  1)
  evalSide(state.blackRoyals, 'b', -1)

  return score * 0.2
}

// =============================================================================
// Main evaluate()
// =============================================================================

export function evaluate(state: GameState): number {
  // (f) Game-over short-circuit
  const result = getGameResult(state)
  if (result !== null) {
    switch (result) {
      case GameResult.WHITE_WINS_CHECKMATE:
      case GameResult.WHITE_WINS_STALEMATE:
        return  99999
      case GameResult.BLACK_WINS_CHECKMATE:
      case GameResult.BLACK_WINS_STALEMATE:
        return -99999
      case GameResult.DRAW_CITADEL:
        return 0
    }
  }

  return (
    materialScore(state)          // weight 1.0 (built-in)
    + mobilityScore(state)        // weight 0.15 per move
    + royalSafetyScore(state)     // weight 0.3 (applied inside)
    + ppBonus(state)
    + citadelPressureScore(state) // weight 0.2 (applied inside)
  )
}
