// =============================================================================
// TAMERLANE SIEGE — How to Play
// src/ui/components/HowToPlay.tsx
//
// Standalone scrollable tutorial screen showing all Tamerlane Chess rules.
// =============================================================================

// ---------------------------------------------------------------------------
// MiniDiagram — 5×5 SVG showing a piece and its reachable squares
// ---------------------------------------------------------------------------

function MiniDiagram({
  pieceType,
  reachable,
}: {
  pieceType: string
  reachable: Array<[number, number]>
}) {
  const cell = 50
  const size = cell * 5

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={160}
      height={160}
      style={{ display: 'block', margin: '12px auto 0', borderRadius: 6 }}
    >
      {/* Board background */}
      <rect width={size} height={size} rx={4} fill="var(--board-bg)" />

      {/* Grid lines */}
      {Array.from({ length: 6 }, (_, i) => (
        <g key={`grid-${i}`}>
          <line
            x1={i * cell} y1={0} x2={i * cell} y2={size}
            stroke="var(--board-grid)" strokeWidth={1} opacity={0.5}
          />
          <line
            x1={0} y1={i * cell} x2={size} y2={i * cell}
            stroke="var(--board-grid)" strokeWidth={1} opacity={0.5}
          />
        </g>
      ))}

      {/* Reachable squares — dot overlay */}
      {reachable.map(([r, c]) => (
        <circle
          key={`reach-${r}-${c}`}
          cx={c * cell + cell / 2}
          cy={r * cell + cell / 2}
          r={14}
          fill="var(--highlight-legal-dot)"
        />
      ))}

      {/* Piece image in center cell (2,2) */}
      <image
        href={`/pieces/default/w-${pieceType}.svg`}
        x={2 * cell + 5}
        y={2 * cell + 5}
        width={cell - 10}
        height={cell - 10}
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Piece data
// ---------------------------------------------------------------------------

interface PieceInfo {
  type: string
  name: string
  originalName: string
  description: string
  reachable: Array<[number, number]>
}

const PIECES: PieceInfo[] = [
  {
    type: 'K',
    name: 'King',
    originalName: 'Shah',
    description:
      '1 square any direction. Once per game: swap with any friendly piece when in check.',
    reachable: [
      [1, 1], [1, 2], [1, 3],
      [2, 1],         [2, 3],
      [3, 1], [3, 2], [3, 3],
    ],
  },
  {
    type: 'R',
    name: 'Rook',
    originalName: 'Rukh',
    description: 'Any number of squares orthogonally (like modern chess rook).',
    reachable: [
      [0, 2], [1, 2], [3, 2], [4, 2],
      [2, 0], [2, 1], [2, 3], [2, 4],
    ],
  },
  {
    type: 'N',
    name: 'Knight',
    originalName: 'Asp',
    description: 'L-shape leap: 1+2 squares. Jumps over pieces.',
    reachable: [
      [0, 1], [0, 3],
      [1, 0], [1, 4],
      [3, 0], [3, 4],
      [4, 1], [4, 3],
    ],
  },
  {
    type: 'G',
    name: 'General',
    originalName: 'Ferz',
    description: '1 square diagonally only.',
    reachable: [
      [1, 1], [1, 3],
      [3, 1], [3, 3],
    ],
  },
  {
    type: 'V',
    name: 'Vizier',
    originalName: 'Wazir',
    description: '1 square orthogonally only.',
    reachable: [
      [1, 2],
      [2, 1], [2, 3],
      [3, 2],
    ],
  },
  {
    type: 'T',
    name: 'Picket',
    originalName: "Tali'a",
    description: 'Slides diagonally, minimum 2 squares.',
    reachable: [
      [0, 0], [0, 4],
      [4, 0], [4, 4],
    ],
  },
  {
    type: 'Z',
    name: 'Giraffe',
    originalName: 'Zurafa',
    description:
      '1 diagonal then 3+ straight. Cannot jump over pieces.',
    reachable: [
      [1, 0], [3, 0],
      [0, 1], [4, 1],
      [0, 3], [4, 3],
      [1, 4], [3, 4],
    ],
  },
  {
    type: 'E',
    name: 'Elephant',
    originalName: 'Pil',
    description: 'Exactly 2 squares diagonally. Leaps over pieces.',
    reachable: [
      [0, 0], [0, 4],
      [4, 0], [4, 4],
    ],
  },
  {
    type: 'C',
    name: 'Camel',
    originalName: 'Jamal',
    description: '1+3 L-shape leap. Jumps over pieces.',
    reachable: [
      [1, 0], [3, 0],
      [1, 4], [3, 4],
    ],
  },
  {
    type: 'W',
    name: 'War Engine',
    originalName: 'Dabbaba',
    description: 'Exactly 2 squares orthogonally. Leaps.',
    reachable: [
      [0, 2],
      [2, 0], [2, 4],
      [4, 2],
    ],
  },
]

// ---------------------------------------------------------------------------
// Pawn promotion data
// ---------------------------------------------------------------------------

const PAWN_PROMOTIONS = [
  ['Pawn of Rooks', 'Rook'],
  ['Pawn of Knights', 'Knight'],
  ['Pawn of Generals', 'General'],
  ['Pawn of Viziers', 'Vizier'],
  ['Pawn of Pickets', 'Picket'],
  ['Pawn of Giraffes', 'Giraffe'],
  ['Pawn of Elephants', 'Elephant'],
  ['Pawn of Camels', 'Camel'],
  ['Pawn of War Engines', 'War Engine'],
  ['Pawn of Kings', 'Prince'],
  ['Pawn of Pawns', '(special, see below)'],
]

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-secondary)',
  borderRadius: 12,
  padding: '24px 20px',
  marginBottom: 24,
}

