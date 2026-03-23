// =============================================================================
// TAMERLANE SIEGE — Game Orchestration Tests
// tests/core/game.test.ts
// =============================================================================

import { describe, it, expect } from 'vitest'
import {
  PieceType,
  MoveFlag,
  PawnOfPawnsStage,
  GameResult,
  type Square,
  type Piece,
  type GameState,
} from '../../src/core/types'
import { createInitialGameState } from '../../src/core/board'
import { createNewGame, makeMove, undoMove, isGameOver } from '../../src/core/game'
import { getAllLegalMoves } from '../../src/core/rules'

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
// createNewGame
// =============================================================================

describe('createNewGame', () => {
  it('creates 28 white pieces', () => {
    const state = createNewGame()
    const whitePieces = [...state.pieces.values()].filter(p => p.color === 'w')
    expect(whitePieces).toHaveLength(28)
  })

  it('creates 28 black pieces', () => {
    const state = createNewGame()
    const blackPieces = [...state.pieces.values()].filter(p => p.color === 'b')
    expect(blackPieces).toHaveLength(28)
  })

  it('white starts first', () => {
    const state = createNewGame()
    expect(state.turn).toBe('w')
  })

  it('result is null', () => {
    const state = createNewGame()
    expect(state.result).toBeNull()
  })

  it('history is empty', () => {
    const state = createNewGame()
    expect(state.history).toHaveLength(0)
  })

  it('halfMoveCount starts at 0', () => {
    const state = createNewGame()
    expect(state.halfMoveCount).toBe(0)
  })

  it('white King is the only white royal at (5,1)', () => {
    const state = createNewGame()
    expect(state.whiteRoyals).toHaveLength(1)
    expect(state.whiteRoyals[0]).toEqual(sq(5, 1))
  })

  it('black King is the only black royal at (5,8)', () => {
    const state = createNewGame()
    expect(state.blackRoyals).toHaveLength(1)
    expect(state.blackRoyals[0]).toEqual(sq(5, 8))
  })

  it('no king swap used initially', () => {
    const state = createNewGame()
    expect(state.whiteKingSwapUsed).toBe(false)
    expect(state.blackKingSwapUsed).toBe(false)
  })
})

// =============================================================================
// isGameOver
// =============================================================================

describe('isGameOver', () => {
  it('returns false when result is null', () => {
    const state = createNewGame()
    expect(isGameOver(state)).toBe(false)
  })

  it('returns true when result is WHITE_WINS_CHECKMATE', () => {
    const state = createNewGame()
    state.result = GameResult.WHITE_WINS_CHECKMATE
    expect(isGameOver(state)).toBe(true)
  })

  it('returns true when result is DRAW_CITADEL', () => {
    const state = createNewGame()
    state.result = GameResult.DRAW_CITADEL
    expect(isGameOver(state)).toBe(true)
  })
})

// =============================================================================
// makeMove — pawn forward
// =============================================================================

