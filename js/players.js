// Client-side renderers for D-FINE-seg exports (see scripts/showcase_lib.py for the formats).
// SemPlayer: WebGL2 recolors a class-id map (packed under the RGB frame in one video).
// InstPlayer: 2D canvas draws the video frame plus boxes / polygons / skeletons from a JSON sidecar
// in one pass, so the overlay can never be a frame behind the picture (the <video> itself stays hidden).

const ACCENT = [59, 130, 246];

// Muted, hand-tuned palettes keyed by class name. Unknown names fall back to a generated muted hue.
const NAMED = {
  road: '#5b5f97', sidewalk: '#9c7ca5', building: '#6b6f78', wall: '#8a8478', fence: '#a39a86',
  pole: '#c9c3a8', 'traffic light': '#e0b45c', 'traffic-light': '#e0b45c', traffic_light: '#e0b45c',
  'traffic sign': '#d9cf6a', 'traffic-sign': '#d9cf6a', traffic_sign: '#d9cf6a',
  vegetation: '#6f9a6a', terrain: '#a3b07a', sky: '#6e93b5', person: '#e07a6a', rider: '#e8a07a',
  car: '#3b82f6', truck: '#4f6fd6', bus: '#6a8ff0', train: '#7d9bd8', motorcycle: '#c46ab0',
  bicycle: '#b07cc6', iron: '#3fb4a6', big_rock: '#e0b45c', trash: '#f43f5e',
  // common COCO things in the instance clips
  handbag: '#5fb3a8', backpack: '#8fbf5a', suitcase: '#a3b07a', umbrella: '#c9a0dc', bear: '#c98b5a',
  // GOOSE categories (terrain there = all drivable ground; road = curbs, sidewalks, markings, rails)
  construction: '#8a8478', vehicle: '#3b82f6', object: '#d6cfae', sign: '#e0b45c', human: '#e07a6a',
  water: '#3fb4c9', animal: '#c46ab0',
};
const SUBTLE = { iron: 0.36 }; // bulk material: lighter than the anomalies so they still pop
const TRANSPARENT = new Set(['background', 'unlabeled', 'unlabelled', 'void', 'other', 'ignore']);

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}
// Many-class datasets (Coralscapes: 39) get grouped hues by meaning instead of a rainbow:
// one hue family per group, lightness varied inside the group.
const GROUPS = [
  [/bleached/, 48, 0.25, 0.82],
  [/dead/, 28, 0.3, 0.42],
  [/alive|millepora|turbinaria|sponge|anemone/, 140, 0.32, 0.5],
  [/fish|urchin|cucumber|crown of thorn|clam|other animal/, 30, 0.75, 0.6],
  [/human|transect/, 217, 0.9, 0.6],
  [/sand|rubble|substrate|seagrass|algae/, 45, 0.18, 0.55],
  [/trash/, 6, 0.65, 0.62],
];
function groupColor(key, i) {
  for (const [re, hue, s, l] of GROUPS) {
    if (re.test(key)) return hslToRgb(hue + ((i * 23) % 30) - 15, s, l + (((i * 7) % 5) - 2) * 0.04);
  }
  return null;
}
TRANSPARENT.add('dark');

export function paletteFor(names, override = {}) {
  return names.map((n, i) => {
    const key = n.toLowerCase();
    if (override[key]) return { name: n, rgb: hexToRgb(override[key]), on: true };
    if (TRANSPARENT.has(key)) return { name: n, rgb: [0, 0, 0], on: false, bg: true };
    if (NAMED[key]) return { name: n, rgb: hexToRgb(NAMED[key]), on: true, a: SUBTLE[key] };
    const g = groupColor(key, i);
    if (g) return { name: n, rgb: g, on: true };
    return { name: n, rgb: hslToRgb((i * 137.508) % 360, 0.38, 0.6), on: true };
  });
}
export const cssRgb = (rgb) => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;

const cache = new Map();
export function loadMeta(base) {
  if (!cache.has(base)) cache.set(base, fetch(base + '.json').then((r) => r.json()));
  return cache.get(base);
}

// ---------------------------------------------------------------- shared shell

