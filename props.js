import * as THREE from 'three';
import { mat, mesh, box, rbox, cyl, house, tree, rock } from './kit.js';

// Each builder decorates one island. `put(obj, x, z, radius)` places an object on the
// island's top surface (y = 0) and records it as an obstacle the cats walk around.
// Builders may return { beam } or { beds: [[x, z], ...] } for app.js to use.
const SISAL = '#CDB283';
const PASTELS = ['#F2A7B8', '#A9C4E8', '#F4D27A', '#B9A6D9', '#9CCB86'];

export const BUILD = {
  tower(put, r) {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      g.add(cyl(0.18, 0.18, 6.6, SISAL, Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8, 8));
    }
    [1.2, 2.3, 3.4, 4.5, 5.6, 6.6].forEach((y, i) => {
      const rad = 1.5 - i * 0.16;
      g.add(cyl(rad, rad, 0.18, i % 2 ? '#8E6FB8' : '#E2C9A5', 0, y, 0, 10));
    });
    const basket = mesh(new THREE.TorusGeometry(0.45, 0.14, 6, 12), '#B98955', 1.35, 3.0, 0.2);
    basket.rotation.x = Math.PI / 2;
    g.add(basket);
    put(g, 0, 0, 1.7);
    put(house(1.8, 1.4, 1.2, '#F3E7D6', '#8E6FB8'), -2.6, 1.6, 1.2);
    return { perch: [0, 6.8, 0] };
  },

  lighthouse(put, r) {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) g.add(cyl(1.0 - i * 0.07 - 0.07, 1.0 - i * 0.07, 1.2, i % 2 ? '#E05D5D' : '#F7F3EE', 0, i * 1.2, 0, 12));
    g.add(cyl(0.95, 0.95, 0.12, '#3D4057', 0, 6.0, 0, 12));
    g.add(mesh(new THREE.SphereGeometry(0.45, 10, 8), null, 0, 6.6, 0,
      new THREE.MeshStandardMaterial({ color: '#FFE7A3', emissive: '#FFD36B', emissiveIntensity: 0.6 })));
    g.add(mesh(new THREE.ConeGeometry(0.75, 0.8, 12), '#E05D5D', 0, 7.35, 0));
    const beamGeo = new THREE.ConeGeometry(1.6, 14, 16, 1, true);
    beamGeo.translate(0, -7, 0);
    beamGeo.rotateZ(Math.PI / 2);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({
      color: '#FFE9A8', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    }));
    beam.position.y = 6.6;
    g.add(beam);
    put(g, 0.6, -0.4, 1.4);
    put(house(1.6, 1.3, 1.1, '#F7F3EE', '#3D4057'), -2.2, 1.5, 1.1);
    for (let i = 0; i < 4; i++) put(rock(r), 2.6 + r() * 1.0, 1.0 + i * 0.6, 0.4);
    return { beam };
  },

  garden(put, r) {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const x = -2.4 + col * 1.2, z = -1.8 + row * 1.0;
        const bush = mesh(new THREE.IcosahedronGeometry(0.34, 0), row === 1 ? '#7DBB6E' : '#5FA866', x, 0.28, z);
        bush.scale.y = 0.75;
        put(bush, x, z, 0.4);
        put(mesh(new THREE.SphereGeometry(0.09, 6, 4), PASTELS[(row + col) % 5], 0, 0.55, 0), x + 0.15, z + 0.1, 0);
      }
    }
    put(box(1.4, 0.12, 0.45, '#B98955', 0, 0.35, 0), 1.4, 2.0, 0.8);
    const gh = new THREE.Group();
    gh.add(box(1.8, 1.1, 1.3, null, 0, 0, 0));
    gh.children[0].material = new THREE.MeshStandardMaterial({ color: '#CFEAE4', transparent: true, opacity: 0.55, roughness: 0.2 });
    gh.add(mesh(new THREE.ConeGeometry(1.15, 0.6, 4), '#E9F4F1', 0, 1.4, 0));
    gh.children[1].rotation.y = Math.PI / 4;
    put(gh, -1.6, 2.2, 1.2);
  },

  library(put) {
    const lib = house(3.4, 2.2, 2.0, '#EEE6F6', '#6F5A9C');
    put(lib, 0, -0.8, 2.1);
    for (let s = 0; s < 3; s++) {
      const g = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const b = box(0.62, 0.12, 0.42, PASTELS[(i + s) % 5], 0, i * 0.12, 0);
        b.rotation.y = (i % 2) * 0.25 - 0.1;
        g.add(b);
      }
      put(g, -1.8 + s * 1.3, 2.0, 0.5);
    }
    put(box(1.5, 0.12, 0.45, '#8E6FB8', 0, 0.35, 0), 1.9, 1.6, 0.8);
  },

  yarn(put, r) {
    const spots = [[-1.8, -1.2, 0.8], [0.4, -2.0, 0.6], [1.9, -0.4, 0.5], [-0.6, 0.6, 0.45], [1.3, 1.6, 0.7]];
    spots.forEach(([x, z, s], i) => {
      const g = new THREE.Group();
      g.add(mesh(new THREE.IcosahedronGeometry(s, 1), PASTELS[i % 5], 0, s, 0));
      const wrap = mesh(new THREE.TorusGeometry(s * 0.98, 0.04, 4, 16), '#ffffff', 0, s, 0);
      wrap.rotation.set(r() * 3, r() * 3, 0);
      g.add(wrap);
      put(g, x, z, s + 0.2);
    });
    const ramp = box(3.2, 0.14, 1.0, '#E2C9A5', 0, 0, 0);
    ramp.rotation.z = 0.28;
    ramp.position.y = 0.45;
    put(ramp, -1.6, 2.2, 1.5);
    put(house(1.6, 1.3, 1.2, '#FBEFF2', '#D9708A'), 2.4, 2.4, 1.1);
  },

  posts(put, r) {
    for (let i = 0; i < 22; i++) {
      const a = r() * Math.PI * 2, d = 0.8 + r() * 3.0;
      const h = 0.7 + r() * 2.2;
      const g = new THREE.Group();
      g.add(cyl(0.16, 0.18, h, SISAL, 0, 0, 0, 7));
      if (r() < 0.4) g.add(cyl(0.45, 0.45, 0.1, '#8C6B4F', 0, h, 0, 8));
      put(g, Math.cos(a) * d, Math.sin(a) * d, 0.35);
    }
  },

  boxes(put, r) {
    for (let p = 0; p < 4; p++) {
      const g = new THREE.Group();
      let y = 0;
      const n = 1 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const s = 0.9 - i * 0.18 + r() * 0.1;
        const b = box(s, s * 0.8, s, i % 2 ? '#C89A63' : '#B98955', 0, y, 0);
        b.rotation.y = r() * 0.6;
        g.add(b, box(s * 1.01, 0.04, 0.16, '#E9D2A6', 0, y + s * 0.8, 0));
        g.children[g.children.length - 1].rotation.y = b.rotation.y;
        y += s * 0.8;
      }
      put(g, -2.4 + p * 1.2, -1.6 + (p % 2) * 0.9, 0.7);
    }
    const pier = new THREE.Group();
    for (let i = 0; i < 6; i++) pier.add(box(0.5, 0.1, 1.4, '#A47A55', -i * 0.55, -0.2, 0));
    put(pier, -4.2, 1.2, 0);
    const boat = new THREE.Group();
    boat.add(rbox(2.0, 0.5, 0.9, '#3E6FA8', 0, 0, 0, 0.18), box(0.8, 0.5, 0.6, '#F7F3EE', -0.2, 0.5, 0));
    boat.position.set(-6.3, -0.9, 2.3);
    put(boat, -6.3, 2.3, 0);
    boat.position.y = -0.95;
    put(house(1.8, 1.4, 1.2, '#F1E3CF', '#B5653B'), 1.8, 1.5, 1.2);
  },

  sun(put, r) {
    const pole = new THREE.Group();
    pole.add(cyl(0.06, 0.06, 3.2, '#5C5A6A', 0, 0, 0, 6));
    pole.add(box(0.7, 0.42, 0.04, '#F2A7B8', 0.36, 2.7, 0));
    put(pole, 0, 0, 0.4);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const mat0 = box(1.0, 0.08, 0.6, PASTELS[i % 5], 0, 0, 0);
      mat0.rotation.y = -a;
      put(mat0, Math.cos(a) * 2.4, Math.sin(a) * 2.4, 0); // flat: anyone can walk over a mat
    }
    for (let i = 0; i < 2; i++) {
      const u = new THREE.Group();
      u.add(cyl(0.04, 0.04, 1.6, '#F7F3EE', 0, 0, 0, 5));
      u.add(mesh(new THREE.ConeGeometry(0.9, 0.4, 8), i ? '#E86F5B' : '#F4D27A', 0, 1.7, 0));
      put(u, i ? 3.2 : -3.2, i ? -1.0 : 1.2, 0.3);
    }
    for (let i = 0; i < 4; i++) put(rock(r, '#4B4A55'), -1 + i * 0.7, -3.2, 0.35);
  },

  fish(put, r) {
    [[-1.8, -1.2], [0.4, -1.6], [2.2, -0.6]].forEach(([x, z], i) => {
      const g = new THREE.Group();
      g.add(box(1.5, 0.7, 0.8, '#F7F3EE', 0, 0, 0));
      for (const [px, pz] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) g.add(cyl(0.04, 0.04, 1.5, '#5C5A6A', px, 0, pz, 4));
      g.add(box(1.7, 0.08, 1.0, i % 2 ? '#3E6FA8' : '#E05D5D', 0, 1.5, 0));
      for (let k = 0; k < 4; k++) {
        const f = mesh(new THREE.SphereGeometry(0.12, 6, 4), '#8FA9B8', -0.5 + k * 0.33, 0.78, 0);
        f.scale.set(1.8, 0.6, 0.8);
        g.add(f);
      }
      g.rotation.y = -0.3 + i * 0.3;
      put(g, x, z, 1.0);
    });
    const rack = new THREE.Group();
    rack.add(cyl(0.05, 0.05, 1.3, '#7A5A43', -0.8, 0, 0, 4), cyl(0.05, 0.05, 1.3, '#7A5A43', 0.8, 0, 0, 4), box(1.7, 0.05, 0.05, '#7A5A43', 0, 1.25, 0));
    for (let k = 0; k < 5; k++) {
      const f = mesh(new THREE.SphereGeometry(0.1, 6, 4), '#C9A27E', -0.6 + k * 0.3, 1.0, 0);
      f.scale.set(0.6, 1.8, 0.5);
      rack.add(f);
    }
    put(rack, -0.6, 2.2, 1.0);
    const boat = new THREE.Group();
    boat.add(rbox(1.8, 0.45, 0.8, '#E05D5D', 0, 0, 0, 0.16), cyl(0.04, 0.04, 1.6, '#F7F3EE', 0, 0.4, 0, 4));
    put(boat, 5.4, 1.6, 0);
    boat.position.y = -0.95;
  },

  nap(put) {
    const beds = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * 2.3, z = Math.sin(a) * 2.3;
      const g = new THREE.Group();
      const ring = mesh(new THREE.TorusGeometry(0.55, 0.2, 6, 14), PASTELS[i % 5], 0, 0.2, 0);
      ring.rotation.x = Math.PI / 2;
      g.add(ring, cyl(0.55, 0.55, 0.12, '#FBF7F2', 0, 0, 0, 14));
      put(g, x, z, 0.8);
      beds.push([x, z]);
    }
    put(rbox(1.6, 0.3, 1.0, '#A9C4E8', 0, 0, 0, 0.12), 0, 0, 0.9);
    return { beds };
  },

  clinic(put) {
    const h = house(3.0, 2.0, 1.8, '#FBFAF8', '#7FB7B0');
    h.add(box(0.9, 0.26, 0.08, '#E86F5B', 0, 2.1, 1.06), box(0.26, 0.9, 0.08, '#E86F5B', 0, 1.78, 1.06));
    put(h, 0, -1.0, 2.0);
    put(box(1.4, 0.12, 0.45, '#7FB7B0', 0, 0.35, 0), -1.8, 1.8, 0.8);
    put(rbox(0.6, 0.12, 0.6, '#5C5A6A', 0, 0, 0, 0.04), 1.4, 1.6, 0.4);
  },

  adopt(put) {
    const h = house(2.6, 1.9, 1.6, '#FFF3F0', '#E07A86');
    const s = new THREE.Shape();
    s.moveTo(0, -0.3);
    s.bezierCurveTo(-0.5, 0.05, -0.3, 0.45, 0, 0.22);
    s.bezierCurveTo(0.3, 0.45, 0.5, 0.05, 0, -0.3);
    const heart = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false }), '#E86F7E', 0, 2.55, 0.3);
    h.add(heart);
    put(h, 0, -1.0, 1.8);
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      g.add(cyl(0.04, 0.04, 0.7, '#7A5A43', 0, 0, 0, 4), box(0.5, 0.32, 0.05, PASTELS[i % 5], 0, 0.55, 0));
      put(g, -2.0 + i * 1.0, 1.6, 0.3);
    }
  },
};

export function decorate(put, r, count) {
  // Trees and rocks fill whatever room the builder left.
  for (let i = 0, placed = 0; i < 40 && placed < count; i++) {
    const a = r() * Math.PI * 2, d = 2.6 + r() * 1.6;
    if (put.free(Math.cos(a) * d, Math.sin(a) * d, 0.7)) {
      put(r() < 0.8 ? tree(r) : rock(r), Math.cos(a) * d, Math.sin(a) * d, 0.5);
      placed++;
    }
  }
}
