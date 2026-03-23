// =============================================================================
// TAMERLANE SIEGE — Input Validation Utilities
// Section 4.9 (validate) of PRODUCTION_PLAN.md
//
// RULES: No imports from outside src/core/. Pure TypeScript only.
//        All functions are pure — no mutation, no side effects.
//
// Used at system boundaries (UI input, TFEN import) to catch malformed data
// before it reaches the engine. Internal engine code is trusted without these checks.
// =============================================================================

import { type Square, type Piece, type Move, type GameState, PieceType } from './types'
import { isOnBoard, isRoyalType } from './board'
import { getAllLegalMoves } from './rules'

// =============================================================================
// Square Validation
// =============================================================================

/**
 * Returns true if the square is a valid addressable position:
 * either within the main 11×10 board or one of the two citadel squares.
 */
export function isValidSquare(square: Square): boolean {
  return isOnBoard(square)
}

// =============================================================================
// Piece Validation
// =============================================================================

/** Set of all valid PieceType string values for fast lookup. */
const VALID_PIECE_TYPES = new Set<string>(Object.values(PieceType) as string[])

/**
 * Returns true if the piece has a valid PieceType and a valid color ('w' or 'b').
 */
export function isValidPiece(piece: Piece): boolean {
  if (piece.color !== 'w' && piece.color !== 'b') return false
  return VALID_PIECE_TYPES.has(piece.type as string)
}

// =============================================================================
// Move Validation
// =============================================================================

/**
 * Returns true if the move is legal in the given state.
 * Checks by comparing against getAllLegalMoves for the current player.
 *
 * Note: O(pieces × moves²) per call — use for UI/API boundary checks only,
 * not inside AI search.
 */
export function isValidMove(move: Move, state: GameState): boolean {
  const legal = getAllLegalMoves(state.turn, state)
  return legal.some(
    m =>
      m.from.file === move.from.file &&
      m.from.rank === move.from.rank &&
      m.to.file   === move.to.file   &&
      m.to.rank   === move.to.rank   &&
      m.flag === move.flag &&
      m.promotionType === move.promotionType,
  )
}

// =============================================================================
// Game State Validation
// =============================================================================

/**
 * Returns true if the GameState is structurally valid:
 *   1. turn is a valid Color ('w' or 'b').
 *   2. moveNumber ≥ 1.
 *   3. Every key in the pieces Map represents a valid square.
 *   4. If the game is in progress (result === null), both sides have ≥1 royal.
 *
 * Used to validate states parsed from TFEN or received from external sources.
 */
export function isValidGameState(state: GameState): boolean {
  // (1) Valid turn
  if (state.turn !== 'w' && state.turn !== 'b') return false

  // (2) Valid move number
  if (state.moveNumber < 1) return false

  // (3) All piece map keys must parse as valid squares
  for (const key of state.pieces.keys()) {
    const parts = key.split(',')
    if (parts.length !== 2) return false
    const file = parseInt(parts[0], 10)
    const rank = parseInt(parts[1], 10)
    if (isNaN(file) || isNaN(rank)) return false
    if (!isOnBoard({ file, rank })) return false
  }

  // (4) In-progress game must have ≥1 royal per side
  if (state.result === null) {
    const pieces = [...state.pieces.values()]
    const hasWhiteRoyal = pieces.some(p => p.color === 'w' && isRoyalType(p.type))
    const hasBlackRoyal = pieces.some(p => p.color === 'b' && isRoyalType(p.type))
    if (!hasWhiteRoyal || !hasBlackRoyal) return false
  }

  return true
}
