import { createPlayer, loadMeta, paletteFor, cssRgb } from './players.js';
import { HERO, TASKS, GALLERY, BENCH } from './manifest.js';

const $ = (s, r = document) => r.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  el.append(...kids);
  return el;
};

// ---------------------------------------------------------------- visibility-driven playback

const live = new Map(); // stage element -> player
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const p = live.get(e.target);
    if (p) e.isIntersecting ? p.play() : p.pause();
  }
}, { threshold: 0.25 });

// Create the player only when the stage gets near the viewport (keeps first load light).
const lazy = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    lazy.unobserve(e.target);
    e.target._mount?.();
  }
}, { rootMargin: '400px 0px' });

async function mount(stage, item, opts = {}) {
  const p = await createPlayer(stage, item.src, { poster: item.poster, ...item.opts, ...opts });
  live.set(stage, p);
  io.observe(stage);
  return p;
}

// ---------------------------------------------------------------- hero

async function initHero() {
  const stage = $('#hero-player');
  const wipe = $('#hero-wipe');
  $('#hero-caption').textContent = HERO.caption;
  const p = await mount(stage, HERO, { split: 0.5 });
  let split = 0.5;
  const flip = !!HERO.opts?.flip; // model view on the left of the handle
  if (flip) {
    const [l, r] = [$('.hero-stage .tag-l'), $('.hero-stage .tag-r')];
    [l.textContent, r.textContent] = [r.textContent, l.textContent];
  }
  new ResizeObserver(() => stage.parentElement.style.setProperty('--stage-h', `${stage.offsetHeight}px`)).observe(stage);
  const set = (s) => {
    split = Math.max(0, Math.min(1, s));
    wipe.style.left = `${split * 100}%`;
    wipe.setAttribute('aria-valuenow', Math.round(split * 100));
    p.setSplit?.(split);
  };
  const fromEvent = (e) => {
    const r = stage.getBoundingClientRect();
    return (e.clientX - r.left) / r.width;
  };
  let drag = false;
  wipe.addEventListener('pointerdown', (e) => { drag = true; wipe.setPointerCapture(e.pointerId); });
  wipe.addEventListener('pointermove', (e) => drag && set(fromEvent(e)));
  wipe.addEventListener('pointerup', () => (drag = false));
  wipe.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') set(split - 0.05);
    if (e.key === 'ArrowRight') set(split + 0.05);
  });
  stage.addEventListener('click', (e) => set(fromEvent(e)));
  // Hover readout: which class is under the cursor.
  const out = $('#hero-class');
  stage.parentElement.addEventListener('pointermove', (e) => {
    if (drag || !p.classAt) return;
    const r = stage.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const id = (flip ? fx < split : fx > split) ? p.classAt(fx, (e.clientY - r.top) / r.height) : -1;
    out.textContent = id >= 0 ? p.classes[id].name : '';
  });
  stage.parentElement.addEventListener('pointerleave', () => (out.textContent = ''));
}

// ---------------------------------------------------------------- task tabs

