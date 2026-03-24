// =============================================================================
// TAMERLANE SIEGE — App Root
// src/App.tsx
//
// Screens:  'home' | 'pvp' | 'ai' | 'tutorial' | 'tutorialPlay' | 'puzzle'
//
// AI search runs in a Web Worker via useAI hook — no main-thread blocking.
// =============================================================================

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createNewGame, makeMove, undoMove } from './core/game'
import { getGameResult }                     from './core/rules'
import { gameToMoveList, stateToTFEN }       from './core/notation'
import type { GameState, Move }              from './core/types'
import { GameBoard }     from './ui/components/GameBoard'
import { GameControls }  from './ui/components/GameControls'
import { MoveList }      from './ui/components/MoveList'
import { GameOverModal } from './ui/components/GameOverModal'
import { HowToPlay }       from './ui/components/HowToPlay'
import { TutorialScreen }  from './ui/components/TutorialScreen'
import { PuzzleScreen }    from './ui/components/PuzzleScreen'
import { useAI }         from './ui/hooks/useAI'
import { DIFFICULTY_LABELS } from './ai/difficulty'
import { saveGameLog, getGameStats, resultToWinner, exportGameLogs } from './gameLog'
import type { GameStats } from './gameLog'

// =============================================================================
// Types
// =============================================================================

type Screen = 'home' | 'pvp' | 'ai' | 'tutorial' | 'tutorialPlay' | 'puzzle'

declare global {
  interface Window {
    e: { state: () => GameState; undo: () => void; reset: () => void }
  }
}

// AI always plays Black in this implementation
const AI_COLOR = 'b' as const

// =============================================================================
// HomeScreen
// =============================================================================

interface HomeScreenProps {
  onPvP:           () => void
  onAI:            (difficulty: number) => void
  onTutorial:      () => void
  onDailyPuzzle:   () => void
  onRulesRef:      () => void
  initDiff:        number
  stats:           GameStats
  onExport:        () => void
}

