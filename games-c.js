import { makeCanvas, drawCatFace } from './gcanvas.js';

const loop = (draw) => {
  let raf = 0, last = performance.now();
  const tick = (now) => { draw(Math.min(0.05, (now - last) / 1000), now / 1000); last = now; raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
};

// 呼嚕圖書館：keys light up on an old keyboard; tap (or type) them before they go dark.
export const keyboard = {
  start(stage, api) {
    stage.classList.add('kbStage');
    const letters = 'QWERTASDFGZXCVB'.split('');
    const keys = letters.map((ch) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'key';
      b.textContent = ch;
      stage.append(b);
      return { ch, b, until: 0 };
    });
    let t = 0, next = 0.3;
    const hit = (k) => {
      if (k.until > t) { k.until = 0; k.b.classList.remove('lit'); k.b.classList.add('pawed'); setTimeout(() => k.b.classList.remove('pawed'), 220); api.add(1); }
      else api.add(-1);
    };
    keys.forEach((k) => (k.b.onclick = () => hit(k)));
    const onKey = (e) => { const k = keys.find((q) => q.ch === e.key.toUpperCase()); if (k) hit(k); };
    addEventListener('keydown', onKey);
    const stop = loop((dt) => {
      t += dt;
      next -= dt;
      const life = Math.max(0.55, 1.2 - api.score * 0.03);
      if (next <= 0) {
        const idle = keys.filter((k) => k.until <= t);
        const k = idle[Math.floor(Math.random() * idle.length)];
        k.until = t + life;
        next = Math.max(0.3, 0.75 - api.score * 0.02);
      }
      keys.forEach((k) => k.b.classList.toggle('lit', k.until > t));
    });
    return () => { stop(); removeEventListener('keydown', onKey); stage.classList.remove('kbStage'); };
  },
};

// 曬太陽坡：keep the cat inside the drifting patch of sunlight.
export const sunbeam = {
  start(stage, api) {
    const { c, ctx } = makeCanvas(stage);
    const cat = { x: c.w / 2, y: c.h / 2 }, aim = { x: c.w / 2, y: c.h / 2 };
    let warm = 0;
    const move = (e) => { const r = c.getBoundingClientRect(); aim.x = e.clientX - r.left; aim.y = e.clientY - r.top; };
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerdown', move);
    return loop((dt, now) => {
      const sx = c.w / 2 + Math.sin(now * 0.7) * c.w * 0.32 + Math.sin(now * 1.9) * 30;
      const sy = c.h / 2 + Math.cos(now * 0.55) * c.h * 0.28;
      const R = Math.max(46, 74 - api.score * 0.6);
      cat.x += (aim.x - cat.x) * Math.min(1, dt * 6);
      cat.y += (aim.y - cat.y) * Math.min(1, dt * 6);
      const inSun = Math.hypot(cat.x - sx, cat.y - sy) < R;
      if (inSun && (warm += dt) >= 0.5) { warm -= 0.5; api.add(1); }
      ctx.fillStyle = '#C9B7A0';
      ctx.fillRect(0, 0, c.w, c.h);
      ctx.strokeStyle = 'rgba(90,70,50,.15)';
      for (let x = 0; x < c.w; x += 56) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.h); ctx.stroke(); }
      const g = ctx.createRadialGradient(sx, sy, R * 0.3, sx, sy, R);
      g.addColorStop(0, 'rgba(255,236,170,.95)'); g.addColorStop(1, 'rgba(255,236,170,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy, R, 0, 7); ctx.fill();
      ctx.fillStyle = '#E8954A';
      ctx.beginPath(); ctx.roundRect(cat.x - 24, cat.y + 6, 48, 20, 9); ctx.fill();
      drawCatFace(ctx, cat.x, cat.y, 44, { head: '#E8954A', patch: '#C9702E' });
      if (inSun) { ctx.fillStyle = '#7A5A43'; ctx.font = '600 15px Fredoka, sans-serif'; ctx.fillText('z z', cat.x + 22, cat.y - 22 - Math.sin(now * 3) * 3); }
    });
  },
};

