// 전투 이펙트: 장면 위에 캔버스를 깔고 파티클로 그린다.
// play()는 "맞는 순간"에 끝나는 Promise를 돌려준다. 그때 피해 숫자를 띄우면 박자가 맞는다.

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, k) => a + (b - a) * k;
const mix = (c1, c2, k) => c1.map((v, i) => Math.round(lerp(v, c2[i], k)));

// 효과 이름 → 쓸 수 있는 기술 종류 (AI가 이 안에서 고른다)
export const FX_BY_TYPE = {
  attack: ['tackle', 'ember', 'flamethrower', 'slash', 'bite', 'rock', 'punch', 'leaf', 'sonic'],
  debuff: ['tickle', 'charm', 'growl'],
  buff: ['aura'],
  heal: ['heal'],
};
// 몸으로 부딪치는 기술(몬스터가 앞으로 튀어나간다)
export const CONTACT = new Set(['tackle', 'bite', 'slash', 'punch']);

const FIRE = [[255, 250, 210], [255, 196, 60], [255, 120, 30], [220, 60, 20]];
function ramp(stops, k) {
  const f = Math.min(stops.length - 1.001, k * (stops.length - 1)), i = Math.floor(f);
  return mix(stops[i], stops[i + 1], f - i);
}

export class FX {
  // layer: 'top'은 몬스터들 앞, 'mid'는 적 앞·내 몬스터 뒤(뒷모습이라 입이 머리 너머에 있다)
  constructor(scene, layer = 'top') {
    this.scene = scene;
    this.cv = document.createElement('canvas');
    this.cv.className = `fxcv ${layer}`;
    scene.appendChild(this.cv);
    this.ctx = this.cv.getContext('2d');
    this.parts = [];
    this.objs = [];
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(scene);
  }
  resize() {
    const r = this.scene.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width; this.h = r.height;
    this.cv.width = r.width * d; this.cv.height = r.height * d;
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  destroy() { this.dead = true; this.ro.disconnect(); this.cv.remove(); }
  pos(el, fy = 0.5) {
    const r = el.getBoundingClientRect(), s = this.scene.getBoundingClientRect();
    return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height * fy, w: r.width, h: r.height };
  }
  add(p) {
    this.parts.push(Object.assign({
      x: 0, y: 0, vx: 0, vy: 0, ay: 0, drag: 0, t: 0, life: 0.5, size: 10, size2: 0,
      kind: 'glow', col: [255, 255, 255], col2: null, ramp: null, alpha: 1, rot: 0, vr: 0, blend: 'lighter',
    }, p));
    this.start();
  }
  obj(o) { o.t = 0; this.objs.push(o); this.start(); }
  start() {
    if (this.running || this.dead) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(t => this.frame(t));
  }
  frame(now) {
    if (this.dead) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    this.objs = this.objs.filter(o => { o.t += dt; return o.draw(c, o.t, dt) !== false; });
    this.parts = this.parts.filter(p => {
      p.t += dt;
      if (p.t >= p.life) return false;
      p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt;
      p.vy += p.ay * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      drawPart(c, p, p.t / p.life);
      return true;
    });
    if (this.objs.length || this.parts.length) requestAnimationFrame(t => this.frame(t));
    else { this.running = false; c.clearRect(0, 0, this.w, this.h); }
  }
  shake(big) {
    this.scene.classList.remove('shake', 'shakeBig'); void this.scene.offsetWidth;
    this.scene.classList.add(big ? 'shakeBig' : 'shake');
  }
  flash(alpha = 0.55, col = '255,255,255') {
    this.obj({ draw: (c, t) => { if (t > 0.18) return false; c.fillStyle = `rgba(${col},${alpha * (1 - t / 0.18)})`; c.fillRect(0, 0, this.w, this.h); } });
  }
}

