// =============================================================================
// TAMERLANE SIEGE — King Swap Logic
// Section 4.5 of PRODUCTION_PLAN.md
//
// RULES: No imports from outside src/core/. Pure TypeScript only.
//        All functions are pure — no mutation, no side effects.
//
// The King Swap is a once-per-game emergency move:
//   - Only available when the King is in check.
//   - The King swaps positions with any friendly non-royal piece.
//   - Valid only if the King is no longer in check after the swap.
//   - The swapped-to piece's safety does not matter — only King safety.
// =============================================================================

import {
  type Color,
  type Square,
  type Piece,
  type GameState,
  type Move,
  PieceType,
  MoveFlag,
} from './types'
import { squareToKey, keyToSquare, isRoyalType } from './board'
import { generateMovesForPiece, isSquareAttackedBy, squaresEqual } from './moves'

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
// Internal: Find the King Square
// =============================================================================

/**
 * Returns the square of the original King (PieceType.KING) for the given color,
 * or null if the King is not on the board.
 */
function findKingSquare(color: Color, state: GameState): Square | null {
  for (const [key, piece] of state.pieces) {
    if (piece.color === color && piece.type === PieceType.KING) {
      return keyToSquare(key)
    }
  }
  return null
}

// =============================================================================
// Internal: Simulate a King Swap
// =============================================================================

/**
 * Returns a new state with the King at `kingSquare` and the target piece at
 * `targetSquare` swapped. Does not mutate the input state.
 */
function simulateSwap(
  kingSquare: Square,
  kingPiece: Piece,
  targetSquare: Square,
  targetPiece: Piece,
  state: GameState,
): GameState {
  const s = cloneState(state)
  s.pieces.delete(squareToKey(kingSquare))
  s.pieces.delete(squareToKey(targetSquare))
  s.pieces.set(squareToKey(targetSquare), kingPiece)
  s.pieces.set(squareToKey(kingSquare), targetPiece)
  return s
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Returns true if the King Swap is currently available for the given color:
 *   - King Swap has not been used yet for this player.
 *   - The original King (PieceType.KING) is currently in check.
 */
export function canKingSwap(color: Color, state: GameState): boolean {
  const swapUsed = color === 'w' ? state.whiteKingSwapUsed : state.blackKingSwapUsed
  if (swapUsed) return false

  const kingSquare = findKingSquare(color, state)
  if (kingSquare === null) return false

  const opponentColor: Color = color === 'w' ? 'b' : 'w'
  return isSquareAttackedBy(kingSquare, opponentColor, state)
}

/**
 * Generates all valid King Swap moves for the given color.
 *
 * For each friendly non-royal piece on the board:
 *   1. Simulate swapping the King and the piece.
 *   2. Check if the King's new square (= target piece's old square) is safe.
 *   3. If safe → produce a Move with flag = KING_SWAP.
 *
 * Returns an empty array if canKingSwap returns false.
 */
export function generateKingSwapMoves(color: Color, state: GameState): Move[] {
  if (!canKingSwap(color, state)) return []

  const kingSquare = findKingSquare(color, state)
  if (kingSquare === null) return []

  const kingKey   = squareToKey(kingSquare)
  const kingPiece = state.pieces.get(kingKey)
  if (kingPiece === undefined) return []

  const opponentColor: Color = color === 'w' ? 'b' : 'w'
  const moves: Move[] = []

  for (const [key, piece] of state.pieces) {
    if (piece.color !== color) continue
    if (key === kingKey) continue
    if (isRoyalType(piece.type)) continue  // Cannot swap with any royal piece

    const targetSquare = keyToSquare(key)

    // Simulate the swap and check whether King's new position is safe
    const simState = simulateSwap(kingSquare, kingPiece, targetSquare, piece, state)
    // After swap, King is at targetSquare
    if (!isSquareAttackedBy(targetSquare, opponentColor, simState)) {
      moves.push({
        from:  kingSquare,
        to:    targetSquare,
        piece: kingPiece,
        flag:  MoveFlag.KING_SWAP,
      })
    }
  }

  return moves
}

/**
 * Applies a King Swap move, swapping the King and the piece at move.to,
 * and marking kingSwapUsed = true for the moving side.
 *
 * Returns a new GameState; does not mutate the input.
 */
export function applyKingSwap(move: Move, state: GameState): GameState {
  const kingSquare  = move.from
  const targetSquare = move.to
  const kingPiece   = move.piece

  const targetPiece = state.pieces.get(squareToKey(targetSquare))
  if (targetPiece === undefined) {
    throw new Error(`applyKingSwap: no piece at target square ${squareToKey(targetSquare)}`)
  }

  const newState = simulateSwap(kingSquare, kingPiece, targetSquare, targetPiece, state)

  if (move.piece.color === 'w') {
    newState.whiteKingSwapUsed = true
  } else {
    newState.blackKingSwapUsed = true
  }

  return newState
}

// Re-export for test convenience
export { squaresEqual, generateMovesForPiece }
