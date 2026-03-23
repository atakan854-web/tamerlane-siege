// =============================================================================
// TAMERLANE SIEGE — Pawn Move Generation
// Section 4.3 (pawns) of PRODUCTION_PLAN.md
//
// RULES: No imports from outside src/core/. Pure TypeScript only.
//        All functions are pure — no mutation, no side effects.
//
// Covers all 11 pawn types. Pawn of Pawns 3-stage logic is intentionally NOT
// fully implemented here — only Stage 1 arrival is flagged. Full PP logic
// lives in pawnOfPawns.ts (separate session).
// =============================================================================

import { type Square, type Piece, type GameState, type Move, PieceType, MoveFlag, PawnOfPawnsStage } from './types'
import { isMainBoard, getPiece } from './board'
import { RANKS } from './constants'

// =============================================================================
// Promotion Utilities
// =============================================================================

/**
 * Returns true if the pawn on the given square has reached the back rank
 * (the rank on which it promotes). White promotes on rank 9, Black on rank 0.
 */
export function isPawnPromotion(square: Square, piece: Piece): boolean {
  const backRank = piece.color === 'w' ? RANKS - 1 : 0
  return square.rank === backRank
}

/**
 * Maps each pawn type to its promotion target piece type.
 *
 * - PAWN_OF_KINGS     → PRINCE       (extra royal, moves like King)
 * - PAWN_OF_GENERALS  → GENERAL
 * - PAWN_OF_VIZIERS   → VIZIER
 * - PAWN_OF_ROOKS     → ROOK
 * - PAWN_OF_KNIGHTS   → KNIGHT
 * - PAWN_OF_PICKETS   → PICKET
 * - PAWN_OF_GIRAFFES  → GIRAFFE
 * - PAWN_OF_ELEPHANTS → ELEPHANT
 * - PAWN_OF_CAMELS    → CAMEL
 * - PAWN_OF_WAR_ENGINES → WAR_ENGINE
 * - PAWN_OF_PAWNS     → handled separately (STAGE1 flag, not a normal promotion)
 *
 * Throws if called with a non-pawn type.
 */
export function getPromotionType(pawnType: PieceType): PieceType {
  switch (pawnType) {
    case PieceType.PAWN_OF_KINGS:       return PieceType.PRINCE
    case PieceType.PAWN_OF_GENERALS:    return PieceType.GENERAL
    case PieceType.PAWN_OF_VIZIERS:     return PieceType.VIZIER
    case PieceType.PAWN_OF_ROOKS:       return PieceType.ROOK
    case PieceType.PAWN_OF_KNIGHTS:     return PieceType.KNIGHT
    case PieceType.PAWN_OF_PICKETS:     return PieceType.PICKET
    case PieceType.PAWN_OF_GIRAFFES:    return PieceType.GIRAFFE
    case PieceType.PAWN_OF_ELEPHANTS:   return PieceType.ELEPHANT
    case PieceType.PAWN_OF_CAMELS:      return PieceType.CAMEL
    case PieceType.PAWN_OF_WAR_ENGINES: return PieceType.WAR_ENGINE
    // PAWN_OF_PAWNS is handled separately — reaching back rank triggers STAGE1_ARRIVAL,
    // not a standard promotion to another piece type.
    case PieceType.PAWN_OF_PAWNS:
      throw new Error(
        'getPromotionType: PAWN_OF_PAWNS does not use standard promotion; ' +
        'check isPawnOfPawns() before calling this function.',
      )
    // Non-pawn types — programming error if called with these
    default: {
      const _exhaustive = pawnType as never
      throw new Error(`getPromotionType: not a pawn type: ${String(_exhaustive)}`)
    }
  }
}

// =============================================================================
// Internal: build a promotion or stage-1 arrival move
// =============================================================================

