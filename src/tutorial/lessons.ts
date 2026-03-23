// =============================================================================
// TAMERLANE SIEGE — Tutorial Lesson Definitions
// src/tutorial/lessons.ts
//
// Each lesson has a TFEN position, objectives, hints, and a win condition.
// =============================================================================

export type WinCondition =
  | { kind: 'checkmate' }               // state.result includes 'w_mate' or 'w_stalemate'
  | { kind: 'allCaptured' }             // All non-King black pieces captured
  | { kind: 'movesComplete'; count: number }  // Player made N moves

export type BlackBehavior = 'skip' | 'randomMove'

export interface TutorialLesson {
  id: string
  title: string
  subtitle: string
  objective: string
  hints: string[]
  tfen: string                 // Starting position in TFEN format
  winCondition: WinCondition
  blackBehavior: BlackBehavior // What happens on Black's turn
  congratsMessage: string
}

// =============================================================================
// Lesson 1 — Basic Movement & Capture
// White: King at e1 (4,0), Pawn of Kings at e2 (4,1), Pawn of Rooks at h2 (7,1)
// Black: King at k10 (10,9) — far corner, safe from stalemate
// Win: Make 3 moves to learn movement
// =============================================================================

const LESSON_1: TutorialLesson = {
  id: 'lesson-1',
  title: 'Basic Movement',
  subtitle: 'Learn how pieces move',
  objective: 'Move your King and Pawns — make 3 moves to complete this lesson.',
  hints: [
    'Click a piece to see its legal moves highlighted.',
    'Pawns move 1 square forward (toward rank 10).',
    'The King moves 1 square in any direction.',
  ],
  tfen: '10bK/11/11/11/11/11/11/11/4wK6/4wpk2wpr3|-,- w Kk 0:0 1',
  winCondition: { kind: 'movesComplete', count: 3 },
  blackBehavior: 'skip',
  congratsMessage: 'Great! You learned basic piece movement. Pawns go forward, Kings move in any direction.',
}

// =============================================================================
// Lesson 2 — Capturing Pieces
// White: Rook at a1 (0,0), Knight at e1 (4,0)
// Black: King at k10 (10,9), pawns scattered mid-board as targets
// Win: Capture all non-King black pieces
// =============================================================================

const LESSON_2: TutorialLesson = {
  id: 'lesson-2',
  title: 'Capturing Enemies',
  subtitle: 'Learn how to capture',
  objective: 'Capture all Black pawns! Red-highlighted squares show captures.',
  hints: [
    'Red rings mark squares where you can capture.',
    'Rooks slide any number of squares orthogonally.',
    'Knights jump in an L-shape and can leap over pieces.',
  ],
  tfen: '10bK/11/11/11/2bpg2bpv1bpn3/11/11/11/11/wR3wN6|-,- w Kk 0:0 1',
  winCondition: { kind: 'allCaptured' },
  blackBehavior: 'skip',
  congratsMessage: 'Well done! You captured all enemy pawns. Captures are shown with red rings.',
}

// =============================================================================
// Lesson 3 — Exotic Pieces
// White: Giraffe at a5 (0,4), Camel at a1 (0,0), Elephant at e1 (4,0)
// Black: King at k10 (10,9), various pawns as targets
// Win: Capture all non-King black pieces
// =============================================================================

const LESSON_3: TutorialLesson = {
  id: 'lesson-3',
  title: 'Exotic Pieces',
  subtitle: 'Giraffe, Camel & Elephant',
  objective: 'Use Tamerlane\'s unique pieces to capture all Black pawns.',
  hints: [
    'The Giraffe moves 1 diagonal then 3+ straight (not a leap).',
    'The Camel leaps in a 1×3 L-shape — like a stretched Knight.',
    'The Elephant leaps exactly 2 squares diagonally.',
  ],
  tfen: '10bK/11/3bpc2bpe4/11/11/wZ10/3bpv7/2bpg3bpn4/11/wC3wE6|-,- w Kk 0:0 1',
  winCondition: { kind: 'allCaptured' },
  blackBehavior: 'skip',
  congratsMessage: 'Excellent! You mastered the exotic pieces — Giraffe, Camel, and Elephant.',
}

// =============================================================================
// Lesson 4 — Checkmate
// White: King at c1 (2,0), 2 Rooks at a2 (0,1) and h1 (7,0)
// Black: King at e8 (4,7)
// Win: Checkmate the Black King
// =============================================================================

const LESSON_4: TutorialLesson = {
  id: 'lesson-4',
  title: 'Checkmate!',
  subtitle: 'Win the game',
  objective: 'Use your two Rooks to checkmate the Black King!',
  hints: [
    'A King is in check when attacked — it must escape.',
    'Checkmate = King is in check with no escape.',
    'Use both Rooks to control ranks and push the King to the edge.',
    'In Tamerlane, stalemate is a WIN — so don\'t worry about it!',
  ],
  tfen: '11/11/4bK6/11/11/11/11/wR10/11/2wK4wR3|-,- w Kk 0:0 1',
  winCondition: { kind: 'checkmate' },
  blackBehavior: 'randomMove',
  congratsMessage: 'Congratulations! You delivered checkmate. You\'re ready for a real game!',
}

// =============================================================================
// Export all lessons
// =============================================================================

export const LESSONS: TutorialLesson[] = [
  LESSON_1,
  LESSON_2,
  LESSON_3,
  LESSON_4,
]
