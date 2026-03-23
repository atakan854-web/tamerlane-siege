// =============================================================================
// TAMERLANE SIEGE — Board Utilities
// Section 3 / 4.1 of PRODUCTION_PLAN.md
//
// RULES: No imports from outside src/core/. Pure TypeScript only.
//        All functions are pure — no mutation, no side effects.
// =============================================================================

import { type Color, type Piece, type Square, PieceType, PawnOfPawnsStage, GameResult } from './types'
import {
  FILES,
  RANKS,
  WHITE_CITADEL,
  BLACK_CITADEL,
  WHITE_CITADEL_ADJACENT,
  BLACK_CITADEL_ADJACENT,
  STARTING_ENTRIES,
} from './constants'
import type { GameState } from './types'

// -----------------------------------------------------------------------------
// Square ↔ Map key conversions
// -----------------------------------------------------------------------------

/**
 * Converts a Square to the string key used in the pieces Map.
 * Format: "file,rank" — e.g., { file: 5, rank: 1 } → "5,1"
 * Works for citadel squares too (file 11 or -1).
 */
export function squareToKey(square: Square): string {
  return `${square.file},${square.rank}`
}

/**
 * Converts a "file,rank" key back to a Square object.
 */
export function keyToSquare(key: string): Square {
  const [fileStr, rankStr] = key.split(',')
  return { file: parseInt(fileStr, 10), rank: parseInt(rankStr, 10) }
}

/**
 * Returns true if two squares refer to the same board position.
 */
export function squaresEqual(a: Square, b: Square): boolean {
  return a.file === b.file && a.rank === b.rank
}

// -----------------------------------------------------------------------------
// Bounds Checking
// -----------------------------------------------------------------------------

/**
 * Returns true if the square is a valid citadel square.
 */
export function isCitadel(square: Square): boolean {
  return (
    squaresEqual(square, WHITE_CITADEL) ||
    squaresEqual(square, BLACK_CITADEL)
  )
}

/**
 * Returns true if the square is within the main 11×10 grid.
 */
export function isMainBoard(square: Square): boolean {
  return (
    square.file >= 0 &&
    square.file < FILES &&
    square.rank >= 0 &&
    square.rank < RANKS
  )
}

/**
 * Returns true if the square is a valid addressable square:
 * either on the main 11×10 board OR one of the two citadel squares.
 * This is the primary bounds check for move generation.
 */
export function isOnBoard(square: Square): boolean {
  return isMainBoard(square) || isCitadel(square)
}

// -----------------------------------------------------------------------------
// Citadel Adjacency
// -----------------------------------------------------------------------------

/**
 * Returns true if the given main-board square is adjacent to the white citadel.
 * Only these squares can step into the white citadel.
 */
export function isAdjacentToWhiteCitadel(square: Square): boolean {
  return WHITE_CITADEL_ADJACENT.some(adj => squaresEqual(adj, square))
}

/**
 * Returns true if the given main-board square is adjacent to the black citadel.
 */
export function isAdjacentToBlackCitadel(square: Square): boolean {
  return BLACK_CITADEL_ADJACENT.some(adj => squaresEqual(adj, square))
}

/**
 * Returns the citadel square reachable from the given square, if any.
 * Used during move generation to allow citadel entry moves.
 */
export function getReachableCitadel(square: Square): Square | null {
  if (isAdjacentToWhiteCitadel(square)) return WHITE_CITADEL
  if (isAdjacentToBlackCitadel(square)) return BLACK_CITADEL
  return null
}

// -----------------------------------------------------------------------------
// Adjacent Square Generation
// -----------------------------------------------------------------------------

/**
 * Returns all valid board squares (main board + citadels) that are
 * one king-step away (orthogonal or diagonal) from the given square.
 *
 * Citadel squares are included when the source square is adjacent to one.
 */
export function getAdjacentSquares(square: Square): Square[] {
  const results: Square[] = []

  // The 8 standard king directions
  const deltas: Array<[number, number]> = [
    [-1, -1], [-1, 0], [-1, 1],
    [ 0, -1],          [ 0, 1],
    [ 1, -1], [ 1, 0], [ 1, 1],
  ]

  for (const [df, dr] of deltas) {
    const candidate: Square = { file: square.file + df, rank: square.rank + dr }
    if (isOnBoard(candidate)) {
      results.push(candidate)
    }
  }

  // If this is a citadel square, its adjacents are the main-board squares
  // that are adjacent to it. The delta loop above covers file±1, rank±1,
  // which for citadel coordinates (11,1) or (-1,8) will fall on main board
  // squares naturally — isMainBoard will accept them. So no special case needed.

  return results
}

