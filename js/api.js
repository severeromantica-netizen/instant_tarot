/**
 * 저장 계층 추상화.
 *
 * 지금은 LocalStore(브라우저 localStorage)만 쓴다. 나중에 Render에 web service를
 * 올리면 config.apiBase만 지정하면 RemoteStore로 바뀌고, app.js는 고치지 않는다.
 *
 * 백엔드를 붙일 때 구현해야 하는 엔드포인트
 *   GET    /api/readings          → Reading[]
 *   POST   /api/readings          → Reading
 *   DELETE /api/readings/:id      → 204
 *   GET    /api/settings          → Settings
 *   PUT    /api/settings          → Settings
 *
 * Reading 형태
 *   { id, createdAt, question, spreadId, variantId, art,
 *     cards: [{ cardId, reversed, pickedAt, positionIndex }] }
 */

const SETTINGS_KEY = 'tarot.settings.v1';
const READINGS_KEY = 'tarot.readings.v1';

export const DEFAULT_SETTINGS = {
  art: 'scan',            // 'scan' | 'svg'
  theme: 'midnight',      // 'midnight' | 'parchment' | 'ink'
  allowReversed: true,
  drawMode: 'random',     // 'random' | 'pick'
  spreadId: 'three',
  variantId: 'time'
};

class LocalStore {
  constructor() { this.kind = 'local'; }

  async getSettings() {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
    } catch { return { ...DEFAULT_SETTINGS }; }
  }

  async saveSettings(patch) {
    const next = { ...(await this.getSettings()), ...patch };
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* 저장 공간 없음 */ }
    return next;
  }

  async listReadings() {
    try { return JSON.parse(localStorage.getItem(READINGS_KEY) || '[]'); } catch { return []; }
  }

  async addReading(reading) {
    const all = await this.listReadings();
    const row = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...reading };
    all.unshift(row);
    try { localStorage.setItem(READINGS_KEY, JSON.stringify(all.slice(0, 100))); } catch { /* noop */ }
    return row;
  }

  async deleteReading(id) {
    const all = (await this.listReadings()).filter(r => r.id !== id);
    try { localStorage.setItem(READINGS_KEY, JSON.stringify(all)); } catch { /* noop */ }
  }
}

class RemoteStore {
  constructor(base) { this.base = base.replace(/\/$/, ''); this.kind = 'remote'; this.fallback = new LocalStore(); }

  async #req(path, opts) {
    const res = await fetch(this.base + path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.status === 204 ? null : res.json();
  }

  // 서버가 자고 있거나 꺼져 있으면 로컬로 떨어진다. 무료 플랜의 콜드 스타트 대비.
  async #safe(fn, fallbackFn) {
    try { return await fn(); } catch (e) { console.warn('API 실패, 로컬로 대체:', e.message); return fallbackFn(); }
  }

  getSettings() { return this.#safe(() => this.#req('/api/settings'), () => this.fallback.getSettings()); }
  saveSettings(p) { return this.#safe(() => this.#req('/api/settings', { method: 'PUT', body: JSON.stringify(p) }), () => this.fallback.saveSettings(p)); }
  listReadings() { return this.#safe(() => this.#req('/api/readings'), () => this.fallback.listReadings()); }
  addReading(r) { return this.#safe(() => this.#req('/api/readings', { method: 'POST', body: JSON.stringify(r) }), () => this.fallback.addReading(r)); }
  deleteReading(id) { return this.#safe(() => this.#req(`/api/readings/${id}`, { method: 'DELETE' }), () => this.fallback.deleteReading(id)); }
}

/**
 * 백엔드를 붙이려면 window.TAROT_CONFIG = { apiBase: 'https://my-api.onrender.com' }
 * 를 index.html에서 지정하면 된다.
 */
export const store = (() => {
  const base = globalThis.TAROT_CONFIG?.apiBase;
  return base ? new RemoteStore(base) : new LocalStore();
})();
