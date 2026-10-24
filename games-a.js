import { makeCanvas, drawCatFace } from './gcanvas.js';

const ORANGE = { head: '#E8954A', patch: '#C9702E' };

// Shared loop: calls draw(dt) every frame until the returned stop() runs.
function loop(draw) {
  let raf = 0, last = performance.now();
  const tick = (now) => {
    draw(Math.min(0.05, (now - last) / 1000));
    last = now;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

function drawFish(ctx, x, y, color, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(0, 0, 16, 8, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(24, -8); ctx.lineTo(24, 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1d1b22';
  ctx.beginPath(); ctx.arc(-8, -2, 1.8, 0, 7); ctx.fill();
  ctx.restore();
}

function drawBoot(ctx, x, y) {
  ctx.fillStyle = '#7A5A43';
  ctx.beginPath();
  ctx.roundRect(x - 10, y - 16, 14, 24, 4);
  ctx.roundRect(x - 10, y + 2, 26, 10, 5);
  ctx.fill();
}

// 鱼市場：catch falling fish with a cat that follows the pointer or arrow keys.
export const catchFish = {
  start(stage, api) {
    const { c, ctx } = makeCanvas(stage);
    let catX = c.w / 2, keys = 0, spawn = 0, t = 0, shake = 0;
    const items = [];
    const move = (e) => { const r = c.getBoundingClientRect(); catX = e.clientX - r.left; };
    const key = (e) => {
      if (e.key === 'ArrowLeft') keys = e.type === 'keydown' ? -1 : 0;
      if (e.key === 'ArrowRight') keys = e.type === 'keydown' ? 1 : 0;
    };
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerdown', move);
    addEventListener('keydown', key);
    addEventListener('keyup', key);

    const stop = loop((dt) => {
      t += dt;
      catX = Math.max(30, Math.min(c.w - 30, catX + keys * 380 * dt));
      spawn -= dt;
      if (spawn <= 0) {
        spawn = Math.max(0.28, 0.8 - t * 0.016);
        const r = Math.random();
        items.push({ x: 24 + Math.random() * (c.w - 48), y: -20, vy: 130 + t * 4 + Math.random() * 60, type: r < 0.18 ? 'boot' : r < 0.26 ? 'gold' : 'fish' });
      }
      const sky = ctx.createLinearGradient(0, 0, 0, c.h);
      sky.addColorStop(0, '#BFE3F0'); sky.addColorStop(1, '#F2F7F4');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, c.w, c.h);
      ctx.fillStyle = '#7CC6C2';
      ctx.fillRect(0, c.h - 26, c.w, 26);
      const catY = c.h - 52;
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.y += it.vy * dt;
        if (it.y > catY - 14 && it.y < catY + 14 && Math.abs(it.x - catX) < 36) {
          api.add(it.type === 'boot' ? -2 : it.type === 'gold' ? 3 : 1);
          if (it.type === 'boot') shake = 0.3;
          items.splice(i, 1);
          continue;
        }
        if (it.y > c.h + 20) { items.splice(i, 1); continue; }
        if (it.type === 'boot') drawBoot(ctx, it.x, it.y);
        else drawFish(ctx, it.x, it.y, it.type === 'gold' ? '#E9C46A' : '#8FA9B8', it.type === 'gold' ? 1.15 : 1);
      }
      shake = Math.max(0, shake - dt);
      const sx = shake ? Math.sin(t * 60) * 5 : 0;
      ctx.fillStyle = '#E8954A';
      ctx.beginPath(); ctx.roundRect(catX - 26 + sx, catY + 6, 52, 22, 10); ctx.fill();
      drawCatFace(ctx, catX + sx, catY, 50, ORANGE);
    });
    return () => {
      stop();
      removeEventListener('keydown', key);
      removeEventListener('keyup', key);
    };
  },
};

// 毛線球工坊：tap the laser dot before it darts away; it speeds up as the score climbs.
export const laser = {
  start(stage, api) {
    const { c, ctx } = makeCanvas(stage);
    const dot = { x: c.w / 2, y: c.h / 2, tx: 0, ty: 0, wait: 0 };
    const chaser = { x: 40, y: c.h - 40 };
    const paws = [];
    let t = 0;
    const retarget = () => { dot.tx = 30 + Math.random() * (c.w - 60); dot.ty = 30 + Math.random() * (c.h - 60); dot.wait = 0.25 + Math.random() * 0.6; };
    retarget();
    const tap = (e) => {
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      paws.push({ x, y, life: 0.6 });
      if (Math.hypot(x - dot.x, y - dot.y) < 30) {
        api.add(1);
        dot.x = 30 + Math.random() * (c.w - 60);
        dot.y = 30 + Math.random() * (c.h - 60);
        retarget();
      }
    };
    c.addEventListener('pointerdown', tap);

    return loop((dt) => {
      t += dt;
      const speed = 160 + api.score * 22;
      if (dot.wait > 0) dot.wait -= dt;
      else {
        const dx = dot.tx - dot.x, dy = dot.ty - dot.y, d = Math.hypot(dx, dy);
        if (d < 4) retarget();
        else { dot.x += (dx / d) * Math.min(d, speed * dt); dot.y += (dy / d) * Math.min(d, speed * dt); }
      }
      chaser.x += (dot.x - chaser.x) * dt * 1.6;
      chaser.y += (dot.y - chaser.y) * dt * 1.6;

      ctx.fillStyle = '#E9D7B9';
      ctx.fillRect(0, 0, c.w, c.h);
      ctx.strokeStyle = 'rgba(122,90,67,.18)';
      ctx.lineWidth = 2;
      for (let y = 40; y < c.h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.w, y); ctx.stroke(); }
      for (let i = paws.length - 1; i >= 0; i--) {
        const p = paws[i];
        p.life -= dt;
        if (p.life <= 0) { paws.splice(i, 1); continue; }
        ctx.fillStyle = `rgba(122,90,67,${p.life})`;
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 4, 7, 6, 0, 0, 7); ctx.fill();
        for (const [ox, oy] of [[-8, -6], [-3, -10], [3, -10], [8, -6]]) { ctx.beginPath(); ctx.arc(p.x + ox, p.y + oy, 2.6, 0, 7); ctx.fill(); }
      }
      drawCatFace(ctx, chaser.x, chaser.y, 46, { head: '#9A9AA6', patch: '#7C7C88' });
      const pulse = 9 + Math.sin(t * 18) * 2;
      const glow = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, pulse * 3);
      glow.addColorStop(0, 'rgba(255,40,60,.9)'); glow.addColorStop(0.35, 'rgba(255,40,60,.35)'); glow.addColorStop(1, 'rgba(255,40,60,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(dot.x, dot.y, pulse * 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff2a3c';
      ctx.beginPath(); ctx.arc(dot.x, dot.y, 6, 0, 7); ctx.fill();
    });
  },
};
