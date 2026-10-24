import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat } from './kit.js';

// Coats: body, head, and an optional patch color for calico / tuxedo markings.
export const COATS = [
  { body: '#E8954A', head: '#E8954A', patch: '#C9702E' }, // orange tabby
  { body: '#2E2B33', head: '#2E2B33' },                    // black
  { body: '#F4F1EC', head: '#F4F1EC', patch: '#E8954A' }, // white + ginger
  { body: '#9A9AA6', head: '#9A9AA6', patch: '#7C7C88' }, // grey
  { body: '#2E2B33', head: '#F4F1EC' },                    // tuxedo
  { body: '#F4F1EC', head: '#E8954A', patch: '#2E2B33' }, // calico
  { body: '#A47A55', head: '#A47A55', patch: '#7E5A3B' }, // brown tabby
];

const G = {
  body: new RoundedBoxGeometry(0.9, 0.42, 0.42, 2, 0.15),
  head: new RoundedBoxGeometry(0.42, 0.38, 0.44, 2, 0.12),
  ear: new THREE.ConeGeometry(0.09, 0.18, 4),
  leg: new THREE.BoxGeometry(0.1, 0.24, 0.1),
  eye: new THREE.BoxGeometry(0.02, 0.06, 0.05),
  nose: new THREE.BoxGeometry(0.02, 0.04, 0.06),
  tail: new THREE.CylinderGeometry(0.035, 0.05, 0.6, 5),
  patch: new RoundedBoxGeometry(0.34, 0.06, 0.3, 1, 0.03),
};
G.tail.translate(0, 0.3, 0); // pivot at the base of the tail
G.hit = new THREE.BoxGeometry(1.7, 1.5, 1.2);
const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });

function part(geo, color, x, y, z) {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// A cat faces +x. Its pose group is moved by the wander logic; parts are animated.
export function makeCat(coat, scale = 1) {
  const cat = new THREE.Group();
  const pose = new THREE.Group();
  cat.add(pose);
  const body = part(G.body, coat.body, 0, 0.42, 0);
  const head = new THREE.Group();
  head.position.set(0.5, 0.72, 0);
  head.add(part(G.head, coat.head, 0, 0, 0));
  for (const s of [-1, 1]) {
    const ear = part(G.ear, coat.ear || coat.head, -0.02, 0.24, 0.13 * s);
    ear.rotation.y = Math.PI / 4;
    head.add(ear);
    head.add(part(G.eye, '#1d1b22', 0.215, 0.04, 0.09 * s));
  }
  head.add(part(G.nose, '#E79AA4', 0.22, -0.05, 0));
  const legs = [];
  for (const [x, z] of [[0.28, 0.12], [0.28, -0.12], [-0.28, 0.12], [-0.28, -0.12]]) {
    const leg = part(G.leg, coat.body === '#2E2B33' && coat.head !== coat.body ? '#F4F1EC' : coat.body, x, 0.12, z);
    legs.push(leg);
    pose.add(leg);
  }
  const tail = part(G.tail, coat.body, -0.43, 0.5, 0);
  tail.rotation.z = 0.5;
  pose.add(body, head, tail);
  if (coat.patch) pose.add(part(G.patch, coat.patch, -0.1, 0.64, 0));
  // An invisible, roomier box so a moving cat is easy to tap.
  const hit = new THREE.Mesh(G.hit, HIT_MAT);
  hit.position.set(0.05, 0.6, 0);
  pose.add(hit);
  cat.scale.setScalar(scale);
  cat.userData = {
    pose, body, head, legs, tail,
    state: 'sit', timer: 1 + Math.random() * 3, target: new THREE.Vector2(),
    heading: Math.random() * Math.PI * 2, phase: Math.random() * 10, fixed: false,
  };
  cat.rotation.y = cat.userData.heading;
  return cat;
}

// Lying down: body lowered, legs tucked, head resting forward.
function setSleep(u, on) {
  u.pose.position.y = on ? -0.2 : 0;
  u.legs.forEach((l) => (l.visible = !on));
  u.head.position.set(on ? 0.48 : 0.5, on ? 0.6 : 0.72, 0);
}

const v = new THREE.Vector2();

// island: { free(x, z, pad), pathClear(ax, az, bx, bz) } in island-local coordinates.
export function updateCat(cat, dt, t, island) {
  const u = cat.userData;
  u.timer -= dt;
  const wag = Math.sin(t * 2.2 + u.phase);
  u.tail.rotation.x = wag * (u.state === 'sleep' ? 0.08 : 0.35);

  // A happy hop after being petted; the cat stays put until it lands.
  if (u.hop > 0) {
    u.hop = Math.max(0, u.hop - dt);
    u.pose.position.y = Math.sin((1 - u.hop / 0.5) * Math.PI) * 0.35;
    u.tail.rotation.x = Math.sin(t * 14) * 0.5;
    return;
  }

  if (u.state === 'walk') {
    v.set(u.target.x - cat.position.x, u.target.y - cat.position.z);
    const d = v.length();
    const want = Math.atan2(-v.y, v.x);
    let diff = want - cat.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    cat.rotation.y += diff * Math.min(1, dt * 6);
    const step = Math.min(d, dt * 0.9);
    cat.position.x += Math.cos(cat.rotation.y) * step;
    cat.position.z -= Math.sin(cat.rotation.y) * step;
    const swing = Math.sin(t * 11 + u.phase) * 0.5;
    u.legs.forEach((l, i) => (l.rotation.z = (i === 0 || i === 3 ? swing : -swing)));
    u.pose.position.y = Math.abs(Math.sin(t * 11 + u.phase)) * 0.03;
    if (d < 0.05 || u.timer < 0) enter(u, Math.random() < 0.2 ? 'sleep' : 'sit');
    return;
  }

  u.legs.forEach((l) => (l.rotation.z *= 0.8));
  u.head.rotation.y = u.state === 'sit' ? Math.sin(t * 0.7 + u.phase) * 0.5 : 0;
  if (u.fixed || u.timer > 0) return;

  // Pick a reachable spot on the island; stay put if none is found this time.
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * island.radius;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (island.free(x, z, 0.5) && island.pathClear(cat.position.x, cat.position.z, x, z)) {
      u.target.set(x, z);
      enter(u, 'walk');
      return;
    }
  }
  u.timer = 1.5;
}

function enter(u, state) {
  if (u.state === 'sleep' && state !== 'sleep') setSleep(u, false);
  u.state = state;
  if (state === 'sleep') setSleep(u, true);
  u.timer = state === 'walk' ? 8 : state === 'sleep' ? 8 + Math.random() * 10 : 2 + Math.random() * 5;
}

// Petted: a sleeping cat stays asleep; anyone else stops, hops, and sits for a moment.
export function petCat(cat) {
  const u = cat.userData;
  if (u.state === 'sleep') return;
  if (u.state === 'walk') enter(u, 'sit');
  u.pose.position.y = 0;
  u.hop = 0.5;
  if (!u.fixed) u.timer = Math.max(u.timer, 3);
}

export function fixCat(cat, state) {
  const u = cat.userData;
  u.fixed = true;
  enter(u, state);
}
