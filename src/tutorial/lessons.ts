// =============================================================================
// TAMERLANE SIEGE — Tutorial Lesson Definitions
// src/tutorial/lessons.ts
//
// Each lesson has a TFEN position, objectives, hints, and a win condition.
// TFEN format: rank9/.../rank0 | citW,citB turn swap wPP:bPP moveNum
// =============================================================================

export type WinCondition =
  | { kind: 'checkmate' }                     // state.result === 'w_mate' or 'w_stalemate'
  | { kind: 'allCaptured' }                   // All non-King Black pieces captured
  | { kind: 'movesComplete'; count: number }  // Player made N moves
  | { kind: 'citadelEntry' }                  // White royal enters Black citadel → draw
  | { kind: 'ppStage1' }                      // White Pawn of Pawns reaches back rank

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
// Lesson 1 — The Shah's First Steps
// Teaches: King movement and basic capture
// White: King at f5 (5,4)
// Black: King at k10 (10,9), 3 pawns as targets
// Win: Capture all Black pawns (allCaptured)
// =============================================================================

const LESSON_1: TutorialLesson = {
  id: 'lesson-1',
  title: "The Shah's First Steps",
  subtitle: 'King movement & capture',
  objective: 'Move your King to capture all 3 Black pawns.',
  hints: [
    'Click a piece to see its legal moves highlighted in green.',
    'The King moves exactly 1 square in any direction — including diagonally.',
    'Red rings mark enemy pieces your King can capture.',
    "Tamerlane's King rules all 112 squares — there's no castling.",
  ],
  // wK at f5 (5,4); targets: bpk at d7(3,6), bpr at f8(5,7), bpv at h6(7,5); bK at k10(10,9)
  tfen: '10bK/11/5bpr5/3bpk7/7bpv3/5wK5/11/11/11/11|-,- w Kk 0:0 1',
  winCondition: { kind: 'allCaptured' },
  blackBehavior: 'skip',
  congratsMessage: 'Well done! The King is the heart of Tamerlane Chess — guard it fiercely.',
}

// =============================================================================
// Lesson 2 — Rooks of the Empire
// Teaches: Rook (slides ortho), General/Ferz (1 diag), Vizier/Wazir (1 ortho)
// White: Rook at b1(1,0), General at d3(3,2), Vizier at h3(7,2)
// Black: King at k10(10,9), 3 pawns as targets
// Win: Capture all Black pawns (allCaptured)
// =============================================================================

const LESSON_2: TutorialLesson = {
  id: 'lesson-2',
  title: 'Rooks of the Empire',
  subtitle: 'Rook, General & Vizier',
  objective: 'Use your Rook, General, and Vizier to capture all 3 Black pawns.',
  hints: [
    'The Rook slides any number of squares orthogonally — same as in standard chess.',
    'The General (crowned pawn) moves exactly 1 square diagonally.',
    'The Vizier moves exactly 1 square orthogonally — up, down, left, or right.',
    'The Rook can reach the pawn on its own file in one move.',
  ],
  // wR at b1(1,0); wG at d3(3,2); wV at h3(7,2)
  // targets: bpg at b7(1,6); bpv at e4(4,3); bpn at h4(7,3); bK at k10(10,9)
  tfen: '10bK/11/11/1bpg9/11/11/4bpv2bpn3/3wG3wV3/11/1wR9|-,- w Kk 0:0 1',
  winCondition: { kind: 'allCaptured' },
  blackBehavior: 'skip',
  congratsMessage: 'Excellent! You command the short-range officers — and the mighty Rook.',
}

// =============================================================================
// Lesson 3 — The Cavalry
// Teaches: Knight (1×2 leap), Camel (1×3 leap), Elephant (2-diag leap)
// White: Knight at b1(1,0), Camel at f1(5,0), Elephant at i1(8,0)
// Black: King at k10(10,9), 3 pawns as targets
// Win: Capture all Black pawns (allCaptured)
// =============================================================================

