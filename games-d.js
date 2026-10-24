import { catFace } from './hud.js';
import { COATS } from './cat.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// 貓咪診所：watch the medicine jars light up, then tap them back in the same order.
export const pills = {
  start(stage, api) {
    let alive = true;
    stage.classList.add('pillStage');
    const colors = ['#E86F7E', '#7FB7B0', '#F4D27A', '#9FB8D9'];
    const msg = document.createElement('p');
    msg.className = 'pmsg';
    const row = document.createElement('div');
    row.className = 'jars';
    const jars = colors.map((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'jar';
      b.style.setProperty('--c', c);
      b.setAttribute('aria-label', `第 ${i + 1} 個藥罐`);
      b.innerHTML = '<i></i>';
      row.append(b);
      return b;
    });
    stage.append(msg, row);
    const glow = async (i, ms) => { jars[i].classList.add('on'); await wait(ms); jars[i].classList.remove('on'); };
    const seq = [];
    (async () => {
      while (alive) {
        seq.push(Math.floor(Math.random() * 4));
        jars.forEach((j) => (j.disabled = true));
        msg.textContent = `第 ${seq.length} 回：看清楚順序`;
        await wait(600);
        const ms = Math.max(260, 520 - seq.length * 25);
        for (const i of seq) { if (!alive) return; await glow(i, ms); await wait(130); }
        msg.textContent = '換你了';
        jars.forEach((j) => (j.disabled = false));
        for (let k = 0; k < seq.length; k++) {
          const got = await new Promise((res) => jars.forEach((j, i) => (j.onclick = () => res(i))));
          if (!alive) return;
          glow(got, 160);
          if (got !== seq[k]) {
            msg.textContent = `順序錯了，你記住了 ${seq.length - 1} 回`;
            jars.forEach((j) => (j.disabled = true));
            await wait(900);
            if (alive) api.end();
            return;
          }
        }
        api.add(1);
        msg.textContent = '答對了！';
        await wait(600);
      }
    })();
    return () => { alive = false; stage.classList.remove('pillStage'); };
  },
};

// 領養之家：read the cat's wish card and pick the one home that fits both wishes.
const NEEDS = [
  ['怕吵', '安靜'], ['愛曬太陽', '有陽台'], ['喜歡熱鬧', '有小孩'], ['想要玩伴', '有其他貓'],
  ['怕孤單', '常在家'], ['愛探險', '有院子'], ['喜歡高處', '有貓跳台'],
];
const FAMILIES = ['陳家', '林家', '王小姐家', '阿明的公寓', '張奶奶家', '黃家', '小美的套房', '李伯伯家'];

export const match = {
  start(stage, api) {
    let alive = true, round = 0;
    stage.classList.add('matchStage');
    const next = () => {
      if (!alive) return;
      if (round++ >= 8) { api.end(); return; }
      const [a, b] = shuffle([...NEEDS]).slice(0, 2);
      const others = NEEDS.filter((n) => n !== a && n !== b);
      const homes = shuffle([
        { tags: [a[1], b[1]], ok: true },
        { tags: shuffle([a[1], pick(others)[1]]), ok: false },
        { tags: shuffle([b[1], pick(others)[1]]), ok: false },
      ]);
      const names = shuffle([...FAMILIES]);
      const coat = pick(COATS);
      stage.innerHTML = `<div class="wish">${catFace(coat)}<div><b>第 ${round} / 8 隻</b><span>${a[0]}，${b[0]}</span></div></div>
        <div class="homes">${homes.map((h, i) => `<button type="button" class="home" data-i="${i}"><b>${names[i]}</b>${h.tags.map((t) => `<em>${t}</em>`).join('')}</button>`).join('')}</div>`;
      stage.querySelectorAll('.home').forEach((el) => (el.onclick = async () => {
        stage.querySelectorAll('.home').forEach((x) => (x.disabled = true));
        const h = homes[Number(el.dataset.i)];
        el.classList.add(h.ok ? 'right' : 'wrong');
        if (h.ok) api.add(1);
        else stage.querySelector(`.home[data-i="${homes.findIndex((q) => q.ok)}"]`).classList.add('right');
        await wait(h.ok ? 500 : 1000);
        next();
      }));
    };
    next();
    return () => { alive = false; stage.classList.remove('matchStage'); };
  },
};

// 午睡灣：noises pop up next to sleeping cats; tap each one before it wakes a cat. Three wake-ups and it's over.
const NOISES = ['鈴鈴鈴', '啾啾', '叮咚', '汪！', '嗶嗶', '咚咚咚'];

export const hush = {
  start(stage, api) {
    let alive = true, lives = 3;
    stage.classList.add('hushStage');
    const spots = [[18, 30], [50, 24], [82, 32], [30, 70], [70, 72]];
    const cats = spots.map(([x, y], i) => {
      const d = document.createElement('div');
      d.className = 'sleeper';
      d.style.left = `${x}%`;
      d.style.top = `${y}%`;
      d.innerHTML = `${catFace(COATS[i + 1])}<i>z z</i>`;
      stage.append(d);
      return d;
    });
    const hearts = document.createElement('p');
    hearts.className = 'hlives';
    const draw = () => (hearts.textContent = '♥'.repeat(lives) + '♡'.repeat(3 - lives));
    draw();
    stage.append(hearts);
    const spawn = () => {
      if (!alive) return;
      const i = Math.floor(Math.random() * cats.length);
      const [x, y] = spots[i];
      const n = document.createElement('button');
      n.type = 'button';
      n.className = 'noise';
      n.textContent = pick(NOISES);
      n.style.left = `${Math.min(88, Math.max(12, x + (Math.random() - 0.5) * 18))}%`;
      n.style.top = `${Math.max(8, y - 16)}%`;
      const life = Math.max(900, 1900 - api.score * 45);
      n.style.setProperty('--life', `${life}ms`);
      const timer = setTimeout(() => {
        if (!alive || !n.isConnected) return;
        n.remove();
        cats[i].classList.add('awake');
        setTimeout(() => cats[i].classList.remove('awake'), 900);
        lives -= 1;
        draw();
        if (lives <= 0) { alive = false; setTimeout(() => api.end(), 400); }
      }, life);
      n.onclick = () => { clearTimeout(timer); n.remove(); api.add(1); };
      stage.append(n);
      setTimeout(spawn, Math.max(420, 1100 - api.score * 30));
    };
    setTimeout(spawn, 500);
    return () => { alive = false; stage.classList.remove('hushStage'); };
  },
};