function drawPart(c, p, k) {
  const size = lerp(p.size, p.size2 ?? p.size, k);
  const col = p.ramp ? ramp(p.ramp, k) : p.col2 ? mix(p.col, p.col2, k) : p.col;
  const a = p.alpha * (k < 0.15 ? 1 : 1 - (k - 0.15) / 0.85);
  if (size <= 0.3 || a <= 0) return;
  c.save();
  c.globalCompositeOperation = p.blend;
  c.translate(p.x, p.y);
  c.rotate(p.rot);
  const rgb = `${col[0]},${col[1]},${col[2]}`;
  switch (p.kind) {
    case 'glow': {
      const g = c.createRadialGradient(0, 0, 0, 0, 0, size);
      const core = p.ramp ? mix(col, [255, 255, 230], 0.45) : [255, 255, 240]; // 불은 식으면서 속까지 붉어진다
      g.addColorStop(0, `rgba(${core},${a})`);
      g.addColorStop(0.35, `rgba(${rgb},${a * 0.9})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, size, 0, 7); c.fill();
      break;
    }
    case 'soft': { // 연기·먼지
      const g = c.createRadialGradient(0, 0, 0, 0, 0, size);
      g.addColorStop(0, `rgba(${rgb},${a * 0.7})`); g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, size, 0, 7); c.fill();
      break;
    }
    case 'star': {
      c.fillStyle = `rgba(${rgb},${a})`;
      c.beginPath();
      for (let i = 0; i < 8; i++) { const r = i % 2 ? size * 0.22 : size, an = i * Math.PI / 4; c.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
      c.fill();
      break;
    }
    case 'spark': { // 속도 방향으로 늘어진 불티
      c.rotate(Math.atan2(p.vy, p.vx) - p.rot);
      c.strokeStyle = `rgba(${rgb},${a})`; c.lineWidth = Math.max(1, size * 0.35); c.lineCap = 'round';
      c.beginPath(); c.moveTo(-size * 1.6, 0); c.lineTo(size * 0.4, 0); c.stroke();
      break;
    }
    case 'ring': {
      c.strokeStyle = `rgba(${rgb},${a})`; c.lineWidth = Math.max(0.5, (p.lw || 6) * (1 - k));
      c.beginPath(); c.ellipse(0, 0, size, size * (p.squash || 1), 0, 0, 7); c.stroke();
      break;
    }
    case 'rock': {
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = `rgba(${rgb},${a})`; c.strokeStyle = `rgba(40,25,15,${a})`; c.lineWidth = 2.5;
      c.beginPath(); p.shape.forEach(([x, y], i) => i ? c.lineTo(x * size, y * size) : c.moveTo(x * size, y * size)); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = `rgba(255,255,255,${a * 0.25})`; c.beginPath(); c.arc(-size * 0.25, -size * 0.25, size * 0.25, 0, 7); c.fill();
      break;
    }
    case 'leaf': {
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = `rgba(${rgb},${a})`; c.strokeStyle = `rgba(30,90,30,${a})`; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(0, 0, size, size * 0.45, 0, 0, 7); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-size, 0); c.lineTo(size, 0); c.stroke();
      break;
    }
    case 'heart': {
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = `rgba(${rgb},${a})`; c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 2;
      const s = size / 10;
      c.beginPath(); c.moveTo(0, 3 * s); c.bezierCurveTo(-10 * s, -4 * s, -5 * s, -11 * s, 0, -5 * s); c.bezierCurveTo(5 * s, -11 * s, 10 * s, -4 * s, 0, 3 * s);
      c.fill(); c.stroke();
      break;
    }
    case 'text': {
      c.globalCompositeOperation = 'source-over';
      c.font = `${size}px Jua, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 4; c.strokeStyle = `rgba(255,255,255,${a})`; c.strokeText(p.text, 0, 0);
      c.fillStyle = `rgba(${rgb},${a})`; c.fillText(p.text, 0, 0);
      break;
    }
    default: {
      c.fillStyle = `rgba(${rgb},${a})`; c.beginPath(); c.arc(0, 0, size, 0, 7); c.fill();
    }
  }
  c.restore();
}

// ───────── 부품 ─────────
function burst(fx, at, scale = 1, col = [255, 230, 120]) {
  // 만화식 충격 별
  fx.obj({ draw: (c, t) => {
    const L = 0.26; if (t > L) return false;
    const k = t / L, r = (34 + 50 * Math.sqrt(k)) * scale;
    const a = k < 0.5 ? 1 : 1 - (k - 0.5) * 2;
    c.save(); c.translate(at.x, at.y); c.rotate(0.3);
    c.beginPath();
    for (let i = 0; i < 20; i++) { const rr = i % 2 ? r * 0.45 : r * (i % 4 ? 0.8 : 1), an = i * Math.PI / 10; c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
    c.closePath();
    c.fillStyle = `rgba(${col},${a})`; c.fill();
    c.lineWidth = 3; c.strokeStyle = `rgba(230,110,30,${a})`; c.stroke();
    c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.arc(0, 0, r * 0.3, 0, 7); c.fill();
    c.restore();
  } });
  fx.add({ x: at.x, y: at.y, kind: 'ring', size: 12 * scale, size2: 80 * scale, life: 0.35, col: [255, 255, 255], lw: 7 });
  for (let i = 0; i < 12 * scale; i++) {
    const an = rnd(0, 7), sp = rnd(180, 420) * scale;
    fx.add({ x: at.x, y: at.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, drag: 5, kind: 'spark', size: rnd(4, 8), size2: 1, life: rnd(0.25, 0.45), col: [255, 240, 160] });
  }
}

function explode(fx, at, scale = 1) {
  fx.add({ x: at.x, y: at.y, kind: 'glow', size: 70 * scale, size2: 20, life: 0.25, col: [255, 170, 60] });
  fx.add({ x: at.x, y: at.y, kind: 'ring', size: 15, size2: 90 * scale, life: 0.4, col: [255, 160, 60], lw: 8 });
  for (let i = 0; i < 28 * scale; i++) {
    const an = rnd(0, 7), sp = rnd(60, 280) * scale;
    fx.add({ x: at.x, y: at.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 40, drag: 3, ay: -60, kind: 'glow', size: rnd(14, 26) * scale, size2: 2, life: rnd(0.35, 0.65), ramp: FIRE });
  }
  for (let i = 0; i < 6; i++) fx.add({ x: at.x + rnd(-35, 35), y: at.y + rnd(-25, 10), vy: rnd(-70, -30), kind: 'soft', blend: 'source-over', size: rnd(14, 22), size2: 38, life: 0.8, col: [215, 205, 195], alpha: 0.35 });
}

function arcPath(from, to, lift, k) {
  const mx = (from.x + to.x) / 2, my = Math.min(from.y, to.y) - lift;
  const a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, d = k * k;
  return { x: a * from.x + b * mx + d * to.x, y: a * from.y + b * my + d * to.y };
}

function projectile(fx, from, to, { dur = 0.35, lift = 40, head, trail }) {
  return new Promise(res => {
    fx.obj({ draw: (c, t) => {
      const k = Math.min(1, t / dur), p = arcPath(from, to, lift, k);
      trail?.(p);
      head?.(c, p, t);
      if (k >= 1) { res(p); return false; }
    } });
  });
}

// ───────── 기술 이펙트 ─────────
const EFFECTS = {
  async tackle(fx, from, to) { await sleep(190); burst(fx, to, 1.1); fx.shake(); },

  async punch(fx, from, to) { await sleep(190); burst(fx, to, 1.5); fx.flash(0.18); fx.shake(true); },

  async ember(fx, from, to) {
    await projectile(fx, from, to, {
      dur: 0.38, lift: 50,
      head: (c, p) => {
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 22);
        g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(0.4, 'rgba(255,170,40,.95)'); g.addColorStop(1, 'rgba(255,80,20,0)');
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, 22, 0, 7); c.fill(); c.restore();
      },
      trail: p => fx.add({ x: p.x + rnd(-4, 4), y: p.y + rnd(-4, 4), vy: rnd(-40, -10), kind: 'glow', size: rnd(10, 16), size2: 1, life: 0.32, ramp: FIRE }),
    });
    explode(fx, to, 0.9); fx.shake();
  },

  async flamethrower(fx, from, to) {
    const dx = to.x - from.x, dy = to.y - from.y, dist = Math.hypot(dx, dy), base = Math.atan2(dy, dx);
    const end = performance.now() + 650;
    const spit = () => {
      for (let i = 0; i < 5; i++) {
        const an = base + rnd(-0.13, 0.13), sp = dist / rnd(0.32, 0.42);
        fx.add({ x: from.x, y: from.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, kind: 'glow', size: rnd(6, 10), size2: rnd(30, 44), life: rnd(0.38, 0.5), ramp: FIRE, alpha: 0.9 });
      }
      if (performance.now() < end) requestAnimationFrame(spit);
    };
    spit();
    await sleep(380);
    fx.flash(0.15, '255,200,120'); fx.shake(true);
    await sleep(250);
    explode(fx, to, 1.2);
  },

  async slash(fx, from, to) {
    await sleep(170);
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 22;
      const a = { x: to.x - 70 + off, y: to.y - 70 - off * 0.3 }, b = { x: to.x + 60 + off, y: to.y + 60 - off * 0.3 };
      fx.obj({ draw: (c, t) => {
        const L = 0.28; if (t > L) return false;
        const k = Math.min(1, t / 0.1), fade = t < 0.1 ? 1 : 1 - (t - 0.1) / (L - 0.1);
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        c.shadowColor = 'rgba(140,220,255,1)'; c.shadowBlur = 16;
        c.strokeStyle = `rgba(255,255,255,${fade})`; c.lineWidth = 7 * fade + 1;
        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(lerp(a.x, b.x, k), lerp(a.y, b.y, k)); c.stroke();
        c.restore();
      } });
      for (let j = 0; j < 5; j++) fx.add({ x: b.x, y: b.y, vx: rnd(-150, 150), vy: rnd(-150, 150), drag: 5, kind: 'spark', size: 5, size2: 1, life: 0.3, col: [180, 230, 255] });
      await sleep(70);
    }
    fx.shake();
  },

  async bite(fx, from, to) {
    await sleep(150);
    const fang = (c, y, dir, a) => {
      c.fillStyle = `rgba(255,255,255,${a})`; c.strokeStyle = `rgba(60,30,30,${a})`; c.lineWidth = 3;
      for (let i = -2; i <= 2; i++) {
        const x = to.x + i * 22, h = i === -2 || i === 2 ? 26 : 34;
        c.beginPath(); c.moveTo(x - 10, y); c.lineTo(x + 10, y); c.lineTo(x, y + dir * h); c.closePath(); c.fill(); c.stroke();
      }
    };
    await new Promise(res => fx.obj({ draw: (c, t) => {
      const close = Math.min(1, t / 0.16), ease = close * close, fade = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.15;
      if (t > 0.45) return false;
      if (close >= 1 && !res.done) { res.done = true; res(); }
      c.save(); fang(c, to.y - 80 + ease * 62, 1, fade); fang(c, to.y + 80 - ease * 62, -1, fade); c.restore();
    } }));
    burst(fx, to, 0.9, [255, 200, 200]); fx.shake();
  },

  async rock(fx, from, to) {
    const shape = () => Array.from({ length: 7 }, (_, i) => { const an = i / 7 * Math.PI * 2, r = rnd(0.7, 1); return [Math.cos(an) * r, Math.sin(an) * r]; });
    const drops = [0, 1, 2, 3].map(i => new Promise(res => setTimeout(() => {
      const x = to.x + rnd(-55, 55), y0 = to.y - to.h * 0.8 - rnd(0, 80), y1 = to.y + rnd(-10, 25), size = rnd(14, 22);
      const p = { kind: 'rock', shape: shape(), col: [150, 120, 95], size, x, y: y0, rot: rnd(0, 6) };
      fx.obj({ draw: (c, t) => {
        const k = Math.min(1, t / 0.28);
        p.y = lerp(y0, y1, k * k); p.rot += 0.15;
        drawPart(c, { ...p, alpha: 1, size2: size, blend: 'source-over' }, 0);
        if (k >= 1) {
          for (let j = 0; j < 8; j++) fx.add({ x, y: y1, vx: rnd(-120, 120), vy: rnd(-90, -10), ay: 200, drag: 2, kind: 'soft', blend: 'source-over', size: rnd(10, 18), size2: 28, life: 0.6, col: [170, 145, 110], alpha: 0.8 });
          for (let j = 0; j < 4; j++) fx.add({ x, y: y1, vx: rnd(-140, 140), vy: rnd(-200, -80), ay: 600, kind: 'rock', shape: shape(), blend: 'source-over', col: [130, 105, 85], size: 5, size2: 5, life: 0.6, vr: rnd(-8, 8) });
          fx.shake(i === 1);
          res(); return false;
        }
      } });
    }, i * 110)));
    await drops[1];
  },

  async leaf(fx, from, to) {
    const hits = [];
    for (let i = 0; i < 5; i++) {
      const s = { x: from.x + rnd(-15, 15), y: from.y + rnd(-15, 15) }, e = { x: to.x + rnd(-25, 25), y: to.y + rnd(-25, 25) };
      hits.push(projectile(fx, s, e, {
        dur: 0.32, lift: rnd(-30, 50),
        head: (c, p, t) => drawPart(c, { x: p.x, y: p.y, kind: 'leaf', size: 17, size2: 17, col: [120, 210, 80], alpha: 1, rot: t * 25, blend: 'source-over' }, 0),
      }).then(p => { for (let j = 0; j < 4; j++) fx.add({ x: p.x, y: p.y, vx: rnd(-120, 120), vy: rnd(-120, 120), drag: 4, kind: 'spark', size: 5, life: 0.3, col: [190, 255, 140] }); }));
      await sleep(60);
    }
    await hits[1];
    fx.shake();
  },

  async sonic(fx, from, to) {
    const dx = to.x - from.x, dy = to.y - from.y, an = Math.atan2(dy, dx);
    const waves = [0, 1, 2, 3].map(i => new Promise(res => setTimeout(() => fx.obj({ draw: (c, t) => {
      const k = Math.min(1, t / 0.35);
      const x = lerp(from.x, to.x, k), y = lerp(from.y, to.y, k), r = 14 + 40 * k;
      c.save(); c.globalCompositeOperation = 'lighter'; c.translate(x, y); c.rotate(an);
      c.strokeStyle = `rgba(225,200,255,${1 - k * 0.5})`; c.lineWidth = 7; c.shadowColor = '#b48cff'; c.shadowBlur = 10;
      c.beginPath(); c.arc(-r * 0.6, 0, r, -0.9, 0.9); c.stroke(); c.restore();
      if (k >= 1) { res(); return false; }
    } }), i * 90)));
    await waves[1];
    fx.add({ x: to.x, y: to.y, kind: 'ring', size: 10, size2: 70, life: 0.35, col: [200, 170, 255], lw: 6 });
    fx.shake();
  },

  async growl(fx, from, to) { await EFFECTS.sonic(fx, from, to); down(fx, to); },

  async tickle(fx, from, to) {
    fx.obj({ draw: (c, t) => {
      if (t > 0.8) return false;
      for (let i = 0; i < 8; i++) {
        const an = t * 9 + i * Math.PI / 4, r = 55 - t * 25;
        drawPart(c, { x: to.x + Math.cos(an) * r, y: to.y + Math.sin(an) * r * 0.6 - t * 30, kind: 'star', size: 15, size2: 15, col: i % 2 ? [255, 220, 90] : [255, 140, 210], alpha: 1, blend: 'source-over', rot: t * 4 }, t / 0.8 * 0.6);
      }
    } });
    for (let i = 0; i < 3; i++) fx.add({ x: to.x + rnd(-40, 40), y: to.y - 20, vy: -60, vx: rnd(-20, 20), kind: 'text', text: '♪', size: 32, life: 0.9, col: [240, 100, 180], blend: 'source-over' });
    await sleep(450);
    down(fx, to);
  },

  async charm(fx, from, to) {
    for (let i = 0; i < 7; i++) fx.add({ x: to.x + rnd(-50, 50), y: to.y + rnd(-10, 30), vx: rnd(-20, 20), vy: rnd(-90, -50), kind: 'heart', size: rnd(14, 22), size2: 26, life: 0.9, col: [255, 110, 160] });
    await sleep(400);
    down(fx, to);
  },

  async aura(fx, from, to) {
    const at = from; // 자기 자신
    fx.add({ x: at.x, y: at.y, kind: 'soft', size: at.w * 0.3, size2: at.w * 0.55, life: 0.7, col: [255, 170, 60], alpha: 0.45 });
    fx.add({ x: at.x, y: at.y + at.h * 0.45, kind: 'ring', size: 20, size2: at.w * 0.5, squash: 0.25, life: 0.5, col: [255, 190, 80], lw: 5 });
    for (let i = 0; i < 26; i++) {
      const an = rnd(0, 7);
      fx.add({ x: at.x + Math.cos(an) * at.w * rnd(0.25, 0.42), y: at.y + Math.sin(an) * at.h * 0.4, vy: rnd(-150, -80), kind: 'star', size: rnd(6, 11), size2: 2, life: rnd(0.5, 0.8), col: i % 3 ? [255, 190, 70] : [255, 245, 170] });
    }
    for (let i = 0; i < 3; i++) fx.add({ x: at.x + (i - 1) * 42, y: at.y - at.h * 0.1, vy: -90, kind: 'text', text: '▲', size: 28, life: 0.8, col: [255, 130, 20], blend: 'source-over' });
    await sleep(350);
  },

  async heal(fx, from, to) {
    const at = from;
    fx.add({ x: at.x, y: at.y, kind: 'soft', size: at.w * 0.35, size2: at.w * 0.55, life: 0.7, col: [120, 255, 140], alpha: 0.35 });
    for (let i = 0; i < 18; i++) fx.add({ x: at.x + rnd(-at.w * 0.4, at.w * 0.4), y: at.y + rnd(0, at.h * 0.4), vy: rnd(-140, -70), kind: i % 3 ? 'star' : 'text', text: '+', size: i % 3 ? rnd(7, 12) : 30, life: rnd(0.6, 0.9), col: [110, 230, 120], blend: i % 3 ? 'lighter' : 'source-over' });
    await sleep(350);
  },

  async spore(fx, from, to) {
    for (let i = 0; i < 36; i++) {
      const s = { x: from.x + rnd(-25, 25), y: from.y + rnd(-25, 10) };
      setTimeout(() => {
        const dur = rnd(0.45, 0.6), e = { x: to.x + rnd(-40, 40), y: to.y + rnd(-40, 30) };
        fx.obj({ draw: (c, t) => {
          const k = Math.min(1, t / dur), p = arcPath(s, e, 30, k);
          drawPart(c, { x: p.x + Math.sin(t * 20 + i) * 6, y: p.y, kind: 'glow', size: 12, size2: 12, col: i % 2 ? [190, 120, 255] : [170, 230, 120], alpha: 1, blend: 'lighter', rot: 0 }, 0);
          if (k >= 1) return false;
        } });
      }, i * 12);
    }
    await sleep(520);
    for (let i = 0; i < 6; i++) fx.add({ x: to.x + rnd(-30, 30), y: to.y + rnd(-20, 20), vy: -20, kind: 'soft', blend: 'source-over', size: 20, size2: 45, life: 0.8, col: [170, 130, 220], alpha: 0.6 });
    fx.shake();
  },

  async slime(fx, from, to) {
    const hits = [];
    for (let i = 0; i < 3; i++) {
      hits.push(projectile(fx, { x: from.x, y: from.y }, { x: to.x + rnd(-25, 25), y: to.y + rnd(-20, 20) }, {
        dur: 0.38, lift: 70,
        head: (c, p) => { drawPart(c, { x: p.x, y: p.y, kind: 'dot', size: 15, size2: 15, col: [110, 210, 80], alpha: 1, blend: 'source-over', rot: 0 }, 0);
          drawPart(c, { x: p.x - 5, y: p.y - 5, kind: 'dot', size: 5, size2: 5, col: [230, 255, 220], alpha: 0.9, blend: 'source-over', rot: 0 }, 0); },
      }).then(p => { for (let j = 0; j < 8; j++) fx.add({ x: p.x, y: p.y, vx: rnd(-150, 150), vy: rnd(-200, -40), ay: 700, kind: 'dot', blend: 'source-over', size: rnd(3, 7), size2: 2, life: 0.5, col: [100, 210, 80] }); }));
      await sleep(80);
    }
    await hits[0];
    fx.shake();
  },
};

