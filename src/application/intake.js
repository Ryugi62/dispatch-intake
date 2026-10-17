import { buildOrder } from '../domain/order.js';

// 추출기 포트: (문서) => 후보 목록. 규칙이든 언어모델이든 결과는 buildOrder의 근거 검증을 통과해야 칸이 된다.
export function intake(doc, extractor) {
  return buildOrder(doc, extractor(doc));
}