describe('makeMove - pawn forward', () => {
  it('moves white Pawn of Kings from (5,2) to (5,3) and switches turn', () => {
    const state = createNewGame()
    // White Pawn of Kings at (5,2), advance to (5,3)
    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm =>
      lm.from.file === 5 && lm.from.rank === 2 &&
      lm.to.file   === 5 && lm.to.rank   === 3 &&
      lm.flag === MoveFlag.NORMAL,
    )
    expect(m).toBeDefined()

    const next = makeMove(state, m!)
    expect(next.pieces.get('5,3')?.type).toBe(PieceType.PAWN_OF_KINGS)
    expect(next.pieces.get('5,2')).toBeUndefined()
    expect(next.turn).toBe('b')
  })

  it('increments halfMoveCount', () => {
    const state = createNewGame()
    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm =>
      lm.from.file === 5 && lm.from.rank === 2 &&
      lm.to.rank === 3 && lm.flag === MoveFlag.NORMAL,
    )!
    const next = makeMove(state, m)
    expect(next.halfMoveCount).toBe(1)
  })

  it('appends move to history', () => {
    const state = createNewGame()
    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm =>
      lm.from.file === 5 && lm.from.rank === 2 &&
      lm.to.rank === 3 && lm.flag === MoveFlag.NORMAL,
    )!
    const next = makeMove(state, m)
    expect(next.history).toHaveLength(1)
    expect(next.history[0]).toBe(m)
  })

  it('does not mutate the original state', () => {
    const state = createNewGame()
    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm =>
      lm.from.file === 5 && lm.from.rank === 2 &&
      lm.to.rank === 3 && lm.flag === MoveFlag.NORMAL,
    )!
    makeMove(state, m)
    expect(state.pieces.get('5,2')?.type).toBe(PieceType.PAWN_OF_KINGS)
    expect(state.turn).toBe('w')
    expect(state.history).toHaveLength(0)
  })

  it('black pawn forward decrements rank and switches turn to white', () => {
    let state = createNewGame()
    // First make a white move to get to black's turn
    const wMoves = getAllLegalMoves('w', state)
    const wm = wMoves.find(lm =>
      lm.from.file === 5 && lm.from.rank === 2 &&
      lm.to.rank === 3 && lm.flag === MoveFlag.NORMAL,
    )!
    state = makeMove(state, wm)

    // Black Pawn of Kings at (5,7), advance to (5,6)
    const bMoves = getAllLegalMoves('b', state)
    const bm = bMoves.find(lm =>
      lm.from.file === 5 && lm.from.rank === 7 &&
      lm.to.file   === 5 && lm.to.rank   === 6 &&
      lm.flag === MoveFlag.NORMAL,
    )
    expect(bm).toBeDefined()

    const next = makeMove(state, bm!)
    expect(next.pieces.get('5,6')?.type).toBe(PieceType.PAWN_OF_KINGS)
    expect(next.pieces.get('5,7')).toBeUndefined()
    expect(next.turn).toBe('w')
    // After black's move, moveNumber increments
    expect(next.moveNumber).toBe(2)
  })
})

// =============================================================================
// makeMove — capture
// =============================================================================

describe('makeMove - capture', () => {
  it('removes the captured piece and places the attacker', () => {
    const state = emptyState()
    state.turn = 'w'
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(10, 9), bp(PieceType.KING))
    place(state, sq(5, 5), wp(PieceType.ROOK))
    place(state, sq(5, 7), bp(PieceType.PAWN_OF_KINGS))
    state.whiteRoyals = [sq(0, 0)]
    state.blackRoyals = [sq(10, 9)]

    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm =>
      lm.from.file === 5 && lm.from.rank === 5 &&
      lm.to.file   === 5 && lm.to.rank   === 7 &&
      lm.flag === MoveFlag.CAPTURE,
    )
    expect(m).toBeDefined()

    const next = makeMove(state, m!)
    expect(next.pieces.get('5,7')?.type).toBe(PieceType.ROOK)
    expect(next.pieces.get('5,7')?.color).toBe('w')
    expect(next.pieces.get('5,5')).toBeUndefined()
    expect(next.turn).toBe('b')
  })

  it('pawn diagonal capture removes enemy and moves pawn', () => {
    const state = emptyState()
    state.turn = 'w'
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(10, 9), bp(PieceType.KING))
    place(state, sq(5, 4), wp(PieceType.PAWN_OF_KINGS))
    place(state, sq(6, 5), bp(PieceType.PAWN_OF_VIZIERS))
    state.whiteRoyals = [sq(0, 0)]
    state.blackRoyals = [sq(10, 9)]

    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm =>
      lm.from.file === 5 && lm.from.rank === 4 &&
      lm.to.file   === 6 && lm.to.rank   === 5 &&
      lm.flag === MoveFlag.CAPTURE,
    )
    expect(m).toBeDefined()

    const next = makeMove(state, m!)
    expect(next.pieces.get('6,5')?.type).toBe(PieceType.PAWN_OF_KINGS)
    expect(next.pieces.get('6,5')?.color).toBe('w')
    expect(next.pieces.get('5,4')).toBeUndefined()
  })
})

// =============================================================================
// makeMove — promotion
// =============================================================================

