// =============================================================================
// TAMERLANE SIEGE — Move Generation
// Section 4.3 of PRODUCTION_PLAN.md
//
// RULES: No imports from outside src/core/. Pure TypeScript only.
//        All functions are pure — no mutation, no side effects.
//        No check filtering here — that is rules.ts responsibility.
// =============================================================================

import { type Color, type Square, type Piece, type GameState, type Move, PieceType, MoveFlag, PawnOfPawnsStage } from './types'
import {
  squareToKey,
  keyToSquare,
  squaresEqual,
  isMainBoard,
  isCitadel,
  getPiece,
  getAdjacentSquares,
} from './board'
import { WHITE_CITADEL, BLACK_CITADEL } from './constants'
import { generatePawnMoves } from './pawns'
import {
  getPawnOfPawnsStage,
  isInvincible,
  generatePawnOfPawnsTeleportMoves,
} from './pawnOfPawns'
import { canEnterOpponentCitadel, canEnterOwnCitadel } from './citadel'

// =============================================================================
// Exported Helper Functions
// (reused by citadel.ts, rules.ts, and future piece generators)
// =============================================================================

/**
 * Returns the piece at the given square in the current state, or null.
 */
export function getPieceAt(square: Square, state: GameState): Piece | null {
  return getPiece(state.pieces, square)
}

/**
 * Returns true if the square is occupied by a piece of the given color.
 */
export function isSquareOccupiedByFriendly(
  square: Square,
  color: Color,
  state: GameState,
): boolean {
  const piece = getPieceAt(square, state)
  return piece !== null && piece.color === color
}

/**
 * Returns true if the square is occupied by a piece of the opposite color.
 */
export function isSquareOccupiedByEnemy(
  square: Square,
  color: Color,
  state: GameState,
): boolean {
  const piece = getPieceAt(square, state)
  return piece !== null && piece.color !== color
}

/**
 * Generates sliding moves (for Rook, and later Picket) along the given direction
 * vectors. Slides until hitting the board edge, a friendly piece (stop, don't add),
 * or an enemy piece (add capture, stop).
 *
 * Uses isMainBoard — sliding pieces cannot enter citadels.
 */
export function generateSlidingMoves(
  square: Square,
  piece: Piece,
  state: GameState,
  directions: ReadonlyArray<readonly [number, number]>,
): Move[] {
  const moves: Move[] = []

  for (const [df, dr] of directions) {
    let file = square.file + df
    let rank = square.rank + dr

    while (isMainBoard({ file, rank })) {
      const to: Square = { file, rank }

      if (isSquareOccupiedByFriendly(to, piece.color, state)) break

      if (isSquareOccupiedByEnemy(to, piece.color, state)) {
        const captured = getPieceAt(to, state) as Piece // safe: isSquareOccupiedByEnemy is true
        moves.push({ from: square, to, piece, captured, flag: MoveFlag.CAPTURE })
        break
      }

      moves.push({ from: square, to, piece, flag: MoveFlag.NORMAL })
      file += df
      rank += dr
    }
  }

  return moves
}

// =============================================================================
// Citadel Entry Helpers (internal)
// =============================================================================

/** Returns the opponent's citadel square for a given color. */
function opponentCitadel(color: Color): Square {
  return color === 'w' ? BLACK_CITADEL : WHITE_CITADEL
}

/** Returns the own side's citadel square for a given color. */
function ownCitadel(color: Color): Square {
  return color === 'w' ? WHITE_CITADEL : BLACK_CITADEL
}

// =============================================================================
// Move Generation — Piece by Piece
// =============================================================================

