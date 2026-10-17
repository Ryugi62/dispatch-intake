import { intake } from './intake.js';
import { approveField, chooseCandidate, manualEntry, confirmOrder } from '../domain/order.js';
import { REQUIRED } from '../domain/fields.js';

// 손입력 기준 단계 수: 필수 5칸을 한 칸씩 입력 + 저장 1 = 6 (칸 수로 센 구조적 값 — 시간·오기율은 사람이 해 보지 않아 미측정)
export const MANUAL_STEPS = REQUIRED.length + 1;
const MISSING = '(원문에 없음 — 다른 곳에서 확인)';

// 도구 경로 시뮬레이션: 사무직원이 (1) 인용이 붙은 칸은 그대로 승인(맹목 승인 = 최악의 경우) (2) 어긋난 칸은 후보를 고르고 (3) 비어 있으면 직접 입력 (4) 올리기를 누른다.
// 오기 = 승인된 칸 중 정답(truth)과 다른 값. truth 'CONFLICT'(원문이 서로 어긋남)은 정답이 없으므로 오기로 세지 않는다.
export function simulateTool(doc, extractor) {
  let order = intake(doc, extractor);
  const r = { approve: 0, choose: 0, manual: 0, wrongCells: 0, cited: 0 };
  for (const id of REQUIRED) {
    const f = order.fields[id];
    const truth = doc.truth?.[id] ?? null;
    if (f.status === 'proposed') {
      r.cited++;
      if (truth !== 'CONFLICT' && f.value !== truth) r.wrongCells++;
      order = approveField(order, id);
      r.approve++;
    } else if (f.status === 'conflict') {
      const idx = truth && truth !== 'CONFLICT' ? f.candidates.findIndex((c) => c.value === truth) : 0;
      if (idx >= 0) {
        order = chooseCandidate(order, id, idx);
        r.choose++;
      } else {
        order = manualEntry(order, id, truth);
        r.manual++;
      }
    } else {
      order = manualEntry(order, id, truth && truth !== 'CONFLICT' ? truth : MISSING);
      r.manual++;
    }
  }
  const result = confirmOrder(order); // 모두 승인돼야만 통과 — 예외가 나면 시뮬레이션 자체가 틀린 것
  return { ...r, steps: r.approve + r.choose + r.manual + 1, result };
}

export function measureFlow(docs, extractor) {
  const rs = docs.map((d) => simulateTool(d, extractor));
  const sum = (k) => rs.reduce((a, x) => a + x[k], 0);
  const mean = (k) => Math.round((sum(k) / docs.length) * 100) / 100;
  return {
    docs: docs.length,
    manual_steps: MANUAL_STEPS,
    tool_steps_mean: mean('steps'),
    approve_mean: mean('approve'),
    choose_mean: mean('choose'),
    manual_mean: mean('manual'),
    cited_mean: mean('cited'),
    blind_wrong_cells: sum('wrongCells'),
    docs_with_wrong: rs.filter((x) => x.wrongCells > 0).length,
    manual_error: '미측정',
    manual_time: '미측정',
  };
}
