/**
 * 카드 그림 두 가지를 모두 제공한다.
 *
 *  art = 'scan'  1909년 원본 퍼블릭 도메인 스캔 (assets/cards/ → 위키미디어 공용 → SVG 폴백)
 *  art = 'svg'   코드로 그리는 자체 기하 심볼 카드 (외부 의존 없음, 저작권 무관)
 *
 * 'scan' 모드에서 이미지 로드가 실패하면 자동으로 해당 카드만 SVG로 대체한다.
 */

import { SUITS } from './data/minor.js';

/** 로컬에 내려받은 스캔 경로. tools/fetch-cards.sh로 채운다. */
const LOCAL_BASE = 'assets/cards/';

/** 로컬에 파일이 없을 때 쓰는 위키미디어 공용 원본 경로. */
const COMMONS_BASE = 'https://commons.wikimedia.org/wiki/Special:FilePath/';

export const CARD_W = 300;
export const CARD_H = 520;

/**
 * 로컬 스캔이 있는지 한 번만 판정하고 기억한다.
 * null = 아직 모름, true = 있음, false = 없음(바로 공용으로 간다).
 * 이게 없으면 스캔을 내려받지 않은 배포에서 카드마다 404가 한 번씩 난다.
 */
let localAvailable = null;

/** 스캔을 아예 못 받는 환경이라는 사실을 한 번만 알리기 위한 표시. */
let scanUnavailableNotified = false;

export function localUrl(card) {
  return LOCAL_BASE + card.file;
}

export function commonsUrl(card, width = 600) {
  return `${COMMONS_BASE}${encodeURIComponent(card.file)}?width=${width}`;
}

/* ───────────────────────── 메이저 심볼 ───────────────────────── */
/* 전통 도상을 베낀 것이 아니라 각 카드의 의미를 기하 도형으로 옮긴 자체 디자인이다. */

/** 무한대 기호(렘니스케이트). 호(arc)로 그리면 초승달이 되므로 베지에로 그린다. */
const infinity = (cx, cy, w, h) =>
  `M${cx - w} ${cy} C${cx - w} ${cy - h}, ${cx} ${cy - h}, ${cx} ${cy}` +
  ` C${cx} ${cy + h}, ${cx + w} ${cy + h}, ${cx + w} ${cy}` +
  ` C${cx + w} ${cy - h}, ${cx} ${cy - h}, ${cx} ${cy}` +
  ` C${cx} ${cy + h}, ${cx - w} ${cy + h}, ${cx - w} ${cy} Z`;

