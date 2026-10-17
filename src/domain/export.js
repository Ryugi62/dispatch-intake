// 승인된 배차표 행 → CSV(엑셀로 열림). 도메인은 I/O를 모른다 — 파일 만들기(BOM·다운로드)는 화면 쪽 몫.
export const CSV_HEADER = ['상차지', '하차지', '상차 일시', '톤수', '품목', '원문 근거'];

// 수식으로 해석될 수 있는 시작 글자(= + - @ 탭)는 작은따옴표로 막는다(CSV 수식 주입 방지)
const guard = (v) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
const cell = (v) => {
  const s = v === null || v === undefined ? '' : String(guard(v));
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function evidenceText(c) {
  const parts = [];
  if (c.pickup) parts.push(`상차지 ${c.pickup}`);
  if (c.dropoff) parts.push(`하차지 ${c.dropoff}`);
  if (c.pickupDate || c.pickupTime) parts.push(`상차 일시 ${[c.pickupDate, c.pickupTime].filter(Boolean).join(' + ')}`);
  if (c.tonnage) parts.push(`톤수 ${c.tonnage}`);
  if (c.cargo) parts.push(`품목 ${c.cargo}`);
  return parts.join(' | ');
}

// results = confirmOrder()가 낸 {row, citations} 목록
export function toCsv(results) {
  const lines = [CSV_HEADER.join(',')];
  for (const { row, citations } of results) {
    lines.push([row.pickup, row.dropoff, row.pickupAt, row.tonnage, row.cargo, evidenceText(citations)].map(cell).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
