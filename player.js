import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { makeCat, petCat } from './cat.js';
import { R, TOP } from './world.js';
import * as game from './game.js';
import * as hud from './hud.js';

// Play as a cat: walk the islands and bridges, meow at other cats, hop, and nap until the sky changes.
const COAT = { body: '#F3EDE6', head: '#F3EDE6', ear: '#A89C96', patch: '#B3A7A1' }; // the ragdoll kitten from the logo
const SQ3 = Math.sqrt(3);
const $ = (s) => document.querySelector(s);

const inHex = (dx, dz, r) => { const q = Math.abs(dx), s = Math.abs(dz); return q <= (r * SQ3) / 2 && s <= r - q / SQ3; };

export function createPlayer({ scene, world, camera, controls, onNap }) {
  const cat = makeCat(COAT, 1.1);
  cat.visible = false;
  scene.add(cat);
  const u = cat.userData;
  const bubble = document.createElement('span');
  bubble.className = 'meow';
  bubble.textContent = '喵～';
  const bubbleObj = new CSS2DObject(bubble);
  bubbleObj.position.set(0.3, 1.9, 0);
  bubbleObj.visible = false;
  cat.add(bubbleObj);

  const bridges = world.islands.filter((i) => i.data.to).map((i) => [i.group.position, world.byId[i.data.to].group.position]);
  const keys = new Set();
  const joy = new THREE.Vector2();
  let active = false, heading = 0, hop = 0, napping = 0, meowT = 0, onIsland = null;

  // Ground height under (x, z), or null over water. Props on the island block the way.
  function surface(x, z) {
    for (const isl of world.islands) {
      const p = isl.group.position;
      const dx = x - p.x, dz = z - p.z;
      if (!inHex(dx, dz, R * 0.92)) continue;
      if (isl.obstacles.some((o) => !o.clear && Math.hypot(dx - o.x, dz - o.z) < o.r * 0.6 + 0.2)) return { blocked: true };
      return { y: p.y, island: isl };
    }
    for (const [a, b] of bridges) {
      const ab = new THREE.Vector2(b.x - a.x, b.z - a.z);
      const t = ((x - a.x) * ab.x + (z - a.z) * ab.y) / ab.lengthSq();
      if (t < 0 || t > 1) continue;
      const px = a.x + ab.x * t, pz = a.z + ab.y * t;
      if (Math.hypot(x - px, z - pz) < 0.75) return { y: TOP + 0.14 };
    }
    return null;
  }

  function arrive(isl) {
    if (!isl || isl === onIsland) return;
    onIsland = isl;
    const v = game.visit(isl.data.id);
    $('#cVisit').textContent = `走過 ${v.count} / ${world.islands.length} 座島`;
    if (v.first) {
      game.addFish(5, `第一次走到${isl.data.name}，+5 小魚乾`);
      if (v.count === world.islands.length) game.addFish(50, '十二座島全部走過了！獎勵 50 條小魚乾');
    }
  }

  function meow() {
    if (!active) return;
    meowT = 1.2;
    bubbleObj.visible = true;
    let nearest = null, best = 2.4;
    const wp = new THREE.Vector3();
    for (const isl of world.islands) {
      for (const c of isl.cats) {
        c.getWorldPosition(wp);
        const d = wp.distanceTo(cat.position);
        if (d < 4.5) petCat(c);
        if (d < best) { best = d; nearest = c; }
      }
    }
    if (nearest) hud.showCat(nearest.userData.info, game.pet(nearest.userData.info));
  }

  function nap() {
    if (!active) return;
    napping = napping ? 0 : 0.01;
    u.pose.position.y = napping ? -0.2 : 0;
    u.legs.forEach((l) => (l.visible = !napping));
    if (napping) hud.toast('趴下來睡一下……睡久一點，天色就會變');
  }

  const onKey = (e) => {
    if (!active || e.target.closest?.('input, textarea')) return;
    const k = e.key.toLowerCase();
    if (e.type === 'keydown') {
      if (k === ' ') { hop = hop || 0.45; e.preventDefault(); }
      if (k === 'm') meow();
      if (k === 'z') nap();
      keys.add(k);
    } else keys.delete(k);
  };
  addEventListener('keydown', onKey);
  addEventListener('keyup', onKey);

  // Touch joystick: drag inside the pad; the knob follows, clamped to the ring.
  const pad = $('#joy'), knob = $('#joy span');
  pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture(e.pointerId); move(e); });
  pad.addEventListener('pointermove', (e) => e.buttons && move(e));
  const release = () => { joy.set(0, 0); knob.style.transform = ''; };
  pad.addEventListener('pointerup', release);
  pad.addEventListener('pointercancel', release);
  function move(e) {
    const r = pad.getBoundingClientRect();
    joy.set((e.clientX - r.left - r.width / 2) / (r.width / 2), (e.clientY - r.top - r.height / 2) / (r.height / 2));
    if (joy.length() > 1) joy.normalize();
    knob.style.transform = `translate(${joy.x * 34}px, ${joy.y * 34}px)`;
  }
  $('#cMeow').addEventListener('click', meow);
  $('#cJump').addEventListener('click', () => (hop = hop || 0.45));
  $('#cNap').addEventListener('click', nap);

  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), step = new THREE.Vector3();

  const api = {
    get active() { return active; },
    enter() {
      const start = world.byId.sun.group.position;
      cat.position.set(start.x, start.y, start.z + 1.5);
      cat.visible = true;
      active = true;
      onIsland = null;
      controls.minDistance = 4;
      controls.target.copy(cat.position);
      const far = innerWidth < 760 ? 1.45 : 1; // portrait phones need more room around the cat
      camera.position.copy(cat.position).add(new THREE.Vector3(0, 7 * far, 9 * far));
      arrive(world.byId.sun);
    },
    exit() {
      active = false;
      cat.visible = false;
      napping = 0;
      u.pose.position.y = 0;
      u.legs.forEach((l) => (l.visible = true));
      controls.minDistance = 12;
      keys.clear();
    },
    update(dt, t) {
      if (!active) return;
      let mx = joy.x, my = joy.y;
      if (keys.has('arrowleft') || keys.has('a')) mx -= 1;
      if (keys.has('arrowright') || keys.has('d')) mx += 1;
      if (keys.has('arrowup') || keys.has('w')) my -= 1;
      if (keys.has('arrowdown') || keys.has('s')) my += 1;
      const amount = Math.min(1, Math.hypot(mx, my));
      if (amount > 0.1 && napping) nap();

      if (napping) {
        napping += dt;
        u.tail.rotation.x = Math.sin(t * 1.5) * 0.08;
        if (napping > 6) { napping = 0.01; onNap(); hud.toast('睡醒了，天色變了'); }
      } else if (amount > 0.1) {
        camera.getWorldDirection(fwd);
        fwd.y = 0; fwd.normalize();
        right.crossVectors(fwd, THREE.Object3D.DEFAULT_UP);
        step.copy(fwd).multiplyScalar(-my).addScaledVector(right, mx).normalize();
        const speed = (keys.has('shift') ? 5.5 : 3.2) * amount * dt;
        const want = Math.atan2(-step.z, step.x);
        let diff = Math.atan2(Math.sin(want - heading), Math.cos(want - heading));
        heading += diff * Math.min(1, dt * 10);
        // Blocked? Steer around: try the wanted direction, then gradually wider angles either side.
        const ok = (s) => s && !s.blocked;
        let nx = 0, nz = 0, g = null;
        for (const turn of [0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5]) {
          const a = want + turn;
          nx = cat.position.x + Math.cos(a) * speed;
          nz = cat.position.z - Math.sin(a) * speed;
          g = surface(nx, nz);
          if (ok(g)) break;
        }
        if (ok(g)) {
          const before = cat.position.clone();
          cat.position.set(nx, cat.position.y + (g.y - cat.position.y) * Math.min(1, dt * 12), nz);
          controls.target.add(step.set(cat.position.x - before.x, cat.position.y - before.y, cat.position.z - before.z));
          camera.position.add(step);
          if (g.island) arrive(g.island);
        }
        const swing = Math.sin(t * 13) * 0.55;
        u.legs.forEach((l, i) => (l.rotation.z = i === 0 || i === 3 ? swing : -swing));
      } else {
        u.legs.forEach((l) => (l.rotation.z *= 0.8));
      }
      cat.rotation.y = heading;
      if (!napping) u.tail.rotation.x = Math.sin(t * 3) * 0.3;
      if (hop > 0) {
        hop = Math.max(0, hop - dt);
        u.pose.position.y = Math.sin((1 - hop / 0.45) * Math.PI) * 0.9;
      } else if (!napping) u.pose.position.y = 0;
      if (meowT > 0 && (meowT -= dt) <= 0) bubbleObj.visible = false;
    },
  };
  return api;
}