const S = {
  fool: `
    <circle cx="150" cy="120" r="26" class="ln"/>
    <path d="M150 146 L150 215" class="ln"/>
    <path d="M110 180 L150 165 L190 150" class="ln"/>
    <path d="M150 215 L122 290 M150 215 L182 288" class="ln"/>
    <path d="M60 330 Q150 300 240 330" class="ln dash"/>
    <path d="M60 330 L60 360 M240 330 L240 360" class="ln soft"/>`,
  magician: `
    <path d="${infinity(150, 112, 34, 30)}" class="ln"/>
    <path d="M150 150 L150 330" class="ln"/>
    <path d="M100 150 L200 150" class="ln"/>
    <circle cx="105" cy="250" r="9" class="fl"/><circle cx="195" cy="250" r="9" class="fl"/>
    <circle cx="105" cy="300" r="9" class="fl"/><circle cx="195" cy="300" r="9" class="fl"/>`,
  priestess: `
    <path d="M95 110 L95 350 M205 110 L205 350" class="ln"/>
    <path d="M150 140 a40 40 0 1 0 0 80 a30 30 0 1 1 0 -80" class="ln"/>
    <path d="M110 265 Q150 245 190 265 Q150 285 110 265" class="ln soft"/>
    <path d="M150 300 L150 350" class="ln soft"/>`,
  empress: `
    <circle cx="150" cy="200" r="72" class="ln"/>
    ${Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      return `<circle cx="${(150 + Math.cos(a) * 100).toFixed(1)}" cy="${(200 + Math.sin(a) * 100).toFixed(1)}" r="4.5" class="fl"/>`;
    }).join('')}
    <path d="M150 272 L150 350 M150 300 L120 320 M150 300 L180 320" class="ln soft"/>`,
  emperor: `
    <path d="M90 170 L90 340 L210 340 L210 170 Z" class="ln"/>
    <path d="M90 170 L105 130 L127 162 L150 118 L173 162 L195 130 L210 170" class="ln"/>
    <path d="M118 340 L118 250 L182 250 L182 340" class="ln soft"/>`,
  hierophant: `
    <path d="M150 100 L150 360" class="ln"/>
    <path d="M100 150 L200 150 M110 200 L190 200 M120 250 L180 250" class="ln"/>
    <circle cx="150" cy="315" r="20" class="ln"/>
    <path d="M150 335 L150 360 M138 350 L162 350" class="ln soft"/>`,
  lovers: `
    <circle cx="118" cy="220" r="66" class="ln"/>
    <circle cx="182" cy="220" r="66" class="ln"/>
    <path d="M150 165 L150 275" class="ln soft"/>
    <circle cx="150" cy="120" r="7" class="fl"/>`,
  chariot: `
    <path d="M85 170 L215 170 L215 265 L85 265 Z" class="ln"/>
    <circle cx="112" cy="305" r="34" class="ln"/><circle cx="188" cy="305" r="34" class="ln"/>
    <circle cx="112" cy="305" r="7" class="fl"/><circle cx="188" cy="305" r="7" class="fl"/>
    <path d="M150 170 L150 120 M125 130 L175 130" class="ln soft"/>`,
  strength: `
    <path d="${infinity(150, 168, 42, 36)}" class="ln"/>
    <path d="M62 310 Q150 232 238 310" class="ln"/>
    <path d="M104 310 Q150 268 196 310" class="ln soft"/>
    <path d="M150 232 L150 262" class="ln soft"/>
    <circle cx="150" cy="96" r="5" class="fl"/>`,
  hermit: `
    <path d="M110 150 L150 110 L190 150 L190 215 L110 215 Z" class="ln"/>
    <circle cx="150" cy="182" r="18" class="fl"/>
    <path d="M150 215 L150 380" class="ln"/>
    <path d="M60 250 L96 190 M240 250 L204 190" class="ln dash"/>`,
  wheel: `
    <circle cx="150" cy="235" r="105" class="ln"/>
    <circle cx="150" cy="235" r="62" class="ln soft"/>
    <circle cx="150" cy="235" r="14" class="fl"/>
    ${Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      return `<path d="M${(150 + c * 62).toFixed(1)} ${(235 + s * 62).toFixed(1)} L${(150 + c * 105).toFixed(1)} ${(235 + s * 105).toFixed(1)}" class="ln"/>`;
    }).join('')}`,
  justice: `
    <path d="M150 115 L150 345" class="ln"/>
    <path d="M70 165 L230 165" class="ln"/>
    <path d="M70 165 L70 200 M230 165 L230 200" class="ln soft"/>
    <path d="M38 200 L102 200 L70 245 Z" class="ln"/>
    <path d="M198 200 L262 200 L230 245 Z" class="ln"/>
    <path d="M115 345 L185 345" class="ln"/>`,
  hanged: `
    <path d="M70 120 L230 120" class="ln"/>
    <path d="M150 120 L150 190" class="ln"/>
    <path d="M90 190 L210 190 L150 320 Z" class="ln"/>
    <circle cx="150" cy="235" r="16" class="fl"/>`,
  death: `
    <path d="M60 300 L240 300" class="ln"/>
    <path d="M150 300 L96 170 L204 170 Z" class="ln"/>
    <circle cx="150" cy="130" r="18" class="ln soft"/>
    <path d="M85 340 L215 340" class="ln dash"/>
    <path d="M110 375 L190 375" class="ln dash soft"/>`,
  temperance: `
    <path d="M150 130 L218 250 L82 250 Z" class="ln"/>
    <path d="M150 370 L82 250 L218 250 Z" class="ln soft"/>
    <path d="M150 150 q-22 30 0 50 q22 30 0 50 q-22 30 0 50" class="ln"/>
    <circle cx="150" cy="250" r="6" class="fl"/>`,
  devil: `
    <circle cx="150" cy="160" r="30" class="ln"/>
    <circle cx="150" cy="235" r="30" class="ln"/>
    <circle cx="112" cy="310" r="28" class="ln"/>
    <circle cx="188" cy="310" r="28" class="ln"/>
    <path d="M150 190 L150 205 M138 262 L124 285 M162 262 L176 285" class="ln"/>
    <path d="M118 110 L132 138 M182 110 L168 138" class="ln soft"/>`,
  tower: `
    <path d="M105 360 L105 165 L195 165 L195 360" class="ln"/>
    <path d="M95 165 L205 165 L205 140 L95 140 Z" class="ln"/>
    <path d="M150 90 L126 150 L160 150 L134 215" class="ln bold"/>
    <path d="M70 290 L105 265 M230 290 L195 265" class="ln dash"/>
    <path d="M60 360 L240 360" class="ln soft"/>`,
  star: `
    ${(() => {
      const pts = Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? 76 : 30;
        return `${(150 + Math.cos(a) * r).toFixed(1)},${(215 + Math.sin(a) * r).toFixed(1)}`;
      }).join(' ');
      return `<polygon points="${pts}" class="ln"/>`;
    })()}
    ${[[62, 118], [238, 118], [48, 215], [252, 215], [78, 320], [222, 320], [150, 360]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" class="fl"/>`).join('')}`,
  moon: `
    <path d="M150 120 a72 72 0 1 0 0 144 a56 56 0 1 1 0 -144" class="ln"/>
    <path d="M78 380 L78 300 L98 300 L98 380 M202 380 L202 300 L222 300 L222 380" class="ln soft"/>
    <path d="M60 340 q22 -18 45 0 q22 18 45 0 q22 -18 45 0 q22 18 45 0" class="ln dash"/>`,
  sun: `
    <circle cx="150" cy="215" r="58" class="ln"/>
    ${Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      return `<path d="M${(150 + c * 72).toFixed(1)} ${(215 + s * 72).toFixed(1)} L${(150 + c * (i % 2 ? 96 : 112)).toFixed(1)} ${(215 + s * (i % 2 ? 96 : 112)).toFixed(1)}" class="ln"/>`;
    }).join('')}
    <circle cx="150" cy="215" r="16" class="fl"/>`,
  judgement: `
    <path d="M60 330 L240 330" class="ln"/>
    <path d="M150 130 L205 300 L95 300 Z" class="ln"/>
    ${Array.from({ length: 7 }, (_, i) => {
      const a = -Math.PI / 2 + (i - 3) * 0.3;
      return `<path d="M${(150 + Math.cos(a) * 68).toFixed(1)} ${(130 + Math.sin(a) * 68 + 40).toFixed(1)} L${(150 + Math.cos(a) * 112).toFixed(1)} ${(130 + Math.sin(a) * 112 + 40).toFixed(1)}" class="ln dash"/>`;
    }).join('')}
    <path d="M100 365 L200 365" class="ln soft"/>`,
  world: `
    <ellipse cx="150" cy="230" rx="78" ry="108" class="ln"/>
    <ellipse cx="150" cy="230" rx="60" ry="88" class="ln soft"/>
    <circle cx="150" cy="230" r="10" class="fl"/>
    ${[[58, 112], [242, 112], [58, 348], [242, 348]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="12" class="ln"/>`).join('')}`
};

/* ───────────────────────── 마이너 수트 글리프 ───────────────────────── */

const GLYPH = {
  wand: `<g><path d="M0 -17 L0 17" class="ln"/><path d="M0 -8 q8 -8 13 -2 q-8 8 -13 2" class="ln"/><path d="M0 2 q-8 -8 -13 -2 q8 8 13 2" class="ln"/></g>`,
  cup: `<g><path d="M-11 -12 L11 -12 L7 4 L-7 4 Z" class="ln"/><path d="M0 4 L0 12 M-8 15 L8 15" class="ln"/><path d="M-11 -12 q-8 4 -4 10 M11 -12 q8 4 4 10" class="ln soft"/></g>`,
  sword: `<g><path d="M0 -18 L0 12" class="ln"/><path d="M-9 4 L9 4" class="ln"/><path d="M0 12 L0 17" class="ln"/><path d="M-4 -14 L0 -18 L4 -14" class="ln soft"/></g>`,
  pentacle: `<g><circle r="14" class="ln"/>${(() => {
    const p = Array.from({ length: 5 }, (_, i) => {
      const a = (i * 4 / 5) * Math.PI - Math.PI / 2;
      return `${(Math.cos(a) * 10).toFixed(1)},${(Math.sin(a) * 10).toFixed(1)}`;
    }).join(' ');
    return `<polygon points="${p}" class="ln soft"/>`;
  })()}</g>`
};

/** 1~10장은 글리프를 수만큼 배치, 코트는 큰 글리프 + 계급 표시. */
function minorBody(card) {
  const g = GLYPH[card.svg] || GLYPH.pentacle;
  const cx = 150, cy = 240;

  if (typeof card.rank === 'number') {
    const n = card.rank;
    const cols = n <= 3 ? 1 : n <= 8 ? 2 : 3;
    const perCol = Math.ceil(n / cols);
    const scale = n === 1 ? 3.6 : n === 2 ? 2.6 : n === 3 ? 2.1 : n <= 6 ? 1.7 : n <= 8 ? 1.5 : 1.3;
    const gapX = cols === 3 ? 62 : 74;
    const gapY = scale * 34;
    const out = [];
    let placed = 0;
    for (let c = 0; c < cols; c++) {
      const count = Math.min(perCol, n - placed);
      for (let r = 0; r < count; r++) {
        const x = cx + (c - (cols - 1) / 2) * gapX;
        const y = cy + (r - (count - 1) / 2) * gapY;
        out.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale})">${g}</g>`);
        placed++;
      }
    }
    return out.join('');
  }

  const bars = { page: 1, knight: 2, queen: 3, king: 4 }[card.rank] || 1;
  const crown = Array.from({ length: bars }, (_, i) =>
    `<path d="M${105 + 0} ${132 + i * 14} L${195} ${132 + i * 14}" class="ln"/>`).join('');
  return `
    ${crown}
    <g transform="translate(150 265) scale(3.4)">${g}</g>
    <path d="M95 345 L205 345" class="ln soft"/>`;
}

