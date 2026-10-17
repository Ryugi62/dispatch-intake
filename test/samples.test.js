import test from 'node:test';
import assert from 'node:assert/strict';
import { DEV } from '../samples/dev.js';
import { ruleExtract } from '../src/adapters/ruleExtractor.js';
import { measure } from '../src/application/measure.js';

const REQ = ['pickup', 'dropoff', 'pickupDate', 'pickupTime', 'tonnage'];

test('개발용 합성 문서: 조용한 오기 0, 인용 일치 100%', () => {
  const m = measure(DEV, ruleExtract, REQ);
  assert.equal(m.wrong, 0);
  assert.equal(m.quotesOk, m.quotesChecked);
  assert.ok(m.quotesChecked > 0);
});

import { HELDOUT } from '../samples/heldout.js';
test('H1(15건): 안전장치 후 조용한 오기 0, 인용 일치 100%', () => {
  const m = measure(HELDOUT, ruleExtract, REQ);
  assert.equal(m.wrong, 0);
  assert.equal(m.quotesOk, m.quotesChecked);
});

import { HELDOUT2 } from '../samples/heldout2.js';
import { HELDOUT3 } from '../samples/heldout3.js';
test('H2(12건)·H3(10건): 고친 뒤 조용한 오기 0, 인용 일치 100%', () => {
  for (const set of [HELDOUT2, HELDOUT3]) {
    const m = measure(set, ruleExtract, REQ);
    assert.equal(m.wrong, 0);
    assert.equal(m.quotesOk, m.quotesChecked);
  }
});
