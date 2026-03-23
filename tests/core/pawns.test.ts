// =============================================================================
// TAMERLANE SIEGE — Pawn Move Generation Tests
// tests/core/pawns.test.ts
// =============================================================================

import { describe, it, expect } from 'vitest'
import { PieceType, MoveFlag, type Square, type Piece, type GameState } from '../../src/core/types'
import { createInitialGameState } from '../../src/core/board'
import {
  isPawnPromotion,
  getPromotionType,
  generatePawnMoves,
} from '../../src/core/pawns'

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

function place(state: GameState, square: Square, piece: Piece): GameState {
  const key = `${square.file},${square.rank}`
  state.pieces.set(key, piece)
  return state
}

// =============================================================================
// isPawnPromotion
// =============================================================================

describe('isPawnPromotion', () => {
  it('white pawn on rank 9 is promotion', () => {
    expect(isPawnPromotion(sq(5, 9), wp(PieceType.PAWN_OF_ROOKS))).toBe(true)
  })

  it('white pawn on rank 8 is NOT promotion', () => {
    expect(isPawnPromotion(sq(5, 8), wp(PieceType.PAWN_OF_ROOKS))).toBe(false)
  })

  it('black pawn on rank 0 is promotion', () => {
    expect(isPawnPromotion(sq(5, 0), bp(PieceType.PAWN_OF_KNIGHTS))).toBe(true)
  })

  it('black pawn on rank 1 is NOT promotion', () => {
    expect(isPawnPromotion(sq(5, 1), bp(PieceType.PAWN_OF_KNIGHTS))).toBe(false)
  })

  it('white pawn on rank 0 is NOT promotion', () => {
    expect(isPawnPromotion(sq(5, 0), wp(PieceType.PAWN_OF_ROOKS))).toBe(false)
  })

  it('black pawn on rank 9 is NOT promotion', () => {
    expect(isPawnPromotion(sq(5, 9), bp(PieceType.PAWN_OF_ROOKS))).toBe(false)
  })
})

// =============================================================================
// getPromotionType
// =============================================================================

describe('getPromotionType', () => {
  it('PAWN_OF_KINGS → PRINCE', () => {
    expect(getPromotionType(PieceType.PAWN_OF_KINGS)).toBe(PieceType.PRINCE)
  })

  it('PAWN_OF_GENERALS → GENERAL', () => {
    expect(getPromotionType(PieceType.PAWN_OF_GENERALS)).toBe(PieceType.GENERAL)
  })

  it('PAWN_OF_VIZIERS → VIZIER', () => {
    expect(getPromotionType(PieceType.PAWN_OF_VIZIERS)).toBe(PieceType.VIZIER)
  })

  it('PAWN_OF_ROOKS → ROOK', () => {
    expect(getPromotionType(PieceType.PAWN_OF_ROOKS)).toBe(PieceType.ROOK)
  })

  it('PAWN_OF_KNIGHTS → KNIGHT', () => {
    expect(getPromotionType(PieceType.PAWN_OF_KNIGHTS)).toBe(PieceType.KNIGHT)
  })

  it('PAWN_OF_PICKETS → PICKET', () => {
    expect(getPromotionType(PieceType.PAWN_OF_PICKETS)).toBe(PieceType.PICKET)
  })

  it('PAWN_OF_GIRAFFES → GIRAFFE', () => {
    expect(getPromotionType(PieceType.PAWN_OF_GIRAFFES)).toBe(PieceType.GIRAFFE)
  })

  it('PAWN_OF_ELEPHANTS → ELEPHANT', () => {
    expect(getPromotionType(PieceType.PAWN_OF_ELEPHANTS)).toBe(PieceType.ELEPHANT)
  })

  it('PAWN_OF_CAMELS → CAMEL', () => {
    expect(getPromotionType(PieceType.PAWN_OF_CAMELS)).toBe(PieceType.CAMEL)
  })

  it('PAWN_OF_WAR_ENGINES → WAR_ENGINE', () => {
    expect(getPromotionType(PieceType.PAWN_OF_WAR_ENGINES)).toBe(PieceType.WAR_ENGINE)
  })

  it('PAWN_OF_PAWNS throws', () => {
    expect(() => getPromotionType(PieceType.PAWN_OF_PAWNS)).toThrow()
  })
})

// =============================================================================
// generatePawnMoves — White pawn forward movement
// =============================================================================

