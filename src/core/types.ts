// =============================================================================
// TAMERLANE SIEGE — Core Type Definitions
// Section 4.1 of PRODUCTION_PLAN.md
//
// RULES: No imports from outside src/core/. Pure TypeScript only.
// =============================================================================

// -----------------------------------------------------------------------------
// Color
// -----------------------------------------------------------------------------

export type Color = 'w' | 'b'

// -----------------------------------------------------------------------------
// Piece Types
// -----------------------------------------------------------------------------

export enum PieceType {
  // Royal & major pieces
  KING          = 'K',
  GENERAL       = 'G',   // Ferz — 1 square diagonal
  VIZIER        = 'V',   // Wazir — 1 square orthogonal
  ROOK          = 'R',
  KNIGHT        = 'N',
  PICKET        = 'T',   // Tali'a — diagonal slider, minimum 2 squares
  GIRAFFE       = 'Z',   // Zurafa — 1 diag + 3+ ortho (not a leap)
  ELEPHANT      = 'E',   // Pil — exactly 2 diagonal (leaps)
  CAMEL         = 'C',   // (1,3) leaper
  WAR_ENGINE    = 'W',   // Dabbaba — exactly 2 orthogonal (leaps)

  // Pawn types — each promotes to its named piece
  PAWN_OF_KINGS       = 'pk',
  PAWN_OF_GENERALS    = 'pg',
  PAWN_OF_VIZIERS     = 'pv',
  PAWN_OF_ROOKS       = 'pr',
  PAWN_OF_KNIGHTS     = 'pn',
  PAWN_OF_PICKETS     = 'pt',
  PAWN_OF_GIRAFFES    = 'pz',
  PAWN_OF_ELEPHANTS   = 'pe',
  PAWN_OF_CAMELS      = 'pc',
  PAWN_OF_WAR_ENGINES = 'pw',
  PAWN_OF_PAWNS       = 'pp',

  // Promoted special types
  PRINCE            = 'P',  // From Pawn of Kings — moves like King, capturable
  ADVENTITIOUS_KING = 'A',  // From Pawn of Pawns (3rd promotion) — moves like King, capturable
}

// -----------------------------------------------------------------------------
// Board Geometry
// -----------------------------------------------------------------------------

// Standard grid: files 0–10 (a–k), ranks 0–9 (1–10)
// Citadel squares exist OUTSIDE the main grid as virtual squares.
//
// White citadel protrudes right of rank 1:  { file: 11, rank: 1 }
// Black citadel protrudes left  of rank 8:  { file: -1, rank: 8 }
//
// Total addressable squares: 110 (main grid) + 2 (citadels) = 112

export interface Square {
  file: number   // 0–10 for main board; 11 or -1 for citadels
  rank: number   // 0–9 for main board
}

// -----------------------------------------------------------------------------
// Piece
// -----------------------------------------------------------------------------

export interface Piece {
  type: PieceType
  color: Color
}

// -----------------------------------------------------------------------------
// Move Flags
// -----------------------------------------------------------------------------

export enum MoveFlag {
  NORMAL                         = 'normal',
  CAPTURE                        = 'capture',
  PROMOTION                      = 'promotion',
  PAWN_OF_PAWNS_STAGE1_ARRIVAL   = 'pp_stage1',   // Arrives on back rank → immobile & invincible
  PAWN_OF_PAWNS_TELEPORT         = 'pp_teleport',  // Teleports to attacking/forking square
  PAWN_OF_PAWNS_STAGE2_ARRIVAL   = 'pp_stage2',    // Arrives on back rank a second time → relocates
  PAWN_OF_PAWNS_STAGE3_PROMOTION = 'pp_stage3',    // Third arrival → becomes Adventitious King
  KING_SWAP                      = 'king_swap',    // One-time swap with any friendly piece
  CITADEL_ENTRY                  = 'citadel_entry',   // Highest royal enters opponent's citadel → draw
  CITADEL_DEFENSE                = 'citadel_defense', // Adventitious King enters own citadel → immune
}

// -----------------------------------------------------------------------------
// Move
// -----------------------------------------------------------------------------

export interface Move {
  from: Square
  to: Square
  piece: Piece
  captured?: Piece     // Piece captured at destination (if any)
  displaced?: Piece    // Friendly piece displaced by Pawn of Pawns teleport (if any)
  flag: MoveFlag
  promotionType?: PieceType  // For standard pawn promotions
}

// -----------------------------------------------------------------------------
// Pawn of Pawns — Stage Tracking
// -----------------------------------------------------------------------------

export enum PawnOfPawnsStage {
  UNPROMOTED           = 0,  // Normal pawn, hasn't reached back rank yet
  STAGE1_ON_BACK_RANK  = 1,  // Sitting on back rank — immobile & invincible
  STAGE1_TELEPORTED    = 2,  // Has teleported, now moves as normal pawn again
  STAGE2_ON_BACK_RANK  = 3,  // Reached back rank a second time — will relocate
  STAGE2_RELOCATED     = 4,  // Relocated to Pawn of Kings start square
  PROMOTED_TO_ADV_KING = 5,  // Third time on back rank — now Adventitious King
}

// -----------------------------------------------------------------------------
// Game Result
// -----------------------------------------------------------------------------

export enum GameResult {
  WHITE_WINS_CHECKMATE = 'w_mate',
  BLACK_WINS_CHECKMATE = 'b_mate',
  WHITE_WINS_STALEMATE = 'w_stalemate',  // Stalemate = WIN for the causing side
  BLACK_WINS_STALEMATE = 'b_stalemate',
  DRAW_CITADEL         = 'draw_citadel', // Highest royal enters opponent's citadel
}

// -----------------------------------------------------------------------------
// Game State
// -----------------------------------------------------------------------------

// Board representation: Map<string, Piece> keyed by squareToKey(square).
// Sparse map — only occupied squares have entries. Citadels use file 11/-1.

export interface GameState {
  pieces: Map<string, Piece>   // Key: "file,rank" → Piece

  turn: Color
  moveNumber: number           // Full move counter (increments after Black's move)
  halfMoveCount: number        // Total half-moves played

  // King-swap availability (once per game, per player)
  whiteKingSwapUsed: boolean
  blackKingSwapUsed: boolean

  // Pawn of Pawns stage per player
  whitePawnOfPawnsStage: PawnOfPawnsStage
  blackPawnOfPawnsStage: PawnOfPawnsStage

  // Royal piece locations — updated on every move for fast check detection
  // Includes: original King + any Prince + any Adventitious King
  whiteRoyals: Square[]
  blackRoyals: Square[]

  // Citadel occupancy (only Adventitious King may occupy own citadel)
  whiteCitadelOccupant: Piece | null
  blackCitadelOccupant: Piece | null

  // Game result — null while game is in progress
  result: GameResult | null

  // Full move history (for undo, notation, analysis)
  history: Move[]
}
