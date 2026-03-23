// =============================================================================
// TAMERLANE SIEGE — Game Rules & Legality
// Section 4.7 of PRODUCTION_PLAN.md
//
// RULES: No imports from outside src/core/. Pure TypeScript only.
//        All functions are pure — no mutation, no side effects.
//
// Responsibilities:
//   - isInCheck / isRoyalInCheck
//   - getAllLegalMoves (pseudo-legal + check filtering + king swap)
//   - isCheckmate / isStalemate
//   - getGameResult
//
// MULTI-ROYAL RULE: If a player has 2+ living royals, ALL pseudo-legal
// moves are legal — the opponent can simply capture exposed royals.
// Only with a SINGLE royal must we filter moves that leave it in check.
//
// STALEMATE = WIN for the stalemating (moving) side (opposite of FIDE chess).
// =============================================================================

import {
  type Color,
  type Square,
  type GameState,
  type Move,
  MoveFlag,
  GameResult,
} from './types'
import { keyToSquare, isRoyalType } from './board'
import { generateMovesForPiece, isSquareAttackedBy, squaresEqual, squareToKey } from './moves'
import { generateKingSwapMoves } from './kingSwap'

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
// Internal: Count Living Royals
// =============================================================================

/**
 * Returns the number of living royal pieces for the given color on the board.
 * Counts KING, ADVENTITIOUS_KING, and PRINCE.
 */
function countLiveRoyals(color: Color, state: GameState): number {
  let count = 0
  for (const piece of state.pieces.values()) {
    if (piece.color === color && isRoyalType(piece.type)) count++
  }
  return count
}

// =============================================================================
// Internal: Move Simulation
// =============================================================================

/**
 * Returns a new state after applying `move` without full game logic.
 * Used for check-filtering legal moves.
 *
 * Handles:
 *   - KING_SWAP: swap piece at from and to.
 *   - PAWN_OF_PAWNS_TELEPORT: remove from, place at to; if displaced piece
 *     existed, it's removed (fate handled by game.ts, not relevant for check).
 *   - All other moves: remove from, place at to (captures are implicitly removed).
 */
function simulateMove(move: Move, state: GameState): GameState {
  const s = cloneState(state)

  if (move.flag === MoveFlag.KING_SWAP) {
    // Swap pieces
    const fromPiece = s.pieces.get(squareToKey(move.from))
    const toPiece   = s.pieces.get(squareToKey(move.to))
    if (fromPiece) s.pieces.set(squareToKey(move.to),   fromPiece)
    else            s.pieces.delete(squareToKey(move.to))
    if (toPiece)   s.pieces.set(squareToKey(move.from), toPiece)
    else            s.pieces.delete(squareToKey(move.from))
    return s
  }

  if (move.flag === MoveFlag.PAWN_OF_PAWNS_TELEPORT) {
    // Remove PP from current position, place at destination
    // Any displaced friendly piece is removed (it gets redeployed by game.ts)
    s.pieces.delete(squareToKey(move.from))
    s.pieces.set(squareToKey(move.to), move.piece)
    return s
  }

  // Standard move / capture / promotion / citadel / pawn moves
  s.pieces.delete(squareToKey(move.from))
  s.pieces.set(squareToKey(move.to), move.piece)
  return s
}

// =============================================================================
// Public API — Check Detection
// =============================================================================

/**
 * Returns true if the given square is attacked by the opponent of `color`.
 * Thin wrapper over isSquareAttackedBy for external callers.
 */
export function isRoyalInCheck(square: Square, color: Color, state: GameState): boolean {
  const opponentColor: Color = color === 'w' ? 'b' : 'w'
  return isSquareAttackedBy(square, opponentColor, state)
}

/**
 * Returns true if ANY royal piece of the given color is currently in check.
 *
 * Scans the board directly (does not rely on whiteRoyals/blackRoyals lists)
 * for robustness in simulated states.
 */
