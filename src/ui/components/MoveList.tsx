// =============================================================================
// TAMERLANE SIEGE — Move List (notation sidebar)
// src/ui/components/MoveList.tsx
//
// Receives pre-computed half-move strings from gameToMoveList() and renders
// them paired as:  "1. Cb4   a7"  (white move + black move on one row).
// =============================================================================

import { useEffect, useRef } from 'react'

interface MoveListProps {
  /** Array of algebraic half-move strings from gameToMoveList(). */
  halfMoves: string[]
}

export function MoveList({ halfMoves }: MoveListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new moves
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [halfMoves.length])

  // Pair half-moves: index 0+1 → move 1, 2+3 → move 2, …
  const pairs: Array<{ n: number; white: string; black: string }> = []
  for (let i = 0; i < halfMoves.length; i += 2) {
    pairs.push({
      n:     Math.floor(i / 2) + 1,
      white: halfMoves[i]     ?? '',
      black: halfMoves[i + 1] ?? '',
    })
  }

  const containerStyle: React.CSSProperties = {
    background:    'var(--surface-secondary)',
    border:        '1px solid var(--surface-tertiary)',
    borderRadius:  8,
    overflowY:     'auto',
    maxHeight:     '100%',
    fontFamily:    'monospace',
    fontSize:      14,
    color:         'var(--text-primary)',
  }

  const headerStyle: React.CSSProperties = {
    padding:       '8px 12px',
    fontWeight:    700,
    fontSize:      12,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color:         'var(--text-muted)',
    borderBottom:  '1px solid var(--surface-tertiary)',
    position:      'sticky',
    top:           0,
    background:    'var(--surface-secondary)',
  }

  const rowStyle = (idx: number): React.CSSProperties => ({
    display:    'grid',
    gridTemplateColumns: '2.2em 1fr 1fr',
    padding:    '3px 12px',
    gap:        8,
    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)',
  })

  const numStyle: React.CSSProperties = {
    color:   'var(--text-muted)',
    userSelect: 'none',
  }

  if (pairs.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>Moves</div>
        <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: 12 }}>
          No moves yet
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>Moves</div>
      {pairs.map(({ n, white, black }, idx) => (
        <div key={n} style={rowStyle(idx)}>
          <span style={numStyle}>{n}.</span>
          <span>{white}</span>
          <span style={{ color: 'var(--text-secondary)' }}>{black}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
