import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Shared low-poly building blocks. Materials are cached per color.
const cache = new Map();
export function mat(color, extra) {
  const key = color + (extra ? JSON.stringify(extra) : '');
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...extra }));
  }
  return cache.get(key);
}

// Windows glow after dark; app.js drives emissiveIntensity by time of day.
export const windowMat = new THREE.MeshStandardMaterial({ color: '#3b3f57', emissive: '#FFC86B', emissiveIntensity: 0, roughness: 0.4 });

export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function mesh(geo, color, x = 0, y = 0, z = 0, material) {
  const m = new THREE.Mesh(geo, material || mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export const box = (w, h, d, color, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), color, x, y + h / 2, z);
export const rbox = (w, h, d, color, x, y, z, r = 0.08) => mesh(new RoundedBoxGeometry(w, h, d, 2, r), color, x, y + h / 2, z);
export const cyl = (rt, rb, h, color, x, y, z, seg = 8) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y + h / 2, z);

// A small house with a hip roof and windows on the long sides. Faces +z.
export function house(w, d, h, wall, roof) {
  const g = new THREE.Group();
  g.add(rbox(w, h, d, wall, 0, 0, 0, 0.06));
  const r = mesh(new THREE.ConeGeometry(1, h * 0.55, 4), roof, 0, h + h * 0.275, 0);
  r.rotation.y = Math.PI / 4;
  r.scale.set((w * 1.18) / Math.SQRT2, 1, (d * 1.18) / Math.SQRT2);
  g.add(r);
  const cols = Math.max(1, Math.round(w / 0.9));
  for (let i = 0; i < cols; i++) {
    const x = (i - (cols - 1) / 2) * (w / cols);
    for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.32, 0.38, 0.04), null, x, h * 0.58, s * (d / 2 + 0.01), windowMat));
  }
  g.add(mesh(new THREE.BoxGeometry(0.4, 0.62, 0.05), '#6B4E3D', w * 0.28, 0.31, d / 2 + 0.02));
  return g;
}

const GREENS = ['#6FAE6A', '#82BD72', '#5E9C63', '#93C47D'];
export function tree(r, kind) {
  const g = new THREE.Group();
  const h = 0.6 + r() * 0.5;
  g.add(cyl(0.08, 0.12, h, '#7A5A43', 0, 0, 0, 5));
  const green = GREENS[Math.floor(r() * GREENS.length)];
  if (kind === 'pine' || r() < 0.35) {
    g.add(mesh(new THREE.ConeGeometry(0.55, 1.2, 6), green, 0, h + 0.5, 0));
    g.add(mesh(new THREE.ConeGeometry(0.42, 0.9, 6), green, 0, h + 1.0, 0));
  } else {
    const s = 0.55 + r() * 0.3;
    g.add(mesh(new THREE.IcosahedronGeometry(s, 0), green, 0, h + s * 0.7, 0));
  }
  return g;
}

export function rock(r, color = '#A7A2A0') {
  const s = 0.25 + r() * 0.35;
  const m = mesh(new THREE.DodecahedronGeometry(s, 0), color, 0, s * 0.4, 0);
  m.scale.y = 0.6;
  m.rotation.y = r() * 6;
  return m;
}
