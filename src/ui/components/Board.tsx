// =============================================================================
// TAMERLANE SIEGE — SVG Board Component
// src/ui/components/Board.tsx
//
// Pure rendering — no game logic.  Receives pre-computed highlight sets from
// GameBoard.tsx and draws the board with appropriate visual feedback.
//
// Highlight priority (highest → lowest, first match wins per square):
//   selected > check > lastTo > lastFrom > kingswap > citadel > legal-capture
//   > legal-empty (dot overlay) > normal
// =============================================================================

import type { Square } from '../../core/types'
import { WHITE_CITADEL, BLACK_CITADEL } from '../../core/constants'

// -----------------------------------------------------------------------------
// ViewBox constants (all in SVG user units)
// -----------------------------------------------------------------------------

export const VB_SQ      = 100   // square size
export const VB_BOARD_X = 140   // left offset (room for rank labels + black citadel)
export const VB_BOARD_Y = 10    // top offset
export const VB_W       = 1350  // total viewBox width
export const VB_H       = 1050  // total viewBox height

const FILES = 11
const RANKS = 10

// Half-square; used for dot / ring sizing
const HALF   = VB_SQ / 2
const DOT_R  = 15   // radius of legal-empty dot
const RING_R = 43   // radius of legal-capture ring (outer)
const RING_W = 10   // stroke width of ring

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Convert game coordinates to SVG viewBox coordinates (top-left of square). */
export function squareToVB(file: number, rank: number) {
  return {
    x: VB_BOARD_X + file * VB_SQ,
    y: VB_BOARD_Y + (RANKS - 1 - rank) * VB_SQ,
  }
}

/** Convert game coordinates to rendered pixel position (top-left of square). */
export function squareToPx(file: number, rank: number, boardWidth: number) {
  const scale = boardWidth / VB_W
  const { x, y } = squareToVB(file, rank)
  return { left: x * scale, top: y * scale, size: VB_SQ * scale }
}

function sqKey(f: number, r: number) { return `${f},${r}` }

function inSet(set: Square[], f: number, r: number) {
  return set.some(s => s.file === f && s.rank === r)
}

// -----------------------------------------------------------------------------
// Square base fill (no highlight)
// -----------------------------------------------------------------------------

// Tamerlane Chess uses a uniform (uncheckered) board.
function baseFill(_file: number, _rank: number): string {
  return 'var(--board-bg)'
}

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

export interface BoardHighlights {
  /** Currently selected piece's square. */
  selected?:      Square | null
  /** Legal moves landing on empty squares → dot overlay. */
  legalEmpty:     Square[]
  /** Legal moves landing on an enemy piece → ring overlay. */
  legalCaptures:  Square[]
  /** Legal moves that are CITADEL_ENTRY → golden tint. */
  legalCitadel:   Square[]
  /** Legal KING_SWAP target squares → blue tint + ring. */
  legalKingSwap:  Square[]
  /** Royals currently in check → red tint. */
  checkSquares:   Square[]
  /** Origin of the last move played. */
  lastFrom?:      Square | null
  /** Destination of the last move played. */
  lastTo?:        Square | null
}

interface BoardProps extends BoardHighlights {
  onSquareClick?: (square: Square) => void
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function Board({
  selected,
  legalEmpty     = [],
  legalCaptures  = [],
  legalCitadel   = [],
  legalKingSwap  = [],
  checkSquares   = [],
  lastFrom,
  lastTo,
  onSquareClick,
}: BoardProps) {
  const handleClick = (square: Square) => onSquareClick?.(square)

  // -- Lookup helpers ---------------------------------------------------------
  const isSel      = (f: number, r: number) => selected?.file === f && selected?.rank === r
  const isCheck    = (f: number, r: number) => inSet(checkSquares,  f, r)
  const isLastTo   = (f: number, r: number) => lastTo?.file === f  && lastTo?.rank === r
  const isLastFrom = (f: number, r: number) => lastFrom?.file === f && lastFrom?.rank === r
  const isKSwap    = (f: number, r: number) => inSet(legalKingSwap, f, r)
  const isCitDraw  = (f: number, r: number) => inSet(legalCitadel,  f, r)

  // -- Square fill (the base rect; rings / dots added as separate elements) ---
  function squareFill(f: number, r: number): string {
    if (isSel(f, r))    return 'var(--board-selected)'
    if (isCheck(f, r))  return 'var(--highlight-check)'
    if (isLastTo(f, r)) return 'var(--board-last-to)'
    if (isLastFrom(f, r)) return 'var(--board-last-from)'
    if (isKSwap(f, r))  return 'var(--highlight-kingswap)'
    if (isCitDraw(f, r)) return 'var(--highlight-citadel-draw)'
    return baseFill(f, r)
  }

  const cursorStyle: React.CSSProperties = { cursor: onSquareClick ? 'pointer' : 'default' }

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      aria-label="Tamerlane Siege board"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Main board squares — base fill                                       */}
      {/* ------------------------------------------------------------------ */}
      {Array.from({ length: RANKS }, (_, ri) => {
        const rank = RANKS - 1 - ri
        return Array.from({ length: FILES }, (_, file) => {
          const { x, y } = squareToVB(file, rank)
          return (
            <rect
              key={sqKey(file, rank)}
              x={x} y={y}
              width={VB_SQ} height={VB_SQ}
              fill={squareFill(file, rank)}
              onClick={() => handleClick({ file, rank })}
              style={cursorStyle}
            />
          )
        })
      })}

