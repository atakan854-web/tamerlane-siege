// =============================================================================
// TAMERLANE SIEGE — Board Constants & Starting Position
// Section 4.2 of PRODUCTION_PLAN.md
//
// RULES: No imports from outside src/core/. Pure TypeScript only.
// =============================================================================

import { PieceType, type Color, type Piece, type Square } from './types'

// -----------------------------------------------------------------------------
// Board Dimensions
// -----------------------------------------------------------------------------

export const FILES = 11          // Indexed 0–10, labeled a–k
export const RANKS = 10          // Indexed 0–9, labeled 1–10
export const MAIN_BOARD_SQUARES = FILES * RANKS  // 110
export const TOTAL_SQUARES = MAIN_BOARD_SQUARES + 2  // 112 (including 2 citadels)
export const PIECES_PER_SIDE = 28

// -----------------------------------------------------------------------------
// Citadel Squares (virtual — outside the main grid)
// -----------------------------------------------------------------------------

// White's citadel: protrudes right of file 10, rank 1
export const WHITE_CITADEL: Square = { file: 11, rank: 1 }

// Black's citadel: protrudes left of file 0, rank 8
export const BLACK_CITADEL: Square = { file: -1, rank: 8 }

// Squares on the main board that are adjacent to each citadel
// (from which a piece can step into the citadel)
export const WHITE_CITADEL_ADJACENT: Square[] = [
  { file: 10, rank: 0 },
  { file: 10, rank: 1 },
  { file: 10, rank: 2 },
]

export const BLACK_CITADEL_ADJACENT: Square[] = [
  { file: 0, rank: 7 },
  { file: 0, rank: 8 },
  { file: 0, rank: 9 },
]

// -----------------------------------------------------------------------------
// Starting Position
// -----------------------------------------------------------------------------

// Helpers
const w = (type: PieceType): Piece => ({ type, color: 'w' as Color })
const b = (type: PieceType): Piece => ({ type, color: 'b' as Color })

// White rank 0 (back row) — pieces on even files only:
// [E, _, C, _, W, _, W, _, C, _, E]
//  0  1  2  3  4  5  6  7  8  9 10
const WHITE_RANK0: Array<Piece | null> = [
  w(PieceType.ELEPHANT),   // file 0
  null,                     // file 1
  w(PieceType.CAMEL),      // file 2
  null,                     // file 3
  w(PieceType.WAR_ENGINE), // file 4
  null,                     // file 5
  w(PieceType.WAR_ENGINE), // file 6
  null,                     // file 7
  w(PieceType.CAMEL),      // file 8
  null,                     // file 9
  w(PieceType.ELEPHANT),   // file 10
]

// White rank 1 (piece row):
// [R, N, T, Z, G, K, V, Z, T, N, R]
//  0  1  2  3  4  5  6  7  8  9 10
const WHITE_RANK1: Array<Piece | null> = [
  w(PieceType.ROOK),    // file 0
  w(PieceType.KNIGHT),  // file 1
  w(PieceType.PICKET),  // file 2
  w(PieceType.GIRAFFE), // file 3
  w(PieceType.GENERAL), // file 4
  w(PieceType.KING),    // file 5
  w(PieceType.VIZIER),  // file 6
  w(PieceType.GIRAFFE), // file 7
  w(PieceType.PICKET),  // file 8
  w(PieceType.KNIGHT),  // file 9
  w(PieceType.ROOK),    // file 10
]

// White rank 2 (pawn row):
// [pp, pw, pc, pe, pg, pk, pv, pz, pt, pn, pr]
//   0   1   2   3   4   5   6   7   8   9  10
const WHITE_RANK2: Array<Piece | null> = [
  w(PieceType.PAWN_OF_PAWNS),       // file 0
  w(PieceType.PAWN_OF_WAR_ENGINES), // file 1
  w(PieceType.PAWN_OF_CAMELS),      // file 2
  w(PieceType.PAWN_OF_ELEPHANTS),   // file 3
  w(PieceType.PAWN_OF_GENERALS),    // file 4
  w(PieceType.PAWN_OF_KINGS),       // file 5
  w(PieceType.PAWN_OF_VIZIERS),     // file 6
  w(PieceType.PAWN_OF_GIRAFFES),    // file 7
  w(PieceType.PAWN_OF_PICKETS),     // file 8
  w(PieceType.PAWN_OF_KNIGHTS),     // file 9
  w(PieceType.PAWN_OF_ROOKS),       // file 10
]