describe('makeMove - promotion', () => {
  it('replaces pawn with promoted piece at destination', () => {
    const state = emptyState()
    state.turn = 'w'
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(10, 9), bp(PieceType.KING))
    // White Pawn of Kings at (5,8) → (5,9): reaches back rank
    place(state, sq(5, 8), wp(PieceType.PAWN_OF_KINGS))
    state.whiteRoyals = [sq(0, 0)]
    state.blackRoyals = [sq(10, 9)]

    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm =>
      lm.from.file === 5 && lm.from.rank === 8 &&
      lm.to.file   === 5 && lm.to.rank   === 9 &&
      lm.flag === MoveFlag.PROMOTION,
    )
    expect(m).toBeDefined()

    const next = makeMove(state, m!)
    expect(next.pieces.get('5,8')).toBeUndefined()
    const promoted = next.pieces.get('5,9')
    expect(promoted?.color).toBe('w')
    expect(promoted?.type).toBe(m!.promotionType)
  })

  it('adds Prince to royals when promoted to Prince', () => {
    const state = emptyState()
    state.turn = 'w'
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(10, 9), bp(PieceType.KING))
    place(state, sq(5, 8), wp(PieceType.PAWN_OF_KINGS))
    state.whiteRoyals = [sq(0, 0)]
    state.blackRoyals = [sq(10, 9)]

    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm =>
      lm.from.file === 5 && lm.from.rank === 8 &&
      lm.to.rank === 9 &&
      lm.promotionType === PieceType.PRINCE,
    )
    expect(m).toBeDefined()

    const next = makeMove(state, m!)
    expect(next.whiteRoyals.some(r => r.file === 5 && r.rank === 9)).toBe(true)
  })

  it('does not add non-royal promoted piece to royals', () => {
    // PAWN_OF_ROOKS promotes to ROOK (non-royal)
    const state = emptyState()
    state.turn = 'w'
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(5, 7), bp(PieceType.KING))
    place(state, sq(10, 8), wp(PieceType.PAWN_OF_ROOKS))
    state.whiteRoyals = [sq(0, 0)]
    state.blackRoyals = [sq(5, 7)]

    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm =>
      lm.from.file === 10 && lm.from.rank === 8 &&
      lm.to.rank === 9 &&
      lm.flag === MoveFlag.PROMOTION,
    )
    expect(m).toBeDefined()
    expect(m!.promotionType).toBe(PieceType.ROOK) // Non-royal

    const next = makeMove(state, m!)
    // Only the King should be in royals (Rook is not royal)
    expect(next.whiteRoyals).toHaveLength(1)
  })
})

// =============================================================================
// makeMove — king swap
// =============================================================================

describe('makeMove - king swap', () => {
  it('swaps King and target piece, marks swap used', () => {
    const state = emptyState()
    state.turn = 'w'
    // White King at (5,1), attacked by Black Rook at (5,9) along file 5
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    // White Rook at (3,5) — safe swap destination
    place(state, sq(3, 5), wp(PieceType.ROOK))
    // Black King somewhere safe
    place(state, sq(10, 9), bp(PieceType.KING))
    state.whiteRoyals = [sq(5, 1)]
    state.blackRoyals = [sq(10, 9)]

    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm => lm.flag === MoveFlag.KING_SWAP)
    expect(m).toBeDefined()

    const next = makeMove(state, m!)
    // King is now at the swap target (3,5)
    expect(next.pieces.get('3,5')?.type).toBe(PieceType.KING)
    expect(next.pieces.get('3,5')?.color).toBe('w')
    // Original Rook went to where the King was (5,1)
    expect(next.pieces.get('5,1')?.type).toBe(PieceType.ROOK)
    expect(next.pieces.get('5,1')?.color).toBe('w')
    expect(next.whiteKingSwapUsed).toBe(true)
    expect(next.turn).toBe('b')
  })

  it('swap only available once per player', () => {
    const state = emptyState()
    state.turn = 'w'
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    place(state, sq(3, 5), wp(PieceType.ROOK))
    place(state, sq(10, 9), bp(PieceType.KING))
    state.whiteRoyals = [sq(5, 1)]
    state.blackRoyals = [sq(10, 9)]
    state.whiteKingSwapUsed = true  // Already used

    const legalMoves = getAllLegalMoves('w', state)
    const swapMoves = legalMoves.filter(lm => lm.flag === MoveFlag.KING_SWAP)
    expect(swapMoves).toHaveLength(0)
  })
})

// =============================================================================
// makeMove — citadel entry
// =============================================================================

