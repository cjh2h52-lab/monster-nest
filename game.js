// 몬스터 둥지 — 말하는 몬스터 키우기 첫 판
import {
  IMG, NAMES, BABY_LINES, PERSONALITIES, START_SKILLS, SKILL_UNLOCKS, FALLBACK_SKILL_NAMES,
  TYPE_LABEL, ENEMIES, PLACES, MEETS,
} from './data.js';
import * as AI from './ai.js';

const SAVE_KEY = 'monnest_save_v1';
const $ = s => document.querySelector(s);
const screen = $('#screen');
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// 받침에 맞는 조사: pp('불꽃이','이','가') → '가'
const pp = (w, a, b) => {
  const c = String(w).charCodeAt(String(w).length - 1), jong = (c >= 0xac00 && c <= 0xd7a3) ? (c - 0xac00) % 28 : 0;
  if (a === '으로') return jong && jong !== 8 ? a : b;
  return jong ? a : b;
};
const josa = (w, a, b) => w + pp(w, a, b);

// ───────── 상태 ─────────
function newState() {
  return {
    stage: 'egg', eggTaps: 0, name: '', personality: null, born: null,
    lv: 1, exp: 0, hp: 40, full: 80, love: 10, gold: 50, stone: 0, enh: 0,
    skills: [], counts: { play: 0, adv: 0, win: 0, chat: 0, eat: 0 },
    memory: [], chat: [], last: Date.now(),
  };
}
function load() {
  try {
    const t = localStorage.getItem(SAVE_KEY);
    if (t) { const s = JSON.parse(t); return { ...newState(), ...s, counts: { ...newState().counts, ...s.counts } }; }
  } catch { /* 새로 시작 */ }
  return newState();
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch { /* 저장 불가 */ } }

let S = load();
let mode = 'home';
let adv = null;   // 진행 중인 모험
let B = null;     // 진행 중인 전투

function stats() {
  const adult = S.stage === 'adult', l = S.lv - 1;
  return {
    maxHp: Math.round(40 + l * 8 + (adult ? 15 : 0) + S.enh * 6),
    atk: 10 + l * 2.5 + (adult ? 5 : 0) + S.enh * 2,
    spd: 8 + l * 1.5 + (adult ? 3 : 0),
  };
}
const needExp = () => 20 + S.lv * 15;
const dayNo = () => Math.max(1, Math.floor((Date.now() - S.born) / 86400000) + 1);
function remember(text) { S.memory.push(`[${dayNo()}일째] ${text}`); S.memory = S.memory.slice(-20); }
const monImg = () => IMG[S.stage];

function line(key) {
  if (S.stage === 'baby') {
    const pool = key === 'idle' ? [...BABY_LINES.idle, PERSONALITIES[S.personality].babyIdle] : BABY_LINES[key];
    return pick(pool);
  }
  return pick(PERSONALITIES[S.personality].lines[key]);
}

// 시간이 흐르면 배가 고프고, 둥지에 있으면 체력이 찬다
function tick() {
  const now = Date.now(), dt = now - S.last;
  S.last = now;
  if (S.stage === 'egg') return;
  S.full = clamp(S.full - dt / 180000, 0, 100);           // 3분에 1
  if (mode === 'home') S.hp = clamp(S.hp + dt / 8000, 0, stats().maxHp); // 8초에 1
}

// ───────── 화면 공통 ─────────
function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms);
}
AI.setErrorHandler(msg => toast(msg, 4000));

