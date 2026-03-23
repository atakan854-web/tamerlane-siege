// =============================================================================
// TAMERLANE SIEGE — Pawn of Pawns: 3-Stage Logic Tests
// tests/core/pawnOfPawns.test.ts
// =============================================================================

import { describe, it, expect } from 'vitest'
import {
  PieceType,
  MoveFlag,
  PawnOfPawnsStage,
  type Square,
  type Piece,
  type GameState,
} from '../../src/core/types'
import { createInitialGameState } from '../../src/core/board'
import {
  getPawnOfPawnsStage,
  getPawnOfPawnsSquare,
  isImmobile,
  isInvincible,
  handlePawnOfPawnsArrival,
  generatePawnOfPawnsTeleportMoves,
  relocatePawnOfPawns,
  promotePawnOfPawnsToAdventitious,
} from '../../src/core/pawnOfPawns'
import { generateMovesForPiece } from '../../src/core/moves'

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
  state.pieces.set(`${square.file},${square.rank}`, piece)
  return state
}

// Set PP stage directly (simulates state after game.ts transitions)
function setWhiteStage(state: GameState, stage: PawnOfPawnsStage): GameState {
  state.whitePawnOfPawnsStage = stage
  return state
}
function setBlackStage(state: GameState, stage: PawnOfPawnsStage): GameState {
  state.blackPawnOfPawnsStage = stage
  return state
}

// =============================================================================
// getPawnOfPawnsStage
// =============================================================================

describe('getPawnOfPawnsStage', () => {
  it('returns whitePawnOfPawnsStage for color w', () => {
    const state = emptyState()
    state.whitePawnOfPawnsStage = PawnOfPawnsStage.STAGE1_ON_BACK_RANK
    expect(getPawnOfPawnsStage('w', state)).toBe(PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
  })

  it('returns blackPawnOfPawnsStage for color b', () => {
    const state = emptyState()
    state.blackPawnOfPawnsStage = PawnOfPawnsStage.STAGE2_RELOCATED
    expect(getPawnOfPawnsStage('b', state)).toBe(PawnOfPawnsStage.STAGE2_RELOCATED)
  })

  it('initial state has UNPROMOTED for both colors', () => {
    const state = emptyState()
    expect(getPawnOfPawnsStage('w', state)).toBe(PawnOfPawnsStage.UNPROMOTED)
    expect(getPawnOfPawnsStage('b', state)).toBe(PawnOfPawnsStage.UNPROMOTED)
  })
})

// =============================================================================
// getPawnOfPawnsSquare
// =============================================================================

describe('getPawnOfPawnsSquare', () => {
  it('returns the square where white PP is located', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    expect(getPawnOfPawnsSquare('w', state)).toEqual(sq(5, 9))
  })

  it('returns the square where black PP is located', () => {
    const state = emptyState()
    place(state, sq(3, 0), bp(PieceType.PAWN_OF_PAWNS))
    expect(getPawnOfPawnsSquare('b', state)).toEqual(sq(3, 0))
  })

  it('returns null if PP of given color is not on board', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS)) // only white
    expect(getPawnOfPawnsSquare('b', state)).toBeNull()
  })

  it('returns null if PP has been promoted (ADVENTITIOUS_KING on board, no PP)', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.ADVENTITIOUS_KING)) // promoted, PP gone
    expect(getPawnOfPawnsSquare('w', state)).toBeNull()
  })
})

// =============================================================================
// isImmobile / isInvincible
// =============================================================================

describe('isImmobile / isInvincible', () => {
  it('true when PP is at the square AND stage is STAGE1_ON_BACK_RANK', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    expect(isImmobile(sq(5, 9), state)).toBe(true)
    expect(isInvincible(sq(5, 9), state)).toBe(true)
  })

  it('false when PP stage is UNPROMOTED (normal pawn, capturable)', () => {
    const state = emptyState()
    place(state, sq(5, 5), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.UNPROMOTED)
    expect(isImmobile(sq(5, 5), state)).toBe(false)
    expect(isInvincible(sq(5, 5), state)).toBe(false)
  })

  it('false when PP stage is STAGE1_TELEPORTED', () => {
    const state = emptyState()
    place(state, sq(5, 5), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_TELEPORTED)
    expect(isImmobile(sq(5, 5), state)).toBe(false)
  })

  it('false for a non-PP piece at the square', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.ROOK))
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    expect(isImmobile(sq(5, 9), state)).toBe(false)
  })

  it('false for empty square', () => {
    const state = emptyState()
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    expect(isImmobile(sq(5, 9), state)).toBe(false)
  })
})

