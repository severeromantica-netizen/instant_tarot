import { DECK, CARD_BY_ID, SUITS, IMAGE_CREDIT } from './data/cards.js';
import { ACTIVE_SPREADS, getSpread, getVariant, menuItems, DIVIDER } from './data/spreads.js';
import { Deck, readingFor, randomInt } from './deck.js';
import { cardFigure, cardBackSvg, cardSvg } from './cardArt.js';
import { store, DEFAULT_SETTINGS } from './api.js';

/* 전역 상태는 아래 state 하나로 모은다. */

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

const state = {
  settings: { ...DEFAULT_SETTINGS },
  deck: null,
  spread: null,
  variant: null,
  slots: [],      // positions와 같은 길이. null 또는 draw entry
  saved: false,
  tipped: false   // 복채는 한 리딩에 한 번만
};

/* ══════════════════ 초기화 ══════════════════ */

async function init() {
  state.settings = await store.getSettings();
  applyTheme();

  $('#art-select').value = state.settings.art;
  $('#theme-select').value = state.settings.theme;
  $('#color-dark').value = normHex(state.settings.colorDark, DEFAULT_SETTINGS.colorDark);
  $('#color-light').value = normHex(state.settings.colorLight, DEFAULT_SETTINGS.colorLight);
  $('#reversed-toggle').checked = state.settings.allowReversed;
  $$('input[name=drawmode]').forEach(r => { r.checked = r.value === state.settings.drawMode; });

  buildSpreadOptions();
  selectSpread(state.settings.spreadId, state.settings.variantId);

  bindEvents();
  renderLibrary();
  renderHistory();
  renderCredit();
}

/** '#rrggbb' 형태로 정규화한다. 이상한 값이 들어오면 대체색을 쓴다. */
function normHex(v, fallback) {
  const s = String(v || '').trim();
  return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : fallback;
}

/** WCAG 상대휘도. 두 색의 대비를 재는 데 쓴다. */
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [16, 8, 0].map(sh => ((n >> sh) & 255) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
}

function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function applyTheme() {
  const root = document.documentElement;
  const { theme } = state.settings;
  const dark = normHex(state.settings.colorDark, DEFAULT_SETTINGS.colorDark);
  const light = normHex(state.settings.colorLight, DEFAULT_SETTINGS.colorLight);

  root.dataset.theme = theme;
  // 고른 두 색을 그대로 넘긴다. 중간 단계값은 style.css가 두 색을 섞어 만든다.
  root.style.setProperty('--c-dark', dark);
  root.style.setProperty('--c-light', light);

  const custom = theme === 'custom';
  $('#chip-pair').hidden = !custom;
  if (custom) {
    // 명도 제한은 두지 않는다. 읽기 힘든 조합이면 표시만 해주고 선택은 존중한다.
    $('#chip-warn').hidden = contrast(dark, light) >= 4.5;
  }
}

async function patchSettings(patch) {
  // 현재 설정에 먼저 합친 뒤 통째로 저장한다.
  // 부분 patch만 넘기면, 저장이 겹칠 때 각자 읽어둔 옛 값으로 덮어써서
  // 먼저 바꾼 항목이 사라진다(컬러칩 두 개를 연달아 바꿀 때 실제로 발생).
  state.settings = { ...state.settings, ...patch };
  await store.saveSettings(state.settings);
}

/* ══════════════════ 스프레드 선택 ══════════════════ */

function buildSpreadOptions() {
  const sel = $('#spread-select');
  // 가름끈은 고를 수 없는 항목으로 넣어 구분선처럼 보이게 한다
  sel.innerHTML = menuItems().map(item =>
    item === DIVIDER
      ? '<option disabled>──────────</option>'
      : `<option value="${item.id}">${item.nameKo} (${countOf(item)}장)</option>`
  ).join('');
}

function countOf(spread) {
  return spread.variants[0].positions.length;
}

function buildVariantOptions() {
  const sel = $('#variant-select');
  sel.innerHTML = state.spread.variants
    .map(v => `<option value="${v.id}">${v.nameKo}</option>`).join('');
  sel.value = state.variant.id;
  sel.disabled = state.spread.variants.length < 2;
}

