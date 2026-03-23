import { describe, it, expect } from 'vitest'
import {
  STARTING_ENTRIES,
  PIECES_PER_SIDE,
  FILES,
  RANKS,
  TOTAL_SQUARES,
  MAIN_BOARD_SQUARES,
  WHITE_CITADEL,
  BLACK_CITADEL,
  WHITE_PAWN_OF_KINGS_START,
  BLACK_PAWN_OF_KINGS_START,
  PIECE_VALUES,
} from '../../src/core/constants'
import { PieceType } from '../../src/core/types'

describe('Constants: Board Dimensions', () => {
  it('has 11 files', () => {
    expect(FILES).toBe(11)
  })

  it('has 10 ranks', () => {
    expect(RANKS).toBe(10)
  })

  it('main board has 110 squares', () => {
    expect(MAIN_BOARD_SQUARES).toBe(110)
  })

  it('total squares including citadels is 112', () => {
    expect(TOTAL_SQUARES).toBe(112)
  })
})

describe('Constants: Citadels', () => {
  it('white citadel is at file 11, rank 1', () => {
    expect(WHITE_CITADEL).toEqual({ file: 11, rank: 1 })
  })

  it('black citadel is at file -1, rank 8', () => {
    expect(BLACK_CITADEL).toEqual({ file: -1, rank: 8 })
  })

  it('citadels are outside the main grid', () => {
    expect(WHITE_CITADEL.file).toBeGreaterThan(FILES - 1)
    expect(BLACK_CITADEL.file).toBeLessThan(0)
  })
})

describe('Constants: Starting Position — Piece Count', () => {
  it('has exactly 28 white pieces', () => {
    const whitePieces = STARTING_ENTRIES.filter(e => e.piece.color === 'w')
    expect(whitePieces.length).toBe(PIECES_PER_SIDE)
  })

  it('has exactly 28 black pieces', () => {
    const blackPieces = STARTING_ENTRIES.filter(e => e.piece.color === 'b')
    expect(blackPieces.length).toBe(PIECES_PER_SIDE)
  })

  it('has 56 total pieces at start', () => {
    expect(STARTING_ENTRIES.length).toBe(PIECES_PER_SIDE * 2)
  })
})

describe('Constants: Starting Position — White Piece Ranks', () => {
  it('white pieces only occupy ranks 0, 1, and 2', () => {
    const whiteEntries = STARTING_ENTRIES.filter(e => e.piece.color === 'w')
    for (const entry of whiteEntries) {
      expect([0, 1, 2]).toContain(entry.rank)
    }
  })

  it('white rank 1 has the King at file 5', () => {
    const kingEntry = STARTING_ENTRIES.find(
      e => e.piece.color === 'w' && e.piece.type === PieceType.KING
    )
    expect(kingEntry).toBeDefined()
    expect(kingEntry?.rank).toBe(1)
    expect(kingEntry?.file).toBe(5)
  })

  it('white rank 1 has both Rooks at files 0 and 10', () => {
    const whiteRooks = STARTING_ENTRIES.filter(
      e => e.piece.color === 'w' && e.piece.type === PieceType.ROOK
    )
    expect(whiteRooks.length).toBe(2)
    const rookFiles = whiteRooks.map(e => e.file).sort((a, b) => a - b)
    expect(rookFiles).toEqual([0, 10])
  })

  it('white rank 0 has Elephants at files 0 and 10', () => {
    const elephants = STARTING_ENTRIES.filter(
      e => e.piece.color === 'w' && e.piece.type === PieceType.ELEPHANT
    )
    expect(elephants.length).toBe(2)
    const elephantFiles = elephants.map(e => e.file).sort((a, b) => a - b)
    expect(elephantFiles).toEqual([0, 10])
    elephants.forEach(e => expect(e.rank).toBe(0))
  })

  it('white rank 0 has War Engines at files 4 and 6', () => {
    const warEngines = STARTING_ENTRIES.filter(
      e => e.piece.color === 'w' && e.piece.type === PieceType.WAR_ENGINE
    )
    expect(warEngines.length).toBe(2)
    const weFiles = warEngines.map(e => e.file).sort((a, b) => a - b)
    expect(weFiles).toEqual([4, 6])
    warEngines.forEach(e => expect(e.rank).toBe(0))
  })

  it('white rank 0 has Camels at files 2 and 8', () => {
    const camels = STARTING_ENTRIES.filter(
      e => e.piece.color === 'w' && e.piece.type === PieceType.CAMEL
    )
    expect(camels.length).toBe(2)
    const camelFiles = camels.map(e => e.file).sort((a, b) => a - b)
    expect(camelFiles).toEqual([2, 8])
    camels.forEach(e => expect(e.rank).toBe(0))
  })

  it('white rank 0 has no pieces on odd files (files 1,3,5,7,9)', () => {
    const rank0 = STARTING_ENTRIES.filter(e => e.piece.color === 'w' && e.rank === 0)
    rank0.forEach(e => expect(e.file % 2).toBe(0))
  })

  it('white rank 2 has exactly 11 pawns', () => {
    const whitePawns = STARTING_ENTRIES.filter(e => e.piece.color === 'w' && e.rank === 2)
    expect(whitePawns.length).toBe(FILES)
  })

  it('white Pawn of Kings is at file 5, rank 2', () => {
    const pok = STARTING_ENTRIES.find(
      e => e.piece.color === 'w' && e.piece.type === PieceType.PAWN_OF_KINGS
    )
    expect(pok).toBeDefined()
    expect(pok?.file).toBe(5)
    expect(pok?.rank).toBe(2)
  })

  it('white Pawn of Pawns is at file 0, rank 2', () => {
    const pop = STARTING_ENTRIES.find(
      e => e.piece.color === 'w' && e.piece.type === PieceType.PAWN_OF_PAWNS
    )
    expect(pop).toBeDefined()
    expect(pop?.file).toBe(0)
    expect(pop?.rank).toBe(2)
  })
})