function say(text, ms = 4500, id = 'bubble') {
  const b = document.getElementById(id);
  if (!b || !text) return;
  b.innerHTML = esc(text);
  b.classList.remove('hidden'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  clearTimeout(say[id]);
  if (ms) say[id] = setTimeout(() => b.classList.add('hidden'), ms);
}

function anim(el, cls, ms = 500) {
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

function floatText(host, text, cls = '') {
  if (!host) return;
  const f = document.createElement('div');
  f.className = `float ${cls}`; f.textContent = text;
  host.appendChild(f); setTimeout(() => f.remove(), 1100);
}

function renderTop() {
  const top = $('#top');
  if (S.stage === 'egg') { top.innerHTML = `<b class="nm">🥚 알</b><span class="sp"></span><button class="ic" data-a="settings">⚙️</button>`; return; }
  top.innerHTML = `
    <b class="nm">${esc(S.name)}${S.enh ? ` <em>+${S.enh}</em>` : ''}</b>
    <span class="lv">Lv${S.lv}</span>
    <div class="xp"><i style="width:${(S.exp / needExp()) * 100}%"></i></div>
    <span class="sp"></span>
    <span class="money">💰${S.gold}</span><span class="money">💎${S.stone}</span>
    <button class="ic" data-a="settings">⚙️</button>`;
}

function bar(label, v, max, cls) {
  return `<div class="bar ${cls}"><span>${label}</span><div><i style="width:${clamp(v / max, 0, 1) * 100}%"></i></div><b>${Math.round(v)}</b></div>`;
}

// ───────── 모달(차례대로 띄운다) ─────────
const modalQ = [];
let modalOpen = false;
function showModal(html, bind) {
  if (modalOpen) { modalQ.push([html, bind]); return; }
  modalOpen = true;
  const m = $('#modal');
  m.innerHTML = `<div class="card">${html}</div>`;
  m.classList.remove('hidden');
  bind?.(m);
}
function closeModal() {
  $('#modal').classList.add('hidden');
  $('#modal').innerHTML = '';
  modalOpen = false;
  const next = modalQ.shift();
  if (next) showModal(...next);
}
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && !$('#modal .card[data-lock]')) closeModal(); });

// ───────── 둥지 ─────────
function renderHome() {
  mode = 'home';
  renderTop();
  const egg = S.stage === 'egg';
  screen.innerHTML = `
    <div class="scene" style="background-image:url(${IMG.bg_nest})">
      <div class="bubble hidden" id="bubble"></div>
      <img id="mon" class="mon ${S.stage} ${egg ? '' : 'bob'}" src="${monImg()}" alt="" data-a="${egg ? 'pet' : 'poke'}">
    </div>
    <div class="panel">
      ${egg ? `<p class="hint">알이 따뜻하다. 쓰다듬어 주자.</p>` : `<div class="bars" id="bars"></div>`}
      <div class="btns">${egg
        ? `<button class="wide" data-a="pet">🥚 알 쓰다듬기</button>`
        : `<button data-a="feed">🍖<span>밥</span></button>
           <button data-a="play">🎾<span>놀기</span></button>
           <button data-a="chat">💬<span>말 걸기</span></button>
           <button data-a="adventure">🗺️<span>모험</span></button>
           <button data-a="skills">📜<span>기술</span></button>
           <button data-a="enhance">🔨<span>강화</span></button>`}
      </div>
    </div>`;
  refreshBars();
}
function refreshBars() {
  const b = $('#bars');
  if (!b) return;
  const st = stats();
  b.innerHTML = bar('체력', S.hp, st.maxHp, 'hp') + bar('배부름', S.full, 100, 'full') + bar('친밀도', S.love, 100, 'love');
}

const act = {};

act.pet = () => {
  S.eggTaps++;
  anim($('#mon'), 'wobble', 600);
  if (S.eggTaps === 3) say('…톡.', 2000);
  if (S.eggTaps === 6) say('…톡톡! 안에서 뭔가 움직인다!', 2500);
  if (S.eggTaps >= 8) hatch();
  save();
};

function hatch() {
  anim($('#mon'), 'flash', 900);
  const ph = pick(NAMES);
  showModal(`
    <h2>알이 깨어났다!</h2>
    <img class="big pop" src="${IMG.baby}" alt="">
    <p>아기 불꽃용이 너를 빤히 본다. 이름을 지어줘.</p>
    <input id="nm" maxlength="8" placeholder="${ph}" autocomplete="off">
    <button class="main" id="ok">이 이름으로!</button>`, m => {
    m.querySelector('.card').dataset.lock = '1';
    const go = () => {
      const name = m.querySelector('#nm').value.trim() || ph;
      Object.assign(S, {
        stage: 'baby', name, personality: pick(Object.keys(PERSONALITIES)), born: Date.now(),
        skills: START_SKILLS.map(s => ({ ...s })), last: Date.now(),
      });
      S.hp = stats().maxHp;
      remember(`알에서 깨어났다. 주인이 ${josa(name, '이라는', '라는')} 이름을 지어줬다.`);
      save(); closeModal(); renderHome();
      say('꾸앙! …주인?', 4000);
      setTimeout(() => toast(`성격: ${S.personality} — ${PERSONALITIES[S.personality].desc}`, 4500), 1200);
    };
    m.querySelector('#ok').onclick = go;
    m.querySelector('#nm').onkeydown = e => { if (e.key === 'Enter') go(); };
    m.querySelector('#nm').focus();
  });
}

