// =============================================================================
// TAMERLANE SIEGE — Move Ordering
// src/ai/moveOrder.ts
//
// Good move ordering is critical for alpha-beta efficiency.
// Order: captures (MVV-LVA) > promotions > quiet moves.
// =============================================================================

import type { Move } from '../core/types'
import { MoveFlag } from '../core/types'
import { PIECE_VALUES } from '../core/constants'

/** Higher = tried earlier in alpha-beta. */
function moveScore(move: Move): number {
  // Captures: Most Valuable Victim – Least Valuable Attacker
  if (move.captured) {
    const victimVal   = PIECE_VALUES[move.captured.type]
    const attackerVal = PIECE_VALUES[move.piece.type]
    const vv = isFinite(victimVal)   ? victimVal   : 0
    const av = isFinite(attackerVal) ? attackerVal : 0
    return 10000 + vv - av / 100
  }

  // Promotions
  if (
    move.flag === MoveFlag.PROMOTION ||
    move.flag === MoveFlag.PAWN_OF_PAWNS_STAGE1_ARRIVAL ||
    move.flag === MoveFlag.PAWN_OF_PAWNS_STAGE2_ARRIVAL ||
    move.flag === MoveFlag.PAWN_OF_PAWNS_STAGE3_PROMOTION
  ) return 5000

  // Citadel entry (draw — evaluate at root, skip deep search)
  if (move.flag === MoveFlag.CITADEL_ENTRY) return 4000

  // Quiet moves
  return 0
}

export function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => moveScore(b) - moveScore(a))
}
