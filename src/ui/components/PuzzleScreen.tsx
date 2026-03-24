// =============================================================================
// TAMERLANE SIEGE — Daily Puzzle Screen
// src/ui/components/PuzzleScreen.tsx
//
// Three panels: Hub (today's puzzle + streak), Play (board + hints),
// Complete (congrats + share).
// =============================================================================

import { useState, useCallback, useEffect } from 'react'
import type { Move } from '../../core/types'
import { PUZZLES } from '../../puzzles/puzzleData'
import type { PuzzleData } from '../../puzzles/puzzleData'
import {
  startPuzzle,
  processPuzzleMove,
  getPuzzleHint,
} from '../../puzzles/puzzleEngine'
import type { PuzzleState } from '../../puzzles/puzzleEngine'
import {
  getStreakData,
  getTodaysPuzzleIndex,
  isPuzzleSolvedToday,
  markPuzzleSolved,
  getSolvedPuzzleIndices,
  getShareText,
} from '../../puzzles/streakTracker'
import { GameBoard } from './GameBoard'

// =============================================================================
// Props
// =============================================================================

interface PuzzleScreenProps {
  onBack: () => void
}

// =============================================================================
// PuzzleScreen — hub + play + complete
// =============================================================================

export function PuzzleScreen({ onBack }: PuzzleScreenProps) {
  const [puzzleState, setPuzzleState] = useState<PuzzleState | null>(null)
  const [solvedToday, setSolvedToday] = useState(isPuzzleSolvedToday)

  const handleStartPuzzle = useCallback((puzzle: PuzzleData) => {
    setPuzzleState(startPuzzle(puzzle))
  }, [])

  const handleMove = useCallback((move: Move) => {
    setPuzzleState(prev => {
      if (!prev) return prev
      const next = processPuzzleMove(prev, move)
      if (next.status === 'solved' && prev.status !== 'solved') {
        // Check if this was today's puzzle
        const todayIdx = getTodaysPuzzleIndex()
        if (PUZZLES[todayIdx]?.id === next.puzzle.id) {
          markPuzzleSolved()
          setSolvedToday(true)
        }
      }
      return next
    })
  }, [])

  const handleRestart = useCallback(() => {
    setPuzzleState(prev => prev ? startPuzzle(prev.puzzle) : prev)
  }, [])

  const handleBackToHub = useCallback(() => {
    setPuzzleState(null)
  }, [])

  // Hub view
  if (!puzzleState) {
    return (
      <PuzzleHub
        onBack={onBack}
        onStartPuzzle={handleStartPuzzle}
        solvedToday={solvedToday}
      />
    )
  }

  // Play / Complete view
  return (
    <PuzzlePlay
      puzzleState={puzzleState}
      onMove={handleMove}
      onRestart={handleRestart}
      onBack={handleBackToHub}
    />
  )
}

// =============================================================================
// PuzzleHub — today's puzzle card, streak, practice puzzles
// =============================================================================

interface PuzzleHubProps {
  onBack:         () => void
  onStartPuzzle:  (puzzle: PuzzleData) => void
  solvedToday:    boolean
}

