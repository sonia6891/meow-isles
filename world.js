import * as THREE from 'three';
import { mat, mesh, box, rng, tree, windowMat } from './kit.js';
import { BUILD, decorate } from './props.js';
import { makeCat, updateCat, fixCat, COATS } from './cat.js';
import { resident } from './roster.js';
import { itemMesh, slotMarker } from './items3d.js';

let residents = 0;

export const S = 5.6;      // hex grid spacing
export const R = 5;        // island circumradius
export const TOP = 1.0;    // island top height above the water
const SQ3 = Math.sqrt(3);

export const hexToWorld = (q, r) => new THREE.Vector3(SQ3 * S * (q + r / 2), TOP, 1.5 * S * r);

const PALETTES = {
  day:   { sky: '#BFE3F0', sun: '#FFF4E0', sunI: 2.4, sunPos: [30, 50, 22], hemiS: '#EAF6FF', hemiG: '#C9DDA8', hemiI: 1.3, water: '#7CC6C2', win: 0, beam: 0 },
  dusk:  { sky: '#F3C4A9', sun: '#FFB07A', sunI: 1.9, sunPos: [-46, 16, 26], hemiS: '#FFD9C2', hemiG: '#8C7A9A', hemiI: 1.0, water: '#8FAFC6', win: 0.7, beam: 0.1 },
  night: { sky: '#232A4D', sun: '#AFC0FF', sunI: 1.1, sunPos: [24, 44, 30], hemiS: '#6370B0', hemiG: '#2A3052', hemiI: 1.25, water: '#335C80', win: 1.6, beam: 0.2 },
};

function mix(a, b, t) {
  return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
}

function buildIsland(data, idx, bridgeDirs = []) {
  const r = rng(idx * 977 + 13);
  const group = new THREE.Group();
  group.position.copy(hexToWorld(data.q, data.r));

  const ground = mesh(new THREE.CylinderGeometry(R * 0.94, R * 0.97, 0.36, 6), mix(data.tint, '#F4EEE2', 0.45), 0, -0.18, 0);
  const sand = mesh(new THREE.CylinderGeometry(R, R * 1.06, 0.8, 6), '#EAD9B5', 0, -0.72, 0);
  const cliff = mesh(new THREE.CylinderGeometry(R * 1.06, R * 1.2, 2.0, 6), '#C9B48E', 0, -2.1, 0);
  group.add(ground, sand, cliff);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(R * 0.95, R * 1.03, 6, 1, Math.PI / 2).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 }),
  );
  ring.position.y = 0.03;
  group.add(ring);

  const obstacles = [];
  const radius = 3.9;
  const clear = (x, z, pad) => obstacles.every((o) => Math.hypot(x - o.x, z - o.z) > o.r + pad);
  const put = (obj, x, z, rad) => {
    obj.position.x = x;
    obj.position.z = z;
    group.add(obj);
    if (rad > 0) obstacles.push({ x, z, r: rad });
    return obj;
  };
  put.free = (x, z, pad) => Math.hypot(x, z) < radius + 0.3 && clear(x, z, pad);

  const extra = BUILD[data.kind](put, r) || {};

  // Keep the bridge landings clear of trees and the shop slot (cats in cat mode walk through here).
  for (const dir of bridgeDirs) obstacles.push({ x: dir.x * 3.6, z: dir.z * 3.6, r: 1.0, clear: true });

  // Reserve one slot at the front-left or front-right of the island (the label sits front-centre).
  let slot = null;
  for (let k = 0; k < 80 && !slot; k++) {
    const side = r() < 0.5 ? 0.1 + r() * 0.22 : 0.68 + r() * 0.22;
    const a = (k < 50 ? side : r() * 2) * Math.PI, d = 1.8 + r() * 1.8;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (put.free(x, z, 1.0)) slot = { x, z };
  }
  slot ||= { x: 0, z: 3 };
  obstacles.push({ x: slot.x, z: slot.z, r: 0.8 });
  const marker = slotMarker();
  marker.position.set(slot.x, 0.02, slot.z);
  group.add(marker);
  Object.assign(slot, { marker, mesh: null, visitor: null });

  decorate(put, r, data.kind === 'posts' ? 1 : 4);

  const island = {
    data, group, ground, ring, obstacles, radius, cats: [], slot,
    beam: extra.beam || null, lift: 0, liftTarget: 0,
    free: (x, z, pad) => Math.hypot(x, z) < radius && clear(x, z, pad),
    pathClear(ax, az, bx, bz) {
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        if (!clear(ax + (bx - ax) * t, az + (bz - az) * t, 0.3)) return false;
      }
      return true;
    },
  };

  const beds = extra.beds ? [...extra.beds] : [];
  for (let i = 0; i < data.cats; i++) {
    const coat = COATS[(idx * 3 + i) % COATS.length];
    const cat = makeCat(coat);
    cat.userData.info = resident(residents++, data.name, coat);
    if (beds.length && i < 2) {
      const [x, z] = beds.shift();
      cat.position.set(x, 0.05, z);
      fixCat(cat, 'sleep');
    } else {
      for (let k = 0; k < 30; k++) {
        const a = r() * Math.PI * 2, d = r() * radius;
        if (island.free(Math.cos(a) * d, Math.sin(a) * d, 0.5)) { cat.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); break; }
      }
    }
    group.add(cat);
    island.cats.push(cat);
  }
  if (extra.perch) {
    const cat = makeCat(COATS[1], 0.9);
    cat.userData.info = resident(residents++, data.name, COATS[1]);
    cat.position.set(...extra.perch);
    fixCat(cat, 'sit');
    group.add(cat);
    island.cats.push(cat);
  }
  return island;
}

