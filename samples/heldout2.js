// H2 — 안전장치(eae698e) 이후 새로 쓴 미리 안 본 문서. 첫 실행 결과를 samples/FIRST-RUN.md에 그대로 적는다.
const R = '2026-10-19';
const T = (pickup, dropoff, pickupDate, pickupTime, tonnage, cargo = null) => ({ pickup, dropoff, pickupDate, pickupTime, tonnage, cargo });
export const HELDOUT2 = [
  { id: 'k01', channel: '카톡', receivedAt: R, text: '사장님 모레 오전 8시 반 김포 상차해서 파주 하차예요. 1톤 냉장이고 박스 30개입니다', truth: T('김포', '파주', '2026-10-21', '08:30', 1, '박스 30개') },
  { id: 'k02', channel: '카톡', receivedAt: R, text: '10/24 오후 1시 진천 상차\n하차 세종\n5톤', truth: T('진천', '세종', '2026-10-24', '13:00', 5) },
  { id: 'k03', channel: '메일', receivedAt: R, text: '안녕하세요, 예시전자 구매팀입니다.\n\n상차지: 경북 구미시 산동읍 첨단로 53\n하차지: 경남 창원시 성산구 공단로 11\n상차 희망일: 2026-10-26\n상차 희망시간: 14:00\n톤수: 3.5톤\n품목: 모니터 팔레트 10개\n\n담당: 홍길동 (지어낸 이름)', truth: T('경북 구미시 산동읍 첨단로 53', '경남 창원시 성산구 공단로 11', '2026-10-26', '14:00', 3.5, '모니터 팔레트 10개') },
  { id: 'k04', channel: '카톡', receivedAt: R, text: '오늘 오후 5시 시흥 상차 인천 하차 1톤 가능한가요', truth: T('시흥', '인천', '2026-10-19', '17:00', 1) },
  { id: 'k05', channel: '카톡', receivedAt: R, text: '화요일 아침에 마산 → 부산 1톤이요', truth: T('마산', '부산', null, null, 1) },
  { id: 'k06', channel: '카톡', receivedAt: R, text: '내일 오전 11시 청주 상차 광주 하차 2.5톤 아니고 5톤으로 해주세요', truth: T('청주', '광주', '2026-10-20', '11:00', 'CONFLICT') },
  { id: 'k07', channel: '의뢰서', receivedAt: R, text: '화물 운송 의뢰서\n상차지  경남 김해시 진영읍 100\n하차지  경기 안성시 공도읍 200\n상차일시 10월 28일 오전 7시\n차량  11톤 윙바디', truth: T('경남 김해시 진영읍 100', '경기 안성시 공도읍 200', '2026-10-28', '07:00', 11) },
  { id: 'k08', channel: '카톡', receivedAt: R, text: '내일 오후 2시 인천 상차 하차는 모레 오전 10시 대전 1톤', truth: T('인천', '대전', '2026-10-20', '14:00', 1) },
  { id: 'k09', channel: '카톡', receivedAt: R, text: '제주 → 부산 컨테이너 가능? 날짜는 다음 주쯤', truth: T('제주', '부산', null, null, null) },
  { id: 'k10', channel: '메일', receivedAt: R, text: '아래 건 확인 부탁드립니다.\n- 10/23 오전 9시 상차 (창원)\n- 도착지: 서울 가락동\n- 2.5톤', truth: T('창원', '서울 가락동', '2026-10-23', '09:00', 2.5) },
  { id: 'k11', channel: '카톡', receivedAt: R, text: '상차 울산 하차 포항 내일 16시 5톤 팔레트 14개', truth: T('울산', '포항', '2026-10-20', '16:00', 5, '팔레트 14개') },
  { id: 'k12', channel: '카톡', receivedAt: R, text: '어제 보낸 1톤 건 취소할게요. 새로 내일 오전 9시 천안 상차 평택 하차 3.5톤 부탁해요', truth: T('천안', '평택', '2026-10-20', '09:00', 'CONFLICT') },
];