const headingStyle: React.CSSProperties = {
  color: 'var(--accent-gold)',
  fontSize: 20,
  fontWeight: 700,
  marginBottom: 12,
  marginTop: 0,
  letterSpacing: '0.02em',
}

const bodyStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 15,
  lineHeight: 1.6,
  margin: 0,
}

const hrStyle: React.CSSProperties = {
  border: 'none',
  borderBottom: '1px solid var(--surface-tertiary)',
  margin: '28px 0',
}

// ---------------------------------------------------------------------------
// HowToPlay
// ---------------------------------------------------------------------------

export function HowToPlay({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--surface-primary)',
        overflowY: 'auto',
        padding: '12px 12px 48px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Back button */}
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
          }}
        >
          ← Back
        </button>

        {/* ============================================================= */}
        {/* 1. OVERVIEW */}
        {/* ============================================================= */}
        <div style={cardStyle}>
          <h2 style={{ ...headingStyle, fontSize: 24 }}>
            Timur Chess (Tamerlane Chess)
          </h2>
          <p style={bodyStyle}>
            A medieval chess variant from Central Asia, 14th century. 10×11
            board + 2 citadel squares. 28 pieces per side. Goal: checkmate ALL
            enemy royal pieces, or enter the opponent's citadel for a draw.
          </p>
        </div>

        <hr style={hrStyle} />

        {/* ============================================================= */}
        {/* 2. PIECES */}
        {/* ============================================================= */}
        <h2 style={{ ...headingStyle, fontSize: 22, marginBottom: 16 }}>
          Pieces
        </h2>

        {PIECES.map((p) => (
          <div key={p.type} style={cardStyle}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              {/* Piece image */}
              <img
                src={`/pieces/default/w-${p.type}.svg`}
                alt={p.name}
                width={64}
                height={64}
                style={{ flexShrink: 0 }}
              />

              {/* Name + description */}
              <div style={{ flex: 1, minWidth: 180 }}>
                <h3
                  style={{
                    color: 'var(--accent-gold)',
                    fontSize: 17,
                    fontWeight: 700,
                    margin: '0 0 4px',
                  }}
                >
                  {p.name}{' '}
                  <span
                    style={{
                      color: 'var(--text-secondary)',
                      fontWeight: 400,
                      fontSize: 14,
                    }}
                  >
                    ({p.originalName})
                  </span>
                </h3>
                <p style={{ ...bodyStyle, fontSize: 14 }}>{p.description}</p>
              </div>
            </div>

            {/* Mini movement diagram */}
            <MiniDiagram pieceType={p.type} reachable={p.reachable} />
          </div>
        ))}

        <hr style={hrStyle} />

        {/* ============================================================= */}
        {/* 3. PAWNS */}
        {/* ============================================================= */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>11 Unique Pawns</h2>
          <p style={{ ...bodyStyle, marginBottom: 16 }}>
            Each pawn promotes to the piece it represents when reaching the
            opponent's back rank. No double step. No en passant.
          </p>

          <div
            style={{
              background: 'var(--surface-tertiary)',
              borderRadius: 8,
              padding: '12px 16px',
            }}
          >
            {PAWN_PROMOTIONS.map(([from, to], i) => (
              <div
                key={from}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom:
                    i < PAWN_PROMOTIONS.length - 1
                      ? '1px solid var(--surface-secondary)'
                      : 'none',
                  fontSize: 14,
                }}
              >
                <span style={{ color: 'var(--text-primary)' }}>{from}</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  → {to}
                </span>
              </div>
            ))}
          </div>
        </div>

        <hr style={hrStyle} />

        {/* ============================================================= */}
        {/* 4. PAWN OF PAWNS */}
        {/* ============================================================= */}
        <div
          style={{
            ...cardStyle,
            border: '2px solid var(--accent-gold)',
          }}
        >
          <h2 style={headingStyle}>
            The Pawn of Pawns — Most Complex Piece
          </h2>

          {[
            {
              stage: 'Stage 1',
              text: 'Reaches back rank → becomes immobile & invincible. Then teleports to any square threatening an enemy.',
            },
            {
              stage: 'Stage 2',
              text: 'Reaches back rank again → relocates to Pawn of Kings start square.',
            },
            {
              stage: 'Stage 3',
              text: 'Reaches back rank a third time → becomes an Adventitious King (extra royal piece!).',
            },
          ].map(({ stage, text }) => (
            <div
              key={stage}
              style={{
                background: 'var(--surface-tertiary)',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 10,
              }}
            >
              <strong
                style={{
                  color: 'var(--accent-gold)',
                  fontSize: 14,
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                {stage}
              </strong>
              <span style={{ color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.5 }}>
                {text}
              </span>
            </div>
          ))}
        </div>

        <hr style={hrStyle} />

        {/* ============================================================= */}
        {/* 5. CITADELS */}
        {/* ============================================================= */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>The Citadels — Diplomatic Escape</h2>
          <p style={bodyStyle}>
            Two special squares outside the main board. Move your highest royal
            into the opponent's citadel = instant draw. Your Adventitious King
            can enter your own citadel for immunity.
          </p>
        </div>

        <hr style={hrStyle} />

        {/* ============================================================= */}
        {/* 6. SPECIAL RULES */}
        {/* ============================================================= */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>Special Rules</h2>
          <ul
            style={{
              ...bodyStyle,
              paddingLeft: 20,
              listStyleType: 'disc',
            }}
          >
            {[
              'Stalemate = WIN for the side that caused it (opposite of modern chess!).',
              'You can have multiple kings (original + Prince + Adventitious King). Opponent must checkmate ALL of them.',
              'Baring the king (capturing all pieces except the king) is NOT a win.',
              'King can swap with any friendly piece once per game when in check.',
            ].map((rule, i) => (
              <li
                key={i}
                style={{
                  marginBottom: 10,
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <hr style={hrStyle} />

        {/* ============================================================= */}
        {/* 7. QUICK START TIPS */}
        {/* ============================================================= */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>Quick Start Tips</h2>
          <ul
            style={{
              ...bodyStyle,
              paddingLeft: 20,
              listStyleType: 'disc',
            }}
          >
            {[
              'Protect your Pawn of Pawns — it can become a game-winning extra King.',
              'Use Knights and Camels early — they can leap over the crowded opening.',
              "If you're losing, aim for the opponent's citadel — a draw is better than a loss.",
              'The Giraffe is powerful but easily blocked. Clear its path.',
            ].map((tip, i) => (
              <li
                key={i}
                style={{
                  marginBottom: 10,
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom padding for scroll comfort */}
        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}
