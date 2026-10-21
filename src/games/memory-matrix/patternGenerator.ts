/**
 * Pattern Generator for Memory Matrix
 * Generates unique, non-repeating cell indices for the illumination phase.
 */

export type RandomNumberGenerator = () => number;

export interface PatternGeneratorOptions {
  totalCells: number;
  targetCount: number;
  rng?: RandomNumberGenerator;
}

/**
 * Generates an array of unique random indices within [0, totalCells - 1].
 *
 * @param options.totalCells Total number of cells in the grid (e.g. 9 for 3x3)
 * @param options.targetCount Number of tiles to illuminate
 * @param options.rng Optional custom random generator for deterministic testing
 * @returns Array of unique target indices sorted in ascending order
 */
export function generatePattern({
  totalCells,
  targetCount,
  rng = Math.random,
}: PatternGeneratorOptions): number[] {
  if (!Number.isInteger(totalCells) || totalCells < 4) {
    throw new Error(`Invalid totalCells: ${totalCells}. Must be an integer >= 4.`);
  }

  if (!Number.isInteger(targetCount) || targetCount <= 0) {
    throw new Error(`Invalid targetCount: ${targetCount}. Must be an integer >= 1.`);
  }

  if (targetCount > totalCells) {
    throw new Error(
      `targetCount (${targetCount}) cannot exceed total available cells (${totalCells}).`
    );
  }

  // Reservoir / Fisher-Yates sample for unbiased selection
  const pool = Array.from({ length: totalCells }, (_, i) => i);
  const selected: number[] = [];

  for (let i = 0; i < targetCount; i++) {
    const remainingCount = pool.length;
    const randomIndex = Math.floor(rng() * remainingCount);
    // Boundary check for floating point edge cases
    const safeIndex = Math.min(Math.max(0, randomIndex), remainingCount - 1);
    const [picked] = pool.splice(safeIndex, 1);
    selected.push(picked);
  }

  return selected.sort((a, b) => a - b);
}
