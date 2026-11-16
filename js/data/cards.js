import { MAJOR } from './major.js';
import { MINOR, SUITS } from './minor.js';

/** 78장 전체. 인덱스 순서는 전통적인 덱 순서(메이저 0-21 → 완드 → 컵 → 소드 → 펜타클). */
export const DECK = [...MAJOR, ...MINOR];

export { SUITS };

export const CARD_BY_ID = new Map(DECK.map(c => [c.id, c]));

/** 이미지 저작권 정보. UI 하단 고지에 사용. */
export const IMAGE_CREDIT = {
  title: 'Rider–Waite–Smith Tarot (1909)',
  artist: 'Pamela Colman Smith (1878–1951)',
  status: '퍼블릭 도메인 — 미국은 1909년 발행 후 저작권 미갱신, 영국/EU는 2022년 1월 1일부터',
  source: 'Wikimedia Commons',
  note: '본 사이트는 1909년 원본 스캔만 사용하며, 후대 상업 판본의 재채색 이미지는 포함하지 않는다.'
};

if (DECK.length !== 78) {
  console.error(`덱 구성 오류: ${DECK.length}장 (78장이어야 함)`);
}
