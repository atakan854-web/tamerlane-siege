// =============================================================================
// TAMERLANE SIEGE — Move Notation & Board Serialization
// Section 4.9 of PRODUCTION_PLAN.md
//
// RULES: No imports from outside src/core/. Pure TypeScript only.
//        All functions are pure — no mutation, no side effects.
//
// Notation format:
//   Files: a-k  (0=a … 10=k)
//   Ranks: 1-10 (0=1 … 9=10)
//   Citadels: "Cit-w" (white, file 11) / "Cit-b" (black, file -1)
//
//   Normal move:          "Re5"      (piece letter + destination)
//   Pawn move:            "e5"       (destination only)
//   Capture:              "Rxe5"     (piece + 'x' + destination)
//   Pawn capture:         "dxe5"     (source file + 'x' + destination)
//   Promotion:            "e10=R"
//   King swap:            "K↔Re5"
//   PP teleport:          "PP→e5"
//   PP Stage1 arrival:    "a10†"     (dagger = stage1)
//   PP Stage2 arrival:    "a10‡"     (double dagger = stage2)
//   PP Stage3 promotion:  "a10=A"    (becomes Adventitious King)
//   Citadel entry:        "K→Cit"
//   Citadel defense:      "A→Cit-own"
//   Check suffix:         "+"
//   Checkmate suffix:     "#"
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
  isPawnType,
  isRoyalType,
  getPiece,
  createInitialGameState,
} from './board'
import { WHITE_CITADEL, BLACK_CITADEL, FILES, RANKS } from './constants'
import { generateMovesForPiece } from './moves'
import { isInCheck, isCheckmate } from './rules'

// =============================================================================
// Piece Letter Mapping
// =============================================================================

const PIECE_LETTER: Partial<Record<PieceType, string>> = {
  [PieceType.KING]:              'K',
  [PieceType.GENERAL]:           'G',
  [PieceType.VIZIER]:            'V',
  [PieceType.ROOK]:              'R',
  [PieceType.KNIGHT]:            'N',
  [PieceType.PICKET]:            'T',
  [PieceType.GIRAFFE]:           'Z',
  [PieceType.ELEPHANT]:          'E',
  [PieceType.CAMEL]:             'C',
  [PieceType.WAR_ENGINE]:        'W',
  [PieceType.PRINCE]:            'P',
  [PieceType.ADVENTITIOUS_KING]: 'A',
}

function fileToChar(file: number): string {
  return String.fromCharCode('a'.charCodeAt(0) + file)
}

// =============================================================================
// Square ↔ Algebraic
// =============================================================================

/**
 * Converts a Square to algebraic notation.
 * { file:0, rank:0 } → "a1" … { file:10, rank:9 } → "k10"
 * WHITE_CITADEL → "Cit-w"   BLACK_CITADEL → "Cit-b"
 */
export function squareToAlgebraic(square: Square): string {
  if (squaresEqual(square, WHITE_CITADEL)) return 'Cit-w'
  if (squaresEqual(square, BLACK_CITADEL)) return 'Cit-b'
  return fileToChar(square.file) + String(square.rank + 1)
}

/**
 * Converts algebraic notation back to a Square.
 * Accepts "a1"–"k10", "Cit-w", "Cit-b".
 */
