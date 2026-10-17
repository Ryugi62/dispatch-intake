import { valueFromQuote } from '../domain/parsers.js';

// 시연용 규칙 기반 추출기. 운영에서는 같은 Extractor 계약(문서 -> 후보 목록)을 지키는 언어모델 추출기로 바꿀 수 있다.
const KW = '(상차|하차)';
const STOP = /^(내일|모레|오늘|오전|오후|아침|새벽|저녁|점심|\d+시|\d+분|\d+(?:\.\d+)?(?:톤|t|T)|\d+\/\d+|\d+월|\d+일|이고|그리고|그럼|네|넵|아|저희|근데|물건|화물|파레트|팔레트|박스|예정|가능|부탁|부탁드립니다|합니다|입니다|요|에|를|을|은|는|이|가|도|로|상차|하차|출발|도착|\d{1,2}:\d{2})$/;
const VERBISH = /^(일찍|빨리|늦게|좀|꼭|바로|혹시|우선|였|이었|인데|입니다|이에요|예요|이요|했|하고|해서|해주|해줘|하는|하면|할|합|해요|가능|변경|수정|정정)/;
const JOSA = /(에서는|에서|으로|까지|로|에|행)$/;
const DELIM = /[,，.\n!?;/→|~]/;

function cand(text, doc, fieldId, start, end) {
  const quote = text.slice(start, end);
  const value = valueFromQuote(fieldId, quote, { receivedAt: doc.receivedAt });
  return value === null ? null : { fieldId, start, end, quote, value };
}

function tokensBefore(text, idx) {
  // idx 직전 토큰들을 거꾸로 모은다. 구분자·불용어·키워드에서 멈춘다.
  const out = [];
  let stopKw = false;
  let pos = idx;
  for (let n = 0; n < 4; n++) {
    const m = /([가-힣A-Za-z0-9\-·:]+)[ \t]*$/.exec(text.slice(0, pos));
    if (!m) break;
    const raw = m[1];
    if (/^(상차|하차)/.test(raw)) { stopKw = true; break; }
    if (STOP.test(raw) || VERBISH.test(raw)) break;
    const stripped = raw.replace(JOSA, '');
    if (stripped.length < 2 || STOP.test(stripped) || !/[가-힣A-Za-z]/.test(stripped) || /^\d{1,2}:\d{2}$/.test(stripped)) break;
    out.unshift({ s: m.index, e: m.index + stripped.length });
    pos = m.index;
  }
  return { toks: out, stopKw };
}

function tokensAfter(text, idx) {
  const out = [];
  let pos = idx;
  for (let n = 0; n < 3; n++) {
    const m = /^[ \t]*([가-힣A-Za-z0-9\-·]+)/.exec(text.slice(pos));
    if (!m) break;
    const raw = m[1];
    if (/^(상차|하차)/.test(raw) || STOP.test(raw) || VERBISH.test(raw)) break;
    const stripped = raw.replace(JOSA, '');
    if (stripped.length < 2 || STOP.test(stripped)) break;
    const s = pos + m[0].length - raw.length;
    out.push({ s, e: s + stripped.length });
    pos = s + raw.length;
  }
  return out;
}

