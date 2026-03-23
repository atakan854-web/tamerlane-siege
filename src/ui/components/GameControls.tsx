// =============================================================================
// TAMERLANE SIEGE — Game Controls
// src/ui/components/GameControls.tsx
//
// Simple button bar: New Game + Undo.
// =============================================================================

interface GameControlsProps {
  onNewGame: () => void
  onUndo:    () => void
  canUndo:   boolean
}

export function GameControls({ onNewGame, onUndo, canUndo }: GameControlsProps) {
  const btnBase: React.CSSProperties = {
    padding:       '8px 20px',
    borderRadius:  6,
    border:        'none',
    cursor:        'pointer',
    fontWeight:    600,
    fontSize:      14,
    letterSpacing: '0.02em',
    transition:    'opacity 0.15s',
  }

  const btnPrimary: React.CSSProperties = {
    ...btnBase,
    background: 'var(--btn-primary-bg)',
    color:      'var(--btn-primary-text)',
  }

  const btnSecondary: React.CSSProperties = {
    ...btnBase,
    background: 'var(--btn-secondary-bg)',
    color:      'var(--btn-secondary-text)',
    opacity:    canUndo ? 1 : 0.4,
    cursor:     canUndo ? 'pointer' : 'not-allowed',
  }

  return (
    <div
      style={{
        display:    'flex',
        gap:        10,
        marginTop:  12,
        flexWrap:   'wrap',
      }}
    >
      <button style={btnPrimary} onClick={onNewGame}>
        New Game
      </button>
      <button
        style={btnSecondary}
        onClick={canUndo ? onUndo : undefined}
        disabled={!canUndo}
        aria-disabled={!canUndo}
      >
        Undo
      </button>
    </div>
  )
}
