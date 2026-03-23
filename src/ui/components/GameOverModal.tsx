// =============================================================================
// TAMERLANE SIEGE — Game Over Modal
// src/ui/components/GameOverModal.tsx
// =============================================================================

import { useEffect } from 'react'
import { GameResult } from '../../core/types'

interface GameOverModalProps {
  result:    GameResult
  onNewGame: () => void
}

const RESULT_MESSAGES: Record<GameResult, { headline: string; sub: string }> = {
  [GameResult.WHITE_WINS_CHECKMATE]: { headline: 'Checkmate!',  sub: 'White wins.' },
  [GameResult.BLACK_WINS_CHECKMATE]: { headline: 'Checkmate!',  sub: 'Black wins.' },
  [GameResult.WHITE_WINS_STALEMATE]: { headline: 'Stalemate!',  sub: 'White wins — Black has no legal moves.' },
  [GameResult.BLACK_WINS_STALEMATE]: { headline: 'Stalemate!',  sub: 'Black wins — White has no legal moves.' },
  [GameResult.DRAW_CITADEL]:         { headline: 'Draw!',        sub: 'A royal piece entered the citadel.' },
}

export function GameOverModal({ result, onNewGame }: GameOverModalProps) {
  // Dismiss on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onNewGame() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onNewGame])

  const { headline, sub } = RESULT_MESSAGES[result]

  const backdropStyle: React.CSSProperties = {
    position:       'fixed',
    inset:          0,
    background:     'var(--surface-overlay)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         200,
  }

  const boxStyle: React.CSSProperties = {
    background:   'var(--surface-secondary)',
    border:       '2px solid var(--accent-gold)',
    borderRadius: 16,
    padding:      '36px 48px',
    maxWidth:     420,
    width:        '90%',
    textAlign:    'center',
    color:        'var(--text-primary)',
    boxShadow:    '0 12px 48px rgba(0,0,0,0.7)',
  }

  return (
    <div style={backdropStyle}>
      <div style={boxStyle}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>♟</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 28, color: 'var(--accent-gold)' }}>
          {headline}
        </h2>
        <p style={{ margin: '0 0 28px', color: 'var(--text-secondary)', fontSize: 16 }}>
          {sub}
        </p>
        <button
          onClick={onNewGame}
          style={{
            background:    'var(--btn-primary-bg)',
            color:         'var(--btn-primary-text)',
            border:        'none',
            borderRadius:  8,
            padding:       '10px 28px',
            fontSize:      16,
            fontWeight:    700,
            cursor:        'pointer',
            letterSpacing: '0.03em',
          }}
        >
          New Game
        </button>
      </div>
    </div>
  )
}
