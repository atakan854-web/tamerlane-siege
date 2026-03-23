// =============================================================================
// TAMERLANE SIEGE — GameBoard Component (with full interaction)
// src/ui/components/GameBoard.tsx
//
// Owns all click-interaction state:
//   selected piece, computed legal moves, last move, pending-confirmation move.
//
// App.tsx owns GameState and passes onMove / onUndo / onNewGame callbacks.
// =============================================================================

import { useRef, useState, useMemo, useLayoutEffect, useEffect } from 'react'
import type { GameState, Square, Move, Piece } from '../../core/types'
import { MoveFlag, PieceType } from '../../core/types'
import { getAllLegalMoves, isRoyalInCheck } from '../../core/rules'
import { squaresEqual } from '../../core/board'
import { Board, squareToPx, type BoardHighlights } from './Board'
import { PieceComponent } from './Piece'

// -----------------------------------------------------------------------------
// Helper — pretty piece-type name for modals / toasts
// -----------------------------------------------------------------------------

const PIECE_DISPLAY_NAMES: Record<PieceType, string> = {
  [PieceType.KING]:                'King',
  [PieceType.GENERAL]:             'General (Ferz)',
  [PieceType.VIZIER]:              'Vizier (Wazir)',
  [PieceType.ROOK]:                'Rook',
  [PieceType.KNIGHT]:              'Knight',
  [PieceType.PICKET]:              'Picket (Tali\'a)',
  [PieceType.GIRAFFE]:             'Giraffe (Zurafa)',
  [PieceType.ELEPHANT]:            'Elephant (Pil)',
  [PieceType.CAMEL]:               'Camel',
  [PieceType.WAR_ENGINE]:          'War Engine (Dabbaba)',
  [PieceType.PRINCE]:              'Prince',
  [PieceType.ADVENTITIOUS_KING]:   'Adventitious King',
  [PieceType.PAWN_OF_KINGS]:       'Pawn of Kings',
  [PieceType.PAWN_OF_GENERALS]:    'Pawn of Generals',
  [PieceType.PAWN_OF_VIZIERS]:     'Pawn of Viziers',
  [PieceType.PAWN_OF_ROOKS]:       'Pawn of Rooks',
  [PieceType.PAWN_OF_KNIGHTS]:     'Pawn of Knights',
  [PieceType.PAWN_OF_PICKETS]:     'Pawn of Pickets',
  [PieceType.PAWN_OF_GIRAFFES]:    'Pawn of Giraffes',
  [PieceType.PAWN_OF_ELEPHANTS]:   'Pawn of Elephants',
  [PieceType.PAWN_OF_CAMELS]:      'Pawn of Camels',
  [PieceType.PAWN_OF_WAR_ENGINES]: 'Pawn of War Engines',
  [PieceType.PAWN_OF_PAWNS]:       'Pawn of Pawns',
}