act.poke = () => { anim($('#mon'), 'jump', 600); say(line(S.full < 20 ? 'hungry' : 'idle')); };

act.feed = () => {
  if (S.full >= 90) { say(line('full')); return; }
  S.full = clamp(S.full + 35, 0, 100);
  S.hp = clamp(S.hp + stats().maxHp * 0.2, 0, stats().maxHp);
  S.love = clamp(S.love + 1, 0, 100);
  S.counts.eat++;
  anim($('#mon'), 'munch', 700);
  floatText($('.scene'), '🍖 냠냠');
  say(line('eat'));
  refreshBars(); save();
  checkUnlock('eat');
};

act.play = () => {
  if (S.full < 15) { say(line('hungry')); return; }
  if (Date.now() - (act.play.t || 0) < 1200) return;
  act.play.t = Date.now();
  S.full = clamp(S.full - 6, 0, 100);
  S.love = clamp(S.love + 4, 0, 100);
  S.counts.play++;
  anim($('#mon'), 'jump', 600);
  floatText($('.scene'), '💕');
  say(line('play'));
  refreshBars(); save();
  checkUnlock('play');
};

// ───────── 말 걸기 ─────────
let chatBusy = false;
act.chat = () => {
  showModal(`
    <h2>💬 ${esc(S.name)}에게 말 걸기</h2>
    ${AI.hasKey() ? '' : `<p class="note">API 키가 없어서 기본 대사로만 대답해. ⚙️에서 키를 넣으면 진짜로 대화할 수 있어.</p>`}
    <div class="chatlog" id="clog"></div>
    <form class="chatin" id="cf"><input id="cin" placeholder="하고 싶은 말" autocomplete="off" maxlength="200"><button class="main">보내기</button></form>
    <button class="sub" data-close>닫기</button>`, m => {
    drawChat();
    m.querySelector('[data-close]').onclick = closeModal;
    m.querySelector('#cf').onsubmit = e => { e.preventDefault(); sendChat(); };
  });
};
function drawChat(typing) {
  const box = $('#clog');
  if (!box) return;
  box.innerHTML = S.chat.slice(-30).map(m =>
    `<div class="msg ${m.role === 'user' ? 'me' : 'mon'}">${m.role === 'user' ? '' : `<img src="${monImg()}" alt="">`}<p>${esc(m.content)}</p></div>`).join('')
    + (typing ? `<div class="msg mon"><img src="${monImg()}" alt=""><p class="typing">…</p></div>` : '');
  box.scrollTop = box.scrollHeight;
}
async function sendChat() {
  const inp = $('#cin');
  const text = inp?.value.trim();
  if (!text || chatBusy) return;
  inp.value = '';
  chatBusy = true;
  S.chat.push({ role: 'user', content: text });
  drawChat(true);
  let reply = await AI.chat(S, stats());
  if (!reply) reply = line('idle');
  S.chat.push({ role: 'assistant', content: reply });
  S.chat = S.chat.slice(-40);
  S.love = clamp(S.love + 1, 0, 100);
  S.counts.chat++;
  chatBusy = false;
  drawChat();
  refreshBars(); save();
  checkUnlock('chat');
}

// ───────── 기술 ─────────
function skillDesc(s) {
  if (s.type === 'attack') return `위력 ${s.power}${s.crit ? ' · 치명타↑' : ''}`;
  if (s.type === 'heal') return `체력 ${s.power}% 회복`;
  if (s.type === 'buff') return '내 공격력 +25%';
  return `위력 ${s.power} · 상대 공격력 -20%`;
}

act.skills = () => {
  const prog = Object.entries(SKILL_UNLOCKS).filter(([, u]) => u.at.length).map(([k, u]) => {
    const n = S.counts[k], next = u.at.find(a => a > n);
    return `<li>${u.icon} ${u.label} <b>${n}</b>${next ? ` / ${next}` : ' (다 배움)'}</li>`;
  }).join('');
  showModal(`
    <h2>📜 ${esc(S.name)}의 기술</h2>
    <ul class="skilllist">${S.skills.map(s => `<li><b>${esc(s.name)}</b> <small>${TYPE_LABEL[s.type]} · ${skillDesc(s)}</small><br><span>${esc(s.desc)}</span></li>`).join('')}</ul>
    <h3>새 기술이 생기는 곳</h3>
    <p class="note">키운 방식대로 기술이 생겨. 숫자가 차면 하나 배워. 다 자라면 필살기도 생겨.</p>
    <ul class="prog">${prog}</ul>
    <button class="sub" data-close>닫기</button>`, m => { m.querySelector('[data-close]').onclick = closeModal; });
};