function selectSpread(spreadId, variantId) {
  state.spread = getSpread(spreadId);
  state.variant = getVariant(state.spread, variantId);
  $('#spread-select').value = state.spread.id;
  buildVariantOptions();
  $('#spread-desc').textContent = state.spread.desc;
  resetReading();
}

/* ══════════════════ 리딩 진행 ══════════════════ */

function resetReading() {
  state.deck = new Deck(DECK, { allowReversed: state.settings.allowReversed });
  state.slots = new Array(state.variant.positions.length).fill(null);
  state.saved = false;
  resetTip();
  clearError();
  renderTable();
  renderReadout();
  syncControls();
}

function nextSlotIndex() {
  return state.slots.findIndex(s => s === null);
}

function doDraw() {
  const idx = nextSlotIndex();
  if (idx === -1) return;

  let entry;
  if (state.settings.drawMode === 'pick') {
    const raw = $('#pick-input').value;
    if (raw === '') { showError('숫자를 입력하세요.'); return; }
    try {
      entry = state.deck.drawAt(raw);
    } catch (e) { showError(e.message); return; }
    $('#pick-input').value = '';
  } else {
    entry = state.deck.drawRandom();
  }

  clearError();
  state.slots[idx] = entry;
  afterChange();
}

function doAuto() {
  let idx;
  while ((idx = nextSlotIndex()) !== -1 && state.deck.remaining) {
    state.slots[idx] = state.deck.drawRandom();
  }
  clearError();
  afterChange();
}


function afterChange() {
  renderTable();
  renderReadout();
  syncControls();
  if (nextSlotIndex() === -1 && !state.saved) saveReading();
}

async function saveReading() {
  state.saved = true;
  await store.addReading({
    question: $('#question').value.trim(),
    spreadId: state.spread.id,
    variantId: state.variant.id,
    art: state.settings.art,
    cards: state.slots.map((s, i) => ({
      cardId: s.card.id, reversed: s.reversed, pickedAt: s.pickedAt, positionIndex: i
    }))
  });
  renderHistory();
}

function syncControls() {
  const done = nextSlotIndex() === -1;
  const remaining = state.deck.remaining;

  $('#remaining').textContent = remaining;
  $('#drawn-count').textContent = state.deck.drawnCount;
  $('#btn-draw').disabled = done || remaining === 0;
  $('#btn-auto').disabled = done || remaining === 0;

  // 복채는 자리를 전부 채운 뒤, 한 리딩에 한 번만.
  // 낸 뒤에는 버튼 자체가 '복채를 / 받았습니다'로 바뀐다(크기는 그대로).
  const tip = $('#btn-tip');
  tip.disabled = !done || state.tipped;
  tip.classList.toggle('is-paid', state.tipped);
  tip.innerHTML = state.tipped ? '복채를<br>받았습니다' : '복채 내기';
  $('#tip-again').hidden = !done;
  $('#tip-note').textContent = state.tipped
    ? TIP_AFTER
    : done
      ? '리딩이 끝났습니다.'
      : '카드를 전부 공개하면 복채를 낼 수 있습니다.';

  const pickMode = state.settings.drawMode === 'pick';
  $('#pick-row').hidden = !pickMode || done;
  if (pickMode) {
    const input = $('#pick-input');
    input.max = String(remaining);
    $('#pick-label').textContent = `1 ~ ${remaining} 중 몇 번째`;
    input.placeholder = `1 ~ ${remaining}`;
  }
}

function showError(msg) { $('#draw-error').textContent = msg; }
function clearError() { $('#draw-error').textContent = ''; }

/* ══════════════════ 복채 ══════════════════ */

/** 복채를 낸 뒤 안내 줄에 남는 문구. */
const TIP_AFTER = '점괘는 길잡이별일 뿐, 운명은 개척자의 것';