// =============================================================================
// handlePawnOfPawnsArrival — Stage transitions
// =============================================================================

describe('handlePawnOfPawnsArrival', () => {
  it('UNPROMOTED → STAGE1_ON_BACK_RANK for white', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    const next = handlePawnOfPawnsArrival('w', state)
    expect(next.whitePawnOfPawnsStage).toBe(PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
  })

  it('UNPROMOTED → STAGE1_ON_BACK_RANK for black', () => {
    const state = emptyState()
    place(state, sq(5, 0), bp(PieceType.PAWN_OF_PAWNS))
    const next = handlePawnOfPawnsArrival('b', state)
    expect(next.blackPawnOfPawnsStage).toBe(PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
  })

  it('STAGE1_TELEPORTED → STAGE2_ON_BACK_RANK', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_TELEPORTED)
    const next = handlePawnOfPawnsArrival('w', state)
    expect(next.whitePawnOfPawnsStage).toBe(PawnOfPawnsStage.STAGE2_ON_BACK_RANK)
  })

  it('STAGE2_RELOCATED → PROMOTED_TO_ADV_KING: board updated', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE2_RELOCATED)
    const next = handlePawnOfPawnsArrival('w', state)
    expect(next.whitePawnOfPawnsStage).toBe(PawnOfPawnsStage.PROMOTED_TO_ADV_KING)
    // PP should be gone, AK should be at {5,9}
    const ak = next.pieces.get('5,9')
    expect(ak?.type).toBe(PieceType.ADVENTITIOUS_KING)
    expect(ak?.color).toBe('w')
  })

  it('STAGE2_RELOCATED → PROMOTED_TO_ADV_KING: royals updated', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE2_RELOCATED)
    state.whiteRoyals = [sq(5, 1)] // original King
    const next = handlePawnOfPawnsArrival('w', state)
    expect(next.whiteRoyals).toHaveLength(2)
    expect(next.whiteRoyals).toContainEqual(sq(5, 9))
  })

  it('does not mutate the original state', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    const originalStage = state.whitePawnOfPawnsStage
    handlePawnOfPawnsArrival('w', state)
    expect(state.whitePawnOfPawnsStage).toBe(originalStage)
  })

  it('throws for unexpected stage (STAGE1_ON_BACK_RANK)', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    expect(() => handlePawnOfPawnsArrival('w', state)).toThrow()
  })
})

// =============================================================================
// generatePawnOfPawnsTeleportMoves
// =============================================================================

