import { valueFromQuote } from './parsers.js';

// 후보 1개를 원문과 대조한다. 통과해야만 칸에 들어간다.
export function verifyCandidate(doc, cand) {
  const { fieldId, start, end, quote, value } = cand;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > doc.text.length) {
    return { ok: false, reason: '인용 위치가 원문 밖' };
  }
  if (doc.text.slice(start, end) !== quote) return { ok: false, reason: '인용이 원문과 다름' };
  const v = valueFromQuote(fieldId, quote, { receivedAt: doc.receivedAt });
  if (v === null || v === undefined) return { ok: false, reason: '인용에서 값을 만들 수 없음' };
  if (v !== value) return { ok: false, reason: '값이 인용과 다름' };
  return { ok: true };
}

export function dedupe(cands) {
  const seen = new Set();
  return cands.filter((c) => {
    const k = `${c.fieldId}|${c.start}|${c.end}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