function payTip() {
  // 자리를 다 채우기 전이거나 이미 낸 뒤에는 받지 않는다
  if (nextSlotIndex() !== -1 || state.tipped) return;
  state.tipped = true;
  syncControls();
}

function resetTip() {
  state.tipped = false;
}

/** 덱을 다시 섞고 판을 비운다. 질문과 설정은 그대로 둔다. */
function startOver() {
  resetReading();
  $('#table').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ══════════════════ 렌더링: 테이블 ══════════════════ */

function renderTable() {
  const table = $('#table');
  const { positions } = state.variant;
  const free = state.spread.layout.type === 'free';
  table.className = 'table ' + (free ? 'layout-free' : 'layout-row');
  // free 배치는 스프레드가 판의 비율을 정할 수 있다. 세로로 긴 배치는 '1 / 1',
  // 가로로 넓은 배치는 '5 / 4' 식으로 준다.
  // aspect-ratio를 직접 넣으면 인라인 스타일이라 모바일 미디어 쿼리가 이기지 못한다.
  // 변수로 넘겨야 좁은 화면에서 CSS가 비율을 풀고 세로로 쌓을 수 있다.
  if (free && state.spread.layout.ratio) {
    table.style.setProperty('--board-ratio', state.spread.layout.ratio);
  } else {
    table.style.removeProperty('--board-ratio');
  }
  table.innerHTML = '';

  const nextIdx = nextSlotIndex();

  positions.forEach((pos, i) => {
    const entry = state.slots[i];
    const slot = document.createElement('div');
    slot.className = 'slot'
      + (entry ? ' is-filled' : '')
      + (i === nextIdx ? ' is-next' : '');
    if (free) {
      slot.style.left = `${pos.x}%`;
      slot.style.top = `${pos.y}%`;
    }

    const label = document.createElement('div');
    // labelAt: 'bottom'이면 이름표를 카드 아래에 단다. 켈틱 크로스의 2번처럼
    // 다른 카드와 같은 자리에 놓이는 카드의 이름표가 겹치지 않게 하는 용도다.
    label.className = 'slot-label' + (pos.labelAt === 'bottom' ? ' at-bottom' : '');
    label.textContent = pos.label;

    const art = document.createElement('div');
    art.className = 'slot-art';
    // 회전도 같은 이유로 변수에 담는다. 좁은 화면에서는 세로로 쌓이므로
    // 가로로 누운 카드가 화면을 비집고 나가지 않도록 CSS가 회전을 끈다.
    if (pos.rotate) art.style.setProperty('--card-rotate', `${pos.rotate}deg`);

    if (entry) {
      art.appendChild(cardFigure(entry.card, entry.reversed, state.settings.art));
      if (entry.reversed) art.insertAdjacentHTML('beforeend', '<span class="reversed-flag">역방향</span>');
      if (state.settings.drawMode === 'pick') {
        art.insertAdjacentHTML('beforeend',
          `<span class="pick-flag">${entry.pickedAt} / ${entry.fromRemaining}</span>`);
      }
      // 판이 좁아 이름표를 숨길 때 대신 보이는 번호 (CSS가 표시 여부를 정한다)
      if (free) art.insertAdjacentHTML('beforeend', `<span class="slot-no">${i + 1}</span>`);
      art.addEventListener('click', () => openSheet(entry.card, entry.reversed, pos));
    } else if (i === nextIdx) {
      art.innerHTML = cardBackSvg();
    } else {
      art.innerHTML = '<div class="slot-empty">—</div>';
    }

    slot.append(label, art);
    table.appendChild(slot);
  });
}

/* ══════════════════ 렌더링: 해석 ══════════════════ */

/**
 * 해석 카드 한 장을 만든다. 리딩 화면과 기록 상세가 같은 모양을 공유한다.
 * @param {object}  card     카드 데이터
 * @param {boolean} reversed 역방향 여부
 * @param {object?} pos      자리 정보 {label, meaning}. 없으면 자리 줄을 생략한다.
 */
function readCardEl(card, reversed, pos) {
  const r = readingFor({ card, reversed });
  const el = document.createElement('article');
  el.className = 'read-card';
  el.innerHTML = `
    <div class="read-head">
      ${pos ? `<span class="read-pos">${esc(pos.label)}</span>` : ''}
      <h3 class="read-name">${esc(card.nameKo)}</h3>
      <span class="read-en">${esc(card.nameEn)}</span>
      <span class="badge ${reversed ? 'rev' : 'up'}">${r.orientation}</span>
      ${card.arcana === 'minor'
        ? `<span class="badge">${SUITS[card.suit].element} · ${SUITS[card.suit].theme}</span>`
        : `<span class="badge">메이저 ${card.roman}</span>`}
    </div>
    ${pos ? `<p class="read-pos-meaning">${esc(pos.meaning)}</p>` : ''}
    <ul class="read-keys">${r.keywords.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
    <p class="read-text">${esc(r.text)}</p>`;
  return el;
}

function renderReadout() {
  const out = $('#readout');
  out.innerHTML = '';
  const filled = state.slots.filter(Boolean);
  if (!filled.length) return;

  const q = $('#question').value.trim();
  const head = document.createElement('div');
  head.className = 'summary';
  head.innerHTML = `
    <h2>${state.spread.nameKo} · ${state.variant.nameKo}</h2>
    ${q ? `<p class="q">“${esc(q)}”</p>` : ''}
    <p>${filled.length} / ${state.slots.length}장 공개${
      state.settings.allowReversed ? '' : ' · 정방향만 사용'
    }</p>`;
  out.appendChild(head);

  state.slots.forEach((entry, i) => {
    if (!entry) return;
    out.appendChild(readCardEl(entry.card, entry.reversed, state.variant.positions[i]));
  });
}

/* ══════════════════ 렌더링: 도감 ══════════════════ */

function renderLibrary() {
  const grid = $('#library');
  const q = $('#lib-search').value.trim().toLowerCase();
  const f = $('#lib-filter').value;

  const list = DECK.filter(c => {
    if (f === 'major' && c.arcana !== 'major') return false;
    if (['wands', 'cups', 'swords', 'pentacles'].includes(f) && c.suit !== f) return false;
    if (!q) return true;
    return [c.nameKo, c.nameEn, ...c.keyUp, ...c.keyRev]
      .join(' ').toLowerCase().includes(q);
  });

  grid.innerHTML = '';
  if (!list.length) {
    grid.innerHTML = '<p class="empty">일치하는 카드가 없습니다.</p>';
    return;
  }

  list.forEach(card => {
    const item = document.createElement('div');
    item.className = 'lib-item';
    const art = document.createElement('div');
    art.className = 'slot-art';
    art.appendChild(cardFigure(card, false, state.settings.art));
    const name = document.createElement('p');
    name.className = 'lib-name';
    name.innerHTML = `${esc(card.nameKo)}<small>${esc(card.nameEn)}</small>`;
    item.append(art, name);
    item.addEventListener('click', () => openSheet(card, false));
    grid.appendChild(item);
  });
}

/* ══════════════════ 카드 상세 시트 ══════════════════ */

let sheet;

/**
 * 카드 확대 보기.
 * @param {object} pos 판에서 눌렀을 때 넘어오는 자리 정보. 있으면 자리 이름과
 *                     의미를 함께 보여준다. 축소된 판에서는 이름표가 숨겨지므로
 *                     여기가 자리 이름을 확인하는 통로가 된다.
 */
function openSheet(card, reversed, pos = null) {
  if (!sheet) {
    sheet = document.createElement('dialog');
    sheet.className = 'sheet';
    document.body.appendChild(sheet);
    sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });
  }

  const meta = card.arcana === 'major'
    ? `메이저 아르카나 ${card.roman} · ${card.element}`
    : `${SUITS[card.suit].ko} · ${card.element} · ${SUITS[card.suit].theme}`;

  sheet.innerHTML = `
    <div class="sheet-body">
      <button class="sheet-close" aria-label="닫기">&times;</button>
      <div class="sheet-art"><div class="slot-art"></div></div>
      ${pos ? `<p class="sheet-pos">${esc(pos.label)}</p>` : ''}
      <h3>${esc(card.nameKo)}${reversed ? ' <span class="badge rev">역방향</span>' : ''}</h3>
      <p class="sheet-meta">${esc(card.nameEn)} · ${esc(meta)}</p>
      ${pos ? `<p class="sheet-posmean">${esc(pos.meaning)}</p>` : ''}
      <div class="sheet-section">
        <h4>정방향 ${reversed ? '' : '(현재)'}</h4>
        <p><strong>${card.keyUp.join(' · ')}</strong></p>
        <p style="margin-top:6px">${esc(card.up)}</p>
      </div>
      <div class="sheet-section">
        <h4>역방향 ${reversed ? '(현재)' : ''}</h4>
        <p><strong>${card.keyRev.join(' · ')}</strong></p>
        <p style="margin-top:6px">${esc(card.rev)}</p>
      </div>
    </div>`;

  sheet.querySelector('.sheet-art .slot-art')
    .appendChild(cardFigure(card, reversed, state.settings.art));
  sheet.querySelector('.sheet-close').addEventListener('click', () => sheet.close());
  sheet.showModal();
}