describe('generatePawnOfPawnsTeleportMoves', () => {
  it('returns [] when no enemies are on the board (no threat possible)', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    const moves = generatePawnOfPawnsTeleportMoves('w', state)
    expect(moves).toHaveLength(0)
  })

  it('generates teleport move to square threatening an enemy', () => {
    const state = emptyState()
    // White PP at back rank
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    // Enemy at (4, 6). PP at (3, 5) would threaten (4, 6) diagonally.
    place(state, sq(4, 6), bp(PieceType.ROOK))

    const moves = generatePawnOfPawnsTeleportMoves('w', state)
    expect(moves.length).toBeGreaterThan(0)
    expect(moves.every(m => m.flag === MoveFlag.PAWN_OF_PAWNS_TELEPORT)).toBe(true)
    // One valid destination: (3,5) — threatens (4,6)
    const dest35 = moves.find(m => m.to.file === 3 && m.to.rank === 5)
    expect(dest35).toBeDefined()
  })

  it('all returned moves have PAWN_OF_PAWNS_TELEPORT flag', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    place(state, sq(5, 5), bp(PieceType.ROOK)) // enemy at (5,5)

    const moves = generatePawnOfPawnsTeleportMoves('w', state)
    expect(moves.every(m => m.flag === MoveFlag.PAWN_OF_PAWNS_TELEPORT)).toBe(true)
  })

  it('destination occupied by friendly non-King → displacement move (displaced set)', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    // Enemy at (4,6), so (3,5) is a valid destination
    place(state, sq(4, 6), bp(PieceType.ROOK))
    // Friendly Vizier at (3,5) — will be displaced
    const vizier = wp(PieceType.VIZIER)
    place(state, sq(3, 5), vizier)

    const moves = generatePawnOfPawnsTeleportMoves('w', state)
    const displacedMove = moves.find(m => m.to.file === 3 && m.to.rank === 5)
    expect(displacedMove).toBeDefined()
    expect(displacedMove!.displaced).toEqual(vizier)
  })

  it('destination occupied by friendly King → not a valid teleport target', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    place(state, sq(4, 6), bp(PieceType.ROOK)) // enemy → (3,5) is valid destination
    place(state, sq(3, 5), wp(PieceType.KING))  // King blocks that destination

    const moves = generatePawnOfPawnsTeleportMoves('w', state)
    expect(moves.find(m => m.to.file === 3 && m.to.rank === 5)).toBeUndefined()
  })

  it('destination occupied by enemy → not a valid teleport target', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    place(state, sq(4, 6), bp(PieceType.ROOK))   // enemy at (4,6)
    place(state, sq(3, 5), bp(PieceType.KNIGHT)) // another enemy occupying (3,5)

    const moves = generatePawnOfPawnsTeleportMoves('w', state)
    // (3,5) occupied by enemy → skip; (5,5) would threaten (4,6) too
    expect(moves.find(m => m.to.file === 3 && m.to.rank === 5)).toBeUndefined()
  })

  it('square from which PP cannot threaten any enemy is not a valid destination', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    // Enemy at (4,6) → (3,5) and (5,5) are valid threats
    // But (0,0) cannot threaten (4,6)
    place(state, sq(4, 6), bp(PieceType.ROOK))

    const moves = generatePawnOfPawnsTeleportMoves('w', state)
    expect(moves.find(m => m.to.file === 0 && m.to.rank === 0)).toBeUndefined()
  })

  it('multiple enemies → multiple valid teleport destinations', () => {
    const state = emptyState()
    place(state, sq(0, 9), wp(PieceType.PAWN_OF_PAWNS)) // PP at back rank
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    // Two enemies far apart
    place(state, sq(2, 5), bp(PieceType.ROOK))   // threatened from (1,4) or (3,4)
    place(state, sq(8, 5), bp(PieceType.KNIGHT)) // threatened from (7,4) or (9,4)

    const moves = generatePawnOfPawnsTeleportMoves('w', state)
    expect(moves.length).toBeGreaterThan(1)
  })

  it('black PP teleport direction is forward (toward lower rank)', () => {
    const state = emptyState()
    place(state, sq(5, 0), bp(PieceType.PAWN_OF_PAWNS))
    setBlackStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    // White enemy at (4,4); black PP at (3,5) threatens (4,4) diagonally (rank-1)
    place(state, sq(4, 4), wp(PieceType.ROOK))

    const moves = generatePawnOfPawnsTeleportMoves('b', state)
    const dest35 = moves.find(m => m.to.file === 3 && m.to.rank === 5)
    expect(dest35).toBeDefined()
    expect(dest35!.flag).toBe(MoveFlag.PAWN_OF_PAWNS_TELEPORT)
  })

  it('returns [] when PP is not on board', () => {
    const state = emptyState()
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    // No PP placed
    const moves = generatePawnOfPawnsTeleportMoves('w', state)
    expect(moves).toHaveLength(0)
  })
})

// =============================================================================
// relocatePawnOfPawns
// =============================================================================

