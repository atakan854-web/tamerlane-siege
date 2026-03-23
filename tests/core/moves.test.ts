import { describe, it, expect } from 'vitest'
import {
  generateKingMoves,
  generateGeneralMoves,
  generateVizierMoves,
  generateRookMoves,
  generateKnightMoves,
  generatePicketMoves,
  generateGiraffeMoves,
  generateElephantMoves,
  generateCamelMoves,
  generateWarEngineMoves,
  generateMovesForPiece,
  getPieceAt,
  isSquareOccupiedByFriendly,
  isSquareOccupiedByEnemy,
  generateSlidingMoves,
  squareToKey,
} from '../../src/core/moves'
import { PieceType, MoveFlag, PawnOfPawnsStage, type GameState, type Piece, type Square } from '../../src/core/types'
import { WHITE_CITADEL, BLACK_CITADEL } from '../../src/core/constants'

// =============================================================================
// Test Helpers
// =============================================================================

/** Build a minimal GameState with only the specified pieces. */
function buildState(entries: Array<{ sq: Square; piece: Piece }>): GameState {
  const pieces = new Map<string, Piece>()
  for (const { sq, piece } of entries) {
    pieces.set(squareToKey(sq), piece)
  }
  return {
    pieces,
    turn: 'w',
    moveNumber: 1,
    halfMoveCount: 0,
    whiteKingSwapUsed: false,
    blackKingSwapUsed: false,
    whitePawnOfPawnsStage: PawnOfPawnsStage.UNPROMOTED,
    blackPawnOfPawnsStage: PawnOfPawnsStage.UNPROMOTED,
    whiteRoyals: [],
    blackRoyals: [],
    whiteCitadelOccupant: null,
    blackCitadelOccupant: null,
    result: null,
    history: [],
  }
}

/** Shorthand square constructor. */
function sq(file: number, rank: number): Square {
  return { file, rank }
}

/** White piece constructor. */
function wp(type: PieceType): Piece {
  return { type, color: 'w' }
}

/** Black piece constructor. */
function bp(type: PieceType): Piece {
  return { type, color: 'b' }
}

/** Count moves going to a specific square. */
function movesTo(moves: ReturnType<typeof generateKingMoves>, target: Square): number {
  return moves.filter(m => m.to.file === target.file && m.to.rank === target.rank).length
}

// =============================================================================
// Helper Functions
// =============================================================================

describe('Helpers: getPieceAt', () => {
  it('returns the piece at an occupied square', () => {
    const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.ROOK) }])
    expect(getPieceAt(sq(5, 5), state)?.type).toBe(PieceType.ROOK)
  })

  it('returns null for an empty square', () => {
    const state = buildState([])
    expect(getPieceAt(sq(5, 5), state)).toBeNull()
  })
})

describe('Helpers: isSquareOccupiedByFriendly / isSquareOccupiedByEnemy', () => {
  it('friendly returns true for same color', () => {
    const state = buildState([{ sq: sq(3, 3), piece: wp(PieceType.ROOK) }])
    expect(isSquareOccupiedByFriendly(sq(3, 3), 'w', state)).toBe(true)
  })

  it('friendly returns false for enemy color', () => {
    const state = buildState([{ sq: sq(3, 3), piece: bp(PieceType.ROOK) }])
    expect(isSquareOccupiedByFriendly(sq(3, 3), 'w', state)).toBe(false)
  })

  it('enemy returns true for opposite color', () => {
    const state = buildState([{ sq: sq(3, 3), piece: bp(PieceType.ROOK) }])
    expect(isSquareOccupiedByEnemy(sq(3, 3), 'w', state)).toBe(true)
  })

  it('enemy returns false for empty square', () => {
    const state = buildState([])
    expect(isSquareOccupiedByEnemy(sq(3, 3), 'w', state)).toBe(false)
  })
})

describe('Helpers: generateSlidingMoves', () => {
  it('slides along all 4 orthogonal directions from center', () => {
    const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.ROOK) }])
    const moves = generateSlidingMoves(sq(5, 5), wp(PieceType.ROOK), state, [
      [-1, 0], [1, 0], [0, -1], [0, 1],
    ])
    // Left 5, Right 5, Down 5, Up 4 = 19
    expect(moves.length).toBe(19)
  })

  it('stops before friendly and does not include that square', () => {
    const state = buildState([
      { sq: sq(5, 5), piece: wp(PieceType.ROOK) },
      { sq: sq(8, 5), piece: wp(PieceType.KNIGHT) }, // friendly blocks right ray at file 8
    ])
    const moves = generateSlidingMoves(sq(5, 5), wp(PieceType.ROOK), state, [[1, 0]])
    // Right ray: (6,5),(7,5) — stops at (8,5) friendly, doesn't include it
    expect(moves.length).toBe(2)
    expect(movesTo(moves, sq(8, 5))).toBe(0)
  })

  it('captures enemy and stops, does not continue beyond', () => {
    const state = buildState([
      { sq: sq(5, 5), piece: wp(PieceType.ROOK) },
      { sq: sq(7, 5), piece: bp(PieceType.KNIGHT) }, // enemy at file 7
      { sq: sq(9, 5), piece: bp(PieceType.ROOK) },   // enemy further — should not be reached
    ])
    const moves = generateSlidingMoves(sq(5, 5), wp(PieceType.ROOK), state, [[1, 0]])
    // Right ray: (6,5) normal, (7,5) capture, stop
    expect(moves.length).toBe(2)
    const captureMove = moves.find(m => m.to.file === 7 && m.to.rank === 5)
    expect(captureMove?.flag).toBe(MoveFlag.CAPTURE)
    expect(captureMove?.captured?.type).toBe(PieceType.KNIGHT)
    expect(movesTo(moves, sq(9, 5))).toBe(0)
  })
})

// =============================================================================
// Piece: King
// =============================================================================