/* ───────────────────────── 카드 조립 ───────────────────────── */

function frame(inner, { hue, label, corner, reversed }) {
  return `
<svg viewBox="0 0 ${CARD_W} ${CARD_H}" xmlns="http://www.w3.org/2000/svg"
     class="card-svg" style="--card-hue:${hue}" role="img" aria-label="${escapeAttr(label)}">
  <defs>
    <linearGradient id="bg-${hue}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="hsl(${hue} 32% 16%)"/>
      <stop offset="100%" stop-color="hsl(${hue} 38% 8%)"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" rx="18" fill="url(#bg-${hue})"/>
  <rect x="9" y="9" width="${CARD_W - 18}" height="${CARD_H - 18}" rx="12"
        fill="none" stroke="hsl(${hue} 45% 62% / .55)" stroke-width="1.5"/>
  <rect x="17" y="17" width="${CARD_W - 34}" height="${CARD_H - 34}" rx="8"
        fill="none" stroke="hsl(${hue} 45% 62% / .22)" stroke-width="1"/>
  <text x="${CARD_W / 2}" y="60" class="card-corner">${escapeHtml(corner)}</text>
  <g class="card-figure" ${reversed ? `transform="rotate(180 ${CARD_W / 2} ${CARD_H / 2})"` : ''}>
    ${inner}
  </g>
  <text x="${CARD_W / 2}" y="${CARD_H - 38}" class="card-name">${escapeHtml(label)}</text>
</svg>`;
}

