/* engines.js — los tres motores de juego (clasificador, disparos y carrera) dibujados en <canvas>.
   Cada motor recibe el nivel y un objeto `ui` para mostrar la pregunta, el HUD y las explicaciones. */
(function () {
  "use strict";

  const W = 400, H = 460;
  const THINK = 5;   // segundos extra para pensar cada pregunta (pedido 2026-11-05)
  const C = {
    bg: "#0f0b13", grid: "rgba(99,212,230,0.06)", gridText: "rgba(99,212,230,0.16)",
    amber: "#ffb547", amberDeep: "#c97d14", cyan: "#63d4e6", fg: "#f3e9dc", muted: "#a99bb1",
    good: "#7ee08a", bad: "#ff6b6b", panel: "#221a29", line: "#3d3149", plum: "#b58cff"
  };
  const MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
  const sfx = (name, arg) => { if (window.SFX) window.SFX.play(name, arg); };
  const DISPLAY = '"Bungee", Impact, "Arial Black", sans-serif';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------- Entrada (teclado + botones táctiles) ---------------- */
  const Input = {
    held: { left: false, right: false, action: false },
    pressed: { left: false, right: false, action: false },
    set(k, down) {
      if (down && !this.held[k]) this.pressed[k] = true;
      this.held[k] = down;
    },
    consume(k) { const p = this.pressed[k]; this.pressed[k] = false; return p; },
    clear() { for (const k in this.held) { this.held[k] = false; this.pressed[k] = false; } }
  };
  const KEYMAP = {
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
    Space: "action", ArrowUp: "action", KeyW: "action", Enter: "action", ArrowDown: "action", KeyS: "action"
  };

  /* ---------------- Utilidades de dibujo ---------------- */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // Ajusta un texto a un ancho máximo: prueba una línea, luego dos, luego achica la fuente.
  function fitText(ctx, text, maxW, size, font) {
    font = font || MONO;
    for (let s = size; s >= 9; s--) {
      ctx.font = `700 ${s}px ${font}`;
      if (ctx.measureText(text).width <= maxW) return { lines: [text], size: s };
      const words = text.split(" ");
      if (words.length > 1) {
        let best = null;
        for (let i = 1; i < words.length; i++) {
          const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
          const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
          if (w <= maxW && (!best || w < best.w)) best = { w, lines: [a, b] };
        }
        if (best) return { lines: best.lines, size: s };
      }
    }
    return { lines: [text], size: 9 };
  }
  function drawLabel(ctx, text, cx, cy, maxW, size, color, font) {
    const f = fitText(ctx, text, maxW, size, font);
    ctx.font = `700 ${f.size}px ${font || MONO}`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lh = f.size * 1.15;
    const top = cy - (lh * (f.lines.length - 1)) / 2;
    f.lines.forEach((ln, i) => ctx.fillText(ln, cx, top + i * lh));
  }

  /* ---------------- Partículas y textos flotantes ---------------- */
  class FX {
    constructor() { this.parts = []; this.texts = []; this.shake = 0; this.flash = 0; this.flashColor = C.bad; }
    burst(x, y, color, n) {
      for (let i = 0; i < (n || 18); i++) {
        const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 180;
        this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.6 + Math.random() * 0.4, t: 0, color, size: 2 + Math.random() * 3 });
      }
    }
    text(x, y, s, color) { this.texts.push({ x, y, s, color, t: 0 }); }
    hit(color) { this.shake = 0.3; this.flash = 0.35; this.flashColor = color || C.bad; }
    update(dt) {
      for (const p of this.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; }
      this.parts = this.parts.filter(p => p.t < p.life);
      for (const t of this.texts) t.t += dt;
      this.texts = this.texts.filter(t => t.t < 1);
      this.shake = Math.max(0, this.shake - dt);
      this.flash = Math.max(0, this.flash - dt);
    }
    draw(ctx) {
      for (const p of this.parts) {
        ctx.globalAlpha = 1 - p.t / p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      for (const t of this.texts) {
        ctx.globalAlpha = 1 - t.t;
        ctx.font = `400 16px ${DISPLAY}`;
        ctx.fillStyle = t.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(t.s, t.x, t.y - t.t * 40);
      }
      ctx.globalAlpha = 1;
      if (this.flash > 0) {
        ctx.globalAlpha = this.flash * 0.5;
        ctx.fillStyle = this.flashColor;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    }
  }

  // Fondo: una grilla de celdas de memoria con direcciones tenues.
  function drawMemoryGrid(ctx, scroll) {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const cell = 40;
    const off = (scroll || 0) % cell;
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += cell) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (let y = -cell + off; y <= H; y += cell) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    ctx.font = `400 8px ${MONO}`;
    ctx.fillStyle = C.gridText;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const rowBase = Math.floor((scroll || 0) / cell);
    for (let r = -1; r < H / cell + 1; r++) {
      const y = r * cell + off;
      const addr = ((0x7f00 + (r - rowBase) * 0x40) & 0xffff).toString(16).padStart(4, "0");
      ctx.fillText("0x" + addr, 3, y + 3);
    }
  }

  /* =====================================================================
     Base común: puntaje, vidas, combo, retroalimentación
     ===================================================================== */
  class BaseGame {
    constructor(level, data, ui) {
      this.level = level;
      this.data = data;
      this.ui = ui;
      this.fx = new FX();
      this.score = 0;
      this.streak = 0;
      this.lives = 3;
      this.answered = 0;
      this.correct = 0;
      this.missed = [];
      this.done = false;
      this.blocking = false; // true mientras se muestra una explicación que espera "Continuar"
      this.time = 0;
    }
    get mult() { return Math.min(4, 1 + Math.floor(this.streak / 3)); }
    pushHud() {
      this.ui.hud({ score: this.score, mult: this.mult, lives: this.lives, progress: this.progress() });
    }
    progress() { return 0; }
    // Respuesta correcta: el juego queda en pausa mostrando la explicación hasta que el jugador presione OK.
    right(x, y, item, bonus, then) {
      this.answered++;
      this.correct++;
      this.streak++;
      const pts = Math.round((100 + (bonus || 0)) * this.mult);
      this.score += pts;
      sfx("right", this.streak);
      this.fx.burst(x, y, C.good, 22);
      this.fx.text(x, y - 10, "+" + pts, C.good);
      this.pushHud();
      this.blocking = true;
      Input.clear();
      this.ui.explain(pick(["¡Correcto!", "¡Bien!", "¡Exacto!", "¡Eso!"]) + ` +${pts}`, item.explain, () => {
        this.blocking = false;
        if (then) then();
      }, true);
    }
    wrong(x, y, item, title, then) {
      this.answered++;
      this.streak = 0;
      sfx("wrong");
      this.loseLife(x, y, true);
      this.missed.push({ ask: item.ask, code: item.code || "", answer: item.correctText || item.bin, explain: item.explain });
      this.blocking = true;
      Input.clear();
      this.ui.explain(title || "Incorrecto", `Respuesta: \`${item.correctText || item.bin}\`. ${item.explain}`, () => {
        this.blocking = false;
        if (this.lives <= 0) this.finish(false);
        else if (then) then();
      });
      this.pushHud();
    }
    // Pierde una vida sin pregunta asociada (choque con bug, bala del jefe...)
    loseLife(x, y, silent) {
      this.lives--;
      this.fx.hit(C.bad);
      this.fx.burst(x, y, C.bad, 26);
      if (!silent) {
        sfx("hit");
        this.streak = 0;
        this.pushHud();
        if (this.lives <= 0) {
          this.blocking = true;
          setTimeout(() => this.finish(false), 600);
        }
      }
    }
    finish(completed) {
      if (this.done) return;
      this.done = true;
      sfx(completed ? "win" : "lose");
      const total = Math.max(1, this.answered);
      const acc = this.correct / total;
      const stars = !completed ? 0 : acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
      if (completed) this.score += this.lives * 150;
      this.ui.finish({ completed, score: this.score, correct: this.correct, answered: this.answered, stars, missed: this.missed, lives: this.lives });
    }
    frame(ctx, dt) {
      if (!this.blocking && !this.done) {
        this.time += dt;
        this.update(dt);
      }
      this.fx.update(dt);
      ctx.save();
      if (this.fx.shake > 0) ctx.translate((Math.random() - 0.5) * 8 * this.fx.shake / 0.3, (Math.random() - 0.5) * 8 * this.fx.shake / 0.3);
      this.draw(ctx);
      this.fx.draw(ctx);
      ctx.restore();
    }
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* =====================================================================
     MOTOR 1 · CLASIFICADOR (Stack o Heap / Arquitecto de clases)
     ===================================================================== */
  const BIN_COLORS = { stack: C.amber, heap: C.cyan, ".h": C.amber, ".cpp": C.cyan, "main.cpp": C.plum, private: C.bad, public: C.good,
    compila: C.good, "no compila": C.bad, ok: C.good, fuga: C.amber, colgante: C.bad,
    pre: C.amber, comp: C.cyan, link: C.plum };
  const BIN_LABEL = { stack: "STACK", heap: "HEAP", ".h": "Bono.h", ".cpp": "Bono.cpp", "main.cpp": "main.cpp", private: "private:", public: "public:",
    compila: "COMPILA", "no compila": "NO COMPILA", ok: "SIN ERROR", fuga: "FUGA", colgante: "COLGANTE" };
  const HEAP_MAX = 4;

  class Sorter extends BaseGame {
    constructor(level, data, ui) {
      super(level, data, ui);
      this.phases = data.phases;
      this.phaseIdx = 0;
      this.itemIdx = 0;
      this.total = this.phases.reduce((s, p) => s + p.items.length, 0);
      this.heap = 0;
      this.useHeap = level.id === "memoria";
      this.stackPlates = 0;
      this.binFill = {};
      this.cur = null;
      this.wait = 0.4;
      this.startPhase();
    }
    get phase() { return this.phases[this.phaseIdx]; }
    progress() { return this.answered / this.total; }
    startPhase() {
      const ph = this.phase;
      this.bins = ph.bins;
      this.binFill = {};
      this.bins.forEach(b => { this.binFill[b] = 0; });
      this.col = Math.floor(this.bins.length / 2) - (this.bins.length % 2 ? 0 : 0.5);
      if (ph.title) this.fx.text(W / 2, H / 2 - 40, ph.title.split(" · ")[0], C.amber);
    }
    colX(i) { const w = W / this.bins.length; return w * i + w / 2; }
    spawn() {
      const it = this.phase.items[this.itemIdx];
      const n = this.bins.length;
      const start = n === 3 ? 1 : (Math.random() < 0.5 ? 0 : 1);
      this.cur = { it, col: start, x: this.colX(start), y: -30, fast: false };
      const speedUp = this.answered / this.total;
      const fall = H - 96 + 30;
      this.cur.speed = fall / (fall / lerp(34, 58, speedUp) + THINK);
      this.ui.prompt({ ask: it.ask, code: it.code, phase: this.phase.title || "" });
    }
    update(dt) {
      if (!this.cur) {
        this.wait -= dt;
        if (this.wait <= 0) {
          if (this.itemIdx >= this.phase.items.length) {
            if (this.phaseIdx < this.phases.length - 1) {
              this.phaseIdx++;
              this.itemIdx = 0;
              this.startPhase();
              this.wait = 1.4;
              return;
            }
            this.finish(true);
            return;
          }
          this.spawn();
        }
        return;
      }
      const c = this.cur;
      if (Input.consume("left")) { c.col = clamp(c.col - 1, 0, this.bins.length - 1); sfx("move"); }
      if (Input.consume("right")) { c.col = clamp(c.col + 1, 0, this.bins.length - 1); sfx("move"); }
      if (Input.consume("action")) c.fast = true;
      c.x = lerp(c.x, this.colX(c.col), Math.min(1, dt * 14));
      c.y += (c.fast ? 520 : c.speed) * dt;
      if (c.y >= H - 96) this.land();
    }
    land() {
      const c = this.cur;
      const bin = this.bins[c.col];
      const it = c.it;
      this.cur = null;
      this.itemIdx++;
      this.wait = 0.45;
      const x = this.colX(c.col), y = H - 70;
      if (bin === it.bin) {
        this.binFill[bin] = (this.binFill[bin] || 0) + 1;
        if (this.useHeap) {
          if (it.isDelete) { this.heap = Math.max(0, this.heap - 2); this.fx.text(x, y - 40, "memoria liberada", C.cyan); }
          else if (bin === "heap") this.heap++;
          else this.stackPlates++;
        }
        this.right(x, y, it, c.fast ? 0 : 20, () => {
          if (this.useHeap && this.heap >= HEAP_MAX) this.leak(x, y);
        });
      } else {
        const title = it.isDelete && bin === "stack" ? "Eso no se libera así" : "Zona equivocada";
        this.wrong(x, y, it, title);
      }
    }
    leak(x, y) {
      this.heap = 0;
      sfx("hit");
      this.loseLife(x, y, true);
      this.streak = 0;
      this.blocking = true;
      Input.clear();
      this.missed.push({ ask: "¿Qué es una fuga de memoria?", code: "int* p = new int(5);\np = new int(7);   // se perdió el primero", answer: "Memoria del heap que nunca se libera",
        explain: "Cada `new` necesita su `delete`. Si pierdes el puntero sin liberar, esa memoria queda ocupada hasta que termina el programa." });
      this.ui.explain("¡Fuga de memoria!", "El heap se llenó porque hubo memoria pedida con `new` que nadie liberó. Cada `new` necesita su `delete` (y cada `new[]` su `delete[]`).", () => {
        this.blocking = false;
        if (this.lives <= 0) this.finish(false);
      });
      this.pushHud();
    }
    draw(ctx) {
      drawMemoryGrid(ctx, 0);
      const n = this.bins.length, bw = W / n;
      const top = H - 96;
      // zonas
      this.bins.forEach((b, i) => {
        const x = i * bw, col = BIN_COLORS[b] || C.fg;
        const active = this.cur && this.cur.col === i;
        ctx.globalAlpha = active ? 0.16 : 0.07;
        ctx.fillStyle = col;
        ctx.fillRect(x + 4, 0, bw - 8, H);
        ctx.globalAlpha = 1;
        roundRect(ctx, x + 6, top, bw - 12, 90, 8);
        ctx.fillStyle = "rgba(34,26,41,0.92)";
        ctx.fill();
        ctx.lineWidth = active ? 2.5 : 1.5;
        ctx.strokeStyle = col;
        ctx.stroke();
        const lab = ((this.phase.labels && this.phase.labels[b]) || BIN_LABEL[b] || b).split("\n");
        lab.forEach((ln, k) => drawLabel(ctx, ln, x + bw / 2, top + (lab.length > 1 ? 13 + k * 13 : 20), bw - 20, n === 3 ? 13 : 16, col, DISPLAY));
        // contenido de la zona
        if (this.useHeap && b === "stack") this.drawPlates(ctx, x + bw / 2, top + 80, col);
        else if (this.useHeap && b === "heap") this.drawHeap(ctx, x + 6, top + 36, bw - 12, col);
        else this.drawCount(ctx, x + bw / 2, top + 60, this.binFill[b] || 0, col);
      });
      // pieza que cae
      if (this.cur) {
        const c = this.cur, it = c.it;
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = "rgba(243,233,220,0.25)";
        ctx.beginPath(); ctx.moveTo(c.x, c.y + 24); ctx.lineTo(c.x, top); ctx.stroke();
        ctx.setLineDash([]);
        const bwid = Math.min(bw - 16, 170);
        ctx.shadowColor = it.isDelete ? C.cyan : C.amber;
        ctx.shadowBlur = 16;
        roundRect(ctx, c.x - bwid / 2, c.y - 22, bwid, 44, 8);
        ctx.fillStyle = it.isDelete ? "#123038" : "#3a2a14";
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        ctx.strokeStyle = it.isDelete ? C.cyan : C.amber;
        ctx.stroke();
        drawLabel(ctx, it.label, c.x, c.y, bwid - 14, 15, C.fg);
      }
    }
    drawPlates(ctx, cx, bottom, col) {
      const shown = Math.min(this.stackPlates, 5);
      for (let i = 0; i < shown; i++) {
        ctx.fillStyle = i === shown - 1 ? col : C.amberDeep;
        roundRect(ctx, cx - 40, bottom - 8 - i * 8, 80, 6, 2);
        ctx.fill();
      }
      if (!shown) { ctx.fillStyle = C.muted; ctx.font = `400 10px ${MONO}`; ctx.fillText("marcos vacíos", cx, bottom - 18); }
    }
    drawHeap(ctx, x, y, w, col) {
      ctx.font = `400 10px ${MONO}`;
      ctx.fillStyle = this.heap >= HEAP_MAX - 1 ? C.bad : C.muted;
      ctx.textAlign = "center";
      ctx.fillText(`uso ${this.heap}/${HEAP_MAX}`, x + w / 2, y + 2);
      const cw = (w - 20) / HEAP_MAX;
      for (let i = 0; i < HEAP_MAX; i++) {
        roundRect(ctx, x + 10 + i * cw + 2, y + 14, cw - 4, 22, 4);
        ctx.fillStyle = i < this.heap ? (this.heap >= HEAP_MAX - 1 ? C.bad : col) : "rgba(99,212,230,0.08)";
        ctx.fill();
      }
    }
    drawCount(ctx, cx, cy, n, col) {
      for (let i = 0; i < Math.min(n, 8); i++) {
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.85;
        roundRect(ctx, cx - 36 + (i % 4) * 19, cy - 10 + Math.floor(i / 4) * 14, 15, 10, 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  /* =====================================================================
     MOTOR 2 · DISPAROS (Cazapunteros / Jefe)
     ===================================================================== */
  class Shooter extends BaseGame {
    constructor(level, data, ui) {
      super(level, data, ui);
      this.questions = data.questions;
      this.qi = -1;
      this.ship = { x: W / 2, y: H - 34 };
      this.bullets = [];
      this.orbs = [];
      this.hazards = [];
      this.enemyShots = [];
      this.cool = 0;
      this.hazardT = 3;
      this.wait = 0.6;
      this.isBoss = !!data.boss;
      this.cfg = Object.assign({ label: "SIGSEGV", color: "bad", pattern: "aimed", speed: 1 }, typeof data.boss === "object" ? data.boss : {});
      this.boss = this.isBoss ? { x: W / 2, y: 46, hp: this.questions.length, max: this.questions.length, t: 0, shootT: 2, hurt: 0, n: 0 } : null;
      this.invuln = 0;
    }
    progress() { return this.answered / this.questions.length; }
    next() {
      this.qi++;
      if (this.qi >= this.questions.length) { this.finish(true); return; }
      const q = this.questions[this.qi];
      const n = q.options.length;
      const top = this.isBoss ? 104 : 36;
      // Más tiempo cuando hay código que leer o alternativas largas en el panel
      const lines = q.code ? q.code.split("\n").length : 0;
      const extra = Math.min(6, lines * 0.6) + (this.isBoss ? 1.5 : 0);
      const dur = lerp(14, 9, this.qi / this.questions.length) + extra + THINK;
      this.orbs = q.options.map((o, i) => ({
        i, label: this.isBoss ? "ABCD"[i] : o,
        bx: (W / n) * (i + 0.5), x: (W / n) * (i + 0.5), y: top, phase: Math.random() * 6
      }));
      this.orbTop = top;
      this.orbSpeed = (H - 120 - top) / dur;
      this.orbStart = this.time;
      this.ui.prompt({ ask: q.ask, code: q.code, options: this.isBoss ? q.options : null });
    }
    update(dt) {
      const s = this.ship;
      const sp = 270;
      if (Input.held.left) s.x -= sp * dt;
      if (Input.held.right) s.x += sp * dt;
      Input.consume("left"); Input.consume("right");
      s.x = clamp(s.x, 20, W - 20);
      this.cool -= dt;
      this.invuln = Math.max(0, this.invuln - dt);
      if ((Input.consume("action") || Input.held.action) && this.cool <= 0) {
        this.bullets.push({ x: s.x, y: s.y - 16 });
        sfx("shoot");
        this.cool = 0.22;
      }
      for (const b of this.bullets) b.y -= 520 * dt;
      this.bullets = this.bullets.filter(b => b.y > -10);

      if (!this.orbs.length) {
        this.wait -= dt;
        if (this.wait <= 0) this.next();
      } else {
        for (const o of this.orbs) {
          o.y += this.orbSpeed * dt;
          o.x = o.bx + Math.sin(this.time * 1.4 + o.phase) * 5;
        }
        // impactos sobre las respuestas
        for (const b of this.bullets) {
          for (const o of this.orbs) {
            if (Math.abs(b.x - o.x) < this.orbW(o) / 2 && Math.abs(b.y - o.y) < 22) {
              b.dead = true;
              this.hitOrb(o);
              break;
            }
          }
          if (!this.orbs.length) break;
        }
        this.bullets = this.bullets.filter(b => !b.dead);
        if (this.orbs.length && this.orbs[0].y > H - 120) {
          const q = this.questions[this.qi];
          const x = W / 2, y = H - 120;
          this.orbs = [];
          this.wait = 0.5;
          this.wrong(x, y, q, "Se acabó el tiempo");
        }
      }

      // punteros colgantes
      if (this.data.hazards) {
        this.hazardT -= dt;
        if (this.hazardT <= 0) {
          this.hazards.push({ x: 30 + Math.random() * (W - 60), y: -14, vy: 70 + Math.random() * 50 + this.qi * 4 });
          this.hazardT = 3.2 + Math.random() * 2.5 - Math.min(1.5, this.qi * 0.12);
        }
        for (const h of this.hazards) {
          h.y += h.vy * dt;
          for (const b of this.bullets) {
            if (!b.dead && Math.abs(b.x - h.x) < 24 && Math.abs(b.y - h.y) < 12) {
              b.dead = h.dead = true;
              sfx("pop");
              this.score += 25;
              this.fx.burst(h.x, h.y, C.plum, 12);
              this.fx.text(h.x, h.y, "+25", C.plum);
              this.pushHud();
            }
          }
          if (!h.dead && this.invuln <= 0 && Math.abs(h.x - s.x) < 26 && Math.abs(h.y - s.y) < 16) {
            h.dead = true;
            this.invuln = 1.2;
            this.ui.toast(false, "Puntero colgante", "Usar memoria ya liberada rompe el programa. −1 vida");
            this.loseLife(s.x, s.y);
          }
        }
        this.hazards = this.hazards.filter(h => !h.dead && h.y < H + 20);
        this.bullets = this.bullets.filter(b => !b.dead);
      }

      // jefe
      if (this.boss) {
        const bo = this.boss;
        bo.t += dt;
        bo.hurt = Math.max(0, bo.hurt - dt);
        bo.x = W / 2 + Math.sin(bo.t * 0.9) * 120;
        bo.shootT -= dt;
        if (bo.shootT <= 0) {
          this.bossAttack(bo, s);
          bo.n++;
          const rage = 1 - bo.hp / bo.max;
          const base = this.cfg.pattern === "rain" ? lerp(1.5, 0.8, rage) : this.cfg.pattern === "spread" ? lerp(2.8, 1.7, rage) : lerp(2.4, 1.3, rage);
          bo.shootT = base / Math.sqrt(this.cfg.speed);
        }
        for (const e of this.enemyShots) {
          e.x += e.vx * dt; e.y += e.vy * dt;
          if (this.invuln <= 0 && Math.hypot(e.x - s.x, e.y - s.y) < 12 + (e.r || 5)) {
            e.dead = true;
            this.invuln = 1.2;
            this.ui.toast(false, "¡Te alcanzó!", `Un ataque de ${this.level.title.replace(/^Jefe( final)?: /, "")}. −1 vida`);
            this.loseLife(s.x, s.y);
          }
        }
        this.enemyShots = this.enemyShots.filter(e => !e.dead && e.y < H + 10 && e.x > -10 && e.x < W + 10);
      }
    }
    bossAttack(bo, s) {
      const v = 150 * this.cfg.speed;
      const aimed = () => {
        const dx = s.x - bo.x, dy = s.y - bo.y, d = Math.hypot(dx, dy);
        this.enemyShots.push({ x: bo.x, y: bo.y + 20, vx: (dx / d) * v, vy: (dy / d) * v, r: 5 });
      };
      const spread = () => {
        for (const a of [-0.38, 0, 0.38]) this.enemyShots.push({ x: bo.x, y: bo.y + 20, vx: Math.sin(a) * v * 0.9, vy: Math.cos(a) * v * 0.9, r: 5 });
      };
      const rain = () => {
        this.enemyShots.push({ x: 20 + Math.random() * (W - 40), y: 70, vx: 0, vy: v * 0.7, r: 9, block: true });
      };
      const p = this.cfg.pattern;
      sfx("bossShot");
      if (p === "spread") spread();
      else if (p === "rain") rain();
      else if (p === "mixed") [aimed, spread, aimed, rain][bo.n % 4]();
      else aimed();
    }
    orbW(o) { return this.isBoss ? 56 : Math.min(W / this.orbs.length - 20, 90); }
    hitOrb(o) {
      const q = this.questions[this.qi];
      const x = o.x, y = o.y;
      this.orbs = [];
      this.wait = 0.5;
      if (o.i === q.answer) {
        const frac = 1 - clamp((this.time - this.orbStart) * this.orbSpeed / (H - 120 - this.orbTop), 0, 1);
        this.right(x, y, q, Math.round(frac * 60));
        if (this.boss) {
          this.boss.hp--;
          this.boss.hurt = 0.5;
          sfx("bossHit");
          this.fx.burst(this.boss.x, this.boss.y, C.amber, 30);
        }
      } else {
        this.wrong(x, y, q, "Le diste a la incorrecta");
      }
    }
    draw(ctx) {
      drawMemoryGrid(ctx, this.time * 18);
      // línea de peligro
      ctx.strokeStyle = "rgba(255,107,107,0.35)";
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(0, H - 98); ctx.lineTo(W, H - 98); ctx.stroke();
      ctx.setLineDash([]);
      // jefe
      if (this.boss) this.drawBoss(ctx);
      // respuestas
      for (const o of this.orbs) {
        const w = this.orbW(o), h = 44;
        ctx.shadowColor = C.cyan; ctx.shadowBlur = 14;
        roundRect(ctx, o.x - w / 2, o.y - h / 2, w, h, this.isBoss ? 22 : 10);
        ctx.fillStyle = "#11303a";
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        ctx.strokeStyle = C.cyan;
        ctx.stroke();
        drawLabel(ctx, o.label, o.x, o.y, w - 10, this.isBoss ? 20 : 14, C.fg, this.isBoss ? DISPLAY : MONO);
      }
      // punteros colgantes
      for (const h of this.hazards) {
        roundRect(ctx, h.x - 24, h.y - 10, 48, 20, 4);
        ctx.fillStyle = "#2a1838"; ctx.fill();
        ctx.strokeStyle = C.plum; ctx.lineWidth = 1.5; ctx.stroke();
        drawLabel(ctx, "0xDEAD", h.x, h.y, 44, 10, C.plum);
      }
      for (const e of this.enemyShots) {
        if (e.block) {
          ctx.fillStyle = C.plum;
          roundRect(ctx, e.x - e.r, e.y - e.r, e.r * 2, e.r * 2, 3); ctx.fill();
          ctx.fillStyle = C.bg; ctx.font = `700 8px ${MONO}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(this.cfg.rainText || "new", e.x, e.y);
        } else {
          ctx.fillStyle = this.bossColor();
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r || 5, 0, Math.PI * 2); ctx.fill();
        }
      }
      // balas
      ctx.fillStyle = C.amber;
      for (const b of this.bullets) {
        ctx.font = `700 16px ${MONO}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("*", b.x, b.y);
      }
      // nave (una flecha-puntero)
      const s = this.ship;
      if (!(this.invuln > 0 && Math.floor(this.time * 12) % 2)) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.shadowColor = C.amber; ctx.shadowBlur = 12;
        ctx.fillStyle = C.amber;
        ctx.beginPath();
        ctx.moveTo(0, -18); ctx.lineTo(16, 12); ctx.lineTo(4, 6); ctx.lineTo(0, 14); ctx.lineTo(-4, 6); ctx.lineTo(-16, 12);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = C.bg;
        ctx.font = `700 10px ${MONO}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("p", 0, 2);
        ctx.restore();
      }
    }
    bossColor() { return C[this.cfg.color] || C.bad; }
    drawBoss(ctx) {
      const b = this.boss;
      const tone = this.bossColor();
      ctx.save();
      ctx.translate(b.x, b.y);
      const col = b.hurt > 0 ? C.fg : tone;
      ctx.shadowColor = tone; ctx.shadowBlur = 20;
      ctx.fillStyle = "#2a1626";
      roundRect(ctx, -46, -24, 92, 48, 10); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.stroke();
      // ojos
      ctx.fillStyle = col;
      ctx.fillRect(-26, -10, 14, 8); ctx.fillRect(12, -10, 14, 8);
      ctx.font = `700 10px ${MONO}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(this.cfg.label, 0, 12);
      ctx.restore();
      // vida
      const bw = 160;
      ctx.fillStyle = "rgba(243,233,220,0.12)";
      ctx.fillRect(W / 2 - bw / 2, 8, bw, 6);
      ctx.fillStyle = tone;
      ctx.fillRect(W / 2 - bw / 2, 8, bw * (b.hp / b.max), 6);
    }
  }

  /* =====================================================================
     MOTOR 3 · CARRERA DE 3 CARRILES (Pista de ejecución)
     ===================================================================== */
  class Runner extends BaseGame {
    constructor(level, data, ui) {
      super(level, data, ui);
      this.questions = data.questions;
      this.qi = -1;
      this.lane = 1;
      this.px = this.laneX(1);
      this.py = H - 56;
      this.gate = null;
      this.bugs = [];
      this.scroll = 0;
      this.invuln = 0;
      this.nextGate(-120);
    }
    laneX(i) { return (W / 3) * (i + 0.5); }
    progress() { return this.answered / this.questions.length; }
    get speed() {
      // tiempo de viaje de la compuerta: de ~10 s a ~6,5 s
      const dur = lerp(10, 6.5, Math.max(0, this.qi) / this.questions.length);
      const base = (this.py + 60) / dur, trip = this.py + 200;   // una compuerta recorre ~py+200 px
      return trip / (trip / base + THINK);
    }
    nextGate(y) {
      this.qi++;
      if (this.qi >= this.questions.length) { this.gate = null; this.endT = 0.8; return; }
      const q = this.questions[this.qi];
      this.gate = { q, y };
      this.ui.prompt({ ask: q.ask, code: q.code });
      // algunos bugs entre compuertas
      if (this.qi > 0 && Math.random() < 0.75) {
        const l = Math.floor(Math.random() * 3);
        this.bugs.push({ lane: l, y: -20 });
        if (this.qi > 5 && Math.random() < 0.4) this.bugs.push({ lane: (l + 1 + Math.floor(Math.random() * 2)) % 3, y: -90 });
      }
    }
    update(dt) {
      if (Input.consume("left")) { this.lane = clamp(this.lane - 1, 0, 2); sfx("move"); }
      if (Input.consume("right")) { this.lane = clamp(this.lane + 1, 0, 2); sfx("move"); }
      Input.consume("action");
      this.px = lerp(this.px, this.laneX(this.lane), Math.min(1, dt * 16));
      this.invuln = Math.max(0, this.invuln - dt);
      const v = this.speed;
      this.scroll += v * dt;
      for (const b of this.bugs) {
        b.y += v * dt;
        if (!b.dead && this.invuln <= 0 && b.lane === this.lane && Math.abs(b.y - this.py) < 22) {
          b.dead = true;
          this.invuln = 1;
          this.ui.toast(false, "¡Bug!", "Chocaste con un bug. −1 vida");
          this.loseLife(this.px, this.py);
        }
      }
      this.bugs = this.bugs.filter(b => !b.dead && b.y < H + 30);
      if (this.gate) {
        this.gate.y += v * dt;
        if (this.gate.y >= this.py) {
          const q = this.gate.q;
          this.gate = null;
          if (this.lane === q.answer) {
            this.right(this.px, this.py - 20, q, 0);
            this.pendingNext = true;
          } else {
            this.wrong(this.px, this.py - 20, q, "Carril equivocado", () => {});
            this.pendingNext = true;
          }
        }
      } else if (this.pendingNext) {
        this.pendingNext = false;
        this.nextGate(-200);
      } else if (this.endT !== undefined) {
        this.endT -= dt;
        if (this.endT <= 0) this.finish(true);
      }
    }
    draw(ctx) {
      drawMemoryGrid(ctx, this.scroll * 0.5);
      // carriles
      ctx.fillStyle = "rgba(34,26,41,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,181,71,0.35)";
      ctx.lineWidth = 2;
      ctx.setLineDash([18, 22]);
      ctx.lineDashOffset = -this.scroll;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo((W / 3) * i, 0); ctx.lineTo((W / 3) * i, H); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      // números de línea que pasan
      ctx.font = `400 9px ${MONO}`;
      ctx.fillStyle = "rgba(169,155,177,0.35)";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let y = (this.scroll % 46) - 46; y < H; y += 46) {
        const ln = Math.floor((this.scroll - y) / 46) + 100;
        ctx.fillText(String(Math.abs(ln)), W - 4, y);
      }
      // compuerta
      if (this.gate) {
        const g = this.gate;
        this.gate.q.options.forEach((o, i) => {
          const x = (W / 3) * i;
          roundRect(ctx, x + 8, g.y - 26, W / 3 - 16, 52, 8);
          ctx.fillStyle = "#11303a";
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = C.cyan;
          ctx.stroke();
          drawLabel(ctx, String(o), x + W / 6, g.y, W / 3 - 28, 16, C.fg);
        });
        ctx.font = `400 9px ${MONO}`;
        ctx.fillStyle = C.cyan; ctx.textAlign = "left";
        ctx.fillText("if (respuesta == carril)", 10, g.y - 36);
      }
      // bugs
      for (const b of this.bugs) {
        const x = this.laneX(b.lane);
        ctx.fillStyle = C.bad;
        ctx.beginPath(); ctx.ellipse(x, b.y, 14, 11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = C.bad; ctx.lineWidth = 2;
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath(); ctx.moveTo(x - 12, b.y + k * 6); ctx.lineTo(x - 20, b.y + k * 8); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + 12, b.y + k * 6); ctx.lineTo(x + 20, b.y + k * 8); ctx.stroke();
        }
        ctx.fillStyle = C.bg;
        ctx.fillRect(x - 6, b.y - 4, 3, 3); ctx.fillRect(x + 3, b.y - 4, 3, 3);
      }
      // jugador: el cursor de ejecución
      if (!(this.invuln > 0 && Math.floor(this.time * 12) % 2)) {
        ctx.save();
        ctx.translate(this.px, this.py);
        ctx.shadowColor = C.amber; ctx.shadowBlur = 14;
        ctx.fillStyle = C.amber;
        roundRect(ctx, -22, -14, 44, 28, 6); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = C.bg;
        ctx.font = `400 14px ${DISPLAY}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("PC", 0, 1);
        ctx.restore();
      }
    }
  }

  window.Engines = { W, H, Input, KEYMAP, Sorter, Shooter, Runner };
})();
