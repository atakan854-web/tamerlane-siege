// =============================================================================
// TAMERLANE SIEGE — App Root
// src/App.tsx
//
// Screens:  'home' | 'pvp' | 'ai'
//
// AI is run inline on the main thread via setTimeout — no Worker, no hook.
// The `window.__aiPending` flag (keyed on halfMoveCount) prevents double-fire.
// =============================================================================

import { useState, useCallback, useMemo, useEffect } from 'react'
import { createNewGame, makeMove, undoMove } from './core/game'
import { getGameResult }                     from './core/rules'
import { gameToMoveList }                    from './core/notation'
import type { GameState, Move }              from './core/types'
import { GameBoard }     from './ui/components/GameBoard'
import { GameControls }  from './ui/components/GameControls'
import { MoveList }      from './ui/components/MoveList'
import { GameOverModal } from './ui/components/GameOverModal'
import { findBestMove }  from './ai/search'
import { getDifficultyParams, DIFFICULTY_LABELS } from './ai/difficulty'

// =============================================================================
// Types
// =============================================================================

type Screen = 'home' | 'pvp' | 'ai'

declare global {
  interface Window {
    e:           { state: () => GameState; undo: () => void; reset: () => void }
    __aiPending: number   // halfMoveCount of the in-flight AI search (-1 = idle)
  }
}

// Initialise sentinel so the first check never false-matches
if (typeof window !== 'undefined') window.__aiPending = -1

// AI always plays Black in this implementation
const AI_COLOR = 'b' as const

// =============================================================================
// HomeScreen
// =============================================================================

interface HomeScreenProps {
  onPvP:    () => void
  onAI:     (difficulty: number) => void
  initDiff: number
}