describe('Piece: King', () => {
  describe('movement', () => {
    it('moves 1 square in all 8 directions from center (5,5)', () => {
      const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.KING) }])
      const moves = generateKingMoves(sq(5, 5), wp(PieceType.KING), state)
      expect(moves.length).toBe(8)
      // All 8 neighbors should be in the list
      const targets = moves.map(m => `${m.to.file},${m.to.rank}`)
      expect(targets).toContain('4,4')
      expect(targets).toContain('5,4')
      expect(targets).toContain('6,4')
      expect(targets).toContain('4,5')
      expect(targets).toContain('6,5')
      expect(targets).toContain('4,6')
      expect(targets).toContain('5,6')
      expect(targets).toContain('6,6')
    })

    it('only 3 moves from corner (0,0)', () => {
      const state = buildState([{ sq: sq(0, 0), piece: wp(PieceType.KING) }])
      const moves = generateKingMoves(sq(0, 0), wp(PieceType.KING), state)
      expect(moves.length).toBe(3)
      const targets = moves.map(m => `${m.to.file},${m.to.rank}`)
      expect(targets).toContain('0,1')
      expect(targets).toContain('1,0')
      expect(targets).toContain('1,1')
    })

    it('is blocked by friendly pieces', () => {
      // White King at (5,5), white rooks at all 8 neighbors
      const neighbors: Array<{ sq: Square; piece: Piece }> = [
        { sq: sq(4, 4), piece: wp(PieceType.ROOK) },
        { sq: sq(5, 4), piece: wp(PieceType.ROOK) },
        { sq: sq(6, 4), piece: wp(PieceType.ROOK) },
        { sq: sq(4, 5), piece: wp(PieceType.ROOK) },
        { sq: sq(6, 5), piece: wp(PieceType.ROOK) },
        { sq: sq(4, 6), piece: wp(PieceType.ROOK) },
        { sq: sq(5, 6), piece: wp(PieceType.ROOK) },
        { sq: sq(6, 6), piece: wp(PieceType.ROOK) },
      ]
      const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.KING) }, ...neighbors])
      const moves = generateKingMoves(sq(5, 5), wp(PieceType.KING), state)
      expect(moves.length).toBe(0)
    })

    it('captures an enemy piece', () => {
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.KING) },
        { sq: sq(6, 5), piece: bp(PieceType.ROOK) },
      ])
      const moves = generateKingMoves(sq(5, 5), wp(PieceType.KING), state)
      const captureMove = moves.find(m => m.to.file === 6 && m.to.rank === 5)
      expect(captureMove).toBeDefined()
      expect(captureMove?.flag).toBe(MoveFlag.CAPTURE)
      expect(captureMove?.captured?.type).toBe(PieceType.ROOK)
    })

    it('only 5 moves from (0,5) — edge of board', () => {
      const state = buildState([{ sq: sq(0, 5), piece: wp(PieceType.KING) }])
      const moves = generateKingMoves(sq(0, 5), wp(PieceType.KING), state)
      // Adjacents: (1,4),(1,5),(1,6),(0,4),(0,6) = 5 (file -1 is out of bounds)
      expect(moves.length).toBe(5)
    })
  })

  describe('citadel entry', () => {
    it('White King adjacent to BLACK_CITADEL generates CITADEL_ENTRY move', () => {
      // White King at (0,8) — adjacent to BLACK_CITADEL (-1,8)
      const state = buildState([{ sq: sq(0, 8), piece: wp(PieceType.KING) }])
      const moves = generateKingMoves(sq(0, 8), wp(PieceType.KING), state)
      const citadelMove = moves.find(
        m => m.to.file === BLACK_CITADEL.file && m.to.rank === BLACK_CITADEL.rank,
      )
      expect(citadelMove).toBeDefined()
      expect(citadelMove?.flag).toBe(MoveFlag.CITADEL_ENTRY)
    })

    it('Black King adjacent to WHITE_CITADEL generates CITADEL_ENTRY move', () => {
      // Black King at (10,1) — adjacent to WHITE_CITADEL (11,1)
      const state = buildState([{ sq: sq(10, 1), piece: bp(PieceType.KING) }])
      const moves = generateKingMoves(sq(10, 1), bp(PieceType.KING), state)
      const citadelMove = moves.find(
        m => m.to.file === WHITE_CITADEL.file && m.to.rank === WHITE_CITADEL.rank,
      )
      expect(citadelMove).toBeDefined()
      expect(citadelMove?.flag).toBe(MoveFlag.CITADEL_ENTRY)
    })

    it('White King adjacent to WHITE_CITADEL (own citadel) does NOT generate citadel move', () => {
      // White King at (10,1) — adjacent to WHITE_CITADEL (11,1), which is own citadel
      const state = buildState([{ sq: sq(10, 1), piece: wp(PieceType.KING) }])
      const moves = generateKingMoves(sq(10, 1), wp(PieceType.KING), state)
      const citadelMove = moves.find(
        m => m.to.file === WHITE_CITADEL.file && m.to.rank === WHITE_CITADEL.rank,
      )
      expect(citadelMove).toBeUndefined()
    })

    it('CITADEL_ENTRY is blocked if opponent citadel is occupied', () => {
      // White King at (0,8), opponent's Adventitious King in BLACK_CITADEL
      const state = buildState([
        { sq: sq(0, 8), piece: wp(PieceType.KING) },
        { sq: BLACK_CITADEL, piece: bp(PieceType.ADVENTITIOUS_KING) },
      ])
      const moves = generateKingMoves(sq(0, 8), wp(PieceType.KING), state)
      const citadelMove = moves.find(
        m => m.to.file === BLACK_CITADEL.file && m.to.rank === BLACK_CITADEL.rank,
      )
      expect(citadelMove).toBeUndefined()
    })
  })
})