/* ══════════════════ 렌더링: 기록 ══════════════════ */

async function renderHistory() {
  const box = $('#history');
  const rows = await store.listReadings();
  $('#history-note').textContent = store.kind === 'local'
    ? '기록은 이 브라우저에만 저장됩니다. 백엔드를 연결하면 기기 간에 공유됩니다.'
    : '서버에 저장된 기록입니다.';

  if (!rows.length) {
    box.innerHTML = '<p class="empty">아직 저장된 리딩이 없습니다.</p>';
    return;
  }

  box.innerHTML = '';
  rows.forEach(row => {
    const spread = getSpread(row.spreadId);
    const variant = getVariant(spread, row.variantId);
    const names = row.cards.map(c => {
      const card = CARD_BY_ID.get(c.cardId);
      return card ? `${card.nameKo}${c.reversed ? '(역)' : ''}` : '?';
    }).join(' · ');

    const el = document.createElement('div');
    el.className = 'hist-item';
    el.innerHTML = `
      <div class="hist-main">
        <div class="hist-when">${new Date(row.createdAt).toLocaleString('ko-KR')} · ${esc(spread.nameKo)} / ${esc(variant.nameKo)}</div>
        ${row.question ? `<p class="hist-q">“${esc(row.question)}”</p>` : ''}
        <div class="hist-cards">${esc(names)}</div>
      </div>
      <div class="hist-actions">
        <button class="btn btn-ghost btn-sm" data-toggle aria-expanded="false">해석 보기</button>
        <button class="btn btn-ghost btn-sm" data-del="${row.id}">삭제</button>
      </div>`;

    // 저장된 카드와 자리 정보로 해석 전문을 다시 만든다. 처음에는 접어 둔다.
    const detail = document.createElement('div');
    detail.className = 'hist-detail';
    detail.hidden = true;
    row.cards.forEach(c => {
      const card = CARD_BY_ID.get(c.cardId);
      if (!card) return;
      // 스프레드가 그 사이 바뀌었을 수 있으므로 자리 정보가 없으면 생략한다
      const pos = variant.positions[c.positionIndex] || null;
      detail.appendChild(readCardEl(card, c.reversed, pos));
    });
    el.appendChild(detail);

    const toggle = el.querySelector('[data-toggle]');
    toggle.addEventListener('click', () => {
      detail.hidden = !detail.hidden;
      toggle.textContent = detail.hidden ? '해석 보기' : '접기';
      toggle.setAttribute('aria-expanded', String(!detail.hidden));
    });

    el.querySelector('[data-del]').addEventListener('click', async () => {
      await store.deleteReading(row.id);
      renderHistory();
    });
    box.appendChild(el);
  });
}