/** 카드 한 장의 SVG 문자열. */
export function cardSvg(card, reversed = false) {
  if (card.arcana === 'major') {
    return frame(S[card.svg] || S.world, {
      hue: 268, label: card.nameKo, corner: card.roman, reversed
    });
  }
  const suit = SUITS[card.suit];
  const corner = typeof card.rank === 'number'
    ? String(card.rank)
    : { page: 'P', knight: 'N', queen: 'Q', king: 'K' }[card.rank];
  return frame(minorBody(card), {
    hue: suit.hue, label: card.nameKo, corner, reversed
  });
}

/** 뒷면. */
export function cardBackSvg() {
  return `
<svg viewBox="0 0 ${CARD_W} ${CARD_H}" xmlns="http://www.w3.org/2000/svg" class="card-svg card-back" aria-hidden="true">
  <rect width="${CARD_W}" height="${CARD_H}" rx="18" fill="hsl(258 40% 12%)"/>
  <rect x="9" y="9" width="${CARD_W - 18}" height="${CARD_H - 18}" rx="12"
        fill="none" stroke="hsl(258 50% 66% / .5)" stroke-width="1.5"/>
  ${Array.from({ length: 7 }, (_, r) =>
    Array.from({ length: 4 }, (_, c) => {
      const x = 48 + c * 68, y = 72 + r * 62;
      return `<g transform="translate(${x} ${y}) rotate(45)">
        <rect x="-11" y="-11" width="22" height="22" fill="none" stroke="hsl(258 50% 70% / .28)"/>
        <circle r="3.5" fill="hsl(258 60% 78% / .4)"/></g>`;
    }).join('')).join('')}
  <circle cx="150" cy="260" r="40" fill="none" stroke="hsl(45 70% 70% / .45)" stroke-width="1.5"/>
  <circle cx="150" cy="260" r="7" fill="hsl(45 80% 75% / .6)"/>
</svg>`;
}