describe('Constants: Starting Position — Black Piece Ranks', () => {
  it('black pieces only occupy ranks 7, 8, and 9', () => {
    const blackEntries = STARTING_ENTRIES.filter(e => e.piece.color === 'b')
    for (const entry of blackEntries) {
      expect([7, 8, 9]).toContain(entry.rank)
    }
  })

  it('black King is at file 5, rank 8', () => {
    const kingEntry = STARTING_ENTRIES.find(
      e => e.piece.color === 'b' && e.piece.type === PieceType.KING
    )
    expect(kingEntry).toBeDefined()
    expect(kingEntry?.rank).toBe(8)
    expect(kingEntry?.file).toBe(5)
  })

  it('black rank 7 has exactly 11 pawns', () => {
    const blackPawns = STARTING_ENTRIES.filter(e => e.piece.color === 'b' && e.rank === 7)
    expect(blackPawns.length).toBe(FILES)
  })

  it('black rank 9 has no pieces on odd files', () => {
    const rank9 = STARTING_ENTRIES.filter(e => e.piece.color === 'b' && e.rank === 9)
    rank9.forEach(e => expect(e.file % 2).toBe(0))
  })

  it('black Pawn of Kings is at file 5, rank 7', () => {
    const pok = STARTING_ENTRIES.find(
      e => e.piece.color === 'b' && e.piece.type === PieceType.PAWN_OF_KINGS
    )
    expect(pok).toBeDefined()
    expect(pok?.file).toBe(5)
    expect(pok?.rank).toBe(7)
  })
})

describe('Constants: Starting Position — No Overlap', () => {
  it('no two pieces share the same square', () => {
    const keys = STARTING_ENTRIES.map(e => `${e.file},${e.rank}`)
    const uniqueKeys = new Set(keys)
    expect(uniqueKeys.size).toBe(keys.length)
  })

  it('all starting squares are within main board bounds (files 0–10, ranks 0–9)', () => {
    for (const entry of STARTING_ENTRIES) {
      expect(entry.file).toBeGreaterThanOrEqual(0)
      expect(entry.file).toBeLessThanOrEqual(10)
      expect(entry.rank).toBeGreaterThanOrEqual(0)
      expect(entry.rank).toBeLessThanOrEqual(9)
    }
  })

  it('ranks 3–6 are completely empty at game start', () => {
    const middleRanks = STARTING_ENTRIES.filter(e => e.rank >= 3 && e.rank <= 6)
    expect(middleRanks.length).toBe(0)
  })
})

describe('Constants: Pawn of Kings Start Squares', () => {
  it('white Pawn of Kings start matches the constant', () => {
    expect(WHITE_PAWN_OF_KINGS_START).toEqual({ file: 5, rank: 2 })
  })

  it('black Pawn of Kings start matches the constant', () => {
    expect(BLACK_PAWN_OF_KINGS_START).toEqual({ file: 5, rank: 7 })
  })
})

describe('Constants: Piece Values', () => {
  it('every PieceType has a defined value', () => {
    const allTypes = Object.values(PieceType)
    for (const type of allTypes) {
      expect(PIECE_VALUES[type]).toBeDefined()
    }
  })

  it('King value is Infinity', () => {
    expect(PIECE_VALUES[PieceType.KING]).toBe(Infinity)
  })

  it('Prince and Adventitious King are equal value (900)', () => {
    expect(PIECE_VALUES[PieceType.PRINCE]).toBe(900)
    expect(PIECE_VALUES[PieceType.ADVENTITIOUS_KING]).toBe(900)
  })

  it('Rook (500) is more valuable than Knight (275)', () => {
    expect(PIECE_VALUES[PieceType.ROOK]).toBeGreaterThan(PIECE_VALUES[PieceType.KNIGHT])
  })

  it('Pawn of Pawns (400) is more valuable than any normal pawn', () => {
    const normalPawnTypes = [
      PieceType.PAWN_OF_KINGS,
      PieceType.PAWN_OF_ROOKS,
      PieceType.PAWN_OF_KNIGHTS,
      PieceType.PAWN_OF_GENERALS,
      PieceType.PAWN_OF_VIZIERS,
    ]
    const popValue = PIECE_VALUES[PieceType.PAWN_OF_PAWNS]
    for (const type of normalPawnTypes) {
      expect(popValue).toBeGreaterThan(PIECE_VALUES[type])
    }
  })
})
