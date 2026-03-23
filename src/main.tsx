import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './theme.css'
import './index.css'

import { createNewGame, makeMove, undoMove } from './core/game'
import { getAllLegalMoves, getGameResult } from './core/rules'
import { generateMovesForPiece } from './core/moves'
import { moveToAlgebraic, gameToMoveList } from './core/notation'

const initialGame = createNewGame()
const engineAPI = {
  state: initialGame,

  moves: () => {
    const moves = getAllLegalMoves(engineAPI.state.turn, engineAPI.state)
    return moves.map((m, i) => `${i}: ${moveToAlgebraic(m, engineAPI.state)}`)
  },

  play: (index: number) => {
    const moves = getAllLegalMoves(engineAPI.state.turn, engineAPI.state)
    if (index < 0 || index >= moves.length) return `Invalid index. 0-${moves.length - 1} arası seç.`
    engineAPI.state = makeMove(engineAPI.state, moves[index])
    const result = getGameResult(engineAPI.state)
    if (result) return `Move yapıldı. OYUN BİTTİ: ${result}`
    return `Move yapıldı. Sıra: ${engineAPI.state.turn === 'w' ? 'White' : 'Black'}, Move #${engineAPI.state.moveNumber}`
  },

  piece: (file: number, rank: number) => {
    const piece = engineAPI.state.pieces.get(`${file},${rank}`)
    if (!piece) return `(${file},${rank}) boş`
    const moves = generateMovesForPiece({ file, rank }, piece, engineAPI.state)
    return {
      piece: `${piece.color} ${piece.type}`,
      moves: moves.map(m => moveToAlgebraic(m, engineAPI.state)),
    }
  },

  board: () => {
    const rows: string[] = []
    for (let rank = 9; rank >= 0; rank--) {
      let row = `${(rank + 1).toString().padStart(2)} |`
      for (let file = 0; file <= 10; file++) {
        const p = engineAPI.state.pieces.get(`${file},${rank}`)
        row += p ? ` ${p.color}${p.type}`.padEnd(5) : '  .  '
      }
      rows.push(row)
    }
    rows.push('    ' + 'abcdefghijk'.split('').map(c => `  ${c}  `).join(''))
    return rows.join('\n')
  },

  reset: () => {
    engineAPI.state = createNewGame()
    return 'Yeni oyun başladı.'
  },

  history: () => gameToMoveList(engineAPI.state),

  undo: () => {
    if (engineAPI.state.history.length === 0) return 'Geri alınacak move yok.'
    engineAPI.state = undoMove(engineAPI.state)
    return `Son move geri alındı. Sıra: ${engineAPI.state.turn === 'w' ? 'White' : 'Black'}`
  },
}

;(window as any).e = engineAPI

if (import.meta.env.DEV) {
  console.log('%c♛ Tamerlane Siege Engine Console ♛', 'font-size: 16px; font-weight: bold; color: #D4AF37')
  console.log('%cKomutlar:', 'font-weight: bold')
  console.log('  e.board()    — Board görüntüle')
  console.log('  e.moves()    — Legal moves listesi')
  console.log('  e.play(0)    — Index ile move yap')
  console.log('  e.piece(5,1) — Karedeki piece moves')
  console.log('  e.history()  — Move history')
  console.log('  e.undo()     — Son move geri al')
  console.log('  e.reset()    — Yeni oyun')
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
