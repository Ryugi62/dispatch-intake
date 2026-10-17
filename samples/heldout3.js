// H3 — H1·H2로 규칙을 고친 뒤(그 다음 커밋) 새로 쓴 미리 안 본 문서. 첫 실행 결과를 FIRST-RUN.md에 그대로 적는다.
const R = '2026-10-19';
const T = (pickup, dropoff, pickupDate, pickupTime, tonnage, cargo = null) => ({ pickup, dropoff, pickupDate, pickupTime, tonnage, cargo });
export const HELDOUT3 = [
  { id: 'm01', channel: '카톡', receivedAt: R, text: '내일 오전 10시 양산 물류센터 상차, 울산 북구 하차입니다 2.5톤 박스 20개', truth: T('양산 물류센터', '울산 북구', '2026-10-20', '10:00', 2.5, '박스 20개') },
  { id: 'm02', channel: '메일', receivedAt: R, text: '[배차요청]\n상차지: 충남 아산시 탕정면 삼성로 181\n하차지: 경기 이천시 부발읍 경충대로 2091\n상차일시: 2026-10-27 06:30\n차량: 5톤 윙바디 1대', truth: T('충남 아산시 탕정면 삼성로 181', '경기 이천시 부발읍 경충대로 2091', '2026-10-27', '06:30', 5) },
  { id: 'm03', channel: '카톡', receivedAt: R, text: '10월 25일(일) 오후 3시 창원 상차 / 서울 하차 / 11톤', truth: T('창원', '서울', '2026-10-25', '15:00', 11) },
  { id: 'm04', channel: '카톡', receivedAt: R, text: '혹시 부산에서 대구까지 1톤 얼마예요?', truth: T('부산', '대구', null, null, 1) },
  { id: 'm05', channel: '카톡', receivedAt: R, text: '모레 아침 7시 남양주 상차 여주 하차 1톤', truth: T('남양주', '여주', '2026-10-21', null, 1) },
  { id: 'm06', channel: '의뢰서', receivedAt: R, text: '상차지\t전남 광양시 금호동 3\n하차지\t경남 사천시 용현면 5\n상차일시\t10/29 오전 9시 30분\n톤수\t8톤', truth: T('전남 광양시 금호동 3', '경남 사천시 용현면 5', '2026-10-29', '09:30', 8) },
  { id: 'm07', channel: '카톡', receivedAt: R, text: '내일 오후 4시 대전 상차 천안 하차 1톤 근데 5톤 쓸 수도 있어요', truth: T('대전', '천안', '2026-10-20', '16:00', 'CONFLICT') },
  { id: 'm08', channel: '카톡', receivedAt: R, text: '월요일 상차 마산 하차 서울 3.5톤', truth: T('마산', '서울', null, null, 3.5) },
  { id: 'm09', channel: '메일', receivedAt: R, text: '안녕하세요. 다음 주 수요일(10/28) 오전 11시에 포항 영일만항에서 상차, 대구 성서공단으로 하차 요청드립니다. 톤수는 5톤입니다.', truth: T('포항 영일만항', '대구 성서공단', '2026-10-28', '11:00', 5) },
  { id: 'm10', channel: '카톡', receivedAt: R, text: '사장님 오늘 되나요? 오후 6시 인천 상차 서산 하차 1톤', truth: T('인천', '서산', '2026-10-19', '18:00', 1) },
];