function checkUnlock(kind) {
  const u = SKILL_UNLOCKS[kind];
  const idx = u.at.indexOf(S.counts[kind]);
  if (idx >= 0) learnSkill(kind, idx);
}

async function learnSkill(kind, idx) {
  const u = SKILL_UNLOCKS[kind];
  const sk = { type: u.type, power: u.power[idx], crit: u.crit || 0, kind };
  toast('✨ 뭔가 깨우친 것 같아…', 2000);
  const ai = await AI.skillName(S, stats(), u.reason, `${TYPE_LABEL[sk.type]} — ${skillDesc(sk)}`);
  const used = new Set(S.skills.map(s => s.name));
  sk.name = (ai?.name || '').slice(0, 12) || FALLBACK_SKILL_NAMES[kind].find(n => !used.has(n)) || `${u.label} 기술`;
  sk.desc = ai?.desc || u.desc;
  sk.shout = ai?.shout || line('battle');
  remember(`${u.reason} 새 기술 "${sk.name}"${pp(sk.name,'을','를')} 깨우쳤다.`);
  save();

  const head = `<h2>✨ 새 기술!</h2><p>${esc(S.name)}${pp(S.name,'이','가')} ${u.reason}<br><b class="skname">${esc(sk.name)}</b>${pp(sk.name,'을','를')} 깨우쳤다!</p>
    <p class="note">${TYPE_LABEL[sk.type]} · ${skillDesc(sk)}<br>${esc(sk.desc)}</p>`;
  if (S.skills.length < 4) {
    S.skills.push(sk); save();
    showModal(`${head}<button class="main" data-close>좋아!</button>`, m => {
      m.querySelector('[data-close]').onclick = closeModal;
      say(sk.shout);
    });
    return;
  }
  showModal(`${head}<h3>기술은 4개까지야. 뭘 잊을까?</h3>
    <div class="forget">${S.skills.map((s, i) => `<button data-i="${i}">${esc(s.name)} <small>${skillDesc(s)}</small></button>`).join('')}
    <button data-i="-1" class="sub">새 기술 안 배우기</button></div>`, m => {
    m.querySelector('.card').dataset.lock = '1';
    m.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const i = +b.dataset.i;
      if (i >= 0) { S.skills[i] = sk; toast(`${sk.name}${pp(sk.name,'을','를')} 배웠다!`); }
      save(); closeModal();
    });
  });
}

// ───────── 강화 ─────────
act.enhance = () => {
  const gold = 30 * (S.enh + 1), stone = S.enh + 1;
  const ok = S.gold >= gold && S.stone >= stone;
  showModal(`
    <h2>🔨 강화 +${S.enh} → +${S.enh + 1}</h2>
    <img class="big" src="${monImg()}" alt="">
    <p>체력 +6, 공격 +2</p>
    <p class="cost">💰 ${gold} <small>(${S.gold})</small> · 💎 ${stone} <small>(${S.stone})</small></p>
    ${ok ? '' : `<p class="note">재료가 모자라. 💎 강화석은 싸워서 이기면 가끔 나와.</p>`}
    <button class="main" id="go" ${ok ? '' : 'disabled'}>강화하기</button>
    <button class="sub" data-close>닫기</button>`, m => {
    m.querySelector('[data-close]').onclick = closeModal;
    m.querySelector('#go').onclick = () => {
      S.gold -= gold; S.stone -= stone; S.enh++;
      S.hp = stats().maxHp;
      remember(`강화를 받아 +${S.enh} 강화에 성공했다.`);
      save(); closeModal(); renderHome();
      anim($('#mon'), 'flash', 900);
      floatText($('.scene'), `+${S.enh}!`, 'big');
      say(line('enhance'));
    };
  });
};

// ───────── 모험 ─────────
act.adventure = () => {
  showModal(`
    <h2>🗺️ 어디로 갈까?</h2>
    <div class="places">${Object.entries(PLACES).map(([k, p]) => `
      <button data-p="${k}" style="background-image:url(${IMG[p.bg]})">
        <b>${p.name}</b><small>권장 Lv${p.minLv}+ · ${p.steps}번의 일</small>${S.lv < p.minLv ? '<em>위험해!</em>' : ''}
      </button>`).join('')}</div>
    <button class="sub" data-close>닫기</button>`, m => {
    m.querySelector('[data-close]').onclick = closeModal;
    m.querySelectorAll('[data-p]').forEach(b => b.onclick = () => startAdventure(b.dataset.p));
  });
};