function pieceName(t: PieceType): string {
  return PIECE_DISPLAY_NAMES[t] ?? t
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

// Blocking modal — requires explicit user confirmation before proceeding
type ModalKind = { kind: 'displacement'; move: Move }

// Non-blocking toast — shown for 3 s then auto-dismissed; move executes immediately
interface ToastInfo { title: string; body: string }

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

interface GameBoardProps {
  state:       GameState
  onMove:      (move: Move) => void
  onUndo:      () => void
  onNewGame:   () => void
  className?:  string
  style?:      React.CSSProperties
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function GameBoard({ state, onMove, className, style }: GameBoardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState(0)

  // Interaction state
  const [selected,   setSelected]   = useState<Square | null>(null)
  const [legalMoves, setLegalMoves] = useState<Move[]>([])
  const [lastMove,   setLastMove]   = useState<Move | null>(null)
  const [modal,      setModal]      = useState<ModalKind | null>(null)
  const [toast,      setToast]      = useState<ToastInfo | null>(null)

  // Auto-dismiss toast after 2 seconds
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(id)
  }, [toast])

  // Measure board width (for pixel-accurate piece positioning)
  useLayoutEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const update = () => setBoardWidth(el.getBoundingClientRect().width)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Derive all legal moves for the current player (memoized on state)
  const allLegal = useMemo(
    () => (state.result ? [] : getAllLegalMoves(state.turn, state)),
    [state],
  )

  // Compute check squares — royals of the active player that are in check
  const checkSquares = useMemo<Square[]>(() => {
    if (state.result) return []
    const royals = state.turn === 'w' ? state.whiteRoyals : state.blackRoyals
    return royals.filter(sq => isRoyalInCheck(sq, state.turn, state))
  }, [state])

  // Piece entries — memoized to avoid Map→Array conversion on every render
  const pieceEntries = useMemo<Array<{ key: string; file: number; rank: number; piece: Piece }>>(() => {
    const entries: Array<{ key: string; file: number; rank: number; piece: Piece }> = []
    for (const [key, piece] of state.pieces.entries()) {
      const [f, r] = key.split(',').map(Number)
      entries.push({ key, file: f, rank: r, piece })
    }
    return entries
  }, [state.pieces])

  // -------------------------------------------------------------------------
  // Categorise legal moves for the selected piece into highlight buckets
  // -------------------------------------------------------------------------

  const legalEmpty:    Square[] = []
  const legalCaptures: Square[] = []
  const legalCitadel:  Square[] = []
  const legalKingSwap: Square[] = []

  for (const m of legalMoves) {
    const to = m.to
    if (m.flag === MoveFlag.KING_SWAP) {
      legalKingSwap.push(to)
    } else if (m.flag === MoveFlag.CITADEL_ENTRY) {
      legalCitadel.push(to)
    } else if (m.captured) {
      legalCaptures.push(to)
    } else {
      legalEmpty.push(to)
    }
  }

  // -------------------------------------------------------------------------
  // Execute move (called immediately for normal moves; after confirmation for displacement)
  // -------------------------------------------------------------------------

  function executeMove(move: Move) {
    onMove(move)
    setSelected(null)
    setLegalMoves([])
    setLastMove(move)
    setModal(null)
  }

  // -------------------------------------------------------------------------
  // Returns a blocking modal if the move requires explicit user confirmation.
  // Currently only PP teleport with displacement needs confirmation.
  // -------------------------------------------------------------------------

  function blockingModalForMove(move: Move): ModalKind | null {
    if (move.flag === MoveFlag.PAWN_OF_PAWNS_TELEPORT && move.displaced) {
      return { kind: 'displacement', move }
    }
    return null
  }

  // -------------------------------------------------------------------------
  // Returns a brief informational toast for notable move events.
  // The move executes immediately — the toast is purely informational.
  // -------------------------------------------------------------------------

  function toastForMove(move: Move): ToastInfo | null {
    switch (move.flag) {
      case MoveFlag.PROMOTION: {
        const promoted = move.promotionType ? pieceName(move.promotionType) : 'piece'
        return { title: 'Pawn Promotion', body: `Promotes to ${promoted}!` }
      }
      case MoveFlag.PAWN_OF_PAWNS_STAGE1_ARRIVAL:
        return {
          title: 'Pawn of Pawns — Stage 1',
          body:  'Reached the back rank! Now Immobile & Invincible. Teleport it on your next turn.',
        }
      case MoveFlag.PAWN_OF_PAWNS_STAGE2_ARRIVAL:
        return {
          title: 'Pawn of Pawns — Stage 2',
          body:  `Relocates to the ${pieceName(PieceType.PAWN_OF_KINGS)} starting square.`,
        }
      case MoveFlag.PAWN_OF_PAWNS_STAGE3_PROMOTION:
        return {
          title: 'Pawn of Pawns — Stage 3',
          body:  'Journey complete — promotes to Adventitious King!',
        }
      default:
        return null
    }
  }

  // -------------------------------------------------------------------------
  // Select a piece and compute its legal moves
  // -------------------------------------------------------------------------

  function selectPiece(sq: Square) {
    const movesForPiece = allLegal.filter(
      m => m.from.file === sq.file && m.from.rank === sq.rank,
    )
    setSelected(sq)
    setLegalMoves(movesForPiece)
  }

  function deselect() {
    setSelected(null)
    setLegalMoves([])
  }

  // -------------------------------------------------------------------------
  // Primary click handler (unified for board squares + piece divs)
  // -------------------------------------------------------------------------

  function handleSquareClick(sq: Square) {
    // Game over — ignore all clicks
    if (state.result !== null) return

    // Blocking modal is open — ignore board clicks
    if (modal !== null) return

    // If a piece is selected, check if we're clicking a legal target
    if (selected !== null) {
      const candidates = legalMoves.filter(
        m => m.to.file === sq.file && m.to.rank === sq.rank,
      )

      if (candidates.length > 0) {
        // There should be at most one candidate per destination for Tamerlane
        const move = candidates[0]
        const blocking = blockingModalForMove(move)
        if (blocking) {
          // Needs confirmation — show blocking modal
          setModal(blocking)
        } else {
          // Execute immediately; show informational toast if applicable
          const info = toastForMove(move)
          if (info) setToast(info)
          executeMove(move)
        }
        return
      }
    }

    // Try to select the clicked square if it has a friendly piece
    const piece = state.pieces.get(`${sq.file},${sq.rank}`)
    if (piece && piece.color === state.turn) {
      // Don't re-select same square (toggle off)
      if (selected && squaresEqual(selected, sq)) {
        deselect()
      } else {
        selectPiece(sq)
      }
      return
    }

    // Clicked empty square or enemy piece with no selection → deselect
    deselect()
  }

  // -------------------------------------------------------------------------
  // Board highlight props
  // -------------------------------------------------------------------------

  const highlights: BoardHighlights = {
    selected,
    legalEmpty,
    legalCaptures,
    legalCitadel,
    legalKingSwap,
    checkSquares,
    lastFrom: lastMove?.from ?? null,
    lastTo:   lastMove?.to   ?? null,
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <div
        ref={wrapperRef}
        className={className}
        style={{ position: 'relative', ...style }}
      >
        {/* SVG board */}
        <Board
          {...highlights}
          onSquareClick={handleSquareClick}
        />

        {/* Piece overlays */}
        {boardWidth > 0 && pieceEntries.map(({ key, file, rank, piece }) => {
          const { left, top, size } = squareToPx(file, rank, boardWidth)
          const isSel    = selected?.file === file && selected?.rank === rank
          const isCheck  = checkSquares.some(s => s.file === file && s.rank === rank)
          return (
            <PieceComponent
              key={key}
              piece={piece}
              left={left}
              top={top}
              size={size}
              isSelected={isSel}
              isCheck={isCheck}
              onClick={() => handleSquareClick({ file, rank })}
            />
          )
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Blocking modal (displacement confirmation only)                      */}
      {/* ------------------------------------------------------------------ */}
      {modal && (
        <DisplacementModal
          move={modal.move}
          onConfirm={executeMove}
          onCancel={() => setModal(null)}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Informational toast (auto-dismisses after 3 s)                      */}
      {/* ------------------------------------------------------------------ */}
      {toast && <InfoToast toast={toast} />}
    </>
  )
}

// =============================================================================
// DisplacementModal — blocking confirmation for PP teleport with displacement
// =============================================================================

interface DisplacementModalProps {
  move:      Move
  onConfirm: (move: Move) => void
  onCancel:  () => void
}

function DisplacementModal({ move, onConfirm, onCancel }: DisplacementModalProps) {
  // Dismiss on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const displaced = move.displaced ? pieceName(move.displaced.type) : 'piece'

  const backdropStyle: React.CSSProperties = {
    position:        'fixed',
    inset:           0,
    background:      'var(--surface-overlay)',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          100,
  }

  const boxStyle: React.CSSProperties = {
    background:   'var(--surface-secondary)',
    border:       '1px solid var(--accent-gold-muted)',
    borderRadius: 12,
    padding:      '28px 36px',
    maxWidth:     400,
    width:        '90%',
    textAlign:    'center',
    color:        'var(--text-primary)',
    boxShadow:    '0 8px 32px rgba(0,0,0,0.6)',
  }

  const btnBase: React.CSSProperties = {
    padding:      '8px 22px',
    borderRadius: 6,
    border:       'none',
    cursor:       'pointer',
    fontWeight:   600,
    fontSize:     15,
    margin:       '0 6px',
  }

  return (
    <div style={backdropStyle} onClick={onCancel}>
      <div style={boxStyle} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, color: 'var(--accent-gold)' }}>
          Displace Friendly Piece?
        </h2>
        <p style={{ margin: '0 0 24px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          Teleporting here will displace your {displaced}. It will be removed from the board.
        </p>
        <div>
          <button
            style={{ ...btnBase, background: 'var(--btn-secondary-bg)', color: 'var(--btn-secondary-text)' }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            style={{ ...btnBase, background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
            onClick={() => onConfirm(move)}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// InfoToast — non-blocking 3 s notification for promotion / PP stage events
// =============================================================================

function InfoToast({ toast }: { toast: ToastInfo }) {
  return (
    <div
      style={{
        position:     'fixed',
        bottom:       32,
        left:         '50%',
        transform:    'translateX(-50%)',
        background:   'var(--surface-secondary)',
        border:       '1px solid var(--accent-gold-muted)',
        borderRadius: 10,
        padding:      '12px 22px',
        boxShadow:    '0 4px 24px rgba(0,0,0,0.55)',
        zIndex:       150,
        minWidth:     200,
        maxWidth:     340,
        textAlign:    'center',
        pointerEvents: 'none',  // never blocks board interaction
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent-gold)', marginBottom: 4 }}>
        {toast.title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
        {toast.body}
      </div>
    </div>
  )
}