/**
 * Builds the Move object for a pawn reaching the back rank.
 *
 * - PAWN_OF_PAWNS: flag is chosen based on current PP stage so that the
 *   correct handler fires in makeMove (game.ts):
 *     UNPROMOTED        → PAWN_OF_PAWNS_STAGE1_ARRIVAL  (first arrival)
 *     STAGE1_TELEPORTED → PAWN_OF_PAWNS_STAGE2_ARRIVAL  (second arrival → auto-relocation)
 *     STAGE2_RELOCATED  → PAWN_OF_PAWNS_STAGE3_PROMOTION (third arrival → AK)
 *   Any other stage falls back to STAGE1_ARRIVAL (defensive).
 * - All other pawns: flag = PROMOTION, promotionType = getPromotionType().
 */
function buildBackRankMove(
  from: Square,
  to: Square,
  piece: Piece,
  captured: Piece | null,
  ppStage?: PawnOfPawnsStage,
): Move {
  if (piece.type === PieceType.PAWN_OF_PAWNS) {
    let flag: MoveFlag
    switch (ppStage) {
      case PawnOfPawnsStage.STAGE1_TELEPORTED: flag = MoveFlag.PAWN_OF_PAWNS_STAGE2_ARRIVAL; break
      case PawnOfPawnsStage.STAGE2_RELOCATED:  flag = MoveFlag.PAWN_OF_PAWNS_STAGE3_PROMOTION; break
      default:                                  flag = MoveFlag.PAWN_OF_PAWNS_STAGE1_ARRIVAL; break
    }
    return captured !== null
      ? { from, to, piece, captured, flag }
      : { from, to, piece, flag }
  }

  const promotionType = getPromotionType(piece.type)
  return captured !== null
    ? { from, to, piece, captured, flag: MoveFlag.PROMOTION, promotionType }
    : { from, to, piece, flag: MoveFlag.PROMOTION, promotionType }
}

// =============================================================================
// Main: generatePawnMoves
// =============================================================================

/**
 * Generates all pseudo-legal moves for any pawn type.
 *
 * Shared rules for all 11 pawn variants:
 * - Move 1 square forward (White: rank+1, Black: rank-1). No double step.
 * - Capture 1 square diagonally forward. Only when an enemy is present.
 * - No en passant.
 * - On reaching the back rank: promote (standard flag) or STAGE1_ARRIVAL (PP).
 *
 * Pawn of Pawns Stage 1 behaviour (immobile/invincible sitting) and later
 * stages (teleport, relocation, Adventitious King) are handled in pawnOfPawns.ts.
 */
export function generatePawnMoves(square: Square, piece: Piece, state: GameState): Move[] {
  const moves: Move[] = []
  const forwardDr = piece.color === 'w' ? 1 : -1

  // PP stage is needed for buildBackRankMove to generate the correct flag
  const ppStage = piece.type === PieceType.PAWN_OF_PAWNS
    ? (piece.color === 'w' ? state.whitePawnOfPawnsStage : state.blackPawnOfPawnsStage)
    : undefined

  // -------------------------------------------------------------------------
  // Forward move (1 square, no capture)
  // -------------------------------------------------------------------------
  const forwardSq: Square = { file: square.file, rank: square.rank + forwardDr }
  if (isMainBoard(forwardSq) && getPiece(state.pieces, forwardSq) === null) {
    if (isPawnPromotion(forwardSq, piece)) {
      moves.push(buildBackRankMove(square, forwardSq, piece, null, ppStage))
    } else {
      moves.push({ from: square, to: forwardSq, piece, flag: MoveFlag.NORMAL })
    }
  }

  // -------------------------------------------------------------------------
  // Diagonal captures (forward-left and forward-right)
  // -------------------------------------------------------------------------
  for (const df of [-1, 1] as const) {
    const captureSq: Square = { file: square.file + df, rank: square.rank + forwardDr }
    if (!isMainBoard(captureSq)) continue

    const target = getPiece(state.pieces, captureSq)
    if (target === null || target.color === piece.color) continue // must capture an enemy

    if (isPawnPromotion(captureSq, piece)) {
      moves.push(buildBackRankMove(square, captureSq, piece, target, ppStage))
    } else {
      moves.push({ from: square, to: captureSq, piece, captured: target, flag: MoveFlag.CAPTURE })
    }
  }

  return moves
}