function makeEvents(place) {
  const evs = [];
  for (let i = 0; i < place.steps; i++) {
    const r = Math.random();
    if (r < 0.5) evs.push({ type: 'battle', enemy: pick(place.enemies), lv: place.lvBase + ri(0, place.spread) });
    else if (r < 0.8) {
      const t = Math.random();
      evs.push(t < 0.3 ? { type: 'treasure', stone: 1 } : t < 0.5 ? { type: 'treasure', heal: 30 } : { type: 'treasure', gold: ri(10, 25) * place.goldMul });
    } else evs.push({ type: 'meet', love: 3, gold: ri(0, 1) ? ri(5, 12) * place.goldMul : 0 });
  }
  if (!evs.some(e => e.type === 'battle')) evs[ri(0, evs.length - 1)] = { type: 'battle', enemy: pick(place.enemies), lv: place.lvBase + ri(0, 1) };
  // 마지막은 꼭 싸움(마무리 느낌)
  if (evs[evs.length - 1].type !== 'battle') evs[evs.length - 1] = { type: 'battle', enemy: pick(place.enemies), lv: place.lvBase + place.spread };
  return evs;
}

function rewardText(ev) {
  const r = [];
  if (ev.gold) r.push(`💰 ${ev.gold}`);
  if (ev.stone) r.push(`💎 강화석 ${ev.stone}`);
  if (ev.heal) r.push(`🍎 체력 ${ev.heal}% 회복`);
  if (ev.love) r.push(`💕 친밀도 +${ev.love}`);
  return r.join(', ');
}

function describe(ev) {
  if (ev.type === 'battle') return `전투: 야생 ${ENEMIES[ev.enemy].name}(Lv${ev.lv})${pp(ENEMIES[ev.enemy].name,'이','가')} 나타남`;
  if (ev.type === 'treasure') return `보물: ${ev.heal ? '먹으면 기운 나는 열매' : ev.stone ? '반짝이는 강화석' : '떨어진 금화'}를 발견 (${rewardText(ev)})`;
  return `만남: 누군가를 만남(누군지는 네가 정해. 착하고 이 장소에 어울리는 상대). 보상: ${rewardText(ev)}`;
}

function fallback(ev) {
  if (ev.type === 'battle') return { narration: `수풀을 헤치자 야생 ${ENEMIES[ev.enemy].name}${pp(ENEMIES[ev.enemy].name,'이','가')} 길을 막아섰다!`, reaction: line('battle') };
  if (ev.type === 'treasure') return { narration: `${S.name}${pp(S.name,'이','가')} 땅에서 반짝이는 걸 발견했다!`, reaction: line('play') };
  return { narration: pick(MEETS), reaction: line('idle') };
}

async function startAdventure(key) {
  const st = stats();
  if (S.full < 20) { closeModal(); say(line('hungry')); toast('배고파서 못 가. 밥부터 주자'); return; }
  if (S.hp < st.maxHp * 0.3) { closeModal(); say(line('tired')); toast('체력이 너무 낮아. 둥지에서 좀 쉬자'); return; }
  closeModal();
  const place = PLACES[key];
  adv = { key, place, events: makeEvents(place), i: -1, log: [], wins: 0 };
  mode = 'adv';
  screen.innerHTML = `
    <div class="scene" style="background-image:url(${IMG[place.bg]})">
      <div class="bubble" id="bubble">${esc(line('battle'))}</div>
      <img id="mon" class="mon ${S.stage} walk" src="${monImg()}" alt="">
    </div>
    <div class="panel"><p class="loading">${esc(place.name)}${pp(place.name,'으로','로')} 출발하는 중…</p></div>`;
  const ai = await AI.adventure(S, st, place, adv.events.map(describe));
  adv.events.forEach((ev, k) => {
    const f = fallback(ev), a = ai?.[k];
    ev.narration = a?.narration || f.narration;
    ev.reaction = a?.reaction || f.reaction;
  });
  nextEvent();
}