function PuzzleHub({ onBack, onStartPuzzle, solvedToday }: PuzzleHubProps) {
  const streak       = getStreakData()
  const todayIdx     = getTodaysPuzzleIndex()
  const todayPuzzle  = PUZZLES[todayIdx]
  const solvedSet    = getSolvedPuzzleIndices()

  const card: React.CSSProperties = {
    background:   'var(--surface-secondary)',
    border:       '1px solid var(--accent-gold-muted)',
    borderRadius: 16,
    padding:      '40px 48px',
    maxWidth:     500,
    width:        '90%',
    textAlign:    'center',
    color:        'var(--text-primary)',
    boxShadow:    '0 8px 40px rgba(0,0,0,0.5)',
  }

  const btnBase: React.CSSProperties = {
    display:       'block',
    width:         '100%',
    padding:       '14px 16px',
    borderRadius:  8,
    border:        'none',
    fontSize:      15,
    fontWeight:    700,
    cursor:        'pointer',
    marginBottom:  10,
    letterSpacing: '0.03em',
  }

  const statBox: React.CSSProperties = {
    flex:          1,
    textAlign:     'center',
    padding:       '8px 0',
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--surface-primary)',
    }}>
      <div style={card}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: '1px solid var(--surface-tertiary)',
            borderRadius: 6, color: 'var(--text-muted)', fontSize: 12,
            padding: '3px 10px', cursor: 'pointer', marginBottom: 20, float: 'left',
          }}
        >
          ← Back
        </button>
        <div style={{ clear: 'both' }} />

        <h1 style={{ margin: '0 0 4px', fontSize: 24, color: 'var(--accent-gold)' }}>
          Daily Puzzle
        </h1>
        <p style={{ margin: '0 0 24px', color: 'var(--text-muted)', fontSize: 13 }}>
          A new challenge every day
        </p>

        {/* Streak stats */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 20,
          background: 'var(--surface-tertiary)', borderRadius: 10, padding: '12px 8px',
        }}>
          <div style={statBox}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-gold)' }}>
              {streak.currentStreak}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Current
            </div>
          </div>
          <div style={statBox}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
              {streak.maxStreak}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Best
            </div>
          </div>
          <div style={statBox}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
              {streak.totalSolved}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Solved
            </div>
          </div>
        </div>

        {/* Today's puzzle card */}
        <div style={{
          background: 'var(--surface-tertiary)', borderRadius: 10,
          padding: '16px 20px', marginBottom: 16, textAlign: 'left',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8,
          }}>
            Today — Puzzle #{todayIdx + 1}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
            {todayPuzzle.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {todayPuzzle.description}
          </div>
          <span style={{
            display: 'inline-block', fontSize: 11, fontWeight: 600,
            padding: '2px 8px', borderRadius: 4, marginTop: 4,
            background: todayPuzzle.difficulty === 'easy' ? 'rgba(80,200,120,0.15)' :
                        todayPuzzle.difficulty === 'medium' ? 'rgba(255,180,0,0.15)' :
                        'rgba(255,80,80,0.15)',
            color: todayPuzzle.difficulty === 'easy' ? '#50c878' :
                   todayPuzzle.difficulty === 'medium' ? '#ffb400' :
                   '#ff5050',
          }}>
            {todayPuzzle.difficulty.charAt(0).toUpperCase() + todayPuzzle.difficulty.slice(1)}
          </span>
        </div>

        <button
          style={{
            ...btnBase,
            background: solvedToday ? 'var(--surface-tertiary)' : 'var(--btn-primary-bg)',
            color: solvedToday ? 'var(--text-secondary)' : 'var(--btn-primary-text)',
          }}
          onClick={() => onStartPuzzle(todayPuzzle)}
        >
          {solvedToday ? 'Replay Today\'s Puzzle' : 'Play Today\'s Puzzle'}
        </button>

        {/* Practice puzzles */}
        <div style={{ marginTop: 16 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10,
            textAlign: 'left',
          }}>
            Practice Puzzles
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {PUZZLES.map((puzzle, idx) => {
              const solved = solvedSet.has(idx)
              return (
                <button
                  key={puzzle.id}
                  style={{
                    ...btnBase,
                    background: solved ? 'var(--surface-tertiary)' : 'var(--btn-secondary-bg)',
                    color: solved ? 'var(--text-secondary)' : 'var(--btn-secondary-text)',
                    textAlign: 'left',
                    padding: '10px 14px',
                    marginBottom: 6,
                  }}
                  onClick={() => onStartPuzzle(puzzle)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, flexShrink: 0, width: 24 }}>
                      {solved ? '✓' : `${idx + 1}`}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{puzzle.title}</div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 1 }}>
                        {puzzle.difficulty} · {puzzle.theme}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// PuzzlePlay — active puzzle with board + hint
// =============================================================================

interface PuzzlePlayProps {
  puzzleState: PuzzleState
  onMove:      (move: Move) => void
  onRestart:   () => void
  onBack:      () => void
}

function PuzzlePlay({ puzzleState, onMove, onRestart, onBack }: PuzzlePlayProps) {
  const { puzzle, gameState, status, moveCount, wrongMove } = puzzleState
  const hint     = getPuzzleHint(puzzleState)
  const isSolved = status === 'solved'

  // Clear wrong-move flash after 800ms
  const [showWrong, setShowWrong] = useState(false)
  useEffect(() => {
    if (wrongMove) {
      setShowWrong(true)
      const timer = setTimeout(() => setShowWrong(false), 800)
      return () => clearTimeout(timer)
    }
    setShowWrong(false)
  }, [wrongMove, moveCount])

  const panelStyle: React.CSSProperties = {
    background:   'var(--surface-secondary)',
    borderRadius: 12,
    padding:      '16px 20px',
    marginBottom: 12,
  }

  const smallBtn: React.CSSProperties = {
    padding:      '6px 14px',
    borderRadius: 6,
    border:       'none',
    cursor:       'pointer',
    fontWeight:   600,
    fontSize:     13,
    marginRight:  8,
  }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--surface-primary)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '12px 12px 32px', boxSizing: 'border-box',
    }}>
      <div style={{ maxWidth: 600, width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{
            fontSize: 13, fontWeight: 600, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--accent-gold)',
          }}>
            {puzzle.title}
          </span>
          <button
            onClick={onBack}
            style={{
              background: 'none', border: '1px solid var(--surface-tertiary)',
              borderRadius: 6, color: 'var(--text-muted)', fontSize: 12,
              padding: '3px 10px', cursor: 'pointer',
            }}
          >
            ← Puzzles
          </button>
        </div>

        {/* Objective */}
        <div style={panelStyle}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6,
          }}>
            {puzzle.difficulty} · {puzzle.theme}
          </div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {puzzle.description}
          </p>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
            Moves: {moveCount} / {Math.ceil(puzzle.solutionMoves.length / 2)}
          </div>
        </div>

        {/* Hint / wrong move */}
        <div style={{
          ...panelStyle,
          background: showWrong ? 'rgba(200,40,40,0.12)' : 'var(--surface-tertiary)',
          border: showWrong ? '1px solid rgba(200,40,40,0.35)' : 'none',
          display: 'flex', alignItems: 'center', gap: 10,
          transition: 'background 0.3s, border 0.3s',
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>
            {showWrong ? '✗' : '💡'}
          </span>
          <p style={{
            margin: 0, fontSize: 13, lineHeight: 1.4, flex: 1,
            color: showWrong ? '#FF7070' : 'var(--text-secondary)',
          }}>
            {showWrong ? 'Not quite — try a different move.' : hint}
          </p>
        </div>

        {/* Board */}
        <div style={{
          pointerEvents: isSolved ? 'none' : 'auto',
          opacity: isSolved ? 0.7 : 1,
        }}>
          <GameBoard
            state={gameState}
            onMove={isSolved ? () => undefined : onMove}
            onUndo={() => undefined}
            onNewGame={onRestart}
            style={{ width: '100%' }}
          />
        </div>

        {/* Controls */}
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            onClick={onRestart}
            style={{ ...smallBtn, background: 'var(--btn-secondary-bg)', color: 'var(--btn-secondary-text)' }}
          >
            Restart
          </button>
        </div>

        {/* Solved modal */}
        {isSolved && (
          <PuzzleCompleteModal
            puzzle={puzzle}
            moveCount={moveCount}
            onReplay={onRestart}
            onBack={onBack}
          />
        )}
      </div>
    </div>
  )
}

