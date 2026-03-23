# Tamerlane Siege

Play Timur (Tamerlane) Chess online — the medieval chess variant with 112 squares, citadels, and multiple kings.

## Play

Visit **tamerlanesiege.com** or install as a PWA on any device.

## Features

- **Play vs AI** — 10 difficulty levels (depth 1–5 alpha-beta minimax)
- **Play vs Human** — Local hotseat mode, two players one device
- **Full Timur Chess rules** — All 22 piece types, citadels, King swap, Pawn of Pawns 3-stage promotion, stalemate = win
- **Works everywhere** — Chrome, Safari, iOS, Android as an installable PWA with offline support
- **Move notation** — Algebraic notation move list updates in real time

## Timur Chess

A medieval chess variant from Central Asia (14th century), attributed to the conqueror Timur (Tamerlane). Played on a 10×11 board with 2 citadel squares and 28 pieces per side including Giraffes, Camels, War Engines, and the legendary **Pawn of Pawns** with its three-stage promotion system.

### Key Rules

| Rule | Detail |
|------|--------|
| Board | 10 files × 11 ranks + 2 citadel squares (112 total) |
| Pieces per side | 28 |
| Stalemate | **Win** for the stalemating side (opposite of FIDE chess) |
| Citadel entry | Instant draw — only the highest-ranking royal may enter the opponent's citadel |
| King swap | Once per game, when in check — swap King with any friendly piece |
| Pawn of Pawns | Stage 1: reaches back rank → immobile & invincible, can teleport. Stage 2: second arrival → relocates. Stage 3: third arrival → becomes Adventitious King |
| Multiple royals | King + Prince + Adventitious King can all coexist; check only matters when the last royal is threatened |

## Development

```bash
git clone https://github.com/your-username/tamerlane-siege
cd tamerlane-siege
npm install
npm run dev       # start dev server
npm run test      # run 523 engine tests
npm run build     # production build
npm run preview   # preview production build
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5 (strict mode) |
| UI | React 19 |
| Build | Vite 6 |
| Styling | Tailwind CSS v4 |
| AI | Custom alpha-beta minimax (main thread, no Worker) |
| PWA | vite-plugin-pwa + Workbox |
| Testing | Vitest (523 engine tests) |
| Deploy | Cloudflare Pages |

## Project Structure

```
src/
  core/       Pure TypeScript game engine (no dependencies)
    types.ts        All types and enums
    board.ts        Board geometry, square helpers
    constants.ts    Starting position, piece values
    moves.ts        Move generation for all 22 piece types
    pawns.ts        Pawn move generation + promotion
    pawnOfPawns.ts  3-stage PP logic
    rules.ts        Check, checkmate, stalemate, legal moves
    game.ts         makeMove, undoMove, createNewGame
    kingSwap.ts     King swap move generation
    citadel.ts      Citadel entry detection
    notation.ts     Algebraic notation + TFEN serialization
    validate.ts     Input validation helpers
  ai/
    eval.ts         Static position evaluation
    search.ts       Iterative deepening alpha-beta
    difficulty.ts   Level 1-10 parameter table
    moveOrder.ts    MVV-LVA move ordering
    transposition.ts Transposition table
  ui/
    components/     React board, pieces, modals
    hooks/          useAI hook (future: Web Worker)
tests/
  core/       523 unit tests (all pass)
public/
  pieces/default/   30 SVG piece images (w/b × all types)
```

## License

MIT — free to use, modify, and distribute.