/**
 * 설정된 모드에 맞는 카드 그림 요소를 만든다.
 * scan 모드는 로컬 → 공용 → SVG 순으로 폴백한다.
 */
export function cardFigure(card, reversed, art) {
  const wrap = document.createElement('div');
  wrap.className = 'card-figure-wrap' + (reversed ? ' is-reversed' : '');

  if (art !== 'scan') {
    wrap.innerHTML = cardSvg(card, reversed);
    return wrap;
  }

  const img = document.createElement('img');
  img.className = 'card-img';
  img.alt = `${card.nameKo} (${card.nameEn})`;
  img.loading = 'lazy';
  img.decoding = 'async';

  if (localAvailable === false) {
    img.dataset.stage = 'commons';
    img.src = commonsUrl(card);
  } else {
    img.dataset.stage = 'local';
    img.src = localUrl(card);
  }

  img.addEventListener('load', () => {
    if (img.dataset.stage === 'local') localAvailable = true;
  });

  img.addEventListener('error', () => {
    if (img.dataset.stage === 'local') {
      localAvailable = false;
      img.dataset.stage = 'commons';
      img.src = commonsUrl(card);
    } else {
      // 바탕의 SVG가 이미 깔려 있으므로 이미지만 걷어내면 된다
      img.remove();
      wrap.classList.add('fallback-svg');
      // 로컬에도 없고 공용에서도 못 받았다는 뜻이다. 한 번만 알린다.
      if (!scanUnavailableNotified) {
        scanUnavailableNotified = true;
        document.dispatchEvent(new CustomEvent('tarot:scan-unavailable'));
      }
    }
  });

  // SVG를 바탕으로 깔고 그 위에 이미지를 올린다
  wrap.innerHTML = cardSvg(card, reversed);
  wrap.appendChild(img);
  return wrap;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}
