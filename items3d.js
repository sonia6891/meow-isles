import * as THREE from 'three';
import { mesh, box, rbox, cyl } from './kit.js';

// 3D models for the shop items, all sized to fit a slot about 1.6 units across.
export function itemMesh(id) {
  const g = new THREE.Group();
  switch (id) {
    case 'box':
      g.add(box(1.0, 0.7, 0.8, '#C89A63', 0, 0, 0), box(1.02, 0.04, 0.16, '#E9D2A6', 0, 0.7, 0));
      for (const s of [-1, 1]) {
        const flap = box(1.0, 0.04, 0.36, '#B98955', 0, 0, 0);
        flap.position.set(0, 0.72, s * 0.52);
        flap.rotation.x = s * -0.7;
        g.add(flap);
      }
      break;
    case 'cushion':
      g.add(rbox(1.1, 0.26, 1.1, '#F2A7B8', 0, 0, 0, 0.12), mesh(new THREE.SphereGeometry(0.08, 6, 4), '#E46A8C', 0, 0.27, 0));
      break;
    case 'yarn': {
      g.add(mesh(new THREE.IcosahedronGeometry(0.42, 1), '#B9A6D9', 0, 0.42, 0));
      const t = mesh(new THREE.TorusGeometry(0.41, 0.03, 4, 16), '#ffffff', 0, 0.42, 0);
      t.rotation.set(0.8, 0.4, 0);
      const tail = box(0.9, 0.04, 0.05, '#B9A6D9', 0.7, 0, 0.2);
      tail.rotation.y = 0.5;
      g.add(t, tail);
      break;
    }
    case 'post':
      g.add(rbox(0.9, 0.12, 0.9, '#8C6B4F', 0, 0, 0, 0.04), cyl(0.16, 0.16, 1.5, '#CDB283', 0, 0.12, 0, 8), cyl(0.42, 0.42, 0.1, '#E2C9A5', 0, 1.62, 0, 10));
      break;
    case 'dish':
      g.add(cyl(0.5, 0.36, 0.18, '#8FC9C9', 0, 0, 0, 14));
      for (let i = 0; i < 4; i++) {
        const f = mesh(new THREE.SphereGeometry(0.09, 6, 4), '#C9A27E', -0.2 + i * 0.13, 0.22, (i % 2) * 0.1 - 0.05);
        f.scale.set(1.8, 0.6, 0.7);
        g.add(f);
      }
      break;
    case 'lamp':
      g.add(cyl(0.05, 0.05, 1.4, '#3D4057', 0, 0, 0, 6), cyl(0.3, 0.3, 0.06, '#3D4057', 0, 0, 0, 10));
      g.add(mesh(new THREE.SphereGeometry(0.24, 10, 8), null, 0, 1.5, 0,
        new THREE.MeshStandardMaterial({ color: '#FFE7A3', emissive: '#FFC86B', emissiveIntensity: 1.2 })));
      break;
    case 'bed': {
      const ring = mesh(new THREE.TorusGeometry(0.55, 0.22, 6, 14), '#A9C4E8', 0, 0.22, 0);
      ring.rotation.x = Math.PI / 2;
      g.add(ring, cyl(0.55, 0.55, 0.14, '#FBF7F2', 0, 0, 0, 14));
      break;
    }
    case 'can':
      g.add(cyl(0.32, 0.32, 0.36, null, 0, 0, 0, 16));
      g.children[0].material = new THREE.MeshStandardMaterial({ color: '#E9C46A', metalness: 0.6, roughness: 0.3 });
      g.add(cyl(0.33, 0.33, 0.04, '#C99A3B', 0, 0.36, 0, 16));
      break;
  }
  return g;
}

// A dashed hex marker for an empty slot, so players can see where an item can go.
export function slotMarker() {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.74, 6, 1, Math.PI / 2).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }),
  );
  m.position.y = 0.02;
  return m;
}