describe('makeMove - citadel entry', () => {
  it('entering opponent citadel sets DRAW_CITADEL result', () => {
    const state = emptyState()
    state.turn = 'w'
    // White King adjacent to Black Citadel: (0,7), (0,8), or (0,9)
    place(state, sq(0, 8), wp(PieceType.KING))
    place(state, sq(10, 9), bp(PieceType.KING))
    state.whiteRoyals = [sq(0, 8)]
    state.blackRoyals = [sq(10, 9)]

    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm => lm.flag === MoveFlag.CITADEL_ENTRY)
    expect(m).toBeDefined()

    const next = makeMove(state, m!)
    expect(next.result).toBe(GameResult.DRAW_CITADEL)
  })

  it('isGameOver returns true after citadel entry', () => {
    const state = emptyState()
    state.turn = 'w'
    place(state, sq(0, 8), wp(PieceType.KING))
    place(state, sq(10, 9), bp(PieceType.KING))
    state.whiteRoyals = [sq(0, 8)]
    state.blackRoyals = [sq(10, 9)]

    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm => lm.flag === MoveFlag.CITADEL_ENTRY)!
    const next = makeMove(state, m)
    expect(isGameOver(next)).toBe(true)
  })
})

// =============================================================================
// makeMove — illegal move throws
// =============================================================================

describe('makeMove - illegal move throws', () => {
  it('throws when pawn jumps multiple squares', () => {
    const state = createNewGame()
    expect(() =>
      makeMove(state, {
        from:  sq(5, 2),
        to:    sq(5, 9),
        piece: { type: PieceType.PAWN_OF_KINGS, color: 'w' },
        flag:  MoveFlag.NORMAL,
      }),
    ).toThrow()
  })

  it('throws when moving opponent\'s piece', () => {
    const state = createNewGame()
    expect(() =>
      makeMove(state, {
        from:  sq(5, 7),
        to:    sq(5, 6),
        piece: { type: PieceType.PAWN_OF_KINGS, color: 'b' },
        flag:  MoveFlag.NORMAL,
      }),
    ).toThrow()
  })

  it('throws when move exposes own King to check (pinned piece)', () => {
    const state = emptyState()
    state.turn = 'w'
    // White King at (5,1), White Rook at (5,3) (on same file), Black Rook at (5,9)
    // The White Rook is pinned — moving it off file 5 exposes the King
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 3), wp(PieceType.ROOK))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    place(state, sq(10, 9), bp(PieceType.KING))
    state.whiteRoyals = [sq(5, 1)]
    state.blackRoyals = [sq(10, 9)]

    // Moving the pinned Rook off file 5 is illegal
    expect(() =>
      makeMove(state, {
        from:  sq(5, 3),
        to:    sq(3, 3),
        piece: { type: PieceType.ROOK, color: 'w' },
        flag:  MoveFlag.NORMAL,
      }),
    ).toThrow()
  })
})

// =============================================================================
// makeMove — PP stage transitions
// =============================================================================