// =============================================================================
// Piece: General (Ferz — 1 square diagonal)
// =============================================================================

describe('Piece: General', () => {
  describe('movement', () => {
    it('moves 1 square in all 4 diagonal directions from center (5,5)', () => {
      const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.GENERAL) }])
      const moves = generateGeneralMoves(sq(5, 5), wp(PieceType.GENERAL), state)
      expect(moves.length).toBe(4)
      const targets = moves.map(m => `${m.to.file},${m.to.rank}`)
      expect(targets).toContain('4,4')
      expect(targets).toContain('6,4')
      expect(targets).toContain('4,6')
      expect(targets).toContain('6,6')
    })

    it('only 1 move from corner (0,0) — only (1,1) is valid diagonal', () => {
      const state = buildState([{ sq: sq(0, 0), piece: wp(PieceType.GENERAL) }])
      const moves = generateGeneralMoves(sq(0, 0), wp(PieceType.GENERAL), state)
      expect(moves.length).toBe(1)
      expect(moves[0]?.to).toEqual(sq(1, 1))
    })

    it('only 2 moves from left edge (0,5)', () => {
      const state = buildState([{ sq: sq(0, 5), piece: wp(PieceType.GENERAL) }])
      const moves = generateGeneralMoves(sq(0, 5), wp(PieceType.GENERAL), state)
      // Diagonals: (-1,4)→off, (-1,6)→off, (1,4)→ok, (1,6)→ok
      expect(moves.length).toBe(2)
      const targets = moves.map(m => `${m.to.file},${m.to.rank}`)
      expect(targets).toContain('1,4')
      expect(targets).toContain('1,6')
    })

    it('is blocked by a friendly piece on a diagonal', () => {
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.GENERAL) },
        { sq: sq(6, 6), piece: wp(PieceType.ROOK) }, // friendly blocks (6,6)
      ])
      const moves = generateGeneralMoves(sq(5, 5), wp(PieceType.GENERAL), state)
      expect(moves.length).toBe(3)
      expect(movesTo(moves, sq(6, 6))).toBe(0)
    })

    it('captures an enemy piece on a diagonal', () => {
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.GENERAL) },
        { sq: sq(4, 4), piece: bp(PieceType.KNIGHT) },
      ])
      const moves = generateGeneralMoves(sq(5, 5), wp(PieceType.GENERAL), state)
      const captureMove = moves.find(m => m.to.file === 4 && m.to.rank === 4)
      expect(captureMove).toBeDefined()
      expect(captureMove?.flag).toBe(MoveFlag.CAPTURE)
      expect(captureMove?.captured?.type).toBe(PieceType.KNIGHT)
    })

    it('does not generate citadel moves (General is not royal)', () => {
      // General at (10,1) — adjacent to WHITE_CITADEL (11,1)
      const state = buildState([{ sq: sq(10, 1), piece: wp(PieceType.GENERAL) }])
      const moves = generateGeneralMoves(sq(10, 1), wp(PieceType.GENERAL), state)
      const citadelMove = moves.find(m => m.to.file === 11)
      expect(citadelMove).toBeUndefined()
    })
  })
})

// =============================================================================
// Piece: Vizier (Wazir — 1 square orthogonal)
// =============================================================================

describe('Piece: Vizier', () => {
  describe('movement', () => {
    it('moves 1 square in all 4 orthogonal directions from center (5,5)', () => {
      const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.VIZIER) }])
      const moves = generateVizierMoves(sq(5, 5), wp(PieceType.VIZIER), state)
      expect(moves.length).toBe(4)
      const targets = moves.map(m => `${m.to.file},${m.to.rank}`)
      expect(targets).toContain('4,5')
      expect(targets).toContain('6,5')
      expect(targets).toContain('5,4')
      expect(targets).toContain('5,6')
    })

    it('only 2 moves from corner (0,0)', () => {
      const state = buildState([{ sq: sq(0, 0), piece: wp(PieceType.VIZIER) }])
      const moves = generateVizierMoves(sq(0, 0), wp(PieceType.VIZIER), state)
      expect(moves.length).toBe(2)
      const targets = moves.map(m => `${m.to.file},${m.to.rank}`)
      expect(targets).toContain('1,0')
      expect(targets).toContain('0,1')
    })

    it('3 moves from left edge (0,5)', () => {
      const state = buildState([{ sq: sq(0, 5), piece: wp(PieceType.VIZIER) }])
      const moves = generateVizierMoves(sq(0, 5), wp(PieceType.VIZIER), state)
      // Orthogonals: (-1,5)→off, (1,5)→ok, (0,4)→ok, (0,6)→ok
      expect(moves.length).toBe(3)
    })

    it('is blocked by friendly pieces', () => {
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.VIZIER) },
        { sq: sq(5, 6), piece: wp(PieceType.ROOK) },
        { sq: sq(5, 4), piece: wp(PieceType.ROOK) },
      ])
      const moves = generateVizierMoves(sq(5, 5), wp(PieceType.VIZIER), state)
      expect(moves.length).toBe(2) // only (4,5) and (6,5)
    })

    it('captures an enemy piece orthogonally', () => {
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.VIZIER) },
        { sq: sq(5, 6), piece: bp(PieceType.CAMEL) },
      ])
      const moves = generateVizierMoves(sq(5, 5), wp(PieceType.VIZIER), state)
      const captureMove = moves.find(m => m.to.file === 5 && m.to.rank === 6)
      expect(captureMove?.flag).toBe(MoveFlag.CAPTURE)
      expect(captureMove?.captured?.type).toBe(PieceType.CAMEL)
    })

    it('does not slide — strictly 1 square only', () => {
      // Even with all squares empty, Vizier can only move 1 step
      const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.VIZIER) }])
      const moves = generateVizierMoves(sq(5, 5), wp(PieceType.VIZIER), state)
      for (const m of moves) {
        const fileDelta = Math.abs(m.to.file - 5)
        const rankDelta = Math.abs(m.to.rank - 5)
        expect(fileDelta + rankDelta).toBe(1) // exactly 1 orthogonal step
      }
    })
  })
})

