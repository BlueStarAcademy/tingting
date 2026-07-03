export const SLIME_BOARD_SIZE = 7;

export const SLIME_EMPTY = 0;
export const SLIME_PLAYER = 1;
export const SLIME_AI = 2;

export type SlimeStone = typeof SLIME_EMPTY | typeof SLIME_PLAYER | typeof SLIME_AI;

export const SLIME_AI_WIN_TARGET = 5;

export function createSlimeBoard(): SlimeStone[] {
  return Array(SLIME_BOARD_SIZE * SLIME_BOARD_SIZE).fill(SLIME_EMPTY);
}

export function slimeIndex(x: number, y: number): number {
  return y * SLIME_BOARD_SIZE + x;
}

export function slimeCoord(index: number): { x: number; y: number } {
  return { x: index % SLIME_BOARD_SIZE, y: Math.floor(index / SLIME_BOARD_SIZE) };
}

function adjacentIndices(index: number): number[] {
  const { x, y } = slimeCoord(index);
  const neighbors: number[] = [];
  if (x > 0) neighbors.push(index - 1);
  if (x < SLIME_BOARD_SIZE - 1) neighbors.push(index + 1);
  if (y > 0) neighbors.push(index - SLIME_BOARD_SIZE);
  if (y < SLIME_BOARD_SIZE - 1) neighbors.push(index + SLIME_BOARD_SIZE);
  return neighbors;
}

export function collectGroup(board: SlimeStone[], start: number): number[] {
  const color = board[start];
  if (color === SLIME_EMPTY) return [];

  const group: number[] = [];
  const stack = [start];
  const visited = new Set<number>();

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current) || board[current] !== color) continue;
    visited.add(current);
    group.push(current);
    for (const neighbor of adjacentIndices(current)) {
      if (!visited.has(neighbor) && board[neighbor] === color) stack.push(neighbor);
    }
  }

  return group;
}

export function countLiberties(board: SlimeStone[], group: number[]): number {
  const liberties = new Set<number>();
  for (const index of group) {
    for (const neighbor of adjacentIndices(index)) {
      if (board[neighbor] === SLIME_EMPTY) liberties.add(neighbor);
    }
  }
  return liberties.size;
}

function removeStones(board: SlimeStone[], indices: number[]): SlimeStone[] {
  const next = [...board];
  for (const index of indices) next[index] = SLIME_EMPTY;
  return next;
}

function captureOpponentGroups(board: SlimeStone[], color: SlimeStone): { board: SlimeStone[]; count: number } {
  const opponent = color === SLIME_PLAYER ? SLIME_AI : SLIME_PLAYER;
  let next = [...board];
  let captured = 0;
  const checked = new Set<number>();

  for (let i = 0; i < next.length; i++) {
    if (next[i] !== opponent || checked.has(i)) continue;
    const group = collectGroup(next, i);
    for (const cell of group) checked.add(cell);
    if (countLiberties(next, group) === 0) {
      captured += group.length;
      next = removeStones(next, group);
    }
  }

  return { board: next, count: captured };
}

export function tryPlaceStone(
  board: SlimeStone[],
  index: number,
  color: SlimeStone,
): { valid: true; board: SlimeStone[]; captured: number } | { valid: false } {
  if (index < 0 || index >= board.length || board[index] !== SLIME_EMPTY) {
    return { valid: false };
  }

  let next = [...board];
  next[index] = color;
  const { board: afterCapture, count } = captureOpponentGroups(next, color);
  next = afterCapture;

  const ownGroup = collectGroup(next, index);
  if (countLiberties(next, ownGroup) === 0 && count === 0) {
    return { valid: false };
  }

  return { valid: true, board: next, captured: count };
}

export function getValidMoves(board: SlimeStone[], color: SlimeStone): number[] {
  const moves: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (tryPlaceStone(board, i, color).valid) moves.push(i);
  }
  return moves;
}

export function pickAiMove(board: SlimeStone[], stage: number): number | null {
  const moves = getValidMoves(board, SLIME_AI);
  if (moves.length === 0) return null;

  const center = slimeIndex(3, 3);
  let bestScore = -Infinity;
  let candidates: number[] = [];

  for (const move of moves) {
    const result = tryPlaceStone(board, move, SLIME_AI);
    if (!result.valid) continue;

    let score = result.captured * 120;
    const { x, y } = slimeCoord(move);

    for (const neighbor of adjacentIndices(move)) {
      if (board[neighbor] === SLIME_PLAYER) {
        const group = collectGroup(board, neighbor);
        const liberties = countLiberties(board, group);
        if (liberties === 1) score += 40;
        else if (liberties === 2) score += 18;
      }
    }

    score += (3 - Math.abs(x - 3) + (3 - Math.abs(y - 3))) * 4;
    if (move === center) score += 6;
    score += Math.min(stage, 8) * 1.5;
    score += Math.random() * 8;

    if (score > bestScore) {
      bestScore = score;
      candidates = [move];
    } else if (Math.abs(score - bestScore) < 0.01) {
      candidates.push(move);
    }
  }

  return candidates[Math.floor(Math.random() * candidates.length)] ?? moves[0] ?? null;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
