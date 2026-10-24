import { ITEMS, VISITORS } from './roster.js';
import * as game from './game.js';

const $ = (s) => document.querySelector(s);

// A small cat face in the cat's own coat colors, used in the catalog and the pet card.
export function catFace(coat, unknown) {
  const head = unknown ? 'var(--line)' : coat.head;
  const patch = unknown || !coat.patch ? '' : `<path d="M22 10 Q30 8 34 16 L28 18 Z" fill="${coat.patch}"/>`;
  const eyes = unknown ? '' : '<circle cx="15" cy="23" r="1.8" fill="#1d1b22"/><circle cx="25" cy="23" r="1.8" fill="#1d1b22"/><path d="M18.6 27 L20 28.4 L21.4 27" fill="none" stroke="#E79AA4" stroke-width="1.6" stroke-linecap="round"/>';
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M7 5 L14 13 H26 L33 5 L34 22 A14 13 0 0 1 6 22 Z" fill="${head}" stroke="rgba(30,25,50,.35)" stroke-width="1.2" stroke-linejoin="round"/>${patch}${eyes}</svg>`;
}

const heartsRow = (n) => '<span class="hearts" aria-label="親密度 ' + n + ' / 5">' + '♥'.repeat(n) + '<i>' + '♥'.repeat(5 - n) + '</i></span>';

let toastTimer = 0;
export function toast(msg) {
  const el = document.createElement('p');
  el.className = 'toast';
  el.textContent = msg;
  $('#toasts').append(el);
  setTimeout(() => el.classList.add('out'), 3200);
  setTimeout(() => el.remove(), 3800);
  clearTimeout(toastTimer);
}

export function setFish(n) {
  $('#fishN').textContent = n;
  $('#fishPill').classList.remove('bump');
  void $('#fishPill').offsetWidth;
  $('#fishPill').classList.add('bump');
}

let cardTimer = 0;
export function showCat(info, res) {
  const card = $('#catCard');
  const line = res.rest ? '它想自己待一會兒，等等再來摸。' : res.first ? `第一次見面！已加入圖鑑。+${res.gain} 小魚乾` : `+${res.gain} 小魚乾`;
  card.innerHTML = `${catFace(info.coat)}<div><b>${info.name}</b><small>${info.visitor ? '稀有訪客' : info.home} · ${info.trait}</small>${heartsRow(game.hearts(info.id))}<span class="gain">${line}</span></div>`;
  card.hidden = false;
  clearTimeout(cardTimer);
  cardTimer = setTimeout(() => (card.hidden = true), 3500);
}

// The slot section inside an island's card: what is placed, who it attracted, and the shop.
export function renderSlot(islandId, onPlace) {
  const st = game.get();
  const placed = st.slots[islandId];
  const item = placed && game.itemById(placed);
  const v = placed && st.visitors[placed]?.island === islandId ? game.visitorFor(placed) : null;
  const head = item
    ? `<p class="slotNow"><b style="--c:${item.color}"></b>島上放著<strong>${item.name}</strong>。${v ? `${v.name}正在這裡，快去摸摸它。` : '還沒有訪客，過一會兒再來看看。'}</p>`
    : '<p class="slotNow">這座島有一個空位（地上的白色六邊形）。放一樣東西，也許會引來沒見過的貓。</p>';
  const shop = ITEMS.map((it) => `<button type="button" class="buy" data-item="${it.id}" ${st.fish < it.price || placed === it.id ? 'disabled' : ''}>
      <b style="--c:${it.color}"></b><span>${it.name}<small>${it.note}</small></span><em>${it.price}</em></button>`).join('');
  const el = $('#dSlot');
  el.innerHTML = `${head}<div class="shop">${shop}</div>`;
  el.querySelectorAll('.buy').forEach((b) => b.addEventListener('click', () => onPlace(islandId, b.dataset.item)));
}

// Catalog: residents found by petting, plus the rare visitors.
export function openDex(residents) {
  const all = [...residents, ...VISITORS.map((v) => ({ ...v, visitor: true }))];
  const found = all.filter((c) => game.seen(c.id)).length;
  $('#dexCount').textContent = `${found} / ${all.length}`;
  $('#dexGrid').innerHTML = all.map((c) => {
    const known = game.seen(c.id);
    const hint = c.visitor ? `喜歡${game.itemById(c.item).name}${c.night ? '，只在夜裡來' : ''}` : `常在${c.home}出沒`;
    return `<li class="${known ? '' : 'unknown'}${c.visitor ? ' rare' : ''}">${catFace(c.coat, !known)}
      <b>${known ? c.name : '？？？'}</b><small>${known ? c.trait : hint}</small>${known ? heartsRow(game.hearts(c.id)) : ''}</li>`;
  }).join('');
  $('#dex').hidden = false;
  $('#dexClose').focus();
}

export function initHud() {
  setFish(game.get().fish);
  $('#dexClose').addEventListener('click', () => ($('#dex').hidden = true));
  $('#dex').addEventListener('click', (e) => e.target.id === 'dex' && ($('#dex').hidden = true));
  addEventListener('keydown', (e) => e.key === 'Escape' && ($('#dex').hidden = true));
  game.on('fish', setFish);
  game.on('toast', toast);
}
