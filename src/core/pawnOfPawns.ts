// =============================================================================
// TAMERLANE SIEGE — Pawn of Pawns: 3-Stage Promotion Logic
// Section 4.4 of PRODUCTION_PLAN.md
//
// RULES: No imports from outside src/core/. Pure TypeScript only.
//        All functions are pure — no mutation, no side effects.
//
// The Pawn of Pawns (pp) is the most complex piece in Tamerlane Chess.
// It progresses through three distinct promotion stages:
//
//   Stage 0 (UNPROMOTED):         Moves as a normal pawn.
//   Stage 1 (STAGE1_ON_BACK_RANK): Sits on opponent's back rank — immobile
//                                   and invincible. Owner may teleport it.
//   Stage 1 (STAGE1_TELEPORTED):  Back in play as a normal pawn.
//   Stage 2 (STAGE2_ON_BACK_RANK): Reaches back rank a second time —
//                                   then automatically relocates.
//   Stage 2 (STAGE2_RELOCATED):   Relocated to Pawn of Kings starting square.
//   Stage 3 (PROMOTED_TO_ADV_KING): Reaches back rank a third time →
//                                   becomes the Adventitious King.
//
// RULE_AMBIGUITY: Teleport requires ≥1 enemy pawn-capture threat (MVP).
// Strict fork / escape-impossible conditions are not enforced here.
// =============================================================================

import {
  type Color,
  type Square,
  type Piece,
  type GameState,
  type Move,
  PieceType,
  PawnOfPawnsStage,
  MoveFlag,
} from './types'
import { isMainBoard, getPiece, squaresEqual, squareToKey } from './board'
import { FILES, RANKS, WHITE_PAWN_OF_KINGS_START, BLACK_PAWN_OF_KINGS_START } from './constants'

// =============================================================================
// Internal: Immutable State Clone
// =============================================================================

/**
 * Returns a shallow-cloned GameState suitable for pure transformations.
 * Pieces Map and royal arrays are cloned; Piece records are immutable.
 */
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
// State Query Helpers
// =============================================================================

/**
 * Returns the current Pawn of Pawns stage for the given color.
 */
export function getPawnOfPawnsStage(color: Color, state: GameState): PawnOfPawnsStage {
  return color === 'w' ? state.whitePawnOfPawnsStage : state.blackPawnOfPawnsStage
}

/**
 * Returns the square occupied by the Pawn of Pawns of the given color,
 * or null if it is not on the board (captured before Stage 1, or already
 * promoted to Adventitious King and replaced on the board).
 */
export function getPawnOfPawnsSquare(color: Color, state: GameState): Square | null {
  for (const [key, piece] of state.pieces) {
    if (piece.type === PieceType.PAWN_OF_PAWNS && piece.color === color) {
      const [fileStr, rankStr] = key.split(',')
      return { file: parseInt(fileStr, 10), rank: parseInt(rankStr, 10) }
    }
  }
  return null
}

/**
 * Returns true if the piece on the given square is a Pawn of Pawns currently
 * in Stage 1 (sitting immobile on the back rank).
 */
export function isImmobile(square: Square, state: GameState): boolean {
  const piece = getPiece(state.pieces, square)
  if (piece === null || piece.type !== PieceType.PAWN_OF_PAWNS) return false
  const stage = getPawnOfPawnsStage(piece.color, state)
  return stage === PawnOfPawnsStage.STAGE1_ON_BACK_RANK
}

/**
 * Returns true if the piece on the given square is invincible — i.e. a Pawn
 * of Pawns currently in Stage 1. No piece may capture it while it sits there.
 *
 * Called by moves.ts to filter capture moves targeting this square.
 */
export function isInvincible(square: Square, state: GameState): boolean {
  return isImmobile(square, state)
}

// =============================================================================
// Internal: Teleport Threat Check
// =============================================================================

/**
 * Returns true if a Pawn of Pawns of the given color, hypothetically placed at
 * `dest`, would threaten ≥1 enemy piece with a pawn-capture move.
 *
 * Pawn-capture direction: diagonally 1 square forward
 *   White → rank+1, Black → rank-1
 */
function ppThreatensSomeEnemy(dest: Square, color: Color, state: GameState): boolean {
  const forwardDr = color === 'w' ? 1 : -1
  for (const df of [-1, 1]) {
    const threatened: Square = { file: dest.file + df, rank: dest.rank + forwardDr }
    if (!isMainBoard(threatened)) continue
    const target = getPiece(state.pieces, threatened)
    if (target !== null && target.color !== color) return true
  }
  return false
}