// Two persistent players: one semantic, one instance player whose sidecar is swapped per tab
// (detect / segment / keypoints share one clip). Switching never reloads a video.
function initTasks() {
  const tabs = $('#task-tabs');
  const view = $('.task-view');
  const cap = $('#task-caption');
  const stages = { sem: $('#task-player'), inst: h('div', { class: 'stage', hidden: '' }) };
  stages.sem.after(stages.inst);
  const players = {};
  let cur = 0;
  const kindOf = (t) => (t.opts?.mediaSrc ? 'inst' : 'sem');
  const mountAll = async () => {
    const metas = await Promise.all(TASKS.map((t) => loadMeta(t.src))); // warm the cache up front
    const first = TASKS.findIndex((t) => kindOf(t) === 'inst');
    players.sem = await mount(stages.sem, TASKS.find((t) => kindOf(t) === 'sem'));
    players.inst = await mount(stages.inst, TASKS[first]);
    players.metas = metas;
    select(cur);
  };
  const select = (i) => {
    const t = TASKS[i], k = kindOf(t);
    cur = i;
    [...tabs.children].forEach((b, j) => b.setAttribute('aria-selected', String(i === j)));
    cap.textContent = t.caption;
    if (!players.sem) return;
    const other = k === 'sem' ? 'inst' : 'sem';
    stages[other].hidden = true;
    players[other].pause();
    stages[k].hidden = false;
    const p = players[k];
    if (k === 'inst') p.setData(players.metas[i], { labels: t.opts.labels });
    // restart: the close-up pedestrian is in the first seconds
    p.ready.then(() => { p.media.currentTime = 0; p.resize(); p.play(); });
  };
  tabs.replaceChildren(); // drop the static copy written by tools/prerender.mjs
  TASKS.forEach((t, i) => tabs.append(h('button', { class: 'tab', role: 'tab', onclick: () => select(i) },
    h('span', { class: 'tab-name' }, t.label), h('span', { class: 'tab-term' }, t.term))));
  [...tabs.children].forEach((b, j) => b.setAttribute('aria-selected', String(j === 0)));
  cap.textContent = TASKS[0].caption;
  view.querySelector('.stage')._mount = mountAll;
  lazy.observe(stages.sem);
}

// ---------------------------------------------------------------- gallery + lightbox

function initGallery() {
  const grid = $('#gallery');
  grid.replaceChildren(); // static copy from tools/prerender.mjs; rebuilt below with players attached
  for (const item of GALLERY) {
    const stage = h('div', { class: 'stage' });
    const card = h('div', { class: 'card' + (item.wide ? ' span-2' : ''), role: 'button', tabindex: 0,
      'aria-label': `Open ${item.title}`, onclick: (e) => !wasDrag(e) && openLightbox(item),
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(item); } } },
      h('div', { class: 'card-media' }, stage),
      h('div', { class: 'card-body' },
        h('span', { class: 'card-kicker' }, item.kicker),
        h('h3', {}, item.title),
        h('p', {}, item.caption)));
    grid.append(card);
    stage._mount = async () => {
      const p = await mount(stage, item, { labels: item.opts?.labels ?? false });
      // cards crop to a uniform 16:9 frame (cover); the lightbox shows the full frame
      const ar = p.meta.w / p.meta.h, card = 16 / 9;
      stage.classList.add('cover');
      if (ar > card) Object.assign(stage.style, { height: '100%', width: `${(ar / card) * 100}%` });
      else Object.assign(stage.style, { width: '100%', height: `${(card / ar) * 100}%` });
      p.resize();
    };
    lazy.observe(stage);
  }
}

// A click that ends a text selection (press, drag, release) should not open or close anything.
let down = null;
addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY, t: e.target }), true);
const wasDrag = (e) => !!down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4 && !!getSelection()?.toString();

// Focus rings only for keyboard users. Safari draws :focus-visible on programmatic focus too,
// so opening the lightbox ringed the close button and closing it ringed the card it came from.
const setInput = (mode) => { if (document.documentElement.dataset.input !== mode) document.documentElement.dataset.input = mode; };
addEventListener('pointerdown', () => setInput('mouse'), true);
addEventListener('keydown', (e) => { if (e.key === 'Tab') setInput('keyboard'); }, true);

