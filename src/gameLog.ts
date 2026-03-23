// =============================================================================
// TAMERLANE SIEGE — Game Data Collection (localStorage)
// src/gameLog.ts
//
// Saves completed game data to localStorage for stats display and future
// Supabase sync (Phase 4). No external dependencies.
// =============================================================================

const STORAGE_KEY = 'tamerlane_games'

export interface GameLog {
  id: string                // crypto.randomUUID()
  timestamp: string         // ISO date string
  mode: 'ai' | 'pvp'
  aiDifficulty?: number     // only for AI mode
  result: string            // GameResult enum value (e.g. 'w_mate', 'b_stalemate', 'draw_citadel')
  winner: 'w' | 'b' | 'draw'
  totalMoves: number        // half-move count
  durationSeconds: number   // from game start to game over
  moves: string[]           // algebraic notation array from gameToMoveList()
  finalTFEN: string         // final position serialized
}

export interface GameStats {
  totalGames: number
  wins: number              // games where 'w' won (human in AI mode)
  losses: number            // games where 'b' won (AI in AI mode)
  draws: number
}

export function saveGameLog(log: GameLog): void {
  try {
    const existing = getGameLogs()
    existing.push(log)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
  } catch {
    // localStorage might be full or disabled — silently fail
  }
}

export function getGameLogs(): GameLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Basic runtime validation — trust localStorage data shape
    return parsed as GameLog[]
  } catch {
    return []
  }
}

export function getGameStats(): GameStats {
  const logs = getGameLogs()
  let wins = 0
  let losses = 0
  let draws = 0
  for (const log of logs) {
    if (log.winner === 'draw') draws++
    else if (log.winner === 'w') wins++
    else losses++
  }
  return { totalGames: logs.length, wins, losses, draws }
}

export function exportGameLogs(): string {
  return JSON.stringify(getGameLogs(), null, 2)
}

export function clearGameLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // silently fail
  }
}

/**
 * Determine winner from a GameResult string value.
 * Maps engine GameResult enum values to 'w' | 'b' | 'draw'.
 */
export function resultToWinner(result: string): 'w' | 'b' | 'draw' {
  if (result === 'w_mate' || result === 'w_stalemate') return 'w'
  if (result === 'b_mate' || result === 'b_stalemate') return 'b'
  return 'draw'
}
