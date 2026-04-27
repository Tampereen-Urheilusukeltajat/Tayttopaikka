import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { convertDateToMariaDBDateTime } from '../../lib/utils/dateTime';

describe('convertDateToMariaDBDateTime', () => {
  it('formats a basic UTC date correctly', () => {
    const date = new Date('2024-06-15T10:30:45Z');
    assert.strictEqual(
      convertDateToMariaDBDateTime(date),
      '2024-06-15 10:30:45',
    );
  });

  it('zero-pads month to two digits', () => {
    const date = new Date('2024-01-05T00:00:00Z');
    const result = convertDateToMariaDBDateTime(date);
    assert.match(result, /^2024-01-/);
  });

  it('zero-pads day of month to two digits', () => {
    const date = new Date('2024-03-05T00:00:00Z');
    const result = convertDateToMariaDBDateTime(date);
    assert.match(result, /^2024-03-05/);
  });

  it('zero-pads hours, minutes and seconds', () => {
    const date = new Date('2024-11-20T01:02:03Z');
    assert.strictEqual(
      convertDateToMariaDBDateTime(date),
      '2024-11-20 01:02:03',
    );
  });

  it('uses the day of the month, not the day of the week', () => {
    // 2024-03-03 is a Sunday (getUTCDay() === 0), but the date is the 3rd
    const date = new Date('2024-03-03T00:00:00Z');
    const result = convertDateToMariaDBDateTime(date);
    assert.match(result, /^2024-03-03/);
  });

  it('uses 1-indexed months (January is 01, not 00)', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const result = convertDateToMariaDBDateTime(date);
    assert.match(result, /^2024-01-/);
  });

  it('uses 1-indexed months (December is 12)', () => {
    const date = new Date('2024-12-31T23:59:59Z');
    assert.strictEqual(
      convertDateToMariaDBDateTime(date),
      '2024-12-31 23:59:59',
    );
  });

  it('handles midnight correctly', () => {
    const date = new Date('2025-07-04T00:00:00Z');
    assert.strictEqual(
      convertDateToMariaDBDateTime(date),
      '2025-07-04 00:00:00',
    );
  });

  it('handles end-of-day boundary correctly', () => {
    const date = new Date('2025-07-04T23:59:59Z');
    assert.strictEqual(
      convertDateToMariaDBDateTime(date),
      '2025-07-04 23:59:59',
    );
  });
});
