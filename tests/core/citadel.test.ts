// =============================================================================
// TAMERLANE SIEGE — Citadel Logic Tests
// tests/core/citadel.test.ts
// =============================================================================

import { describe, it, expect } from 'vitest'
import { PieceType, MoveFlag, GameResult, type Square, type Piece, type GameState } from '../../src/core/types'
import { createInitialGameState } from '../../src/core/board'
import {
  isCitadelOccupied,
  getHighestRoyal,
  canEnterOpponentCitadel,
  canEnterOwnCitadel,
  handleCitadelEntry,
  getOpponentCitadel,
  getOwnCitadel,
} from '../../src/core/citadel'
import { generateMovesForPiece } from '../../src/core/moves'

// =============================================================================
// Helpers
// =============================================================================

// White citadel: { file: 11, rank: 1 }
// Black citadel: { file: -1, rank: 8 }
const WHITE_CITADEL: Square = { file: 11, rank: 1 }
const BLACK_CITADEL: Square = { file: -1, rank: 8 }

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
// isCitadelOccupied
// =============================================================================

describe('isCitadelOccupied', () => {
  it('returns false for empty citadel', () => {
    const state = emptyState()
    expect(isCitadelOccupied(WHITE_CITADEL, state)).toBe(false)
    expect(isCitadelOccupied(BLACK_CITADEL, state)).toBe(false)
  })

  it('returns true when AK is in own citadel', () => {
    const state = emptyState()
    place(state, WHITE_CITADEL, wp(PieceType.ADVENTITIOUS_KING))
    expect(isCitadelOccupied(WHITE_CITADEL, state)).toBe(true)
    expect(isCitadelOccupied(BLACK_CITADEL, state)).toBe(false)
  })
})

// =============================================================================
// getHighestRoyal
// =============================================================================

describe('getHighestRoyal', () => {
  it('returns KING when King is alive', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    expect(getHighestRoyal('w', state)).toBe(PieceType.KING)
  })

  it('returns KING even when AK and Prince also present', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(3, 3), wp(PieceType.ADVENTITIOUS_KING))
    place(state, sq(4, 3), wp(PieceType.PRINCE))
    expect(getHighestRoyal('w', state)).toBe(PieceType.KING)
  })

  it('returns ADVENTITIOUS_KING when King is gone', () => {
    const state = emptyState()
    place(state, sq(3, 3), wp(PieceType.ADVENTITIOUS_KING))
    expect(getHighestRoyal('w', state)).toBe(PieceType.ADVENTITIOUS_KING)
  })

  it('returns ADVENTITIOUS_KING over PRINCE', () => {
    const state = emptyState()
    place(state, sq(3, 3), wp(PieceType.ADVENTITIOUS_KING))
    place(state, sq(4, 3), wp(PieceType.PRINCE))
    expect(getHighestRoyal('w', state)).toBe(PieceType.ADVENTITIOUS_KING)
  })

  it('returns PRINCE when only Prince is alive', () => {
    const state = emptyState()
    place(state, sq(4, 3), wp(PieceType.PRINCE))
    expect(getHighestRoyal('w', state)).toBe(PieceType.PRINCE)
  })

  it('returns null when no royals alive', () => {
    const state = emptyState()
    place(state, sq(4, 3), wp(PieceType.ROOK))
    expect(getHighestRoyal('w', state)).toBeNull()
  })

  it('is color-specific', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(3, 3), bp(PieceType.PRINCE))
    expect(getHighestRoyal('w', state)).toBe(PieceType.KING)
    expect(getHighestRoyal('b', state)).toBe(PieceType.PRINCE)
  })
})

// =============================================================================
// canEnterOpponentCitadel
// =============================================================================

describe('canEnterOpponentCitadel', () => {
  it('King can enter when it is the sole royal', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    expect(canEnterOpponentCitadel(wp(PieceType.KING), 'w', state)).toBe(true)
  })

  it('King can enter even when Prince is also present', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(4, 3), wp(PieceType.PRINCE))
    expect(canEnterOpponentCitadel(wp(PieceType.KING), 'w', state)).toBe(true)
  })

  it('King can enter even when AK is also present', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(3, 3), wp(PieceType.ADVENTITIOUS_KING))
    expect(canEnterOpponentCitadel(wp(PieceType.KING), 'w', state)).toBe(true)
  })

  it('Prince CANNOT enter when King is alive', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(4, 3), wp(PieceType.PRINCE))
    expect(canEnterOpponentCitadel(wp(PieceType.PRINCE), 'w', state)).toBe(false)
  })

  it('AK cannot enter opponent citadel when King is alive', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(3, 3), wp(PieceType.ADVENTITIOUS_KING))
    expect(canEnterOpponentCitadel(wp(PieceType.ADVENTITIOUS_KING), 'w', state)).toBe(false)
  })

  it('AK can enter opponent citadel when King is gone', () => {
    const state = emptyState()
    place(state, sq(3, 3), wp(PieceType.ADVENTITIOUS_KING))
    expect(canEnterOpponentCitadel(wp(PieceType.ADVENTITIOUS_KING), 'w', state)).toBe(true)
  })

  it('Prince can enter when it is the only royal', () => {
    const state = emptyState()
    place(state, sq(4, 3), wp(PieceType.PRINCE))
    expect(canEnterOpponentCitadel(wp(PieceType.PRINCE), 'w', state)).toBe(true)
  })

  it('non-royal piece cannot enter opponent citadel', () => {
    const state = emptyState()
    place(state, sq(5, 1), wp(PieceType.KING))
    expect(canEnterOpponentCitadel(wp(PieceType.ROOK), 'w', state)).toBe(false)
  })
})

