// =============================================================================
// TAMERLANE SIEGE — Game Rules Tests
// tests/core/rules.test.ts
// =============================================================================

import { describe, it, expect } from 'vitest'
import {
  PieceType,
  MoveFlag,
  GameResult,
  type Square,
  type Piece,
  type GameState,
} from '../../src/core/types'
import { createInitialGameState } from '../../src/core/board'
import {
  isRoyalInCheck,
  isInCheck,
  getAllLegalMoves,
  isCheckmate,
  isStalemate,
  getGameResult,
  isSquareAttackedBy,
} from '../../src/core/rules'

// =============================================================================
// Helpers
// =============================================================================

function emptyState(): GameState {
  const s = createInitialGameState()
  s.pieces.clear()
  s.whiteRoyals = []
  s.blackRoyals = []
  return s
}

function sq(file: number, rank: number): Square {
  return { file, rank }
}

function wp(type: PieceType): Piece { return { type, color: 'w' } }
function bp(type: PieceType): Piece { return { type, color: 'b' } }

function place(state: GameState, square: Square, piece: Piece): void {
  state.pieces.set(`${square.file},${square.rank}`, piece)
}

// =============================================================================
// isSquareAttackedBy
// =============================================================================

describe('isSquareAttackedBy', () => {
  it('detects Rook attack along a file', () => {
    const state = emptyState()
    place(state, sq(5, 1), bp(PieceType.ROOK))
    expect(isSquareAttackedBy(sq(5, 5), 'b', state)).toBe(true)
  })

  it('detects Rook attack along a rank', () => {
    const state = emptyState()
    place(state, sq(0, 5), bp(PieceType.ROOK))
    expect(isSquareAttackedBy(sq(8, 5), 'b', state)).toBe(true)
  })

  it('Rook attack is blocked by intervening piece', () => {
    const state = emptyState()
    place(state, sq(5, 1), bp(PieceType.ROOK))
    place(state, sq(5, 4), wp(PieceType.KNIGHT))  // blocks
    expect(isSquareAttackedBy(sq(5, 7), 'b', state)).toBe(false)
  })

  it('detects Knight attack', () => {
    const state = emptyState()
    // Knight at (3,3) attacks (4,5)
    place(state, sq(3, 3), bp(PieceType.KNIGHT))
    expect(isSquareAttackedBy(sq(4, 5), 'b', state)).toBe(true)
  })

  it('detects pawn diagonal attack when enemy occupies the diagonal square', () => {
    const state = emptyState()
    // White pawn at (4,4) attacks diagonally — but only generates a move when
    // an enemy piece is actually on the diagonal (capture-only move).
    // Place an enemy piece at (5,5) so the pawn generates a capture there.
    place(state, sq(4, 4), wp(PieceType.PAWN_OF_KINGS))
    place(state, sq(5, 5), bp(PieceType.ROOK))
    expect(isSquareAttackedBy(sq(5, 5), 'w', state)).toBe(true)
  })

  it('pawn does not attack a square occupied by the enemy directly ahead (push blocked)', () => {
    const state = emptyState()
    // White pawn at (4,4). Enemy piece at (4,5) blocks the push.
    // Pawn cannot push to (4,5), and (4,5) is not on the attack diagonals.
    place(state, sq(4, 4), wp(PieceType.PAWN_OF_KINGS))
    place(state, sq(4, 5), bp(PieceType.ROOK)) // blocks push, not on diagonal
    expect(isSquareAttackedBy(sq(4, 5), 'w', state)).toBe(false)
  })

  it('returns false when no piece attacks the square', () => {
    const state = emptyState()
    place(state, sq(0, 0), bp(PieceType.ROOK))
    expect(isSquareAttackedBy(sq(5, 5), 'b', state)).toBe(false)
  })

  it('only counts attacks from the specified color', () => {
    const state = emptyState()
    place(state, sq(5, 1), bp(PieceType.ROOK))
    expect(isSquareAttackedBy(sq(5, 5), 'w', state)).toBe(false)
    expect(isSquareAttackedBy(sq(5, 5), 'b', state)).toBe(true)
  })
})

// =============================================================================
// isRoyalInCheck
// =============================================================================

describe('isRoyalInCheck', () => {
  it('returns true when the square is attacked by opponent', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    expect(isRoyalInCheck(sq(5, 1), 'w', state)).toBe(true)
  })

  it('returns false when the square is not attacked', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    expect(isRoyalInCheck(sq(5, 1), 'w', state)).toBe(false)
  })

  it('returns false when attacker is blocked', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    place(state, sq(5, 5), wp(PieceType.ROOK))  // blocks
    expect(isRoyalInCheck(sq(5, 1), 'w', state)).toBe(false)
  })
})

