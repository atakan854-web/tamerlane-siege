// =============================================================================
// TAMERLANE SIEGE — Validation Utility Tests
// tests/core/validate.test.ts
// =============================================================================

import { describe, it, expect } from 'vitest'
import { PieceType, MoveFlag, type Square, type Piece, type GameState } from '../../src/core/types'
import { createInitialGameState } from '../../src/core/board'
import { WHITE_CITADEL, BLACK_CITADEL } from '../../src/core/constants'
import { isValidSquare, isValidPiece, isValidMove, isValidGameState } from '../../src/core/validate'
import { createNewGame, makeMove } from '../../src/core/game'
import { getAllLegalMoves } from '../../src/core/rules'

// =============================================================================
// Helpers
// =============================================================================

function sq(file: number, rank: number): Square { return { file, rank } }
function wp(type: PieceType): Piece { return { type, color: 'w' } }

// =============================================================================
// isValidSquare
// =============================================================================

describe('isValidSquare', () => {
  it('bottom-left corner (0,0) → true', () => {
    expect(isValidSquare(sq(0, 0))).toBe(true)
  })

  it('top-right corner (10,9) → true', () => {
    expect(isValidSquare(sq(10, 9))).toBe(true)
  })

  it('center square (5,5) → true', () => {
    expect(isValidSquare(sq(5, 5))).toBe(true)
  })

  it('white citadel (11,1) → true', () => {
    expect(isValidSquare(WHITE_CITADEL)).toBe(true)
  })

  it('black citadel (-1,8) → true', () => {
    expect(isValidSquare(BLACK_CITADEL)).toBe(true)
  })

  it('file out of range (11,0) — not a citadel rank → false', () => {
    expect(isValidSquare(sq(11, 0))).toBe(false)
  })

  it('negative file (-1,0) — not a citadel rank → false', () => {
    expect(isValidSquare(sq(-1, 0))).toBe(false)
  })

  it('rank out of range (5,10) → false', () => {
    expect(isValidSquare(sq(5, 10))).toBe(false)
  })

  it('negative rank (0,-1) → false', () => {
    expect(isValidSquare(sq(0, -1))).toBe(false)
  })
})

// =============================================================================
// isValidPiece
// =============================================================================

describe('isValidPiece', () => {
  it('white King → true', () => {
    expect(isValidPiece(wp(PieceType.KING))).toBe(true)
  })

  it('black Pawn of Pawns → true', () => {
    expect(isValidPiece({ type: PieceType.PAWN_OF_PAWNS, color: 'b' })).toBe(true)
  })

  it('white Adventitious King → true', () => {
    expect(isValidPiece(wp(PieceType.ADVENTITIOUS_KING))).toBe(true)
  })

  it('invalid piece type → false', () => {
    expect(isValidPiece({ type: 'INVALID' as PieceType, color: 'w' })).toBe(false)
  })

  it('empty string type → false', () => {
    expect(isValidPiece({ type: '' as PieceType, color: 'w' })).toBe(false)
  })

  it('invalid color → false', () => {
    expect(isValidPiece({ type: PieceType.ROOK, color: 'x' as 'w' })).toBe(false)
  })
})

// =============================================================================
// isValidMove
// =============================================================================

describe('isValidMove', () => {
  it('a legal move from the starting position → true', () => {
    const state = createNewGame()
    // Pawn of Kings forward one square
    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm =>
      lm.from.file === 5 && lm.from.rank === 2 &&
      lm.to.file   === 5 && lm.to.rank   === 3 &&
      lm.flag === MoveFlag.NORMAL,
    )!
    expect(isValidMove(m, state)).toBe(true)
  })

  it('a move with wrong destination → false', () => {
    const state = createNewGame()
    expect(isValidMove({
      from:  sq(5, 2),
      to:    sq(5, 9), // illegal jump
      piece: wp(PieceType.PAWN_OF_KINGS),
      flag:  MoveFlag.NORMAL,
    }, state)).toBe(false)
  })

  it('moving an opponent piece → false', () => {
    const state = createNewGame()
    // It is White's turn; trying to move a Black pawn is illegal
    expect(isValidMove({
      from:  sq(5, 7),
      to:    sq(5, 6),
      piece: { type: PieceType.PAWN_OF_KINGS, color: 'b' },
      flag:  MoveFlag.NORMAL,
    }, state)).toBe(false)
  })
})

// =============================================================================
// isValidGameState
// =============================================================================

describe('isValidGameState', () => {
  it('initial game state → true', () => {
    expect(isValidGameState(createNewGame())).toBe(true)
  })

  it('state after a move → true', () => {
    let state = createNewGame()
    const m = getAllLegalMoves('w', state).find(lm => lm.flag === MoveFlag.NORMAL)!
    state = makeMove(state, m)
    expect(isValidGameState(state)).toBe(true)
  })

  it('state with no white royals → false', () => {
    const state = createInitialGameState()
    state.whiteRoyals = []
    // Remove White King from pieces too
    state.pieces.delete('5,1')
    expect(isValidGameState(state)).toBe(false)
  })

  it('state with no black royals → false', () => {
    const state = createInitialGameState()
    state.blackRoyals = []
    state.pieces.delete('5,8')
    expect(isValidGameState(state)).toBe(false)
  })

  it('state with invalid turn → false', () => {
    const state = createInitialGameState()
    ;(state as GameState).turn = 'x' as 'w'
    expect(isValidGameState(state)).toBe(false)
  })

  it('state with moveNumber 0 → false', () => {
    const state = createInitialGameState()
    state.moveNumber = 0
    expect(isValidGameState(state)).toBe(false)
  })

  it('state with corrupt piece map key → false', () => {
    const state = createInitialGameState()
    // Inject a key with invalid coordinates (file 99 is not on board)
    state.pieces.set('99,99', { type: PieceType.ROOK, color: 'w' })
    expect(isValidGameState(state)).toBe(false)
  })

  it('state with malformed key → false', () => {
    const state = createInitialGameState()
    // Key without comma
    state.pieces.set('badkey', { type: PieceType.ROOK, color: 'w' })
    expect(isValidGameState(state)).toBe(false)
  })
})