// =============================================================================
// Piece: Rook (orthogonal slider)
// =============================================================================

describe('Piece: Rook', () => {
  describe('movement', () => {
    it('slides in all 4 orthogonal directions from center (5,5) — 19 moves', () => {
      const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.ROOK) }])
      const moves = generateRookMoves(sq(5, 5), wp(PieceType.ROOK), state)
      // Left: 5, Right: 5, Down: 5, Up: 4 = 19
      expect(moves.length).toBe(19)
    })

    it('from corner (0,0) — slides right 10, up 9 = 19 moves', () => {
      const state = buildState([{ sq: sq(0, 0), piece: wp(PieceType.ROOK) }])
      const moves = generateRookMoves(sq(0, 0), wp(PieceType.ROOK), state)
      expect(moves.length).toBe(19)
    })

    it('is blocked by friendly — does not include friendly square or beyond', () => {
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.ROOK) },
        { sq: sq(8, 5), piece: wp(PieceType.KNIGHT) }, // friendly blocks right ray
      ])
      const moves = generateRookMoves(sq(5, 5), wp(PieceType.ROOK), state)
      // Right ray: (6,5),(7,5) only — 2 squares; 3 directions unaffected
      const rightMoves = moves.filter(m => m.to.rank === 5 && m.to.file > 5)
      expect(rightMoves.length).toBe(2)
      expect(movesTo(moves, sq(8, 5))).toBe(0)
      expect(movesTo(moves, sq(9, 5))).toBe(0)
    })

    it('captures enemy and stops — squares beyond enemy not reachable', () => {
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.ROOK) },
        { sq: sq(7, 5), piece: bp(PieceType.GENERAL) }, // enemy at (7,5)
        { sq: sq(9, 5), piece: bp(PieceType.ROOK) },    // further enemy — unreachable
      ])
      const moves = generateRookMoves(sq(5, 5), wp(PieceType.ROOK), state)
      const captureMove = moves.find(m => m.to.file === 7 && m.to.rank === 5)
      expect(captureMove?.flag).toBe(MoveFlag.CAPTURE)
      expect(captureMove?.captured?.type).toBe(PieceType.GENERAL)
      expect(movesTo(moves, sq(8, 5))).toBe(0)
      expect(movesTo(moves, sq(9, 5))).toBe(0)
    })

    it('handles multiple pieces along a single ray correctly', () => {
      // Rook at (0,5): enemy at (3,5), friendly at (7,5)
      // Right ray: (1,5),(2,5) normal; (3,5) capture; stop. (7,5) never reached.
      const state = buildState([
        { sq: sq(0, 5), piece: wp(PieceType.ROOK) },
        { sq: sq(3, 5), piece: bp(PieceType.ELEPHANT) },
        { sq: sq(7, 5), piece: wp(PieceType.KNIGHT) },
      ])
      const moves = generateRookMoves(sq(0, 5), wp(PieceType.ROOK), state)
      const rightMoves = moves.filter(m => m.to.rank === 5 && m.to.file > 0)
      // (1,5),(2,5),(3,5)=capture → 3 right moves
      expect(rightMoves.length).toBe(3)
      expect(rightMoves[2]?.flag).toBe(MoveFlag.CAPTURE)
    })

    it('all moves are on the main board (no citadel squares)', () => {
      // Rook at (10,1) — adjacent to white citadel
      const state = buildState([{ sq: sq(10, 1), piece: wp(PieceType.ROOK) }])
      const moves = generateRookMoves(sq(10, 1), wp(PieceType.ROOK), state)
      for (const m of moves) {
        expect(m.to.file).toBeGreaterThanOrEqual(0)
        expect(m.to.file).toBeLessThanOrEqual(10)
        expect(m.to.rank).toBeGreaterThanOrEqual(0)
        expect(m.to.rank).toBeLessThanOrEqual(9)
      }
    })

    it('every Rook move is purely horizontal or vertical (never diagonal)', () => {
      const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.ROOK) }])
      const moves = generateRookMoves(sq(5, 5), wp(PieceType.ROOK), state)
      for (const m of moves) {
        const samefile = m.to.file === 5
        const sameRank = m.to.rank === 5
        expect(samefile || sameRank).toBe(true)
        expect(samefile && sameRank).toBe(false) // can't stay still
      }
    })
  })
})

// =============================================================================
// Piece: Knight (1,2) leaper
// =============================================================================