describe('relocatePawnOfPawns', () => {
  it('white PP relocates to Pawn of Kings start square {5, 2} when empty', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE2_ON_BACK_RANK)

    const { square, newState } = relocatePawnOfPawns('w', state)
    expect(square).toEqual(sq(5, 2))
    expect(newState.whitePawnOfPawnsStage).toBe(PawnOfPawnsStage.STAGE2_RELOCATED)
  })

  it('PP is moved from old square to new square', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE2_ON_BACK_RANK)

    const { newState } = relocatePawnOfPawns('w', state)
    expect(newState.pieces.has('5,9')).toBe(false)     // old square empty
    expect(newState.pieces.get('5,2')?.type).toBe(PieceType.PAWN_OF_PAWNS)
  })

  it('black PP relocates to {5, 7}', () => {
    const state = emptyState()
    place(state, sq(5, 0), bp(PieceType.PAWN_OF_PAWNS))
    setBlackStage(state, PawnOfPawnsStage.STAGE2_ON_BACK_RANK)

    const { square } = relocatePawnOfPawns('b', state)
    expect(square).toEqual(sq(5, 7))
  })

  it('when target {5,2} is occupied, expands left to {4,2}', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    place(state, sq(5, 2), wp(PieceType.ROOK)) // target occupied
    setWhiteStage(state, PawnOfPawnsStage.STAGE2_ON_BACK_RANK)

    const { square } = relocatePawnOfPawns('w', state)
    expect(square).toEqual(sq(4, 2)) // next in expansion order: 4
  })

  it('when {5,2} and {4,2} occupied, expands right to {6,2}', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    place(state, sq(5, 2), wp(PieceType.ROOK))
    place(state, sq(4, 2), wp(PieceType.KNIGHT))
    setWhiteStage(state, PawnOfPawnsStage.STAGE2_ON_BACK_RANK)

    const { square } = relocatePawnOfPawns('w', state)
    expect(square).toEqual(sq(6, 2))
  })

  it('does not mutate original state', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE2_ON_BACK_RANK)

    relocatePawnOfPawns('w', state)
    expect(state.pieces.has('5,9')).toBe(true) // original unchanged
    expect(state.whitePawnOfPawnsStage).toBe(PawnOfPawnsStage.STAGE2_ON_BACK_RANK)
  })
})

// =============================================================================
// promotePawnOfPawnsToAdventitious
// =============================================================================

describe('promotePawnOfPawnsToAdventitious', () => {
  it('replaces PP with ADVENTITIOUS_KING at the same square', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))

    const next = promotePawnOfPawnsToAdventitious(sq(5, 9), 'w', state)
    const at59 = next.pieces.get('5,9')
    expect(at59?.type).toBe(PieceType.ADVENTITIOUS_KING)
    expect(at59?.color).toBe('w')
  })

  it('PP piece is removed from the board', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))

    const next = promotePawnOfPawnsToAdventitious(sq(5, 9), 'w', state)
    // No PAWN_OF_PAWNS piece should exist for white
    const ppExists = [...next.pieces.values()].some(
      p => p.type === PieceType.PAWN_OF_PAWNS && p.color === 'w',
    )
    expect(ppExists).toBe(false)
  })

  it('adds Adventitious King square to whiteRoyals', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    state.whiteRoyals = [sq(5, 1)]

    const next = promotePawnOfPawnsToAdventitious(sq(5, 9), 'w', state)
    expect(next.whiteRoyals).toHaveLength(2)
    expect(next.whiteRoyals).toContainEqual(sq(5, 9))
  })

  it('sets stage to PROMOTED_TO_ADV_KING', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))

    const next = promotePawnOfPawnsToAdventitious(sq(5, 9), 'w', state)
    expect(next.whitePawnOfPawnsStage).toBe(PawnOfPawnsStage.PROMOTED_TO_ADV_KING)
  })

  it('works for black: adds to blackRoyals', () => {
    const state = emptyState()
    place(state, sq(5, 0), bp(PieceType.PAWN_OF_PAWNS))
    state.blackRoyals = [sq(5, 8)]

    const next = promotePawnOfPawnsToAdventitious(sq(5, 0), 'b', state)
    expect(next.blackRoyals).toContainEqual(sq(5, 0))
    expect(next.blackPawnOfPawnsStage).toBe(PawnOfPawnsStage.PROMOTED_TO_ADV_KING)
  })

  it('does not mutate original state', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    const origRoyals = [...state.whiteRoyals]

    promotePawnOfPawnsToAdventitious(sq(5, 9), 'w', state)
    expect(state.pieces.get('5,9')?.type).toBe(PieceType.PAWN_OF_PAWNS) // unchanged
    expect(state.whiteRoyals).toEqual(origRoyals)
  })
})

