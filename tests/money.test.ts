import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { centsToDecimal, parseBRLCents, splitInstallments } from '../src/lib/money.ts';

test('parses Brazilian and decimal money formats as exact cents', () => {
  assert.equal(parseBRLCents('1.234,56'), 123456);
  assert.equal(parseBRLCents('1234,56'), 123456);
  assert.equal(parseBRLCents('1234.56'), 123456);
  assert.equal(parseBRLCents('R$ 9,90'), 990);
  assert.equal(parseBRLCents('12'), 1200);
});

test('formats integer cents without float rounding', () => {
  assert.equal(centsToDecimal(0), '0.00');
  assert.equal(centsToDecimal(1), '0.01');
  assert.equal(centsToDecimal(123456), '1234.56');
});

test('rejects malformed or over-precision money input', () => {
  assert.equal(parseBRLCents(''), null);
  assert.equal(parseBRLCents('-5,00'), null);
  assert.equal(parseBRLCents('1,999'), null);
  assert.equal(parseBRLCents('abc'), null);
});

test('splits cent values exactly and places remainder in final installment', () => {
  for (const [total, count] of [[100, 3], [9999, 10], [10, 7], [100000, 1]] as const) {
    const parts = splitInstallments(total, count);
    assert.equal(parts.length, count);
    assert.equal(parts.reduce((sum, value) => sum + value, 0), total);
    assert.ok(parts.every(value => Number.isSafeInteger(value) && value > 0));
  }
});

test('rejects invalid totals and installment counts', () => {
  assert.throws(() => splitInstallments(0, 1));
  assert.throws(() => splitInstallments(100, 0));
  assert.throws(() => splitInstallments(100, 11));
});