describe('Piece: Knight', () => {
  describe('movement', () => {
    it('generates all 8 L-shape moves from center (5,5)', () => {
      const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.KNIGHT) }])
      const moves = generateKnightMoves(sq(5, 5), wp(PieceType.KNIGHT), state)
      expect(moves.length).toBe(8)
      const targets = moves.map(m => `${m.to.file},${m.to.rank}`)
      expect(targets).toContain('3,4') // (-2,-1)
      expect(targets).toContain('3,6') // (-2,+1)
      expect(targets).toContain('4,3') // (-1,-2)
      expect(targets).toContain('4,7') // (-1,+2)
      expect(targets).toContain('6,3') // (+1,-2)
      expect(targets).toContain('6,7') // (+1,+2)
      expect(targets).toContain('7,4') // (+2,-1)
      expect(targets).toContain('7,6') // (+2,+1)
    })

    it('only 2 moves from corner (0,0)', () => {
      const state = buildState([{ sq: sq(0, 0), piece: wp(PieceType.KNIGHT) }])
      const moves = generateKnightMoves(sq(0, 0), wp(PieceType.KNIGHT), state)
      expect(moves.length).toBe(2)
      const targets = moves.map(m => `${m.to.file},${m.to.rank}`)
      expect(targets).toContain('1,2')
      expect(targets).toContain('2,1')
    })

    it('leaps over intervening pieces — path is irrelevant', () => {
      // Knight at (5,5), piece between it and destination at (7,4)
      // Place pieces at every square between (5,5) and (7,4) to verify leap
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.KNIGHT) },
        { sq: sq(6, 5), piece: bp(PieceType.ROOK) },  // on the "path"
        { sq: sq(6, 4), piece: bp(PieceType.ROOK) },  // on the "path"
      ])
      const moves = generateKnightMoves(sq(5, 5), wp(PieceType.KNIGHT), state)
      // (7,4) should still be reachable
      expect(movesTo(moves, sq(7, 4))).toBe(1)
    })

    it('is blocked by a friendly piece at destination', () => {
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.KNIGHT) },
        { sq: sq(7, 6), piece: wp(PieceType.ROOK) }, // friendly at one destination
      ])
      const moves = generateKnightMoves(sq(5, 5), wp(PieceType.KNIGHT), state)
      expect(moves.length).toBe(7) // one destination blocked
      expect(movesTo(moves, sq(7, 6))).toBe(0)
    })

    it('captures an enemy piece at destination', () => {
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.KNIGHT) },
        { sq: sq(3, 4), piece: bp(PieceType.GENERAL) },
      ])
      const moves = generateKnightMoves(sq(5, 5), wp(PieceType.KNIGHT), state)
      const captureMove = moves.find(m => m.to.file === 3 && m.to.rank === 4)
      expect(captureMove?.flag).toBe(MoveFlag.CAPTURE)
      expect(captureMove?.captured?.type).toBe(PieceType.GENERAL)
    })

    it('never generates citadel destinations', () => {
      // Knight at (9,1) — closest to WHITE_CITADEL (11,1)
      // (9+2, 1+0) = (11,1) is not a valid Knight jump (needs L-shape)
      // But near citadel adjacency, verify no citadel squares appear
      const state = buildState([{ sq: sq(9, 1), piece: wp(PieceType.KNIGHT) }])
      const moves = generateKnightMoves(sq(9, 1), wp(PieceType.KNIGHT), state)
      for (const m of moves) {
        expect(m.to.file).toBeGreaterThanOrEqual(0)
        expect(m.to.file).toBeLessThanOrEqual(10)
      }
    })
  })
})

// =============================================================================
// Dispatcher: generateMovesForPiece
// =============================================================================

describe('generateMovesForPiece dispatcher', () => {
  it('routes KING to generateKingMoves', () => {
    const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.KING) }])
    const dispatched = generateMovesForPiece(sq(5, 5), wp(PieceType.KING), state)
    const direct = generateKingMoves(sq(5, 5), wp(PieceType.KING), state)
    expect(dispatched.length).toBe(direct.length)
  })

  it('routes GENERAL to generateGeneralMoves', () => {
    const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.GENERAL) }])
    const dispatched = generateMovesForPiece(sq(5, 5), wp(PieceType.GENERAL), state)
    const direct = generateGeneralMoves(sq(5, 5), wp(PieceType.GENERAL), state)
    expect(dispatched.length).toBe(direct.length)
    expect(dispatched.length).toBe(4)
  })

  it('routes VIZIER to generateVizierMoves', () => {
    const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.VIZIER) }])
    const dispatched = generateMovesForPiece(sq(5, 5), wp(PieceType.VIZIER), state)
    const direct = generateVizierMoves(sq(5, 5), wp(PieceType.VIZIER), state)
    expect(dispatched.length).toBe(direct.length)
    expect(dispatched.length).toBe(4)
  })

  it('routes ROOK to generateRookMoves', () => {
    const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.ROOK) }])
    const dispatched = generateMovesForPiece(sq(5, 5), wp(PieceType.ROOK), state)
    const direct = generateRookMoves(sq(5, 5), wp(PieceType.ROOK), state)
    expect(dispatched.length).toBe(direct.length)
    expect(dispatched.length).toBe(19)
  })

  it('routes KNIGHT to generateKnightMoves', () => {
    const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.KNIGHT) }])
    const dispatched = generateMovesForPiece(sq(5, 5), wp(PieceType.KNIGHT), state)
    const direct = generateKnightMoves(sq(5, 5), wp(PieceType.KNIGHT), state)
    expect(dispatched.length).toBe(direct.length)
    expect(dispatched.length).toBe(8)
  })

  it('routes PICKET to generatePicketMoves', () => {
    const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.PICKET) }])
    const dispatched = generateMovesForPiece(sq(5, 5), wp(PieceType.PICKET), state)
    const direct = generatePicketMoves(sq(5, 5), wp(PieceType.PICKET), state)
    expect(dispatched.length).toBe(direct.length)
    expect(dispatched.length).toBe(14)
  })

  it('routes GIRAFFE to generateGiraffeMoves', () => {
    const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.GIRAFFE) }])
    const dispatched = generateMovesForPiece(sq(5, 5), wp(PieceType.GIRAFFE), state)
    const direct = generateGiraffeMoves(sq(5, 5), wp(PieceType.GIRAFFE), state)
    expect(dispatched.length).toBe(direct.length)
  })

  it('routes ELEPHANT to generateElephantMoves', () => {
    const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.ELEPHANT) }])
    const dispatched = generateMovesForPiece(sq(5, 5), wp(PieceType.ELEPHANT), state)
    expect(dispatched.length).toBe(4)
  })

  it('routes CAMEL to generateCamelMoves', () => {
    const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.CAMEL) }])
    const dispatched = generateMovesForPiece(sq(5, 5), wp(PieceType.CAMEL), state)
    expect(dispatched.length).toBe(8)
  })

  it('routes WAR_ENGINE to generateWarEngineMoves', () => {
    const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.WAR_ENGINE) }])
    const dispatched = generateMovesForPiece(sq(5, 5), wp(PieceType.WAR_ENGINE), state)
    expect(dispatched.length).toBe(4)
  })

  it('routes any pawn type to generatePawnMoves', () => {
    const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.PAWN_OF_KINGS) }])
    const dispatched = generateMovesForPiece(sq(5, 5), wp(PieceType.PAWN_OF_KINGS), state)
    expect(dispatched.length).toBe(1) // only forward move from center
  })

  it('PRINCE is implemented — does not throw and returns moves', () => {
    const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.PRINCE) }])
    expect(() => generateMovesForPiece(sq(5, 5), wp(PieceType.PRINCE), state)).not.toThrow()
    expect(generateMovesForPiece(sq(5, 5), wp(PieceType.PRINCE), state).length).toBeGreaterThan(0)
  })
})

