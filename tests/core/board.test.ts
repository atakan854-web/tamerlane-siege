import { describe, it, expect } from 'vitest'
import {
  squareToKey,
  keyToSquare,
  squaresEqual,
  isCitadel,
  isMainBoard,
  isOnBoard,
  isAdjacentToWhiteCitadel,
  isAdjacentToBlackCitadel,
  getReachableCitadel,
  getAdjacentSquares,
  getPiece,
  isFriendly,
  isEnemy,
  createInitialBoard,
  createInitialGameState,
  getColorSquares,
  isRoyalType,
  isPawnType,
  getBackRank,
  getForwardDirection,
} from '../../src/core/board'
import { PieceType } from '../../src/core/types'
import { WHITE_CITADEL, BLACK_CITADEL, PIECES_PER_SIDE } from '../../src/core/constants'

// -----------------------------------------------------------------------------
// squareToKey / keyToSquare
// -----------------------------------------------------------------------------

describe('Board: squareToKey', () => {
  it('converts a normal square to "file,rank" string', () => {
    expect(squareToKey({ file: 5, rank: 3 })).toBe('5,3')
  })

  it('converts white citadel (file 11) correctly', () => {
    expect(squareToKey({ file: 11, rank: 1 })).toBe('11,1')
  })

  it('converts black citadel (file -1) correctly', () => {
    expect(squareToKey({ file: -1, rank: 8 })).toBe('-1,8')
  })

  it('converts file 0, rank 0 (corner)', () => {
    expect(squareToKey({ file: 0, rank: 0 })).toBe('0,0')
  })
})

describe('Board: keyToSquare', () => {
  it('parses a normal key back to square', () => {
    expect(keyToSquare('5,3')).toEqual({ file: 5, rank: 3 })
  })

  it('parses white citadel key', () => {
    expect(keyToSquare('11,1')).toEqual({ file: 11, rank: 1 })
  })

  it('parses black citadel key (negative file)', () => {
    expect(keyToSquare('-1,8')).toEqual({ file: -1, rank: 8 })
  })

  it('round-trips squareToKey → keyToSquare', () => {
    const original = { file: 7, rank: 4 }
    expect(keyToSquare(squareToKey(original))).toEqual(original)
  })
})

// -----------------------------------------------------------------------------
// squaresEqual
// -----------------------------------------------------------------------------

describe('Board: squaresEqual', () => {
  it('returns true for identical squares', () => {
    expect(squaresEqual({ file: 3, rank: 3 }, { file: 3, rank: 3 })).toBe(true)
  })

  it('returns false when files differ', () => {
    expect(squaresEqual({ file: 3, rank: 3 }, { file: 4, rank: 3 })).toBe(false)
  })

  it('returns false when ranks differ', () => {
    expect(squaresEqual({ file: 3, rank: 3 }, { file: 3, rank: 4 })).toBe(false)
  })

  it('correctly identifies citadel squares', () => {
    expect(squaresEqual(WHITE_CITADEL, { file: 11, rank: 1 })).toBe(true)
    expect(squaresEqual(BLACK_CITADEL, { file: -1, rank: 8 })).toBe(true)
  })
})

// -----------------------------------------------------------------------------
// Bounds Checking
// -----------------------------------------------------------------------------

describe('Board: isCitadel', () => {
  it('returns true for white citadel (11,1)', () => {
    expect(isCitadel({ file: 11, rank: 1 })).toBe(true)
  })

  it('returns true for black citadel (-1,8)', () => {
    expect(isCitadel({ file: -1, rank: 8 })).toBe(true)
  })

  it('returns false for normal board squares', () => {
    expect(isCitadel({ file: 5, rank: 5 })).toBe(false)
    expect(isCitadel({ file: 0, rank: 0 })).toBe(false)
    expect(isCitadel({ file: 10, rank: 9 })).toBe(false)
  })

  it('returns false for off-board squares that are not citadels', () => {
    expect(isCitadel({ file: 11, rank: 5 })).toBe(false)
    expect(isCitadel({ file: -1, rank: 0 })).toBe(false)
  })
})