function renderCredit() {
  $('#credit').innerHTML = `
    카드 이미지: <strong>${esc(IMAGE_CREDIT.title)}</strong> · ${esc(IMAGE_CREDIT.artist)} ·
    ${esc(IMAGE_CREDIT.status)}. 출처 ${esc(IMAGE_CREDIT.source)}.
    ${esc(IMAGE_CREDIT.note)}`;
}

/* ══════════════════ 이벤트 ══════════════════ */

function bindEvents() {
  $('#btn-shuffle').addEventListener('click', resetReading);
  $('#btn-draw').addEventListener('click', doDraw);
  $('#btn-auto').addEventListener('click', doAuto);
  $('#btn-quit').addEventListener('click', () => location.reload());

  $('#pick-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); doDraw(); }
  });
  $('#btn-pick-random').addEventListener('click', () => {
    if (!state.deck.remaining) return;
    $('#pick-input').value = randomInt(state.deck.remaining) + 1;
  });

  $('#spread-select').addEventListener('change', e => {
    patchSettings({ spreadId: e.target.value });
    selectSpread(e.target.value, null);
    patchSettings({ variantId: state.variant.id });
  });

  $('#variant-select').addEventListener('change', e => {
    patchSettings({ variantId: e.target.value });
    state.variant = getVariant(state.spread, e.target.value);
    resetReading();
  });

  $$('input[name=drawmode]').forEach(r => r.addEventListener('change', () => {
    const mode = $$('input[name=drawmode]').find(x => x.checked).value;
    patchSettings({ drawMode: mode });
    state.settings.drawMode = mode;
    clearError();
    syncControls();
    renderTable();
  }));

  $('#reversed-toggle').addEventListener('change', e => {
    state.settings.allowReversed = e.target.checked;
    patchSettings({ allowReversed: e.target.checked });
    resetReading();
  });

  $('#art-select').addEventListener('change', e => {
    state.settings.art = e.target.value;
    patchSettings({ art: e.target.value });
    renderTable();
    renderLibrary();
  });

  $('#theme-select').addEventListener('change', e => {
    state.settings.theme = e.target.value;
    patchSettings({ theme: e.target.value });
    applyTheme();
  });

  // 피커를 움직이는 동안 바로 반영하고, 고르기를 마쳤을 때만 저장한다
  $('#color-dark').addEventListener('input', e => {
    state.settings.colorDark = normHex(e.target.value, DEFAULT_SETTINGS.colorDark);
    applyTheme();
  });
  $('#color-light').addEventListener('input', e => {
    state.settings.colorLight = normHex(e.target.value, DEFAULT_SETTINGS.colorLight);
    applyTheme();
  });
  $('#color-dark').addEventListener('change', () => patchSettings({ colorDark: state.settings.colorDark }));
  $('#color-light').addEventListener('change', () => patchSettings({ colorLight: state.settings.colorLight }));

  $('#btn-tip').addEventListener('click', payTip);
  $('#btn-again').addEventListener('click', startOver);

  // 스캔 이미지를 끝내 못 받으면 한 번만 안내한다 (cardArt.js에서 알려준다)
  document.addEventListener('tarot:scan-unavailable', () => {
    if (state.settings.art === 'scan') $('#art-note').hidden = false;
  }, { once: true });

  $('#question').addEventListener('input', () => renderReadout());

  $('#lib-search').addEventListener('input', renderLibrary);
  $('#lib-filter').addEventListener('change', renderLibrary);

  $$('.tab').forEach(tab => tab.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.toggle('is-active', t === tab));
    $$('.panel').forEach(p => p.classList.toggle('is-active', p.id === `panel-${tab.dataset.tab}`));
    if (tab.dataset.tab === 'history') renderHistory();
  }));

  document.addEventListener('keydown', e => {
    if (e.target.matches('input, select, textarea')) return;
    if (e.key === 'd' || e.key === 'D') { e.preventDefault(); $('#btn-draw').click(); }
    if (e.key === 's' || e.key === 'S') { e.preventDefault(); $('#btn-shuffle').click(); }
  });
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}

init();

/* 개발용: 콘솔에서 덱 상태를 확인할 수 있게 노출 */
globalThis.__tarot = { state, DECK, cardSvg };