class BasePlayer {
  constructor(el, base, meta, opts) {
    this.el = el;
    this.base = base;
    this.meta = meta;
    this.opts = opts;
    this.opacity = opts.opacity ?? 1;
    this.still = meta.n_frames === 1;
    el.style.aspectRatio = `${meta.w} / ${meta.h}`;
    el.classList.add('player', meta.kind === 'semantic' ? 'is-sem' : 'is-inst');
    if (opts.poster) el.style.backgroundImage = `url(${base}.poster.jpg)`;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'player-canvas';
    el.appendChild(this.canvas);
    this.media = this.still ? new Image() : document.createElement('video');
    if (!this.still) {
      Object.assign(this.media, { muted: true, loop: true, playsInline: true, preload: 'auto' });
      this.media.setAttribute('muted', '');
      this.media.setAttribute('playsinline', '');
    }
    this.media.crossOrigin = 'anonymous';
    this.media.className = 'player-media';
    el.prepend(this.media);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    this.ready = new Promise((res) => {
      const ev = this.still ? 'load' : 'loadeddata';
      this.media.addEventListener(ev, () => { el.classList.add('is-ready'); res(); }, { once: true });
    });
  }
  resize() {
    const r = this.el.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.draw();
  }
  frameIndex(t) {
    return Math.max(0, Math.min(this.meta.n_frames - 1, Math.round(t * this.meta.fps)));
  }
  loop() {
    if (this.still) return;
    const v = this.media;
    if ('requestVideoFrameCallback' in v) {
      const cb = (_, m) => { this.t = m.mediaTime; this.draw(); this.vfc = v.requestVideoFrameCallback(cb); };
      this.vfc = v.requestVideoFrameCallback(cb);
    } else {
      const cb = () => { this.t = v.currentTime; this.draw(); this.raf = requestAnimationFrame(cb); };
      this.raf = requestAnimationFrame(cb);
    }
  }
  play() { if (!this.still) this.media.play().catch(() => {}); }
  pause() { if (!this.still) this.media.pause(); }
  setOpacity(o) { this.opacity = o; this.draw(); }
  destroy() {
    this.pause();
    this.ro.disconnect();
    if (this.vfc && this.media.cancelVideoFrameCallback) this.media.cancelVideoFrameCallback(this.vfc);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.media.removeAttribute('src');
    this.el.innerHTML = '';
  }
}