      {/* ------------------------------------------------------------------ */}
      {/* Grid lines                                                           */}
      {/* ------------------------------------------------------------------ */}
      {Array.from({ length: FILES + 1 }, (_, i) => (
        <line
          key={`vl-${i}`}
          x1={VB_BOARD_X + i * VB_SQ} y1={VB_BOARD_Y}
          x2={VB_BOARD_X + i * VB_SQ} y2={VB_BOARD_Y + RANKS * VB_SQ}
          stroke="var(--board-grid)"
          strokeWidth={i === 0 || i === FILES ? 2 : 1}
          style={{ pointerEvents: 'none' }}
        />
      ))}
      {Array.from({ length: RANKS + 1 }, (_, i) => (
        <line
          key={`hl-${i}`}
          x1={VB_BOARD_X}                   y1={VB_BOARD_Y + i * VB_SQ}
          x2={VB_BOARD_X + FILES * VB_SQ}   y2={VB_BOARD_Y + i * VB_SQ}
          stroke="var(--board-grid)"
          strokeWidth={i === 0 || i === RANKS ? 2 : 1}
          style={{ pointerEvents: 'none' }}
        />
      ))}

      {/* ------------------------------------------------------------------ */}
      {/* Legal-move dots (empty squares)                                      */}
      {/* ------------------------------------------------------------------ */}
      {legalEmpty.map(({ file, rank }) => {
        const { x, y } = squareToVB(file, rank)
        return (
          <circle
            key={`dot-${sqKey(file, rank)}`}
            cx={x + HALF}
            cy={y + HALF}
            r={DOT_R}
            fill="var(--highlight-legal-dot)"
            style={{ pointerEvents: 'none' }}
          />
        )
      })}

      {/* ------------------------------------------------------------------ */}
      {/* Legal-move rings (enemy piece squares)                               */}
      {/* ------------------------------------------------------------------ */}
      {legalCaptures.map(({ file, rank }) => {
        const { x, y } = squareToVB(file, rank)
        return (
          <circle
            key={`ring-${sqKey(file, rank)}`}
            cx={x + HALF}
            cy={y + HALF}
            r={RING_R}
            fill="none"
            stroke="var(--highlight-capture)"
            strokeWidth={RING_W}
            style={{ pointerEvents: 'none' }}
          />
        )
      })}

      {/* ------------------------------------------------------------------ */}
      {/* King-swap rings (blue, distinct from capture)                        */}
      {/* ------------------------------------------------------------------ */}
      {legalKingSwap.map(({ file, rank }) => {
        const { x, y } = squareToVB(file, rank)
        return (
          <circle
            key={`kswap-${sqKey(file, rank)}`}
            cx={x + HALF}
            cy={y + HALF}
            r={RING_R}
            fill="none"
            stroke="var(--highlight-kingswap)"
            strokeWidth={RING_W + 2}
            style={{ pointerEvents: 'none' }}
          />
        )
      })}

      {/* ------------------------------------------------------------------ */}
      {/* White citadel (file 11, rank 1) — right of main board               */}
      {/* ------------------------------------------------------------------ */}
      {(() => {
        const sq   = WHITE_CITADEL
        const { x, y } = squareToVB(sq.file, sq.rank)
        const isSq = isSel(sq.file, sq.rank)
        const isCit = isCitDraw(sq.file, sq.rank)
        const fill = isSq ? 'var(--board-selected)'
                   : isCit ? 'var(--highlight-citadel-draw)'
                   : 'var(--citadel-bg)'
        return (
          <g key="white-citadel">
            <rect
              x={x} y={y} width={VB_SQ} height={VB_SQ}
              fill={fill}
              stroke="var(--citadel-border)" strokeWidth={2}
              onClick={() => handleClick(sq)}
              style={cursorStyle}
            />
          </g>
        )
      })()}

      {/* ------------------------------------------------------------------ */}
      {/* Black citadel (file -1, rank 8) — left of main board                */}
      {/* ------------------------------------------------------------------ */}
      {(() => {
        const sq   = BLACK_CITADEL
        const { x, y } = squareToVB(sq.file, sq.rank)
        const isSq = isSel(sq.file, sq.rank)
        const isCit = isCitDraw(sq.file, sq.rank)
        const fill = isSq ? 'var(--board-selected)'
                   : isCit ? 'var(--highlight-citadel-draw)'
                   : 'var(--citadel-bg)'
        return (
          <g key="black-citadel">
            <rect
              x={x} y={y} width={VB_SQ} height={VB_SQ}
              fill={fill}
              stroke="var(--citadel-border)" strokeWidth={2}
              onClick={() => handleClick(sq)}
              style={cursorStyle}
            />
          </g>
        )
      })()}

      {/* ------------------------------------------------------------------ */}
      {/* File labels — a through k                                            */}
      {/* ------------------------------------------------------------------ */}
      {Array.from({ length: FILES }, (_, file) => (
        <text
          key={`fl-${file}`}
          x={VB_BOARD_X + file * VB_SQ + HALF}
          y={VB_BOARD_Y + RANKS * VB_SQ + 40}
          textAnchor="middle" fontSize={28}
          fill="var(--text-secondary)"
          style={{ pointerEvents: 'none' }}
        >
          {String.fromCharCode(97 + file)}
        </text>
      ))}

      {/* ------------------------------------------------------------------ */}
      {/* Rank labels — 1 through 10                                          */}
      {/* ------------------------------------------------------------------ */}
      {Array.from({ length: RANKS }, (_, ri) => {
        const rank = RANKS - 1 - ri
        const { y } = squareToVB(0, rank)
        return (
          <text
            key={`rl-${rank}`}
            x={VB_BOARD_X - 15}
            y={y + HALF + 10}
            textAnchor="end" fontSize={26}
            fill="var(--text-secondary)"
            style={{ pointerEvents: 'none' }}
          >
            {rank + 1}
          </text>
        )
      })}
    </svg>
  )
}
