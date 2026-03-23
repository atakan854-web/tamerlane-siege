// King-swap interaction is fully handled inline in GameBoard.tsx.
// When a King is selected and king-swap moves exist, their target squares are
// highlighted in blue (legalKingSwap highlight bucket in Board.tsx).
// Clicking a highlighted square executes the swap move directly — no modal needed.
// This file is intentionally minimal — kept for future extraction if needed.