describe('makeMove - PP stage transitions', () => {
  it('Stage 1: PP reaches back rank from UNPROMOTED → STAGE1_ON_BACK_RANK', () => {
    const state = emptyState()
    state.turn = 'w'
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(10, 9), bp(PieceType.KING))
    // White PP at (0,8): one step from rank 9 (white's back rank)
    place(state, sq(0, 8), wp(PieceType.PAWN_OF_PAWNS))
    state.whiteRoyals = [sq(0, 0)]
    state.blackRoyals = [sq(10, 9)]
    state.whitePawnOfPawnsStage = PawnOfPawnsStage.UNPROMOTED

    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm => lm.flag === MoveFlag.PAWN_OF_PAWNS_STAGE1_ARRIVAL)
    expect(m).toBeDefined()

    const next = makeMove(state, m!)
    expect(next.whitePawnOfPawnsStage).toBe(PawnOfPawnsStage.STAGE1_ON_BACK_RANK)
    expect(next.pieces.get('0,9')?.type).toBe(PieceType.PAWN_OF_PAWNS)
    expect(next.pieces.get('0,8')).toBeUndefined()
  })

  it('Stage 1 teleport: PP on back rank can teleport to threaten enemy', () => {
    const state = emptyState()
    state.turn = 'w'
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(10, 9), bp(PieceType.KING))
    // White PP sitting on back rank (Stage 1)
    place(state, sq(0, 9), wp(PieceType.PAWN_OF_PAWNS))
    // Black pawn at (5,6) — PP teleporting to (4,5) would threaten it diagonally
    place(state, sq(5, 6), bp(PieceType.PAWN_OF_KINGS))
    state.whiteRoyals = [sq(0, 0)]
    state.blackRoyals = [sq(10, 9)]
    state.whitePawnOfPawnsStage = PawnOfPawnsStage.STAGE1_ON_BACK_RANK

    const legalMoves = getAllLegalMoves('w', state)
    const teleportMoves = legalMoves.filter(lm => lm.flag === MoveFlag.PAWN_OF_PAWNS_TELEPORT)
    expect(teleportMoves.length).toBeGreaterThan(0)

    const m = teleportMoves[0]!
    const next = makeMove(state, m)
    expect(next.whitePawnOfPawnsStage).toBe(PawnOfPawnsStage.STAGE1_TELEPORTED)
    // PP is no longer on the back rank
    expect(next.pieces.get('0,9')).toBeUndefined()
  })

  it('Stage 2: PP reaches back rank with STAGE1_TELEPORTED → auto-relocates to STAGE2_RELOCATED', () => {
    const state = emptyState()
    state.turn = 'w'
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(10, 9), bp(PieceType.KING))
    // White PP at (0,8) with STAGE1_TELEPORTED
    place(state, sq(0, 8), wp(PieceType.PAWN_OF_PAWNS))
    state.whiteRoyals = [sq(0, 0)]
    state.blackRoyals = [sq(10, 9)]
    state.whitePawnOfPawnsStage = PawnOfPawnsStage.STAGE1_TELEPORTED

    const legalMoves = getAllLegalMoves('w', state)
    // Move generator now produces STAGE2_ARRIVAL flag for STAGE1_TELEPORTED PP
    const m = legalMoves.find(lm =>
      lm.from.file === 0 && lm.from.rank === 8 &&
      lm.to.rank === 9 &&
      lm.flag === MoveFlag.PAWN_OF_PAWNS_STAGE2_ARRIVAL,
    )
    expect(m).toBeDefined()

    const next = makeMove(state, m!)
    // PP auto-relocates after second back-rank arrival → STAGE2_RELOCATED
    expect(next.whitePawnOfPawnsStage).toBe(PawnOfPawnsStage.STAGE2_RELOCATED)
    // PP is no longer on the back rank (was relocated)
    expect(next.pieces.get('0,9')).toBeUndefined()
    // PP is somewhere on the board (relocated to mid-board)
    const ppEntry = [...next.pieces.entries()].find(([, p]) => p.type === PieceType.PAWN_OF_PAWNS && p.color === 'w')
    expect(ppEntry).toBeDefined()
  })

  it('Stage 3: PP reaches back rank with STAGE2_RELOCATED → becomes Adventitious King', () => {
    const state = emptyState()
    state.turn = 'w'
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(10, 9), bp(PieceType.KING))
    // White PP at (0,8) with STAGE2_RELOCATED
    place(state, sq(0, 8), wp(PieceType.PAWN_OF_PAWNS))
    state.whiteRoyals = [sq(0, 0)]
    state.blackRoyals = [sq(10, 9)]
    state.whitePawnOfPawnsStage = PawnOfPawnsStage.STAGE2_RELOCATED

    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm =>
      lm.from.file === 0 && lm.from.rank === 8 &&
      lm.to.rank === 9,
    )
    expect(m).toBeDefined()

    const next = makeMove(state, m!)
    // PP becomes Adventitious King
    expect(next.whitePawnOfPawnsStage).toBe(PawnOfPawnsStage.PROMOTED_TO_ADV_KING)
    expect(next.pieces.get('0,9')?.type).toBe(PieceType.ADVENTITIOUS_KING)
    // AK added to royals
    expect(next.whiteRoyals.some(r => r.file === 0 && r.rank === 9)).toBe(true)
  })
})

// =============================================================================
// undoMove
// =============================================================================