const lb = $('#lightbox');
let lbPlayer = null;
async function openLightbox(item) {
  for (const p of live.values()) p.pause();
  lb.showModal();
  document.body.style.overflow = 'hidden';
  $('#lb-title').textContent = item.title;
  $('#lb-caption').textContent = item.caption;
  $('#lb-meta').textContent = item.meta || '';
  const views = $('#lb-views');
  views.innerHTML = '';
  if (item.views) {
    item.views.forEach((v, i) => views.append(h('button', { class: 'tab', role: 'tab', 'aria-selected': String(i === 0),
      onclick: async () => {
        [...views.children].forEach((b, j) => b.setAttribute('aria-selected', String(i === j)));
        const op = lbPlayer.opacity, labels = lbPlayer.labels;
        window.removeEventListener('resize', lbPlayer._fit);
        lbPlayer.destroy();
        await showInLightbox({ ...item, src: v.src }, { opacity: op, labels });
      } }, v.label)));
  }
  await showInLightbox(item, { labels: true });
}
async function showInLightbox(item, extra) {
  const stage = $('#lb-player');
  stage.removeAttribute('style');
  lbPlayer = await createPlayer(stage, item.src, { ...item.opts, ...extra });
  const meta = lbPlayer.meta;
  const fit = () => {
    const box = stage.parentElement.getBoundingClientRect();
    const maxH = window.innerHeight - 96;
    const w = Math.min(box.width, (maxH * meta.w) / meta.h);
    stage.style.width = `${w}px`;
  };
  fit();
  lbPlayer._fit = fit;
  window.addEventListener('resize', fit);
  // Simple pause / play: click the frame or press Space (stills have nothing to toggle).
  const still = lbPlayer.still;
  stage.style.cursor = still ? '' : 'pointer';
  $('#lb-paused').hidden = true;
  if (!still) {
    lbPlayer.media.addEventListener('pause', () => ($('#lb-paused').hidden = false));
    lbPlayer.media.addEventListener('play', () => ($('#lb-paused').hidden = true));
  }
  lbPlayer.play();
  const opacity = $('#lb-opacity');
  opacity.value = lbPlayer.opacity;
  opacity.oninput = () => lbPlayer.setOpacity(+opacity.value);
  const sem = meta.kind === 'semantic';
  $('#lb-labels-wrap').style.display = sem ? 'none' : '';
  $('#lb-labels').checked = lbPlayer.labels !== false;
  $('#lb-labels').onchange = (e) => { lbPlayer.labels = e.target.checked; lbPlayer.draw(); };
  const legend = $('#lb-legend');
  legend.innerHTML = '';
  const ids = sem ? lbPlayer.classes.map((_, i) => i) : meta.task === 'kpts' ? [] : lbPlayer.present();
  $('#lb-hint').textContent = [ids.length > 1 && 'Hover a class to isolate it, click to hide it.',
    !still && 'Click the video or press Space to pause.'].filter(Boolean).join(' ');
  if (ids.length > 1) {
    ids.forEach((i) => {
      const c = lbPlayer.classes[i];
      if (c.bg) return;
      const chip = h('button', { class: 'chip' }, h('i', { style: `background:${cssRgb(c.rgb)}` }), c.name.replace(/[_-]/g, ' '));
      chip.addEventListener('mouseenter', () => lbPlayer?.highlight(i));
      chip.addEventListener('mouseleave', () => lbPlayer?.highlight(-1));
      chip.addEventListener('click', () => { lbPlayer.toggle(i); chip.classList.toggle('off'); });
      legend.append(chip);
    });
  }
}
function lbToggle() {
  if (!lbPlayer || lbPlayer.still) return;
  if (lbPlayer.media.paused) lbPlayer.play(); else lbPlayer.pause();
}
$('#lb-player').addEventListener('click', (e) => !wasDrag(e) && lbToggle());
// Space toggles unless a control that Space activates has keyboard focus.
lb.addEventListener('keydown', (e) => {
  if (e.key !== ' ' || e.target.closest('button, a, input[type="checkbox"]')) return;
  e.preventDefault();
  lbToggle();
});
// After a mouse click on a side control, give focus back to the video so Space keeps toggling it.
lb.addEventListener('click', (e) => {
  if (document.documentElement.dataset.input === 'mouse' && e.target.closest('.lb-side button, .lb-side input')) $('#lb-player').focus({ preventScroll: true });
});
function closeLightbox() {
  if (lbPlayer) { window.removeEventListener('resize', lbPlayer._fit); lbPlayer.destroy(); lbPlayer = null; }
  document.body.style.overflow = '';
  if (lb.open) lb.close();
  for (const [el, p] of live) {
    const r = el.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) p.play();
  }
}
$('.lb-close').addEventListener('click', closeLightbox);
const isBackdrop = (el) => el === lb || el?.classList?.contains('lb-inner');
lb.addEventListener('click', (e) => { if (isBackdrop(down?.t) && isBackdrop(e.target)) closeLightbox(); });
lb.addEventListener('cancel', (e) => { e.preventDefault(); closeLightbox(); });

