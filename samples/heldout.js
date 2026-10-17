// 미리 안 본 합성 문서 — 추출기를 얼려 둔 뒤(커밋 27f930f) 새로 쓴 문서. 첫 실행 결과를 그대로 보고한다(결과를 보고 규칙을 고치면 그 문서는 개발용으로 옮긴다).
const R = '2026-10-19';
const T = (pickup, dropoff, pickupDate, pickupTime, tonnage, cargo = null) => ({ pickup, dropoff, pickupDate, pickupTime, tonnage, cargo });
export const HELDOUT = [
  { id: 'h01', channel: '카톡', receivedAt: R, text: '안녕하세요~ 내일 오후 2시에 인천 남동공단에서 상차하고 안성 물류센터로 하차 부탁드립니다. 2.5톤이면 될 것 같아요', truth: T('인천 남동공단', '안성 물류센터', '2026-10-20', '14:00', 2.5) },
  { id: 'h02', channel: '카톡', receivedAt: R, text: '내일 새벽 5시 부산신항 상차 → 양산 하차, 5톤 윙', truth: T('부산신항', '양산', '2026-10-20', '05:00', 5) },
  { id: 'h03', channel: '메일', receivedAt: R, text: '제목: [운송요청] 10/27 화물 운송 건\n담당자님 안녕하세요.\n하기 내용으로 차량 배차 요청드립니다.\n\n상차지 : 경기도 화성시 팔탄면 노하리 210 (주)가나정밀\n하차지 : 충북 청주시 흥덕구 오송읍 100\n상차시간 : 10/27 오전 08:00\n차종 : 5톤 카고\n품목 : 정밀기계 파레트 6개\n', truth: T('경기도 화성시 팔탄면 노하리 210 (주)가나정밀', '충북 청주시 흥덕구 오송읍 100', '2026-10-27', '08:00', 5, '정밀기계 파레트 6개') },
  { id: 'h04', channel: '카톡', receivedAt: R, text: '내일 마산 상차 인천 하차 1톤, 모레 창원 상차 부산 하차 1톤 부탁드려요', truth: T('CONFLICT', 'CONFLICT', 'CONFLICT', null, 1) },
  { id: 'h05', channel: '카톡', receivedAt: R, text: '낼 오전 9시 마산 상차 인천 하차 1톤', truth: T('마산', '인천', '2026-10-20', '09:00', 1) },
  { id: 'h06', channel: '카톡', receivedAt: R, text: '(사진) 이거 내일 가능한가요?', truth: T(null, null, '2026-10-20', null, null) },
  { id: 'h07', channel: '의뢰서', receivedAt: R, text: '상차지: 진주, 하차지: 서울 가락시장\n일시: 11/2(월) 오전 6시\n차량: 4.5톤', truth: T('진주', '서울 가락시장', '2026-11-02', '06:00', 4.5) },
  { id: 'h08', channel: '카톡', receivedAt: R, text: '내일 오후 2시에 상차하고 4시쯤 하차예정, 마산에서 인천으로 1톤', truth: T('마산', '인천', '2026-10-20', '14:00', 1) },
  { id: 'h09', channel: '메일', receivedAt: R, text: '(이전 메일) 10/15 상차 건은 완료되었습니다.\n이번 건: 10/28 오전 9시 군산 상차 서울 하차 3.5톤', truth: T('군산', '서울', 'CONFLICT', '09:00', 3.5) },
  { id: 'h10', channel: '카톡', receivedAt: R, text: '상차: 여수산단  하차: 광주 첨단  내일 15:30  1톤 냉동', truth: T('여수산단', '광주 첨단', '2026-10-20', '15:30', 1) },
  { id: 'h11', channel: '의뢰서', receivedAt: R, text: '운송 요청서\n상차지: 구미 4공단\n하차지: 인천 신항\n상차일: 10/22\n하차일: 10/23\n상차시간: 09:00\n톤수: 8톤', truth: T('구미 4공단', '인천 신항', '2026-10-22', '09:00', 8) },
  { id: 'h12', channel: '카톡', receivedAt: '2026-10-30', text: '모레 오전 7시 광주 상차 대구 하차 11톤', truth: T('광주', '대구', '2026-11-01', '07:00', 11) },
  { id: 'h13', channel: '카톡', receivedAt: R, text: '마산 상차 인천 하차 내일 9:30 1ton', truth: T('마산', '인천', '2026-10-20', '09:30', 1) },
  { id: 'h14', channel: '카톡', receivedAt: R, text: '서울역 앞에서 상차하고 의정부 하차 오후 3시 모레 1톤', truth: T('서울역 앞', '의정부', '2026-10-21', '15:00', 1) },
  { id: 'h15', channel: '카톡', receivedAt: R, text: '내일 물량 확인차 연락드립니다. 실제 상차는 10/25 오전 10시 대전 상차 광주 하차 1톤', truth: T('대전', '광주', 'CONFLICT', '10:00', 1) },
];