export function isInCheck(color: Color, state: GameState): boolean {
  const opponentColor: Color = color === 'w' ? 'b' : 'w'
  for (const [key, piece] of state.pieces) {
    if (piece.color !== color) continue
    if (!isRoyalType(piece.type)) continue
    const square = keyToSquare(key)
    if (isSquareAttackedBy(square, opponentColor, state)) return true
  }
  return false
}

// =============================================================================
// Public API — Legal Move Generation
// =============================================================================

/**
 * Returns all fully legal moves for the given color.
 *
 * Algorithm:
 *   1. Gather pseudo-legal moves for all pieces of `color`.
 *   2. Add King Swap moves if available.
 *   3. Multi-royal rule: if player has 2+ royals, all pseudo-legal moves
 *      are legal (opponent can capture exposed royals — no filtering needed).
 *   4. Single royal: filter moves that leave the sole royal in check.
 */
export function getAllLegalMoves(color: Color, state: GameState): Move[] {
  const pseudoLegal: Move[] = []

  for (const [key, piece] of state.pieces) {
    if (piece.color !== color) continue
    const square = keyToSquare(key)
    const pieceMoves = generateMovesForPiece(square, piece, state)
    pseudoLegal.push(...pieceMoves)
  }

  // King Swap moves
  const swapMoves = generateKingSwapMoves(color, state)
  pseudoLegal.push(...swapMoves)

  // Multi-royal: all pseudo-legal are legal
  if (countLiveRoyals(color, state) > 1) {
    return pseudoLegal
  }

  // Single-royal: filter moves that leave the royal in check
  return pseudoLegal.filter(move => {
    const simState = simulateMove(move, state)
    return !isInCheck(color, simState)
  })
}

// =============================================================================
// Public API — Game Termination
// =============================================================================

/**
 * Returns true if the given color is in checkmate:
 *   - At least one royal is in check AND
 *   - getAllLegalMoves returns an empty array.
 */
export function isCheckmate(color: Color, state: GameState): boolean {
  if (!isInCheck(color, state)) return false
  return getAllLegalMoves(color, state).length === 0
}

/**
 * Returns true if the given color is in stalemate:
 *   - Not in check AND
 *   - getAllLegalMoves returns an empty array.
 *
 * NOTE: In Tamerlane Chess, stalemate is a WIN for the STALEMATING (moving)
 * side — the player who has no moves loses. The parameter `color` is the
 * player who has no moves (the losing side).
 */
export function isStalemate(color: Color, state: GameState): boolean {
  if (isInCheck(color, state)) return false
  return getAllLegalMoves(color, state).length === 0
}

/**
 * Returns the GameResult if the game is over, or null if still in progress.
 *
 * Checks in order:
 *   1. Already-set result (e.g., DRAW_CITADEL from handleCitadelEntry).
 *   2. Checkmate for White → BLACK_WINS_CHECKMATE.
 *   3. Checkmate for Black → WHITE_WINS_CHECKMATE.
 *   4. Stalemate for White → BLACK_WINS_STALEMATE (opponent wins).
 *   5. Stalemate for Black → WHITE_WINS_STALEMATE (opponent wins).
 *   6. null — game is ongoing.
 *
 * Note: Only checks whose turn it is. Caller must pass the player to move.
 * For full turn-based usage, call with state.turn.
 */
export function getGameResult(state: GameState): GameResult | null {
  if (state.result !== null) return state.result

  // Check both colors for terminal states
  for (const color of ['w', 'b'] as Color[]) {
    if (isCheckmate(color, state)) {
      return color === 'w'
        ? GameResult.BLACK_WINS_CHECKMATE
        : GameResult.WHITE_WINS_CHECKMATE
    }
    if (isStalemate(color, state)) {
      // Stalemate = WIN for the OTHER side (the one who delivered stalemate)
      return color === 'w'
        ? GameResult.BLACK_WINS_STALEMATE
        : GameResult.WHITE_WINS_STALEMATE
    }
  }

  return null
}

// Re-export for test convenience
export { squaresEqual, isSquareAttackedBy }
