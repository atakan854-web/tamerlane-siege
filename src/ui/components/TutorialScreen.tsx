// =============================================================================
// TAMERLANE SIEGE — Interactive Tutorial Screen
// src/ui/components/TutorialScreen.tsx
//
// Lesson picker + interactive gameplay using GameBoard.
// =============================================================================

import { useState, useCallback } from 'react'
import type { Move } from '../../core/types'
import { LESSONS } from '../../tutorial/lessons'
import type { TutorialLesson } from '../../tutorial/lessons'
import {
  startLesson,
  processTutorialMove,
  getCurrentHint,
  nextHint,
} from '../../tutorial/TutorialEngine'
import type { TutorialState } from '../../tutorial/TutorialEngine'
import { GameBoard } from './GameBoard'

// =============================================================================
// localStorage progress
// =============================================================================

const PROGRESS_KEY = 'tamerlane_tutorial_progress'

function getCompletedLessons(): Set<string> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return new Set(parsed as string[])
    return new Set()
  } catch {
    return new Set()
  }
}

function markLessonComplete(lessonId: string): void {
  try {
    const completed = getCompletedLessons()
    completed.add(lessonId)
    localStorage.setItem(PROGRESS_KEY, JSON.stringify([...completed]))
  } catch {
    // silently fail
  }
}

// =============================================================================
// Props
// =============================================================================

interface TutorialScreenProps {
  onBack: () => void
}

// =============================================================================
// TutorialScreen — lesson picker + gameplay
// =============================================================================

export function TutorialScreen({ onBack }: TutorialScreenProps) {
  const [tutState, setTutState] = useState<TutorialState | null>(null)
  const [completed, setCompleted] = useState<Set<string>>(getCompletedLessons)

  const handleStartLesson = useCallback((lesson: TutorialLesson) => {
    setTutState(startLesson(lesson))
  }, [])

  const handleMove = useCallback((move: Move) => {
    setTutState(prev => {
      if (!prev) return prev
      const next = processTutorialMove(prev, move)
      if (next.completed && !prev.completed) {
        markLessonComplete(next.lesson.id)
        setCompleted(getCompletedLessons())
      }
      return next
    })
  }, [])

  const handleNextHint = useCallback(() => {
    setTutState(prev => prev ? nextHint(prev) : prev)
  }, [])

  const handleRestart = useCallback(() => {
    setTutState(prev => prev ? startLesson(prev.lesson) : prev)
  }, [])

  const handleNextLesson = useCallback(() => {
    if (!tutState) return
    const idx = LESSONS.findIndex(l => l.id === tutState.lesson.id)
    if (idx < LESSONS.length - 1) {
      setTutState(startLesson(LESSONS[idx + 1]))
    } else {
      setTutState(null) // back to picker
    }
  }, [tutState])

  const handleBackToPicker = useCallback(() => {
    setTutState(null)
  }, [])

  // -------------------------------------------------------------------------
  // If no lesson selected, show lesson picker
  // -------------------------------------------------------------------------

  if (!tutState) {
    return (
      <LessonPicker
        onBack={onBack}
        onSelectLesson={handleStartLesson}
        completedLessons={completed}
      />
    )
  }

  // -------------------------------------------------------------------------
  // Lesson in progress
  // -------------------------------------------------------------------------

  return (
    <LessonPlay
      tutState={tutState}
      onMove={handleMove}
      onNextHint={handleNextHint}
      onRestart={handleRestart}
      onNextLesson={handleNextLesson}
      onBack={handleBackToPicker}
    />
  )
}

// =============================================================================
// LessonPicker — choose a lesson
// =============================================================================

interface LessonPickerProps {
  onBack: () => void
  onSelectLesson: (lesson: TutorialLesson) => void
  completedLessons: Set<string>
}

