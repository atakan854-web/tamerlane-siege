// =============================================================================
// TAMERLANE SIEGE — Tutorial Engine
// src/tutorial/TutorialEngine.ts
//
// State machine that manages tutorial lesson gameplay.
// Uses the real game engine (tFENtoState, makeMove, getAllLegalMoves)
// but intercepts Black's turn based on the lesson's blackBehavior setting.
// =============================================================================

import { type GameState, type Move, GameResult, PawnOfPawnsStage } from '../core/types'
import { tFENtoState } from '../core/notation'
import { makeMove } from '../core/game'
import { getAllLegalMoves } from '../core/rules'
import type { TutorialLesson, WinCondition } from './lessons'

// =============================================================================
// Tutorial State
// =============================================================================

export interface TutorialState {
  lesson: TutorialLesson
  gameState: GameState
  moveCount: number          // number of White moves made
  completed: boolean         // win condition met
  currentHintIndex: number   // which hint is being shown
}

// =============================================================================
// Start a lesson — parse TFEN and initialize state
// =============================================================================

export function startLesson(lesson: TutorialLesson): TutorialState {
  const gameState = tFENtoState(lesson.tfen)
  return {
    lesson,
    gameState,
    moveCount: 0,
    completed: false,
    currentHintIndex: 0,
  }
}

// =============================================================================
// Process a move from the player (White)
// =============================================================================

export function processTutorialMove(
  tutState: TutorialState,
  move: Move,
): TutorialState {
  if (tutState.completed) return tutState

  // Apply White's move via the real engine
  let newGameState = makeMove(tutState.gameState, move)
  const newMoveCount = tutState.moveCount + 1

  // Check win condition after White's move
  const won = checkWinCondition(
    tutState.lesson.winCondition,
    newGameState,
    newMoveCount,
  )

  if (won) {
    return {
      ...tutState,
      gameState: newGameState,
      moveCount: newMoveCount,
      completed: true,
    }
  }

  // Handle Black's turn
  if (newGameState.result === null) {
    if (tutState.lesson.blackBehavior === 'skip') {
      // Skip Black's turn — flip back to White
      newGameState = {
        ...newGameState,
        turn: 'w',
        result: null,
      }
    } else {
      // randomMove — pick a random legal move for Black
      const blackMoves = getAllLegalMoves('b', newGameState)
      if (blackMoves.length > 0) {
        const randomIdx = Math.floor(Math.random() * blackMoves.length)
        newGameState = makeMove(newGameState, blackMoves[randomIdx])
      }
      // If Black has no legal moves, game result is already set by makeMove
    }
  }

  // Check win condition again after Black's response
  const wonAfterBlack = checkWinCondition(
    tutState.lesson.winCondition,
    newGameState,
    newMoveCount,
  )

  return {
    ...tutState,
    gameState: newGameState,
    moveCount: newMoveCount,
    completed: wonAfterBlack,
  }
}

// =============================================================================
// Get current hint text
// =============================================================================

export function getCurrentHint(tutState: TutorialState): string {
  const hints = tutState.lesson.hints
  if (hints.length === 0) return ''
  return hints[tutState.currentHintIndex % hints.length]
}

// =============================================================================
// Cycle to next hint
// =============================================================================

export function nextHint(tutState: TutorialState): TutorialState {
  const hints = tutState.lesson.hints
  if (hints.length <= 1) return tutState
  return {
    ...tutState,
    currentHintIndex: (tutState.currentHintIndex + 1) % hints.length,
  }
}

// =============================================================================
// Win condition check
// =============================================================================

function checkWinCondition(
  condition: WinCondition,
  state: GameState,
  moveCount: number,
): boolean {
  switch (condition.kind) {
    case 'checkmate':
      // White wins by checkmate or stalemate (both are wins in Tamerlane)
      return state.result === 'w_mate' || state.result === 'w_stalemate'

    case 'allCaptured': {
      // Check if all non-King black pieces are gone
      for (const [, piece] of state.pieces) {
        if (piece.color === 'b' && piece.type !== 'K') {
          return false
        }
      }
      return true
    }

    case 'movesComplete':
      return moveCount >= condition.count

    case 'citadelEntry':
      // White highest royal entered Black citadel — draw triggered
      return state.result === GameResult.DRAW_CITADEL

    case 'ppStage1':
      // White Pawn of Pawns has reached the back rank at least once
      return state.whitePawnOfPawnsStage >= PawnOfPawnsStage.STAGE1_ON_BACK_RANK

    default:
      return false
  }
}