function nextEvent() {
  adv.i++;
  S.full = clamp(S.full - 4, 0, 100);
  if (adv.i >= adv.events.length) { finishAdventure(true); return; }
  const ev = adv.events[adv.i];
  let reward = '';
  if (ev.type !== 'battle') {
    S.gold += ev.gold || 0;
    S.stone += ev.stone || 0;
    S.love = clamp(S.love + (ev.love || 0), 0, 100);
    if (ev.heal) S.hp = clamp(S.hp + stats().maxHp * ev.heal / 100, 0, stats().maxHp);
    reward = rewardText(ev);
    adv.log.push(`${ev.narration} (${reward})`);
  }
  save();
  renderAdv(ev, reward);
}

function renderAdv(ev, reward) {
  mode = 'adv';
  renderTop();
  const place = adv.place, st = stats();
  const foe = ev.type === 'battle' ? ENEMIES[ev.enemy] : null;
  screen.innerHTML = `
    <div class="scene" style="background-image:url(${IMG[place.bg]})">
      <div class="step">${place.name} · ${adv.i + 1}/${adv.events.length}</div>
      <div class="bubble hidden" id="bubble"></div>
      <img id="mon" class="mon ${S.stage} walk ${foe ? 'left' : ''}" src="${monImg()}" alt="">
      ${foe ? `<img class="foe peek" src="${IMG[ev.enemy]}" alt="">` : ''}
    </div>
    <div class="panel">
      <div class="bars">${bar('체력', S.hp, st.maxHp, 'hp')}</div>
      <p class="narr">${esc(ev.narration)}</p>
      ${reward ? `<p class="reward">${esc(reward)}</p>` : ''}
      <div class="btns">${foe
        ? `<button class="wide main" data-a="fight">⚔️ 싸우기</button>`
        : `<button class="wide main" data-a="next">다음 ▶</button>`}
        <button class="wide sub" data-a="goHome">둥지로 돌아가기</button>
      </div>
    </div>`;
  setTimeout(() => say(ev.reaction, 5000), 400);
}

act.next = () => nextEvent();
act.fight = () => startBattle(adv.events[adv.i]);
act.goHome = () => finishAdventure(false);

async function finishAdventure(complete, fainted = false) {
  const place = adv.place;
  if (complete) adv.log.push('모험을 끝까지 마쳤다.');
  if (fainted) adv.log.push('싸우다 쓰러져서 겨우 둥지로 돌아왔다.');
  else if (!complete) adv.log.push('중간에 둥지로 돌아왔다.');
  S.counts.adv++;
  remember(`${place.name} 모험: ${adv.wins}번 이김${fainted ? ', 쓰러져서 돌아옴' : complete ? ', 끝까지 다녀옴' : ', 중간에 돌아옴'}.`);
  const log = adv.log;
  adv = null;
  save();
  renderHome();
  say('…', 0);
  const st = await AI.story(S, stats(), place, log);
  say(st || (fainted ? line('lose') : line('win')), 9000);
  checkUnlock('adv');
}

// ───────── 전투 ─────────
function startBattle(ev) {
  const E = ENEMIES[ev.enemy], lv = ev.lv;
  const hp = Math.round(E.hp * (1 + 0.25 * (lv - 1)));
  B = { ev, E, lv, ehp: hp, emax: hp, eatk: E.atk * (1 + 0.15 * (lv - 1)), espd: E.spd + (lv - 1), myMul: 1, enMul: 1, busy: false };
  mode = 'battle';
  renderBattle();
  blog(`야생 ${E.name}(Lv${lv})${pp(E.name,'이','가')} 덤벼든다!`);
}

function renderBattle() {
  const st = stats();
  screen.innerHTML = `
    <div class="scene battle" style="background-image:url(${IMG[adv.place.bg]})">
      <div class="hpbox foeHp"><b>${B.E.name}</b> Lv${B.lv}<div class="hb"><i id="ehp"></i></div></div>
      <img id="foe" class="foe" src="${IMG[B.ev.enemy]}" alt="">
      <div class="bubble hidden" id="bubble"></div>
      <img id="mon" class="mon ${S.stage} fighter" src="${monImg()}" alt="">
      <div class="hpbox myHp"><b>${esc(S.name)}</b> Lv${S.lv}<div class="hb"><i id="mhp"></i></div><small id="mhpn"></small></div>
    </div>
    <div class="panel">
      <p class="blog" id="blog"></p>
      <div class="skillbtns">${S.skills.map((s, i) => `<button data-sk="${i}" class="t-${s.type}"><b>${esc(s.name)}</b><small>${TYPE_LABEL[s.type]} · ${skillDesc(s)}</small></button>`).join('')}</div>
      <button class="sub" id="run">도망치기</button>
    </div>`;
  screen.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => useSkill(+b.dataset.sk));
  $('#run').onclick = runAway;
  drawHp();
}

