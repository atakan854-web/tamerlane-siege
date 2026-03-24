// =============================================================================
// TAMERLANE SIEGE — Puzzle Streak Tracker
// src/puzzles/streakTracker.ts
//
// localStorage-based streak tracking for daily puzzles.
// =============================================================================

import { PUZZLES } from './puzzleData'

const STREAK_KEY  = 'tamerlane_puzzle_streak'
const SOLVED_KEY  = 'tamerlane_puzzles_solved'

// =============================================================================
// Types
// =============================================================================

export interface StreakData {
  currentStreak:  number
  maxStreak:      number
  lastSolvedDate: string | null  // ISO date string "YYYY-MM-DD"
  totalSolved:    number
}

// =============================================================================
// Today's puzzle index — deterministic rotation based on day
// =============================================================================

function getDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

function daysSinceEpoch(date: Date = new Date()): number {
  return Math.floor(date.getTime() / 86_400_000)
}

export function getTodaysPuzzleIndex(): number {
  return daysSinceEpoch() % PUZZLES.length
}

// =============================================================================
// Read streak data from localStorage
// =============================================================================

export function getStreakData(): StreakData {
  const defaults: StreakData = {
    currentStreak: 0,
    maxStreak: 0,
    lastSolvedDate: null,
    totalSolved: 0,
  }

  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw)
    return {
      currentStreak:  typeof parsed.currentStreak  === 'number' ? parsed.currentStreak  : 0,
      maxStreak:      typeof parsed.maxStreak      === 'number' ? parsed.maxStreak      : 0,
      lastSolvedDate: typeof parsed.lastSolvedDate === 'string' ? parsed.lastSolvedDate : null,
      totalSolved:    typeof parsed.totalSolved    === 'number' ? parsed.totalSolved    : 0,
    }
  } catch {
    return defaults
  }
}

// =============================================================================
// Check if today's puzzle is already solved
// =============================================================================

export function isPuzzleSolvedToday(): boolean {
  const streak = getStreakData()
  return streak.lastSolvedDate === getDateString()
}

// =============================================================================
// Mark today's puzzle as solved — update streak
// =============================================================================

export function markPuzzleSolved(): StreakData {
  const today = getDateString()
  const prev  = getStreakData()

  // Already solved today — no-op
  if (prev.lastSolvedDate === today) return prev

  // Check if yesterday was solved (streak continues)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = getDateString(yesterday)

  const isConsecutive = prev.lastSolvedDate === yesterdayStr
  const newStreak     = isConsecutive ? prev.currentStreak + 1 : 1

  const updated: StreakData = {
    currentStreak:  newStreak,
    maxStreak:      Math.max(prev.maxStreak, newStreak),
    lastSolvedDate: today,
    totalSolved:    prev.totalSolved + 1,
  }

  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(updated))
  } catch { /* silently fail */ }

  // Also track which puzzle indices have been solved
  try {
    const solvedRaw = localStorage.getItem(SOLVED_KEY)
    const solved: number[] = solvedRaw ? JSON.parse(solvedRaw) : []
    const todayIdx = getTodaysPuzzleIndex()
    if (!solved.includes(todayIdx)) {
      solved.push(todayIdx)
      localStorage.setItem(SOLVED_KEY, JSON.stringify(solved))
    }
  } catch { /* silently fail */ }

  return updated
}

// =============================================================================
// Get list of solved puzzle indices (for practice mode)
// =============================================================================

export function getSolvedPuzzleIndices(): Set<number> {
  try {
    const raw = localStorage.getItem(SOLVED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

// =============================================================================
// Share text for clipboard
// =============================================================================

export function getShareText(puzzleIndex: number, moveCount: number): string {
  const streak = getStreakData()
  return [
    `♟ Tamerlane Siege — Daily Puzzle #${puzzleIndex + 1}`,
    `Solved in ${moveCount} move${moveCount !== 1 ? 's' : ''}`,
    `Streak: ${streak.currentStreak} day${streak.currentStreak !== 1 ? 's' : ''}`,
    `https://tamerlane-siege.pages.dev`,
  ].join('\n')
}
