import { intake } from './intake.js';
import { FIELDS } from '../domain/fields.js';

// 칸 결과 분류: correct(정답과 같게 채움) | handoff(충돌로 사람에게 넘김) | blank(근거 없어 비움) | wrong(조용한 오기: 충돌 표시 없이 정답과 다르게 채움)
export function classify(field, truth) {
  if (truth === 'CONFLICT') return field.status === 'conflict' ? 'handoff' : field.status === 'proposed' ? 'wrong' : 'blank';
  if (truth === null) return field.status === 'empty' ? 'correct' : field.status === 'conflict' ? 'handoff' : 'wrong';
  if (field.status === 'proposed') return field.value === truth ? 'correct' : 'wrong';
  if (field.status === 'conflict') return 'handoff';
  return 'blank';
}

export function measure(docs, extractor, fieldIds = FIELDS.map((f) => f.id)) {
  const counts = { correct: 0, handoff: 0, blank: 0, wrong: 0 };
  const perDoc = [];
  let quotesChecked = 0;
  let quotesOk = 0;
  for (const d of docs) {
    const order = intake(d, extractor);
    const row = { id: d.id, cells: {} };
    for (const id of fieldIds) {
      const truth = d.truth[id] ?? null;
      const f = order.fields[id];
      const c = classify(f, truth);
      counts[c]++;
      row.cells[id] = c;
      if (f.status === 'proposed') {
        quotesChecked++;
        if (d.text.slice(f.evidence.start, f.evidence.end) === f.evidence.quote) quotesOk++;
      }
    }
    perDoc.push(row);
  }
  const total = fieldIds.length * docs.length;
  return { docs: docs.length, cells: total, ...counts, quotesChecked, quotesOk, accuracy: counts.correct / total, perDoc };
}
