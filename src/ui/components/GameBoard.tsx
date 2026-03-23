// =============================================================================
// TAMERLANE SIEGE — GameBoard Component (with full interaction)
// src/ui/components/GameBoard.tsx
//
// Owns all click-interaction state:
//   selected piece, computed legal moves, last move, pending-confirmation move.
//
// App.tsx owns GameState and passes onMove / onUndo / onNewGame callbacks.
// =============================================================================

import { useRef, useState, useMemo, useLayoutEffect } from 'react'
import type { GameState, Square, Move, Piece } from '../../core/types'
import { MoveFlag, PieceType } from '../../core/types'
import { getAllLegalMoves, isRoyalInCheck } from '../../core/rules'
import { squaresEqual } from '../../core/board'
import { Board, squareToPx, type BoardHighlights } from './Board'
import { PieceComponent } from './Piece'

// -----------------------------------------------------------------------------
// Helper — pretty piece-type name for modals
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
// Modal type
// -----------------------------------------------------------------------------

type ModalKind =
  | { kind: 'promotion';    move: Move }   // normal pawn promotion info
  | { kind: 'pp-stage1';   move: Move }   // PP arrives on back rank (stage 1)
  | { kind: 'pp-stage2';   move: Move }   // PP arrives second time
  | { kind: 'pp-stage3';   move: Move }   // PP → Adventitious King
  | { kind: 'displacement'; move: Move }  // PP teleport displacing a friendly piece

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
  const [selected,    setSelected]    = useState<Square | null>(null)
  const [legalMoves,  setLegalMoves]  = useState<Move[]>([])
  const [lastMove,    setLastMove]    = useState<Move | null>(null)
  const [modal,       setModal]       = useState<ModalKind | null>(null)

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
  // Execute move (called after any required modal confirmation)
  // -------------------------------------------------------------------------

  function executeMove(move: Move) {
    onMove(move)
    setSelected(null)
    setLegalMoves([])
    setLastMove(move)
    setModal(null)
  }

  // -------------------------------------------------------------------------
  // Determine whether a move requires a modal
  // -------------------------------------------------------------------------

  function modalForMove(move: Move): ModalKind | null {
    switch (move.flag) {
      case MoveFlag.PROMOTION:
        return { kind: 'promotion', move }
      case MoveFlag.PAWN_OF_PAWNS_STAGE1_ARRIVAL:
        return { kind: 'pp-stage1', move }
      case MoveFlag.PAWN_OF_PAWNS_STAGE2_ARRIVAL:
        return { kind: 'pp-stage2', move }
      case MoveFlag.PAWN_OF_PAWNS_STAGE3_PROMOTION:
        return { kind: 'pp-stage3', move }
      case MoveFlag.PAWN_OF_PAWNS_TELEPORT:
        // Only need confirmation if a friendly piece is displaced
        return move.displaced ? { kind: 'displacement', move } : null
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

    // Modal is open — ignore board clicks
    if (modal !== null) return

    // If a piece is selected, check if we're clicking a legal target
    if (selected !== null) {
      // Find the move(s) that land on this square
      const candidates = legalMoves.filter(
        m => m.to.file === sq.file && m.to.rank === sq.rank,
      )

      if (candidates.length > 0) {
        // There should be at most one candidate per destination for Tamerlane
        const move = candidates[0]
        const m = modalForMove(move)
        if (m) {
          setModal(m)
        } else {
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
  // Piece entries to render
  // -------------------------------------------------------------------------

  const pieceEntries: Array<{ key: string; file: number; rank: number; piece: Piece }> = []
  for (const [key, piece] of state.pieces.entries()) {
    const [f, r] = key.split(',').map(Number)
    pieceEntries.push({ key, file: f, rank: r, piece })
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
          const isSel = selected?.file === file && selected?.rank === rank
          const isCheck = checkSquares.some(s => s.file === file && s.rank === rank)
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
      {/* Modals                                                               */}
      {/* ------------------------------------------------------------------ */}
      {modal && <ModalOverlay modal={modal} onConfirm={executeMove} onCancel={() => setModal(null)} />}
    </>
  )
}

// =============================================================================
// ModalOverlay — renders whichever modal is active
// =============================================================================

interface ModalOverlayProps {
  modal:     ModalKind
  onConfirm: (move: Move) => void
  onCancel:  () => void
}

function ModalOverlay({ modal, onConfirm, onCancel }: ModalOverlayProps) {
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
    background:    'var(--surface-secondary)',
    border:        '1px solid var(--accent-gold-muted)',
    borderRadius:  12,
    padding:       '28px 36px',
    maxWidth:      400,
    width:         '90%',
    textAlign:     'center',
    color:         'var(--text-primary)',
    boxShadow:     '0 8px 32px rgba(0,0,0,0.6)',
  }

  const btnBase: React.CSSProperties = {
    padding:       '8px 22px',
    borderRadius:  6,
    border:        'none',
    cursor:        'pointer',
    fontWeight:    600,
    fontSize:      15,
    margin:        '0 6px',
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
  }

  let title    = ''
  let body     = ''
  let showCancel = false

  switch (modal.kind) {
    case 'promotion': {
      const promoted = modal.move.promotionType
        ? pieceName(modal.move.promotionType)
        : 'piece'
      title = 'Pawn Promotion'
      body  = `This pawn promotes to ${promoted}!`
      break
    }
    case 'pp-stage1': {
      title = 'Pawn of Pawns — Stage 1'
      body  = 'The Pawn of Pawns has reached the back rank! It is now Immobile & Invincible. On your next turn, you may teleport it to any square it attacks or forks.'
      break
    }
    case 'pp-stage2': {
      const promoted = pieceName(PieceType.PAWN_OF_KINGS)
      title = 'Pawn of Pawns — Stage 2'
      body  = `The Pawn of Pawns reaches the back rank again and relocates to the ${promoted} starting square.`
      break
    }
    case 'pp-stage3': {
      title = 'Pawn of Pawns — Stage 3'
      body  = 'The Pawn of Pawns has completed its journey and promotes to the Adventitious King!'
      break
    }
    case 'displacement': {
      const displaced = modal.move.displaced
        ? pieceName(modal.move.displaced.type)
        : 'piece'
      title      = 'Displace Friendly Piece?'
      body       = `Teleporting here will displace your ${displaced}. It will be removed from the board.`
      showCancel = true
      break
    }
  }

  return (
    <div style={backdropStyle} onClick={onCancel}>
      <div style={boxStyle} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, color: 'var(--accent-gold)' }}>
          {title}
        </h2>
        <p style={{ margin: '0 0 24px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          {body}
        </p>
        <div>
          {showCancel && (
            <button style={btnSecondary} onClick={onCancel}>Cancel</button>
          )}
          <button style={btnPrimary} onClick={() => onConfirm(modal.move)}>
            {modal.kind === 'displacement' ? 'Confirm' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}