// ---------------------------------------------------------------- chart

function initChart() {
  const el = $('#chart');
  const tip = h('div', { class: 'tip' });
  let shownW = 0;
  const render = () => {
    const cw = el.clientWidth;
    if (!cw || Math.abs(cw - shownW) < 2) return;
    shownW = cw;
    el.querySelector('svg')?.remove();
    el.append(drawChart(cw, el, tip));
  };
  el.append(tip);
  new ResizeObserver(render).observe(el);
  render();
}

// Desktop keeps the fixed 1000-wide viewBox; on phones the SVG is drawn at its real pixel width
// so text stays readable instead of being scaled down to a few pixels.
function drawChart(cw, el, tip) {
  const narrow = cw < 640;
  const W = narrow ? cw : 1000, H = narrow ? Math.round(cw * 0.95) : 440;
  const m = narrow ? { l: 34, r: 8, t: 22, b: 40 } : { l: 52, r: 120, t: 16, b: 44 };
  const fs = narrow ? 11 : 12, fl = narrow ? 11 : 13;
  const xMin = 3.5, xMax = 110, yMin = 74, yMax = 86;
  const x = (v) => m.l + ((Math.log(v) - Math.log(xMin)) / (Math.log(xMax) - Math.log(xMin))) * (W - m.l - m.r);
  const y = (v) => H - m.b - ((v - yMin) / (yMax - yMin)) * (H - m.t - m.b);
  const NS = 'http://www.w3.org/2000/svg';
  const s = (tag, a) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Scatter plot of Cityscapes mIoU versus end-to-end latency for 28 models' });
  for (const t of [76, 78, 80, 82, 84, 86]) {
    svg.append(s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: '#27272a' }));
    const lab = s('text', { x: m.l - (narrow ? 6 : 10), y: y(t) + 4, 'text-anchor': 'end', fill: '#71717a', 'font-size': fs });
    lab.textContent = t;
    svg.append(lab);
  }
  for (const t of [4, 8, 16, 32, 64]) {
    const lab = s('text', { x: x(t), y: H - m.b + 20, 'text-anchor': 'middle', fill: '#71717a', 'font-size': fs });
    lab.textContent = `${t} ms`;
    svg.append(lab);
  }
  const xl = s('text', { x: (m.l + W - m.r) / 2, y: H - 4, 'text-anchor': 'middle', fill: '#a1a1aa', 'font-size': fl });
  xl.textContent = narrow ? 'Latency per frame (log scale)' : 'End-to-end latency per frame (log scale, lower is better)';
  const yl = s('text', { x: 14, y: m.t + 4, fill: '#a1a1aa', 'font-size': fl, transform: `rotate(-90 14 ${m.t + 4})`, 'text-anchor': 'end' });
  yl.textContent = 'mIoU';
  if (narrow) { yl.setAttribute('transform', ''); yl.setAttribute('x', m.l); yl.setAttribute('y', 10); yl.setAttribute('text-anchor', 'end'); }
  svg.append(xl, yl);

  const fams = {};
  for (const r of BENCH) (fams[r[1]] ||= []).push(r);
  const order = Object.keys(fams).sort((a) => (a === 'D-FINE-seg' ? 1 : -1)); // ours drawn last (on top)
  const labels = [];
  for (const f of order) {
    const rows = fams[f].slice().sort((a, b) => a[3] - b[3]);
    const ours = f === 'D-FINE-seg';
    const col = ours ? '#3b82f6' : '#52525b';
    svg.append(s('polyline', { points: rows.map((r) => `${x(r[3])},${y(r[2])}`).join(' '), fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-linejoin': 'round', opacity: ours ? 1 : 0.9 }));
    const last = rows.reduce((a, b) => (b[2] > a[2] ? b : a));
    labels.push({ f, ours, px: x(last[3]), py: y(last[2]) });
    for (const r of rows) {
      const g = s('g', { tabindex: 0, style: 'cursor:default;outline:none' });
      g.append(s('circle', { cx: x(r[3]), cy: y(r[2]), r: 14, fill: 'transparent' }));
      g.append(s('circle', { cx: x(r[3]), cy: y(r[2]), r: ours ? (narrow ? 4.5 : 5.5) : (narrow ? 3.5 : 4.5), fill: col, stroke: '#18181b', 'stroke-width': narrow ? 1.5 : 2 }));
      const show = () => {
        tip.innerHTML = `<b>${r[0]}</b><br>${r[2].toFixed(1)} mIoU · ${r[3].toFixed(1)} ms · ${r[4]}M params`;
        const bb = el.getBoundingClientRect();
        tip.style.left = `${(x(r[3]) / W) * bb.width}px`;
        tip.style.top = `${(y(r[2]) / H) * bb.height}px`;
        tip.style.opacity = 1;
      };
      g.addEventListener('pointerenter', show);
      g.addEventListener('focus', show);
      g.addEventListener('pointerleave', () => (tip.style.opacity = 0));
      g.addEventListener('blur', () => (tip.style.opacity = 0));
      svg.append(g);
    }
  }
  // Family labels next to each family's best point; flip left at the right edge and step down
  // past any label already placed (YOLO26-sem and EfficientViT collide at phone width).
  const placed = [];
  for (const L of labels.sort((a, b) => a.py - b.py)) {
    const t = s('text', { fill: L.ours ? '#fafafa' : '#a1a1aa', 'font-size': fl, 'font-weight': L.ours ? 600 : 400 });
    t.textContent = L.f;
    svg.append(t);
    const w = t.getComputedTextLength() || L.f.length * fl * 0.6;
    const left = L.px + 10 + w > W - 2;
    const x0 = left ? L.px - 8 - w : L.px + (narrow && L.ours ? -w / 2 : 10);
    let by = L.py + (L.ours ? -10 : 4);
    const hit = () => placed.some((p) => x0 < p.x1 && x0 + w > p.x0 && by - fl < p.y1 && by > p.y0);
    while (hit()) by += fl + 2;
    placed.push({ x0, x1: x0 + w, y0: by - fl, y1: by });
    t.setAttribute('x', x0);
    t.setAttribute('y', by);
  }
  return svg;
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
  return legacyCopy(text);
}
function legacyCopy(text) {
  const ta = h('textarea', { readonly: '', style: 'position:fixed;top:0;left:0;opacity:0' });
  ta.value = text;
  document.body.append(ta);
  ta.select();
  ta.setSelectionRange(0, text.length); // iOS
  const ok = document.execCommand('copy');
  ta.remove();
  return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
}

function initCopy() {
  for (const b of document.querySelectorAll('.copy')) {
    const hint = $('.copy-hint', b);
    let timer;
    b.addEventListener('click', async () => {
      let ok = true;
      try { await copyText(b.dataset.copy); } catch { ok = false; }
      if (!ok) { // last resort: select the text so the user can press Cmd/Ctrl+C
        const r = document.createRange();
        r.selectNodeContents($('.mono', b));
        getSelection().removeAllRanges();
        getSelection().addRange(r);
      }
      b.classList.toggle('is-copied', ok);
      hint.textContent = ok ? 'copied ✓' : 'press ⌘C';
      clearTimeout(timer);
      timer = setTimeout(() => { b.classList.remove('is-copied'); hint.textContent = 'copy'; }, 1800);
    });
  }
}

async function initCredits() {
  const ul = $('#credits');
  ul.replaceChildren(); // static copy from tools/prerender.mjs
  const seen = new Set();
  for (const it of [HERO, ...TASKS, ...GALLERY]) {
    if (!it.credit || seen.has(it.credit)) continue;
    seen.add(it.credit);
    ul.append(h('li', {}, it.credit));
  }
}

initHero();
initTasks();
initGallery();
initChart();
initCopy();
initCredits();