describe('generatePawnMoves — white forward', () => {
  it('advances 1 square forward on empty board', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(5, 4), pawn)

    const moves = generatePawnMoves(sq(5, 4), pawn, state)
    expect(moves).toHaveLength(1)
    expect(moves[0].to).toEqual(sq(5, 5))
    expect(moves[0].flag).toBe(MoveFlag.NORMAL)
  })

  it('cannot advance if square ahead is occupied by friendly', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(5, 4), pawn)
    place(state, sq(5, 5), wp(PieceType.ROOK))

    const moves = generatePawnMoves(sq(5, 4), pawn, state)
    expect(moves).toHaveLength(0)
  })

  it('cannot advance if square ahead is occupied by enemy', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(5, 4), pawn)
    place(state, sq(5, 5), bp(PieceType.ROOK))

    const moves = generatePawnMoves(sq(5, 4), pawn, state)
    expect(moves).toHaveLength(0)
  })

  it('no double step — even from starting rank (rank 2)', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(5, 2), pawn)

    const moves = generatePawnMoves(sq(5, 2), pawn, state)
    // Only 1 move (rank 3), NOT rank 4
    expect(moves).toHaveLength(1)
    expect(moves[0].to).toEqual(sq(5, 3))
  })
})

// =============================================================================
// generatePawnMoves — Black pawn forward movement
// =============================================================================

describe('generatePawnMoves — black forward', () => {
  it('advances 1 square forward (toward rank 0) on empty board', () => {
    const state = emptyState()
    const pawn = bp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(5, 5), pawn)

    const moves = generatePawnMoves(sq(5, 5), pawn, state)
    expect(moves).toHaveLength(1)
    expect(moves[0].to).toEqual(sq(5, 4))
    expect(moves[0].flag).toBe(MoveFlag.NORMAL)
  })

  it('cannot advance if square ahead is occupied by friendly', () => {
    const state = emptyState()
    const pawn = bp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(5, 5), pawn)
    place(state, sq(5, 4), bp(PieceType.ROOK))

    const moves = generatePawnMoves(sq(5, 5), pawn, state)
    expect(moves).toHaveLength(0)
  })

  it('no double step — even from starting rank (rank 7)', () => {
    const state = emptyState()
    const pawn = bp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(5, 7), pawn)

    const moves = generatePawnMoves(sq(5, 7), pawn, state)
    expect(moves).toHaveLength(1)
    expect(moves[0].to).toEqual(sq(5, 6))
  })
})

// =============================================================================
// generatePawnMoves — Diagonal captures
// =============================================================================

describe('generatePawnMoves — diagonal captures', () => {
  it('white pawn captures diagonally left', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(5, 4), pawn)
    place(state, sq(4, 5), bp(PieceType.ROOK))

    const moves = generatePawnMoves(sq(5, 4), pawn, state)
    const cap = moves.find(m => m.to.file === 4 && m.to.rank === 5)
    expect(cap).toBeDefined()
    expect(cap!.flag).toBe(MoveFlag.CAPTURE)
    expect(cap!.captured).toBeDefined()
  })

  it('white pawn captures diagonally right', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(5, 4), pawn)
    place(state, sq(6, 5), bp(PieceType.ROOK))

    const moves = generatePawnMoves(sq(5, 4), pawn, state)
    const cap = moves.find(m => m.to.file === 6 && m.to.rank === 5)
    expect(cap).toBeDefined()
    expect(cap!.flag).toBe(MoveFlag.CAPTURE)
  })

  it('white pawn cannot move diagonally without an enemy there', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(5, 4), pawn)

    const moves = generatePawnMoves(sq(5, 4), pawn, state)
    // Should only have forward move, no diagonals
    expect(moves.every(m => m.to.file === 5)).toBe(true)
  })

  it('white pawn cannot capture a friendly piece diagonally', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(5, 4), pawn)
    place(state, sq(4, 5), wp(PieceType.ROOK))
    place(state, sq(6, 5), wp(PieceType.KNIGHT))

    const moves = generatePawnMoves(sq(5, 4), pawn, state)
    // Only the forward move (rank 5, file 5)
    expect(moves.every(m => m.to.file === 5)).toBe(true)
  })

  it('black pawn captures diagonally (toward lower rank)', () => {
    const state = emptyState()
    const pawn = bp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(5, 5), pawn)
    place(state, sq(4, 4), wp(PieceType.ROOK))
    place(state, sq(6, 4), wp(PieceType.KNIGHT))

    const moves = generatePawnMoves(sq(5, 5), pawn, state)
    const caps = moves.filter(m => m.flag === MoveFlag.CAPTURE)
    expect(caps).toHaveLength(2)
  })

  it('black pawn cannot capture friendly diagonally', () => {
    const state = emptyState()
    const pawn = bp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(5, 5), pawn)
    place(state, sq(4, 4), bp(PieceType.ROOK))

    const moves = generatePawnMoves(sq(5, 5), pawn, state)
    const caps = moves.filter(m => m.flag === MoveFlag.CAPTURE)
    expect(caps).toHaveLength(0)
  })
})

