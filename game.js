import { ITEMS, VISITORS } from './roster.js';

// Game state lives in this viewer's browser only. Every storage call is guarded:
// private windows and previews may refuse it, and the game still runs from a fresh state.
const KEY = 'meow-isles-v1';
const PET_COOLDOWN = 20_000;
const fresh = () => ({ fish: 30, cats: {}, slots: {}, visitors: {}, best: {}, visited: {}, lastSeen: Date.now(), pets: 0 });

let state = fresh();
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (saved && typeof saved.fish === 'number') state = { ...fresh(), ...saved };
} catch { /* start fresh */ }

const listeners = {};
export const on = (ev, fn) => (listeners[ev] ||= []).push(fn);
const emit = (ev, data) => (listeners[ev] || []).forEach((fn) => fn(data));

let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    state.lastSeen = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* not saved this time */ }
  }, 300);
}
addEventListener('pagehide', () => { state.lastSeen = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} });

export const get = () => state;
export const itemById = (id) => ITEMS.find((i) => i.id === id);
export const visitorFor = (itemId) => VISITORS.find((v) => v.item === itemId);
export const hearts = (catId) => Math.min(5, Math.floor((state.cats[catId]?.love || 0) / 3));
export const seen = (catId) => !!state.cats[catId];

export function addFish(n, why) {
  state.fish += n;
  emit('fish', state.fish);
  if (why) emit('toast', why);
  save();
}

// Petting: first touch adds the cat to the catalog; each cat then needs a short rest.
export function pet(cat) {
  const now = Date.now();
  const rec = state.cats[cat.id] || (state.cats[cat.id] = { love: 0, last: 0 });
  const first = rec.love === 0 && rec.last === 0;
  if (now - rec.last < PET_COOLDOWN) return { gain: 0, rest: true };
  rec.last = now;
  rec.love += 1;
  state.pets += 1;
  const gain = (cat.visitor ? 5 : 1) + hearts(cat.id);
  addFish(gain);
  if (first) emit('seen', cat);
  return { gain, first, hearts: hearts(cat.id) };
}

export function place(islandId, itemId) {
  const item = itemById(itemId);
  if (!item || state.fish < item.price) return false;
  state.fish -= item.price;
  const old = state.slots[islandId];
  if (old && state.visitors[old]?.island === islandId) delete state.visitors[old];
  state.slots[islandId] = itemId;
  emit('fish', state.fish);
  emit('slots', { islandId, itemId });
  save();
  return true;
}

// Cat mode: remember which islands the player has walked onto.
export function visit(islandId) {
  const first = !state.visited[islandId];
  state.visited[islandId] = true;
  if (first) save();
  return { first, count: Object.keys(state.visited).length };
}

export function recordGame(gameId, score) {
  const best = state.best[gameId] || 0;
  if (score > best) state.best[gameId] = score;
  save();
  return score > best;
}

// Visitors: each placed item may attract its visitor, who stays a few minutes and leaves a gift.
export function tickVisitors(isNight) {
  const now = Date.now();
  for (const [itemId, v] of Object.entries(state.visitors)) {
    if (v.until > now) continue;
    delete state.visitors[itemId];
    const who = visitorFor(itemId);
    emit('visitor-leave', { itemId, island: v.island });
    addFish(v.gift, `${who.name}離開時留下了 ${v.gift} 條小魚乾`);
  }
  for (const [islandId, itemId] of Object.entries(state.slots)) {
    const who = visitorFor(itemId);
    if (state.visitors[itemId] || (who.night && !isNight) || Math.random() > 0.3) continue;
    state.visitors[itemId] = { island: islandId, until: now + 120_000 + Math.random() * 180_000, gift: 15 + Math.floor(Math.random() * 26) };
    emit('visitor-arrive', { itemId, island: islandId });
    emit('toast', `有一隻陌生的貓被${itemById(itemId).name}吸引過來了`);
  }
  save();
}

// Called once on load: credit the time away and gifts from visitors who left meanwhile.
export function welcomeBack() {
  const away = Date.now() - (state.lastSeen || Date.now());
  let gift = 0;
  if (away > 5 * 60_000) gift += Math.min(60, Math.floor(away / 300_000) * 3);
  for (const [itemId, v] of Object.entries(state.visitors)) {
    if (v.until <= Date.now()) { gift += v.gift; delete state.visitors[itemId]; }
  }
  if (gift > 0) {
    const hrs = away / 3_600_000;
    const span = hrs >= 1 ? `${Math.floor(hrs)} 小時` : `${Math.max(5, Math.round(away / 60_000))} 分鐘`;
    addFish(gift, `你離開的 ${span}裡，貓咪們攢下了 ${gift} 條小魚乾`);
  }
  save();
}
