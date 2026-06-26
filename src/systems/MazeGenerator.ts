interface MazeResult {
  walls: Array<{ x: number; y: number; width: number; height: number; orientation: 'vertical' | 'horizontal' }>;
  spawn1: { x: number; y: number };
  spawn2: { x: number; y: number };
}

export function generateMaze(
  cols: number,
  rows: number,
  cellSize: number,
  wallThickness: number,
  removeRatio: number,
  spawnClearRadius: number
): MazeResult {
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const hWalls: boolean[][] = Array.from({ length: rows + 1 }, () => Array(cols).fill(true));
  const vWalls: boolean[][] = Array.from({ length: rows }, () => Array(cols + 1).fill(true));

  function dfs(row: number, col: number) {
    visited[row][col] = true;
    const dirs = shuffleArray([[0, 1], [0, -1], [1, 0], [-1, 0]]);
    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
        if (dr === -1) hWalls[row][col] = false;
        else if (dr === 1) hWalls[row + 1][col] = false;
        else if (dc === -1) vWalls[row][col] = false;
        else if (dc === 1) vWalls[row][col + 1] = false;
        dfs(nr, nc);
      }
    }
  }

  dfs(0, 0);

  const removableH: Array<{ r: number; c: number }> = [];
  const removableV: Array<{ r: number; c: number }> = [];
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (hWalls[r][c]) removableH.push({ r, c });
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      if (vWalls[r][c]) removableV.push({ r, c });
    }
  }

  const allRemovable = [
    ...removableH.map(w => ({ ...w, type: 'h' as const })),
    ...removableV.map(w => ({ ...w, type: 'v' as const })),
  ];
  shuffleArray(allRemovable);
  const removeCount = Math.floor(allRemovable.length * removeRatio);
  for (let i = 0; i < removeCount; i++) {
    const w = allRemovable[i];
    if (w.type === 'h') hWalls[w.r][w.c] = false;
    else vWalls[w.r][w.c] = false;
  }

  const spawn1 = { x: 0.5 * cellSize, y: 0.5 * cellSize };
  const spawn2 = { x: (cols - 0.5) * cellSize, y: (rows - 0.5) * cellSize };

  function clearAroundSpawn(sx: number, sy: number) {
    const sc = Math.floor(sx / cellSize);
    const sr = Math.floor(sy / cellSize);
    for (let dr = -spawnClearRadius; dr <= spawnClearRadius; dr++) {
      for (let dc = -spawnClearRadius; dc <= spawnClearRadius; dc++) {
        const r = sr + dr;
        const c = sc + dc;
        if (r >= 0 && r <= rows) {
          if (c >= 0 && c < cols && hWalls[r]) hWalls[r][c] = false;
        }
        if (r >= 0 && r < rows) {
          if (c >= 0 && c <= cols && vWalls[r]) vWalls[r][c] = false;
        }
      }
    }
  }
  clearAroundSpawn(spawn1.x, spawn1.y);
  clearAroundSpawn(spawn2.x, spawn2.y);

  const walls: MazeResult['walls'] = [];

  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (hWalls[r][c]) {
        walls.push({
          x: c * cellSize,
          y: r * cellSize - wallThickness / 2,
          width: cellSize,
          height: wallThickness,
          orientation: 'horizontal',
        });
      }
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      if (vWalls[r][c]) {
        walls.push({
          x: c * cellSize - wallThickness / 2,
          y: r * cellSize,
          width: wallThickness,
          height: cellSize,
          orientation: 'vertical',
        });
      }
    }
  }

  // Border walls
  walls.push({ x: 0, y: -wallThickness, width: cols * cellSize, height: wallThickness, orientation: 'horizontal' });
  walls.push({ x: 0, y: rows * cellSize, width: cols * cellSize, height: wallThickness, orientation: 'horizontal' });
  walls.push({ x: -wallThickness, y: 0, width: wallThickness, height: rows * cellSize, orientation: 'vertical' });
  walls.push({ x: cols * cellSize, y: 0, width: wallThickness, height: rows * cellSize, orientation: 'vertical' });

  return { walls, spawn1, spawn2 };
}

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
