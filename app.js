import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ISLANDS, ISLETS, KIND_LABEL } from './data.js';
import { buildWorld, R } from './world.js';
import { petCat } from './cat.js';
import * as game from './game.js';
import * as hud from './hud.js';
import { GAMES, openGame, initGames } from './games.js';
import { createPlayer } from './player.js';

const $ = (s) => document.querySelector(s);
const stage = $('#stage');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const labels = new CSS2DRenderer();
labels.domElement.className = 'labels';
stage.appendChild(labels.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 600);
const controls = new OrbitControls(camera, labels.domElement);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 12, maxDistance: 240, maxPolarAngle: 1.32, minPolarAngle: 0.35 });

const world = buildWorld(scene, ISLANDS, ISLETS);
const HOME_TARGET = new THREE.Vector3(0.5, 0, 2.5);

for (const islet of world.islets) {
  const el = document.createElement('span');
  el.className = 'islet';
  el.textContent = islet.name;
  const obj = new CSS2DObject(el);
  obj.position.set(0, 1.6, 0);
  islet.group.add(obj);
}

// ---------- labels on the map ----------
const pins = [];
for (const isl of world.islands) {
  const el = document.createElement('button');
  el.className = 'pin';
  el.type = 'button';
  el.dataset.id = isl.data.id;
  el.style.setProperty('--c', isl.data.tint);
  el.innerHTML = `<i></i><span>${isl.data.name}</span>`;
  el.title = isl.data.name;
  pins.push(el);
  // Keep OrbitControls from capturing the pointer, or the button never gets its click.
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('click', (e) => { e.stopPropagation(); select(isl.data.id); });
  el.addEventListener('pointerenter', () => world.setHover(isl.data.id));
  el.addEventListener('pointerleave', () => world.setHover(null));
  const obj = new CSS2DObject(el);
  obj.position.set(0, 0.7, R * 0.62);
  isl.group.add(obj);
  isl.group.userData.islandId = isl.data.id;
}

// ---------- layout: keep the scene centred in the area the panels leave free ----------
const narrow = () => innerWidth < 760;
const shift = { x: 0, y: 0, tx: 0, ty: 0, freeW: 1, freeH: 1 };
function measureShift() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (narrow()) {
    // Phone: the toolbar takes the top, the sheet takes the bottom.
    const top = $('.top').getBoundingClientRect().bottom || 0;
    const sheet = ((selected ? $('#detail') : $('#panel')).getBoundingClientRect().height) || 0;
    shift.tx = 0;
    shift.ty = (top - sheet) / 2;
    shift.freeW = w;
    shift.freeH = Math.max(h - top - sheet, 1);
  } else {
    const p = $('#panel').getBoundingClientRect().width + 24;
    const l = selected ? $('#detail').getBoundingClientRect().width + 24 : 0;
    shift.tx = (l - p) / 2;
    shift.ty = 0;
    shift.freeW = Math.max(w - l - p, 1);
    shift.freeH = h;
  }
}
function applyView() {
  const w = stage.clientWidth, h = stage.clientHeight;
  const ax = Math.abs(shift.x) * 2, ay = Math.abs(shift.y) * 2;
  camera.aspect = (w + ax) / (h + ay);
  camera.setViewOffset(w + ax, h + ay, shift.x < 0 ? ax : 0, shift.y < 0 ? ay : 0, w, h);
}
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h);
  labels.setSize(w, h);
  measureShift();
  shift.x = shift.tx; shift.y = shift.ty;
  applyView();
}