const LESSON_3: TutorialLesson = {
  id: 'lesson-3',
  title: 'The Cavalry',
  subtitle: 'Knight, Camel & Elephant',
  objective: "Capture all 3 Black pawns using Tamerlane's leaping cavalry.",
  hints: [
    'Leaping pieces jump directly to their destination — nothing blocks them.',
    "The Knight leaps in a standard (1,2) L-shape, just like in modern chess.",
    'The Camel leaps in a longer (1,3) L-shape — like a stretched Knight.',
    'The Elephant leaps exactly 2 squares diagonally, skipping the middle square.',
  ],
  // wN at b1(1,0); wC at f1(5,0); wE at i1(8,0)
  // targets: bpk at d2(3,1) — Knight capture; bpt at e4(4,3) — Camel capture; bpv at g3(6,2) — Elephant capture
  tfen: '10bK/11/11/11/11/11/4bpt6/6bpv4/3bpk7/1wN3wC2wE2|-,- w Kk 0:0 1',
  winCondition: { kind: 'allCaptured' },
  blackBehavior: 'skip',
  congratsMessage: 'Superb! The cavalry of Tamerlane can leap over any obstacle.',
}

// =============================================================================
// Lesson 4 — Eyes of the Giraffe
// Teaches: Giraffe (1-diag + 3+ ortho, not a leap), Picket (diag min 2)
// White: Giraffe at c1(2,0), Picket at i1(8,0)
// Black: King at k10(10,9), 2 pawns as targets
// Win: Capture all Black pawns (allCaptured)
// =============================================================================

const LESSON_4: TutorialLesson = {
  id: 'lesson-4',
  title: 'Eyes of the Giraffe',
  subtitle: 'Giraffe & Picket',
  objective: "Master Tamerlane's rarest pieces — capture both Black pawns.",
  hints: [
    'The Giraffe moves 1 square diagonally, then continues 3 or more squares straight.',
    "Unlike the Knight, the Giraffe is NOT a leaper — its full path must be clear.",
    'The Picket (Tabbiyeh) slides diagonally like a Bishop, but must travel at least 2 squares.',
    'Hint: the Giraffe at c1 can reach d5 via the diagonal step to d2, then straight up.',
  ],
  // wZ at c1(2,0); wT at i1(8,0)
  // targets: bpg at d5(3,4) — Giraffe: c1→d2 diag + 3 up → d5; bpv at g3(6,2) — Picket: i1→g3 (2 diag)
  tfen: '10bK/11/11/11/11/3bpg7/11/6bpv4/11/2wZ5wT2|-,- w Kk 0:0 1',
  winCondition: { kind: 'allCaptured' },
  blackBehavior: 'skip',
  congratsMessage: "Impressive! Few players master the Giraffe quickly — you're ahead of the army.",
}

// =============================================================================
// Lesson 5 — War Engines at the Gates
// Teaches: War Engine (2-ortho leap), pawn capture
// White: War Engine at f1(5,0), White Pawn of War Engines at i2(8,1)
// Black: King at k10(10,9), 3 pawns as targets
// Win: Capture all Black pawns (allCaptured)
// =============================================================================

const LESSON_5: TutorialLesson = {
  id: 'lesson-5',
  title: 'War Engines at the Gates',
  subtitle: 'War Engine & Pawn captures',
  objective: 'Destroy the enemy formation — capture all 3 Black pawns.',
  hints: [
    'The War Engine leaps exactly 2 squares orthogonally — like a Rook that skips.',
    'It can jump over any piece in between — a devastating siege weapon.',
    'Pawns move forward 1 square but capture 1 square diagonally forward.',
    "The War Engine at f1 can leap to h1 or f3 in one move.",
  ],
  // wW at f1(5,0); wpw at i2(8,1)
  // targets: bpg at h1(7,0) — W leap +2 right; bpv at f3(5,2) — W leap +2 up; bpn at j3(9,2) — pawn diagonal
  tfen: '10bK/11/11/11/11/11/11/5bpv3bpn1/8wpw2/5wW1bpg3|-,- w Kk 0:0 1',
  winCondition: { kind: 'allCaptured' },
  blackBehavior: 'skip',
  congratsMessage: 'The siege engines have spoken! You understand every weapon in the arsenal.',
}

// =============================================================================
// Lesson 6 — The Citadel Gambit
// Teaches: Citadel entry (draw), navigating toward opponent's citadel
// White: King at c7(2,6)
// Black: King at k10(10,9)
// Win: White King enters Black citadel at (−1,8) → draw (citadelEntry)
// =============================================================================