// =============================================================================
// PuzzleCompleteModal — congrats + share
// =============================================================================

interface PuzzleCompleteModalProps {
  puzzle:    PuzzleData
  moveCount: number
  onReplay:  () => void
  onBack:    () => void
}

function PuzzleCompleteModal({ puzzle, moveCount, onReplay, onBack }: PuzzleCompleteModalProps) {
  const [copied, setCopied] = useState(false)
  const streak   = getStreakData()
  const todayIdx = getTodaysPuzzleIndex()
  const isToday  = PUZZLES[todayIdx]?.id === puzzle.id

  const handleShare = useCallback(() => {
    const idx = PUZZLES.findIndex(p => p.id === puzzle.id)
    const text = getShareText(idx >= 0 ? idx : 0, moveCount)
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => { /* ignore */ })
    }
  }, [puzzle.id, moveCount])

  // ESC to dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onBack])

  const btnBase: React.CSSProperties = {
    padding: '10px 24px', borderRadius: 8, border: 'none',
    cursor: 'pointer', fontWeight: 700, fontSize: 15, margin: '0 6px',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--surface-overlay)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: 'var(--surface-secondary)', border: '2px solid var(--accent-gold)',
        borderRadius: 16, padding: '32px 40px', maxWidth: 420, width: '90%',
        textAlign: 'center', color: 'var(--text-primary)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🧩</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 22, color: 'var(--accent-gold)' }}>
          Puzzle Solved!
        </h2>
        <p style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--text-secondary)' }}>
          {puzzle.title} — {moveCount} move{moveCount !== 1 ? 's' : ''}
        </p>

        {isToday && (
          <div style={{
            margin: '12px 0', padding: '8px 16px', borderRadius: 8,
            background: 'var(--surface-tertiary)', display: 'inline-block',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Streak: <strong style={{ color: 'var(--accent-gold)' }}>{streak.currentStreak}</strong> day{streak.currentStreak !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <button
            onClick={onReplay}
            style={{ ...btnBase, background: 'var(--btn-secondary-bg)', color: 'var(--btn-secondary-text)' }}
          >
            Replay
          </button>
          <button
            onClick={handleShare}
            style={{ ...btnBase, background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
          >
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>

        <button
          onClick={onBack}
          style={{
            marginTop: 12, background: 'none', border: 'none',
            color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Back to Puzzles
        </button>
      </div>
    </div>
  )
}
