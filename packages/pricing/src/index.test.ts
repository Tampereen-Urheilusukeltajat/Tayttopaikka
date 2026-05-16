import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  eurCentsToEur,
  calculateVolumeLitres,
  calcGasFillCostCents,
  calcDiluentFillCostCents,
  calcTotalFillCostCents,
} from './index';

describe('eurCentsToEur', () => {
  test('converts whole cents to euros', () =>
    assert.strictEqual(eurCentsToEur(9000), 90));

  test('converts sub-euro cents', () =>
    assert.strictEqual(eurCentsToEur(855), 8.55));

  test('rounds to 3 decimal places', () =>
    assert.strictEqual(eurCentsToEur(1), 0.01));

  test('zero', () => assert.strictEqual(eurCentsToEur(0), 0));
});

describe('calculateVolumeLitres', () => {
  test('integer pressure diff', () =>
    assert.strictEqual(calculateVolumeLitres(50, 10, 8), 100));

  test('real-world: 196→183 bar, 50L cylinder', () =>
    assert.strictEqual(calculateVolumeLitres(50, 196, 183), 650));

  test('real-world: 34→28 bar, 50L cylinder', () =>
    assert.strictEqual(calculateVolumeLitres(50, 34, 28), 300));

  test('zero pressure diff', () =>
    assert.strictEqual(calculateVolumeLitres(50, 10, 10), 0));

  test('ceil applied to fractional pressure diff', () =>
    // ceil(1.5) × 50 = 100
    assert.strictEqual(calculateVolumeLitres(50, 10.5, 9), 100));
});

describe('calcGasFillCostCents', () => {
  test('0.6 c/L × 100L = 60 cents', () =>
    assert.strictEqual(calcGasFillCostCents(100, 0.6), 60));

  test('0.9 c/L × 650L = 585 cents', () =>
    assert.strictEqual(calcGasFillCostCents(650, 0.9), 585));

  test('0.9 c/L × 300L = 270 cents', () =>
    assert.strictEqual(calcGasFillCostCents(300, 0.9), 270));

  test('zero volume', () =>
    assert.strictEqual(calcGasFillCostCents(0, 0.9), 0));
});

describe('calcDiluentFillCostCents', () => {
  test('40% He, 100L, 6 c/L = 240 cents', () =>
    assert.strictEqual(calcDiluentFillCostCents(100, 40, 6), 240));

  test('33% He, 100L, 6 c/L = 198 cents', () =>
    assert.strictEqual(calcDiluentFillCostCents(100, 33, 6), 198));

  test('ceil applied: 1% He, 1L, 1 c/L = ceil(0.01) = 1', () =>
    assert.strictEqual(calcDiluentFillCostCents(1, 1, 1), 1));

  test('zero helium percentage = 0 cents', () =>
    assert.strictEqual(calcDiluentFillCostCents(100, 0, 6), 0));

  test('zero volume = 0 cents', () =>
    assert.strictEqual(calcDiluentFillCostCents(0, 40, 6), 0));
});

describe('calcTotalFillCostCents', () => {
  test('empty inputs return 0', () =>
    assert.strictEqual(calcTotalFillCostCents([], []), 0));

  test('gas costs only', () =>
    assert.strictEqual(calcTotalFillCostCents([585, 270], []), 855));

  test('diluent costs only', () =>
    assert.strictEqual(calcTotalFillCostCents([], [240]), 240));

  test('gas and diluent combined', () =>
    assert.strictEqual(calcTotalFillCostCents([60], [240]), 300));

  test('two gas fills at 0.9 c/L produce correct integer total', () => {
    // 650L × 0.9 = 585 cents, 300L × 0.9 = 270 cents, total = 855 cents.
    // Both individual products are exact integers, so the sum must be too.
    const tank1 = calcGasFillCostCents(calculateVolumeLitres(50, 196, 183), 0.9);
    const tank2 = calcGasFillCostCents(calculateVolumeLitres(50, 34, 28), 0.9);
    assert.strictEqual(calcTotalFillCostCents([tank1, tank2], []), 855);
  });

  test('ceil applied to the combined sum, not per-row individually', () => {
    // 19L × 0.9 c/L = 17.1 cents per row. Two such rows:
    // Correct:   ceil(17.1 + 17.1) = ceil(34.2) = 35 cents
    // Incorrect: ceil(17.1) + ceil(17.1) = 18 + 18 = 36 cents
    assert.strictEqual(calcTotalFillCostCents([17.1, 17.1], []), 35);
  });

  test('result is always a whole number of cents', () => {
    const result = calcTotalFillCostCents([17.1, 22.9, 0.3], [10.2]);
    assert.strictEqual(result % 1, 0);
  });
});