// Black mirrors White. Black back row = rank 9, piece row = rank 8, pawns = rank 7.
// Black rank 9 (back row) — same piece layout as White rank 0, but black:
const BLACK_RANK9: Array<Piece | null> = [
  b(PieceType.ELEPHANT),
  null,
  b(PieceType.CAMEL),
  null,
  b(PieceType.WAR_ENGINE),
  null,
  b(PieceType.WAR_ENGINE),
  null,
  b(PieceType.CAMEL),
  null,
  b(PieceType.ELEPHANT),
]

// Black rank 8 (piece row):
const BLACK_RANK8: Array<Piece | null> = [
  b(PieceType.ROOK),
  b(PieceType.KNIGHT),
  b(PieceType.PICKET),
  b(PieceType.GIRAFFE),
  b(PieceType.GENERAL),
  b(PieceType.KING),
  b(PieceType.VIZIER),
  b(PieceType.GIRAFFE),
  b(PieceType.PICKET),
  b(PieceType.KNIGHT),
  b(PieceType.ROOK),
]

// Black rank 7 (pawn row) — same types as White rank 2, but black:
const BLACK_RANK7: Array<Piece | null> = [
  b(PieceType.PAWN_OF_PAWNS),
  b(PieceType.PAWN_OF_WAR_ENGINES),
  b(PieceType.PAWN_OF_CAMELS),
  b(PieceType.PAWN_OF_ELEPHANTS),
  b(PieceType.PAWN_OF_GENERALS),
  b(PieceType.PAWN_OF_KINGS),
  b(PieceType.PAWN_OF_VIZIERS),
  b(PieceType.PAWN_OF_GIRAFFES),
  b(PieceType.PAWN_OF_PICKETS),
  b(PieceType.PAWN_OF_KNIGHTS),
  b(PieceType.PAWN_OF_ROOKS),
]

// Exported as a flat array of [rank, file, Piece] tuples for easy board construction.
// Ranks 3–6 are empty at game start.
export interface StartingEntry {
  rank: number
  file: number
  piece: Piece
}

function buildStartingEntries(): StartingEntry[] {
  const entries: StartingEntry[] = []

  const rows: Array<[number, Array<Piece | null>]> = [
    [0, WHITE_RANK0],
    [1, WHITE_RANK1],
    [2, WHITE_RANK2],
    [7, BLACK_RANK7],
    [8, BLACK_RANK8],
    [9, BLACK_RANK9],
  ]

  for (const [rank, row] of rows) {
    for (let file = 0; file < FILES; file++) {
      const piece = row[file]
      if (piece !== null) {
        entries.push({ rank, file, piece })
      }
    }
  }

  return entries
}

export const STARTING_ENTRIES: StartingEntry[] = buildStartingEntries()

// -----------------------------------------------------------------------------
// Piece Values (for AI evaluation — preliminary, will be tuned)
// -----------------------------------------------------------------------------

export const PIECE_VALUES: Record<PieceType, number> = {
  [PieceType.KING]:              Infinity,
  [PieceType.PRINCE]:            900,
  [PieceType.ADVENTITIOUS_KING]: 900,
  [PieceType.ROOK]:              500,
  [PieceType.PICKET]:            350,
  [PieceType.GIRAFFE]:           300,
  [PieceType.KNIGHT]:            275,
  [PieceType.CAMEL]:             250,
  [PieceType.ELEPHANT]:          150,
  [PieceType.WAR_ENGINE]:        150,
  [PieceType.GENERAL]:           100,
  [PieceType.VIZIER]:            100,
  [PieceType.PAWN_OF_PAWNS]:     400,
  [PieceType.PAWN_OF_KINGS]:     200,
  [PieceType.PAWN_OF_ROOKS]:     120,
  [PieceType.PAWN_OF_PICKETS]:   110,
  [PieceType.PAWN_OF_GIRAFFES]:  105,
  [PieceType.PAWN_OF_KNIGHTS]:   100,
  [PieceType.PAWN_OF_CAMELS]:    95,
  [PieceType.PAWN_OF_ELEPHANTS]: 90,
  [PieceType.PAWN_OF_WAR_ENGINES]: 90,
  [PieceType.PAWN_OF_GENERALS]:  80,
  [PieceType.PAWN_OF_VIZIERS]:   80,
}

// -----------------------------------------------------------------------------
// Pawn of Kings — starting square (used for Pawn of Pawns Stage 2 relocation)
// -----------------------------------------------------------------------------

// White's Pawn of Kings starts at file 5, rank 2
export const WHITE_PAWN_OF_KINGS_START: Square = { file: 5, rank: 2 }
// Black's Pawn of Kings starts at file 5, rank 7
export const BLACK_PAWN_OF_KINGS_START: Square = { file: 5, rank: 7 }