function bridge(a, b) {
  const pa = a.group.position, pb = b.group.position;
  const g = new THREE.Group();
  const len = 2.8;
  g.add(box(len, 0.12, 1.1, '#B98955', 0, 0, 0));
  for (const s of [-1, 1]) {
    g.add(box(len, 0.06, 0.06, '#8C6B4F', 0, 0.5, s * 0.52));
    for (const x of [-len / 2 + 0.2, 0, len / 2 - 0.2]) g.add(box(0.07, 0.5, 0.07, '#8C6B4F', x, 0, s * 0.52));
  }
  g.position.set((pa.x + pb.x) / 2, TOP + 0.02, (pa.z + pb.z) / 2);
  g.rotation.y = Math.atan2(-(pb.z - pa.z), pb.x - pa.x);
  return g;
}

// Open sea out to the horizon, the small islets around the main island, and drifting clouds.
function surroundings(scene, isletsData, waterMat) {
  const r = rng(7);
  const ocean = new THREE.Mesh(new THREE.RingGeometry(60, 420, 64, 1).rotateX(-Math.PI / 2), waterMat);
  ocean.position.y = -0.05;
  ocean.receiveShadow = true;
  scene.add(ocean);

  const islets = isletsData.map((d) => {
    const g = new THREE.Group();
    for (let k = 0; k < d.cluster; k++) {
      const s = d.size * (k ? 0.55 + r() * 0.2 : 1);
      const ox = k ? (r() - 0.5) * 6 : 0, oz = k ? (r() - 0.5) * 6 : 0;
      g.add(mesh(new THREE.CylinderGeometry(s, s * 1.25, 1.4, 7), '#EAD9B5', ox, -0.3, oz));
      const hill = mesh(new THREE.IcosahedronGeometry(s * 0.75, 0), '#8CC07E', ox, 0.45, oz);
      hill.scale.y = 0.55;
      g.add(hill);
      if (!k && d.size > 1.2) {
        const t = tree(r);
        t.position.set(ox + s * 0.3, 0.5, oz - s * 0.2);
        t.scale.setScalar(0.7);
        g.add(t);
      }
    }
    g.position.set(d.x, 0, d.z);
    scene.add(g);
    return { name: d.name, group: g };
  });

  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const p = mesh(new THREE.IcosahedronGeometry(2 + r() * 1.6, 0), '#FFFFFF', k * 2.4 - 3.6, r() * 1.2, r() * 2);
      p.castShadow = false;
      c.add(p);
    }
    c.position.set(-100 + r() * 200, 16 + r() * 8, -58 - r() * 40); // far out to sea, never between camera and islands
    scene.add(c);
    clouds.push(c);
  }
  return { clouds, islets };
}