function down(fx, at) {
  for (let i = 0; i < 3; i++) fx.add({ x: at.x + (i - 1) * 38, y: at.y - 50, vy: 80, kind: 'text', text: '▼', size: 26, life: 0.7, col: [140, 90, 230], blend: 'source-over' });
}

// 효과를 틀고, 맞는 순간에 끝난다. 화면이 꺼져 그림이 멈춰도 1.5초 뒤엔 전투가 이어진다
export function play(fx, name, from, to) {
  const f = EFFECTS[name] || EFFECTS.tackle;
  return Promise.race([f(fx, from, to).catch(() => {}), sleep(1500)]);
}

// 예전 저장 파일처럼 fx가 없는 기술은 이름으로 짐작한다
export function guessFx(s) {
  if (s.fx) return s.fx;
  if (s.type === 'heal') return 'heal';
  if (s.type === 'buff') return 'aura';
  if (s.type === 'debuff') return 'tickle';
  const n = s.name || '';
  if (/숨결|화염|불바다/.test(n)) return 'flamethrower';
  if (/불|화|열/.test(n)) return 'ember';
  if (/물기|이빨|송곳|깨물/.test(n)) return 'bite';
  if (/할퀴|발톱|베기|손톱/.test(n)) return 'slash';
  if (/바위|돌|흙/.test(n)) return 'rock';
  if (/주먹|펀치/.test(n)) return 'punch';
  return 'tackle';
}
