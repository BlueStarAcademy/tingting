export const TILE_EMOJIS = ['🏔️', '🌊', '🏯', '🍜', '🚂'] as const;

export const MATCH_ROWS = 6;
export const MATCH_COLS = 6;

function randomTile(tileTypeCount: number = TILE_EMOJIS.length): number {
  return Math.floor(Math.random() * tileTypeCount);
}

export function createMatchGrid(
  rows: number = MATCH_ROWS,
  cols: number = MATCH_COLS,
  tileTypeCount: number = TILE_EMOJIS.length,
): number[] {
  let grid: number[];
  do {
    grid = Array.from({ length: rows * cols }, () => randomTile(tileTypeCount));
  } while (findMatchCells(grid, rows, cols).size > 0);
  return grid;
}

export function findMatchCells(grid: number[], rows: number, cols: number): Set<number> {
  const matches = new Set<number>();

  for (let r = 0; r < rows; r++) {
    let runStart = 0;
    for (let c = 1; c <= cols; c++) {
      const prev = grid[r * cols + c - 1];
      const curr = c < cols ? grid[r * cols + c] : -1;
      if (c < cols && curr === prev && prev >= 0) continue;
      const runLen = c - runStart;
      if (runLen >= 3 && prev >= 0) {
        for (let k = runStart; k < c; k++) matches.add(r * cols + k);
      }
      runStart = c;
    }
  }

  for (let c = 0; c < cols; c++) {
    let runStart = 0;
    for (let r = 1; r <= rows; r++) {
      const prev = grid[(r - 1) * cols + c];
      const curr = r < rows ? grid[r * cols + c] : -1;
      if (r < rows && curr === prev && prev >= 0) continue;
      const runLen = r - runStart;
      if (runLen >= 3 && prev >= 0) {
        for (let k = runStart; k < r; k++) matches.add(k * cols + c);
      }
      runStart = r;
    }
  }

  return matches;
}

export function swapCells(grid: number[], a: number, b: number): number[] {
  const next = [...grid];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

export function areAdjacent(a: number, b: number, cols: number): boolean {
  const r1 = Math.floor(a / cols);
  const c1 = a % cols;
  const r2 = Math.floor(b / cols);
  const c2 = b % cols;
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

export function removeMatches(grid: number[], matches: Set<number>): number[] {
  return grid.map((value, index) => (matches.has(index) ? -1 : value));
}

export function applyGravity(
  grid: number[],
  rows: number,
  cols: number,
  tileTypeCount: number = TILE_EMOJIS.length,
): number[] {
  const next = [...grid];
  for (let c = 0; c < cols; c++) {
    const column: number[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      const value = next[r * cols + c];
      if (value >= 0) column.push(value);
    }
    for (let r = rows - 1; r >= 0; r--) {
      const fromBottom = rows - 1 - r;
      next[r * cols + c] = fromBottom < column.length ? column[fromBottom] : randomTile(tileTypeCount);
    }
  }
  return next;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