// =============================================================================
// Piece: Picket (Tali'a — diagonal slider, minimum 2 squares)
// =============================================================================

describe('Piece: Picket', () => {
  describe('movement', () => {
    it('from center (5,5) on empty board — 14 moves (min distance 2)', () => {
      // (+1,+1): (7,7),(8,8),(9,9) = 3; (-1,+1): (3,7),(2,8),(1,9) = 3
      // (+1,-1): (7,3),(8,2),(9,1),(10,0) = 4; (-1,-1): (3,3),(2,2),(1,1),(0,0) = 4
      const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.PICKET) }])
      const moves = generatePicketMoves(sq(5, 5), wp(PieceType.PICKET), state)
      expect(moves.length).toBe(14)
    })

    it('cannot land at distance 1 — distance-1 square is never a destination', () => {
      const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.PICKET) }])
      const moves = generatePicketMoves(sq(5, 5), wp(PieceType.PICKET), state)
      // None of the 4 diagonal-1 squares should appear as destinations
      for (const [df, dr] of [[-1,-1],[-1,1],[1,-1],[1,1]] as const) {
        expect(movesTo(moves, sq(5 + df, 5 + dr))).toBe(0)
      }
    })

    it('friendly at distance-1 blocks entire diagonal (not just distance 1)', () => {
      // Friendly at (6,6) — diagonal (+1,+1) from (5,5) fully blocked
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.PICKET) },
        { sq: sq(6, 6), piece: wp(PieceType.ROOK) },
      ])
      const moves = generatePicketMoves(sq(5, 5), wp(PieceType.PICKET), state)
      // Diagonal (+1,+1) blocked: no (7,7),(8,8),(9,9) → 14 - 3 = 11
      expect(moves.length).toBe(11)
      expect(movesTo(moves, sq(7, 7))).toBe(0)
      expect(movesTo(moves, sq(8, 8))).toBe(0)
    })

    it('enemy at distance-1 also blocks entire diagonal (cannot leap)', () => {
      // Enemy at (4,4) — diagonal (-1,-1) from (5,5) fully blocked
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.PICKET) },
        { sq: sq(4, 4), piece: bp(PieceType.ROOK) },
      ])
      const moves = generatePicketMoves(sq(5, 5), wp(PieceType.PICKET), state)
      // Diagonal (-1,-1) blocked: no (3,3),(2,2),(1,1),(0,0) → 14 - 4 = 10
      expect(moves.length).toBe(10)
      expect(movesTo(moves, sq(3, 3))).toBe(0)
    })

    it('captures enemy at distance 3+, stops after capture', () => {
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.PICKET) },
        { sq: sq(8, 8), piece: bp(PieceType.ROOK) }, // enemy at distance 3 on (+1,+1)
      ])
      const moves = generatePicketMoves(sq(5, 5), wp(PieceType.PICKET), state)
      const captureMove = moves.find(m => m.to.file === 8 && m.to.rank === 8)
      expect(captureMove?.flag).toBe(MoveFlag.CAPTURE)
      expect(captureMove?.captured?.type).toBe(PieceType.ROOK)
      // (9,9) beyond the capture is not reachable
      expect(movesTo(moves, sq(9, 9))).toBe(0)
    })

    it('friendly at distance 2 stops the slide (without capturing)', () => {
      // Friendly at (7,7) distance-2 on (+1,+1) — stops slide, not added
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.PICKET) },
        { sq: sq(7, 7), piece: wp(PieceType.ROOK) },
      ])
      const moves = generatePicketMoves(sq(5, 5), wp(PieceType.PICKET), state)
      expect(movesTo(moves, sq(7, 7))).toBe(0) // friendly not included
      expect(movesTo(moves, sq(8, 8))).toBe(0) // beyond is blocked
    })
  })
})

// =============================================================================
// Piece: Giraffe (Zurafa — 1 diagonal + 3+ orthogonal, not a leap)
// =============================================================================