// Direction constants
const ORTHOGONAL_DIRECTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const
const DIAGONAL_DIRECTIONS   = [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const

// Knight offsets — all 8 L-shapes
const KNIGHT_DELTAS = [
  [-2, -1], [-2, 1],
  [-1, -2], [-1, 2],
  [ 1, -2], [ 1, 2],
  [ 2, -1], [ 2, 1],
] as const

// -----------------------------------------------------------------------------
// King
// -----------------------------------------------------------------------------

/**
 * Generates all pseudo-legal moves for the King.
 *
 * Moves 1 square in any of the 8 directions.
 * - Friendly pieces: blocked.
 * - Enemy pieces: captured.
 * - Opponent's citadel: CITADEL_ENTRY (instant draw) — King is always the
 *   highest-ranking royal, so it can always attempt this.
 * - Own citadel: forbidden (only Adventitious King may enter own citadel).
 *
 * NOTE: Check avoidance is NOT applied here — that is rules.ts responsibility.
 */
export function generateKingMoves(square: Square, piece: Piece, state: GameState): Move[] {
  const moves: Move[] = []
  const adjacents = getAdjacentSquares(square)

  for (const to of adjacents) {
    // --- Citadel squares ---
    if (isCitadel(to)) {
      // King cannot enter its own citadel (only Adventitious King can)
      if (squaresEqual(to, ownCitadel(piece.color))) continue

      // King can enter opponent's citadel only if it is the highest-ranking royal
      if (squaresEqual(to, opponentCitadel(piece.color))) {
        const occupant = getPieceAt(to, state)
        if (occupant === null && canEnterOpponentCitadel(piece, piece.color, state)) {
          moves.push({ from: square, to, piece, flag: MoveFlag.CITADEL_ENTRY })
        }
        continue
      }

      continue // Unknown citadel edge case — skip
    }

    // --- Normal squares ---
    if (isSquareOccupiedByFriendly(to, piece.color, state)) continue

    const captured = getPieceAt(to, state)
    if (captured !== null) {
      moves.push({ from: square, to, piece, captured, flag: MoveFlag.CAPTURE })
    } else {
      moves.push({ from: square, to, piece, flag: MoveFlag.NORMAL })
    }
  }

  return moves
}

// -----------------------------------------------------------------------------
// General (Ferz — 1 square diagonal)
// -----------------------------------------------------------------------------

/**
 * Generates all pseudo-legal moves for the General (Ferz).
 *
 * Moves exactly 1 square diagonally.
 * Cannot enter citadels (General is not a royal piece).
 */
export function generateGeneralMoves(square: Square, piece: Piece, state: GameState): Move[] {
  const moves: Move[] = []

  for (const [df, dr] of DIAGONAL_DIRECTIONS) {
    const to: Square = { file: square.file + df, rank: square.rank + dr }

    if (!isMainBoard(to)) continue
    if (isSquareOccupiedByFriendly(to, piece.color, state)) continue

    const captured = getPieceAt(to, state)
    if (captured !== null) {
      moves.push({ from: square, to, piece, captured, flag: MoveFlag.CAPTURE })
    } else {
      moves.push({ from: square, to, piece, flag: MoveFlag.NORMAL })
    }
  }

  return moves
}

// -----------------------------------------------------------------------------
// Vizier (Wazir — 1 square orthogonal)
// -----------------------------------------------------------------------------

/**
 * Generates all pseudo-legal moves for the Vizier (Wazir).
 *
 * Moves exactly 1 square orthogonally.
 * Cannot enter citadels.
 */
export function generateVizierMoves(square: Square, piece: Piece, state: GameState): Move[] {
  const moves: Move[] = []

  for (const [df, dr] of ORTHOGONAL_DIRECTIONS) {
    const to: Square = { file: square.file + df, rank: square.rank + dr }

    if (!isMainBoard(to)) continue
    if (isSquareOccupiedByFriendly(to, piece.color, state)) continue

    const captured = getPieceAt(to, state)
    if (captured !== null) {
      moves.push({ from: square, to, piece, captured, flag: MoveFlag.CAPTURE })
    } else {
      moves.push({ from: square, to, piece, flag: MoveFlag.NORMAL })
    }
  }

  return moves
}

// -----------------------------------------------------------------------------
// Rook (orthogonal slider)
// -----------------------------------------------------------------------------

/**
 * Generates all pseudo-legal moves for the Rook.
 *
 * Slides orthogonally until blocked or capturing an enemy.
 * Cannot enter citadels (handled by generateSlidingMoves using isMainBoard).
 */
export function generateRookMoves(square: Square, piece: Piece, state: GameState): Move[] {
  return generateSlidingMoves(square, piece, state, ORTHOGONAL_DIRECTIONS)
}

// -----------------------------------------------------------------------------
// Knight (1,2) leaper
// -----------------------------------------------------------------------------

/**
 * Generates all pseudo-legal moves for the Knight.
 *
 * Leaps in an L-shape (1,2) or (2,1) in any combination of directions.
 * Leaps over all intervening pieces — only the destination matters.
 * Cannot enter citadels.
 */
export function generateKnightMoves(square: Square, piece: Piece, state: GameState): Move[] {
  const moves: Move[] = []

  for (const [df, dr] of KNIGHT_DELTAS) {
    const to: Square = { file: square.file + df, rank: square.rank + dr }

    if (!isMainBoard(to)) continue
    if (isSquareOccupiedByFriendly(to, piece.color, state)) continue

    const captured = getPieceAt(to, state)
    if (captured !== null) {
      moves.push({ from: square, to, piece, captured, flag: MoveFlag.CAPTURE })
    } else {
      moves.push({ from: square, to, piece, flag: MoveFlag.NORMAL })
    }
  }

  return moves
}

// -----------------------------------------------------------------------------
// Picket (Tali'a — diagonal slider, minimum 2 squares)
// -----------------------------------------------------------------------------

/**
 * Generates all pseudo-legal moves for the Picket (Tali'a).
 *
 * Slides diagonally like a Bishop but MUST move at least 2 squares.
 * - A piece at distance 1 on any diagonal blocks that entire direction
 *   (the Picket cannot jump over it, even though it can't land there).
 * - From distance 2 onwards: standard sliding rules apply.
 */
export function generatePicketMoves(square: Square, piece: Piece, state: GameState): Move[] {
  const moves: Move[] = []

  for (const [df, dr] of DIAGONAL_DIRECTIONS) {
    // Distance-1 check: if any piece occupies it, the whole diagonal is blocked.
    const dist1: Square = { file: square.file + df, rank: square.rank + dr }
    if (!isMainBoard(dist1)) continue
    if (getPieceAt(dist1, state) !== null) continue // occupied — entire diagonal blocked

    // Slide from distance 2 onwards (minimum Picket move distance)
    for (let k = 2; ; k++) {
      const to: Square = { file: square.file + df * k, rank: square.rank + dr * k }
      if (!isMainBoard(to)) break
      if (isSquareOccupiedByFriendly(to, piece.color, state)) break
      if (isSquareOccupiedByEnemy(to, piece.color, state)) {
        const captured = getPieceAt(to, state) as Piece
        moves.push({ from: square, to, piece, captured, flag: MoveFlag.CAPTURE })
        break
      }
      moves.push({ from: square, to, piece, flag: MoveFlag.NORMAL })
    }
  }

  return moves
}

// -----------------------------------------------------------------------------
// Giraffe (Zurafa — 1 diagonal + 3+ orthogonal, not a leap)
// -----------------------------------------------------------------------------

/**
 * Generates all pseudo-legal moves for the Giraffe (Zurafa).
 *
 * Movement pattern:
 *   1. Step exactly 1 square diagonally (intermediate square).
 *   2. Then slide orthogonally in a direction aligned with one component
 *      of the diagonal step, for AT LEAST 3 more squares.
 *
 * Total minimum distance from origin: 1 (diagonal) + 3 (orthogonal) = 4 squares.
 * This produces 8 possible ray directions (4 diagonals × 2 orthogonal sub-rays).
 *
 * NOT a leap: the intermediate square and all transit squares must be empty.
 * Only the final landing square may contain an enemy (capture).
 *
 * RULE_AMBIGUITY: PRODUCTION_PLAN.md Section 4.3 specifies "minimum 3 orthogonal
 * continuation" (total 4). Some historical sources cite "minimum 2 orthogonal"
 * (total 3). We implement the 3-continuation interpretation as documented.
 */
export function generateGiraffeMoves(square: Square, piece: Piece, state: GameState): Move[] {
  const moves: Move[] = []

  for (const [df, dr] of DIAGONAL_DIRECTIONS) {
    // Step 1: intermediate diagonal square — must be on board and empty.
    // Giraffe is NOT a leap: any occupant (friendly or enemy) blocks this direction.
    const intermediate: Square = { file: square.file + df, rank: square.rank + dr }
    if (!isMainBoard(intermediate)) continue
    if (getPieceAt(intermediate, state) !== null) continue

    // Step 2: two orthogonal sub-rays from the intermediate square.
    //   Sub-ray A: continue along rank (file fixed at square.file + df, rank += dr)
    //   Sub-ray B: continue along file (rank fixed at square.rank + dr, file += df)
    const subRays = [
      [0, dr],  // Sub-ray A: along rank
      [df, 0],  // Sub-ray B: along file
    ] as const

    for (const [subDf, subDr] of subRays) {
      for (let k = 1; ; k++) {
        const to: Square = {
          file: intermediate.file + subDf * k,
          rank: intermediate.rank + subDr * k,
        }
        if (!isMainBoard(to)) break

        if (k < 3) {
          // Transit square (steps 1–2 from intermediate): must be empty to continue.
          if (getPieceAt(to, state) !== null) break
        } else {
          // Valid landing square (step 3+ from intermediate = 4+ total from origin).
          if (isSquareOccupiedByFriendly(to, piece.color, state)) break
          if (isSquareOccupiedByEnemy(to, piece.color, state)) {
            const captured = getPieceAt(to, state) as Piece
            moves.push({ from: square, to, piece, captured, flag: MoveFlag.CAPTURE })
            break
          }
          moves.push({ from: square, to, piece, flag: MoveFlag.NORMAL })
        }
      }
    }
  }

  return moves
}

// -----------------------------------------------------------------------------
// Elephant (Pil — exactly 2 diagonal, leaps)
// -----------------------------------------------------------------------------

// Elephant destinations: exactly 2 squares diagonally in any of 4 directions
const ELEPHANT_DELTAS = [[-2, -2], [-2, 2], [2, -2], [2, 2]] as const

/**
 * Generates all pseudo-legal moves for the Elephant (Pil).
 *
 * Leaps exactly 2 squares diagonally. The intervening square is irrelevant —
 * the Elephant leaps over it regardless of occupancy.
 */
export function generateElephantMoves(square: Square, piece: Piece, state: GameState): Move[] {
  const moves: Move[] = []

  for (const [df, dr] of ELEPHANT_DELTAS) {
    const to: Square = { file: square.file + df, rank: square.rank + dr }
    if (!isMainBoard(to)) continue
    if (isSquareOccupiedByFriendly(to, piece.color, state)) continue

    const captured = getPieceAt(to, state)
    if (captured !== null) {
      moves.push({ from: square, to, piece, captured, flag: MoveFlag.CAPTURE })
    } else {
      moves.push({ from: square, to, piece, flag: MoveFlag.NORMAL })
    }
  }

  return moves
}

// -----------------------------------------------------------------------------
// Camel — (1,3) leaper
// -----------------------------------------------------------------------------

// All 8 Camel destinations: (±1, ±3) and (±3, ±1)
const CAMEL_DELTAS = [
  [-3, -1], [-3, 1],
  [-1, -3], [-1, 3],
  [ 1, -3], [ 1, 3],
  [ 3, -1], [ 3, 1],
] as const

/**
 * Generates all pseudo-legal moves for the Camel.
 *
 * Leaps in a (1,3) or (3,1) pattern in any direction combination.
 * Leaps over all intervening pieces — only the destination matters.
 */
export function generateCamelMoves(square: Square, piece: Piece, state: GameState): Move[] {
  const moves: Move[] = []

  for (const [df, dr] of CAMEL_DELTAS) {
    const to: Square = { file: square.file + df, rank: square.rank + dr }
    if (!isMainBoard(to)) continue
    if (isSquareOccupiedByFriendly(to, piece.color, state)) continue

    const captured = getPieceAt(to, state)
    if (captured !== null) {
      moves.push({ from: square, to, piece, captured, flag: MoveFlag.CAPTURE })
    } else {
      moves.push({ from: square, to, piece, flag: MoveFlag.NORMAL })
    }
  }

  return moves
}

// -----------------------------------------------------------------------------
// War Engine (Dabbaba — exactly 2 orthogonal, leaps)
// -----------------------------------------------------------------------------

// War Engine destinations: exactly 2 squares orthogonally
const WAR_ENGINE_DELTAS = [[-2, 0], [2, 0], [0, -2], [0, 2]] as const

/**
 * Generates all pseudo-legal moves for the War Engine (Dabbaba).
 *
 * Leaps exactly 2 squares orthogonally. The intervening square is irrelevant —
 * the War Engine leaps over it regardless of occupancy.
 */
export function generateWarEngineMoves(square: Square, piece: Piece, state: GameState): Move[] {
  const moves: Move[] = []

  for (const [df, dr] of WAR_ENGINE_DELTAS) {
    const to: Square = { file: square.file + df, rank: square.rank + dr }
    if (!isMainBoard(to)) continue
    if (isSquareOccupiedByFriendly(to, piece.color, state)) continue

    const captured = getPieceAt(to, state)
    if (captured !== null) {
      moves.push({ from: square, to, piece, captured, flag: MoveFlag.CAPTURE })
    } else {
      moves.push({ from: square, to, piece, flag: MoveFlag.NORMAL })
    }
  }

  return moves
}

// -----------------------------------------------------------------------------
// Adventitious King (moves like King, plus may enter own citadel)
// -----------------------------------------------------------------------------

/**
 * Generates all pseudo-legal moves for the Adventitious King.
 *
 * Moves 1 square in any of the 8 directions, like the King, with one difference:
 * the Adventitious King MAY enter its OWN citadel (flag = CITADEL_DEFENSE).
 * It may also enter the opponent's citadel (flag = CITADEL_ENTRY, instant draw).
 *
 * NOTE: Check avoidance is NOT applied here — that is rules.ts responsibility.
 */
export function generateAdventitiousKingMoves(
  square: Square,
  piece: Piece,
  state: GameState,
): Move[] {
  const moves: Move[] = []
  const adjacents = getAdjacentSquares(square)

  for (const to of adjacents) {
    if (isCitadel(to)) {
      // Own citadel: Adventitious King CAN enter for immune defense (if allowed)
      if (squaresEqual(to, ownCitadel(piece.color))) {
        if (canEnterOwnCitadel(piece, piece.color, state)) {
          moves.push({ from: square, to, piece, flag: MoveFlag.CITADEL_DEFENSE })
        }
        continue
      }

      // Opponent's citadel: CITADEL_ENTRY (draw) — only if highest-ranking royal
      if (squaresEqual(to, opponentCitadel(piece.color))) {
        const occupant = getPieceAt(to, state)
        if (occupant === null && canEnterOpponentCitadel(piece, piece.color, state)) {
          moves.push({ from: square, to, piece, flag: MoveFlag.CITADEL_ENTRY })
        }
        continue
      }

      continue
    }

    if (isSquareOccupiedByFriendly(to, piece.color, state)) continue

    const captured = getPieceAt(to, state)
    if (captured !== null) {
      moves.push({ from: square, to, piece, captured, flag: MoveFlag.CAPTURE })
    } else {
      moves.push({ from: square, to, piece, flag: MoveFlag.NORMAL })
    }
  }

  return moves
}

// =============================================================================
// Dispatcher — generateMovesForPiece
// =============================================================================

/**
 * Generates raw moves without the invincibility filter.
 * Internal — called only by generateMovesForPiece.
 */
function generateMovesRaw(square: Square, piece: Piece, state: GameState): Move[] {
  switch (piece.type) {
    // --- Week 1 ---
    case PieceType.KING:
      return generateKingMoves(square, piece, state)
    case PieceType.GENERAL:
      return generateGeneralMoves(square, piece, state)
    case PieceType.VIZIER:
      return generateVizierMoves(square, piece, state)
    case PieceType.ROOK:
      return generateRookMoves(square, piece, state)
    case PieceType.KNIGHT:
      return generateKnightMoves(square, piece, state)

    // --- Week 2 — remaining pieces ---
    case PieceType.PICKET:
      return generatePicketMoves(square, piece, state)
    case PieceType.GIRAFFE:
      return generateGiraffeMoves(square, piece, state)
    case PieceType.ELEPHANT:
      return generateElephantMoves(square, piece, state)
    case PieceType.CAMEL:
      return generateCamelMoves(square, piece, state)
    case PieceType.WAR_ENGINE:
      return generateWarEngineMoves(square, piece, state)

    // --- Week 2 — non-PP pawns ---
    case PieceType.PAWN_OF_KINGS:
    case PieceType.PAWN_OF_GENERALS:
    case PieceType.PAWN_OF_VIZIERS:
    case PieceType.PAWN_OF_ROOKS:
    case PieceType.PAWN_OF_KNIGHTS:
    case PieceType.PAWN_OF_PICKETS:
    case PieceType.PAWN_OF_GIRAFFES:
    case PieceType.PAWN_OF_ELEPHANTS:
    case PieceType.PAWN_OF_CAMELS:
    case PieceType.PAWN_OF_WAR_ENGINES:
      return generatePawnMoves(square, piece, state)

    // --- Week 3 — Pawn of Pawns (3-stage logic) ---
    case PieceType.PAWN_OF_PAWNS: {
      const stage = getPawnOfPawnsStage(piece.color, state)
      if (stage === PawnOfPawnsStage.STAGE1_ON_BACK_RANK) {
        return generatePawnOfPawnsTeleportMoves(piece.color, state)
      }
      return generatePawnMoves(square, piece, state)
    }

    // --- Week 3 — promoted royal types ---
    case PieceType.PRINCE:
      // Moves like King (1 square any direction). Capturable — not truly royal.
      // Citadel entry rules identical to King for now (citadel.ts session).
      return generateKingMoves(square, piece, state)

    case PieceType.ADVENTITIOUS_KING:
      // Moves like King but may also enter own citadel (CITADEL_DEFENSE).
      return generateAdventitiousKingMoves(square, piece, state)

    // Exhaustiveness guard
    default: {
      const _exhaustive: never = piece.type
      throw new Error(`generateMovesForPiece: unhandled PieceType ${String(_exhaustive)}`)
    }
  }
}

/**
 * Returns all pseudo-legal moves for the piece on the given square.
 *
 * This is an exhaustive dispatch over PieceType. Any new PieceType without a
 * corresponding case in generateMovesRaw produces a TypeScript compile error.
 *
 * Post-processes the raw move list to remove captures of invincible pieces
 * (Pawn of Pawns in Stage 1 cannot be captured by any piece).
 */
export function generateMovesForPiece(
  square: Square,
  piece: Piece,
  state: GameState,
): Move[] {
  const raw = generateMovesRaw(square, piece, state)
  // Invincibility filter: PP in Stage 1 cannot be captured
  return raw.filter(m => m.captured === undefined || !isInvincible(m.to, state))
}

/**
 * Returns true if the given square is attacked by any piece of attackerColor.
 *
 * Iterates all pieces of attackerColor on the board, generates their
 * pseudo-legal moves, and checks whether any move targets the given square.
 *
 * Used by kingSwap.ts, rules.ts, and citadel.ts for check detection.
 */
export function isSquareAttackedBy(
  square: Square,
  attackerColor: Color,
  state: GameState,
): boolean {
  for (const [key, piece] of state.pieces) {
    if (piece.color !== attackerColor) continue
    const from = keyToSquare(key)
    const moves = generateMovesForPiece(from, piece, state)
    if (moves.some(m => squaresEqual(m.to, square))) return true
  }
  return false
}

// Re-exports for consumers that import these from moves.ts (e.g. kingSwap.ts)
export { squareToKey, squaresEqual }