describe('Board: isMainBoard', () => {
  it('returns true for all corners of the main board', () => {
    expect(isMainBoard({ file: 0, rank: 0 })).toBe(true)
    expect(isMainBoard({ file: 10, rank: 0 })).toBe(true)
    expect(isMainBoard({ file: 0, rank: 9 })).toBe(true)
    expect(isMainBoard({ file: 10, rank: 9 })).toBe(true)
  })

  it('returns false for citadel squares', () => {
    expect(isMainBoard(WHITE_CITADEL)).toBe(false)
    expect(isMainBoard(BLACK_CITADEL)).toBe(false)
  })

  it('returns false for squares just off the board edges', () => {
    expect(isMainBoard({ file: -1, rank: 0 })).toBe(false)
    expect(isMainBoard({ file: 11, rank: 0 })).toBe(false)
    expect(isMainBoard({ file: 0, rank: -1 })).toBe(false)
    expect(isMainBoard({ file: 0, rank: 10 })).toBe(false)
  })
})

describe('Board: isOnBoard', () => {
  it('returns true for main board squares', () => {
    expect(isOnBoard({ file: 5, rank: 5 })).toBe(true)
    expect(isOnBoard({ file: 0, rank: 0 })).toBe(true)
    expect(isOnBoard({ file: 10, rank: 9 })).toBe(true)
  })

  it('returns true for white citadel', () => {
    expect(isOnBoard(WHITE_CITADEL)).toBe(true)
  })

  it('returns true for black citadel', () => {
    expect(isOnBoard(BLACK_CITADEL)).toBe(true)
  })

  it('returns false for squares outside board and not citadels', () => {
    expect(isOnBoard({ file: -2, rank: 5 })).toBe(false)
    expect(isOnBoard({ file: 12, rank: 5 })).toBe(false)
    expect(isOnBoard({ file: 5, rank: -1 })).toBe(false)
    expect(isOnBoard({ file: 5, rank: 10 })).toBe(false)
    expect(isOnBoard({ file: 11, rank: 5 })).toBe(false)  // Not the citadel rank
  })
})

// -----------------------------------------------------------------------------
// Citadel Adjacency
// -----------------------------------------------------------------------------

describe('Board: isAdjacentToWhiteCitadel', () => {
  it('returns true for the three adjacent squares (10,0), (10,1), (10,2)', () => {
    expect(isAdjacentToWhiteCitadel({ file: 10, rank: 0 })).toBe(true)
    expect(isAdjacentToWhiteCitadel({ file: 10, rank: 1 })).toBe(true)
    expect(isAdjacentToWhiteCitadel({ file: 10, rank: 2 })).toBe(true)
  })

  it('returns false for non-adjacent squares', () => {
    expect(isAdjacentToWhiteCitadel({ file: 9, rank: 1 })).toBe(false)
    expect(isAdjacentToWhiteCitadel({ file: 10, rank: 3 })).toBe(false)
    expect(isAdjacentToWhiteCitadel({ file: 0, rank: 1 })).toBe(false)
  })
})

describe('Board: isAdjacentToBlackCitadel', () => {
  it('returns true for the three adjacent squares (0,7), (0,8), (0,9)', () => {
    expect(isAdjacentToBlackCitadel({ file: 0, rank: 7 })).toBe(true)
    expect(isAdjacentToBlackCitadel({ file: 0, rank: 8 })).toBe(true)
    expect(isAdjacentToBlackCitadel({ file: 0, rank: 9 })).toBe(true)
  })

  it('returns false for non-adjacent squares', () => {
    expect(isAdjacentToBlackCitadel({ file: 1, rank: 8 })).toBe(false)
    expect(isAdjacentToBlackCitadel({ file: 0, rank: 6 })).toBe(false)
    expect(isAdjacentToBlackCitadel({ file: 10, rank: 8 })).toBe(false)
  })
})