describe('Piece: Giraffe', () => {
  describe('movement', () => {
    it('from center (5,5) on empty board — 14 moves', () => {
      // Each diagonal: 2 sub-rays; constrained by board edges
      const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.GIRAFFE) }])
      const moves = generateGiraffeMoves(sq(5, 5), wp(PieceType.GIRAFFE), state)
      expect(moves.length).toBe(14)
    })

    it('intermediate diagonal square blocked by friendly — entire direction skipped', () => {
      // Friendly at (6,6) blocks diagonal (+1,+1): 3 squares lost → 14-3 = 11
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.GIRAFFE) },
        { sq: sq(6, 6), piece: wp(PieceType.ROOK) },
      ])
      const moves = generateGiraffeMoves(sq(5, 5), wp(PieceType.GIRAFFE), state)
      expect(moves.length).toBe(11)
    })

    it('intermediate diagonal square blocked by enemy — Giraffe cannot leap, direction skipped', () => {
      // Enemy at (4,4) blocks diagonal (-1,-1): 4 squares lost → 14-4 = 10
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.GIRAFFE) },
        { sq: sq(4, 4), piece: bp(PieceType.KNIGHT) },
      ])
      const moves = generateGiraffeMoves(sq(5, 5), wp(PieceType.GIRAFFE), state)
      expect(moves.length).toBe(10)
    })

    it('transit square on ortho continuation blocked — ray cut short', () => {
      // Sub-ray B of diagonal (1,-1): transit at (7,4) blocks (9,4) and (10,4)
      // → lose 2 squares from that sub-ray; 14-2 = 12
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.GIRAFFE) },
        { sq: sq(7, 4), piece: bp(PieceType.ROOK) }, // k=1 transit of sub-ray B, diagonal (1,-1)
      ])
      const moves = generateGiraffeMoves(sq(5, 5), wp(PieceType.GIRAFFE), state)
      expect(moves.length).toBe(12)
      expect(movesTo(moves, sq(9, 4))).toBe(0)
      expect(movesTo(moves, sq(10, 4))).toBe(0)
    })

    it('captures enemy at a landing square and stops the ray', () => {
      // Sub-ray B of diagonal (1,1) from (5,5): (9,6) is first landing
      // Place enemy at (9,6) — captured, (10,6) not reachable
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.GIRAFFE) },
        { sq: sq(9, 6), piece: bp(PieceType.VIZIER) },
      ])
      const moves = generateGiraffeMoves(sq(5, 5), wp(PieceType.GIRAFFE), state)
      const captureMove = moves.find(m => m.to.file === 9 && m.to.rank === 6)
      expect(captureMove?.flag).toBe(MoveFlag.CAPTURE)
      expect(captureMove?.captured?.type).toBe(PieceType.VIZIER)
      expect(movesTo(moves, sq(10, 6))).toBe(0)
    })

    it('minimum total distance is 4 — squares 1, 2, 3 steps away are never destinations', () => {
      const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.GIRAFFE) }])
      const moves = generateGiraffeMoves(sq(5, 5), wp(PieceType.GIRAFFE), state)
      // Check no destination is closer than 4 Chebyshev distance from (5,5)
      for (const m of moves) {
        const dist = Math.max(Math.abs(m.to.file - 5), Math.abs(m.to.rank - 5))
        expect(dist).toBeGreaterThanOrEqual(4)
      }
    })
  })
})

// =============================================================================
// Piece: Elephant (Pil — exactly 2 diagonal, leaps)
// =============================================================================

describe('Piece: Elephant', () => {
  describe('movement', () => {
    it('from center (5,5) — exactly 4 destinations: (3,3),(7,3),(3,7),(7,7)', () => {
      const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.ELEPHANT) }])
      const moves = generateElephantMoves(sq(5, 5), wp(PieceType.ELEPHANT), state)
      expect(moves.length).toBe(4)
      const targets = moves.map(m => `${m.to.file},${m.to.rank}`)
      expect(targets).toContain('3,3')
      expect(targets).toContain('7,3')
      expect(targets).toContain('3,7')
      expect(targets).toContain('7,7')
    })

    it('leaps over the intervening diagonal square', () => {
      // Elephant at (5,5), piece at (6,6) (intermediate) — (7,7) still reachable
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.ELEPHANT) },
        { sq: sq(6, 6), piece: bp(PieceType.ROOK) },
      ])
      const moves = generateElephantMoves(sq(5, 5), wp(PieceType.ELEPHANT), state)
      expect(movesTo(moves, sq(7, 7))).toBe(1) // leap confirmed
    })

    it('from corner (0,0) — only (2,2) on board, 1 move', () => {
      const state = buildState([{ sq: sq(0, 0), piece: wp(PieceType.ELEPHANT) }])
      const moves = generateElephantMoves(sq(0, 0), wp(PieceType.ELEPHANT), state)
      expect(moves.length).toBe(1)
      expect(moves[0]?.to).toEqual(sq(2, 2))
    })

    it('friendly at destination blocks the move', () => {
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.ELEPHANT) },
        { sq: sq(7, 7), piece: wp(PieceType.ROOK) },
      ])
      const moves = generateElephantMoves(sq(5, 5), wp(PieceType.ELEPHANT), state)
      expect(moves.length).toBe(3) // (7,7) blocked
      expect(movesTo(moves, sq(7, 7))).toBe(0)
    })

    it('captures an enemy at destination', () => {
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.ELEPHANT) },
        { sq: sq(3, 7), piece: bp(PieceType.CAMEL) },
      ])
      const moves = generateElephantMoves(sq(5, 5), wp(PieceType.ELEPHANT), state)
      const captureMove = moves.find(m => m.to.file === 3 && m.to.rank === 7)
      expect(captureMove?.flag).toBe(MoveFlag.CAPTURE)
      expect(captureMove?.captured?.type).toBe(PieceType.CAMEL)
    })

    it('never moves exactly 1 square — all destinations are distance-2 diagonal', () => {
      const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.ELEPHANT) }])
      const moves = generateElephantMoves(sq(5, 5), wp(PieceType.ELEPHANT), state)
      for (const m of moves) {
        expect(Math.abs(m.to.file - 5)).toBe(2)
        expect(Math.abs(m.to.rank - 5)).toBe(2)
      }
    })
  })
})

// =============================================================================
// Piece: Camel — (1,3) leaper
// =============================================================================