// =============================================================================
// canEnterOwnCitadel
// =============================================================================

describe('canEnterOwnCitadel', () => {
  it('AK can enter own citadel when it is empty', () => {
    const state = emptyState()
    // White citadel is empty
    expect(canEnterOwnCitadel(wp(PieceType.ADVENTITIOUS_KING), 'w', state)).toBe(true)
  })

  it('AK cannot enter own citadel when occupied', () => {
    const state = emptyState()
    place(state, WHITE_CITADEL, wp(PieceType.ADVENTITIOUS_KING))
    // Citadel already occupied
    expect(canEnterOwnCitadel(wp(PieceType.ADVENTITIOUS_KING), 'w', state)).toBe(false)
  })

  it('King cannot enter own citadel', () => {
    const state = emptyState()
    expect(canEnterOwnCitadel(wp(PieceType.KING), 'w', state)).toBe(false)
  })

  it('Prince cannot enter own citadel', () => {
    const state = emptyState()
    expect(canEnterOwnCitadel(wp(PieceType.PRINCE), 'w', state)).toBe(false)
  })

  it('Rook cannot enter own citadel', () => {
    const state = emptyState()
    expect(canEnterOwnCitadel(wp(PieceType.ROOK), 'w', state)).toBe(false)
  })

  it('works for black side', () => {
    const state = emptyState()
    expect(canEnterOwnCitadel(bp(PieceType.ADVENTITIOUS_KING), 'b', state)).toBe(true)
    place(state, BLACK_CITADEL, bp(PieceType.ADVENTITIOUS_KING))
    expect(canEnterOwnCitadel(bp(PieceType.ADVENTITIOUS_KING), 'b', state)).toBe(false)
  })
})

// =============================================================================
// handleCitadelEntry
// =============================================================================

describe('handleCitadelEntry', () => {
  it('CITADEL_ENTRY sets result = DRAW_CITADEL', () => {
    const state = emptyState()
    const kingSquare = sq(10, 1)  // Adjacent to white citadel
    place(state, kingSquare, bp(PieceType.KING))

    const move = {
      from:  kingSquare,
      to:    WHITE_CITADEL,
      piece: bp(PieceType.KING),
      flag:  MoveFlag.CITADEL_ENTRY,
    }

    const newState = handleCitadelEntry(move, state)
    expect(newState.result).toBe(GameResult.DRAW_CITADEL)
    // Piece is moved to citadel square
    expect(newState.pieces.get('11,1')?.type).toBe(PieceType.KING)
  })

  it('CITADEL_DEFENSE sets whiteCitadelOccupant for white AK', () => {
    const state = emptyState()
    const akSquare = sq(10, 1)
    place(state, akSquare, wp(PieceType.ADVENTITIOUS_KING))

    const move = {
      from:  akSquare,
      to:    WHITE_CITADEL,
      piece: wp(PieceType.ADVENTITIOUS_KING),
      flag:  MoveFlag.CITADEL_DEFENSE,
    }

    const newState = handleCitadelEntry(move, state)
    expect(newState.result).toBeNull()
    expect(newState.whiteCitadelOccupant?.type).toBe(PieceType.ADVENTITIOUS_KING)
    expect(newState.whiteCitadelOccupant?.color).toBe('w')
    // AK is now in citadel
    expect(newState.pieces.get('11,1')?.type).toBe(PieceType.ADVENTITIOUS_KING)
  })

  it('CITADEL_DEFENSE sets blackCitadelOccupant for black AK', () => {
    const state = emptyState()
    const akSquare = sq(0, 8)
    place(state, akSquare, bp(PieceType.ADVENTITIOUS_KING))

    const move = {
      from:  akSquare,
      to:    BLACK_CITADEL,
      piece: bp(PieceType.ADVENTITIOUS_KING),
      flag:  MoveFlag.CITADEL_DEFENSE,
    }

    const newState = handleCitadelEntry(move, state)
    expect(newState.blackCitadelOccupant?.type).toBe(PieceType.ADVENTITIOUS_KING)
    expect(newState.blackCitadelOccupant?.color).toBe('b')
  })

  it('does not mutate original state', () => {
    const state = emptyState()
    const akSquare = sq(10, 1)
    place(state, akSquare, wp(PieceType.ADVENTITIOUS_KING))

    const move = {
      from:  akSquare,
      to:    WHITE_CITADEL,
      piece: wp(PieceType.ADVENTITIOUS_KING),
      flag:  MoveFlag.CITADEL_DEFENSE,
    }

    handleCitadelEntry(move, state)
    expect(state.whiteCitadelOccupant).toBeNull()
    expect(state.pieces.has('11,1')).toBe(false)
  })
})

