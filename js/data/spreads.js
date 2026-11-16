/**
 * 스프레드 정의.
 *
 * ── 스프레드를 추가하는 방법 ───────────────────────────────────────────
 * SPREADS 배열에 아래 형태의 객체 하나를 추가하면 UI·뽑기·해석이 전부 자동으로 붙는다.
 * 코드를 고칠 필요는 없다.
 *
 *   {
 *     id:      'my_spread',          // 고유값
 *     nameKo:  '내 스프레드',
 *     nameEn:  'My Spread',
 *     desc:    '언제 쓰는 스프레드인지 한 줄 설명',
 *     enabled: true,                 // false면 목록에 나오지 않는다
 *     layout:  { type: 'row' },      // 'row' | 'grid' | 'free'
 *     variants: [                    // 같은 배치에 자리 의미만 다른 변형들
 *       {
 *         id: 'default',
 *         nameKo: '기본',
 *         positions: [
 *           { label: '자리 이름', meaning: '이 자리가 무엇을 말하는지' },
 *           ...
 *         ]
 *       }
 *     ]
 *   }
 *
 * layout.type 별 좌표 규칙
 *   'row'  : 좌→우 한 줄. 좌표 불필요.
 *   'grid' : layout.cols 열 수를 주고, positions에 col/row(1부터)를 준다.
 *   'free' : positions에 x/y(0~100 백분율)와 선택적으로 rotate(도)를 준다.
 *            x/y는 카드 중심 기준이다.
 * ──────────────────────────────────────────────────────────────────────
 */