function placeFromKeywords(doc, text, out) {
  // 형태 1: "상차지: 경남 창원시 ..." (이름표 + 쌍점)
  const labeled = /(상차|하차)(?:지|처|장소)?(?:\s*[:：]\s*|(?<=지|처|소)(?:\t|[ ]{2,}))([^\n,，;/→|]+)/g;
  let m;
  const labeledSpans = [];
  while ((m = labeled.exec(text))) {
    const fieldId = m[1] === '상차' ? 'pickup' : 'dropoff';
    let s = m.index + m[0].length - m[2].length;
    let e = s + m[2].replace(/\s+$/, '').length;
    const c = cand(text, doc, fieldId, s, e);
    if (c) out.push(c);
    labeledSpans.push([m.index, m.index + m[0].length]);
  }
  // 형태 2/3: "마산 상차" / "상차 마산"
  const kw = new RegExp(`${KW}(?!지|처|장소|시간|일시|시각)`, 'g');
  while ((m = kw.exec(text))) {
    if (labeledSpans.some(([a, b]) => m.index >= a && m.index < b)) continue;
    const fieldId = m[1] === '상차' ? 'pickup' : 'dropoff';
    const back = tokensBefore(text, m.index);
    const fwd = tokensAfter(text, m.index + m[0].length);
    let toks = back.toks;
    if ((back.stopKw || toks.length === 0) && fwd.length) toks = fwd;
    if (!toks.length) continue;
    const c = cand(text, doc, fieldId, toks[0].s, toks[toks.length - 1].e);
    if (c) out.push(c);
  }
  // 형태 4: 화살표 / "A에서 B로"
  const arrow = /([가-힣A-Za-z]{2,}(?:\s[가-힣]{2,})?)\s*(?:→|->|>)\s*([가-힣A-Za-z]{2,}(?:\s[가-힣]{2,})?)/g;
  while ((m = arrow.exec(text))) {
    if (/(상차|하차)/.test(m[0])) continue;
    const aS = m.index;
    const bS = m.index + m[0].length - m[2].length;
    const a = cand(text, doc, 'pickup', aS, aS + m[1].length);
    const b = cand(text, doc, 'dropoff', bS, bS + m[2].length);
    if (a) out.push(a);
    if (b) out.push(b);
  }
  const from = /([가-힣A-Za-z0-9\-]{2,}?)에서\s+([가-힣A-Za-z0-9\-]{2,}?)(?:으로|로|까지|행)/g;
  while ((m = from.exec(text))) {
    if (STOP.test(m[1]) || STOP.test(m[2])) continue;
    const a = cand(text, doc, 'pickup', m.index, m.index + m[1].length);
    const bS = m.index + m[0].indexOf(m[2], m[1].length + 2);
    const b = cand(text, doc, 'dropoff', bS, bS + m[2].length);
    if (a) out.push(a);
    if (b) out.push(b);
  }
  const go = /([가-힣]{2,}?)(?:으로|로)\s*(?:갑니다|가요|가야|가는|보내|보낼|배송|도착)/g;
  while ((m = go.exec(text))) {
    if (STOP.test(m[1])) continue;
    const c = cand(text, doc, 'dropoff', m.index, m.index + m[1].length);
    if (c) out.push(c);
  }
  // 정정 문장: "하차는 부천으로 변경"
  const fix = /(상차|하차)(?:는|은)?\s*([가-힣]{2,}?)(?:으로|로)\s*(?:변경|수정|바꿔|바꿀|정정)/g;
  while ((m = fix.exec(text))) {
    const fieldId = m[1] === '상차' ? 'pickup' : 'dropoff';
    const s0 = m.index + m[0].indexOf(m[2], m[1].length);
    const c = cand(text, doc, fieldId, s0, s0 + m[2].length);
    if (c) out.push(c);
  }
}

const nearDropoff = (text, idx) => {
  const ctx = text.slice(Math.max(0, idx - 8), idx);
  return /(하차|도착|납품)(?:는|은|일|시간|일시)?[ \t]*$/.test(ctx);
};

function dateTime(doc, text, out) {
  const dateRes = [/(?<![가-힣\d])(오늘|내일|모레)(?![가-힣])/g, /\d{4}-\d{2}-\d{2}/g, /\d{1,2}\s*\/\s*\d{1,2}(?:\s*\([월화수목금토일]\))?(?!\s*(?:까지|이전|전에|마감))/g, /\d{1,2}월\s*\d{1,2}일(?:\s*\([월화수목금토일]\))?(?!\s*(?:까지|이전|전에|마감))/g];
  for (const re of dateRes) {
    let m;
    while ((m = re.exec(text))) {
      if (nearDropoff(text, m.index)) continue;
      const c = cand(text, doc, 'pickupDate', m.index, m.index + m[0].length);
      if (c) out.push(c);
    }
  }
  const timeRes = [/(오전|오후|새벽|저녁)\s*\d{1,2}시(?:\s*\d{1,2}분|\s*반)?/g, /(?<![\d:])\d{1,2}:\d{2}(?![\d:])/g, /(?<![\d:/])(?:1[3-9]|2[0-3])시(?:\s*\d{1,2}분|\s*반)?/g];
  for (const re of timeRes) {
    let m;
    while ((m = re.exec(text))) {
      if (nearDropoff(text, m.index)) continue;
      const c = cand(text, doc, 'pickupTime', m.index, m.index + m[0].length);
      if (c) out.push(c);
    }
  }
}

function tonnage(doc, text, out) {
  const re = /(?<![\d.])\d+(?:\.\d+)?\s*(?:톤|ton|t|T)(?!백|수|[a-zA-Z])/g;
  let m;
  while ((m = re.exec(text))) {
    const c = cand(text, doc, 'tonnage', m.index, m.index + m[0].length);
    if (c) out.push(c);
  }
}

function cargo(doc, text, out) {
  let m;
  const lab = /(?:품목|물품|화물명)\s*[:：]\s*([^\n,，;]+)/g;
  while ((m = lab.exec(text))) {
    const s = m.index + m[0].length - m[1].length;
    const c = cand(text, doc, 'cargo', s, s + m[1].replace(/\s+$/, '').length);
    if (c) out.push(c);
  }
  const unit = /(?:팔레트|파레트|박스|드럼)\s*\d+\s*(?:개|장|박스|PLT)?/g;
  while ((m = unit.exec(text))) {
    const c = cand(text, doc, 'cargo', m.index, m.index + m[0].trimEnd().length);
    if (c) out.push(c);
  }
}

export function ruleExtract(doc) {
  const out = [];
  const text = doc.text;
  placeFromKeywords(doc, text, out);
  dateTime(doc, text, out);
  tonnage(doc, text, out);
  cargo(doc, text, out);
  return out;
}