// =============================================================================
// Stage Transitions
// =============================================================================

/**
 * Applies the stage transition that occurs when the Pawn of Pawns reaches the
 * back rank. Called by makeMove (game.ts) after a PAWN_OF_PAWNS_STAGE1_ARRIVAL
 * move (or subsequent back-rank arrivals in later stages).
 *
 * Transitions:
 *   UNPROMOTED        → STAGE1_ON_BACK_RANK   (first arrival)
 *   STAGE1_TELEPORTED → STAGE2_ON_BACK_RANK   (second arrival)
 *   STAGE2_RELOCATED  → PROMOTED_TO_ADV_KING  (third arrival — promotes)
 *
 * For Stage 3, automatically calls promotePawnOfPawnsToAdventitious using
 * the PP's current board position as found by getPawnOfPawnsSquare.
 *
 * Returns a new GameState; does not mutate the input.
 */
export function handlePawnOfPawnsArrival(color: Color, state: GameState): GameState {
  const stage = getPawnOfPawnsStage(color, state)

  if (stage === PawnOfPawnsStage.UNPROMOTED) {
    const s = cloneState(state)
    if (color === 'w') s.whitePawnOfPawnsStage = PawnOfPawnsStage.STAGE1_ON_BACK_RANK
    else               s.blackPawnOfPawnsStage = PawnOfPawnsStage.STAGE1_ON_BACK_RANK
    return s
  }

  if (stage === PawnOfPawnsStage.STAGE1_TELEPORTED) {
    const s = cloneState(state)
    if (color === 'w') s.whitePawnOfPawnsStage = PawnOfPawnsStage.STAGE2_ON_BACK_RANK
    else               s.blackPawnOfPawnsStage = PawnOfPawnsStage.STAGE2_ON_BACK_RANK
    return s
  }

  if (stage === PawnOfPawnsStage.STAGE2_RELOCATED) {
    const ppSquare = getPawnOfPawnsSquare(color, state)
    if (ppSquare === null) {
      throw new Error(`handlePawnOfPawnsArrival(${color}): PP not found on board for Stage 3`)
    }
    return promotePawnOfPawnsToAdventitious(ppSquare, color, state)
  }

  throw new Error(
    `handlePawnOfPawnsArrival(${color}): unexpected stage ${String(stage)} ` +
    `(expected UNPROMOTED, STAGE1_TELEPORTED, or STAGE2_RELOCATED)`,
  )
}

// =============================================================================
// Teleport Move Generation (Stage 1)
// =============================================================================

/**
 * Generates all valid teleport destinations for the Pawn of Pawns in Stage 1.
 *
 * The PP sits immobile on the back rank. On the owner's turn, they may teleport
 * it to any main-board square from which it would threaten ≥1 enemy piece.
 *
 * Rules per PRODUCTION_PLAN.md §4.4:
 *   - Destination must be on the main board (not a citadel).
 *   - Destination cannot be the PP's current square.
 *   - Destination occupied by an enemy piece → illegal (PP does not capture
 *     on arrival; it arrives and THEN threatens with pawn moves).
 *   - Destination occupied by a friendly King → illegal.
 *   - Destination occupied by a friendly non-King → legal; piece is displaced
 *     (recorded in Move.displaced; fate handled by game.ts).
 *   - From destination, PP must threaten ≥1 enemy via pawn capture.
 *
 * All valid destinations produce Move with flag = PAWN_OF_PAWNS_TELEPORT.
 *
 * RULE_AMBIGUITY: MVP simplification — strict fork / escape-impossible
 * conditions are not required. ≥1 threatened enemy is sufficient.
 */
