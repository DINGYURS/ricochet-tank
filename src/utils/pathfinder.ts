/**
 * BFS pathfinding on a grid.
 * Converts wall data to a grid and finds the shortest path.
 */

export interface GridCell {
  col: number;
  row: number;
}

export interface PathResult {
  /** Waypoints to follow (in world coordinates) */
  waypoints: { x: number; y: number }[];
  /** Whether a path was found */
  found: boolean;
}

/** Grid cell size in pixels. Smaller = more precise but slower. */
const GRID_CELL_SIZE = 20;

/** Convert world coordinates to grid cell */
function worldToGrid(x: number, y: number, cols: number, rows: number): GridCell {
  const col = Math.floor(x / GRID_CELL_SIZE);
  const row = Math.floor(y / GRID_CELL_SIZE);
  return {
    col: Math.max(0, Math.min(col, cols - 1)),
    row: Math.max(0, Math.min(row, rows - 1)),
  };
}

/** Convert grid cell to world coordinates (center of cell) */
function gridToWorld(col: number, row: number): { x: number; y: number } {
  return {
    x: col * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
    y: row * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
  };
}

/**
 * Build a grid marking cells that are blocked by walls.
 * Returns a 2D array where true = blocked.
 */
function buildGrid(
  width: number,
  height: number,
  walls: Array<{ x: number; y: number; width: number; height: number }>,
  margin: number = 0,
): boolean[][] {
  const cols = Math.ceil(width / GRID_CELL_SIZE);
  const rows = Math.ceil(height / GRID_CELL_SIZE);

  // Initialize all cells as passable
  const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

  // Mark cells that intersect with walls as blocked
  for (const wall of walls) {
    const minCol = Math.max(0, Math.floor((wall.x - margin) / GRID_CELL_SIZE));
    const maxCol = Math.min(cols - 1, Math.floor((wall.x + wall.width + margin) / GRID_CELL_SIZE));
    const minRow = Math.max(0, Math.floor((wall.y - margin) / GRID_CELL_SIZE));
    const maxRow = Math.min(rows - 1, Math.floor((wall.y + wall.height + margin) / GRID_CELL_SIZE));

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        grid[row][col] = true;
      }
    }
  }

  return grid;
}

/**
 * BFS pathfinding from start to goal.
 * Returns the shortest path as a list of waypoints.
 */
export function findPath(
  start: { x: number; y: number },
  goal: { x: number; y: number },
  width: number,
  height: number,
  walls: Array<{ x: number; y: number; width: number; height: number }>,
  margin: number = 12,
): PathResult {
  const cols = Math.ceil(width / GRID_CELL_SIZE);
  const rows = Math.ceil(height / GRID_CELL_SIZE);

  const grid = buildGrid(width, height, walls, margin);

  const startCell = worldToGrid(start.x, start.y, cols, rows);
  const goalCell = worldToGrid(goal.x, goal.y, cols, rows);

  // If start or goal is blocked, try to find a nearby passable cell
  const actualStart = findNearestPassable(grid, startCell, cols, rows);
  const actualGoal = findNearestPassable(grid, goalCell, cols, rows);

  if (!actualStart || !actualGoal) {
    return { waypoints: [], found: false };
  }

  // BFS
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const parent: (GridCell | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));

  const queue: GridCell[] = [actualStart];
  visited[actualStart.row][actualStart.col] = true;

  // 4-directional movement (no diagonals to avoid corner-cutting)
  const dirs = [
    { dc: 0, dr: -1 }, // up
    { dc: 0, dr: 1 },  // down
    { dc: -1, dr: 0 }, // left
    { dc: 1, dr: 0 },  // right
  ];

  let found = false;

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.col === actualGoal.col && current.row === actualGoal.row) {
      found = true;
      break;
    }

    for (const dir of dirs) {
      const nc = current.col + dir.dc;
      const nr = current.row + dir.dr;

      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      if (visited[nr][nc] || grid[nr][nc]) continue;

      visited[nr][nc] = true;
      parent[nr][nc] = current;
      queue.push({ col: nc, row: nr });
    }
  }

  if (!found) {
    return { waypoints: [], found: false };
  }

  // Reconstruct path
  const path: GridCell[] = [];
  let current: GridCell | null = actualGoal;
  while (current) {
    path.push(current);
    current = parent[current.row][current.col];
  }
  path.reverse();

  // Simplify path: remove intermediate points that are collinear
  const simplified = simplifyPath(path);

  // Convert to world coordinates
  const waypoints = simplified.map(cell => gridToWorld(cell.col, cell.row));

  return { waypoints, found: true };
}

/**
 * Find the nearest passable cell to the given cell.
 */
function findNearestPassable(
  grid: boolean[][],
  cell: GridCell,
  cols: number,
  rows: number,
  maxSearch: number = 5,
): GridCell | null {
  if (!grid[cell.row][cell.col]) return cell;

  // BFS to find nearest passable cell
  for (let radius = 1; radius <= maxSearch; radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;
        const nr = cell.row + dr;
        const nc = cell.col + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc]) {
          return { col: nc, row: nr };
        }
      }
    }
  }

  return null;
}

/**
 * Simplify a path by removing collinear intermediate points.
 */
function simplifyPath(path: GridCell[]): GridCell[] {
  if (path.length <= 2) return path;

  const result: GridCell[] = [path[0]];

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];

    // Check if direction changes
    const dx1 = curr.col - prev.col;
    const dy1 = curr.row - prev.row;
    const dx2 = next.col - curr.col;
    const dy2 = next.row - curr.row;

    if (dx1 !== dx2 || dy1 !== dy2) {
      result.push(curr);
    }
  }

  result.push(path[path.length - 1]);
  return result;
}
