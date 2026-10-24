import { makeCanvas, drawCatFace } from './gcanvas.js';
import { catFace } from './hud.js';
import { VISITORS } from './roster.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// 紙箱港：a cat hides in one of three boxes, the boxes swap, the player picks one. Five rounds.
export const shells = {
  start(stage, api) {
    let alive = true;
    stage.classList.add('shellStage');
    const cow = { head: '#F4F1EC', patch: '#2E2B33' };
    const boxes = [0, 1, 2].map((i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sbox';
      b.innerHTML = `<span class="peek">${catFace(cow)}</span><i></i>`;
      b.setAttribute('aria-label', `第 ${i + 1} 個紙箱`);
      stage.append(b);
      return { el: b, slot: i };
    });
    const msg = document.createElement('p');
    msg.className = 'smsg';
    stage.append(msg);
    const place = (b) => (b.el.style.left = `${18 + b.slot * 32}%`);
    boxes.forEach(place);

    (async () => {
      for (let round = 1; round <= 5 && alive; round++) {
        const hide = boxes[Math.floor(Math.random() * 3)];
        boxes.forEach((b) => { b.el.disabled = true; b.el.classList.toggle('show', b === hide); });
        msg.textContent = `第 ${round} 回合：記住貓在哪裡`;
        await wait(1100);
        if (!alive) return;
        boxes.forEach((b) => b.el.classList.remove('show'));
        await wait(350);
        const speed = Math.max(170, 430 - round * 55);
        stage.style.setProperty('--speed', `${speed}ms`);
        msg.textContent = '洗箱子中……';
        for (let k = 0; k < 3 + round && alive; k++) {
          const [a, b] = shuffle([...boxes]).slice(0, 2);
          [a.slot, b.slot] = [b.slot, a.slot];
          place(a); place(b);
          await wait(speed + 40);
        }
        if (!alive) return;
        msg.textContent = '貓在哪個箱子裡？';
        const pick = await new Promise((res) => boxes.forEach((b) => { b.el.disabled = false; b.el.onclick = () => res(b); }));
        boxes.forEach((b) => { b.el.disabled = true; b.el.onclick = null; });
        hide.el.classList.add('show');
        if (pick === hide) { api.add(1); msg.textContent = '找到了！'; }
        else { pick.el.classList.add('wrong'); msg.textContent = '不是這個，貓在這裡。'; }
        await wait(1200);
        pick.el.classList.remove('wrong');
        hide.el.classList.remove('show');
      }
      if (alive) api.end();
    })();
    return () => { alive = false; stage.classList.remove('shellStage'); };
  },
};

// 貓薄荷花園：find the six pairs among twelve face-down cards.
export const memory = {
  start(stage, api) {
    stage.classList.add('memStage');
    const coats = VISITORS.slice(0, 6).map((v) => v.coat);
    const deck = shuffle([...coats.keys(), ...coats.keys()]);
    let open = [], lock = false, pairs = 0;
    deck.forEach((k, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'card';
      b.setAttribute('aria-label', `第 ${i + 1} 張牌`);
      b.innerHTML = `<span class="back"></span><span class="front">${catFace(coats[k])}</span>`;
      b.onclick = async () => {
        if (lock || b.classList.contains('up')) return;
        b.classList.add('up');
        open.push({ b, k });
        if (open.length < 2) return;
        const [x, y] = open;
        open = [];
        if (x.k === y.k) {
          x.b.classList.add('done'); y.b.classList.add('done');
          api.add(1);
          if (++pairs === 6) { await wait(500); api.end(); }
        } else {
          lock = true;
          await wait(750);
          x.b.classList.remove('up'); y.b.classList.remove('up');
          lock = false;
        }
      };
      stage.append(b);
    });
    return () => stage.classList.remove('memStage');
  },
};

// 夜巡燈塔：sweep a beam of light over a dark town and tap the six hidden cats.
export const findCats = {
  start(stage, api) {
    const { c, ctx } = makeCanvas(stage);
    const light = { x: c.w / 2, y: c.h / 2 };
    const R = Math.min(78, c.w * 0.16);
    const shapes = Array.from({ length: 26 }, () => ({
      x: Math.random() * c.w, y: 60 + Math.random() * (c.h - 60), w: 40 + Math.random() * 90, h: 30 + Math.random() * 70,
      round: Math.random() < 0.4, tone: ['#3B3F5C', '#46405E', '#2F3B4E', '#4A5A4E'][Math.floor(Math.random() * 4)],
    }));
    const cats = [];
    while (cats.length < 6) {
      const x = 30 + Math.random() * (c.w - 60), y = 70 + Math.random() * (c.h - 100);
      if (cats.every((k) => Math.hypot(k.x - x, k.y - y) > 70)) cats.push({ x, y, coat: VISITORS[cats.length + 1].coat, found: false });
    }
    const stars = Array.from({ length: 40 }, () => [Math.random() * c.w, Math.random() * 60]);
    const aim = (e) => { const r = c.getBoundingClientRect(); light.x = e.clientX - r.left; light.y = e.clientY - r.top; };
    const tap = (e) => {
      aim(e);
      for (const k of cats) {
        if (!k.found && Math.hypot(k.x - light.x, k.y - light.y) < 30) {
          k.found = true;
          api.add(1);
          if (cats.every((q) => q.found)) setTimeout(() => api.end(), 400);
        }
      }
    };
    c.addEventListener('pointermove', aim);
    c.addEventListener('pointerdown', tap);
    let raf = 0;
    const draw = () => {
      ctx.fillStyle = '#20263F';
      ctx.fillRect(0, 0, c.w, c.h);
      ctx.fillStyle = '#F7F3EE';
      stars.forEach(([x, y]) => ctx.fillRect(x, y, 1.5, 1.5));
      for (const k of cats) if (!k.found) drawCatFace(ctx, k.x, k.y, 34, k.coat);
      for (const s of shapes) {
        ctx.fillStyle = s.tone;
        ctx.beginPath();
        if (s.round) ctx.ellipse(s.x, s.y, s.w / 2, s.h / 2, 0, 0, 7);
        else ctx.rect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h * 0.6);
        ctx.fill();
      }
      // Darkness everywhere except the beam, with a soft edge.
      ctx.fillStyle = 'rgba(8,10,24,.975)';
      ctx.beginPath(); ctx.rect(0, 0, c.w, c.h); ctx.arc(light.x, light.y, R, 0, Math.PI * 2, true); ctx.fill();
      const edge = ctx.createRadialGradient(light.x, light.y, R * 0.55, light.x, light.y, R);
      edge.addColorStop(0, 'rgba(8,10,24,0)'); edge.addColorStop(1, 'rgba(8,10,24,.85)');
      ctx.fillStyle = edge;
      ctx.beginPath(); ctx.arc(light.x, light.y, R, 0, 7); ctx.fill();
      const warm = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, R);
      warm.addColorStop(0, 'rgba(255,233,168,.22)'); warm.addColorStop(1, 'rgba(255,233,168,0)');
      ctx.fillStyle = warm;
      ctx.beginPath(); ctx.arc(light.x, light.y, R, 0, 7); ctx.fill();
      for (const k of cats) {
        if (!k.found) continue;
        drawCatFace(ctx, k.x, k.y, 34, k.coat);
        ctx.strokeStyle = '#F4D27A'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(k.x, k.y, 24, 0, 7); ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  },
};
