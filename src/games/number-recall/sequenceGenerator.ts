/**
 * Sequence Generator for Number Recall
 *
 * Generates exact-length digit sequences as strings, fully preserving leading zeros.
 */

export type RandomNumberGenerator = () => number;

export interface SequenceGeneratorOptions {
  length: number;
  rng?: RandomNumberGenerator;
}

/**
 * Generates a pseudo-random digit sequence of exact `length`.
 *
 * @param options.length Number of digits (must be integer between 2 and 15)
 * @param options.rng Optional custom RNG function returning [0, 1) for deterministic testing
 * @returns String representation of the digit sequence (e.g., "0482")
 */
export function generateSequence({ length, rng = Math.random }: SequenceGeneratorOptions): string {
  if (!Number.isInteger(length) || length < 2 || length > 15) {
    throw new Error(`Invalid sequence length: ${length}. Must be an integer between 2 and 15.`);
  }

  const digits: string[] = [];

  for (let i = 0; i < length; i++) {
    const raw = rng();
    const safeRaw = Math.max(0, Math.min(0.999999999, raw));
    const digit = Math.floor(safeRaw * 10);
    digits.push(digit.toString());
  }

  // Prevent degenerate sequences where all digits are identical for length >= 3
  if (digits.length >= 3) {
    const allIdentical = digits.every((d) => d === digits[0]);
    if (allIdentical) {
      // Modify the last digit so it differs
      const current = parseInt(digits[digits.length - 1], 10);
      const replacement = (current + 1) % 10;
      digits[digits.length - 1] = replacement.toString();
    }
  }

  return digits.join('');
}
