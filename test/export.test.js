import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsv, CSV_HEADER } from '../src/domain/export.js';
import { measureFlow, simulateTool, MANUAL_STEPS } from '../src/application/flow.js';
import { DEV } from '../samples/dev.js';
import { HELDOUT } from '../samples/heldout.js';
import { HELDOUT2 } from '../samples/heldout2.js';
import { HELDOUT3 } from '../samples/heldout3.js';
import { ruleExtract } from '../src/adapters/ruleExtractor.js';

const row = (o = {}) => ({ row: { pickup: '마산', dropoff: '인천', pickupAt: '2026-10-20 09:00', tonnage: 1, cargo: null, ...o }, citations: { pickup: '마산', dropoff: '인천', pickupDate: '내일', pickupTime: '오전 9시', tonnage: '1톤', cargo: null } });

test('CSV: 머리글·한 줄 한 건·근거 칸 포함', () => {
  const csv = toCsv([row()]);
  const lines = csv.trim().split('\r\n');
  assert.equal(lines[0], CSV_HEADER.join(','));
  assert.equal(lines.length, 2);
  assert.match(lines[1], /^마산,인천,2026-10-20 09:00,1,,/);
  assert.match(lines[1], /내일 \+ 오전 9시/);
});

test('CSV: 쉼표·따옴표·줄바꿈은 따옴표로 감싸고, 수식 시작 글자는 막는다', () => {
  const csv = toCsv([row({ pickup: '경기 평택시, 포승읍 "A동"', dropoff: '=HYPERLINK("x")' })]);
  assert.match(csv, /"경기 평택시, 포승읍 ""A동"""/);
  assert.match(csv, /'=HYPERLINK/);
  assert.equal(toCsv([]).trim(), CSV_HEADER.join(','));
});

test('처리 흐름 실측: 손입력 기준은 6단계(5칸 입력+저장), 도구는 승인·고르기·직접 입력·올리기를 센다', () => {
  assert.equal(MANUAL_STEPS, 6);
  const d = DEV.find((x) => x.id === 'd01');
  const r = simulateTool(d, ruleExtract);
  assert.equal(r.approve, 5);
  assert.equal(r.choose + r.manual, 0);
  assert.equal(r.steps, 6);
  assert.equal(r.wrongCells, 0);
  const c = simulateTool(DEV.find((x) => x.id === 'd05'), ruleExtract);
  assert.equal(c.choose, 1); // 하차지 충돌 고르기
});

test('처리 흐름: 57건 전부 단계·오기 집계, 맹목 승인에도 조용한 오기 0', () => {
  const all = [...DEV, ...HELDOUT, ...HELDOUT2, ...HELDOUT3];
  const m = measureFlow(all, ruleExtract);
  assert.equal(m.docs, 57);
  assert.ok(m.tool_steps_mean >= 6 && m.tool_steps_mean < 9);
  assert.equal(m.blind_wrong_cells, 0);
  assert.equal(m.manual_steps, 6);
  assert.equal(m.manual_error, '미측정');
  assert.equal(m.manual_time, '미측정');
});