// =============================================================================
// moves.ts integration — generateKingMoves uses canEnterOpponentCitadel
// =============================================================================

describe('moves.ts citadel integration', () => {
  it('King generates CITADEL_ENTRY move when it is the highest royal', () => {
    const state = emptyState()
    // White King adjacent to black citadel at (0, 8)
    // Black citadel: { file: -1, rank: 8 }
    // Adjacent squares to black citadel: file 0, ranks 7-9
    const kingSquare = sq(0, 8)
    place(state, kingSquare, wp(PieceType.KING))

    const moves = generateMovesForPiece(kingSquare, wp(PieceType.KING), state)
    const citadelMoves = moves.filter(m => m.flag === MoveFlag.CITADEL_ENTRY)
    expect(citadelMoves.length).toBeGreaterThan(0)
  })

  it('Prince does NOT generate CITADEL_ENTRY when King is alive', () => {
    const state = emptyState()
    // Prince adjacent to black citadel, but King is also alive
    const princeSquare = sq(0, 8)
    place(state, princeSquare, wp(PieceType.PRINCE))
    place(state, sq(5, 1), wp(PieceType.KING))  // King alive

    const moves = generateMovesForPiece(princeSquare, wp(PieceType.PRINCE), state)
    const citadelMoves = moves.filter(m => m.flag === MoveFlag.CITADEL_ENTRY)
    expect(citadelMoves).toHaveLength(0)
  })

  it('Prince DOES generate CITADEL_ENTRY when it is the only royal', () => {
    const state = emptyState()
    const princeSquare = sq(0, 8)
    place(state, princeSquare, wp(PieceType.PRINCE))
    // No King or AK alive

    const moves = generateMovesForPiece(princeSquare, wp(PieceType.PRINCE), state)
    const citadelMoves = moves.filter(m => m.flag === MoveFlag.CITADEL_ENTRY)
    expect(citadelMoves.length).toBeGreaterThan(0)
  })

  it('King does NOT generate CITADEL_ENTRY when citadel is occupied', () => {
    const state = emptyState()
    const kingSquare = sq(0, 8)
    place(state, kingSquare, wp(PieceType.KING))
    // Black citadel is occupied (immune AK)
    place(state, BLACK_CITADEL, bp(PieceType.ADVENTITIOUS_KING))

    const moves = generateMovesForPiece(kingSquare, wp(PieceType.KING), state)
    const citadelMoves = moves.filter(m => m.flag === MoveFlag.CITADEL_ENTRY)
    expect(citadelMoves).toHaveLength(0)
  })

  it('AK generates CITADEL_DEFENSE when adjacent to own empty citadel', () => {
    const state = emptyState()
    // White AK adjacent to white citadel
    const akSquare = sq(10, 1)
    place(state, akSquare, wp(PieceType.ADVENTITIOUS_KING))

    const moves = generateMovesForPiece(akSquare, wp(PieceType.ADVENTITIOUS_KING), state)
    const defenseMoves = moves.filter(m => m.flag === MoveFlag.CITADEL_DEFENSE)
    expect(defenseMoves.length).toBeGreaterThan(0)
  })

  it('AK does NOT generate CITADEL_DEFENSE when own citadel is occupied', () => {
    const state = emptyState()
    const akSquare = sq(10, 1)
    place(state, akSquare, wp(PieceType.ADVENTITIOUS_KING))
    // White citadel already occupied
    place(state, WHITE_CITADEL, wp(PieceType.ADVENTITIOUS_KING))

    const moves = generateMovesForPiece(akSquare, wp(PieceType.ADVENTITIOUS_KING), state)
    const defenseMoves = moves.filter(m => m.flag === MoveFlag.CITADEL_DEFENSE)
    expect(defenseMoves).toHaveLength(0)
  })

  it('King does NOT generate CITADEL_DEFENSE (own citadel)', () => {
    const state = emptyState()
    const kingSquare = sq(10, 1)
    place(state, kingSquare, wp(PieceType.KING))

    const moves = generateMovesForPiece(kingSquare, wp(PieceType.KING), state)
    const defenseMoves = moves.filter(m => m.flag === MoveFlag.CITADEL_DEFENSE)
    expect(defenseMoves).toHaveLength(0)
  })
})

// =============================================================================
// getOpponentCitadel / getOwnCitadel helpers
// =============================================================================

describe('citadel square helpers', () => {
  it('getOpponentCitadel returns correct squares', () => {
    expect(getOpponentCitadel('w')).toEqual(BLACK_CITADEL)
    expect(getOpponentCitadel('b')).toEqual(WHITE_CITADEL)
  })

  it('getOwnCitadel returns correct squares', () => {
    expect(getOwnCitadel('w')).toEqual(WHITE_CITADEL)
    expect(getOwnCitadel('b')).toEqual(BLACK_CITADEL)
  })
})