export const SPREADS = [
  {
    id: 'one',
    nameKo: '원 카드',
    nameEn: 'One Card',
    desc: '하루의 기운이나 한 가지 질문에 대한 가장 짧은 답.',
    enabled: true,
    layout: { type: 'row' },
    variants: [
      {
        id: 'today',
        nameKo: '오늘의 카드',
        positions: [
          { label: '오늘', meaning: '지금 이 시점에 가장 크게 작용하는 기운. 하루를 어떤 태도로 보낼지에 대한 답이다.' }
        ]
      },
      {
        id: 'answer',
        nameKo: '질문의 답',
        positions: [
          { label: '답', meaning: '질문의 핵심에 대한 단일한 응답. 조건이나 과정을 묻지 않고 본질만 본다.' }
        ]
      },
      {
        id: 'advice',
        nameKo: '지금 필요한 조언',
        positions: [
          { label: '조언', meaning: '상황을 바꾸기 위해 지금 취해야 할 태도나 행동.' }
        ]
      }
    ]
  },

  {
    id: 'three',
    nameKo: '쓰리 카드',
    nameEn: 'Three Cards',
    desc: '흐름과 구조를 함께 보는 가장 널리 쓰이는 3장 배치.',
    enabled: true,
    layout: { type: 'row' },
    variants: [
      {
        id: 'time',
        nameKo: '과거 · 현재 · 미래',
        positions: [
          { label: '과거', meaning: '지금의 상황을 만든 배경과 이미 지나간 원인. 바꿀 수 없지만 이해해야 하는 것.' },
          { label: '현재', meaning: '질문자가 지금 서 있는 자리. 가장 중요하게 읽어야 할 카드다.' },
          { label: '미래', meaning: '현재의 흐름이 그대로 이어졌을 때 도달하는 지점. 확정된 운명이 아니라 방향이다.' }
        ]
      },
      {
        id: 'situation',
        nameKo: '상황 · 행동 · 결과',
        positions: [
          { label: '상황', meaning: '질문을 둘러싼 현재 조건. 내가 통제할 수 없는 부분까지 포함한다.' },
          { label: '행동', meaning: '그 상황에서 내가 취해야 할 구체적인 움직임.' },
          { label: '결과', meaning: '제시된 행동을 택했을 때 따라오는 결과.' }
        ]
      },
      {
        id: 'mind',
        nameKo: '마음 · 상대 · 관계',
        positions: [
          { label: '나의 마음', meaning: '질문자 자신이 이 관계에서 품고 있는 진짜 감정과 바람.' },
          { label: '상대의 마음', meaning: '상대가 이 관계를 바라보는 방식. 겉으로 드러낸 태도가 아닌 속마음이다.' },
          { label: '관계의 흐름', meaning: '두 사람 사이에서 지금 실제로 작동하고 있는 힘과 그 방향.' }
        ]
      },
      {
        id: 'choice',
        nameKo: '선택 A · 선택 B · 기준',
        positions: [
          { label: '선택 A', meaning: '첫 번째 길을 택했을 때 펼쳐지는 국면.' },
          { label: '선택 B', meaning: '두 번째 길을 택했을 때 펼쳐지는 국면.' },
          { label: '판단 기준', meaning: '두 선택을 가늠할 때 놓치고 있는 관점. 무엇을 중심에 두어야 하는지 알려준다.' }
        ]
      },
      {
        id: 'obstacle',
        nameKo: '문제 · 원인 · 해법',
        positions: [
          { label: '문제', meaning: '지금 겉으로 드러나 있는 어려움의 모양.' },
          { label: '원인', meaning: '그 어려움을 실제로 만들고 있는 뿌리. 보통 표면과 다르다.' },
          { label: '해법', meaning: '뿌리를 다루기 위한 접근. 증상이 아닌 원인에 대한 처방이다.' }
        ]
      }
    ]
  },

  /* ─────────────────────────────────────────────────────────────────────
   * 아래는 다음 버전용으로 미리 작성해 둔 스프레드다.
   * enabled를 true로 바꾸면 그 즉시 목록에 나타나고 정상 동작한다.
   * ───────────────────────────────────────────────────────────────────── */

  {
    id: 'celtic',
    nameKo: '켈틱 크로스',
    nameEn: 'Celtic Cross',
    desc: '한 사안을 열 개의 각도에서 보는 고전 10장 배치.',
    enabled: false,
    layout: { type: 'free' },
    variants: [
      {
        id: 'classic',
        nameKo: '고전형',
        positions: [
          { label: '1. 현재 상황', meaning: '질문의 중심. 지금 무엇이 일어나고 있는가.', x: 30, y: 50 },
          { label: '2. 당면 과제', meaning: '현재 상황을 가로지르는 힘. 장애일 수도, 도움일 수도 있다.', x: 30, y: 50, rotate: 90 },
          { label: '3. 뿌리', meaning: '의식 아래 깔린 토대. 이 사안의 근본 원인.', x: 30, y: 80 },
          { label: '4. 지나간 것', meaning: '막 지나갔거나 영향력이 빠지고 있는 요소.', x: 10, y: 50 },
          { label: '5. 드러난 목표', meaning: '의식적으로 바라는 것, 혹은 머리 위에 걸린 가능성.', x: 30, y: 20 },
          { label: '6. 다가오는 것', meaning: '가까운 장래에 들어올 요소.', x: 50, y: 50 },
          { label: '7. 나의 태도', meaning: '질문자가 이 사안을 대하는 방식과 자기 인식.', x: 78, y: 85 },
          { label: '8. 주변 환경', meaning: '타인과 외부 조건이 미치는 영향.', x: 78, y: 62 },
          { label: '9. 희망과 두려움', meaning: '기대와 불안이 함께 담긴 자리. 둘은 보통 같은 뿌리다.', x: 78, y: 39 },
          { label: '10. 결말', meaning: '지금의 흐름이 이어질 때 이 사안이 닿는 지점.', x: 78, y: 16 }
        ]
      }
    ]
  },

  {
    id: 'relationship',
    nameKo: '관계 스프레드',
    nameEn: 'Relationship Spread',
    desc: '두 사람 사이를 다섯 자리로 나누어 보는 배치.',
    enabled: false,
    layout: { type: 'free' },
    variants: [
      {
        id: 'five',
        nameKo: '5장형',
        positions: [
          { label: '나', meaning: '내가 이 관계에 가져오는 것.', x: 18, y: 30 },
          { label: '상대', meaning: '상대가 이 관계에 가져오는 것.', x: 82, y: 30 },
          { label: '연결', meaning: '두 사람을 실제로 잇고 있는 것.', x: 50, y: 50 },
          { label: '걸림돌', meaning: '관계를 어렵게 만드는 요소.', x: 50, y: 15 },
          { label: '방향', meaning: '이 관계가 향하고 있는 곳.', x: 50, y: 85 }
        ]
      }
    ]
  }
];

export const ACTIVE_SPREADS = SPREADS.filter(s => s.enabled);

export function getSpread(id) {
  return SPREADS.find(s => s.id === id) || ACTIVE_SPREADS[0];
}

export function getVariant(spread, variantId) {
  return spread.variants.find(v => v.id === variantId) || spread.variants[0];
}