describe('Board: getReachableCitadel', () => {
  it('returns white citadel from an adjacent square', () => {
    expect(getReachableCitadel({ file: 10, rank: 1 })).toEqual(WHITE_CITADEL)
  })

  it('returns black citadel from an adjacent square', () => {
    expect(getReachableCitadel({ file: 0, rank: 8 })).toEqual(BLACK_CITADEL)
  })

  it('returns null from a non-adjacent square', () => {
    expect(getReachableCitadel({ file: 5, rank: 5 })).toBeNull()
    expect(getReachableCitadel({ file: 9, rank: 1 })).toBeNull()
  })
})

// -----------------------------------------------------------------------------
// Adjacent Squares
// -----------------------------------------------------------------------------

describe('Board: getAdjacentSquares', () => {
  it('returns 8 squares from center of board (5,5)', () => {
    const adj = getAdjacentSquares({ file: 5, rank: 5 })
    expect(adj.length).toBe(8)
  })

  it('returns 3 squares from corner (0,0)', () => {
    const adj = getAdjacentSquares({ file: 0, rank: 0 })
    expect(adj.length).toBe(3)
  })

  it('returns 5 squares from edge-center (0,5)', () => {
    const adj = getAdjacentSquares({ file: 0, rank: 5 })
    expect(adj.length).toBe(5)
  })

  it('returns 5 squares from corner (10,9)', () => {
    const adj = getAdjacentSquares({ file: 10, rank: 9 })
    // (10,9) corner: 3 main-board adjacents + white citadel is at (11,1) — not adjacent
    // Black citadel is at (-1,8) — not adjacent to (10,9)
    expect(adj.length).toBe(3)
  })

  it('includes white citadel when adjacent square (10,1) is used', () => {
    const adj = getAdjacentSquares({ file: 10, rank: 1 })
    const hasCitadel = adj.some(s => squaresEqual(s, WHITE_CITADEL))
    expect(hasCitadel).toBe(true)
  })

  it('includes black citadel when adjacent square (0,8) is used', () => {
    const adj = getAdjacentSquares({ file: 0, rank: 8 })
    const hasCitadel = adj.some(s => squaresEqual(s, BLACK_CITADEL))
    expect(hasCitadel).toBe(true)
  })

  it('does not include off-board squares', () => {
    const adj = getAdjacentSquares({ file: 0, rank: 0 })
    for (const sq of adj) {
      expect(isOnBoard(sq)).toBe(true)
    }
  })

  it('returns adjacents of white citadel (11,1) — includes main board squares', () => {
    const adj = getAdjacentSquares(WHITE_CITADEL)
    // Citadel (11,1): deltas produce (10,0),(10,1),(10,2),(12,0),(12,1),(12,2),(11,0),(11,2)
    // Only (10,0),(10,1),(10,2) are valid board squares
    expect(adj.length).toBe(3)
    expect(adj.some(s => squaresEqual(s, { file: 10, rank: 0 }))).toBe(true)
    expect(adj.some(s => squaresEqual(s, { file: 10, rank: 1 }))).toBe(true)
    expect(adj.some(s => squaresEqual(s, { file: 10, rank: 2 }))).toBe(true)
  })
})

// -----------------------------------------------------------------------------
// createInitialBoard
// -----------------------------------------------------------------------------