// ---------------------------------------------------------------- semantic

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = vec2(p.x*.5+.5, .5-p.y*.5); gl_Position = vec4(p,0,1); }`;
const FS = `#version 300 es
precision highp float; precision highp int;
in vec2 uv; out vec4 o;
uniform sampler2D col, ids, pal;
uniform bool packed, flip; uniform float stepv, opac, split; uniform int hi; uniform ivec2 size;
int idAt(ivec2 c){
  c = clamp(c, ivec2(0), size - 1);
  if (packed) c.y += size.y;
  float g = texelFetch(ids, c, 0).r * 255.0;
  return int(floor(g / stepv + 0.5));
}
void main(){
  vec3 rgb = texture(col, packed ? vec2(uv.x, uv.y * .5) : uv).rgb;
  if (flip ? uv.x > split : uv.x < split) { o = vec4(rgb, 1); return; }
  ivec2 c = ivec2(uv * vec2(size));
  int id = idAt(c);
  vec4 pc = texelFetch(pal, ivec2(id, 0), 0);
  bool edge = id != idAt(c + ivec2(1, 0)) || id != idAt(c + ivec2(0, 1));
  float a = pc.a * opac;
  if (hi >= 0) a = id == hi ? max(a, .75 * opac) : 0.0;
  vec3 dimmed = hi >= 0 && id != hi ? rgb * mix(1.0, .45, opac) : rgb;
  vec3 m = mix(dimmed, pc.rgb, a);
  if (edge && pc.a > 0.0 && (hi < 0 || id == hi)) m = mix(m, vec3(1), .35 * opac);
  o = vec4(m, 1);
}`;

export class SemPlayer extends BasePlayer {
  constructor(el, base, meta, opts = {}) {
    super(el, base, meta, opts);
    this.split = opts.split ?? 0;
    this.flip = !!opts.flip; // model view left of the split instead of right
    this.hi = -1;
    this.alpha = opts.alpha ?? 0.55;
    this.classes = paletteFor(meta.names, opts.palette);
    const gl = (this.gl = this.canvas.getContext('webgl2', { premultipliedAlpha: false, antialias: false }));
    if (!gl) { el.classList.add('no-webgl'); return; }
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
    const pr = (this.prog = gl.createProgram());
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    const mk = (unit, filter) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    this.tCol = mk(0, gl.LINEAR);
    this.tPal = mk(2, gl.NEAREST);
    this.tIds = meta.packed ? this.tCol : mk(1, gl.NEAREST);
    const u = (n) => gl.getUniformLocation(pr, n);
    this.u = { split: u('split'), opac: u('opac'), hi: u('hi') };
    gl.uniform1i(u('col'), 0);
    gl.uniform1i(u('ids'), meta.packed ? 0 : 1);
    gl.uniform1i(u('pal'), 2);
    gl.uniform1i(u('packed'), meta.packed ? 1 : 0);
    gl.uniform1i(u('flip'), this.flip ? 1 : 0);
    gl.uniform1f(u('stepv'), meta.step);
    gl.uniform2i(u('size'), meta.w, meta.h);
    this.uploadPalette();
    this.media.src = opts.mediaSrc || base + (this.still ? '.jpg' : '.mp4');
    if (this.still) {
      this.idImg = new Image();
      this.idImg.src = base + '.png';
      Promise.all([this.ready, this.idImg.decode()]).then(() => {
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tCol);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.media);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tIds);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.idImg);
        this.hasFrame = true;
        this.draw();
      });
    } else {
      this.ready.then(() => this.loop());
    }
  }
  uploadPalette() {
    const gl = this.gl;
    const d = new Uint8Array(256 * 4);
    this.classes.forEach((c, i) => {
      d.set(c.rgb, i * 4);
      d[i * 4 + 3] = c.on ? Math.round((c.a ?? this.alpha) * 255) : 0;
    });
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.tPal);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, d);
    this.draw();
  }
  draw() {
    const gl = this.gl;
    if (!gl) return;
    if (!this.still && this.media.readyState >= 2) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.tCol);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.media);
      this.hasFrame = true;
    }
    if (!this.hasFrame) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.u.split, this.split);
    gl.uniform1f(this.u.opac, this.opacity);
    gl.uniform1i(this.u.hi, this.hi);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  setSplit(s) { this.split = s; this.draw(); }
  highlight(i) { this.hi = i; this.draw(); }
  toggle(i) { this.classes[i].on = !this.classes[i].on; this.uploadPalette(); }
  // Class under a point (fractions of the frame), read from the id half / id image.
  classAt(fx, fy) {
    if (!this.hasFrame) return -1;
    const pc = (this._pc ||= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }));
    const ctx = (this._px ||= pc.getContext('2d', { willReadFrequently: true }));
    const x = Math.floor(fx * this.meta.w);
    const y = Math.floor(fy * this.meta.h);
    const src = this.still ? this.idImg : this.media;
    ctx.drawImage(src, x, y + (this.meta.packed ? this.meta.h : 0), 1, 1, 0, 0, 1, 1);
    const g = ctx.getImageData(0, 0, 1, 1).data[0];
    const id = Math.round(g / this.meta.step);
    return id < this.classes.length ? id : -1;
  }
}

// ---------------------------------------------------------------- instances

export class InstPlayer extends BasePlayer {
  constructor(el, base, meta, opts = {}) {
    super(el, base, meta, opts);
    this.ctx = this.canvas.getContext('2d');
    this.labels = opts.labels ?? true;
    this.minScore = opts.minScore ?? 0;
    this.setData(meta, opts);
    this.media.src = opts.mediaSrc || base + (this.still ? '.jpg' : '.mp4');
    this.ready.then(() => { this.draw(); this.loop(); });
    if (!this.still) {
      // Paused: snap the video onto the frame whose predictions are drawn (a paused element's currentTime
      // and last frame callback can disagree by one frame), then redraw from the settled position.
      this.media.addEventListener('pause', () => this.snap());
      this.media.addEventListener('seeked', () => { this.t = this.media.currentTime; this.draw(); });
    }
  }
  // Swap the prediction sidecar without touching the video (task tabs share one clip).
  setData(meta, opts = {}) {
    this.meta = meta;
    if ('labels' in opts) this.labels = opts.labels;
    this.showBoxes = opts.boxes ?? meta.task !== 'kpts';
    this.classes = paletteFor(meta.names);
    const hide = new Set(this.opts.hide || []); // e.g. known false positives in a clip
    this.classes.forEach((c) => hide.has(c.name) && (c.on = false));
    this.hi = -1;
    this.draw();
  }
  // Classes that actually appear in the clip, most frequent first.
  present() {
    const n = new Map();
    for (const f of this.meta.frames) for (const o of f) n.set(o.c, (n.get(o.c) || 0) + 1);
    return [...n.entries()].filter(([c]) => !(this.opts.hide || []).includes(this.meta.names[c]))
      .sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }
  highlight(i) { this.hi = i; this.draw(); }
  toggle(i) { this.classes[i].on = !this.classes[i].on; this.draw(); }
  snap() {
    if (this.t == null || this.media.seeking) return;
    // a quarter frame past the frame start: unambiguous for every browser, and frameIndex() rounds back to i
    this.media.currentTime = (this.frameIndex(this.t) + 0.25) / this.meta.fps;
  }
  draw() {
    const { ctx, canvas, meta } = this;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!this.el.classList.contains('is-ready')) return;
    if (this.media.readyState === undefined || this.media.readyState >= 2) ctx.drawImage(this.media, 0, 0, canvas.width, canvas.height);
    const all = meta.frames[this.still ? 0 : this.frameIndex(this.t ?? this.media.currentTime)] || [];
    const objs = all.filter((o) => o.s >= this.minScore && this.classes[o.c]?.on !== false);
    const s = canvas.width / meta.w;
    const dpr = canvas.width / this.el.clientWidth || 1;
    const op = this.opacity;
    if (op <= 0) return;
    ctx.save();
    ctx.lineJoin = 'round';
    for (const o of objs) {
      const a = op * (this.hi < 0 || o.c === this.hi ? 1 : 0.15);
      const rgb = meta.task === 'kpts' ? ACCENT : this.classes[o.c]?.rgb || ACCENT;
      const c = rgb.join(',');
      const light = rgb.map((v) => Math.round(v + (255 - v) * 0.55)).join(',');
      if (o.p) {
        ctx.beginPath();
        for (const poly of o.p) {
          ctx.moveTo(poly[0] * s, poly[1] * s);
          for (let i = 2; i < poly.length; i += 2) ctx.lineTo(poly[i] * s, poly[i + 1] * s);
          ctx.closePath();
        }
        ctx.fillStyle = `rgba(${c},${0.42 * a})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${light},${0.95 * a})`;
        ctx.lineWidth = 1.25 * dpr;
        ctx.stroke();
      }
      if (this.showBoxes && !o.p) {
        const [x1, y1, x2, y2] = o.b;
        ctx.strokeStyle = `rgba(${c},${a})`;
        ctx.lineWidth = 2 * dpr;
        ctx.strokeRect(x1 * s, y1 * s, (x2 - x1) * s, (y2 - y1) * s);
        ctx.fillStyle = `rgba(${c},${0.1 * a})`;
        ctx.fillRect(x1 * s, y1 * s, (x2 - x1) * s, (y2 - y1) * s);
      }
      if (o.k) this.drawSkeleton(o.k, s, dpr, a);
    }
    if (this.labels) this.drawLabels(objs, s, dpr, op);
    ctx.restore();
  }
  drawSkeleton(k, s, dpr, op) {
    const { ctx } = this;
    ctx.lineWidth = 2.5 * dpr;
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(255,255,255,${0.85 * op})`;
    ctx.beginPath();
    for (const [a, b] of this.meta.skeleton) {
      if (!k[a][2] || !k[b][2]) continue;
      ctx.moveTo(k[a][0] * s, k[a][1] * s);
      ctx.lineTo(k[b][0] * s, k[b][1] * s);
    }
    ctx.stroke();
    const rad = Math.max(2.5, 3.2 * dpr * Math.min(1.4, s * 1.2));
    for (const [x, y, v] of k) {
      if (!v) continue;
      ctx.beginPath();
      ctx.arc(x * s, y * s, rad, 0, Math.PI * 2);
      if (v === 2) {
        ctx.fillStyle = `rgba(${ACCENT.join(',')},${op})`;
        ctx.fill();
      }
      ctx.lineWidth = 1.5 * dpr;
      ctx.strokeStyle = `rgba(255,255,255,${op})`;
      ctx.stroke();
    }
  }
  drawLabels(objs, s, dpr, op) {
    const { ctx } = this;
    const fs = Math.round(11 * dpr);
    ctx.font = `500 ${fs}px Inter, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    const pad = 4 * dpr;
    const h = fs + pad * 1.4;
    for (const o of objs) {
      if (this.hi >= 0 && o.c !== this.hi) continue;
      const [x1, y1, x2] = o.b;
      const txt = this.meta.names[o.c];
      const w = ctx.measureText(txt).width + pad * 2;
      if ((x2 - x1) * s < Math.min(28 * dpr, w)) continue; // skip labels on tiny boxes (short names fit smaller ones)
      const x = x1 * s;
      const y = Math.max(0, y1 * s - h - 2 * dpr);
      const dark = (this.meta.task === 'kpts' ? ACCENT : this.classes[o.c].rgb).map((v) => Math.round(v * 0.45)).join(',');
      ctx.fillStyle = `rgba(${dark},${0.85 * op})`;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, w, h, 3 * dpr) : ctx.rect(x, y, w, h);
      ctx.fill();
      ctx.fillStyle = `rgba(250,250,250,${op})`;
      ctx.fillText(txt, x + pad, y + h / 2 + 0.5);
    }
  }
}

export async function createPlayer(el, base, opts = {}) {
  const meta = await loadMeta(base);
  return meta.kind === 'semantic' ? new SemPlayer(el, base, meta, opts) : new InstPlayer(el, base, meta, opts);
}