function HomeScreen({ onPvP, onAI, onTutorial, onDailyPuzzle, onRulesRef, initDiff, stats, onExport }: HomeScreenProps) {
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
        <button style={{ ...btnBase, background: 'linear-gradient(135deg, #8B6914 0%, #C9A227 100%)', color: '#FFF' }}
          onClick={onDailyPuzzle}>
          Daily Puzzle
        </button>
        <button style={{ ...btnBase, background: 'var(--btn-secondary-bg)', color: 'var(--btn-secondary-text)' }}
          onClick={onPvP}>
          Play vs Human (Local)
        </button>
        <button style={{ ...btnBase, background: 'var(--surface-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--accent-gold-muted)' }}
          onClick={onTutorial}>
          Tutorial (Interactive)
        </button>
        <button style={{ ...btnBase, background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--surface-tertiary)' }}
          onClick={onRulesRef}>
          Rules Reference
        </button>

        {/* Game stats — only show if games have been played */}
        {stats.totalGames > 0 && (
          <div style={{
            marginTop:    8,
            padding:      '10px 16px',
            borderRadius: 8,
            background:   'var(--surface-tertiary)',
            textAlign:    'left',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
              Your Stats
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
              <span>Games: <strong style={{ color: 'var(--text-primary)' }}>{stats.totalGames}</strong></span>
              <span>Wins: <strong style={{ color: 'var(--text-primary)' }}>{stats.wins}</strong></span>
              <span>Draws: <strong style={{ color: 'var(--text-primary)' }}>{stats.draws}</strong></span>
            </div>
            <button
              onClick={onExport}
              style={{
                marginTop:    8,
                background:   'none',
                border:       '1px solid var(--surface-tertiary)',
                borderRadius: 4,
                color:        'var(--text-muted)',
                fontSize:     11,
                padding:      '2px 8px',
                cursor:       'pointer',
                width:        '100%',
              }}
            >
              Export Game Data (JSON)
            </button>
          </div>
        )}
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
  aiError:    string | null
}

function GameScreen({ state, onMove, onUndo, onNewGame, onHome, isThinking, isAI, halfMoves, aiError }: GameScreenProps) {
  const result      = getGameResult(state)
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

          {/* AI error banner — shown when AI fails to find or execute a move */}
          {aiError && (
            <div style={{
              marginTop:    10,
              padding:      '8px 14px',
              borderRadius: 6,
              background:   'rgba(200, 40, 40, 0.12)',
              border:       '1px solid rgba(200, 40, 40, 0.35)',
              color:        '#FF7070',
              fontSize:     13,
              display:      'flex',
              alignItems:   'center',
              gap:          8,
            }}>
              <span>⚠</span>
              <span style={{ flex: 1 }}>{aiError}</span>
              <button
                onClick={onNewGame}
                style={{
                  padding:      '3px 10px',
                  borderRadius: 4,
                  border:       '1px solid rgba(200,40,40,0.5)',
                  background:   'rgba(200,40,40,0.2)',
                  color:        '#FF7070',
                  cursor:       'pointer',
                  fontSize:     12,
                  fontWeight:   600,
                  flexShrink:   0,
                }}
              >
                New Game
              </button>
            </div>
          )}
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
  const [aiError,      setAiError]      = useState<string | null>(null)
  const [stats,        setStats]        = useState<GameStats>(getGameStats)

  const { isThinking, makeAIMove, cancelSearch } = useAI()

  // Timing & double-save guards
  const startTimeRef   = useRef(Date.now())
  const lastLoggedRef  = useRef<string>('')  // halfMoveCount at which we last logged

  // -------------------------------------------------------------------------
  // Move / game management
  // -------------------------------------------------------------------------

  const handleMove = useCallback((move: Move) => {
    setState(prev => makeMove(prev, move))
  }, [])

  const handleUndo = useCallback(() => {
    cancelSearch()
    setAiError(null)
    setState(prev => {
      const after1 = undoMove(prev)
      // In AI mode undo two half-moves so it's the human's turn again
      if (screen === 'ai' && after1.history.length > 0 && after1.turn === AI_COLOR) {
        return undoMove(after1)
      }
      return after1
    })
  }, [screen, cancelSearch])

  const handleNewGame = useCallback(() => {
    cancelSearch()
    setAiError(null)
    startTimeRef.current = Date.now()
    lastLoggedRef.current = ''
    setState(createNewGame())
  }, [cancelSearch])

  const goHome = useCallback(() => {
    cancelSearch()
    setAiError(null)
    setStats(getGameStats())    // refresh stats when returning home
    setScreen('home')
  }, [cancelSearch])

  const startPvP = useCallback(() => {
    cancelSearch()
    setAiError(null)
    startTimeRef.current = Date.now()
    lastLoggedRef.current = ''
    setState(createNewGame())
    setScreen('pvp')
  }, [cancelSearch])

  const startAI = useCallback((difficulty: number) => {
    cancelSearch()
    setAiError(null)
    setAiDifficulty(difficulty)
    startTimeRef.current = Date.now()
    lastLoggedRef.current = ''
    setState(createNewGame())
    setScreen('ai')
  }, [cancelSearch])

  const goTutorial = useCallback(() => {
    setScreen('tutorialPlay')
  }, [])

  const goPuzzle = useCallback(() => {
    setScreen('puzzle')
  }, [])

  const goRulesRef = useCallback(() => {
    setScreen('tutorial')
  }, [])

  const handleExport = useCallback(() => {
    const json = exportGameLogs()
    // Try clipboard first, then fall back to download
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json).then(
        () => { alert('Game data copied to clipboard!') },
        () => { downloadJSON(json) },
      )
    } else {
      downloadJSON(json)
    }
  }, [])

  // -------------------------------------------------------------------------
  // AI trigger — Web Worker via useAI hook
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (screen !== 'ai') return
    if (state.turn !== AI_COLOR) return
    if (state.result !== null) return

    makeAIMove(state, aiDifficulty)
      .then(move => {
        setState(prev => {
          if (prev.turn !== AI_COLOR || prev.result !== null) return prev
          return makeMove(prev, move)
        })
      })
      .catch(err => {
        if (import.meta.env.DEV) console.error('[AI Worker]', err)
        if ((err as Error).message !== 'Cancelled') {
          setAiError('AI error — please start a new game.')
        }
      })

    return () => cancelSearch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.halfMoveCount, state.turn, screen])

  // -------------------------------------------------------------------------
  // Game-over logging — save to localStorage when a game ends
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (screen !== 'ai' && screen !== 'pvp') return
    const result = state.result
    if (result === null) return

    // Prevent double-save for the same game
    const logKey = `${state.halfMoveCount}-${result}`
    if (lastLoggedRef.current === logKey) return
    lastLoggedRef.current = logKey

    const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
    const moves    = gameToMoveList(state)

    saveGameLog({
      id:             crypto.randomUUID(),
      timestamp:      new Date().toISOString(),
      mode:           screen === 'ai' ? 'ai' : 'pvp',
      aiDifficulty:   screen === 'ai' ? aiDifficulty : undefined,
      result,
      winner:         resultToWinner(result),
      totalMoves:     state.halfMoveCount,
      durationSeconds: duration,
      moves,
      finalTFEN:      stateToTFEN(state),
    })

    // Update stats immediately (will also refresh when going home)
    setStats(getGameStats())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.result, screen])

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const halfMoves = useMemo(() => gameToMoveList(state), [state])

  // Debug API (always available for devtools convenience)
  if (typeof window !== 'undefined') {
    window.e = { state: () => state, undo: handleUndo, reset: handleNewGame }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (screen === 'home') {
    return (
      <HomeScreen
        onPvP={startPvP}
        onAI={startAI}
        onTutorial={goTutorial}
        onDailyPuzzle={goPuzzle}
        onRulesRef={goRulesRef}
        initDiff={aiDifficulty}
        stats={stats}
        onExport={handleExport}
      />
    )
  }

  if (screen === 'tutorial') {
    return <HowToPlay onBack={() => setScreen('home')} />
  }

  if (screen === 'tutorialPlay') {
    return <TutorialScreen onBack={() => setScreen('home')} />
  }

  if (screen === 'puzzle') {
    return <PuzzleScreen onBack={() => setScreen('home')} />
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
      aiError={aiError}
    />
  )
}

// =============================================================================
// Helper — download JSON as a file
// =============================================================================

function downloadJSON(json: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `tamerlane-games-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