describe('Board: createInitialBoard', () => {
  it('returns a Map with exactly 56 pieces', () => {
    const board = createInitialBoard()
    expect(board.size).toBe(PIECES_PER_SIDE * 2)
  })

  it('white King is at key "5,1"', () => {
    const board = createInitialBoard()
    const king = board.get('5,1')
    expect(king).toBeDefined()
    expect(king?.type).toBe(PieceType.KING)
    expect(king?.color).toBe('w')
  })

  it('black King is at key "5,8"', () => {
    const board = createInitialBoard()
    const king = board.get('5,8')
    expect(king).toBeDefined()
    expect(king?.type).toBe(PieceType.KING)
    expect(king?.color).toBe('b')
  })

  it('has 28 white pieces', () => {
    const board = createInitialBoard()
    let whiteCount = 0
    for (const piece of board.values()) {
      if (piece.color === 'w') whiteCount++
    }
    expect(whiteCount).toBe(PIECES_PER_SIDE)
  })

  it('has 28 black pieces', () => {
    const board = createInitialBoard()
    let blackCount = 0
    for (const piece of board.values()) {
      if (piece.color === 'b') blackCount++
    }
    expect(blackCount).toBe(PIECES_PER_SIDE)
  })

  it('squares at ranks 3–6 are all empty', () => {
    const board = createInitialBoard()
    for (let rank = 3; rank <= 6; rank++) {
      for (let file = 0; file < 11; file++) {
        expect(board.has(squareToKey({ file, rank }))).toBe(false)
      }
    }
  })

  it('citadel squares are empty at game start', () => {
    const board = createInitialBoard()
    expect(board.has(squareToKey(WHITE_CITADEL))).toBe(false)
    expect(board.has(squareToKey(BLACK_CITADEL))).toBe(false)
  })

  it('white rank 0 has only pieces on even files', () => {
    const board = createInitialBoard()
    for (let file = 0; file < 11; file++) {
      const piece = board.get(squareToKey({ file, rank: 0 }))
      if (file % 2 === 1) {
        expect(piece).toBeUndefined()
      } else {
        expect(piece).toBeDefined()
        expect(piece?.color).toBe('w')
      }
    }
  })

  it('white Pawn of Pawns is at (0,2)', () => {
    const board = createInitialBoard()
    const pop = board.get('0,2')
    expect(pop?.type).toBe(PieceType.PAWN_OF_PAWNS)
    expect(pop?.color).toBe('w')
  })

  it('createInitialBoard returns a new Map each call (immutable)', () => {
    const board1 = createInitialBoard()
    const board2 = createInitialBoard()
    expect(board1).not.toBe(board2)  // different references
    board1.delete('5,1')
    expect(board2.has('5,1')).toBe(true)  // board2 unaffected
  })
})

// -----------------------------------------------------------------------------
// createInitialGameState
// -----------------------------------------------------------------------------

describe('Board: createInitialGameState', () => {
  it('starts with White to move', () => {
    const state = createInitialGameState()
    expect(state.turn).toBe('w')
  })

  it('move number starts at 1', () => {
    const state = createInitialGameState()
    expect(state.moveNumber).toBe(1)
  })

  it('half move count starts at 0', () => {
    const state = createInitialGameState()
    expect(state.halfMoveCount).toBe(0)
  })

  it('king swaps are unused at start', () => {
    const state = createInitialGameState()
    expect(state.whiteKingSwapUsed).toBe(false)
    expect(state.blackKingSwapUsed).toBe(false)
  })

  it('citadel occupants are null at start', () => {
    const state = createInitialGameState()
    expect(state.whiteCitadelOccupant).toBeNull()
    expect(state.blackCitadelOccupant).toBeNull()
  })

  it('game result is null at start', () => {
    const state = createInitialGameState()
    expect(state.result).toBeNull()
  })

  it('history is empty at start', () => {
    const state = createInitialGameState()
    expect(state.history).toHaveLength(0)
  })

  it('white royals list contains only the King square at start', () => {
    const state = createInitialGameState()
    expect(state.whiteRoyals).toHaveLength(1)
    expect(state.whiteRoyals[0]).toEqual({ file: 5, rank: 1 })
  })

  it('black royals list contains only the King square at start', () => {
    const state = createInitialGameState()
    expect(state.blackRoyals).toHaveLength(1)
    expect(state.blackRoyals[0]).toEqual({ file: 5, rank: 8 })
  })
})