// =============================================================================
// generatePawnMoves — Edge file pawns
// =============================================================================

describe('generatePawnMoves — edge files', () => {
  it('white pawn on file 0 (a-file) has no left diagonal', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(0, 4), pawn)
    // Place enemy at both diagonals — but file -1 is off board (citadel)
    // Only right diagonal (file 1, rank 5) is valid
    place(state, sq(1, 5), bp(PieceType.ROOK))

    const moves = generatePawnMoves(sq(0, 4), pawn, state)
    // Forward + right diagonal
    expect(moves).toHaveLength(2)
    expect(moves.some(m => m.to.file === -1)).toBe(false)
  })

  it('white pawn on file 10 (k-file) has no right diagonal', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(10, 4), pawn)
    place(state, sq(9, 5), bp(PieceType.ROOK))

    const moves = generatePawnMoves(sq(10, 4), pawn, state)
    // Forward + left diagonal
    expect(moves).toHaveLength(2)
    expect(moves.some(m => m.to.file === 11)).toBe(false)
  })

  it('black pawn on file 0 has no left diagonal (off board)', () => {
    const state = emptyState()
    const pawn = bp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(0, 5), pawn)
    place(state, sq(1, 4), wp(PieceType.ROOK))

    const moves = generatePawnMoves(sq(0, 5), pawn, state)
    expect(moves).toHaveLength(2)
    expect(moves.some(m => m.to.file < 0)).toBe(false)
  })
})

// =============================================================================
// generatePawnMoves — Promotion (non-PP pawns)
// =============================================================================

describe('generatePawnMoves — promotion', () => {
  it('white pawn moving to rank 9 gets PROMOTION flag', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(5, 8), pawn)

    const moves = generatePawnMoves(sq(5, 8), pawn, state)
    expect(moves).toHaveLength(1)
    expect(moves[0].flag).toBe(MoveFlag.PROMOTION)
    expect(moves[0].promotionType).toBe(PieceType.ROOK)
  })

  it('black pawn moving to rank 0 gets PROMOTION flag', () => {
    const state = emptyState()
    const pawn = bp(PieceType.PAWN_OF_KNIGHTS)
    place(state, sq(5, 1), pawn)

    const moves = generatePawnMoves(sq(5, 1), pawn, state)
    expect(moves).toHaveLength(1)
    expect(moves[0].flag).toBe(MoveFlag.PROMOTION)
    expect(moves[0].promotionType).toBe(PieceType.KNIGHT)
  })

  it('promotion capture also gets PROMOTION flag + captured piece', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_GENERALS)
    place(state, sq(5, 8), pawn)
    place(state, sq(6, 9), bp(PieceType.ROOK))

    const moves = generatePawnMoves(sq(5, 8), pawn, state)
    const promCap = moves.find(m => m.to.file === 6)
    expect(promCap).toBeDefined()
    expect(promCap!.flag).toBe(MoveFlag.PROMOTION)
    expect(promCap!.promotionType).toBe(PieceType.GENERAL)
    expect(promCap!.captured).toBeDefined()
  })

  it('PAWN_OF_KINGS promotes to PRINCE', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_KINGS)
    place(state, sq(5, 8), pawn)

    const moves = generatePawnMoves(sq(5, 8), pawn, state)
    expect(moves[0].promotionType).toBe(PieceType.PRINCE)
  })

  it('PAWN_OF_VIZIERS promotes to VIZIER', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_VIZIERS)
    place(state, sq(5, 8), pawn)

    const moves = generatePawnMoves(sq(5, 8), pawn, state)
    expect(moves[0].promotionType).toBe(PieceType.VIZIER)
  })

  it('PAWN_OF_PICKETS promotes to PICKET', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_PICKETS)
    place(state, sq(5, 8), pawn)

    const moves = generatePawnMoves(sq(5, 8), pawn, state)
    expect(moves[0].promotionType).toBe(PieceType.PICKET)
  })

  it('PAWN_OF_GIRAFFES promotes to GIRAFFE', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_GIRAFFES)
    place(state, sq(5, 8), pawn)

    const moves = generatePawnMoves(sq(5, 8), pawn, state)
    expect(moves[0].promotionType).toBe(PieceType.GIRAFFE)
  })

  it('PAWN_OF_ELEPHANTS promotes to ELEPHANT', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_ELEPHANTS)
    place(state, sq(5, 8), pawn)

    const moves = generatePawnMoves(sq(5, 8), pawn, state)
    expect(moves[0].promotionType).toBe(PieceType.ELEPHANT)
  })

  it('PAWN_OF_CAMELS promotes to CAMEL', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_CAMELS)
    place(state, sq(5, 8), pawn)

    const moves = generatePawnMoves(sq(5, 8), pawn, state)
    expect(moves[0].promotionType).toBe(PieceType.CAMEL)
  })

  it('PAWN_OF_WAR_ENGINES promotes to WAR_ENGINE', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_WAR_ENGINES)
    place(state, sq(5, 8), pawn)

    const moves = generatePawnMoves(sq(5, 8), pawn, state)
    expect(moves[0].promotionType).toBe(PieceType.WAR_ENGINE)
  })
})

