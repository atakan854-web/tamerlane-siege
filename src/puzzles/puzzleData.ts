// =============================================================================
// TAMERLANE SIEGE — Daily Puzzle Data
// src/puzzles/puzzleData.ts
//
// 30 hand-crafted puzzles covering all major Tamerlane piece themes.
// Each puzzle has a valid TFEN, algebraic solution moves, and metadata.
//
// Solution format: solutionMoves[] alternates White (even) and Black (odd).
// User plays White moves; Black responses are auto-applied.
// =============================================================================

export interface PuzzleData {
  id:             string
  title:          string
  description:    string
  difficulty:     'easy' | 'medium' | 'hard'
  theme:          string
  tfen:           string
  solutionMoves:  string[]   // algebraic notation, alternating W/B
  hintText:       string
}

// =============================================================================
// 30 Puzzles
// =============================================================================

export const PUZZLES: PuzzleData[] = [
  // ──────────────────────── EASY (1–10) ────────────────────────

  // 1. Rook checkmate — back rank
  {
    id: 'p01',
    title: 'Back Rank Rook',
    description: 'Deliver checkmate with your Rook.',
    difficulty: 'easy',
    theme: 'rook',
    tfen: '10bK/11/11/11/11/11/11/11/11/wK5wR4|-,- w Kk 0:0 1',
    solutionMoves: ['Rk10#'],
    hintText: 'The Black King is stuck on the back rank.',
  },

  // 2. General + King mate
  {
    id: 'p02',
    title: 'General Mate',
    description: 'Use your General to deliver checkmate.',
    difficulty: 'easy',
    theme: 'general',
    tfen: '11/11/11/11/11/11/11/3bK7/3wG7/3wK7|-,- w Kk 0:0 1',
    solutionMoves: ['Gd3#'],
    hintText: 'The General attacks diagonally. Trap the King.',
  },

  // 3. Knight fork — win material
  {
    id: 'p03',
    title: 'Knight Fork',
    description: 'Fork the King and Rook with your Knight.',
    difficulty: 'easy',
    theme: 'knight',
    tfen: '3bR6bK/11/11/11/11/11/11/11/4wN6/wK10|-,- w Kk 0:0 1',
    solutionMoves: ['Nf3', 'Kk9', 'Nxd10'],
    hintText: 'Where can the Knight attack two pieces at once?',
  },

  // 4. War Engine smash
  {
    id: 'p04',
    title: 'War Engine Smash',
    description: 'Use the War Engine leap to capture.',
    difficulty: 'easy',
    theme: 'war_engine',
    tfen: '10bK/11/11/11/11/11/6bR4/11/6wW4/wK10|-,- w Kk 0:0 1',
    solutionMoves: ['Wxg4'],
    hintText: 'War Engines leap exactly 2 squares orthogonally.',
  },

  // 5. Elephant jump
  {
    id: 'p05',
    title: 'Elephant Leap',
    description: 'Use the Elephant to capture a guarded piece.',
    difficulty: 'easy',
    theme: 'elephant',
    tfen: '10bK/11/11/11/11/5bV5/11/3wE7/11/wK10|-,- w Kk 0:0 1',
    solutionMoves: ['Exf5'],
    hintText: 'Elephants leap exactly 2 squares diagonally.',
  },

  // 6. Vizier trap
  {
    id: 'p06',
    title: 'Vizier Assist',
    description: 'Use the Vizier to support checkmate.',
    difficulty: 'easy',
    theme: 'vizier',
    tfen: '11/11/11/11/11/11/11/1bK9/1wV9/1wK9|-,- w Kk 0:0 1',
    solutionMoves: ['Vb3#'],
    hintText: 'The Vizier moves one square orthogonally.',
  },

  // 7. Pawn promotion
  {
    id: 'p07',
    title: 'Pawn Promotion',
    description: 'Push your pawn to promote.',
    difficulty: 'easy',
    theme: 'pawn',
    tfen: '10bK/11/11/11/11/11/11/11/1wpr9/wK10|-,- w Kk 0:0 1',
    solutionMoves: ['b3', 'Ka10', 'b4'],
    hintText: 'Advance your pawn toward the back rank.',
  },

  // 8. Two Rooks mate
  {
    id: 'p08',
    title: 'Rook Ladder',
    description: 'Use two Rooks to deliver checkmate.',
    difficulty: 'easy',
    theme: 'rook',
    tfen: '11/11/11/11/5bK5/11/11/11/wR10/wK4wR6|-,- w Kk 0:0 1',
    solutionMoves: ['Ra6+', 'Ke4', 'Rf4#'],
    hintText: 'Cut off the King rank by rank.',
  },

  // 9. Camel capture
  {
    id: 'p09',
    title: 'Camel Strike',
    description: 'Use the Camel (1,3) leap to win material.',
    difficulty: 'easy',
    theme: 'camel',
    tfen: '10bK/11/11/11/11/4bR6/11/11/3wC7/wK10|-,- w Kk 0:0 1',
    solutionMoves: ['Cxe5'],
    hintText: 'The Camel leaps (1,3) — like a stretched Knight.',
  },

  // 10. Picket pin
  {
    id: 'p10',
    title: 'Picket Skewer',
    description: 'Use the Picket diagonal slide to skewer.',
    difficulty: 'easy',
    theme: 'picket',
    tfen: '10bK/11/11/7bR3/11/11/11/11/4wT6/wK10|-,- w Kk 0:0 1',
    solutionMoves: ['Ti4', 'Kk9', 'Txh7'],
    hintText: 'The Picket slides diagonally (min 2 squares). Skewer the King and Rook.',
  },

  // ──────────────────────── MEDIUM (11–22) ────────────────────────

  // 11. Giraffe fork
  {
    id: 'p11',
    title: 'Giraffe Fork',
    description: 'Fork with the Giraffe — 1 diagonal + 3 orthogonal.',
    difficulty: 'medium',
    theme: 'giraffe',
    tfen: '10bK/11/5bR5/11/11/11/11/11/2wZ8/wK10|-,- w Kk 0:0 1',
    solutionMoves: ['Zd4', 'Kk9', 'Zxf8'],
    hintText: 'The Giraffe moves 1 diagonal + 3 straight. Find the fork square.',
  },

  // 12. Giraffe discovery
  {
    id: 'p12',
    title: 'Giraffe Discovery',
    description: 'Move your Giraffe to discover a Rook check.',
    difficulty: 'medium',
    theme: 'giraffe',
    tfen: '5bK5/11/11/11/11/11/5bpk5/5wZ5/11/wR6wK3|-,- w Kk 0:0 1',
    solutionMoves: ['Zf7', 'Ke9', 'Zxf4'],
    hintText: 'Move the Giraffe off the f-file to reveal a Rook attack.',
  },

  // 13. Giraffe + Rook coordination
  {
    id: 'p13',
    title: 'Giraffe Mate',
    description: 'Use the Giraffe to deliver the final blow.',
    difficulty: 'medium',
    theme: 'giraffe',
    tfen: '11/11/11/11/11/11/1bK9/11/1wR9/wK3wZ6|-,- w Kk 0:0 1',
    solutionMoves: ['Zd4', 'Ka4', 'Rb4#'],
    hintText: 'The Giraffe can cut off escape squares diagonally.',
  },

  // 14. Camel fork — King + General
  {
    id: 'p14',
    title: 'Camel Double Attack',
    description: 'Fork two pieces with the Camel leap.',
    difficulty: 'medium',
    theme: 'camel',
    tfen: '10bK/11/11/6bG4/11/11/11/11/3wC7/wK10|-,- w Kk 0:0 1',
    solutionMoves: ['Ce5', 'Kk9', 'Cxg7'],
    hintText: 'The Camel (1,3) can attack two pieces at different ranges.',
  },

  // 15. Camel + Rook mate
  {
    id: 'p15',
    title: 'Camel & Rook Mate',
    description: 'Combine Camel and Rook to checkmate.',
    difficulty: 'medium',
    theme: 'camel',
    tfen: '11/11/11/11/11/11/11/1bK9/3wC7/1wR5wK3|-,- w Kk 0:0 1',
    solutionMoves: ['Ca3', 'Ka2', 'Rb1#'],
    hintText: 'Use the Camel to control key escape squares.',
  },

  // 16. PP Stage 1 — reach back rank
  {
    id: 'p16',
    title: 'Pawn of Pawns Stage 1',
    description: 'Get your Pawn of Pawns to the back rank.',
    difficulty: 'medium',
    theme: 'pp_stage',
    tfen: '10bK/11/11/11/11/11/11/5wpp5/11/wK10|-,- w Kk 0:0 1',
    solutionMoves: ['f4', 'Ka10', 'f5', 'Kb10', 'f6', 'Ka10', 'f7', 'Kb10', 'f8', 'Ka10', 'f9', 'Kb10', 'f10†'],
    hintText: 'Just keep pushing! The PP needs to reach rank 10.',
  },

  // 17. PP Stage 1 — with obstacles
  {
    id: 'p17',
    title: 'PP Breakthrough',
    description: 'Clear the path and promote your PP.',
    difficulty: 'medium',
    theme: 'pp_stage',
    tfen: '10bK/11/11/11/5bpk5/11/5wpp5/11/11/wK10|-,- w Kk 0:0 1',
    solutionMoves: ['f5', 'Ka10', 'fxg6', 'Kb10', 'g7', 'Ka10', 'g8', 'Kb10', 'g9', 'Ka10', 'g10†'],
    hintText: 'Capture the blocking pawn and keep advancing.',
  },

  // 18. King swap tactic
  {
    id: 'p18',
    title: 'King Swap Escape',
    description: 'Use King swap to escape a dangerous position.',
    difficulty: 'medium',
    theme: 'king_swap',
    tfen: '11/11/11/11/11/11/11/bR1wK8/11/6wR4|-,- w Kk 0:0 1',
    solutionMoves: ['K↔Rg1', 'Ra1', 'Rc1'],
    hintText: 'Swap the King with your Rook to safety.',
  },

  // 19. King swap for mate
  {
    id: 'p19',
    title: 'Swap & Mate',
    description: 'Use King swap to set up checkmate.',
    difficulty: 'medium',
    theme: 'king_swap',
    tfen: '11/11/11/11/11/11/11/10bK/wR10/5wK2wR2|-,- w Kk 0:0 1',
    solutionMoves: ['K↔Ri1', 'Kk3', 'Ra3#'],
    hintText: 'Swap with the Rook to activate both Rooks.',
  },

  // 20. Citadel entry
  {
    id: 'p20',
    title: 'Citadel Rush',
    description: 'Enter the enemy citadel for a draw.',
    difficulty: 'medium',
    theme: 'citadel',
    tfen: '10bK/11/11/2wK8/11/11/11/11/11/11|-,- w Kk 0:0 1',
    solutionMoves: ['Kb8', 'Ka10', 'Ka9', 'Kb10', 'K→Cit'],
    hintText: 'March the King to file a, rank 8, then enter the Black citadel.',
  },

  // 21. Picket + Rook battery
  {
    id: 'p21',
    title: 'Picket Battery',
    description: 'Line up Picket and Rook on the same diagonal for a double threat.',
    difficulty: 'medium',
    theme: 'picket',
    tfen: '10bK/11/11/11/11/6bG4/11/11/4wT6/wK3wR6|-,- w Kk 0:0 1',
    solutionMoves: ['Tg4', 'Kk9', 'Txg5'],
    hintText: 'The Picket slides diagonally (min 2). Attack the General.',
  },

  // 22. Picket long-range snipe
  {
    id: 'p22',
    title: 'Picket Snipe',
    description: 'Use the Picket to capture from a distance.',
    difficulty: 'medium',
    theme: 'picket',
    tfen: '10bK/11/11/8bV2/11/11/11/11/3wT7/wK10|-,- w Kk 0:0 1',
    solutionMoves: ['Txi7'],
    hintText: 'Count the diagonal: the Picket must move at least 2 squares.',
  },

  // ──────────────────────── HARD (23–30) ────────────────────────

  // 23. Giraffe mate in 2
  {
    id: 'p23',
    title: 'Giraffe Mate in 2',
    description: 'Deliver checkmate in 2 moves using the Giraffe.',
    difficulty: 'hard',
    theme: 'giraffe',
    tfen: '11/11/11/11/11/11/11/bpk1bK9/11/wR3wZ3wK2|-,- w Kk 0:0 1',
    solutionMoves: ['Ze4', 'Ka2', 'Ra1#'],
    hintText: 'The Giraffe can cut off escape. Think about where the King will flee.',
  },

  // 24. Camel fork + mate
  {
    id: 'p24',
    title: 'Camel Fork to Mate',
    description: 'Fork, then convert to checkmate.',
    difficulty: 'hard',
    theme: 'camel',
    tfen: '11/11/11/11/11/11/11/bK1bR8/11/wK2wC3wR3|-,- w Kk 0:0 1',
    solutionMoves: ['Cb3+', 'Ka2', 'Ri2#'],
    hintText: 'The Camel check forces the King — then close the net.',
  },

  // 25. Giraffe + Knight combo
  {
    id: 'p25',
    title: 'Giraffe-Knight Duo',
    description: 'Combine Giraffe and Knight for mate.',
    difficulty: 'hard',
    theme: 'giraffe',
    tfen: '11/11/11/11/11/11/bK10/11/2wN8/wK5wZ4|-,- w Kk 0:0 1',
    solutionMoves: ['Na4', 'Kb3', 'Zb5#'],
    hintText: 'The Knight cuts off squares; the Giraffe delivers.',
  },

  // 26. Sacrifice then mate
  {
    id: 'p26',
    title: 'Rook Sacrifice',
    description: 'Sacrifice a Rook, then checkmate.',
    difficulty: 'hard',
    theme: 'rook',
    tfen: '11/11/11/11/11/11/11/bK1bpk8/wR10/wK4wR6|-,- w Kk 0:0 1',
    solutionMoves: ['Ra2+', 'Kxa2', 'Rf2#'],
    hintText: 'Sometimes giving up material opens the decisive line.',
  },

  // 27. Citadel race
  {
    id: 'p27',
    title: 'Citadel Race',
    description: 'Reach the citadel before Black can stop you.',
    difficulty: 'hard',
    theme: 'citadel',
    tfen: '10bK/11/11/11/11/1wK9/11/11/11/11|-,- w Kk 0:0 1',
    solutionMoves: ['Ka6', 'Kk9', 'Ka7', 'Kk10', 'Ka8', 'Kj10', 'K→Cit'],
    hintText: 'Move the King diagonally toward the Black citadel.',
  },

  // 28. Double Giraffe attack
  {
    id: 'p28',
    title: 'Double Giraffe',
    description: 'Use two Giraffes to create an unstoppable attack.',
    difficulty: 'hard',
    theme: 'giraffe',
    tfen: '11/11/11/11/11/11/1bK9/11/11/wK1wZ2wZ5|-,- w Kk 0:0 1',
    solutionMoves: ['Zd4', 'Ka3', 'Zb5#'],
    hintText: 'One Giraffe blocks, the other delivers.',
  },

  // 29. Camel + Picket coordination
  {
    id: 'p29',
    title: 'Camel-Picket Combo',
    description: 'Combine Camel and Picket for a winning attack.',
    difficulty: 'hard',
    theme: 'camel',
    tfen: '11/11/11/11/11/11/bK10/11/3wC7/wK3wT6|-,- w Kk 0:0 1',
    solutionMoves: ['Cb3', 'Ka3', 'Ta3#'],
    hintText: 'The Camel restricts; the Picket finishes.',
  },

  // 30. King swap + sacrifice mate
  {
    id: 'p30',
    title: 'Swap Sacrifice Mate',
    description: 'Swap your King, sacrifice, and checkmate.',
    difficulty: 'hard',
    theme: 'king_swap',
    tfen: '11/11/11/11/11/11/11/1bK9/11/1wR3wK2wR2|-,- w Kk 0:0 1',
    solutionMoves: ['K↔Rb1', 'Ka2', 'Ri2#'],
    hintText: 'Swap to activate your pieces, then close the net.',
  },
]