describe('undoMove', () => {
  it('throws when history is empty', () => {
    const state = createNewGame()
    expect(() => undoMove(state)).toThrow()
  })

  it('undoes a basic pawn move', () => {
    const state = createNewGame()
    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm =>
      lm.from.file === 5 && lm.from.rank === 2 &&
      lm.to.file   === 5 && lm.to.rank   === 3 &&
      lm.flag === MoveFlag.NORMAL,
    )!
    const next = makeMove(state, m)
    const restored = undoMove(next)

    expect(restored.pieces.get('5,2')?.type).toBe(PieceType.PAWN_OF_KINGS)
    expect(restored.pieces.get('5,3')).toBeUndefined()
    expect(restored.turn).toBe('w')
    expect(restored.history).toHaveLength(0)
    expect(restored.halfMoveCount).toBe(0)
  })

  it('undoes a capture and restores the captured piece', () => {
    const state = emptyState()
    state.turn = 'w'
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(10, 9), bp(PieceType.KING))
    place(state, sq(5, 5), wp(PieceType.ROOK))
    place(state, sq(5, 7), bp(PieceType.PAWN_OF_KINGS))
    state.whiteRoyals = [sq(0, 0)]
    state.blackRoyals = [sq(10, 9)]

    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm =>
      lm.flag === MoveFlag.CAPTURE &&
      lm.to.file === 5 && lm.to.rank === 7,
    )!
    const next = makeMove(state, m)
    const restored = undoMove(next)

    expect(restored.pieces.get('5,7')?.type).toBe(PieceType.PAWN_OF_KINGS)
    expect(restored.pieces.get('5,7')?.color).toBe('b')
    expect(restored.pieces.get('5,5')?.type).toBe(PieceType.ROOK)
    expect(restored.turn).toBe('w')
  })

  it('undoes a promotion and restores the pawn', () => {
    const state = emptyState()
    state.turn = 'w'
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(10, 9), bp(PieceType.KING))
    place(state, sq(5, 8), wp(PieceType.PAWN_OF_KINGS))
    state.whiteRoyals = [sq(0, 0)]
    state.blackRoyals = [sq(10, 9)]

    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm =>
      lm.flag === MoveFlag.PROMOTION &&
      lm.from.file === 5 && lm.from.rank === 8,
    )!
    const next = makeMove(state, m)
    const restored = undoMove(next)

    expect(restored.pieces.get('5,8')?.type).toBe(PieceType.PAWN_OF_KINGS)
    expect(restored.pieces.get('5,9')).toBeUndefined()
    expect(restored.turn).toBe('w')
  })

  it('undoes a Prince promotion and removes it from royals', () => {
    const state = emptyState()
    state.turn = 'w'
    place(state, sq(0, 0), wp(PieceType.KING))
    place(state, sq(10, 9), bp(PieceType.KING))
    place(state, sq(5, 8), wp(PieceType.PAWN_OF_KINGS))
    state.whiteRoyals = [sq(0, 0)]
    state.blackRoyals = [sq(10, 9)]

    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm =>
      lm.from.rank === 8 && lm.to.rank === 9 &&
      lm.promotionType === PieceType.PRINCE,
    )!
    const next = makeMove(state, m)
    expect(next.whiteRoyals).toHaveLength(2)  // King + Prince

    const restored = undoMove(next)
    expect(restored.whiteRoyals).toHaveLength(1)  // Only King
    expect(restored.whiteRoyals[0]).toEqual(sq(0, 0))
  })

  it('undoes a king swap and restores swap availability', () => {
    const state = emptyState()
    state.turn = 'w'
    place(state, sq(5, 1), wp(PieceType.KING))
    place(state, sq(5, 9), bp(PieceType.ROOK))
    place(state, sq(3, 5), wp(PieceType.ROOK))
    place(state, sq(10, 9), bp(PieceType.KING))
    state.whiteRoyals = [sq(5, 1)]
    state.blackRoyals = [sq(10, 9)]

    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm => lm.flag === MoveFlag.KING_SWAP)!
    const next = makeMove(state, m)
    const restored = undoMove(next)

    // King back at (5,1), Rook back at (3,5)
    expect(restored.pieces.get('5,1')?.type).toBe(PieceType.KING)
    expect(restored.pieces.get('3,5')?.type).toBe(PieceType.ROOK)
    expect(restored.whiteKingSwapUsed).toBe(false)
    expect(restored.turn).toBe('w')
  })

  it('does not mutate the state being undone', () => {
    const state = createNewGame()
    const legalMoves = getAllLegalMoves('w', state)
    const m = legalMoves.find(lm =>
      lm.from.file === 5 && lm.from.rank === 2 && lm.to.rank === 3,
    )!
    const next = makeMove(state, m)
    undoMove(next)

    // next still has the move applied
    expect(next.pieces.get('5,3')?.type).toBe(PieceType.PAWN_OF_KINGS)
    expect(next.history).toHaveLength(1)
  })
})

// =============================================================================
// Full game simulation
// =============================================================================