function homePose() {
  // The frustum spans the virtual frame (stage + view offset); fit the archipelago into the free part.
  const fullH = stage.clientHeight + Math.abs(shift.ty) * 2;
  const { freeW, freeH } = shift;
  const tan = Math.tan(THREE.MathUtils.degToRad(19));
  // Taiwan runs north–south, so height usually decides the distance; a steeper angle keeps its outline readable.
  const d = Math.max(58, ((narrow() ? 19 : 26) * fullH) / (tan * freeW), (34 * fullH) / (tan * freeH));
  const el = THREE.MathUtils.degToRad(58);
  return { target: HOME_TARGET.clone(), pos: HOME_TARGET.clone().add(new THREE.Vector3(0, Math.sin(el) * d, Math.cos(el) * d)) };
}
function islandPose(isl) {
  const target = isl.group.position.clone();
  target.y = 1;
  const az = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
  const d = narrow() ? 38 : 32;
  const el = THREE.MathUtils.degToRad(46);
  return { target, pos: target.clone().add(new THREE.Vector3(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d)) };
}

let fly = null;
function flyTo(pose) {
  if (reduced) {
    camera.position.copy(pose.pos);
    controls.target.copy(pose.target);
    return;
  }
  fly = { t: 0, fromPos: camera.position.clone(), fromTgt: controls.target.clone(), ...pose };
}

// ---------- selection & detail card ----------
let selected = null;
function select(id, openItem) {
  const isl = world.byId[id];
  if (!isl) return;
  selected = id;
  const d = isl.data;
  world.setSelected(id);
  const card = $('#detail');
  card.style.setProperty('--c', d.tint);
  $('#dChip').textContent = d.name[0];
  $('#dEyebrow').textContent = `${d.en} · ${KIND_LABEL[d.kind]}`;
  $('#dTitle').textContent = d.name;
  $('#dBlurb').textContent = d.blurb;
  $('#dQuote').textContent = `「${d.quote}」`;
  $('#dTags').innerHTML = `<span>${d.items.length} 個去處</span><span>${isl.cats.length} 隻常駐貓</span>`;
  $('#dItems').innerHTML = d.items.map((it, i) => `
    <li><details${openItem === i ? ' open' : ''}><summary><span>${it.n}</span><em>${it.t}</em></summary><p>${it.d}</p></details></li>`).join('');
  hud.renderSlot(id, placeItem);
  const g = GAMES[id];
  $('#dPlay').innerHTML = g ? `<button type="button" class="playBtn">玩小遊戲：${g.title}<small>贏小魚乾</small></button>` : '';
  if (g) $('#dPlay button').onclick = () => openGame(id);
  card.hidden = false;
  document.body.classList.add('has-detail');
  document.querySelectorAll('.isle').forEach((b) => b.setAttribute('aria-current', b.dataset.id === id ? 'true' : 'false'));
  measureShift();
  flyTo(islandPose(isl));
  dismissHint();
}
function closeDetail() {
  selected = null;
  world.setSelected(null);
  $('#detail').hidden = true;
  document.body.classList.remove('has-detail');
  document.querySelectorAll('.isle').forEach((b) => b.setAttribute('aria-current', 'false'));
  measureShift();
  flyTo(homePose());
}
$('#dClose').addEventListener('click', closeDetail);
// Escape closes the topmost layer only: a game or the catalog first, the island card after.
addEventListener('keydown', (e) => e.key === 'Escape' && selected && $('#gameLayer').hidden && $('#dex').hidden && closeDetail(), true);

// ---------- index panel ----------
const totalItems = ISLANDS.reduce((n, d) => n + d.items.length, 0);
const totalCats = world.islands.reduce((n, i) => n + i.cats.length, 0);
$('#stats').textContent = `${ISLANDS.length} 座島 · ${totalItems} 個去處 · ${totalCats} 隻貓`;