export function generatePawnOfPawnsTeleportMoves(color: Color, state: GameState): Move[] {
  const moves: Move[] = []
  const fromSq = getPawnOfPawnsSquare(color, state)
  if (fromSq === null) return []

  const piece: Piece = { type: PieceType.PAWN_OF_PAWNS, color }

  for (let file = 0; file < FILES; file++) {
    for (let rank = 0; rank < RANKS; rank++) {
      const dest: Square = { file, rank }

      // Cannot stay at current location
      if (squaresEqual(dest, fromSq)) continue

      const occupant = getPiece(state.pieces, dest)

      // Enemy at destination → PP does not capture on teleport
      if (occupant !== null && occupant.color !== color) continue

      // Friendly King at destination → illegal displacement
      if (
        occupant !== null &&
        occupant.color === color &&
        occupant.type === PieceType.KING
      ) continue

      // Must threaten at least one enemy from destination
      if (!ppThreatensSomeEnemy(dest, color, state)) continue

      // Valid — build move
      if (occupant !== null) {
        // Friendly non-King piece gets displaced
        moves.push({
          from: fromSq,
          to: dest,
          piece,
          displaced: occupant,
          flag: MoveFlag.PAWN_OF_PAWNS_TELEPORT,
        })
      } else {
        moves.push({ from: fromSq, to: dest, piece, flag: MoveFlag.PAWN_OF_PAWNS_TELEPORT })
      }
    }
  }

  return moves
}

// =============================================================================
// Stage 2: Relocation
// =============================================================================

/**
 * Relocates the Pawn of Pawns after its second back-rank arrival.
 *
 * Target: the Pawn of Kings starting square for the given color.
 *   White → { file: 5, rank: 2 }
 *   Black → { file: 5, rank: 7 }
 *
 * If the target square is occupied, the search expands outward on the same
 * rank (alternating left/right from file 5): 5, 4, 6, 3, 7, 2, 8, 1, 9, 0, 10.
 *
 * Returns the chosen square and a new GameState with PP relocated and stage
 * set to STAGE2_RELOCATED.
 *
 * Throws if every square on the rank is occupied (should never happen in play).
 */
export function relocatePawnOfPawns(
  color: Color,
  state: GameState,
): { square: Square; newState: GameState } {
  const fromSq = getPawnOfPawnsSquare(color, state)
  if (fromSq === null) {
    throw new Error(`relocatePawnOfPawns(${color}): PP not found on board`)
  }

  const targetBase = color === 'w' ? WHITE_PAWN_OF_KINGS_START : BLACK_PAWN_OF_KINGS_START
  const targetRank = targetBase.rank

  // Expansion: file 5 first, then alternating left/right
  const fileOrder = [5, 4, 6, 3, 7, 2, 8, 1, 9, 0, 10]

  let targetSq: Square | null = null
  for (const file of fileOrder) {
    const candidate: Square = { file, rank: targetRank }
    if (getPiece(state.pieces, candidate) === null) {
      targetSq = candidate
      break
    }
  }

  if (targetSq === null) {
    throw new Error(
      `relocatePawnOfPawns(${color}): all squares on rank ${targetRank} are occupied`,
    )
  }

  const newState = cloneState(state)
  newState.pieces.delete(squareToKey(fromSq))
  newState.pieces.set(squareToKey(targetSq), { type: PieceType.PAWN_OF_PAWNS, color })
  if (color === 'w') newState.whitePawnOfPawnsStage = PawnOfPawnsStage.STAGE2_RELOCATED
  else               newState.blackPawnOfPawnsStage = PawnOfPawnsStage.STAGE2_RELOCATED

  return { square: targetSq, newState }
}

// =============================================================================
// Stage 3: Promotion to Adventitious King
// =============================================================================

/**
 * Promotes the Pawn of Pawns to an Adventitious King on the given square.
 *
 * Actions (all applied to a cloned state):
 *   1. Remove PAWN_OF_PAWNS from the board.
 *   2. Place ADVENTITIOUS_KING of the same color at the same square.
 *   3. Append the square to the color's royals list.
 *   4. Set stage to PROMOTED_TO_ADV_KING.
 *
 * Returns a new GameState; does not mutate the input.
 */
export function promotePawnOfPawnsToAdventitious(
  square: Square,
  color: Color,
  state: GameState,
): GameState {
  const newState = cloneState(state)

  newState.pieces.delete(squareToKey(square))
  const advKing: Piece = { type: PieceType.ADVENTITIOUS_KING, color }
  newState.pieces.set(squareToKey(square), advKing)

  if (color === 'w') {
    newState.whiteRoyals = [...newState.whiteRoyals, square]
    newState.whitePawnOfPawnsStage = PawnOfPawnsStage.PROMOTED_TO_ADV_KING
  } else {
    newState.blackRoyals = [...newState.blackRoyals, square]
    newState.blackPawnOfPawnsStage = PawnOfPawnsStage.PROMOTED_TO_ADV_KING
  }

  return newState
}