describe('Piece: Camel', () => {
  describe('movement', () => {
    it('from center (5,5) — all 8 destinations reachable', () => {
      const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.CAMEL) }])
      const moves = generateCamelMoves(sq(5, 5), wp(PieceType.CAMEL), state)
      expect(moves.length).toBe(8)
      const targets = moves.map(m => `${m.to.file},${m.to.rank}`)
      expect(targets).toContain('2,4') // (-3,-1)
      expect(targets).toContain('2,6') // (-3,+1)
      expect(targets).toContain('4,2') // (-1,-3)
      expect(targets).toContain('4,8') // (-1,+3)
      expect(targets).toContain('6,2') // (+1,-3)
      expect(targets).toContain('6,8') // (+1,+3)
      expect(targets).toContain('8,4') // (+3,-1)
      expect(targets).toContain('8,6') // (+3,+1)
    })

    it('from corner (0,0) — only 2 destinations on board', () => {
      const state = buildState([{ sq: sq(0, 0), piece: wp(PieceType.CAMEL) }])
      const moves = generateCamelMoves(sq(0, 0), wp(PieceType.CAMEL), state)
      expect(moves.length).toBe(2)
      const targets = moves.map(m => `${m.to.file},${m.to.rank}`)
      expect(targets).toContain('1,3') // (+1,+3)
      expect(targets).toContain('3,1') // (+3,+1)
    })

    it('leaps over any intervening pieces', () => {
      // Camel at (5,5), fill every square between it and (8,6)
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.CAMEL) },
        { sq: sq(6, 5), piece: bp(PieceType.ROOK) },
        { sq: sq(7, 5), piece: bp(PieceType.ROOK) },
        { sq: sq(7, 6), piece: bp(PieceType.ROOK) },
      ])
      const moves = generateCamelMoves(sq(5, 5), wp(PieceType.CAMEL), state)
      // (8,6) = (+3,+1) — should still be reachable
      expect(movesTo(moves, sq(8, 6))).toBe(1)
    })

    it('friendly at destination blocks the move', () => {
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.CAMEL) },
        { sq: sq(8, 4), piece: wp(PieceType.ROOK) }, // friendly at (8,4) = (+3,-1)
      ])
      const moves = generateCamelMoves(sq(5, 5), wp(PieceType.CAMEL), state)
      expect(moves.length).toBe(7)
      expect(movesTo(moves, sq(8, 4))).toBe(0)
    })

    it('captures enemy at destination', () => {
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.CAMEL) },
        { sq: sq(4, 8), piece: bp(PieceType.ELEPHANT) }, // enemy at (-1,+3)
      ])
      const moves = generateCamelMoves(sq(5, 5), wp(PieceType.CAMEL), state)
      const captureMove = moves.find(m => m.to.file === 4 && m.to.rank === 8)
      expect(captureMove?.flag).toBe(MoveFlag.CAPTURE)
      expect(captureMove?.captured?.type).toBe(PieceType.ELEPHANT)
    })
  })
})

// =============================================================================
// Piece: War Engine (Dabbaba — exactly 2 orthogonal, leaps)
// =============================================================================

describe('Piece: War Engine', () => {
  describe('movement', () => {
    it('from center (5,5) — exactly 4 destinations: (3,5),(7,5),(5,3),(5,7)', () => {
      const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.WAR_ENGINE) }])
      const moves = generateWarEngineMoves(sq(5, 5), wp(PieceType.WAR_ENGINE), state)
      expect(moves.length).toBe(4)
      const targets = moves.map(m => `${m.to.file},${m.to.rank}`)
      expect(targets).toContain('3,5')
      expect(targets).toContain('7,5')
      expect(targets).toContain('5,3')
      expect(targets).toContain('5,7')
    })

    it('leaps over the intervening orthogonal square', () => {
      // War Engine at (5,5), piece at (6,5) (intermediate) — (7,5) still reachable
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.WAR_ENGINE) },
        { sq: sq(6, 5), piece: bp(PieceType.ROOK) },
      ])
      const moves = generateWarEngineMoves(sq(5, 5), wp(PieceType.WAR_ENGINE), state)
      expect(movesTo(moves, sq(7, 5))).toBe(1) // leap confirmed
    })

    it('from corner (0,0) — only (2,0) and (0,2) on board', () => {
      const state = buildState([{ sq: sq(0, 0), piece: wp(PieceType.WAR_ENGINE) }])
      const moves = generateWarEngineMoves(sq(0, 0), wp(PieceType.WAR_ENGINE), state)
      expect(moves.length).toBe(2)
      const targets = moves.map(m => `${m.to.file},${m.to.rank}`)
      expect(targets).toContain('2,0')
      expect(targets).toContain('0,2')
    })

    it('friendly at destination blocks the move', () => {
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.WAR_ENGINE) },
        { sq: sq(5, 7), piece: wp(PieceType.ROOK) },
      ])
      const moves = generateWarEngineMoves(sq(5, 5), wp(PieceType.WAR_ENGINE), state)
      expect(moves.length).toBe(3)
      expect(movesTo(moves, sq(5, 7))).toBe(0)
    })

    it('captures enemy at destination', () => {
      const state = buildState([
        { sq: sq(5, 5), piece: wp(PieceType.WAR_ENGINE) },
        { sq: sq(3, 5), piece: bp(PieceType.GENERAL) },
      ])
      const moves = generateWarEngineMoves(sq(5, 5), wp(PieceType.WAR_ENGINE), state)
      const captureMove = moves.find(m => m.to.file === 3 && m.to.rank === 5)
      expect(captureMove?.flag).toBe(MoveFlag.CAPTURE)
      expect(captureMove?.captured?.type).toBe(PieceType.GENERAL)
    })

    it('all destinations are exactly 2 orthogonal steps away', () => {
      const state = buildState([{ sq: sq(5, 5), piece: wp(PieceType.WAR_ENGINE) }])
      const moves = generateWarEngineMoves(sq(5, 5), wp(PieceType.WAR_ENGINE), state)
      for (const m of moves) {
        const df = Math.abs(m.to.file - 5)
        const dr = Math.abs(m.to.rank - 5)
        // Must be 2 in one direction and 0 in other (pure orthogonal leap)
        expect((df === 2 && dr === 0) || (df === 0 && dr === 2)).toBe(true)
      }
    })
  })
})