export function algebraicToSquare(notation: string): Square {
  if (notation === 'Cit-w') return { ...WHITE_CITADEL }
  if (notation === 'Cit-b') return { ...BLACK_CITADEL }
  if (notation.length < 2) throw new Error(`algebraicToSquare: invalid "${notation}"`)
  const file = notation.charCodeAt(0) - 'a'.charCodeAt(0)
  const rank  = parseInt(notation.slice(1), 10) - 1
  if (isNaN(rank) || file < 0 || file > 10 || rank < 0 || rank > 9) {
    throw new Error(`algebraicToSquare: out-of-range "${notation}"`)
  }
  return { file, rank }
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Returns the minimal disambiguation prefix for a non-pawn move.
 * Empty string if no other piece of the same type can reach the same square.
 */
function getDisambiguation(move: Move, state: GameState): string {
  let otherCnt    = 0
  let sameFileCnt = 0

  for (const [key, piece] of state.pieces) {
    if (piece.type !== move.piece.type || piece.color !== move.piece.color) continue
    if (key === squareToKey(move.from)) continue

    const sq = keyToSquare(key)
    const reachable = generateMovesForPiece(sq, piece, state)
    if (!reachable.some(m => squaresEqual(m.to, move.to))) continue

    otherCnt++
    if (sq.file === move.from.file) sameFileCnt++
  }

  if (otherCnt === 0)    return ''
  if (sameFileCnt === 0) return fileToChar(move.from.file)
  return String(move.from.rank + 1)
}

/**
 * Applies a move to a cloned state without full validation.
 * Used only for check/checkmate detection in notation suffixes.
 */
function applyMoveLight(move: Move, state: GameState): GameState {
  const s: GameState = {
    ...state,
    pieces:      new Map(state.pieces),
    whiteRoyals: [...state.whiteRoyals],
    blackRoyals: [...state.blackRoyals],
    history:     [...state.history],
  }
  if (move.flag === MoveFlag.KING_SWAP) {
    const fp = s.pieces.get(squareToKey(move.from))
    const tp = s.pieces.get(squareToKey(move.to))
    if (fp) s.pieces.set(squareToKey(move.to),   fp)
    else    s.pieces.delete(squareToKey(move.to))
    if (tp) s.pieces.set(squareToKey(move.from), tp)
    else    s.pieces.delete(squareToKey(move.from))
  } else {
    s.pieces.delete(squareToKey(move.from))
    if (move.flag === MoveFlag.PROMOTION && move.promotionType) {
      s.pieces.set(squareToKey(move.to), { type: move.promotionType, color: move.piece.color })
    } else {
      s.pieces.set(squareToKey(move.to), move.piece)
    }
  }
  s.turn = move.piece.color === 'w' ? 'b' : 'w'
  return s
}

// =============================================================================
// Move → Algebraic Notation
// =============================================================================

/**
 * Converts a Move to its algebraic notation string.
 *
 * `state` must be the GameState BEFORE the move is applied.
 * Used for disambiguation and check/checkmate detection.
 */
export function moveToAlgebraic(move: Move, state: GameState): string {
  let notation: string
  const dest = squareToAlgebraic(move.to)

  switch (move.flag) {
    case MoveFlag.KING_SWAP: {
      const swapped = getPiece(state.pieces, move.to)
      const sl = swapped ? (PIECE_LETTER[swapped.type] ?? '') : ''
      notation = `K↔${sl}${dest}`
      break
    }
    case MoveFlag.PAWN_OF_PAWNS_TELEPORT:
      notation = `PP→${dest}`
      break
    case MoveFlag.CITADEL_ENTRY:
      notation = `${PIECE_LETTER[move.piece.type] ?? ''}→Cit`
      break
    case MoveFlag.CITADEL_DEFENSE:
      notation = `${PIECE_LETTER[move.piece.type] ?? ''}→Cit-own`
      break
    case MoveFlag.PAWN_OF_PAWNS_STAGE1_ARRIVAL:
      notation = `${dest}†`
      break
    case MoveFlag.PAWN_OF_PAWNS_STAGE2_ARRIVAL:
      notation = `${dest}‡`
      break
    case MoveFlag.PAWN_OF_PAWNS_STAGE3_PROMOTION:
      notation = `${dest}=A`
      break
    case MoveFlag.PROMOTION: {
      const pl = move.promotionType ? (PIECE_LETTER[move.promotionType] ?? '') : ''
      notation = move.captured
        ? `${fileToChar(move.from.file)}x${dest}=${pl}`
        : `${dest}=${pl}`
      break
    }
    case MoveFlag.CAPTURE:
      if (isPawnType(move.piece.type)) {
        notation = `${fileToChar(move.from.file)}x${dest}`
      } else {
        const pl = PIECE_LETTER[move.piece.type] ?? ''
        notation = `${pl}${getDisambiguation(move, state)}x${dest}`
      }
      break
    case MoveFlag.NORMAL:
    default:
      if (isPawnType(move.piece.type)) {
        notation = dest
      } else {
        const pl = PIECE_LETTER[move.piece.type] ?? ''
        notation = `${pl}${getDisambiguation(move, state)}${dest}`
      }
      break
  }

  // Append check / checkmate suffix
  const opponentColor: Color = move.piece.color === 'w' ? 'b' : 'w'
  try {
    const post = applyMoveLight(move, state)
    if (isCheckmate(opponentColor, post)) notation += '#'
    else if (isInCheck(opponentColor, post)) notation += '+'
  } catch { /* ignore errors in citadel/edge cases */ }

  return notation
}

// =============================================================================
// Game → Move List
// =============================================================================

/**
 * Returns the full move history as algebraic notation strings.
 *
 * Assumes the game started from the standard Tamerlane starting position
 * (createInitialGameState). Replays moves using applyMoveLight to reconstruct
 * per-move pre-states for accurate disambiguation and check suffixes.
 */
export function gameToMoveList(state: GameState): string[] {
  const result: string[] = []
  let replayState = createInitialGameState()

  for (const move of state.history) {
    result.push(moveToAlgebraic(move, replayState))
    replayState = applyMoveLight(move, replayState)
  }

  return result
}

// =============================================================================
// TFEN Serialization — Tamerlane FEN snapshot format
// =============================================================================
//
// Format:
//   <r9>/<r8>/.../<r0>|<wCit>,<bCit> <turn> <swap> <wPP>:<bPP> <moveNum>
//
// Rank encoding (FEN-style):
//   piece code = color ('w'|'b') + PieceType string value
//     e.g.: 'wK' (white King), 'bpp' (black Pawn of Pawns), 'wpr' (white Pawn of Rooks)
//   consecutive empty squares → single decimal number  (e.g., "11" = 11 empties)
//   no separator between tokens — parseable because piece type codes are either
//   one uppercase char (K,G,V,R,N,T,Z,E,C,W,P,A) or two lowercase chars (pp,pk,…)
//
// Citadels: piece code or "-" for each citadel square, comma-separated.
// Swap:     'Kk'=both available, 'K'=white only, 'k'=black only, '-'=neither used.
// PP:       numeric PawnOfPawnsStage values for white:black.
// moveNum:  full-move counter.
//
// halfMoveCount is derived from moveNumber + turn on parse (not stored).
// History is never stored — TFEN is a snapshot, not a transcript.
// =============================================================================

/** Reverse lookup: PieceType string value → PieceType enum member. */
const TFEN_TYPE_MAP = new Map<string, PieceType>(
  (Object.values(PieceType) as string[]).map(v => [v, v as PieceType]),
)

function encodeRank(pieces: Map<string, Piece>, rank: number): string {
  let result = ''
  let emptyCount = 0
  for (let file = 0; file < FILES; file++) {
    const piece = pieces.get(squareToKey({ file, rank }))
    if (!piece) {
      emptyCount++
    } else {
      if (emptyCount > 0) { result += String(emptyCount); emptyCount = 0 }
      result += piece.color + (piece.type as string)
    }
  }
  if (emptyCount > 0) result += String(emptyCount)
  return result
}

function decodeRank(rankStr: string, rank: number, pieces: Map<string, Piece>): void {
  let file = 0
  let i = 0
  while (i < rankStr.length) {
    const ch = rankStr[i]
    if (ch >= '0' && ch <= '9') {
      // Greedy: read complete decimal number (handles "11" = eleven empty squares)
      let numStr = ''
      while (i < rankStr.length && rankStr[i] >= '0' && rankStr[i] <= '9') numStr += rankStr[i++]
      file += parseInt(numStr, 10)
    } else if (ch === 'w' || ch === 'b') {
      const color: Color = ch as Color
      i++
      // Pawn type codes are lowercase 2-char starting with 'p' (pp, pk, pg, …)
      // Major/special piece codes are single uppercase char (K, R, P, A, …)
      let typeCode: string
      if (i < rankStr.length && rankStr[i] === 'p') {
        typeCode = rankStr[i] + (rankStr[i + 1] ?? '')
        i += 2
      } else {
        typeCode = rankStr[i] ?? ''
        i++
      }
      const type = TFEN_TYPE_MAP.get(typeCode)
      if (!type) throw new Error(`tFENtoState: unknown piece type "${typeCode}" at r${rank} f${file}`)
      pieces.set(squareToKey({ file, rank }), { type, color })
      file++
    } else {
      throw new Error(`tFENtoState: unexpected char "${ch}" in rank string "${rankStr}"`)
    }
  }
}

function encodeCitadelPiece(piece: Piece | null): string {
  return piece ? piece.color + (piece.type as string) : '-'
}

function decodeCitadelPiece(code: string): Piece | null {
  if (code === '-') return null
  if (code.length < 2) throw new Error(`tFENtoState: invalid citadel piece code "${code}"`)
  const color = code[0] as Color
  if (color !== 'w' && color !== 'b') throw new Error(`tFENtoState: invalid color "${color}"`)
  const typeCode = code.slice(1)
  const type = TFEN_TYPE_MAP.get(typeCode)
  if (!type) throw new Error(`tFENtoState: unknown citadel piece type "${typeCode}"`)
  return { type, color }
}

function encodeSwap(state: GameState): string {
  const w = !state.whiteKingSwapUsed
  const b = !state.blackKingSwapUsed
  if (w && b) return 'Kk'
  if (w) return 'K'
  if (b) return 'k'
  return '-'
}

function buildRoyalsFromBoard(pieces: Map<string, Piece>, color: Color): Square[] {
  const royals: Square[] = []
  for (const [key, piece] of pieces) {
    if (piece.color === color && isRoyalType(piece.type)) {
      royals.push(keyToSquare(key))
    }
  }
  return royals
}

/**
 * Serializes a GameState to a TFEN (Tamerlane FEN) snapshot string.
 *
 * Round-trip guarantee: tFENtoState(stateToTFEN(state)) produces an equivalent
 * board position with matching turn, PP stages, swap flags, and move number.
 * History and halfMoveCount are not encoded (derived or reset on parse).
 */
export function stateToTFEN(state: GameState): string {
  const rankParts: string[] = []
  for (let rank = RANKS - 1; rank >= 0; rank--) {
    rankParts.push(encodeRank(state.pieces, rank))
  }
  const boardStr = rankParts.join('/')
  const citStr = `${encodeCitadelPiece(state.whiteCitadelOccupant)},${encodeCitadelPiece(state.blackCitadelOccupant)}`
  const swap = encodeSwap(state)
  const pp = `${state.whitePawnOfPawnsStage}:${state.blackPawnOfPawnsStage}`
  return `${boardStr}|${citStr} ${state.turn} ${swap} ${pp} ${state.moveNumber}`
}

/**
 * Parses a TFEN string back into a GameState.
 *
 * - Royals list rebuilt from board scan (King, Prince, Adventitious King).
 * - halfMoveCount derived from moveNumber and turn.
 * - history is always [].
 * - result is always null — caller should run getGameResult if needed.
 *
 * Throws on malformed input.
 */
export function tFENtoState(tfen: string): GameState {
  if (!tfen || typeof tfen !== 'string') {
    throw new Error('tFENtoState: input must be a non-empty string')
  }

  const pipeIdx = tfen.indexOf('|')
  if (pipeIdx < 0) throw new Error('tFENtoState: missing "|" separator')

  const boardPart = tfen.slice(0, pipeIdx)
  const rest = tfen.slice(pipeIdx + 1)

  const spaceIdx = rest.indexOf(' ')
  if (spaceIdx < 0) throw new Error('tFENtoState: missing space after citadels')
  const citadelsStr = rest.slice(0, spaceIdx)
  const metaStr = rest.slice(spaceIdx + 1)

  // Parse ranks: first token = rank 9, last = rank 0
  const rankStrings = boardPart.split('/')
  if (rankStrings.length !== RANKS) {
    throw new Error(`tFENtoState: expected ${RANKS} rank tokens, got ${rankStrings.length}`)
  }
  const pieces = new Map<string, Piece>()
  for (let i = 0; i < RANKS; i++) {
    decodeRank(rankStrings[i], RANKS - 1 - i, pieces)
  }

  // Parse citadel occupants
  const commaIdx = citadelsStr.indexOf(',')
  if (commaIdx < 0) throw new Error('tFENtoState: missing "," in citadel section')
  const whiteCitadelOccupant = decodeCitadelPiece(citadelsStr.slice(0, commaIdx))
  const blackCitadelOccupant = decodeCitadelPiece(citadelsStr.slice(commaIdx + 1))
  if (whiteCitadelOccupant) pieces.set(squareToKey(WHITE_CITADEL), whiteCitadelOccupant)
  if (blackCitadelOccupant) pieces.set(squareToKey(BLACK_CITADEL), blackCitadelOccupant)

  // Parse metadata: <turn> <swap> <wPP>:<bPP> <moveNum>
  const meta = metaStr.split(' ')
  if (meta.length !== 4) {
    throw new Error(`tFENtoState: expected 4 metadata fields, got ${meta.length}`)
  }
  const turn = meta[0] as Color
  if (turn !== 'w' && turn !== 'b') throw new Error(`tFENtoState: invalid turn "${turn}"`)

  const whiteKingSwapUsed = !meta[1].includes('K')
  const blackKingSwapUsed = !meta[1].includes('k')

  const ppParts = meta[2].split(':')
  if (ppParts.length !== 2) throw new Error(`tFENtoState: invalid PP stages "${meta[2]}"`)
  const whitePawnOfPawnsStage = parseInt(ppParts[0], 10) as PawnOfPawnsStage
  const blackPawnOfPawnsStage = parseInt(ppParts[1], 10) as PawnOfPawnsStage
  if (isNaN(whitePawnOfPawnsStage) || isNaN(blackPawnOfPawnsStage)) {
    throw new Error('tFENtoState: PP stage values must be integers')
  }

  const moveNumber = parseInt(meta[3], 10)
  if (isNaN(moveNumber) || moveNumber < 1) {
    throw new Error(`tFENtoState: invalid moveNumber "${meta[3]}"`)
  }

  // halfMoveCount: derived from moveNumber + turn (not encoded in TFEN)
  const halfMoveCount = (moveNumber - 1) * 2 + (turn === 'b' ? 1 : 0)

  return {
    pieces,
    turn,
    moveNumber,
    halfMoveCount,
    whiteKingSwapUsed,
    blackKingSwapUsed,
    whitePawnOfPawnsStage,
    blackPawnOfPawnsStage,
    whiteRoyals: buildRoyalsFromBoard(pieces, 'w'),
    blackRoyals: buildRoyalsFromBoard(pieces, 'b'),
    whiteCitadelOccupant,
    blackCitadelOccupant,
    result: null,
    history: [],
  }
}