// 貓爬架塔：a platform slides back and forth; tap when it is under the cat to climb a level.
export const climb = {
  start(stage, api) {
    const { c, ctx } = makeCanvas(stage);
    let lives = 3, w = 150, x = 0, dir = 1, speed = 150, stacked = [], flash = 0;
    const tap = () => {
      if (lives <= 0) return;
      if (Math.abs(x - c.w / 2) < w / 2 - 6) {
        stacked.push(w);
        api.add(1);
        w = Math.max(60, w - 8);
        speed += 18;
      } else {
        lives -= 1;
        flash = 0.35;
        if (lives <= 0) setTimeout(() => api.end(), 500);
      }
      x = dir > 0 ? 0 : c.w;
    };
    c.addEventListener('pointerdown', tap);
    const key = (e) => { if (e.key === ' ') { e.preventDefault(); tap(); } };
    addEventListener('keydown', key);
    const stop = loop((dt) => {
      x += dir * speed * dt;
      if (x > c.w) { x = c.w; dir = -1; } else if (x < 0) { x = 0; dir = 1; }
      flash = Math.max(0, flash - dt);
      ctx.fillStyle = flash ? '#F2C1C1' : '#EFE6F7';
      ctx.fillRect(0, 0, c.w, c.h);
      const base = c.h - 40, step = 44;
      const shown = stacked.slice(-5);
      shown.forEach((pw, i) => {
        const y = base - i * step;
        ctx.fillStyle = i % 2 ? '#8E6FB8' : '#E2C9A5';
        ctx.beginPath(); ctx.roundRect(c.w / 2 - pw / 2, y, pw, 14, 6); ctx.fill();
        ctx.fillStyle = '#CDB283';
        ctx.fillRect(c.w / 2 - 6, y + 14, 12, step - 14);
      });
      // The cat stands on the highest platform (or the floor); the moving one slides one level above.
      const floor = shown.length ? base - (shown.length - 1) * step : c.h - 8;
      ctx.fillStyle = '#B9A6D9';
      ctx.beginPath(); ctx.roundRect(x - w / 2, floor - step, w, 14, 6); ctx.fill();
      drawCatFace(ctx, c.w / 2, floor - 20, 40, { head: '#2E2B33' });
      ctx.fillStyle = '#E46A8C';
      ctx.font = '600 18px Fredoka, sans-serif';
      ctx.fillText('♥'.repeat(lives), 14, 28);
    });
    return () => { stop(); removeEventListener('keydown', key); };
  },
};

// 貓抓板森林：the needle sweeps the bar; scratch while it is inside the target zone.
export const scratch = {
  start(stage, api) {
    stage.classList.add('scrStage');
    stage.innerHTML = '<div class="post"><i class="zone"></i><i class="needle"></i></div><p class="scrTip">指針進到綠色區塊時點一下（或按空白鍵）</p><div class="marks"></div>';
    const zone = stage.querySelector('.zone'), needle = stage.querySelector('.needle'), marks = stage.querySelector('.marks');
    let p = 0, dir = 1, z0 = 0.4, zw = 0.26;
    const place = () => { zw = Math.max(0.09, 0.26 - api.score * 0.012); z0 = Math.random() * (1 - zw); zone.style.left = `${z0 * 100}%`; zone.style.width = `${zw * 100}%`; };
    place();
    const go = () => {
      if (p >= z0 && p <= z0 + zw) {
        api.add(1);
        const m = document.createElement('span');
        m.style.left = `${8 + Math.random() * 84}%`;
        marks.append(m);
        if (marks.children.length > 14) marks.firstChild.remove();
      } else stage.classList.add('miss'), setTimeout(() => stage.classList.remove('miss'), 200);
      place();
    };
    stage.addEventListener('pointerdown', go);
    const key = (e) => { if (e.key === ' ') { e.preventDefault(); go(); } };
    addEventListener('keydown', key);
    const stop = loop((dt) => {
      p += dir * dt * (0.7 + api.score * 0.05);
      if (p > 1) { p = 1; dir = -1; } else if (p < 0) { p = 0; dir = 1; }
      needle.style.left = `${p * 100}%`;
    });
    return () => { stop(); removeEventListener('keydown', key); stage.removeEventListener('pointerdown', go); stage.classList.remove('scrStage', 'miss'); };
  },
};
