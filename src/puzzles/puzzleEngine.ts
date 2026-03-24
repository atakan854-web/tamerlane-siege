// =============================================================================
// TAMERLANE SIEGE — Puzzle Engine
// src/puzzles/puzzleEngine.ts
//
// State machine for puzzle move validation. Compares user moves against
// pre-defined algebraic solutions. Auto-applies Black responses.
// =============================================================================

import type { GameState, Move } from '../core/types'
import { tFENtoState, moveToAlgebraic } from '../core/notation'
import { makeMove } from '../core/game'
import { getAllLegalMoves } from '../core/rules'
import type { PuzzleData } from './puzzleData'

// =============================================================================
// Puzzle State
// =============================================================================

export type PuzzleStatus = 'playing' | 'solved' | 'failed'

export interface PuzzleState {
  puzzle:           PuzzleData
  gameState:        GameState
  currentMoveIndex: number       // index into solutionMoves[]
  status:           PuzzleStatus
  moveCount:        number       // White moves made
  wrongMove:        boolean      // flash indicator for wrong move
}

// =============================================================================
// Start a puzzle
// =============================================================================

export function startPuzzle(puzzle: PuzzleData): PuzzleState {
  return {
    puzzle,
    gameState: tFENtoState(puzzle.tfen),
    currentMoveIndex: 0,
    status: 'playing',
    moveCount: 0,
    wrongMove: false,
  }
}

// =============================================================================
// Process a user move (White's turn)
// =============================================================================

export function processPuzzleMove(
  ps: PuzzleState,
  move: Move,
): PuzzleState {
  if (ps.status !== 'playing') return ps

  const expected = ps.puzzle.solutionMoves[ps.currentMoveIndex]
  if (!expected) return ps

  // Convert the attempted move to algebraic (state BEFORE the move)
  const algebraic = moveToAlgebraic(move, ps.gameState)

  // Strip check/checkmate suffixes for comparison (solution may or may not include them)
  const normalize = (s: string) => s.replace(/[+#]/g, '')

  if (normalize(algebraic) !== normalize(expected)) {
    // Wrong move — indicate failure but let them retry
    return { ...ps, wrongMove: true }
  }

  // Correct move — apply it
  let newState = makeMove(ps.gameState, move)
  let nextIndex = ps.currentMoveIndex + 1
  const newMoveCount = ps.moveCount + 1

  // Check if puzzle is solved (no more moves in solution)
  if (nextIndex >= ps.puzzle.solutionMoves.length) {
    return {
      ...ps,
      gameState: newState,
      currentMoveIndex: nextIndex,
      status: 'solved',
      moveCount: newMoveCount,
      wrongMove: false,
    }
  }

  // Auto-apply Black's response (odd-indexed moves)
  const blackAlgebraic = ps.puzzle.solutionMoves[nextIndex]
  if (blackAlgebraic && newState.turn === 'b') {
    const blackMoves = getAllLegalMoves('b', newState)
    const blackMove = findMoveByAlgebraic(blackMoves, blackAlgebraic, newState)

    if (blackMove) {
      newState = makeMove(newState, blackMove)
      nextIndex++
    }
    // If we can't find the black move, just continue — puzzle data error
  }

  // Check again if solved after black's response
  if (nextIndex >= ps.puzzle.solutionMoves.length) {
    return {
      ...ps,
      gameState: newState,
      currentMoveIndex: nextIndex,
      status: 'solved',
      moveCount: newMoveCount,
      wrongMove: false,
    }
  }

  return {
    ...ps,
    gameState: newState,
    currentMoveIndex: nextIndex,
    status: 'playing',
    moveCount: newMoveCount,
    wrongMove: false,
  }
}

// =============================================================================
// Get puzzle hint
// =============================================================================

export function getPuzzleHint(ps: PuzzleState): string {
  if (ps.status === 'solved') return 'Puzzle solved!'
  if (ps.currentMoveIndex < ps.puzzle.solutionMoves.length) {
    return ps.puzzle.hintText
  }
  return ''
}

// =============================================================================
// Find a legal move matching algebraic notation
// =============================================================================

function findMoveByAlgebraic(
  legalMoves: Move[],
  targetAlgebraic: string,
  state: GameState,
): Move | undefined {
  const normalize = (s: string) => s.replace(/[+#]/g, '')
  const target = normalize(targetAlgebraic)

  return legalMoves.find(m => {
    const alg = normalize(moveToAlgebraic(m, state))
    return alg === target
  })
}