export function buildWorld(scene, islandsData, isletsData = []) {
  const hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 1);
  const sun = new THREE.DirectionalLight('#ffffff', 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 160 });
  sun.shadow.bias = -0.0006;
  scene.add(hemi, sun, sun.target);
  scene.fog = new THREE.Fog('#BFE3F0', 170, 380);
  scene.background = new THREE.Color('#BFE3F0');

  const waterGeo = new THREE.PlaneGeometry(130, 130, 70, 70).rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: '#7CC6C2', roughness: 0.35, flatShading: true }));
  water.receiveShadow = true;
  scene.add(water);
  const base = waterGeo.attributes.position.array.slice();

  const { clouds, islets } = surroundings(scene, isletsData, water.material);
  const pos = Object.fromEntries(islandsData.map((d) => [d.id, hexToWorld(d.q, d.r)]));
  const dirsFor = (d) => islandsData
    .filter((o) => o.id === d.to || o.to === d.id)
    .map((o) => pos[o.id].clone().sub(pos[d.id]).setY(0).normalize());
  const islands = islandsData.map((d, i) => buildIsland(d, i, dirsFor(d)));
  islands.forEach((isl) => scene.add(isl.group));
  const byId = Object.fromEntries(islands.map((i) => [i.data.id, i]));
  islands.forEach((isl) => isl.data.to && scene.add(bridge(isl, byId[isl.data.to])));

  const cur = { ...PALETTES.day };
  let target = PALETTES.day;
  const colorKeys = ['sky', 'sun', 'hemiS', 'hemiG', 'water'];
  const tmp = new THREE.Color();

  function applyPalette(k) {
    for (const key of colorKeys) cur[key] = '#' + tmp.set(cur[key]).lerp(new THREE.Color(target[key]), k).getHexString();
    for (const key of ['sunI', 'hemiI', 'win', 'beam']) cur[key] += (target[key] - cur[key]) * k;
    cur.sunPos = cur.sunPos.map((v, i) => v + (target.sunPos[i] - v) * k);
    scene.background.set(cur.sky);
    scene.fog.color.set(cur.sky);
    sun.color.set(cur.sun);
    sun.intensity = cur.sunI;
    sun.position.set(...cur.sunPos);
    hemi.color.set(cur.hemiS);
    hemi.groundColor.set(cur.hemiG);
    hemi.intensity = cur.hemiI;
    water.material.color.set(cur.water);
    windowMat.emissiveIntensity = cur.win;
    islands.forEach((i) => i.beam && (i.beam.material.opacity = cur.beam));
  }

  return {
    islands, byId, islets,
    setTime(mode, instant) {
      target = PALETTES[mode];
      if (instant) Object.assign(cur, target, { sunPos: [...target.sunPos] });
    },
    // Shop items and the rare visitors they attract.
    placeItem(islandId, itemId) {
      const s = byId[islandId].slot;
      if (s.mesh) byId[islandId].group.remove(s.mesh);
      s.mesh = itemMesh(itemId);
      s.mesh.position.set(s.x, 0, s.z);
      s.mesh.rotation.y = Math.atan2(s.x, s.z);
      byId[islandId].group.add(s.mesh);
      s.marker.visible = false;
    },
    spawnVisitor(islandId, visitor) {
      const isl = byId[islandId];
      if (isl.slot.visitor) this.removeVisitor(islandId);
      const cat = makeCat(visitor.coat, 1.05);
      cat.userData.info = { ...visitor, visitor: true, home: isl.data.name };
      const lieOn = ['cushion', 'bed', 'box'].includes(visitor.item);
      cat.position.set(isl.slot.x + (lieOn ? 0 : 0.95), lieOn ? (visitor.item === 'box' ? 0.72 : 0.22) : 0, isl.slot.z);
      cat.rotation.y = Math.atan2(-isl.slot.z, isl.slot.x); // face outward, toward the default camera
      fixCat(cat, visitor.item === 'bed' ? 'sleep' : 'sit');
      isl.group.add(cat);
      isl.cats.push(cat);
      isl.slot.visitor = cat;
    },
    removeVisitor(islandId) {
      const isl = byId[islandId];
      const cat = isl.slot.visitor;
      if (!cat) return;
      isl.group.remove(cat);
      isl.cats.splice(isl.cats.indexOf(cat), 1);
      isl.slot.visitor = null;
    },
    setSelected(id) { islands.forEach((i) => (i.liftTarget = i.data.id === id ? 0.35 : 0)); },
    setHover(id) { islands.forEach((i) => (i.ring.material.opacity = i.data.id === id ? 0.85 : 0)); },
    update(dt, t, paused) {
      applyPalette(Math.min(1, dt * 2.5));
      for (const isl of islands) {
        isl.lift += (isl.liftTarget - isl.lift) * Math.min(1, dt * 5);
        isl.group.position.y = TOP + isl.lift;
        if (isl.beam) isl.beam.rotation.y = t * 0.6;
      }
      if (paused) return;
      for (const isl of islands) for (const c of isl.cats) updateCat(c, dt, t, isl);
      clouds.forEach((c, i) => { c.position.x += dt * (0.6 + i * 0.05); if (c.position.x > 110) c.position.x = -110; });
      const p = waterGeo.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) p[i + 1] = Math.sin(base[i] * 0.18 + t * 1.1) * 0.12 + Math.cos(base[i + 2] * 0.15 + t * 0.8) * 0.1;
      waterGeo.attributes.position.needsUpdate = true;
    },
  };
}
