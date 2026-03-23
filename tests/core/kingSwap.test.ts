// =============================================================================
// TAMERLANE SIEGE — King Swap Tests
// tests/core/kingSwap.test.ts
// =============================================================================

import { describe, it, expect } from 'vitest'
import { PieceType, MoveFlag, type Square, type Piece, type GameState } from '../../src/core/types'
import { createInitialGameState } from '../../src/core/board'
import { canKingSwap, generateKingSwapMoves, applyKingSwap } from '../../src/core/kingSwap'

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
// canKingSwap
// =============================================================================

describe('canKingSwap', () => {
  it('returns false when swap already used', () => {
    const state = emptyState()
    state.whiteKingSwapUsed = true
    // White King at (5,1), Black Rook attacking it at (5,9)
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    expect(canKingSwap('w', state)).toBe(false)
  })

  it('returns false when King is NOT in check', () => {
    const state = emptyState()
    // White King isolated, no attacker
    place(state, sq(5, 1), wp(PieceType.KING))
    expect(canKingSwap('w', state)).toBe(false)
  })

  it('returns true when King is in check and swap unused', () => {
    const state = emptyState()
    // White King at (5,1), Black Rook on same file at (5,9)
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    expect(canKingSwap('w', state)).toBe(true)
  })

  it('returns false when King is not on board', () => {
    const state = emptyState()
    // No white King
    place(state, sq(5, 9), bp(PieceType.ROOK))
    expect(canKingSwap('w', state)).toBe(false)
  })

  it('works for black side', () => {
    const state = emptyState()
    // Black King at (5,8), White Rook attacking
    place(state, sq(5, 8), bp(PieceType.KING))
    place(state, sq(5, 0), wp(PieceType.ROOK))
    expect(canKingSwap('b', state)).toBe(true)
  })
})

// =============================================================================
// generateKingSwapMoves
// =============================================================================

describe('generateKingSwapMoves', () => {
  it('returns empty array when not in check', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(3, 1), wp(PieceType.ROOK))
    expect(generateKingSwapMoves('w', state)).toHaveLength(0)
  })

  it('returns empty array when swap used', () => {
    const state = emptyState()
    state.whiteKingSwapUsed = true
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(3, 1), wp(PieceType.ROOK))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    expect(generateKingSwapMoves('w', state)).toHaveLength(0)
  })

  it('generates swap moves when King is in check and escape exists', () => {
    const state = emptyState()
    // White King at (5,1) attacked by Black Rook at (5,9)
    // White Rook at (3,5) — swap King to (3,5), King is no longer in check
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    place(state, sq(3, 5), wp(PieceType.ROOK))

    const moves = generateKingSwapMoves('w', state)
    expect(moves.length).toBeGreaterThan(0)
    expect(moves.every(m => m.flag === MoveFlag.KING_SWAP)).toBe(true)
    expect(moves.every(m => m.piece.type === PieceType.KING)).toBe(true)
  })

  it('filters out swaps where King is still in check after swap', () => {
    const state = emptyState()
    // Black Knight at (3,0) attacks:
    //   (5,1) — White King's square → King IS in check ✓
    //   (4,2) — White Rook's square → after swap, King at (4,2) still in check ✓
    // White Rook at (3,5) — after swap, King at (3,5) is safe (not attacked) ✓
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(3, 0), bp(PieceType.KNIGHT))
    place(state, sq(4, 2), wp(PieceType.ROOK))
    place(state, sq(3, 5), wp(PieceType.ROOK))

    const moves = generateKingSwapMoves('w', state)
    // Swap to (4,2) is filtered (King still attacked there by Knight at (3,0))
    // Swap to (3,5) is valid
    const toSquares = moves.map(m => `${m.to.file},${m.to.rank}`)
    expect(toSquares).not.toContain('4,2')
    expect(toSquares).toContain('3,5')
  })

  it('does not allow swapping with royal pieces', () => {
    const state = emptyState()
    // White King at (5,1) in check, White Prince at (3,3)
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    place(state, sq(3, 3), wp(PieceType.PRINCE))
    // Also add a safe non-royal piece so there's something to swap with
    place(state, sq(2, 5), wp(PieceType.ROOK))

    const moves = generateKingSwapMoves('w', state)
    const toSquares = moves.map(m => `${m.to.file},${m.to.rank}`)
    expect(toSquares).not.toContain('3,3')
  })

  it('does not allow swapping with AK (royal)', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    place(state, sq(3, 3), wp(PieceType.ADVENTITIOUS_KING))

    const moves = generateKingSwapMoves('w', state)
    const toSquares = moves.map(m => `${m.to.file},${m.to.rank}`)
    expect(toSquares).not.toContain('3,3')
  })

  it('swapped piece entering a dangerous square is still legal', () => {
    const state = emptyState()
    // White King at (5,1) in check from Black Rook at (5,9).
    // White Knight at (3,5) — after swap, Knight goes to (5,1) which is attacked,
    // but only King safety matters: King moves to (3,5), safe.
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    place(state, sq(3, 5), wp(PieceType.KNIGHT))

    const moves = generateKingSwapMoves('w', state)
    const toSquares = moves.map(m => `${m.to.file},${m.to.rank}`)
    expect(toSquares).toContain('3,5')
  })
})

