export const TILE_EMOJIS = ['🏔️', '🌊', '🏯', '🍜', '🚂'] as const;

export const MATCH_ROWS = 6;
export const MATCH_COLS = 6;

export const TILE_EMPTY = -1;
export const SPECIAL_LINE_H = 50;
export const SPECIAL_LINE_V = 51;
export const SPECIAL_BOMB = 52;
export const SPECIAL_COLOR_CLEAR = 53;

/** Obstacle types: bricks that need adjacent clears to break */
export const OBSTACLE_BRICK = 'brick';
export type ObstacleType = typeof OBSTACLE_BRICK;
export interface ObstacleCell {
  type: ObstacleType;
  health: number;
}

export function createObstacles(
  rows: number,
  cols: number,
  stage: number,
): Map<number, ObstacleCell> {
  const obstacles = new Map<number, ObstacleCell>();
  if (stage < 3) return obstacles;

  const brickCount = Math.min(Math.floor((stage - 2) * 1.5), 8);
  const candidates: number[] = [];
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      candidates.push(r * cols + c);
    }
  }

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const placed = candidates.slice(0, brickCount);
  for (const idx of placed) {
    const health = stage >= 6 ? 2 : 1;
    obstacles.set(idx, { type: OBSTACLE_BRICK, health });
  }
  return obstacles;
}

export function getAdjacentIndices(index: number, rows: number, cols: number): number[] {
  const r = Math.floor(index / cols);
  const c = index % cols;
  const adj: number[] = [];
  if (r > 0) adj.push((r - 1) * cols + c);
  if (r < rows - 1) adj.push((r + 1) * cols + c);
  if (c > 0) adj.push(r * cols + (c - 1));
  if (c < cols - 1) adj.push(r * cols + (c + 1));
  return adj;
}

export function damageObstacles(
  obstacles: Map<number, ObstacleCell>,
  clearedCells: Set<number>,
  rows: number,
  cols: number,
): { updated: Map<number, ObstacleCell>; broken: Set<number> } {
  const updated = new Map(obstacles);
  const broken = new Set<number>();

  for (const cleared of clearedCells) {
    for (const adj of getAdjacentIndices(cleared, rows, cols)) {
      const obs = updated.get(adj);
      if (!obs) continue;
      const newHealth = obs.health - 1;
      if (newHealth <= 0) {
        updated.delete(adj);
        broken.add(adj);
      } else {
        updated.set(adj, { ...obs, health: newHealth });
      }
    }
  }

  return { updated, broken };
}

export interface MatchRun {
  cells: number[];
  orientation: 'horizontal' | 'vertical';
  length: number;
  tileType: number;
}

export interface MatchResolution {
  cleared: Set<number>;
  specialsToSpawn: Map<number, number>;
  matchedTileCount: number;
}

export interface FallMove {
  index: number;
  fromRow: number;
  toRow: number;
  tile: number;
  isNew: boolean;
}

function randomTile(tileTypeCount: number = TILE_EMOJIS.length): number {
  return Math.floor(Math.random() * tileTypeCount);
}

export function isSpecial(tile: number): boolean {
  return (
    tile === SPECIAL_LINE_H ||
    tile === SPECIAL_LINE_V ||
    tile === SPECIAL_BOMB ||
    tile === SPECIAL_COLOR_CLEAR
  );
}

export function isLineSpecial(tile: number): boolean {
  return tile === SPECIAL_LINE_H || tile === SPECIAL_LINE_V;
}