// =============================================================================
// generatePawnMoves — Pawn of Pawns (STAGE1_ARRIVAL)
// =============================================================================

describe('generatePawnMoves — Pawn of Pawns', () => {
  it('white PP moving to rank 9 gets PAWN_OF_PAWNS_STAGE1_ARRIVAL flag', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_PAWNS)
    place(state, sq(5, 8), pawn)

    const moves = generatePawnMoves(sq(5, 8), pawn, state)
    expect(moves).toHaveLength(1)
    expect(moves[0].flag).toBe(MoveFlag.PAWN_OF_PAWNS_STAGE1_ARRIVAL)
    expect(moves[0].promotionType).toBeUndefined()
  })

  it('black PP moving to rank 0 gets PAWN_OF_PAWNS_STAGE1_ARRIVAL flag', () => {
    const state = emptyState()
    const pawn = bp(PieceType.PAWN_OF_PAWNS)
    place(state, sq(5, 1), pawn)

    const moves = generatePawnMoves(sq(5, 1), pawn, state)
    expect(moves).toHaveLength(1)
    expect(moves[0].flag).toBe(MoveFlag.PAWN_OF_PAWNS_STAGE1_ARRIVAL)
    expect(moves[0].promotionType).toBeUndefined()
  })

  it('PP capture on back rank also gets STAGE1_ARRIVAL flag', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_PAWNS)
    place(state, sq(5, 8), pawn)
    place(state, sq(6, 9), bp(PieceType.ROOK))

    const moves = generatePawnMoves(sq(5, 8), pawn, state)
    const capMove = moves.find(m => m.to.file === 6)
    expect(capMove).toBeDefined()
    expect(capMove!.flag).toBe(MoveFlag.PAWN_OF_PAWNS_STAGE1_ARRIVAL)
    expect(capMove!.captured).toBeDefined()
    expect(capMove!.promotionType).toBeUndefined()
  })

  it('PP mid-board moves normally (NORMAL flag)', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_PAWNS)
    place(state, sq(5, 5), pawn)

    const moves = generatePawnMoves(sq(5, 5), pawn, state)
    expect(moves).toHaveLength(1)
    expect(moves[0].flag).toBe(MoveFlag.NORMAL)
  })
})

// =============================================================================
// generatePawnMoves — Move count sanity checks
// =============================================================================

describe('generatePawnMoves — move count', () => {
  it('white pawn in center with 2 enemy diagonals has 3 moves', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(5, 4), pawn)
    place(state, sq(4, 5), bp(PieceType.ROOK))
    place(state, sq(6, 5), bp(PieceType.KNIGHT))

    const moves = generatePawnMoves(sq(5, 4), pawn, state)
    expect(moves).toHaveLength(3)
  })

  it('black pawn in center with 2 enemy diagonals has 3 moves', () => {
    const state = emptyState()
    const pawn = bp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(5, 5), pawn)
    place(state, sq(4, 4), wp(PieceType.ROOK))
    place(state, sq(6, 4), wp(PieceType.KNIGHT))

    const moves = generatePawnMoves(sq(5, 5), pawn, state)
    expect(moves).toHaveLength(3)
  })

  it('white pawn blocked ahead but 1 capture available → 1 move', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_ROOKS)
    place(state, sq(5, 4), pawn)
    place(state, sq(5, 5), bp(PieceType.ROOK))   // blocks forward
    place(state, sq(4, 5), bp(PieceType.KNIGHT))  // capture available

    const moves = generatePawnMoves(sq(5, 4), pawn, state)
    expect(moves).toHaveLength(1)
    expect(moves[0].flag).toBe(MoveFlag.CAPTURE)
  })
})