describe('full game simulation', () => {
  it('plays 10 half-moves and tracks state correctly', () => {
    let state = createNewGame()

    // 5 pairs of pawn pushes (alternating white/black)
    const movePairs: Array<{ wFrom: Square; wTo: Square; bFrom: Square; bTo: Square }> = [
      { wFrom: sq(5, 2), wTo: sq(5, 3), bFrom: sq(5, 7), bTo: sq(5, 6) },
      { wFrom: sq(4, 2), wTo: sq(4, 3), bFrom: sq(4, 7), bTo: sq(4, 6) },
      { wFrom: sq(6, 2), wTo: sq(6, 3), bFrom: sq(6, 7), bTo: sq(6, 6) },
      { wFrom: sq(3, 2), wTo: sq(3, 3), bFrom: sq(3, 7), bTo: sq(3, 6) },
      { wFrom: sq(7, 2), wTo: sq(7, 3), bFrom: sq(7, 7), bTo: sq(7, 6) },
    ]

    for (const pair of movePairs) {
      // White move
      const wMoves = getAllLegalMoves('w', state)
      const wm = wMoves.find(lm =>
        lm.from.file === pair.wFrom.file && lm.from.rank === pair.wFrom.rank &&
        lm.to.file   === pair.wTo.file   && lm.to.rank   === pair.wTo.rank &&
        lm.flag === MoveFlag.NORMAL,
      )
      expect(wm).toBeDefined()
      state = makeMove(state, wm!)

      // Black move
      const bMoves = getAllLegalMoves('b', state)
      const bm = bMoves.find(lm =>
        lm.from.file === pair.bFrom.file && lm.from.rank === pair.bFrom.rank &&
        lm.to.file   === pair.bTo.file   && lm.to.rank   === pair.bTo.rank &&
        lm.flag === MoveFlag.NORMAL,
      )
      expect(bm).toBeDefined()
      state = makeMove(state, bm!)
    }

    expect(state.halfMoveCount).toBe(10)
    expect(state.moveNumber).toBe(6)  // Starts at 1, increments after each black move
    expect(state.history).toHaveLength(10)
    expect(state.turn).toBe('w')
    expect(isGameOver(state)).toBe(false)
    expect(state.result).toBeNull()

    // Verify a moved pawn is in the right place
    expect(state.pieces.get('5,3')?.type).toBe(PieceType.PAWN_OF_KINGS)
    expect(state.pieces.get('5,6')?.type).toBe(PieceType.PAWN_OF_KINGS)
  })

  it('undoes all moves back to initial position', () => {
    let state = createNewGame()

    const wMoves = getAllLegalMoves('w', state)
    const m1 = wMoves.find(lm =>
      lm.from.file === 5 && lm.from.rank === 2 && lm.to.rank === 3 &&
      lm.flag === MoveFlag.NORMAL,
    )!
    state = makeMove(state, m1)

    const bMoves = getAllLegalMoves('b', state)
    const m2 = bMoves.find(lm =>
      lm.from.file === 5 && lm.from.rank === 7 && lm.to.rank === 6 &&
      lm.flag === MoveFlag.NORMAL,
    )!
    state = makeMove(state, m2)

    // Undo both moves
    state = undoMove(state)
    state = undoMove(state)

    expect(state.history).toHaveLength(0)
    expect(state.turn).toBe('w')
    expect(state.halfMoveCount).toBe(0)
    expect(state.moveNumber).toBe(1)
    expect(state.pieces.get('5,2')?.type).toBe(PieceType.PAWN_OF_KINGS)
    expect(state.pieces.get('5,7')?.type).toBe(PieceType.PAWN_OF_KINGS)
    expect(state.pieces.get('5,3')).toBeUndefined()
    expect(state.pieces.get('5,6')).toBeUndefined()
  })

  it('result stays null throughout normal play', () => {
    let state = createNewGame()

    const wm = getAllLegalMoves('w', state).find(lm =>
      lm.from.rank === 2 && lm.flag === MoveFlag.NORMAL,
    )!
    state = makeMove(state, wm)
    expect(state.result).toBeNull()

    const bm = getAllLegalMoves('b', state).find(lm =>
      lm.from.rank === 7 && lm.flag === MoveFlag.NORMAL,
    )!
    state = makeMove(state, bm)
    expect(state.result).toBeNull()
  })
})
