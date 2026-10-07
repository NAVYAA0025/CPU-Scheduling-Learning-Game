/* Disk Duel — visual layer: night sky, hopping owl buddies, train art, confetti. Offline, no libraries. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const rm = matchMedia('(prefers-reduced-motion: reduce)');
  const M = 'assets/mascot/';

  /* ---------- Big train (injected into every [data-train]) ---------- */
  const wheels = [[30,128,14],[78,128,14],[134,128,13],[160,128,13],[200,124,19],[258,124,19],[326,128,14]].map(([x,y,r]) =>
    `<g class="wh" style="transform-origin:${x}px ${y}px"><circle cx="${x}" cy="${y}" r="${r}" fill="#2b2a33" stroke="#f5c65d" stroke-width="3"/><path d="M${x-r+3} ${y}h${2*r-6}M${x} ${y-r+3}v${2*r-6}" stroke="#f5c65d" stroke-width="2.5"/></g>`).join('');
  const win = [16,48,80].map(x => `<rect x="${x}" y="68" width="22" height="24" rx="8" fill="#26306e"/><circle cx="${x+11}" cy="80" r="3" fill="#ffe39a"/>`).join('');
  const TRAIN = `<svg class="train-svg" viewBox="0 0 400 150" aria-hidden="true">
    <rect x="4" y="46" width="100" height="66" rx="16" fill="#f6ebdd"/><rect x="4" y="46" width="100" height="14" rx="7" fill="#e6a45e"/>${win}
    <rect x="102" y="96" width="18" height="6" fill="#3a2f55"/>
    <rect x="116" y="64" width="62" height="48" rx="12" fill="#8f5f42"/><path d="M124 66q8-18 18-8 8-10 18-2 8-6 14 10z" fill="#2b2a33"/>
    <rect x="172" y="30" width="64" height="82" rx="14" fill="#a6714f"/><rect x="164" y="18" width="80" height="16" rx="8" fill="#f5c65d"/><rect x="184" y="46" width="40" height="36" rx="12" fill="#26306e"/>
    <rect x="230" y="58" width="128" height="54" rx="26" fill="#719878"/><path d="M246 66q40-10 100 0" stroke="#fff" stroke-opacity=".35" stroke-width="5" fill="none" stroke-linecap="round"/>
    <rect x="262" y="58" width="10" height="54" fill="#f5c65d"/><rect x="312" y="58" width="10" height="54" fill="#f5c65d"/>
    <path d="M324 60l-4-28h28l-4 28z" fill="#2b2a33"/><rect x="314" y="24" width="42" height="10" rx="5" fill="#f5c65d"/><ellipse cx="288" cy="58" rx="18" ry="13" fill="#f5c65d"/>
    <circle class="lamp" cx="358" cy="86" r="18" fill="#ffe9a8" opacity=".35"/><circle cx="358" cy="86" r="9" fill="#fff3c4"/>
    <path d="M356 112l36 16v4h-42z" fill="#f5c65d"/><rect x="2" y="106" width="380" height="10" rx="5" fill="#3a2f55"/>${wheels}</svg>`;
  document.querySelectorAll('[data-train]').forEach(e => { e.innerHTML = TRAIN; });

  /* ---------- Night sky: twinkling stars + shooting stars ---------- */
  const sky = $('#sky'), c = sky.getContext('2d');
  let W = 0, H = 0, stars = [], shot = null;
  function sizeSky() {
    const d = Math.min(devicePixelRatio || 1, 2);
    W = sky.width = Math.round(innerWidth * d); H = sky.height = Math.round(innerHeight * d);
    stars = Array.from({ length: Math.round(innerWidth * innerHeight / 4500) }, () => ({
      x: Math.random() * W, y: Math.random() * H * .88, r: (Math.random() * 1.3 + .4) * d,
      p: Math.random() * 6.28, s: Math.random() * 1.6 + .5, gold: Math.random() < .14 }));
  }
  function drawSky(t) {
    c.clearRect(0, 0, W, H);
    for (const s of stars) {
      c.globalAlpha = Math.max(.12, .5 + .5 * Math.sin(t / 650 * s.s + s.p));
      c.fillStyle = s.gold ? '#ffe39a' : '#fff'; c.beginPath(); c.arc(s.x, s.y, s.r, 0, 6.3); c.fill();
      if (s.gold && s.r > 1.1) { c.fillRect(s.x - s.r * 3, s.y - .4, s.r * 6, .8); c.fillRect(s.x - .4, s.y - s.r * 3, .8, s.r * 6); }
    }
    if (!rm.matches) {
      if (!shot && Math.random() < .0022) shot = { x: Math.random() * W * .8, y: Math.random() * H * .3, l: 1 };
      if (shot) {
        const g = c.createLinearGradient(shot.x, shot.y, shot.x - 120, shot.y - 60);
        g.addColorStop(0, `rgba(255,255,255,${shot.l})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.globalAlpha = 1; c.strokeStyle = g; c.lineWidth = 2.4; c.beginPath(); c.moveTo(shot.x, shot.y); c.lineTo(shot.x - 120, shot.y - 60); c.stroke();
        shot.x += 14; shot.y += 7; shot.l -= .02; if (shot.l <= 0) shot = null;
      }
      requestAnimationFrame(drawSky);
    }
    c.globalAlpha = 1;
  }
  sizeSky(); requestAnimationFrame(drawSky);

  /* ---------- Confetti + floating "+10" ---------- */
  const fx = $('#fx'), f = fx.getContext('2d'); let parts = [], running = false;
  function sizeFx() { fx.width = innerWidth; fx.height = innerHeight; }
  sizeFx();
  const cols = ['#f5c65d', '#e6a45e', '#78b7ff', '#8fd0a0', '#fff3d0', '#ef7b6c'];
  function tick() {
    f.clearRect(0, 0, fx.width, fx.height);
    parts = parts.filter(p => p.life > 0 && p.y < fx.height + 20);
    for (const p of parts) {
      p.vy += .32; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= .011;
      f.save(); f.globalAlpha = Math.min(1, p.life * 2); f.translate(p.x, p.y); f.rotate(p.rot); f.fillStyle = p.c; f.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); f.restore();
    }
    if (parts.length) requestAnimationFrame(tick); else { running = false; f.clearRect(0, 0, fx.width, fx.height); }
  }
  function burst(x, y, n = 40) {
    if (rm.matches) return;
    for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 11, vy: -Math.random() * 11 - 3, r: Math.random() * 4 + 3, c: cols[i % cols.length], rot: Math.random() * 6, vr: (Math.random() - .5) * .4, life: 1 });
    if (!running) { running = true; requestAnimationFrame(tick); }
  }
  function pop(text, x, y) {
    const s = document.createElement('span'); s.className = 'float'; s.textContent = text;
    s.style.left = x + 'px'; s.style.top = y + 'px'; document.body.append(s); setTimeout(() => s.remove(), 1100);
  }

  /* ---------- Fixed owl buddy ---------- */
  const buddy = $('#buddy'), bimg = $('#buddy-img'), bub = $('#buddy-bubble');
  const sprite = { teach: 'teach', read: 'read', wink: 'wink', confused: 'confused', cheer: 'cheer', laptop: 'laptop', board: 'board', hint: 'face-hint', smug: 'face-smug', happy: 'face-happy' };
  let hold = 0, bubTimer = 0;
  function say(pose, text, ms = 4200) {
    const src = M + sprite[pose] + '.png';
    if (pose && bimg.getAttribute('src') !== src) { bimg.classList.remove('pop'); void bimg.offsetWidth; bimg.src = src; bimg.classList.add('pop'); }
    if (text) { bub.textContent = text; bub.classList.add('on'); clearTimeout(bubTimer); bubTimer = setTimeout(() => bub.classList.remove('on'), ms); }
    hold = Date.now() + ms;
  }
  function put(el, corner) {
    const w = el.offsetWidth, h = el.offsetHeight, m = 12;
    const x = corner[1] === 'r' ? innerWidth - w - m : m;
    const y = corner[0] === 'b' ? innerHeight - h - m : 84;
    el.style.setProperty('--x', x + 'px'); el.style.setProperty('--y', y + 'px');
    el.dataset.h = corner[1]; el.dataset.v = corner[0];
  }
  function layout(name = currentView) {
    const corner = name === 'lesson' || name === 'quiz' ? 'br' : name === 'journey' || name === 'notes' ? 'bl' : null;
    buddy.classList.toggle('hidden', !corner);
    if (corner) put(buddy, corner);
  }
  const lines = { journey: ['teach', 'Pick a stop and hop aboard!'], lesson: ['read', 'Let’s read up first.'], quiz: ['teach', 'You’ve got this!'], lab: ['laptop', 'Build a workload, then run it.'], notes: ['board', 'Here are the five rules.'] };
  const view = name => { currentView = name; layout(name); const l = lines[name]; if (l) say(l[0], l[1]); };

  /* Lesson: reading owl for the lecture, teaching owl for the explanation */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting || !$('#view-lesson').classList.contains('active')) return;
      e.target.classList.contains('video-panel') ? say('read', 'Lecture time!') : say('teach', 'Here’s how it works.');
    }), { threshold: .6 });
    document.querySelectorAll('.video-panel,.memory-panel').forEach(p => io.observe(p));
  }

  const preload = () => Promise.all([document.fonts ? document.fonts.ready : 0, ...Object.values(sprite).map(n =>
    new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = M + n + '.png'; }))]);

  let currentView = 'journey';
  addEventListener('resize', () => { sizeSky(); sizeFx(); layout(currentView); if (rm.matches) drawSky(0); });
  addEventListener('load', () => { layout(currentView); setTimeout(() => buddy.classList.add('ready'), 60); });
  window.Owl = { say, view, layout, burst, pop, preload };
})();