// =============================================================================
// moves.ts integration — Stage 0: PP moves as normal pawn
// =============================================================================

describe('moves.ts integration — Stage 0 PP', () => {
  it('PP at mid-board generates normal pawn forward move', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_PAWNS)
    place(state, sq(5, 5), pawn)
    setWhiteStage(state, PawnOfPawnsStage.UNPROMOTED)

    const moves = generateMovesForPiece(sq(5, 5), pawn, state)
    expect(moves).toHaveLength(1)
    expect(moves[0].to).toEqual(sq(5, 6))
    expect(moves[0].flag).toBe(MoveFlag.NORMAL)
  })

  it('PP at rank 8 (UNPROMOTED) generates STAGE1_ARRIVAL move to rank 9', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_PAWNS)
    place(state, sq(5, 8), pawn)
    setWhiteStage(state, PawnOfPawnsStage.UNPROMOTED)

    const moves = generateMovesForPiece(sq(5, 8), pawn, state)
    expect(moves).toHaveLength(1)
    expect(moves[0].flag).toBe(MoveFlag.PAWN_OF_PAWNS_STAGE1_ARRIVAL)
    expect(moves[0].promotionType).toBeUndefined()
  })
})

// =============================================================================
// moves.ts integration — Stage 1: teleport via generateMovesForPiece
// =============================================================================

describe('moves.ts integration — Stage 1 PP dispatch', () => {
  it('Stage1 PP with no enemies → generateMovesForPiece returns []', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_PAWNS)
    place(state, sq(5, 9), pawn)
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)

    const moves = generateMovesForPiece(sq(5, 9), pawn, state)
    expect(moves).toHaveLength(0)
  })

  it('Stage1 PP with enemy in range → generateMovesForPiece returns teleport moves', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_PAWNS)
    place(state, sq(5, 9), pawn)
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    place(state, sq(4, 6), bp(PieceType.ROOK)) // enemy

    const moves = generateMovesForPiece(sq(5, 9), pawn, state)
    expect(moves.length).toBeGreaterThan(0)
    expect(moves.every(m => m.flag === MoveFlag.PAWN_OF_PAWNS_TELEPORT)).toBe(true)
  })

  it('Stage1_TELEPORTED PP generates normal pawn moves again', () => {
    const state = emptyState()
    const pawn = wp(PieceType.PAWN_OF_PAWNS)
    place(state, sq(5, 5), pawn)
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_TELEPORTED)

    const moves = generateMovesForPiece(sq(5, 5), pawn, state)
    expect(moves).toHaveLength(1)
    expect(moves[0].flag).toBe(MoveFlag.NORMAL)
  })
})

// =============================================================================
// moves.ts integration — Invincibility filter
// =============================================================================

describe('moves.ts integration — invincibility filter', () => {
  it('enemy rook cannot capture Stage1 PP (move is filtered out)', () => {
    const state = emptyState()
    // White PP sitting invincible at rank 9
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    // Black rook at rank 7 — would normally slide to rank 9 to capture
    const rook = bp(PieceType.ROOK)
    place(state, sq(5, 7), rook)

    const moves = generateMovesForPiece(sq(5, 7), rook, state)
    // Rook can advance to rank 8, but cannot capture at rank 9
    const captureAtRank9 = moves.find(m => m.to.rank === 9)
    expect(captureAtRank9).toBeUndefined()
  })

  it('enemy rook CAN capture normal (UNPROMOTED) PP', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.UNPROMOTED) // not invincible
    const rook = bp(PieceType.ROOK)
    place(state, sq(5, 7), rook)

    const moves = generateMovesForPiece(sq(5, 7), rook, state)
    const captureAtRank9 = moves.find(m => m.to.rank === 9 && m.flag === MoveFlag.CAPTURE)
    expect(captureAtRank9).toBeDefined()
  })

  it('enemy knight cannot jump-capture Stage1 PP', () => {
    const state = emptyState()
    place(state, sq(5, 9), wp(PieceType.PAWN_OF_PAWNS))
    setWhiteStage(state, PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    // Black knight at (4,7) — L-shape to (5,9) would be (1,2) — valid
    const knight = bp(PieceType.KNIGHT)
    place(state, sq(4, 7), knight)

    const moves = generateMovesForPiece(sq(4, 7), knight, state)
    const captureMove = moves.find(m => m.to.file === 5 && m.to.rank === 9)
    expect(captureMove).toBeUndefined()
  })
})

