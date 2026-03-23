// =============================================================================
// TAMERLANE SIEGE — Game Orchestration
// Section 4.8 of PRODUCTION_PLAN.md
//
// RULES: No imports from outside src/core/. Pure TypeScript only.
//        All functions are pure — no mutation, no side effects.
//
// This module is the top-level game loop. It ties together move generation,
// legality checking, and all special rule handlers into one coherent API.
//
// Public API:
//   createNewGame()         → GameState
//   makeMove(state, move)   → GameState  (throws on illegal move)
//   undoMove(state)         → GameState  (throws if no history)
//   isGameOver(state)       → boolean
// =============================================================================

import {
  type Color,
  type Square,
  type Piece,
  type GameState,
  type Move,
  PieceType,
  MoveFlag,
  PawnOfPawnsStage,
} from './types'
import {
  squareToKey,
  keyToSquare,
  squaresEqual,
  isRoyalType,
  createInitialGameState,
} from './board'
import {
  handlePawnOfPawnsArrival,
  relocatePawnOfPawns,
} from './pawnOfPawns'
import { handleCitadelEntry } from './citadel'
import { applyKingSwap } from './kingSwap'
import { getAllLegalMoves, getGameResult } from './rules'

// =============================================================================
// Internal: Immutable State Clone
// =============================================================================

function cloneState(state: GameState): GameState {
  return {
    ...state,
    pieces:      new Map(state.pieces),
    whiteRoyals: [...state.whiteRoyals],
    blackRoyals: [...state.blackRoyals],
    history:     [...state.history],
  }
}

// =============================================================================
// Internal: Move Validation
// =============================================================================

/**
 * Returns true if the candidate move matches one of the legal moves.
 * Matches on: from, to, flag, promotionType.
 */
function isLegalMove(candidate: Move, legalMoves: Move[]): boolean {
  return legalMoves.some(
    m =>
      squaresEqual(m.from, candidate.from) &&
      squaresEqual(m.to, candidate.to) &&
      m.flag === candidate.flag &&
      m.promotionType === candidate.promotionType,
  )
}

// =============================================================================
// Internal: Find PP on Board (for Stage2 undo)
// =============================================================================