// -----------------------------------------------------------------------------
// Piece Lookup
// -----------------------------------------------------------------------------

/**
 * Returns the piece at the given square, or null if the square is empty.
 */
export function getPiece(pieces: Map<string, Piece>, square: Square): Piece | null {
  return pieces.get(squareToKey(square)) ?? null
}

/**
 * Returns true if the square is occupied by a friendly piece (same color).
 */
export function isFriendly(pieces: Map<string, Piece>, square: Square, color: Color): boolean {
  const piece = getPiece(pieces, square)
  return piece !== null && piece.color === color
}

/**
 * Returns true if the square is occupied by an enemy piece.
 */
export function isEnemy(pieces: Map<string, Piece>, square: Square, color: Color): boolean {
  const piece = getPiece(pieces, square)
  return piece !== null && piece.color !== color
}

// -----------------------------------------------------------------------------
// Board Construction
// -----------------------------------------------------------------------------

/**
 * Creates the initial board state as a Map<string, Piece> from the
 * starting position defined in constants.ts.
 *
 * Returns a new Map — does not mutate any shared state.
 */
export function createInitialBoard(): Map<string, Piece> {
  const pieces = new Map<string, Piece>()

  for (const { rank, file, piece } of STARTING_ENTRIES) {
    pieces.set(squareToKey({ file, rank }), piece)
  }

  return pieces
}

/**
 * Creates the full initial GameState for a new game.
 */
export function createInitialGameState(): GameState {
  const pieces = createInitialBoard()

  return {
    pieces,
    turn: 'w',
    moveNumber: 1,
    halfMoveCount: 0,
    whiteKingSwapUsed: false,
    blackKingSwapUsed: false,
    whitePawnOfPawnsStage: PawnOfPawnsStage.UNPROMOTED,
    blackPawnOfPawnsStage: PawnOfPawnsStage.UNPROMOTED,
    whiteRoyals: [{ file: 5, rank: 1 }],  // White King starting square
    blackRoyals: [{ file: 5, rank: 8 }],  // Black King starting square
    whiteCitadelOccupant: null,
    blackCitadelOccupant: null,
    result: null,
    history: [],
  }
}

// -----------------------------------------------------------------------------
// Piece Filtering Utilities
// -----------------------------------------------------------------------------

/**
 * Returns all squares occupied by pieces of the given color.
 */
export function getColorSquares(pieces: Map<string, Piece>, color: Color): Square[] {
  const squares: Square[] = []
  for (const [key, piece] of pieces) {
    if (piece.color === color) {
      squares.push(keyToSquare(key))
    }
  }
  return squares
}

/**
 * Returns true if the given PieceType is a royal piece
 * (King, Prince, or Adventitious King).
 */
export function isRoyalType(type: PieceType): boolean {
  return (
    type === PieceType.KING ||
    type === PieceType.PRINCE ||
    type === PieceType.ADVENTITIOUS_KING
  )
}

/**
 * Returns true if the given PieceType is any kind of pawn.
 */
export function isPawnType(type: PieceType): boolean {
  return (
    type === PieceType.PAWN_OF_KINGS ||
    type === PieceType.PAWN_OF_GENERALS ||
    type === PieceType.PAWN_OF_VIZIERS ||
    type === PieceType.PAWN_OF_ROOKS ||
    type === PieceType.PAWN_OF_KNIGHTS ||
    type === PieceType.PAWN_OF_PICKETS ||
    type === PieceType.PAWN_OF_GIRAFFES ||
    type === PieceType.PAWN_OF_ELEPHANTS ||
    type === PieceType.PAWN_OF_CAMELS ||
    type === PieceType.PAWN_OF_WAR_ENGINES ||
    type === PieceType.PAWN_OF_PAWNS
  )
}

/**
 * Returns the back rank for a given color (the rank pawns promote on).
 * White promotes on rank 9; Black promotes on rank 0.
 */
export function getBackRank(color: Color): number {
  return color === 'w' ? RANKS - 1 : 0
}

/**
 * Returns the forward direction (rank delta) for a given color.
 * White moves toward higher ranks (+1); Black toward lower ranks (-1).
 */
export function getForwardDirection(color: Color): number {
  return color === 'w' ? 1 : -1
}

// Ensure GameResult is exported/used to avoid unused-import errors in strict mode
// (it's part of GameState via the import, but referenced here explicitly)
export { GameResult }