// =============================================================================
// Prince and Adventitious King moves
// =============================================================================

describe('Prince moves (via generateMovesForPiece)', () => {
  it('PRINCE generates 8 moves from center (like King)', () => {
    const state = emptyState()
    const prince = wp(PieceType.PRINCE)
    place(state, sq(5, 5), prince)

    const moves = generateMovesForPiece(sq(5, 5), prince, state)
    expect(moves).toHaveLength(8)
  })

  it('PRINCE captures enemy pieces', () => {
    const state = emptyState()
    const prince = wp(PieceType.PRINCE)
    place(state, sq(5, 5), prince)
    place(state, sq(6, 6), bp(PieceType.ROOK))

    const moves = generateMovesForPiece(sq(5, 5), prince, state)
    const cap = moves.find(m => m.to.file === 6 && m.to.rank === 6)
    expect(cap?.flag).toBe(MoveFlag.CAPTURE)
  })

  it('PRINCE does not return empty array', () => {
    const state = emptyState()
    const prince = wp(PieceType.PRINCE)
    place(state, sq(5, 5), prince)
    const moves = generateMovesForPiece(sq(5, 5), prince, state)
    expect(moves.length).toBeGreaterThan(0)
  })

  it('PRINCE cannot enter own citadel', () => {
    const state = emptyState()
    // White Prince adjacent to white citadel (file 10, rank 1 → citadel at file 11, rank 1)
    const prince = wp(PieceType.PRINCE)
    place(state, sq(10, 1), prince)

    const moves = generateMovesForPiece(sq(10, 1), prince, state)
    // No move should go to the white citadel {file:11, rank:1}
    expect(moves.find(m => m.to.file === 11 && m.to.rank === 1)).toBeUndefined()
  })
})

describe('Adventitious King moves (via generateMovesForPiece)', () => {
  it('ADVENTITIOUS_KING generates moves from center', () => {
    const state = emptyState()
    const ak = wp(PieceType.ADVENTITIOUS_KING)
    place(state, sq(5, 5), ak)

    const moves = generateMovesForPiece(sq(5, 5), ak, state)
    expect(moves).toHaveLength(8)
  })

  it('ADVENTITIOUS_KING can enter own citadel (CITADEL_DEFENSE)', () => {
    const state = emptyState()
    // White AK at (10,1) — adjacent to white citadel (11,1)
    const ak = wp(PieceType.ADVENTITIOUS_KING)
    place(state, sq(10, 1), ak)

    const moves = generateMovesForPiece(sq(10, 1), ak, state)
    const citadelMove = moves.find(m => m.to.file === 11 && m.to.rank === 1)
    expect(citadelMove).toBeDefined()
    expect(citadelMove!.flag).toBe(MoveFlag.CITADEL_DEFENSE)
  })

  it('ADVENTITIOUS_KING does not return empty array', () => {
    const state = emptyState()
    const ak = wp(PieceType.ADVENTITIOUS_KING)
    place(state, sq(5, 5), ak)
    const moves = generateMovesForPiece(sq(5, 5), ak, state)
    expect(moves.length).toBeGreaterThan(0)
  })

  it('ADVENTITIOUS_KING can capture enemy pieces', () => {
    const state = emptyState()
    const ak = wp(PieceType.ADVENTITIOUS_KING)
    place(state, sq(5, 5), ak)
    place(state, sq(6, 6), bp(PieceType.ROOK))

    const moves = generateMovesForPiece(sq(5, 5), ak, state)
    const cap = moves.find(m => m.to.file === 6 && m.to.rank === 6)
    expect(cap?.flag).toBe(MoveFlag.CAPTURE)
  })
})

// =============================================================================
// Full Lifecycle Integration Test
// Stage 0 → 1 → teleport → normal pawn → 2 → relocate → normal pawn → 3 → AK
// =============================================================================