function drawHp() {
  const st = stats();
  $('#ehp').style.width = `${clamp(B.ehp / B.emax, 0, 1) * 100}%`;
  $('#mhp').style.width = `${clamp(S.hp / st.maxHp, 0, 1) * 100}%`;
  $('#mhpn').textContent = `${Math.max(0, Math.round(S.hp))}/${st.maxHp}`;
}
const blog = t => { const b = $('#blog'); if (b) b.textContent = t; };
function lockBtns(on) { screen.querySelectorAll('.skillbtns button, #run').forEach(b => b.disabled = on); }

async function useSkill(i) {
  if (B.busy) return;
  B.busy = true; lockBtns(true);
  const sk = S.skills[i];
  const meFirst = stats().spd > B.espd || (stats().spd === B.espd && Math.random() < 0.5);
  for (const who of meFirst ? ['me', 'foe'] : ['foe', 'me']) {
    if (who === 'me') await myTurn(sk); else await foeTurn();
    if (B.ehp <= 0) return win();
    if (S.hp <= 0) return lose();
  }
  B.busy = false; lockBtns(false);
}

async function myTurn(sk) {
  const st = stats();
  say(sk.shout, 1600);
  blog(`${S.name}의 ${sk.name}!`);
  if (sk.type === 'heal') {
    const h = Math.round(st.maxHp * sk.power / 100);
    S.hp = clamp(S.hp + h, 0, st.maxHp);
    anim($('#mon'), 'flash', 700); floatText($('.scene'), `+${h}`, 'heal me');
  } else if (sk.type === 'buff') {
    B.myMul = Math.min(1.5, B.myMul + 0.25);
    anim($('#mon'), 'jump', 600); floatText($('.scene'), '공격력↑', 'buff me');
  } else {
    anim($('#mon'), 'lunge', 500);
    await sleep(220);
    const crit = Math.random() < 0.05 + S.love / 400 + (sk.crit || 0);
    const dmg = Math.max(1, Math.round(sk.power * st.atk * B.myMul / 10 * rnd(0.85, 1.15) * (crit ? 1.5 : 1)));
    B.ehp -= dmg;
    anim($('#foe'), 'hit', 500);
    floatText($('.scene'), crit ? `치명타! -${dmg}` : `-${dmg}`, 'dmg foe');
    if (sk.type === 'debuff') { B.enMul = Math.max(0.6, B.enMul - 0.2); setTimeout(() => floatText($('.scene'), '공격력↓', 'buff foe'), 300); }
  }
  drawHp();
  await sleep(850);
}

async function foeTurn() {
  const s = pick(B.E.skills);
  blog(`${B.E.name}의 ${s.name}!`);
  anim($('#foe'), 'lungeL', 500);
  await sleep(220);
  const dmg = Math.max(1, Math.round(s.power * B.eatk * B.enMul / 10 * rnd(0.85, 1.15)));
  S.hp -= dmg;
  anim($('#mon'), 'hit', 500);
  floatText($('.scene'), `-${dmg}`, 'dmg me');
  drawHp();
  await sleep(850);
}

async function win() {
  const exp = 8 + B.lv * 6, gold = ri(5, 10) + B.lv * 3, stone = Math.random() < 0.4 ? 1 : 0;
  S.gold += gold; S.stone += stone; S.counts.win++;
  S.hp = clamp(S.hp + stats().maxHp * 0.15, 0, stats().maxHp); // 이기면 숨 고르기
  adv.wins++;
  adv.log.push(`야생 ${B.E.name}(Lv${B.lv})${pp(B.E.name,'과','와')} 싸워서 이겼다.`);
  $('#foe').classList.add('gone');
  blog(`${B.E.name}${pp(B.E.name,'을','를')} 물리쳤다!`);
  say(line('win'), 2500);
  await sleep(900);
  const ups = gainExp(exp);
  save();
  showModal(`<h2>승리!</h2><p>경험치 +${exp} · 💰 ${gold}${stone ? ' · 💎 강화석 1' : ''}</p>${ups}
    <button class="main" data-close>계속 ▶</button>`, m => {
    m.querySelector('.card').dataset.lock = '1';
    m.querySelector('[data-close]').onclick = () => { closeModal(); B = null; checkUnlock('win'); nextEvent(); };
  });
}