function renderList(q = '') {
  q = q.trim().toLowerCase();
  const rows = ISLANDS.map((d) => {
    const hay = (d.name + d.en + d.blurb).toLowerCase();
    const hits = q ? d.items.map((it, i) => [it, i]).filter(([it]) => (it.n + it.d + it.t).toLowerCase().includes(q)) : [];
    if (q && !hay.includes(q) && !hits.length) return '';
    return `<li>
      <button class="isle" type="button" data-id="${d.id}" aria-current="${selected === d.id}" style="--c:${d.tint}">
        <b class="hex">${d.name[0]}</b><span class="nm">${d.name}<small>${d.en}</small></span><span class="ct">${d.items.length}</span>
      </button>
      ${hits.map(([it, i]) => `<button class="hit" type="button" data-id="${d.id}" data-item="${i}">${it.n}<em>${it.t}</em></button>`).join('')}
    </li>`;
  }).join('');
  $('#islandList').innerHTML = rows || `<li class="empty">沒有找到「${q}」。試試「紙箱」、「睡」或「魚」。</li>`;
}
$('#islandList').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-id]');
  if (!b) return;
  select(b.dataset.id, b.dataset.item != null ? Number(b.dataset.item) : undefined);
  if (narrow()) document.body.classList.remove('sheet-open');
});
$('#search').addEventListener('input', (e) => renderList(e.target.value));
$('#sheetToggle').addEventListener('click', () => {
  const open = document.body.classList.toggle('sheet-open');
  $('#sheetToggle').setAttribute('aria-expanded', String(open));
  requestAnimationFrame(measureShift);
});
renderList();

// ---------- toolbar ----------
const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
let timeMode = 'day';
function setTime(mode, instant) {
  timeMode = mode;
  world.setTime(mode, instant);
  document.querySelectorAll('[data-time]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.time === mode)));
}
document.querySelectorAll('[data-time]').forEach((b) => b.addEventListener('click', () => setTime(b.dataset.time)));
setTime(prefersDark ? 'night' : 'day', true);

let paused = reduced;
const toggle = (btn, on) => btn.setAttribute('aria-pressed', String(on));
toggle($('#tPause'), paused);
$('#tPause').addEventListener('click', () => toggle($('#tPause'), (paused = !paused)));
$('#tLabels').addEventListener('click', (e) => {
  const on = labels.domElement.classList.toggle('off');
  toggle(e.currentTarget, !on);
});
$('#tHome').addEventListener('click', () => (player.active ? exitCatMode() : selected ? closeDetail() : flyTo(homePose())));

// ---------- collecting: items, visitors, catalog ----------
function placeItem(islandId, itemId) {
  if (!game.place(islandId, itemId)) return hud.toast('小魚乾不夠，先去摸摸貓吧');
  world.placeItem(islandId, itemId);
  world.removeVisitor(islandId);
  hud.toast(`在${world.byId[islandId].data.name}放好了${game.itemById(itemId).name}`);
  hud.renderSlot(islandId, placeItem);
  setTimeout(() => game.tickVisitors(timeMode === 'night'), 8000);
}
const refreshSlot = (islandId) => selected === islandId && hud.renderSlot(islandId, placeItem);
game.on('visitor-arrive', ({ itemId, island }) => { world.spawnVisitor(island, game.visitorFor(itemId)); refreshSlot(island); });
game.on('visitor-leave', ({ island }) => { world.removeVisitor(island); refreshSlot(island); });
game.on('seen', (info) => hud.toast(`圖鑑新增：${info.name}`));

hud.initHud();
initGames();
for (const [islandId, itemId] of Object.entries(game.get().slots)) world.byId[islandId] && world.placeItem(islandId, itemId);
for (const [itemId, v] of Object.entries(game.get().visitors)) {
  if (v.until > Date.now() && world.byId[v.island]) world.spawnVisitor(v.island, game.visitorFor(itemId));
}
setTimeout(() => game.welcomeBack(), 1200);
setInterval(() => game.tickVisitors(timeMode === 'night'), 15000);

const residents = () => world.islands.flatMap((i) => i.cats.map((c) => c.userData.info).filter((c) => !c.visitor));
$('#openDex').addEventListener('click', () => hud.openDex(residents()));

// ---------- cat mode ----------
const TIMES = ['day', 'dusk', 'night'];
const player = createPlayer({ scene, world, camera, controls, onNap: () => setTime(TIMES[(TIMES.indexOf(timeMode) + 1) % 3]) });
function enterCatMode() {
  if (selected) closeDetail();
  document.body.classList.add('cat-mode');
  $('#catHud').hidden = false;
  dismissHint();
  measureShift();
  player.enter();
  fly = null;
}
function exitCatMode() {
  player.exit();
  document.body.classList.remove('cat-mode');
  $('#catHud').hidden = true;
  measureShift();
  flyTo(homePose());
}
$('#openCat').addEventListener('click', enterCatMode);
$('#cExit').addEventListener('click', exitCatMode);
addEventListener('keydown', (e) => e.key === 'Escape' && player.active && $('#gameLayer').hidden && $('#dex').hidden && exitCatMode());

// ---------- picking ----------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const groups = world.islands.map((i) => i.group);
function pick(e) {
  const rect = labels.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(groups, true)[0];
  let o = hit?.object;
  while (o && !o.userData.islandId && !o.userData.info) o = o.parent;
  if (o?.userData.info) return { cat: o, island: islandOf(o) };
  return o ? { island: o.userData.islandId } : null;
}
function islandOf(obj) {
  while (obj && !obj.userData.islandId) obj = obj.parent;
  return obj?.userData.islandId || null;
}

// ---------- petting ----------
function petAt(cat) {
  const info = cat.userData.info;
  const res = game.pet(info);
  hud.showCat(info, res);
  if (res.rest) return;
  petCat(cat);
  const el = document.createElement('span');
  el.className = 'heart';
  el.textContent = `♥ +${res.gain}`;
  const pop = new CSS2DObject(el);
  pop.position.set(0, 1.6, 0);
  cat.add(pop);
  setTimeout(() => { cat.remove(pop); el.remove(); }, 1100);
}
let down = null;
labels.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; dismissHint(); });
labels.domElement.addEventListener('pointerup', (e) => {
  if (!down || e.target.closest('.pin') || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
  const hit = pick(e);
  if (hit?.cat) petAt(hit.cat);
  else if (hit?.island && !player.active) select(hit.island);
});
labels.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons) return;
  const hit = pick(e);
  world.setHover(hit?.island || null);
  labels.domElement.style.cursor = hit ? 'pointer' : '';
});
controls.addEventListener('start', () => (fly = null));