// =============================================================================
// isInCheck
// =============================================================================

describe('isInCheck', () => {
  it('detects check on the King', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    expect(isInCheck('w', state)).toBe(true)
  })

  it('returns false when King is safe', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    expect(isInCheck('w', state)).toBe(false)
  })

  it('detects check on any royal when multiple royals exist', () => {
    const state = emptyState()
    // White King safe, white AK in check
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(3, 3), wp(PieceType.ADVENTITIOUS_KING))
    place(state, sq(3, 9), bp(PieceType.ROOK))  // attacks AK on file 3
    expect(isInCheck('w', state)).toBe(true)
  })

  it('returns false when all royals are safe', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(3, 3), wp(PieceType.ADVENTITIOUS_KING))
    expect(isInCheck('w', state)).toBe(false)
  })

  it('works for black side', () => {
    const state = emptyState()
    place(state, sq(5, 8), bp(PieceType.KING))
    place(state, sq(5, 0), wp(PieceType.ROOK))
    expect(isInCheck('b', state)).toBe(true)
  })
})

// =============================================================================
// getAllLegalMoves
// =============================================================================

describe('getAllLegalMoves', () => {
  it('returns moves when King is safe', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    const moves = getAllLegalMoves('w', state)
    expect(moves.length).toBeGreaterThan(0)
  })

  it('filters moves that leave a single King in check', () => {
    const state = emptyState()
    // White King at (5,1), White Rook at (5,4) blocking Black Rook at (5,9)
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    place(state, sq(5, 4), wp(PieceType.ROOK))  // pinned

    const moves = getAllLegalMoves('w', state)
    // The White Rook at (5,4) is pinned — it cannot move off file 5
    const rookMovesOffFile = moves.filter(
      m => m.piece.type === PieceType.ROOK && m.to.file !== 5
    )
    expect(rookMovesOffFile).toHaveLength(0)
  })

  it('with multiple royals: pinned piece can still move', () => {
    const state = emptyState()
    // White King at (5,1) + White AK at (3,3) (two royals)
    // White Rook at (5,4) would expose King to Black Rook at (5,9), but multi-royal → legal
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(3, 3), wp(PieceType.ADVENTITIOUS_KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    place(state, sq(5, 4), wp(PieceType.ROOK))

    const moves = getAllLegalMoves('w', state)
    // With multi-royal, the rook CAN move off file 5 (opponent can capture the exposed king)
    const rookMovesOffFile = moves.filter(
      m => m.piece.type === PieceType.ROOK && m.to.file !== 5
    )
    expect(rookMovesOffFile.length).toBeGreaterThan(0)
  })

  it('includes King Swap moves when King is in check and swap unused', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    place(state, sq(3, 5), wp(PieceType.ROOK))  // safe swap target

    const moves = getAllLegalMoves('w', state)
    const swapMoves = moves.filter(m => m.flag === MoveFlag.KING_SWAP)
    expect(swapMoves.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// isCheckmate
// =============================================================================

describe('isCheckmate', () => {
  it('detects checkmate: King trapped in corner by three Rooks', () => {
    const state = emptyState()
    // White King at (0,0).
    // Black Rook at (0,5): attacks file 0 → (0,4),(0,3),(0,2),(0,1),(0,0). King IN CHECK.
    // Black Rook at (5,0): attacks rank 0 → (1,0),(2,0),... Covers (1,0).
    // Black Rook at (5,1): attacks rank 1 → (0,1),(1,1),(2,1),... Covers (0,1) and (1,1).
    // King's escape squares: (1,0) [Rook rank 0], (0,1) [Rook rank 1], (1,1) [Rook rank 1].
    // King is in check, no escape → CHECKMATE.
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(0, 5), bp(PieceType.ROOK))
    place(state, sq(5, 0), bp(PieceType.ROOK))
    place(state, sq(5, 1), bp(PieceType.ROOK))
    expect(isCheckmate('w', state)).toBe(true)
  })

  it('returns false when not in check', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    expect(isCheckmate('w', state)).toBe(false)
  })

  it('returns false when in check but has escape moves', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    expect(isCheckmate('w', state)).toBe(false)  // King can move sideways
  })
})

// =============================================================================
// isStalemate
// =============================================================================

describe('isStalemate', () => {
  it('detects stalemate: King has no moves and is not in check', () => {
    const state = emptyState()
    // White King at (0,0). Adjacent: (1,0), (0,1), (1,1).
    // Black Rook at (1,5): file 1 → covers (1,4),(1,3),(1,2),(1,1),(1,0). ✓
    // Black Rook at (5,1): rank 1 → covers (4,1),(3,1),(2,1),(1,1),(0,1). ✓
    // (0,0) itself: Rook at (1,5) on file 1 (not 0). Rook at (5,1) on rank 1 (not 0). NOT attacked. ✓
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(1, 5), bp(PieceType.ROOK))
    place(state, sq(5, 1), bp(PieceType.ROOK))

    expect(isStalemate('w', state)).toBe(true)
  })

  it('returns false when in check (that is checkmate, not stalemate)', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    // King has moves sideways — not stalemate anyway, but test the check condition
    expect(isStalemate('w', state)).toBe(false)
  })

  it('returns false when King has legal moves', () => {
    const state = emptyState()
    place(state, sq(5, 5), wp(PieceType.KING))
    expect(isStalemate('w', state)).toBe(false)
  })

  it('stalemate is NOT a draw — the stalemated side loses', () => {
    // In Tamerlane Chess, stalemate = WIN for the stalemating side (the other player).
    const state = emptyState()
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(1, 5), bp(PieceType.ROOK))
    place(state, sq(5, 1), bp(PieceType.ROOK))

    const result = getGameResult(state)
    // White is stalemated → Black wins
    expect(result).toBe(GameResult.BLACK_WINS_STALEMATE)
    expect(result).not.toBe(GameResult.WHITE_WINS_STALEMATE)
  })
})

