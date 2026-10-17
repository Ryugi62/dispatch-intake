// 칸 정의 — 유비쿼터스 언어. 도메인은 I/O를 모른다.
export const FIELDS = [
  { id: 'pickup', label: '상차지', required: true },
  { id: 'dropoff', label: '하차지', required: true },
  { id: 'pickupDate', label: '상차 날짜', required: true },
  { id: 'pickupTime', label: '상차 시각', required: true },
  { id: 'tonnage', label: '톤수', required: true },
  { id: 'cargo', label: '품목', required: false },
];
export const REQUIRED = FIELDS.filter((f) => f.required).map((f) => f.id);
export const fieldLabel = (id) => FIELDS.find((f) => f.id === id)?.label ?? id;
