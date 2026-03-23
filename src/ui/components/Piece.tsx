// =============================================================================
// TAMERLANE SIEGE — Piece Component
// src/ui/components/Piece.tsx
// =============================================================================

import type { Piece } from '../../core/types'
import { PieceType } from '../../core/types'

// -----------------------------------------------------------------------------
// SVG filename mapping
// -----------------------------------------------------------------------------

const PAWN_TYPES = new Set<PieceType>([
  PieceType.PAWN_OF_KINGS,       // → {color}-pk.svg
  PieceType.PAWN_OF_PAWNS,       // → {color}-pp.svg
  PieceType.PAWN_OF_GENERALS,    // → {color}-pawn.svg
  PieceType.PAWN_OF_VIZIERS,
  PieceType.PAWN_OF_ROOKS,
  PieceType.PAWN_OF_KNIGHTS,
  PieceType.PAWN_OF_PICKETS,
  PieceType.PAWN_OF_GIRAFFES,
  PieceType.PAWN_OF_ELEPHANTS,
  PieceType.PAWN_OF_CAMELS,
  PieceType.PAWN_OF_WAR_ENGINES,
])

function svgFilename(piece: Piece): string {
  const c = piece.color
  const t = piece.type
  if (t === PieceType.PAWN_OF_PAWNS) return `${c}-pp.svg`
  if (t === PieceType.PAWN_OF_KINGS) return `${c}-pk.svg`
  if (PAWN_TYPES.has(t))             return `${c}-pawn.svg`
  // Major pieces & royals: type value is the single uppercase letter
  return `${c}-${t}.svg`
}

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

interface PieceProps {
  piece:      Piece
  /** Top-left pixel position relative to the GameBoard container. */
  left:       number
  top:        number
  /** Square size in pixels. */
  size:       number
  isSelected?: boolean
  /** True when this royal piece is currently in check. */
  isCheck?:   boolean
  onClick?:   () => void
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function PieceComponent({ piece, left, top, size, isSelected, isCheck, onClick }: PieceProps) {
  const src = `/pieces/default/${svgFilename(piece)}`

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width:  size,
        height: size,
        boxSizing: 'border-box',
        padding: size * 0.05,
        cursor: onClick ? 'pointer' : 'default',
        outline: isCheck
          ? `${Math.max(2, size * 0.05)}px solid var(--highlight-check)`
          : isSelected
            ? `${Math.max(2, size * 0.04)}px solid var(--board-selected)`
            : undefined,
        borderRadius: 4,
        zIndex: isSelected ? 10 : 1,
        transition: 'outline 0.1s',
        userSelect: 'none',
      }}
      onClick={onClick}
      aria-label={`${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}`}
    >
      <img
        src={src}
        alt={`${piece.color} ${piece.type}`}
        style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
        draggable={false}
      />
    </div>
  )
}