// =============================================================================
// getGameResult
// =============================================================================

describe('getGameResult', () => {
  it('returns null when game is ongoing', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 8), bp(PieceType.KING))
    expect(getGameResult(state)).toBeNull()
  })

  it('returns already-set result (e.g. DRAW_CITADEL)', () => {
    const state = emptyState()
    state.result = GameResult.DRAW_CITADEL
    expect(getGameResult(state)).toBe(GameResult.DRAW_CITADEL)
  })

  it('returns BLACK_WINS_CHECKMATE when white is checkmated', () => {
    const state = emptyState()
    // Same three-Rook checkmate position as isCheckmate test above
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(0, 5), bp(PieceType.ROOK))
    place(state, sq(5, 0), bp(PieceType.ROOK))
    place(state, sq(5, 1), bp(PieceType.ROOK))

    const result = getGameResult(state)
    expect(result).toBe(GameResult.BLACK_WINS_CHECKMATE)
  })

  it('returns WHITE_WINS_CHECKMATE when black is checkmated', () => {
    const state = emptyState()
    // Black King at (0,9). Adjacent: (1,9), (0,8), (1,8).
    // White Rook at (0,4): file 0 → attacks (0,5),(0,6),(0,7),(0,8),(0,9). King IN CHECK. ✓
    // White Rook at (5,9): rank 9 → covers (1,9). ✓
    // White Rook at (5,8): rank 8 → covers (0,8) and (1,8). ✓
    // All escape squares covered, King in check → CHECKMATE.
    place(state, sq(0, 9), bp(PieceType.KING))
    place(state, sq(0, 4), wp(PieceType.ROOK))
    place(state, sq(5, 9), wp(PieceType.ROOK))
    place(state, sq(5, 8), wp(PieceType.ROOK))

    const result = getGameResult(state)
    expect(result).toBe(GameResult.WHITE_WINS_CHECKMATE)
  })

  it('returns BLACK_WINS_STALEMATE when white is stalemated', () => {
    const state = emptyState()
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(1, 5), bp(PieceType.ROOK))
    place(state, sq(5, 1), bp(PieceType.ROOK))
    expect(getGameResult(state)).toBe(GameResult.BLACK_WINS_STALEMATE)
  })
})

// =============================================================================
// Multi-royal rule verification
// =============================================================================

describe('multi-royal rule', () => {
  it('with two royals: can make moves that leave one royal in check', () => {
    const state = emptyState()
    // White King at (5,1), White AK at (3,3)
    // Black Rook at (5,9) — threatens King on file 5
    // White Rook at (5,5) — would be "pinned" in single-royal chess
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(3, 3), wp(PieceType.ADVENTITIOUS_KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    place(state, sq(5, 5), wp(PieceType.ROOK))

    const moves = getAllLegalMoves('w', state)
    // White Rook at (5,5) should be able to move to a non-file-5 square
    // because multi-royal rule applies
    const rookNonFile5Moves = moves.filter(
      m => m.from.file === 5 && m.from.rank === 5 && m.to.file !== 5 && m.to.rank !== 9
    )
    expect(rookNonFile5Moves.length).toBeGreaterThan(0)
  })

  it('single-royal checkmate still applies when there is one royal', () => {
    const state = emptyState()
    // Verify the same three-Rook checkmate works
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(0, 5), bp(PieceType.ROOK))
    place(state, sq(5, 0), bp(PieceType.ROOK))
    place(state, sq(5, 1), bp(PieceType.ROOK))
    expect(isCheckmate('w', state)).toBe(true)
  })
})