const LESSON_6: TutorialLesson = {
  id: 'lesson-6',
  title: 'The Citadel Gambit',
  subtitle: 'Draw by citadel entry',
  objective: "March your King into the Black citadel (the golden square to the left of rank 9) to secure a draw.",
  hints: [
    'The citadel is the special square that protrudes left of the board on rank 9.',
    'When the highest-ranking royal enters the opponent\'s citadel, the game is an instant draw.',
    "Use this rule when you're losing — reaching the citadel saves a lost position!",
    "The Black citadel is 3 King moves away — march diagonally toward the top-left.",
  ],
  // wK at c7(2,6); bK at k10(10,9) — path clear: (2,6)→(1,7)→(0,8)→(-1,8) citadel
  tfen: '10bK/11/11/2wK8/11/11/11/11/11/11|-,- w Kk 0:0 1',
  winCondition: { kind: 'citadelEntry' },
  blackBehavior: 'skip',
  congratsMessage: "A masterful escape! In Tamerlane Chess, the citadel turns defeat into honor.",
}

// =============================================================================
// Lesson 7 — Rise of the Pawn of Pawns
// Teaches: Pawn of Pawns 3-stage mechanic (stage 1: reach back rank)
// White: King at a1(0,0), Pawn of Pawns at f7(5,6)
// Black: King at k10(10,9)
// Win: White PP reaches back rank → Stage 1 (ppStage1)
// =============================================================================

const LESSON_7: TutorialLesson = {
  id: 'lesson-7',
  title: 'Rise of the Pawn of Pawns',
  subtitle: "Tamerlane's most powerful pawn",
  objective: 'Advance the golden Pawn of Pawns (marked ⭐) to the back rank — rank 10.',
  hints: [
    'The Pawn of Pawns (PP) starts as a normal pawn but has three stages of power.',
    'Stage 1: When it first reaches the back rank, it becomes immobile and invincible.',
    "Stage 2 & 3 give it teleportation and transformation — but first, get it to rank 10!",
    'The PP is 3 squares from the back rank — march it forward.',
  ],
  // wK at a1(0,0); wpp at f7(5,6); bK at k10(10,9) — PP marches (5,6)→(5,7)→(5,8)→(5,9)
  tfen: '10bK/11/11/5wpp5/11/11/11/11/11/wK10|-,- w Kk 0:0 1',
  winCondition: { kind: 'ppStage1' },
  blackBehavior: 'skip',
  congratsMessage: "The Pawn of Pawns has arrived! It is now immobile but invincible — Stage 2 awaits.",
}

// =============================================================================
// Lesson 8 — The Ransom of Kings
// Teaches: King swap mechanic (escape check by swapping with a friendly piece)
// White: King at b5(1,4) — IN CHECK from Black Rook; Rook at h5(7,4); Rook at d1(3,0)
// Black: King at j9(9,8), Rook at b10(1,9)
// Win: Checkmate the Black King
// =============================================================================

const LESSON_8: TutorialLesson = {
  id: 'lesson-8',
  title: 'The Ransom of Kings',
  subtitle: 'The King swap — escape & attack',
  objective: 'Your King is in check! Use the King Swap to escape, then checkmate Black.',
  hints: [
    'When your King is in check, you may swap it with ANY friendly piece — once per game.',
    'After the swap, your King teleports to that piece\'s square, and the piece takes the King\'s place.',
    'Swap the King with the Rook on h5 — this escapes check AND threatens the Black Rook.',
    'After capturing the Black Rook, use your two Rooks to checkmate the Black King.',
  ],
  // wK at b5(1,4) in check from bR at b10(1,9); wR at h5(7,4); wR at d1(3,0); bK at j9(9,8)
  // King swap: wK(1,4) ↔ wR(7,4) → wK goes to (7,4) safe, wR goes to (1,4) covering column 1
  tfen: '1bR9/9bK1/11/11/11/1wK5wR3/11/11/11/3wR7|-,- w Kk 0:0 1',
  winCondition: { kind: 'checkmate' },
  blackBehavior: 'randomMove',
  congratsMessage: "Brilliant! You used the King Swap and delivered checkmate. You are ready for the full game!",
}

// =============================================================================
// Export all lessons
// =============================================================================

export const LESSONS: TutorialLesson[] = [
  LESSON_1,
  LESSON_2,
  LESSON_3,
  LESSON_4,
  LESSON_5,
  LESSON_6,
  LESSON_7,
  LESSON_8,
]
