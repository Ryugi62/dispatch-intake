// 인용 문장 -> 칸 값. 근거 검증이 이 함수로 값을 "다시 계산"한다(추출기가 값을 지어낼 수 없게).
const pad = (n) => String(n).padStart(2, '0');

export function parseTonnage(quote) {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(?:톤|t|T|ton)\s*$/.exec(quote);
  return m ? Number(m[1]) : null;
}

// 장소 인용 안전장치: 다른 칸의 낱말(상차·하차·시각·톤수)이나 긴 문장이 섞이면 장소가 아니다 -> 비운다(조용한 오기 방지).
const NOT_PLACE = /상차|하차|\d{1,2}:\d{2}|오전|오후|\d+(?:\.\d+)?\s*(?:톤|t\b)|\s{2,}/;
export function parsePlace(quote) {
  const v = quote.trim();
  if (v.length < 2 || v.length > 40 || NOT_PLACE.test(v)) return null;
  return v;
}

export function parseCargo(quote) {
  const v = quote.trim();
  return v.length >= 2 ? v : null;
}

function addDays(isoDate, n) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

// receivedAt: 'YYYY-MM-DD' (문서를 받은 날)
export function parseDate(quote, receivedAt) {
  const q = quote.trim();
  if (q === '오늘') return receivedAt;
  if (q === '내일') return addDays(receivedAt, 1);
  if (q === '모레') return addDays(receivedAt, 2);
  let iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q);
  if (iso) return q;
  let m = /^(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\([월화수목금토일]\))?$/.exec(q) || /^(\d{1,2})월\s*(\d{1,2})일(?:\s*\([월화수목금토일]\))?$/.exec(q);
  if (!m) return null;
  const [y] = receivedAt.split('-').map(Number);
  const mo = Number(m[1]);
  const d = Number(m[2]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

export function parseTime(quote) {
  const q = quote.trim();
  let m = /^(\d{1,2}):(\d{2})$/.exec(q);
  if (m) {
    const h = Number(m[1]);
    const mi = Number(m[2]);
    return h < 24 && mi < 60 ? `${pad(h)}:${pad(mi)}` : null;
  }
  m = /^(오전|오후|새벽|저녁)\s*(\d{1,2})시(?:\s*(\d{1,2})분|\s*반)?$/.exec(q);
  if (m) {
    let h = Number(m[2]);
    const mi = m[3] ? Number(m[3]) : /반$/.test(q) ? 30 : 0;
    if (h < 1 || h > 12 || mi > 59) return null;
    if ((m[1] === '오후' || m[1] === '저녁') && h < 12) h += 12;
    if (m[1] === '오전' && h === 12) h = 0;
    return `${pad(h)}:${pad(mi)}`;
  }
  m = /^(1[3-9]|2[0-3])시(?:\s*(\d{1,2})분|\s*반)?$/.exec(q);
  if (m) return `${pad(Number(m[1]))}:${pad(m[2] ? Number(m[2]) : /반$/.test(q) ? 30 : 0)}`;
  return null; // 「9시」처럼 오전/오후가 없으면 근거 부족 — 비운다
}

export function valueFromQuote(fieldId, quote, ctx = {}) {
  switch (fieldId) {
    case 'pickup':
    case 'dropoff':
      return parsePlace(quote);
    case 'tonnage':
      return parseTonnage(quote);
    case 'pickupDate':
      return parseDate(quote, ctx.receivedAt);
    case 'pickupTime':
      return parseTime(quote);
    case 'cargo':
      return parseCargo(quote);
    default:
      return null;
  }
}