describe('Pawn of Pawns — full lifecycle integration', () => {
  it('simulates all 3 stages and final promotion', () => {
    // ─── Stage 0: PP at rank 5, moves as normal pawn ───────────────────────
    let state = emptyState()
    const ppPiece = wp(PieceType.PAWN_OF_PAWNS)
    place(state, sq(5, 5), ppPiece)
    expect(getPawnOfPawnsStage('w', state)).toBe(PawnOfPawnsStage.UNPROMOTED)

    let moves = generateMovesForPiece(sq(5, 5), ppPiece, state)
    expect(moves[0].flag).toBe(MoveFlag.NORMAL) // normal pawn move

    // ─── Stage 0→1: PP arrives at back rank, handlePawnOfPawnsArrival ──────
    state.pieces.delete('5,5')
    place(state, sq(5, 9), ppPiece)
    state = handlePawnOfPawnsArrival('w', state)
    expect(state.whitePawnOfPawnsStage).toBe(PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    expect(isInvincible(sq(5, 9), state)).toBe(true)

    // ─── Stage 1: teleport moves generated when enemy present ───────────────
    place(state, sq(4, 6), bp(PieceType.ROOK))
    moves = generateMovesForPiece(sq(5, 9), ppPiece, state)
    expect(moves.length).toBeGreaterThan(0)
    expect(moves[0].flag).toBe(MoveFlag.PAWN_OF_PAWNS_TELEPORT)

    // ─── Teleport executed (simulated): PP moves to (3,5), stage updated ───
    state.pieces.delete('5,9')
    place(state, sq(3, 5), ppPiece)
    state.whitePawnOfPawnsStage = PawnOfPawnsStage.STAGE1_TELEPORTED

    // PP is no longer invincible after teleport
    expect(isInvincible(sq(3, 5), state)).toBe(false)

    // ─── Stage 1_TELEPORTED: PP moves as normal pawn again ─────────────────
    moves = generateMovesForPiece(sq(3, 5), ppPiece, state)
    expect(moves.some(m => m.flag === MoveFlag.NORMAL || m.flag === MoveFlag.CAPTURE)).toBe(true)

    // ─── Stage 1→2: PP arrives at back rank for second time ─────────────────
    state.pieces.delete('3,5')
    place(state, sq(5, 9), ppPiece)
    state = handlePawnOfPawnsArrival('w', state)
    expect(state.whitePawnOfPawnsStage).toBe(PawnOfPawnsStage.STAGE2_ON_BACK_RANK)

    // ─── Stage 2: relocate PP to Pawn of Kings start ────────────────────────
    const { square: relocSq, newState: stateAfterReloc } = relocatePawnOfPawns('w', state)
    state = stateAfterReloc
    expect(state.whitePawnOfPawnsStage).toBe(PawnOfPawnsStage.STAGE2_RELOCATED)
    expect(relocSq).toEqual(sq(5, 2)) // Pawn of Kings start square (rank 2 empty)

    // PP now at relocated square, moves as normal pawn
    moves = generateMovesForPiece(relocSq, ppPiece, state)
    expect(moves.some(m => m.flag === MoveFlag.NORMAL)).toBe(true)

    // ─── Stage 2→3: PP arrives at back rank for third time ──────────────────
    state.pieces.delete(`${relocSq.file},${relocSq.rank}`)
    place(state, sq(5, 9), ppPiece)
    state = handlePawnOfPawnsArrival('w', state)
    expect(state.whitePawnOfPawnsStage).toBe(PawnOfPawnsStage.PROMOTED_TO_ADV_KING)

    // ─── Stage 3: Adventitious King on board, PP gone ───────────────────────
    const ak = state.pieces.get('5,9')
    expect(ak?.type).toBe(PieceType.ADVENTITIOUS_KING)
    expect(getPawnOfPawnsSquare('w', state)).toBeNull() // PP no longer on board

    // AK is in royals list
    expect(state.whiteRoyals).toContainEqual(sq(5, 9))

    // AK generates king-like moves
    const akPiece = wp(PieceType.ADVENTITIOUS_KING)
    moves = generateMovesForPiece(sq(5, 9), akPiece, state)
    expect(moves.length).toBeGreaterThan(0)
  })
})
