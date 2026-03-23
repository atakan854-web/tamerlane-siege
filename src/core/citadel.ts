// =============================================================================
// TAMERLANE SIEGE — Citadel Logic
// Section 4.6 of PRODUCTION_PLAN.md
//
// RULES: No imports from outside src/core/. Pure TypeScript only.
//        All functions are pure — no mutation, no side effects.
//
// Citadel entry hierarchy:
//   KING > ADVENTITIOUS_KING > PRINCE
//   Only the highest-ranking living royal may enter the opponent's citadel.
//   Only the Adventitious King may enter its OWN citadel (immune defense).
//
// Entering the opponent's citadel → instant draw (DRAW_CITADEL).
// AK entering own citadel → CITADEL_DEFENSE (piece becomes immune).
// =============================================================================

import {
  type Color,
  type Piece,
  type GameState,
  type Move,
  type Square,
  PieceType,
  MoveFlag,
  GameResult,
} from './types'
import { getPiece, squareToKey } from './board'
import { WHITE_CITADEL, BLACK_CITADEL } from './constants'

// =============================================================================
// Internal: Immutable State Clone
// =============================================================================

function cloneState(state: GameState): GameState {
  return {
    ...state,
    pieces:      new Map(state.pieces),
    whiteRoyals: [...state.whiteRoyals],
    blackRoyals: [...state.blackRoyals],
    history:     [...state.history],
  }
}

// =============================================================================
// Citadel Occupancy
// =============================================================================

/**
 * Returns true if the given citadel square is occupied by any piece.
 */
export function isCitadelOccupied(citadel: Square, state: GameState): boolean {
  return getPiece(state.pieces, citadel) !== null
}

// =============================================================================
// Royal Hierarchy
// =============================================================================

/**
 * Returns the PieceType of the highest-ranking living royal for the given color.
 *
 * Ranking: KING > ADVENTITIOUS_KING > PRINCE
 * Returns null if no royals are alive.
 */
export function getHighestRoyal(color: Color, state: GameState): PieceType | null {
  let hasKing   = false
  let hasAK     = false
  let hasPrince = false

  for (const piece of state.pieces.values()) {
    if (piece.color !== color) continue
    if (piece.type === PieceType.KING)              hasKing   = true
    if (piece.type === PieceType.ADVENTITIOUS_KING) hasAK     = true
    if (piece.type === PieceType.PRINCE)            hasPrince = true
  }

  if (hasKing)   return PieceType.KING
  if (hasAK)     return PieceType.ADVENTITIOUS_KING
  if (hasPrince) return PieceType.PRINCE
  return null
}

// =============================================================================
// Citadel Entry Permission Checks
// =============================================================================

/**
 * Returns true if the given piece may enter the opponent's citadel.
 *
 * The piece must be the highest-ranking living royal of the given color.
 */
export function canEnterOpponentCitadel(
  piece: Piece,
  color: Color,
  state: GameState,
): boolean {
  const highest = getHighestRoyal(color, state)
  return piece.type === highest
}

/**
 * Returns true if the given piece may enter its own citadel.
 *
 * Only the Adventitious King may do this, and only if the citadel is empty.
 */
export function canEnterOwnCitadel(
  piece: Piece,
  color: Color,
  state: GameState,
): boolean {
  if (piece.type !== PieceType.ADVENTITIOUS_KING) return false
  const ownCitadel = color === 'w' ? WHITE_CITADEL : BLACK_CITADEL
  return !isCitadelOccupied(ownCitadel, state)
}

// =============================================================================
// Citadel Entry Application
// =============================================================================

/**
 * Applies a citadel entry move to the game state.
 *
 * CITADEL_ENTRY   → sets result = DRAW_CITADEL.
 * CITADEL_DEFENSE → moves AK into own citadel, sets citadelOccupant.
 *
 * Returns a new GameState; does not mutate the input.
 */
export function handleCitadelEntry(move: Move, state: GameState): GameState {
  const newState = cloneState(state)

  // Move the piece from → to
  newState.pieces.delete(squareToKey(move.from))
  newState.pieces.set(squareToKey(move.to), move.piece)

  if (move.flag === MoveFlag.CITADEL_ENTRY) {
    newState.result = GameResult.DRAW_CITADEL
  } else if (move.flag === MoveFlag.CITADEL_DEFENSE) {
    if (move.piece.color === 'w') {
      newState.whiteCitadelOccupant = move.piece
    } else {
      newState.blackCitadelOccupant = move.piece
    }
  }

  return newState
}

// =============================================================================
// Citadel Square Helpers (exported for moves.ts integration)
// =============================================================================

/** Returns the opponent's citadel square for the given color. */
export function getOpponentCitadel(color: Color): Square {
  return color === 'w' ? BLACK_CITADEL : WHITE_CITADEL
}

/** Returns the own citadel square for the given color. */
export function getOwnCitadel(color: Color): Square {
  return color === 'w' ? WHITE_CITADEL : BLACK_CITADEL
}
