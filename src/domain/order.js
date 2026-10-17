import { FIELDS, REQUIRED } from './fields.js';
import { verifyCandidate, dedupe } from './citation.js';

// 칸 상태: empty(근거 없음) | proposed(후보 1개) | conflict(후보 2개 이상) | approved
export function buildOrder(doc, rawCandidates) {
  const verified = [];
  const rejected = [];
  for (const c of dedupe(rawCandidates)) {
    const r = verifyCandidate(doc, c);
    (r.ok ? verified : rejected).push(r.ok ? c : { ...c, reason: r.reason });
  }
  const fields = {};
  for (const f of FIELDS) {
    const all = verified.filter((c) => c.fieldId === f.id);
    // 한 인용이 다른 인용 안에 들어 있으면(예: 「파레트 6개」 ⊂ 「정밀기계 파레트 6개」) 충돌이 아니라 같은 근거 — 바깥쪽을 쓴다
    const cs = all.filter((c) => !all.some((o) => o !== c && o.start <= c.start && o.end >= c.end && (o.end - o.start) > (c.end - c.start)));
    const distinct = [...new Map(cs.map((c) => [String(c.value), c])).values()];
    if (distinct.length === 0) fields[f.id] = { id: f.id, status: 'empty', value: null, evidence: null, candidates: [] };
    else if (distinct.length === 1) fields[f.id] = { id: f.id, status: 'proposed', value: distinct[0].value, evidence: pick(distinct[0]), candidates: distinct.map(pick2) };
    else fields[f.id] = { id: f.id, status: 'conflict', value: null, evidence: null, candidates: distinct.map(pick2) };
  }
  return { doc: { id: doc.id, channel: doc.channel, receivedAt: doc.receivedAt }, fields, rejected, confirmed: false, log: [] };
}
const pick = (c) => ({ start: c.start, end: c.end, quote: c.quote });
const pick2 = (c) => ({ value: c.value, ...pick(c) });

const clone = (o) => JSON.parse(JSON.stringify(o));

// 충돌 칸에서 후보를 고른다 — 고르는 것도 사람의 확인이므로 곧바로 approved.
export function chooseCandidate(order, fieldId, index, by = '사무직원') {
  const o = clone(order);
  const f = o.fields[fieldId];
  if (f.status !== 'conflict') throw new Error('충돌 칸이 아님');
  const c = f.candidates[index];
  if (!c) throw new Error('없는 후보');
  o.fields[fieldId] = { ...f, status: 'approved', value: c.value, evidence: { start: c.start, end: c.end, quote: c.quote }, by };
  o.log.push({ fieldId, action: 'choose', by, value: c.value });
  return o;
}

export function approveField(order, fieldId, by = '사무직원') {
  const o = clone(order);
  const f = o.fields[fieldId];
  if (f.status !== 'proposed') throw new Error(`승인할 수 없는 상태: ${f.status}`);
  f.status = 'approved';
  f.by = by;
  o.log.push({ fieldId, action: 'approve', by, value: f.value });
  return o;
}

// 사람이 직접 입력 — 근거가 없으므로 evidence=null, 출처=사람으로 남는다.
export function manualEntry(order, fieldId, value, by = '사무직원') {
  const o = clone(order);
  if (value === null || value === undefined || value === '') throw new Error('빈 값');
  o.fields[fieldId] = { id: fieldId, status: 'approved', value, evidence: null, candidates: o.fields[fieldId].candidates, by, manual: true };
  o.log.push({ fieldId, action: 'manual', by, value });
  return o;
}

export function pendingFields(order) {
  return REQUIRED.filter((id) => order.fields[id].status !== 'approved');
}

// 배차표 행은 필수 칸이 전부 승인되어야만 나온다. 다른 경로 없음.
export function confirmOrder(order) {
  const pending = pendingFields(order);
  if (pending.length) throw new Error(`미승인 칸: ${pending.join(', ')}`);
  const f = order.fields;
  const row = {
    pickup: f.pickup.value,
    dropoff: f.dropoff.value,
    pickupAt: `${f.pickupDate.value} ${f.pickupTime.value}`,
    tonnage: f.tonnage.value,
    cargo: f.cargo.status === 'approved' ? f.cargo.value : null,
  };
  const citations = Object.fromEntries(Object.values(f).map((x) => [x.id, x.evidence ? x.evidence.quote : x.manual ? '(사람 직접 입력)' : null]));
  return { row, citations, log: order.log };
}
