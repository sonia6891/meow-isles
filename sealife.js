import * as THREE from 'three';
import { mat, mesh, box, rbox, cyl } from './kit.js';

// Life around the island: ships on looping routes, whales that surface and dive,
// dolphins leaping off the southern tip, and now and then a flock of gulls crossing the open sea.
// Water level is y = 0.

function ship(kind) {
  const g = new THREE.Group();
  if (kind === 'cargo') {
    g.add(rbox(5.2, 0.9, 1.5, '#3E4A6E', 0, -0.5, 0, 0.2), box(1.1, 1.0, 1.3, '#F7F3EE', -1.9, 0.4, 0));
    ['#E05D5D', '#F4D27A', '#7FB7B0', '#8E6FB8', '#E8954A'].forEach((c, i) => g.add(box(0.62, 0.5, 1.2, c, -0.9 + i * 0.66, 0.4, 0)));
    g.add(cyl(0.12, 0.12, 0.6, '#3D4057', -1.9, 1.4, 0, 6));
  } else if (kind === 'sail') {
    g.add(rbox(2.4, 0.6, 0.9, '#F7F3EE', 0, -0.35, 0, 0.18), cyl(0.05, 0.05, 3.0, '#7A5A43', 0.1, 0.2, 0, 5));
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(0, 2.6); s.lineTo(1.3, 0.2); s.closePath();
    const sail = new THREE.Mesh(new THREE.ShapeGeometry(s), mat('#FFFFFF', { side: THREE.DoubleSide }));
    sail.position.set(0.15, 0.45, 0);
    sail.rotation.y = Math.PI;
    sail.castShadow = true;
    g.add(sail);
  } else {
    g.add(rbox(2.2, 0.6, 1.0, '#E05D5D', 0, -0.35, 0, 0.18), box(0.8, 0.6, 0.7, '#F7F3EE', -0.3, 0.25, 0), cyl(0.04, 0.04, 1.6, '#3D4057', 0.6, 0.25, 0, 4));
  }
  return g;
}

function whale() {
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(1, 12, 8), '#4D6182', 0, 0, 0);
  body.scale.set(3.4, 1.0, 1.25);
  const belly = mesh(new THREE.SphereGeometry(1, 10, 6), '#C9D5E3', 0.2, -0.35, 0);
  belly.scale.set(2.8, 0.6, 1.0);
  const tail = new THREE.Group();
  tail.position.set(-3.0, 0.1, 0);
  for (const s of [-1, 1]) {
    const fluke = box(0.9, 0.12, 1.1, '#4D6182', -0.4, 0, s * 0.55);
    fluke.rotation.y = s * 0.5;
    tail.add(fluke);
  }
  const spout = new THREE.Group();
  for (let i = 0; i < 6; i++) spout.add(mesh(new THREE.IcosahedronGeometry(0.28 + i * 0.05, 0), '#FFFFFF', (Math.random() - 0.5) * 0.4, 0.5 + i * 0.45, (Math.random() - 0.5) * 0.4));
  spout.position.set(1.6, 0.8, 0);
  g.add(body, belly, tail, spout);
  g.userData = { tail, spout };
  return g;
}

function dolphin() {
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(1, 10, 6), '#8FA3B8', 0, 0, 0);
  body.scale.set(1.0, 0.32, 0.3);
  const fin = mesh(new THREE.ConeGeometry(0.16, 0.4, 4), '#7C90A6', -0.05, 0.36, 0);
  const tail = box(0.25, 0.06, 0.6, '#7C90A6', -1.0, 0, 0);
  g.add(body, fin, tail);
  return g;
}

function gull() {
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.22, 6, 4), '#FFFFFF', 0, 0, 0);
  body.scale.set(1.6, 0.8, 0.8);
  const wings = [-1, 1].map((s) => {
    const w = new THREE.Group();
    w.add(box(0.5, 0.04, 0.9, '#F7F3EE', 0, 0, s * 0.45));
    g.add(w);
    return w;
  });
  g.add(body);
  g.userData.wings = wings;
  return g;
}

// Places a whale may surface: open water clear of the islands and islets, inside the default view.
const WHALE_SPOTS = [[21, -2], [23, 6], [21, -20], [-17, -10], [-16, 15], [-12, 33], [8, 36], [24, 18], [-24, -18]];

