import { DEV } from '../../../samples/dev.js';
import { ruleExtract } from '../../adapters/ruleExtractor.js';
import { intake } from '../../application/intake.js';
import { approveField, chooseCandidate, manualEntry, confirmOrder, pendingFields } from '../../domain/order.js';
import { FIELDS, REQUIRED } from '../../domain/fields.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const SHOW = ['d01', 'd05', 'd07', 'd15', 'd11', 'd10'];
const samples = SHOW.map((id) => DEV.find((d) => d.id === id));
const CH = { 카톡: '카카오톡', 메일: '메일', 의뢰서: '의뢰서 PDF(텍스트)' };
const STAT = { proposed: ['승인 대기', 'b-prop'], approved: ['승인함', 'b-ok'], conflict: ['원문이 어긋남 — 고르세요', 'b-conf'], empty: ['원문에 근거 없음', 'b-empty'] };

let doc = null;
let order = null;
let active = null;
let result = null;

function load(d) {
  doc = d;
  order = intake(d, ruleExtract);
  active = null;
  result = null;
  render();
}

function docHtml() {
  const text = doc.text;
  const marks = [];
  for (const f of Object.values(order.fields)) {
    const evs = f.status === 'conflict' ? f.candidates : f.evidence ? [f.evidence] : [];
    for (const e of evs) marks.push({ s: e.start, e: e.end, id: f.id });
  }
  marks.sort((a, b) => a.s - b.s);
  let out = '';
  let pos = 0;
  for (const m of marks) {
    if (m.s < pos) continue;
    out += esc(text.slice(pos, m.s));
    out += `<mark class="${m.id === active ? 'on' : ''}" data-field="${m.id}">${esc(text.slice(m.s, m.e))}</mark>`;
    pos = m.e;
  }
  return out + esc(text.slice(pos));
}

function cellHtml(f) {
  const def = FIELDS.find((x) => x.id === f.id);
  const [bt, bc] = STAT[f.status];
  const unit = f.id === 'tonnage' ? '톤' : '';
  const val = f.value === null || f.value === undefined ? '<span class="val none">비어 있음</span>' : `<span class="val">${esc(String(f.value))}${unit}</span>`;
  let src = '';
  if (f.evidence) src = `<div class="src">원문 <b>「${esc(f.evidence.quote)}」</b> (${f.evidence.start}~${f.evidence.end}번째 글자)</div>`;
  else if (f.manual) src = '<div class="src">출처 <b>사람이 직접 입력</b> — 원문 근거 없음</div>';
  else if (f.status === 'conflict') src = `<div class="src">후보 ${f.candidates.length}개 — 원문에서 서로 다르게 적혀 있어요</div>`;
  else src = '<div class="src">원문에서 찾지 못했어요. 지어내지 않고 비워 둡니다</div>';
  let acts = '';
  if (f.status === 'proposed') acts = `<button data-act="approve" data-field="${f.id}" data-testid="approve-${f.id}">승인</button>`;
  else if (f.status === 'conflict') acts = f.candidates.map((c, i) => `<button class="ghost" data-act="choose" data-field="${f.id}" data-i="${i}" data-testid="choose-${f.id}-${i}">${esc(String(c.value))}${unit}</button>`).join('');
  else if (f.status === 'empty' && def.required) acts = `<span class="manual"><input data-in="${f.id}" placeholder="직접 입력" data-testid="in-${f.id}"><button class="ghost" data-act="manual" data-field="${f.id}" data-testid="manual-${f.id}">넣기</button></span>`;
  return `<div class="cell ${active === f.id ? 'active' : ''}" data-cell="${f.id}" data-testid="cell-${f.id}" data-status="${f.status}"><div class="label">${def.label}${def.required ? '' : ' (선택)'}</div><div><div>${val} <span class="badge ${bc}">${bt}</span></div>${src}</div><div class="acts">${acts}</div></div>`;
}

function render() {
  $('meta').textContent = `${CH[doc.channel] ?? doc.channel} · 받은 날 ${doc.receivedAt}`;
  $('doc').innerHTML = docHtml();
  $('cells').innerHTML = FIELDS.map((f) => cellHtml(order.fields[f.id])).join('');
  const pend = pendingFields(order);
  $('progress').textContent = pend.length ? `필수 ${REQUIRED.length - pend.length}/${REQUIRED.length}칸 승인` : '필수 칸 전부 승인됨';
  $('confirm').disabled = pend.length > 0;
  $('cells').classList.toggle('done', Boolean(result));
  const r = $('result');
  if (result) {
    r.hidden = false;
    const cit = result.citations;
    const rows = [['상차지', result.row.pickup, cit.pickup], ['하차지', result.row.dropoff, cit.dropoff], ['상차 일시', result.row.pickupAt, `${cit.pickupDate} + ${cit.pickupTime}`], ['톤수', `${result.row.tonnage}톤`, cit.tonnage]];
    if (result.row.cargo) rows.push(['품목', result.row.cargo, cit.cargo]);
    r.innerHTML = `<h3>배차표에 올렸어요</h3><table>${rows.map(([k, v, c]) => `<tr><td>${k}</td><td><b>${esc(String(v))}</b></td><td class="hint">원문 「${esc(String(c))}」</td></tr>`).join('')}</table>`;
  } else r.hidden = true;
}

function on(sel, ev, fn) { document.addEventListener(ev, (e) => { const t = e.target.closest(sel); if (t) fn(t, e); }); }
on('[data-act="approve"]', 'click', (t) => { order = approveField(order, t.dataset.field); active = t.dataset.field; render(); });
on('[data-act="choose"]', 'click', (t) => { order = chooseCandidate(order, t.dataset.field, Number(t.dataset.i)); active = t.dataset.field; render(); });
on('[data-act="manual"]', 'click', (t) => {
  const id = t.dataset.field;
  const v = document.querySelector(`[data-in="${id}"]`).value.trim();
  if (!v) return;
  order = manualEntry(order, id, id === 'tonnage' ? Number(v) : v);
  active = id;
  render();
});
on('[data-cell]', 'mouseover', (t) => {
  if (active === t.dataset.cell) return;
  active = t.dataset.cell;
  $('doc').innerHTML = docHtml();
  document.querySelectorAll('.cell').forEach((c) => c.classList.toggle('active', c.dataset.cell === active));
});
$('confirm').addEventListener('click', () => { result = confirmOrder(order); render(); });
$('sample').addEventListener('change', (e) => load(samples[Number(e.target.value)]));
$('ownGo').addEventListener('click', () => {
  const text = $('ownText').value;
  if (!text.trim()) return;
  load({ id: 'own', channel: '카톡', receivedAt: $('ownDate').value || '2026-10-19', text });
});
$('sample').innerHTML = samples.map((d, i) => `<option value="${i}">${CH[d.channel]} · ${d.id}</option>`).join('');
if (location.search.includes('compact')) document.body.classList.add('compact'); // 영상 촬영용 촘촘한 배치
window.__demo = { load, samples, get order() { return order; } };
load(samples[0]);
