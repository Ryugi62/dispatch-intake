import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, parseTime, parseTonnage, valueFromQuote } from '../src/domain/parsers.js';
import { verifyCandidate } from '../src/domain/citation.js';
import { buildOrder, approveField, chooseCandidate, manualEntry, confirmOrder, pendingFields } from '../src/domain/order.js';
import { intake } from '../src/application/intake.js';
import { ruleExtract } from '../src/adapters/ruleExtractor.js';

const doc = (text) => ({ id: 't', channel: '카톡', receivedAt: '2026-10-19', text });

test('톤수·날짜·시각 파서', () => {
  assert.equal(parseTonnage('2.5톤'), 2.5);
  assert.equal(parseTonnage('11t'), 11);
  assert.equal(parseDate('내일', '2026-10-19'), '2026-10-20');
  assert.equal(parseDate('모레', '2026-10-30'), '2026-11-01');
  assert.equal(parseDate('10/21(수)', '2026-10-19'), '2026-10-21');
  assert.equal(parseTime('오후 2시'), '14:00');
  assert.equal(parseTime('오전 12시'), '00:00');
  assert.equal(parseTime('9시'), null); // 오전/오후 불명 -> 근거 부족
  assert.equal(parseTime('14시 반'), '14:30');
});

test('근거 검증: 인용이 원문과 다르면 거부', () => {
  const d = doc('내일 오전 9시 마산 상차');
  const ok = { fieldId: 'pickup', start: 9, end: 11, quote: '마산', value: '마산' };
  assert.equal(verifyCandidate(d, ok).ok, true);
  assert.equal(verifyCandidate(d, { ...ok, quote: '창원' }).ok, false);
  assert.equal(verifyCandidate(d, { ...ok, value: '창원' }).ok, false);
  assert.equal(verifyCandidate(d, { ...ok, start: 100, end: 102 }).ok, false);
});

test('거짓 추출기(값 지어내기·위치 어긋남)는 100% 거부되어 칸이 빈다', () => {
  const d = doc('내일 오전 9시 마산 상차 인천 하차 1톤');
  const liar = () => [
    { fieldId: 'pickup', start: 0, end: 2, quote: '부산', value: '부산' },
    { fieldId: 'dropoff', start: 14, end: 16, quote: '인천', value: '서울' },
    { fieldId: 'tonnage', start: 5, end: 7, quote: '1톤', value: 1 },
    { fieldId: 'pickupDate', start: 0, end: 2, quote: '내일', value: '2026-12-31' },
  ];
  const o = intake(d, liar);
  assert.equal(o.rejected.length, 4);
  for (const f of ['pickup', 'dropoff', 'tonnage', 'pickupDate']) assert.equal(o.fields[f].status, 'empty');
});

test('충돌: 서로 다른 후보 둘이면 값이 없고 사람이 고른다', () => {
  const o = intake(doc('하차는 부천으로 변경할게요 (인천 하차였는데) 1톤'), ruleExtract);
  assert.equal(o.fields.dropoff.status, 'conflict');
  assert.equal(o.fields.dropoff.value, null);
  assert.equal(o.fields.dropoff.candidates.length, 2);
  const o2 = chooseCandidate(o, 'dropoff', 1);
  assert.equal(o2.fields.dropoff.status, 'approved');
  assert.equal(o2.fields.dropoff.value, '부천');
  assert.equal(o.fields.dropoff.status, 'conflict'); // 원본 불변
});

test('필수 칸 하나라도 미승인이면 배차표 행이 없다(우회 경로 0)', () => {
  let o = intake(doc('내일 오전 9시 마산 상차, 인천 하차 1톤'), ruleExtract);
  for (const id of ['pickup', 'dropoff', 'pickupDate', 'pickupTime']) o = approveField(o, id);
  assert.deepEqual(pendingFields(o), ['tonnage']);
  assert.throws(() => confirmOrder(o), /미승인 칸: tonnage/);
  o = approveField(o, 'tonnage');
  const out = confirmOrder(o);
  assert.deepEqual(out.row, { pickup: '마산', dropoff: '인천', pickupAt: '2026-10-20 09:00', tonnage: 1, cargo: null });
  assert.equal(out.citations.pickup, '마산');
});

test('근거 없는 칸은 승인할 수 없고, 사람이 직접 넣으면 출처가 사람으로 남는다', () => {
  let o = intake(doc('내일 10시 창원 상차 부산 하차'), ruleExtract);
  assert.equal(o.fields.pickupTime.status, 'empty');
  assert.throws(() => approveField(o, 'pickupTime'), /승인할 수 없는 상태/);
  o = manualEntry(o, 'pickupTime', '10:00');
  assert.equal(o.fields.pickupTime.evidence, null);
  assert.equal(o.fields.pickupTime.manual, true);
});

test('도메인은 어댑터·인프라를 import하지 않는다(의존 방향)', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  for (const f of readdirSync(new URL('../src/domain/', import.meta.url))) {
    const src = readFileSync(new URL(`../src/domain/${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /adapters|infrastructure|application|node:/, f);
  }
});

test('valueFromQuote는 알 수 없는 칸에 null', () => {
  assert.equal(valueFromQuote('x', 'y'), null);
  assert.equal(buildOrder(doc('abc'), []).fields.pickup.status, 'empty');
});

test('장소 안전장치: 다른 칸 낱말이 섞인 인용은 장소가 아니다(H1 h10 조용한 오기 회귀)', () => {
  const d = doc('상차: 여수산단  하차: 광주 첨단  내일 15:30  1톤 냉동');
  const o = intake(d, ruleExtract);
  assert.notEqual(o.fields.pickup.value, '여수산단  하차: 광주 첨단  내일 15:30  1톤 냉동'); // 삼킨 한 줄을 상차지로 채우지 않는다
  assert.ok(o.fields.pickup.value === null || o.fields.pickup.value === '여수산단');
  assert.equal(valueFromQuote('pickup', '여수산단  하차: 광주 첨단'), null);
  assert.equal(valueFromQuote('pickup', '여수산단'), '여수산단');
});

test('요일 낱말은 장소가 아니다(H3 m08 조용한 오기 회귀)', () => {
  assert.equal(valueFromQuote('pickup', '월요일'), null);
  const o = intake(doc('월요일 상차 마산 하차 서울 3.5톤'), ruleExtract);
  assert.equal(o.fields.pickup.value, '마산');
  assert.equal(o.fields.pickupDate.status, 'empty'); // 요일만으로는 날짜를 확정하지 않는다
});
