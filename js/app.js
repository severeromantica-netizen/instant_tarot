import { DECK, CARD_BY_ID, SUITS, IMAGE_CREDIT } from './data/cards.js';
import { ACTIVE_SPREADS, getSpread, getVariant } from './data/spreads.js';
import { Deck, readingFor, randomInt } from './deck.js';
import { cardFigure, cardBackSvg, cardSvg } from './cardArt.js';
import { store, DEFAULT_SETTINGS } from './api.js';

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

const state = {
  settings: { ...DEFAULT_SETTINGS },
  deck: null,
  spread: null,
  variant: null,
  slots: [],      // positions와 같은 길이. null 또는 draw entry
  saved: false
};

/* ══════════════════ 초기화 ══════════════════ */

async function init() {
  state.settings = await store.getSettings();
  applyTheme();

  $('#art-select').value = state.settings.art;
  $('#theme-select').value = state.settings.theme;
  $('#reversed-toggle').checked = state.settings.allowReversed;
  $$('input[name=drawmode]').forEach(r => { r.checked = r.value === state.settings.drawMode; });

  buildSpreadOptions();
  selectSpread(state.settings.spreadId, state.settings.variantId);

  bindEvents();
  renderLibrary();
  renderHistory();
  renderCredit();
}

function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme;
}

async function patchSettings(patch) {
  state.settings = await store.saveSettings(patch);
}

/* ══════════════════ 스프레드 선택 ══════════════════ */

function buildSpreadOptions() {
  const sel = $('#spread-select');
  sel.innerHTML = ACTIVE_SPREADS
    .map(s => `<option value="${s.id}">${s.nameKo} (${countOf(s)}장)</option>`).join('');
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

function doUndo() {
  const filled = state.slots.reduce((acc, s, i) => (s ? i : acc), -1);
  if (filled === -1) return;
  state.deck.undo();
  state.slots[filled] = null;
  state.saved = false;
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
  $('#btn-undo').disabled = state.deck.drawnCount === 0;

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

/* ══════════════════ 렌더링: 테이블 ══════════════════ */

function renderTable() {
  const table = $('#table');
  const { positions } = state.variant;
  const free = state.spread.layout.type === 'free';
  table.className = 'table ' + (free ? 'layout-free' : 'layout-row');
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
    label.className = 'slot-label';
    label.textContent = pos.label;

    const art = document.createElement('div');
    art.className = 'slot-art';
    if (pos.rotate) art.style.transform = `rotate(${pos.rotate}deg)`;

    if (entry) {
      art.appendChild(cardFigure(entry.card, entry.reversed, state.settings.art));
      if (entry.reversed) art.insertAdjacentHTML('beforeend', '<span class="reversed-flag">역방향</span>');
      if (state.settings.drawMode === 'pick') {
        art.insertAdjacentHTML('beforeend',
          `<span class="pick-flag">${entry.pickedAt} / ${entry.fromRemaining}</span>`);
      }
      art.addEventListener('click', () => openSheet(entry.card, entry.reversed));
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
    const pos = state.variant.positions[i];
    const r = readingFor(entry);
    const card = entry.card;

    const el = document.createElement('article');
    el.className = 'read-card';
    el.innerHTML = `
      <div class="read-head">
        <span class="read-pos">${esc(pos.label)}</span>
        <h3 class="read-name">${esc(card.nameKo)}</h3>
        <span class="read-en">${esc(card.nameEn)}</span>
        <span class="badge ${entry.reversed ? 'rev' : 'up'}">${r.orientation}</span>
        ${card.arcana === 'minor'
          ? `<span class="badge">${SUITS[card.suit].element} · ${SUITS[card.suit].theme}</span>`
          : `<span class="badge">메이저 ${card.roman}</span>`}
      </div>
      <p class="read-pos-meaning">${esc(pos.meaning)}</p>
      <ul class="read-keys">${r.keywords.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
      <p class="read-text">${esc(r.text)}</p>`;
    out.appendChild(el);
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

function openSheet(card, reversed) {
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
      <h3>${esc(card.nameKo)}</h3>
      <p class="sheet-meta">${esc(card.nameEn)} · ${esc(meta)}</p>
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
      <button class="btn btn-ghost btn-sm" data-del="${row.id}">삭제</button>`;
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
  $('#btn-undo').addEventListener('click', doUndo);

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