// =============================================================================
// applyKingSwap
// =============================================================================

describe('applyKingSwap', () => {
  it('swaps the two pieces on the board', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    place(state, sq(3, 5), wp(PieceType.ROOK))

    const move = {
      from:  sq(5, 1),
      to:    sq(3, 5),
      piece: wp(PieceType.KING),
      flag:  MoveFlag.KING_SWAP,
    }

    const newState = applyKingSwap(move, state)

    // King should now be at (3,5)
    expect(newState.pieces.get('3,5')?.type).toBe(PieceType.KING)
    expect(newState.pieces.get('3,5')?.color).toBe('w')

    // White Rook should now be at (5,1)
    expect(newState.pieces.get('5,1')?.type).toBe(PieceType.ROOK)
    expect(newState.pieces.get('5,1')?.color).toBe('w')
  })

  it('sets kingSwapUsed = true for white', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    place(state, sq(3, 5), wp(PieceType.ROOK))

    const move = {
      from:  sq(5, 1),
      to:    sq(3, 5),
      piece: wp(PieceType.KING),
      flag:  MoveFlag.KING_SWAP,
    }

    const newState = applyKingSwap(move, state)
    expect(newState.whiteKingSwapUsed).toBe(true)
    expect(newState.blackKingSwapUsed).toBe(false)
  })

  it('sets kingSwapUsed = true for black', () => {
    const state = emptyState()
    place(state, sq(5, 8), bp(PieceType.KING))
    place(state, sq(5, 0), wp(PieceType.ROOK))
    place(state, sq(3, 4), bp(PieceType.ROOK))

    const move = {
      from:  sq(5, 8),
      to:    sq(3, 4),
      piece: bp(PieceType.KING),
      flag:  MoveFlag.KING_SWAP,
    }

    const newState = applyKingSwap(move, state)
    expect(newState.blackKingSwapUsed).toBe(true)
    expect(newState.whiteKingSwapUsed).toBe(false)
  })

  it('does not mutate the original state', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    place(state, sq(3, 5), wp(PieceType.ROOK))

    const move = {
      from:  sq(5, 1),
      to:    sq(3, 5),
      piece: wp(PieceType.KING),
      flag:  MoveFlag.KING_SWAP,
    }

    applyKingSwap(move, state)

    // Original state unchanged
    expect(state.pieces.get('5,1')?.type).toBe(PieceType.KING)
    expect(state.pieces.get('3,5')?.type).toBe(PieceType.ROOK)
    expect(state.whiteKingSwapUsed).toBe(false)
  })
})