export function getTileEmoji(tile: number): string {
  if (tile === SPECIAL_LINE_H) return '↔️';
  if (tile === SPECIAL_LINE_V) return '↕️';
  if (tile === SPECIAL_BOMB) return '💣';
  if (tile === SPECIAL_COLOR_CLEAR) return '🎯';
  if (tile < 0) return '';
  return TILE_EMOJIS[tile] ?? '·';
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

export function findMatchRuns(
  grid: number[],
  rows: number,
  cols: number,
): MatchRun[] {
  const runs: MatchRun[] = [];

  for (let r = 0; r < rows; r++) {
    let runStart = 0;
    for (let c = 1; c <= cols; c++) {
      const prev = grid[r * cols + c - 1];
      const curr = c < cols ? grid[r * cols + c] : -1;
      const prevMatchable = prev >= 0 && !isSpecial(prev);
      const currMatchable = c < cols && curr >= 0 && !isSpecial(curr);
      if (c < cols && currMatchable && prevMatchable && curr === prev) continue;
      const runLen = c - runStart;
      if (runLen >= 3 && prevMatchable) {
        const cells: number[] = [];
        for (let k = runStart; k < c; k++) cells.push(r * cols + k);
        runs.push({ cells, orientation: 'horizontal', length: runLen, tileType: prev });
      }
      runStart = c;
    }
  }

  for (let c = 0; c < cols; c++) {
    let runStart = 0;
    for (let r = 1; r <= rows; r++) {
      const prev = grid[(r - 1) * cols + c];
      const curr = r < rows ? grid[r * cols + c] : -1;
      const prevMatchable = prev >= 0 && !isSpecial(prev);
      const currMatchable = r < rows && curr >= 0 && !isSpecial(curr);
      if (r < rows && currMatchable && prevMatchable && curr === prev) continue;
      const runLen = r - runStart;
      if (runLen >= 3 && prevMatchable) {
        const cells: number[] = [];
        for (let k = runStart; k < r; k++) cells.push(k * cols + c);
        runs.push({ cells, orientation: 'vertical', length: runLen, tileType: prev });
      }
      runStart = r;
    }
  }

  return runs;
}

export function findMatchCells(grid: number[], rows: number, cols: number): Set<number> {
  const matches = new Set<number>();
  for (const run of findMatchRuns(grid, rows, cols)) {
    for (const cell of run.cells) matches.add(cell);
  }
  return matches;
}

function findCrossCells(runs: MatchRun[]): number[] {
  const hCells = new Set<number>();
  const vCells = new Set<number>();
  for (const run of runs) {
    if (run.length < 3) continue;
    for (const cell of run.cells) {
      if (run.orientation === 'horizontal') hCells.add(cell);
      else vCells.add(cell);
    }
  }
  return [...hCells].filter((cell) => vCells.has(cell));
}

export function buildMatchResolution(
  grid: number[],
  rows: number,
  cols: number,
  options: { allowColorClear?: boolean } = {},
): MatchResolution {
  const runs = findMatchRuns(grid, rows, cols);
  const cleared = new Set<number>();
  const specialsToSpawn = new Map<number, number>();

  for (const run of runs) {
    for (const cell of run.cells) cleared.add(cell);
  }

  for (const run of runs) {
    const center = run.cells[Math.floor(run.cells.length / 2)];
    if (run.length === 5 && options.allowColorClear) {
      specialsToSpawn.set(center, SPECIAL_COLOR_CLEAR);
      continue;
    }
    if (run.length === 4) {
      if (specialsToSpawn.get(center) === SPECIAL_COLOR_CLEAR) continue;
      if (!specialsToSpawn.has(center)) {
        specialsToSpawn.set(
          center,
          run.orientation === 'horizontal' ? SPECIAL_LINE_H : SPECIAL_LINE_V,
        );
      }
    }
  }

  for (const cell of findCrossCells(runs)) {
    if (specialsToSpawn.get(cell) === SPECIAL_COLOR_CLEAR) continue;
    specialsToSpawn.set(cell, SPECIAL_BOMB);
  }

  return { cleared, specialsToSpawn, matchedTileCount: cleared.size };
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

function rowCells(row: number, cols: number): number[] {
  return Array.from({ length: cols }, (_, c) => row * cols + c);
}

function colCells(col: number, rows: number, cols: number): number[] {
  return Array.from({ length: rows }, (_, r) => r * cols + col);
}

function areaCells(
  center: number,
  radius: number,
  rows: number,
  cols: number,
): number[] {
  const cr = Math.floor(center / cols);
  const cc = center % cols;
  const cells: number[] = [];
  for (let r = cr - radius; r <= cr + radius; r++) {
    for (let c = cc - radius; c <= cc + radius; c++) {
      if (r >= 0 && r < rows && c >= 0 && c < cols) cells.push(r * cols + c);
    }
  }
  return cells;
}

function cellsOfTileType(
  grid: number[],
  tileType: number,
  rows: number,
  cols: number,
): Set<number> {
  const cleared = new Set<number>();
  for (let i = 0; i < rows * cols; i++) {
    if (grid[i] === tileType) cleared.add(i);
  }
  return cleared;
}

function activateCrossAt(
  row: number,
  col: number,
  rows: number,
  cols: number,
): Set<number> {
  const cleared = new Set<number>();
  for (const cell of rowCells(row, cols)) cleared.add(cell);
  for (const cell of colCells(col, rows, cols)) cleared.add(cell);
  return cleared;
}

function activateThreeByThreeLines(
  center: number,
  rows: number,
  cols: number,
): Set<number> {
  const cleared = new Set<number>();
  const centerRow = Math.floor(center / cols);
  const centerCol = center % cols;
  for (let dr = -1; dr <= 1; dr++) {
    const row = centerRow + dr;
    if (row >= 0 && row < rows) {
      for (const cell of rowCells(row, cols)) cleared.add(cell);
    }
  }
  for (let dc = -1; dc <= 1; dc++) {
    const col = centerCol + dc;
    if (col >= 0 && col < cols) {
      for (const cell of colCells(col, rows, cols)) cleared.add(cell);
    }
  }
  return cleared;
}

function pickRandomNormalCells(
  grid: number[],
  count: number,
  exclude: Set<number>,
  rows: number,
  cols: number,
): number[] {
  const candidates: number[] = [];
  for (let i = 0; i < rows * cols; i++) {
    if (exclude.has(i)) continue;
    const tile = grid[i];
    if (tile >= 0 && !isSpecial(tile)) candidates.push(i);
  }
  const picked: number[] = [];
  const pool = [...candidates];
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

function activateRandomLineBlast(
  grid: number[],
  count: number,
  exclude: Set<number>,
  rows: number,
  cols: number,
): Set<number> {
  const cleared = new Set<number>();
  for (const index of pickRandomNormalCells(grid, count, exclude, rows, cols)) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    if (Math.random() < 0.5) {
      for (const cell of rowCells(row, cols)) cleared.add(cell);
    } else {
      for (const cell of colCells(col, rows, cols)) cleared.add(cell);
    }
  }
  return cleared;
}

function activateRandomBombBlast(
  grid: number[],
  count: number,
  exclude: Set<number>,
  rows: number,
  cols: number,
): Set<number> {
  const cleared = new Set<number>();
  for (const index of pickRandomNormalCells(grid, count, exclude, rows, cols)) {
    for (const cell of areaCells(index, 1, rows, cols)) cleared.add(cell);
  }
  return cleared;
}

export function activateSingleSpecial(
  grid: number[],
  index: number,
  tile: number,
  rows: number,
  cols: number,
  pairedTile?: number,
): Set<number> {
  const cleared = new Set<number>();
  const row = Math.floor(index / cols);
  const col = index % cols;

  if (tile === SPECIAL_LINE_H) {
    for (const cell of rowCells(row, cols)) cleared.add(cell);
  } else if (tile === SPECIAL_LINE_V) {
    for (const cell of colCells(col, rows, cols)) cleared.add(cell);
  } else if (tile === SPECIAL_BOMB) {
    for (const cell of areaCells(index, 1, rows, cols)) cleared.add(cell);
  } else if (tile === SPECIAL_COLOR_CLEAR && pairedTile !== undefined && pairedTile >= 0) {
    return cellsOfTileType(grid, pairedTile, rows, cols);
  }

  return cleared;
}

export function activateSpecialCombo(
  grid: number[],
  indexA: number,
  tileA: number,
  indexB: number,
  tileB: number,
  rows: number,
  cols: number,
): Set<number> {
  const cleared = new Set<number>();
  const add = (cells: Set<number>) => {
    for (const cell of cells) cleared.add(cell);
  };

  if (tileA === SPECIAL_COLOR_CLEAR && tileB === SPECIAL_COLOR_CLEAR) {
    for (let i = 0; i < rows * cols; i++) cleared.add(i);
    return cleared;
  }

  const exclude = new Set([indexA, indexB]);

  if (
    (tileA === SPECIAL_COLOR_CLEAR && isLineSpecial(tileB)) ||
    (tileB === SPECIAL_COLOR_CLEAR && isLineSpecial(tileA))
  ) {
    add(activateRandomLineBlast(grid, 5, exclude, rows, cols));
    return cleared;
  }

  if (
    (tileA === SPECIAL_COLOR_CLEAR && tileB === SPECIAL_BOMB) ||
    (tileB === SPECIAL_COLOR_CLEAR && tileA === SPECIAL_BOMB)
  ) {
    add(activateRandomBombBlast(grid, 5, exclude, rows, cols));
    return cleared;
  }

  if (tileA === SPECIAL_BOMB && tileB === SPECIAL_BOMB) {
    add(new Set(areaCells(indexA, 2, rows, cols)));
    return cleared;
  }

  if (
    (tileA === SPECIAL_BOMB && isLineSpecial(tileB)) ||
    (tileB === SPECIAL_BOMB && isLineSpecial(tileA))
  ) {
    const bombIndex = tileA === SPECIAL_BOMB ? indexA : indexB;
    add(activateThreeByThreeLines(bombIndex, rows, cols));
    return cleared;
  }

  if (
    (tileA === SPECIAL_LINE_H && tileB === SPECIAL_LINE_V) ||
    (tileA === SPECIAL_LINE_V && tileB === SPECIAL_LINE_H)
  ) {
    const hIndex = tileA === SPECIAL_LINE_H ? indexA : indexB;
    const vIndex = tileA === SPECIAL_LINE_V ? indexA : indexB;
    add(activateCrossAt(Math.floor(hIndex / cols), vIndex % cols, rows, cols));
    return cleared;
  }

  if (tileA === SPECIAL_LINE_H && tileB === SPECIAL_LINE_H) {
    add(activateCrossAt(Math.floor(indexA / cols), indexB % cols, rows, cols));
    return cleared;
  }

  if (tileA === SPECIAL_LINE_V && tileB === SPECIAL_LINE_V) {
    add(activateCrossAt(Math.floor(indexB / cols), indexA % cols, rows, cols));
    return cleared;
  }

  add(activateSingleSpecial(grid, indexA, tileA, rows, cols));
  add(activateSingleSpecial(grid, indexB, tileB, rows, cols));
  return cleared;
}

export function resolveSwapActivation(
  grid: number[],
  indexA: number,
  indexB: number,
  rows: number,
  cols: number,
): Set<number> | null {
  const tileA = grid[indexA];
  const tileB = grid[indexB];
  const specialA = isSpecial(tileA);
  const specialB = isSpecial(tileB);

  if (specialA && specialB) {
    return activateSpecialCombo(grid, indexA, tileA, indexB, tileB, rows, cols);
  }
  if (specialA) {
    const cleared = activateSingleSpecial(grid, indexA, tileA, rows, cols, tileB);
    cleared.add(indexB);
    return cleared;
  }
  if (specialB) {
    const cleared = activateSingleSpecial(grid, indexB, tileB, rows, cols, tileA);
    cleared.add(indexA);
    return cleared;
  }
  return null;
}

export function removeMatches(grid: number[], matches: Set<number>): number[] {
  return grid.map((value, index) => (matches.has(index) ? TILE_EMPTY : value));
}

export function applySpecialSpawns(
  grid: number[],
  specials: Map<number, number>,
): number[] {
  const next = [...grid];
  for (const [index, special] of specials) {
    if (next[index] === TILE_EMPTY) next[index] = special;
  }
  return next;
}

export function computeFallMoves(
  before: number[],
  after: number[],
  rows: number,
  cols: number,
): FallMove[] {
  const moves: FallMove[] = [];

  for (let c = 0; c < cols; c++) {
    const beforeCol: { row: number; tile: number }[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      const tile = before[r * cols + c];
      if (tile !== TILE_EMPTY) beforeCol.push({ row: r, tile });
    }

    const afterCol: { row: number; tile: number }[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      const tile = after[r * cols + c];
      if (tile !== TILE_EMPTY) afterCol.push({ row: r, tile });
    }

    const usedBefore = new Set<number>();
    for (let i = 0; i < afterCol.length; i++) {
      const { row: toRow, tile } = afterCol[i];
      const index = toRow * cols + c;
      const matchIdx = beforeCol.findIndex(
        (entry, bi) => entry.tile === tile && !usedBefore.has(bi),
      );
      if (matchIdx >= 0) {
        usedBefore.add(matchIdx);
        const fromRow = beforeCol[matchIdx].row;
        if (fromRow !== toRow) {
          moves.push({ index, fromRow, toRow, tile, isNew: false });
        }
      } else {
        moves.push({ index, fromRow: -1, toRow, tile, isNew: true });
      }
    }
  }

  return moves;
}

export function applyGravity(
  grid: number[],
  rows: number,
  cols: number,
  tileTypeCount: number = TILE_EMOJIS.length,
): number[] {
  return applyGravityWithMoves(grid, rows, cols, tileTypeCount).grid;
}

export function applyGravityWithMoves(
  grid: number[],
  rows: number,
  cols: number,
  tileTypeCount: number = TILE_EMOJIS.length,
): { grid: number[]; moves: FallMove[] } {
  const next = [...grid];
  const moves: FallMove[] = [];

  for (let c = 0; c < cols; c++) {
    const surviving: { row: number; tile: number }[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      const tile = next[r * cols + c];
      if (tile !== TILE_EMPTY) surviving.push({ row: r, tile });
    }

    let writeRow = rows - 1;
    for (const item of surviving) {
      const index = writeRow * cols + c;
      next[index] = item.tile;
      if (item.row !== writeRow) {
        moves.push({ index, fromRow: item.row, toRow: writeRow, tile: item.tile, isNew: false });
      }
      writeRow--;
    }
    while (writeRow >= 0) {
      const index = writeRow * cols + c;
      const tile = randomTile(tileTypeCount);
      next[index] = tile;
      moves.push({ index, fromRow: -1, toRow: writeRow, tile, isNew: true });
      writeRow--;
    }
  }

  return { grid: next, moves };
}

export function fallAnimationMs(rowDistance: number): number {
  return 200 + rowDistance * 45;
}

export function maxFallAnimationMs(moves: FallMove[]): number {
  let maxRows = 0;
  for (const move of moves) {
    const distance = move.isNew ? move.toRow + 1 : Math.max(0, move.fromRow - move.toRow);
    maxRows = Math.max(maxRows, distance);
  }
  return fallAnimationMs(maxRows);
}

export function scoreForClear(count: number, combo: number): number {
  const base = count * 10;
  const bonus = count >= 5 ? count * 10 : count >= 4 ? count * 5 : 0;
  return (base + bonus) * Math.max(1, combo);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