function lose() {
  S.hp = 1;
  adv.log.push(`야생 ${B.E.name}에게 졌다.`);
  blog(`${S.name}${pp(S.name,'이','가')} 쓰러졌다…`);
  $('#mon').classList.add('down');
  say(line('lose'), 3000);
  save();
  setTimeout(() => showModal(`<h2>쓰러졌다…</h2><p>${esc(S.name)}${pp(S.name,'을','를')} 안고 둥지로 돌아간다.</p>
    <button class="main" data-close>둥지로</button>`, m => {
    m.querySelector('.card').dataset.lock = '1';
    m.querySelector('[data-close]').onclick = () => { closeModal(); B = null; finishAdventure(false, true); };
  }), 1200);
}

function runAway() {
  if (B.busy) return;
  adv.log.push(`야생 ${B.E.name}${pp(B.E.name,'을','를')} 피해 도망쳤다.`);
  B = null;
  toast('후다닥 도망쳤다!');
  nextEvent();
}

function gainExp(n) {
  S.exp += n;
  let html = '';
  while (S.exp >= needExp()) {
    S.exp -= needExp(); S.lv++;
    html += `<p class="up">레벨 업! Lv${S.lv}</p>`;
    S.hp = stats().maxHp;
    remember(`레벨이 올라 Lv${S.lv} 달성.`);
  }
  if (S.stage === 'baby' && S.lv >= 5) setTimeout(evolve, 50);
  renderTop();
  return html;
}

async function evolve() {
  S.stage = 'adult';
  S.hp = stats().maxHp;
  remember('아기 용에서 다 자란 용으로 진화했다! 이제 말을 또박또박 한다.');
  save();
  showModal(`<h2>✨ 진화!</h2>
    <div class="evo"><img class="from" src="${IMG.baby}" alt=""><img class="to" src="${IMG.adult}" alt=""></div>
    <p>${esc(S.name)}${pp(S.name,'이','가')} 다 자란 불꽃용이 됐다!</p>
    <p class="quote" id="evq">…</p>
    <button class="main" data-close>멋지다!</button>`, async m => {
    m.querySelector('[data-close]').onclick = () => { closeModal(); if (mode === 'home') renderHome(); };
    const q = await AI.evolveLine(S, stats());
    const el = document.getElementById('evq');
    if (el) el.textContent = q || line('levelup');
  });
  learnSkill('evolve', 0);
}

// ───────── 설정 ─────────
act.settings = () => {
  showModal(`
    <h2>⚙️ 설정</h2>
    <label>Claude API 키</label>
    <input id="key" type="password" placeholder="sk-ant-..." value="${esc(AI.getKey())}" autocomplete="off">
    <p class="note">키는 이 폰(브라우저)에만 저장돼. 키가 없어도 기본 대사로 할 수 있어.</p>
    <label>모델</label>
    <select id="model">${AI.MODELS.map(m => `<option value="${m.id}" ${m.id === AI.getModel() ? 'selected' : ''}>${m.label}</option>`).join('')}</select>
    <button class="main" id="sv">저장</button>
    <button class="sub" data-close>닫기</button>
    <hr>
    <button class="danger" id="reset">처음부터 다시 (저장 지우기)</button>`, m => {
    m.querySelector('[data-close]').onclick = closeModal;
    m.querySelector('#sv').onclick = () => {
      AI.setKey(m.querySelector('#key').value);
      AI.setModel(m.querySelector('#model').value);
      closeModal(); toast(AI.hasKey() ? '저장했어. 이제 몬스터가 진짜로 말해!' : '키 없이 기본 대사로 할게');
    };
    m.querySelector('#reset').onclick = () => {
      if (!confirm('정말 처음부터 다시 할까? 몬스터가 사라져.')) return;
      try { localStorage.removeItem(SAVE_KEY); } catch { /* 무시 */ }
      S = newState(); adv = null; B = null;
      closeModal(); renderHome();
    };
  });
};

// ───────── 시작 ─────────
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (b && act[b.dataset.a]) act[b.dataset.a](b);
});

setInterval(() => {
  tick();
  if (mode === 'home') {
    refreshBars();
    if (S.stage !== 'egg' && S.full < 20 && Math.random() < 0.08) say(line('hungry'));
  }
  save();
}, 5000);

tick();
if (adv === null) mode = 'home';
renderHome();
if (S.stage !== 'egg') setTimeout(() => say(S.full < 20 ? line('hungry') : line('idle')), 600);