function HomeScreen({ onPvP, onAI, initDiff }: HomeScreenProps) {
  const [diff, setDiff] = useState(initDiff)

  const card: React.CSSProperties = {
    background:   'var(--surface-secondary)',
    border:       '1px solid var(--accent-gold-muted)',
    borderRadius: 16,
    padding:      '40px 48px',
    maxWidth:     460,
    width:        '90%',
    textAlign:    'center',
    color:        'var(--text-primary)',
    boxShadow:    '0 8px 40px rgba(0,0,0,0.5)',
  }

  const btnBase: React.CSSProperties = {
    display: 'block', width: '100%',
    padding: '12px 0', borderRadius: 8, border: 'none',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    marginBottom: 12, letterSpacing: '0.03em',
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-primary)' }}>
      <div style={card}>
        <div style={{ fontSize: 40, marginBottom: 4 }}>♟</div>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, color: 'var(--accent-gold)' }}>Tamerlane Siege</h1>
        <p style={{ margin: '0 0 32px', color: 'var(--text-muted)', fontSize: 13 }}>
          Timur Chess · 112 squares · 28 pieces per side
        </p>

        {/* Difficulty picker */}
        <div style={{ background: 'var(--surface-tertiary)', borderRadius: 10, padding: '16px 20px', marginBottom: 16, textAlign: 'left' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
            AI Difficulty
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="range" min={1} max={10} value={diff}
              onChange={e => setDiff(Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent-gold)' }}
            />
            <span style={{ width: 90, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>
              {diff} — {DIFFICULTY_LABELS[diff]}
            </span>
          </div>
        </div>

        <button style={{ ...btnBase, background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
          onClick={() => onAI(diff)}>
          Play vs AI
        </button>
        <button style={{ ...btnBase, background: 'var(--btn-secondary-bg)', color: 'var(--btn-secondary-text)' }}
          onClick={onPvP}>
          Play vs Human (Local)
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// GameScreen
// =============================================================================

interface GameScreenProps {
  state:      GameState
  onMove:     (move: Move) => void
  onUndo:     () => void
  onNewGame:  () => void
  onHome:     () => void
  isThinking: boolean
  isAI:       boolean
  halfMoves:  string[]
}

function GameScreen({ state, onMove, onUndo, onNewGame, onHome, isThinking, isAI, halfMoves }: GameScreenProps) {
  const result     = getGameResult(state)
  const interactive = !isThinking && result === null && !(isAI && state.turn === AI_COLOR)

  let turnLabel: string
  if (result !== null) {
    turnLabel = ''
  } else if (isThinking) {
    turnLabel = 'AI düşünüyor…'
  } else if (isAI && state.turn === AI_COLOR) {
    turnLabel = 'Black (AI) to move'
  } else {
    turnLabel = state.turn === 'w' ? 'White to move' : 'Black to move'
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-primary)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '12px 12px 32px', boxSizing: 'border-box' }}>
      <div className="game-layout">

        {/* Left column — board */}
        <div className="game-board-col">
          {/* Turn indicator row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: isThinking ? 'var(--accent-gold)' : state.turn === 'w' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              {turnLabel}
            </span>
            <button onClick={onHome} style={{ background: 'none', border: '1px solid var(--surface-tertiary)', borderRadius: 6, color: 'var(--text-muted)', fontSize: 12, padding: '3px 10px', cursor: 'pointer' }}>
              ← Home
            </button>
          </div>

          {/* Board */}
          <div style={{ pointerEvents: isThinking ? 'none' : 'auto', opacity: isThinking ? 0.85 : 1 }}>
            <GameBoard
              state={state}
              onMove={interactive ? onMove : () => undefined}
              onUndo={onUndo}
              onNewGame={onNewGame}
              style={{ width: '100%' }}
            />
          </div>

          <GameControls
            onNewGame={onNewGame}
            onUndo={onUndo}
            canUndo={state.history.length > 0 && !isThinking}
          />
        </div>

        {/* Right column — move list (below on mobile, sidebar on desktop) */}
        <div className="game-movelist-col">
          <MoveList halfMoves={halfMoves} />
        </div>
      </div>

      {result !== null && <GameOverModal result={result} onNewGame={onNewGame} />}
    </div>
  )
}

// =============================================================================
// Root App
// =============================================================================

export default function App() {
  const [screen,       setScreen]       = useState<Screen>('home')
  const [state,        setState]        = useState<GameState>(createNewGame)
  const [aiDifficulty, setAiDifficulty] = useState(3)
  const [isThinking,   setIsThinking]   = useState(false)

  // -------------------------------------------------------------------------
  // Move / game management
  // -------------------------------------------------------------------------

  const handleMove = useCallback((move: Move) => {
    setState(prev => makeMove(prev, move))
  }, [])

  const handleUndo = useCallback(() => {
    window.__aiPending = -1
    setIsThinking(false)
    setState(prev => {
      const after1 = undoMove(prev)
      // In AI mode undo two half-moves so it's the human's turn again
      if (screen === 'ai' && after1.history.length > 0 && after1.turn === AI_COLOR) {
        return undoMove(after1)
      }
      return after1
    })
  }, [screen])

  const handleNewGame = useCallback(() => {
    window.__aiPending = -1
    setIsThinking(false)
    setState(createNewGame())
  }, [])

  const goHome = useCallback(() => {
    window.__aiPending = -1
    setIsThinking(false)
    setScreen('home')
  }, [])

  const startPvP = useCallback(() => {
    window.__aiPending = -1
    setIsThinking(false)
    setState(createNewGame())
    setScreen('pvp')
  }, [])

  const startAI = useCallback((difficulty: number) => {
    window.__aiPending = -1
    setIsThinking(false)
    setAiDifficulty(difficulty)
    setState(createNewGame())
    setScreen('ai')
  }, [])

  // -------------------------------------------------------------------------
  // AI trigger — inline, no hook, no worker
  //
  // Deps: only primitives that signal "a new position needs AI".
  // isThinking is NOT a dep — adding it creates a self-referential loop.
  // window.__aiPending (keyed on halfMoveCount) prevents double-fire.
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (screen !== 'ai') return
    if (state.turn !== AI_COLOR) return
    if (state.result !== null) return

    const key = state.halfMoveCount
    if (window.__aiPending === key) return   // already fired for this position
    window.__aiPending = key

    console.log('[AI] Thinking for halfMove', key)
    setIsThinking(true)

    setTimeout(() => {
      // Stale check: if another effect reset the pending flag, bail out
      if (window.__aiPending !== key) {
        setIsThinking(false)
        return
      }

      try {
        const params = getDifficultyParams(aiDifficulty)
        const result = findBestMove(state, params.maxDepth, params.timeLimit)

        if (result?.move) {
          console.log('[AI] Found move:', result.move)
          setState(prev => {
            // Stale state guard: only apply if the position hasn't changed
            if (prev.halfMoveCount !== key) return prev
            return makeMove(prev, result.move)
          })
        } else {
          console.error('[AI] No move found')
        }
      } catch (e) {
        console.error('[AI] Error:', e)
      }

      window.__aiPending = -1
      setIsThinking(false)
    }, 100)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.halfMoveCount, state.turn, screen])
  //         ^^^ stable primitives only — aiDifficulty is read at fire time

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const halfMoves = useMemo(() => gameToMoveList(state), [state])

  // Debug API
  if (typeof window !== 'undefined') {
    window.e = { state: () => state, undo: handleUndo, reset: handleNewGame }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (screen === 'home') {
    return <HomeScreen onPvP={startPvP} onAI={startAI} initDiff={aiDifficulty} />
  }

  return (
    <GameScreen
      state={state}
      onMove={handleMove}
      onUndo={handleUndo}
      onNewGame={handleNewGame}
      onHome={goHome}
      isThinking={isThinking}
      isAI={screen === 'ai'}
      halfMoves={halfMoves}
    />
  )
}