// -----------------------------------------------------------------------------
// Piece Lookup Utilities
// -----------------------------------------------------------------------------

describe('Board: getPiece / isFriendly / isEnemy', () => {
  it('getPiece returns the piece at an occupied square', () => {
    const board = createInitialBoard()
    const piece = getPiece(board, { file: 5, rank: 1 })
    expect(piece?.type).toBe(PieceType.KING)
    expect(piece?.color).toBe('w')
  })

  it('getPiece returns null for an empty square', () => {
    const board = createInitialBoard()
    expect(getPiece(board, { file: 5, rank: 5 })).toBeNull()
  })

  it('isFriendly returns true for a same-color piece', () => {
    const board = createInitialBoard()
    expect(isFriendly(board, { file: 5, rank: 1 }, 'w')).toBe(true)
  })

  it('isFriendly returns false for an enemy piece', () => {
    const board = createInitialBoard()
    expect(isFriendly(board, { file: 5, rank: 8 }, 'w')).toBe(false)
  })

  it('isFriendly returns false for empty square', () => {
    const board = createInitialBoard()
    expect(isFriendly(board, { file: 5, rank: 5 }, 'w')).toBe(false)
  })

  it('isEnemy returns true for opposite-color piece', () => {
    const board = createInitialBoard()
    expect(isEnemy(board, { file: 5, rank: 8 }, 'w')).toBe(true)
  })

  it('isEnemy returns false for same-color piece', () => {
    const board = createInitialBoard()
    expect(isEnemy(board, { file: 5, rank: 1 }, 'w')).toBe(false)
  })

  it('isEnemy returns false for empty square', () => {
    const board = createInitialBoard()
    expect(isEnemy(board, { file: 5, rank: 5 }, 'w')).toBe(false)
  })
})

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

describe('Board: getColorSquares', () => {
  it('returns 28 squares for white', () => {
    const board = createInitialBoard()
    expect(getColorSquares(board, 'w').length).toBe(PIECES_PER_SIDE)
  })

  it('returns 28 squares for black', () => {
    const board = createInitialBoard()
    expect(getColorSquares(board, 'b').length).toBe(PIECES_PER_SIDE)
  })
})

describe('Board: isRoyalType', () => {
  it('King is royal', () => expect(isRoyalType(PieceType.KING)).toBe(true))
  it('Prince is royal', () => expect(isRoyalType(PieceType.PRINCE)).toBe(true))
  it('Adventitious King is royal', () => expect(isRoyalType(PieceType.ADVENTITIOUS_KING)).toBe(true))
  it('Rook is not royal', () => expect(isRoyalType(PieceType.ROOK)).toBe(false))
  it('Pawn of Kings is not royal', () => expect(isRoyalType(PieceType.PAWN_OF_KINGS)).toBe(false))
})

describe('Board: isPawnType', () => {
  it('Pawn of Pawns is a pawn', () => expect(isPawnType(PieceType.PAWN_OF_PAWNS)).toBe(true))
  it('Pawn of Kings is a pawn', () => expect(isPawnType(PieceType.PAWN_OF_KINGS)).toBe(true))
  it('Pawn of Rooks is a pawn', () => expect(isPawnType(PieceType.PAWN_OF_ROOKS)).toBe(true))
  it('King is not a pawn', () => expect(isPawnType(PieceType.KING)).toBe(false))
  it('Rook is not a pawn', () => expect(isPawnType(PieceType.ROOK)).toBe(false))
})

describe('Board: getBackRank', () => {
  it('white back rank is rank 9', () => expect(getBackRank('w')).toBe(9))
  it('black back rank is rank 0', () => expect(getBackRank('b')).toBe(0))
})

describe('Board: getForwardDirection', () => {
  it('white moves forward (+1 rank)', () => expect(getForwardDirection('w')).toBe(1))
  it('black moves forward (-1 rank)', () => expect(getForwardDirection('b')).toBe(-1))
})
