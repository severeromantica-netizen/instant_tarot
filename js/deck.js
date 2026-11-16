/**
 * 덱 엔진.
 *
 * 설계 원칙
 *  - 카드의 정/역방향은 "뽑는 순간"이 아니라 "섞는 순간"에 결정된다.
 *    실제 덱에서 일부 카드를 뒤집어 섞어두는 것과 같고, 숫자를 지정해 뽑을 때
 *    결과가 뽑기 방식에 따라 달라지지 않는다.
 *  - 무작위성은 crypto.getRandomValues를 쓰고, 나머지 연산 편향을 제거한다.
 *  - 뽑기는 두 방식 모두 같은 풀에서 카드를 "제거"한다. 한 리딩에 같은 카드가
 *    두 번 나오지 않는다.
 */

/** 0 이상 max 미만의 정수. 거부 표본추출로 모듈로 편향을 없앤다. */
export function randomInt(max) {
  if (max <= 0) throw new RangeError('max must be > 0');
  if (max === 1) return 0;

  const bytesNeeded = Math.ceil(Math.log2(max) / 8) || 1;
  const maxValue = 256 ** bytesNeeded;
  const limit = maxValue - (maxValue % max); // 이 값 이상은 버린다
  const buf = new Uint8Array(bytesNeeded);

  for (;;) {
    crypto.getRandomValues(buf);
    let value = 0;
    for (let i = 0; i < bytesNeeded; i++) value = value * 256 + buf[i];
    if (value < limit) return value % max;
  }
}

/** Fisher–Yates. 원본 배열을 바꾸지 않는다. */
export function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Deck {
  /**
   * @param {object[]} cards            78장 카드 데이터
   * @param {object}   opts
   * @param {boolean}  opts.allowReversed  역방향 사용 여부
   * @param {number}   opts.reversedRate   역방향 확률 (0~1)
   */
  constructor(cards, { allowReversed = true, reversedRate = 0.5 } = {}) {
    this.source = cards;
    this.allowReversed = allowReversed;
    this.reversedRate = reversedRate;
    this.pool = [];
    this.drawn = [];
    this.shuffle();
  }

  /** 전체를 되돌리고 다시 섞는다. 방향도 이때 결정된다. */
  shuffle() {
    this.pool = shuffled(this.source).map(card => ({
      card,
      reversed: this.allowReversed && randomInt(10000) < this.reversedRate * 10000
    }));
    this.drawn = [];
    return this;
  }

  get remaining() {
    return this.pool.length;
  }

  get drawnCount() {
    return this.drawn.length;
  }

  /** 남은 카드 중 무작위 한 장. */
  drawRandom() {
    if (this.pool.length === 0) return null;
    return this._take(randomInt(this.pool.length));
  }

  /**
   * 남은 카드 중 position번째(1부터) 카드.
   * @param {number} position 1 ~ remaining
   */
  drawAt(position) {
    const n = Number(position);
    if (!Number.isInteger(n) || n < 1 || n > this.pool.length) {
      throw new RangeError(`1부터 ${this.pool.length} 사이의 숫자를 입력하세요.`);
    }
    return this._take(n - 1);
  }

  /** 남은 카드를 한 번에 n장 무작위로 뽑는다. */
  drawMany(n) {
    const out = [];
    for (let i = 0; i < n && this.pool.length; i++) out.push(this.drawRandom());
    return out;
  }

  /** 가장 마지막에 뽑은 카드를 덱으로 되돌린다(원래 위치가 아니라 무작위 위치로). */
  undo() {
    const last = this.drawn.pop();
    if (!last) return null;
    const { card, reversed } = last;
    this.pool.splice(randomInt(this.pool.length + 1), 0, { card, reversed });
    return last;
  }

  _take(index) {
    const [entry] = this.pool.splice(index, 1);
    const result = {
      card: entry.card,
      reversed: entry.reversed,
      /** 몇 번째로 뽑은 카드인지 (1부터) */
      order: this.drawn.length + 1,
      /** 뽑을 때 남아 있던 장수 */
      fromRemaining: this.pool.length + 1,
      /** 지정 뽑기였다면 입력한 숫자 */
      pickedAt: index + 1
    };
    this.drawn.push(result);
    return result;
  }
}

/** 카드 한 장의 현재 방향에 맞는 해석을 꺼낸다. */
export function readingFor(entry) {
  const { card, reversed } = entry;
  return {
    orientation: reversed ? '역방향' : '정방향',
    keywords: reversed ? card.keyRev : card.keyUp,
    text: reversed ? card.rev : card.up
  };
}
