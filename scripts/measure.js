// 실행 결과에서 숫자를 만든다 — 영상·폼·문서는 out/facts.json만 인용한다(문서 간 불일치 0).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { DEV } from '../samples/dev.js';
import { HELDOUT } from '../samples/heldout.js';
import { HELDOUT2 } from '../samples/heldout2.js';
import { HELDOUT3 } from '../samples/heldout3.js';
import { ruleExtract } from '../src/adapters/ruleExtractor.js';
import { measure } from '../src/application/measure.js';
import { intake } from '../src/application/intake.js';
import { measureFlow } from '../src/application/flow.js';

const REQ = ['pickup', 'dropoff', 'pickupDate', 'pickupTime', 'tonnage'];
const all = [...DEV, ...HELDOUT, ...HELDOUT2, ...HELDOUT3];
const cur = measure(all, ruleExtract, REQ);

// 거짓 추출기: 값을 지어내거나 인용 위치를 어긋나게 낸다 — 전부 거부되어야 한다
const liar = (d) => [
  { fieldId: 'pickup', start: 0, end: 2, quote: '부산', value: '부산' },
  { fieldId: 'dropoff', start: 1, end: 3, quote: d.text.slice(1, 3), value: '서울' },
  { fieldId: 'tonnage', start: 0, end: 2, quote: d.text.slice(0, 2), value: 99 },
  { fieldId: 'pickupDate', start: 0, end: 2, quote: '내일', value: '2099-01-01' },
];
let liarTotal = 0;
let liarRejected = 0;
let liarFilled = 0;
for (const d of all) {
  const o = intake(d, liar);
  liarTotal += 4;
  liarRejected += o.rejected.length;
  liarFilled += ['pickup', 'dropoff', 'tonnage', 'pickupDate'].filter((id) => o.fields[id].status !== 'empty').length;
}

const fr = JSON.parse(readFileSync(new URL('../samples/first-run.json', import.meta.url), 'utf8'));
const first = fr.sets.reduce((a, s) => ({ docs: a.docs + s.docs, cells: a.cells + s.cells, correct: a.correct + s.correct, handoff: a.handoff + s.handoff, blank: a.blank + s.blank, wrong: a.wrong + s.wrong }), { docs: 0, cells: 0, correct: 0, handoff: 0, blank: 0, wrong: 0 });
const pct = (a, b) => Math.round((a / b) * 1000) / 10;

const stats = JSON.parse(readFileSync(new URL('../samples/official-stats.json', import.meta.url), 'utf8')).freight;
const flow = measureFlow(all, ruleExtract);
const PRICE_MONTH = 59000; // 제안 가격(가정): 사무직원 1석 월 구독
const ERROR_COST = 110000; // 가정: 오기 1건 = 1톤 용달 평균 견적 11만 원(숨고 안내글) 한 건분 재운행 손실
const facts = {
  generated_by: 'scripts/measure.js',
  docs_total: all.length,
  docs_dev: DEV.length + HELDOUT.length + HELDOUT2.length + HELDOUT3.length - 37,
  cells_total: cur.cells,
  current: { correct: cur.correct, handoff: cur.handoff, blank: cur.blank, wrong: cur.wrong, accuracy_pct: pct(cur.correct, cur.cells), quotes_checked: cur.quotesChecked, quotes_ok: cur.quotesOk },
  first_run_unseen: { ...first, accuracy_pct: pct(first.correct, first.cells), handoff_pct: pct(first.handoff, first.cells), wrong_pct: pct(first.wrong, first.cells) },
  liar: { cells: liarTotal, rejected: liarRejected, filled: liarFilled },
  price: { month_won: PRICE_MONTH, per_seat: 1, monthly_orders_cap: 300, error_cost_won: ERROR_COST, breakeven_errors_per_month: Math.round((PRICE_MONTH / ERROR_COST) * 100) / 100 },
  required_cells_per_order: REQ.length,
  flow,
  market: { freight_firms: stats.firms, freight_workers: stats.workers, year: stats.year, workers_per_firm: Math.round((stats.workers / stats.firms) * 10) / 10, source: stats.source, url: stats.url, quote: stats.quote },
};
mkdirSync(new URL('../out/', import.meta.url), { recursive: true });
writeFileSync(new URL('../out/facts.json', import.meta.url), JSON.stringify(facts, null, 2) + '\n');
console.log(JSON.stringify(facts, null, 2));