function findPawnOfPawns(color: Color, state: GameState): Square | null {
  for (const [key, piece] of state.pieces) {
    if (piece.type === PieceType.PAWN_OF_PAWNS && piece.color === color) {
      return keyToSquare(key)
    }
  }
  return null
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Creates a fresh game in the standard Tamerlane starting position.
 */
export function createNewGame(): GameState {
  return createInitialGameState()
}

/**
 * Returns true if the game has ended (result is set).
 */
export function isGameOver(state: GameState): boolean {
  return state.result !== null
}

/**
 * Applies the given move to the state and returns a new GameState.
 *
 * Throws an Error if the move is illegal (not in getAllLegalMoves for
 * the current player). Pass the move objects produced by getAllLegalMoves
 * or generateMovesForPiece to avoid validation overhead.
 *
 * NOTE: Validation via getAllLegalMoves is O(pieces × moves²) per call.
 * For performance-critical paths (AI search), bypass validation by using
 * applyMoveUnchecked (if exposed) or trusting the caller's legality guarantee.
 *
 * Processing order:
 *   a) Validate legality
 *   b) Apply board changes (delegating to specialised handlers)
 *   c) Switch turn, update counters, append to history
 *   d) Compute game result
 */
export function makeMove(state: GameState, move: Move): GameState {
  // (a) Validate
  const legalMoves = getAllLegalMoves(state.turn, state)
  if (!isLegalMove(move, legalMoves)) {
    throw new Error(
      `makeMove: illegal move ${JSON.stringify(move)} for ${state.turn}`,
    )
  }

  // (b) Apply — each flag delegates to the appropriate handler
  let s: GameState

  switch (move.flag) {
    case MoveFlag.KING_SWAP:
      s = applyKingSwap(move, cloneState(state))
      break

    case MoveFlag.CITADEL_ENTRY:
    case MoveFlag.CITADEL_DEFENSE:
      s = handleCitadelEntry(move, state)
      break

    case MoveFlag.PAWN_OF_PAWNS_STAGE1_ARRIVAL: {
      // PP reaches back rank for the FIRST time (UNPROMOTED → STAGE1_ON_BACK_RANK).
      // Second and third back-rank arrivals are flagged STAGE2_ARRIVAL / STAGE3_PROMOTION
      // by pawns.ts (buildBackRankMove inspects the current PP stage).
      s = cloneState(state)
      s.pieces.delete(squareToKey(move.from))
      if (move.captured) handleCapturedRoyal(move.to, move.captured, s)
      s.pieces.set(squareToKey(move.to), move.piece)
      s = handlePawnOfPawnsArrival(move.piece.color, s) // UNPROMOTED → STAGE1_ON_BACK_RANK
      break
    }

    case MoveFlag.PAWN_OF_PAWNS_TELEPORT: {
      // PP teleports from back rank to new square; displaced piece is removed
      s = cloneState(state)
      s.pieces.delete(squareToKey(move.from))
      // Displaced friendly piece at move.to is removed (off board)
      s.pieces.delete(squareToKey(move.to))
      s.pieces.set(squareToKey(move.to), move.piece)
      // Transition: STAGE1_ON_BACK_RANK → STAGE1_TELEPORTED
      if (move.piece.color === 'w') s.whitePawnOfPawnsStage = PawnOfPawnsStage.STAGE1_TELEPORTED
      else                          s.blackPawnOfPawnsStage = PawnOfPawnsStage.STAGE1_TELEPORTED
      break
    }

    case MoveFlag.PAWN_OF_PAWNS_STAGE2_ARRIVAL: {
      // PP reaches back rank second time → stage2 arrival → auto-relocation
      s = cloneState(state)
      s.pieces.delete(squareToKey(move.from))
      if (move.captured) handleCapturedRoyal(move.to, move.captured, s)
      s.pieces.set(squareToKey(move.to), move.piece)
      s = handlePawnOfPawnsArrival(move.piece.color, s) // → STAGE2_ON_BACK_RANK
      const { newState } = relocatePawnOfPawns(move.piece.color, s)  // → STAGE2_RELOCATED
      s = newState
      break
    }

    case MoveFlag.PAWN_OF_PAWNS_STAGE3_PROMOTION: {
      // PP reaches back rank third time → becomes Adventitious King
      s = cloneState(state)
      s.pieces.delete(squareToKey(move.from))
      if (move.captured) handleCapturedRoyal(move.to, move.captured, s)
      s.pieces.set(squareToKey(move.to), move.piece)
      s = handlePawnOfPawnsArrival(move.piece.color, s) // → PROMOTED_TO_ADV_KING (adds AK to royals)
      break
    }

    case MoveFlag.PROMOTION: {
      s = cloneState(state)
      s.pieces.delete(squareToKey(move.from))
      if (move.captured) handleCapturedRoyal(move.to, move.captured, s)
      const promoted: Piece = { type: move.promotionType!, color: move.piece.color }
      s.pieces.set(squareToKey(move.to), promoted)
      // If promoted to Prince (royal), add to royals list
      if (move.promotionType === PieceType.PRINCE) {
        if (move.piece.color === 'w') s.whiteRoyals = [...s.whiteRoyals, move.to]
        else                          s.blackRoyals = [...s.blackRoyals, move.to]
      }
      break
    }

    case MoveFlag.NORMAL:
    case MoveFlag.CAPTURE:
    default: {
      s = cloneState(state)
      s.pieces.delete(squareToKey(move.from))
      if (move.captured) handleCapturedRoyal(move.to, move.captured, s)
      s.pieces.set(squareToKey(move.to), move.piece)
      break
    }
  }

  // (c) Turn, counters, history
  const movingColor = move.piece.color
  s.turn = movingColor === 'w' ? 'b' : 'w'
  s.halfMoveCount++
  if (movingColor === 'b') s.moveNumber++
  s.history = [...s.history, move]

  // (d) Game result (citadel entry sets result inside handler, also check here)
  if (s.result === null) {
    const result = getGameResult(s)
    if (result !== null) s.result = result
  }

  return s
}

/**
 * Undoes the last move in state.history and returns the previous GameState.
 *
 * Throws if history is empty.
 *
 * All special move types are reversed:
 *   NORMAL / CAPTURE: piece moves back, captured piece restored
 *   PROMOTION: promoted piece removed, pawn restored
 *   KING_SWAP: pieces swapped back, kingSwapUsed = false
 *   PP_TELEPORT: PP returned to back rank, displaced piece restored
 *   PP_STAGE1_ARRIVAL: PP returned to move.from, stage = UNPROMOTED
 *   PP_STAGE2_ARRIVAL: relocated PP found and removed, PP at move.from, stage = STAGE1_TELEPORTED
 *   PP_STAGE3_PROMOTION: AK removed from back rank, PP at move.from, stage = STAGE2_RELOCATED
 *   CITADEL_ENTRY: piece returned to board, result cleared
 *   CITADEL_DEFENSE: AK returned to board, citadelOccupant cleared
 */
export function undoMove(state: GameState): GameState {
  if (state.history.length === 0) {
    throw new Error('undoMove: no moves in history to undo')
  }

  const s = cloneState(state)
  const move = s.history[s.history.length - 1]
  s.history = s.history.slice(0, -1)

  // Reverse counters and turn
  const movingColor = move.piece.color
  s.turn = movingColor
  s.halfMoveCount--
  if (movingColor === 'b') s.moveNumber--

  // Clear game result (it was computed from the post-move state)
  s.result = null

  // Reverse board changes
  switch (move.flag) {
    case MoveFlag.NORMAL:
    case MoveFlag.CAPTURE: {
      s.pieces.delete(squareToKey(move.to))
      s.pieces.set(squareToKey(move.from), move.piece)
      if (move.captured) {
        s.pieces.set(squareToKey(move.to), move.captured)
        restoreRoyalIfNeeded(move.to, move.captured, movingColor, s)
      }
      break
    }

    case MoveFlag.PROMOTION: {
      // Remove promoted piece, restore pawn
      s.pieces.delete(squareToKey(move.to))
      s.pieces.set(squareToKey(move.from), move.piece)
      if (move.captured) {
        s.pieces.set(squareToKey(move.to), move.captured)
        restoreRoyalIfNeeded(move.to, move.captured, movingColor, s)
      }
      // Remove Prince from royals if it was just added
      if (move.promotionType === PieceType.PRINCE) {
        removeSquareFromRoyals(move.to, movingColor, s)
      }
      break
    }

    case MoveFlag.KING_SWAP: {
      // After swap: King at move.to, swapped piece at move.from — swap back
      const kingPiece    = s.pieces.get(squareToKey(move.to))
      const swappedPiece = s.pieces.get(squareToKey(move.from))
      if (kingPiece)    s.pieces.set(squareToKey(move.from), kingPiece)
      else              s.pieces.delete(squareToKey(move.from))
      if (swappedPiece) s.pieces.set(squareToKey(move.to), swappedPiece)
      else              s.pieces.delete(squareToKey(move.to))
      // Restore swap availability
      if (movingColor === 'w') s.whiteKingSwapUsed = false
      else                     s.blackKingSwapUsed = false
      break
    }

    case MoveFlag.PAWN_OF_PAWNS_STAGE1_ARRIVAL: {
      s.pieces.delete(squareToKey(move.to))
      s.pieces.set(squareToKey(move.from), move.piece)
      if (move.captured) {
        s.pieces.set(squareToKey(move.to), move.captured)
        restoreRoyalIfNeeded(move.to, move.captured, movingColor, s)
      }
      if (movingColor === 'w') s.whitePawnOfPawnsStage = PawnOfPawnsStage.UNPROMOTED
      else                     s.blackPawnOfPawnsStage = PawnOfPawnsStage.UNPROMOTED
      break
    }

    case MoveFlag.PAWN_OF_PAWNS_TELEPORT: {
      // PP is at move.to, was at move.from (back rank); displaced piece was at move.to
      s.pieces.delete(squareToKey(move.to))
      s.pieces.set(squareToKey(move.from), move.piece)
      if (move.displaced) {
        s.pieces.set(squareToKey(move.to), move.displaced)
      }
      if (movingColor === 'w') s.whitePawnOfPawnsStage = PawnOfPawnsStage.STAGE1_ON_BACK_RANK
      else                     s.blackPawnOfPawnsStage = PawnOfPawnsStage.STAGE1_ON_BACK_RANK
      break
    }

    case MoveFlag.PAWN_OF_PAWNS_STAGE2_ARRIVAL: {
      // PP was auto-relocated after stage2 arrival; find it on board and remove it
      const ppSquare = findPawnOfPawns(movingColor, s)
      if (ppSquare !== null) s.pieces.delete(squareToKey(ppSquare))
      s.pieces.set(squareToKey(move.from), move.piece)
      if (move.captured) {
        s.pieces.set(squareToKey(move.to), move.captured)
        restoreRoyalIfNeeded(move.to, move.captured, movingColor, s)
      }
      if (movingColor === 'w') s.whitePawnOfPawnsStage = PawnOfPawnsStage.STAGE1_TELEPORTED
      else                     s.blackPawnOfPawnsStage = PawnOfPawnsStage.STAGE1_TELEPORTED
      break
    }

    case MoveFlag.PAWN_OF_PAWNS_STAGE3_PROMOTION: {
      // AK is at move.to; restore PP at move.from
      s.pieces.delete(squareToKey(move.to))
      s.pieces.set(squareToKey(move.from), move.piece) // PP
      if (move.captured) {
        s.pieces.set(squareToKey(move.to), move.captured)
        restoreRoyalIfNeeded(move.to, move.captured, movingColor, s)
      }
      // Remove AK square from royals
      removeSquareFromRoyals(move.to, movingColor, s)
      if (movingColor === 'w') s.whitePawnOfPawnsStage = PawnOfPawnsStage.STAGE2_RELOCATED
      else                     s.blackPawnOfPawnsStage = PawnOfPawnsStage.STAGE2_RELOCATED
      break
    }

    case MoveFlag.CITADEL_ENTRY: {
      s.pieces.delete(squareToKey(move.to))
      s.pieces.set(squareToKey(move.from), move.piece)
      // result already cleared above
      break
    }

    case MoveFlag.CITADEL_DEFENSE: {
      s.pieces.delete(squareToKey(move.to))
      s.pieces.set(squareToKey(move.from), move.piece)
      if (movingColor === 'w') s.whiteCitadelOccupant = null
      else                     s.blackCitadelOccupant = null
      break
    }

    default: {
      const _exhaustive: never = move.flag
      throw new Error(`undoMove: unhandled flag ${String(_exhaustive)}`)
    }
  }

  return s
}

// =============================================================================
// Internal: Royal List Helpers
// =============================================================================

/**
 * If `captured` is a royal piece belonging to the opponent of `movingColor`,
 * remove its square from the opponent's royals list.
 */
function handleCapturedRoyal(
  capturedSq: Square,
  captured: Piece,
  s: GameState,
): void {
  if (!isRoyalType(captured.type)) return
  removeSquareFromRoyals(capturedSq, captured.color, s)
}

/**
 * Removes a square from the given color's royals list (mutates s).
 */
function removeSquareFromRoyals(sq: Square, color: Color, s: GameState): void {
  if (color === 'w') {
    s.whiteRoyals = s.whiteRoyals.filter(r => !squaresEqual(r, sq))
  } else {
    s.blackRoyals = s.blackRoyals.filter(r => !squaresEqual(r, sq))
  }
}

/**
 * After an undo, if `piece` is a royal belonging to the opponent of `movingColor`,
 * add its square back to the opponent's royals list.
 */
function restoreRoyalIfNeeded(
  sq: Square,
  piece: Piece,
  _movingColor: Color,
  s: GameState,
): void {
  if (!isRoyalType(piece.type)) return
  if (piece.color === 'w') {
    if (!s.whiteRoyals.some(r => squaresEqual(r, sq))) {
      s.whiteRoyals = [...s.whiteRoyals, sq]
    }
  } else {
    if (!s.blackRoyals.some(r => squaresEqual(r, sq))) {
      s.blackRoyals = [...s.blackRoyals, sq]
    }
  }
}
