import { darkColors, lightColors } from '../src/theme/colors';
import { spacing, radius } from '../src/theme/spacing';

describe('MindRise Theme & Design System Tokens', () => {
  it('defines required deep navy background and vibrant violet primary colors', () => {
    expect(darkColors.background).toBe('#0B0F19');
    expect(darkColors.card).toBe('#141D33');
    expect(darkColors.primary).toBe('#7C5CFC');

    expect(lightColors.background).toBe('#F8FAFC');
    expect(lightColors.primary).toBe('#6344E7');
  });

  it('defines cognitive domain accent colors', () => {
    expect(darkColors.memory).toBeDefined();
    expect(darkColors.speed).toBeDefined();
    expect(darkColors.attention).toBeDefined();
    expect(darkColors.logic).toBeDefined();
    expect(darkColors.problemSolving).toBeDefined();
  });

  it('provides comprehensive spacing and radius scales', () => {
    expect(spacing.md).toBe(12);
    expect(spacing.lg).toBe(16);
    expect(spacing.xl).toBe(20);
    expect(radius.xl).toBe(20);
  });
});