function LessonPicker({ onBack, onSelectLesson, completedLessons }: LessonPickerProps) {
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
    textAlign:     'left',
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-primary)' }}>
      <div style={card}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: '1px solid var(--surface-tertiary)',
            borderRadius: 6,
            color: 'var(--text-muted)',
            fontSize: 12,
            padding: '3px 10px',
            cursor: 'pointer',
            marginBottom: 20,
            float: 'left',
          }}
        >
          ← Back
        </button>

        <div style={{ clear: 'both' }} />

        <h1 style={{ margin: '0 0 4px', fontSize: 24, color: 'var(--accent-gold)' }}>
          Interactive Tutorial
        </h1>
        <p style={{ margin: '0 0 24px', color: 'var(--text-muted)', fontSize: 13 }}>
          Learn Tamerlane Chess step by step
        </p>

        {LESSONS.map((lesson, idx) => {
          const done = completedLessons.has(lesson.id)
          return (
            <button
              key={lesson.id}
              style={{
                ...btnBase,
                background: done
                  ? 'var(--surface-tertiary)'
                  : 'var(--btn-primary-bg)',
                color: done
                  ? 'var(--text-secondary)'
                  : 'var(--btn-primary-text)',
              }}
              onClick={() => onSelectLesson(lesson)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0, width: 28 }}>
                  {done ? '✓' : `${idx + 1}.`}
                </span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{lesson.title}</div>
                  <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>
                    {lesson.subtitle}
                  </div>
                </div>
              </div>
            </button>
          )
        })}

        <p style={{ margin: '16px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>
          {completedLessons.size}/{LESSONS.length} lessons completed
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// LessonPlay — active lesson with board + info panel
// =============================================================================

interface LessonPlayProps {
  tutState:     TutorialState
  onMove:       (move: Move) => void
  onNextHint:   () => void
  onRestart:    () => void
  onNextLesson: () => void
  onBack:       () => void
}

function LessonPlay({
  tutState,
  onMove,
  onNextHint,
  onRestart,
  onNextLesson,
  onBack,
}: LessonPlayProps) {
  const { lesson, gameState, completed, moveCount } = tutState
  const hint = getCurrentHint(tutState)
  const isLastLesson = LESSONS.findIndex(l => l.id === lesson.id) === LESSONS.length - 1

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
      minHeight:    '100dvh',
      background:   'var(--surface-primary)',
      display:      'flex',
      alignItems:   'flex-start',
      justifyContent: 'center',
      padding:      '12px 12px 32px',
      boxSizing:    'border-box',
    }}>
      <div style={{ maxWidth: 600, width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{
            fontSize:      13,
            fontWeight:    600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color:         'var(--accent-gold)',
          }}>
            {lesson.title}
          </span>
          <button
            onClick={onBack}
            style={{
              background:   'none',
              border:       '1px solid var(--surface-tertiary)',
              borderRadius: 6,
              color:        'var(--text-muted)',
              fontSize:     12,
              padding:      '3px 10px',
              cursor:       'pointer',
            }}
          >
            ← Lessons
          </button>
        </div>

        {/* Objective panel */}
        <div style={panelStyle}>
          <div style={{
            fontSize:      11,
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color:         'var(--text-muted)',
            marginBottom:  6,
          }}>
            Objective
          </div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {lesson.objective}
          </p>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
            Moves: {moveCount}
            {lesson.winCondition.kind === 'movesComplete' && ` / ${lesson.winCondition.count}`}
          </div>
        </div>

        {/* Hint panel */}
        <div style={{
          ...panelStyle,
          background: 'var(--surface-tertiary)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4, flex: 1 }}>
            {hint}
          </p>
          {lesson.hints.length > 1 && (
            <button
              onClick={onNextHint}
              style={{
                ...smallBtn,
                background: 'var(--surface-secondary)',
                color: 'var(--text-muted)',
                marginRight: 0,
                flexShrink: 0,
              }}
            >
              Next tip
            </button>
          )}
        </div>

        {/* Board */}
        <div style={{ pointerEvents: completed ? 'none' : 'auto', opacity: completed ? 0.7 : 1 }}>
          <GameBoard
            state={gameState}
            onMove={completed ? () => undefined : onMove}
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
            Restart Lesson
          </button>
        </div>

        {/* Congrats modal overlay */}
        {completed && (
          <CongratsModal
            message={lesson.congratsMessage}
            onNextLesson={onNextLesson}
            onReplay={onRestart}
            isLastLesson={isLastLesson}
          />
        )}
      </div>
    </div>
  )
}

// =============================================================================
// CongratsModal — shown when lesson is completed
// =============================================================================

interface CongratsModalProps {
  message:      string
  onNextLesson: () => void
  onReplay:     () => void
  isLastLesson: boolean
}

function CongratsModal({ message, onNextLesson, onReplay, isLastLesson }: CongratsModalProps) {
  const btnBase: React.CSSProperties = {
    padding:      '10px 24px',
    borderRadius: 8,
    border:       'none',
    cursor:       'pointer',
    fontWeight:   700,
    fontSize:     15,
    margin:       '0 6px',
  }

  return (
    <div style={{
      position:       'fixed',
      inset:          0,
      background:     'var(--surface-overlay)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      zIndex:         100,
    }}>
      <div style={{
        background:   'var(--surface-secondary)',
        border:       '2px solid var(--accent-gold)',
        borderRadius: 16,
        padding:      '32px 40px',
        maxWidth:     420,
        width:        '90%',
        textAlign:    'center',
        color:        'var(--text-primary)',
        boxShadow:    '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
        <h2 style={{ margin: '0 0 12px', fontSize: 22, color: 'var(--accent-gold)' }}>
          Lesson Complete!
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          {message}
        </p>
        <div>
          <button
            onClick={onReplay}
            style={{ ...btnBase, background: 'var(--btn-secondary-bg)', color: 'var(--btn-secondary-text)' }}
          >
            Replay
          </button>
          <button
            onClick={onNextLesson}
            style={{ ...btnBase, background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
          >
            {isLastLesson ? 'Finish' : 'Next Lesson'}
          </button>
        </div>
      </div>
    </div>
  )
}