function dismissHint() { $('#hint').classList.add('gone'); }

// Crowded labels shrink to a dot (the selected island's label always keeps its name).
function declutter() {
  const placed = [];
  const order = [...pins].sort((a, b) => (b.dataset.id === selected) - (a.dataset.id === selected));
  for (const el of order) {
    if (!el.dataset.w) el.dataset.w = el.offsetWidth;
    const r = el.getBoundingClientRect();
    const box = { x: r.left + r.width / 2, y: r.top + r.height / 2, w: Number(el.dataset.w), h: r.height };
    const crowded = placed.some((p) => Math.abs(p.x - box.x) < (p.w + box.w) / 2 + 4 && Math.abs(p.y - box.y) < box.h + 2);
    el.classList.toggle('mini', crowded);
    if (!crowded) placed.push(box);
  }
}

// ---------- loop ----------
addEventListener('resize', resize);
resize();
const home = homePose();
camera.position.copy(home.pos);
controls.target.copy(home.target);

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (Math.abs(shift.x - shift.tx) > 0.5 || Math.abs(shift.y - shift.ty) > 0.5) {
    shift.x += (shift.tx - shift.x) * Math.min(1, dt * 6);
    shift.y += (shift.ty - shift.y) * Math.min(1, dt * 6);
    applyView();
  }
  if (fly) {
    fly.t = Math.min(1, fly.t + dt / 1.1);
    const k = fly.t < 0.5 ? 2 * fly.t * fly.t : 1 - Math.pow(-2 * fly.t + 2, 2) / 2;
    camera.position.lerpVectors(fly.fromPos, fly.pos, k);
    controls.target.lerpVectors(fly.fromTgt, fly.target, k);
    if (fly.t === 1) fly = null;
  }
  player.update(dt, t);
  controls.update();
  world.update(dt, t, paused);
  renderer.render(scene, camera);
  labels.render(scene, camera);
  if (++frame % 6 === 0) declutter();
});
let frame = 0;
