import * as game from './game.js';
import { catchFish, laser } from './games-a.js';
import { shells, memory, findCats } from './games-b.js';

// One mini-game per island. `reward(score, left)` turns a result into fish; `secs` is the clock.
export const GAMES = {
  fish:   { ...catchFish, title: '接魚', secs: 30, howto: '左右移動小貓接住魚，別接到拖鞋。可以用方向鍵，或在畫面上拖曳。', reward: (s) => Math.min(40, Math.max(0, s)) },
  yarn:   { ...laser, title: '抓紅點', secs: 20, howto: '紅點出現就點它，越到後面跑得越快。', reward: (s) => Math.min(40, s * 2) },
  boxes:  { ...shells, title: '貓在哪個箱子？', secs: 0, howto: '看清楚貓躲進哪個紙箱，箱子洗完後點那一個。一共五回合。', reward: (s) => s * 6 },
  garden: { ...memory, title: '翻牌配對', secs: 60, howto: '翻開兩張一樣的貓就配成一對，六對全部找出來。', reward: (s, left) => (s >= 6 ? 12 + Math.floor(left / 3) : s * 2) },
  light:  { ...findCats, title: '燈塔找貓', secs: 40, howto: '用燈塔的光掃過黑夜，看到貓就點牠。一共藏了六隻。', reward: (s, left) => s * 4 + (s >= 6 ? Math.floor(left / 4) : 0) },
};

const $ = (s) => document.querySelector(s);
let run = null;

export function openGame(islandId) {
  const g = GAMES[islandId];
  if (!g) return;
  const best = game.get().best[islandId] || 0;
  $('#gTitle').textContent = g.title;
  $('#gHow').textContent = g.howto;
  $('#gBest').textContent = best ? `最佳紀錄 ${best}` : '還沒有紀錄';
  $('#gScore').textContent = '0';
  $('#gClock').textContent = g.secs;
  $('#gClockWrap').hidden = !g.secs;
  $('#gIntro').hidden = false;
  $('#gResult').hidden = true;
  $('#gStage').replaceChildren();
  $('#gameBox').dataset.id = islandId;
  $('#gameLayer').hidden = false;
  $('#gStart').focus();
}

function start() {
  const id = $('#gameBox').dataset.id;
  const g = GAMES[id];
  $('#gIntro').hidden = true;
  $('#gResult').hidden = true;
  const stage = $('#gStage');
  stage.replaceChildren();
  let score = 0, left = g.secs, timer = 0;
  const api = {
    add(n) { score = Math.max(0, score + n); $('#gScore').textContent = score; },
    get score() { return score; },
    get left() { return left; },
    end: () => finish(),
  };
  if (g.secs) {
    timer = setInterval(() => {
      left -= 1;
      $('#gClock').textContent = left;
      if (left <= 0) finish();
    }, 1000);
  }
  const stop = g.start(stage, api);
  run = { stop, timer, id };

  function finish() {
    if (!run) return;
    clearInterval(timer);
    run.stop?.();
    run = null;
    const fish = g.reward(score, Math.max(0, left));
    const record = game.recordGame(id, score);
    if (fish > 0) game.addFish(fish);
    $('#gFinal').textContent = `得分 ${score}${record ? '，新紀錄！' : ''}`;
    $('#gPrize').textContent = fish > 0 ? `獲得 ${fish} 條小魚乾` : '這次沒有拿到小魚乾，再試一次？';
    $('#gResult').hidden = false;
    $('#gAgain').focus();
  }
}

export function closeGame() {
  if (run) { clearInterval(run.timer); run.stop?.(); run = null; }
  $('#gameLayer').hidden = true;
  $('#gStage').replaceChildren();
}

export function initGames() {
  $('#gStart').addEventListener('click', start);
  $('#gAgain').addEventListener('click', start);
  $('#gClose').addEventListener('click', closeGame);
  $('#gDone').addEventListener('click', closeGame);
  addEventListener('keydown', (e) => e.key === 'Escape' && !$('#gameLayer').hidden && closeGame());
}
