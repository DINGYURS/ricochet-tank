import { describe, it, expect, vi } from 'vitest';
import { generateMaze } from '../../src/systems/MazeGenerator';
import { MAZE_COLS, MAZE_ROWS, CELL_SIZE, WALL_THICKNESS } from '../../src/config';

describe('generateMaze', () => {
  it('returns walls array with correct types', () => {
    const result = generateMaze(MAZE_COLS, MAZE_ROWS, CELL_SIZE, WALL_THICKNESS, 0.2, 2);
    expect(result.walls).toBeDefined();
    expect(result.walls.length).toBeGreaterThan(0);
    for (const wall of result.walls) {
      expect(['vertical', 'horizontal']).toContain(wall.orientation);
      expect(wall.width).toBeGreaterThan(0);
      expect(wall.height).toBeGreaterThan(0);
    }
  });

  it('returns two spawn points in opposite corners', () => {
    const result = generateMaze(MAZE_COLS, MAZE_ROWS, CELL_SIZE, WALL_THICKNESS, 0.2, 2);
    expect(result.spawn1).toBeDefined();
    expect(result.spawn2).toBeDefined();
    const dx = Math.abs(result.spawn1.x - result.spawn2.x);
    const dy = Math.abs(result.spawn1.y - result.spawn2.y);
    expect(dx + dy).toBeGreaterThan(CELL_SIZE * 3);
  });

  it('uses random choices to produce different wall layouts', () => {
    const random = vi.spyOn(Math, 'random');
    random.mockReturnValue(0);
    const r1 = generateMaze(MAZE_COLS, MAZE_ROWS, CELL_SIZE, WALL_THICKNESS, 0.2, 2);

    random.mockReturnValue(0.999999);
    const r2 = generateMaze(MAZE_COLS, MAZE_ROWS, CELL_SIZE, WALL_THICKNESS, 0.2, 2);

    random.mockRestore();
    expect(r1.walls).not.toEqual(r2.walls);
  });
});