export function buildSeaLife(scene) {
  const ships = [
    { obj: ship('cargo'), a: 30, b: 43, speed: 0.025, phase: 0 },
    { obj: ship('sail'), a: 27, b: 40, speed: -0.04, phase: 2.2 },
    { obj: ship('fish'), a: 25, b: 37, speed: 0.05, phase: 4.1 },
    { obj: ship('fish'), a: 33, b: 47, speed: -0.03, phase: 5.3 },
  ];
  ships.forEach((s) => scene.add(s.obj));

  const whales = [whale(), whale()].map((obj, i) => {
    obj.visible = false;
    scene.add(obj);
    return { obj, t: -i * 9 - 2, spot: WHALE_SPOTS[i * 3] };
  });

  const dolphins = [0, 1, 2].map((i) => {
    const obj = dolphin();
    scene.add(obj);
    return { obj, offset: i * 0.45 };
  });

  // Gulls: now and then a small V-shaped flock crosses over open sea, then is gone for a while.
  // Routes stay well off the coast so the birds never pass between the camera and the islands.
  const ROUTES = [[[-27, -48], [-25, 48]], [[26, 48], [24, -48]], [[-48, 42], [48, 44]], [[46, -40], [-46, -44]]];
  const V = [[0, 0], [-1.2, -1.0], [-1.2, 1.0], [-2.4, -2.0], [-2.4, 2.0]];
  const flock = { birds: V.map(() => { const obj = gull(); obj.visible = false; scene.add(obj); return obj; }), route: ROUTES[0], dur: 1, t: 0, flying: false, wait: 6 };
  const startFlight = () => {
    flock.route = ROUTES[Math.floor(Math.random() * ROUTES.length)];
    const [[ax, az], [bx, bz]] = flock.route;
    flock.dur = Math.hypot(bx - ax, bz - az) / 6; // about 6 units a second
    flock.t = 0;
    flock.flying = true;
  };

  return {
    update(dt, t) {
      for (const s of ships) {
        const a = s.phase + t * s.speed;
        const x = Math.cos(a) * s.a, z = Math.sin(a) * s.b;
        // Head along the route: the direction of travel is the derivative of the ellipse.
        const dx = -Math.sin(a) * s.a * Math.sign(s.speed), dz = Math.cos(a) * s.b * Math.sign(s.speed);
        s.obj.position.set(x, Math.sin(t * 1.3 + s.phase) * 0.08, z);
        s.obj.rotation.set(Math.sin(t * 1.1 + s.phase) * 0.03, Math.atan2(-dz, dx), 0);
      }

      // A whale cycle lasts 14 s: rise (0–2), blow (2–5), roll forward (5–8), lift the tail and dive (8–10), then rest unseen.
      for (const w of whales) {
        w.t += dt;
        if (w.t > 18) { w.t = 0; w.spot = WHALE_SPOTS[Math.floor(Math.random() * WHALE_SPOTS.length)]; w.obj.rotation.y = Math.random() * Math.PI * 2; }
        const k = w.t;
        const { tail, spout } = w.obj.userData;
        w.obj.visible = k > 0 && k < 10.5;
        if (!w.obj.visible) continue;
        let y = -1.4, pitch = 0;
        if (k < 2) y = -1.4 + (k / 2) * 1.2;
        else if (k < 8) y = -0.2 + Math.sin(k * 1.5) * 0.05;
        else { const d = (k - 8) / 2.5; y = -0.2 - d * 1.8; pitch = -d * 0.9; }
        w.obj.position.set(w.spot[0], y, w.spot[1]);
        w.obj.rotation.z = pitch;
        tail.rotation.z = k > 8 ? 0.9 : Math.sin(k * 2) * 0.15;
        const blow = k > 2 && k < 5 ? Math.sin(((k - 2) / 3) * Math.PI) : 0;
        spout.visible = blow > 0.02;
        spout.scale.setScalar(0.4 + blow * 0.8);
      }

      // Dolphins leap in arcs every 2.4 s while swimming back and forth off the southern tip.
      const lane = Math.sin(t * 0.05) * 20, heading = Math.cos(t * 0.05) >= 0 ? 1 : -1;
      for (const d of dolphins) {
        const p = ((t + d.offset) % 2.4) / 2.4;
        const jumping = p < 0.45;
        const u = jumping ? p / 0.45 : 0;
        d.obj.visible = jumping;
        d.obj.position.set(lane + heading * (d.offset * 2 + u * 2.4), Math.sin(u * Math.PI) * 1.6 - 0.2, 36 + d.offset * 1.4);
        d.obj.rotation.set(0, heading > 0 ? 0 : Math.PI, Math.cos(u * Math.PI) * 0.9);
      }

      // Flock: wait unseen for 20–35 s, fly one route across, repeat.
      if (!flock.flying) {
        flock.wait -= dt;
        if (flock.wait <= 0) startFlight();
      } else if ((flock.t += dt) > flock.dur) {
        flock.flying = false;
        flock.wait = 20 + Math.random() * 15;
      }
      const flying = flock.flying;
      const [[ax, az], [bx, bz]] = flock.route;
      const u = Math.min(1, flock.t / flock.dur);
      const dirX = (bx - ax) / Math.hypot(bx - ax, bz - az), dirZ = (bz - az) / Math.hypot(bx - ax, bz - az);
      flock.birds.forEach((b, i) => {
        b.visible = flying;
        if (!flying) return;
        const [back, side] = V[i];
        // Formation offsets: `back` along the flight line, `side` across it.
        b.position.set(ax + (bx - ax) * u + dirX * back * 1.4 - dirZ * side * 1.4, 7 + Math.sin(t * 1.3 + i) * 0.3, az + (bz - az) * u + dirZ * back * 1.4 + dirX * side * 1.4);
        b.rotation.y = Math.atan2(-dirZ, dirX);
        const flap = Math.sin(t * 8 + i * 0.7) * 0.6;
        b.userData.wings[0].rotation.x = flap;
        b.userData.wings[1].rotation.x = -flap;
      });
    },
  };
}
