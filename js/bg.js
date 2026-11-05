/* Fondo animado del menú de inicio: conceptos de C++ que se enfrentan en duelos.
   Solo corre mientras se ve la pantalla de inicio. Con "reducir movimiento" se dibuja una escena quieta. */
(function () {
  "use strict";

  // Cada duelo tiene un ganador fijo (w) y una frase que explica por qué gana (why).
  // Todo lo que dice "no compila" o "undefined reference" se comprobó con g++.
  const DUELS = [
    { w: "delete", l: "memory leak", why: "Cada new necesita su delete; si no, la memoria queda reservada: fuga." },
    { w: "delete[]", l: "delete", why: "Lo que se crea con new[] se libera con delete[], no con delete." },
    { w: "const", l: "x = 5", why: "Una variable const no se puede reasignar: x = 5 no compila." },
    { w: "caso base", l: "recursión", why: "El caso base detiene la recursión; sin él, stack overflow." },
    { w: "double", l: "int", why: "En 1 + 2.5 el int se convierte a double: el resultado es 3.5." },
    { w: "7/2 → 3", l: "7/2 → 3.5", why: "Entre dos int, / descarta los decimales: 7 / 2 da 3." },
    { w: "break", l: "for", why: "break sale del ciclo de inmediato, aunque falten vueltas." },
    { w: "continue", l: "resto del ciclo", why: "continue salta lo que queda de la vuelta y pasa a la siguiente." },
    { w: "private", l: "obj.x", why: "Si x es private, usar obj.x fuera de la clase no compila." },
    { w: "arr[9]", l: "arr[10]", why: "En int arr[10] los índices van de 0 a 9: arr[10] se sale." },
    { w: "if (p)", l: "*p nulo", why: "Revisa que el puntero no sea nulo antes de usar *p." },
    { w: "heap", l: "stack", why: "Lo creado con new sigue vivo al salir de la función; una variable local del stack, no." },
    { w: "prototipo", l: "f() sin declarar", why: "Declarar el prototipo arriba permite llamar a f antes de su definición." },
    { w: "int& x", l: "int x", why: "Con int& x la función cambia el original; con int x solo una copia." },
    { w: "linker", l: "f() sin definir", why: "Si f se declara pero nunca se define, el linker reclama: undefined reference." },
    { w: "#include", l: "cout", why: "Sin #include <iostream>, cout no está declarado y no compila." },
    { w: "strlen", l: "sizeof", why: "Para el largo de \"hola\", strlen da 4; sizeof cuenta también el '\\0' (5)." },
    { w: "char s[5]", l: "char s[4]", why: "\"hola\" ocupa 5 chars: 4 letras más el '\\0' final." },
    { w: "break", l: "fall-through", why: "Sin break, el switch sigue ejecutando el case de abajo." },
    { w: "do-while", l: "while", why: "Con condición falsa, do-while igual corre una vez; while, ninguna." },
    { w: "&& false", l: "true", why: "Con &&, basta un false para que todo sea false." },
    { w: "|| true", l: "false", why: "Con ||, basta un true para que todo sea true." },
    { w: "return", l: "código muerto", why: "Después de return la función termina: lo de abajo no corre." },
    { w: "f(int)", l: "f(double)", why: "Con f(3), el compilador elige la sobrecarga que calza exacto: f(int)." },
    { w: "unsigned", l: "-1", why: "Un unsigned no guarda negativos: -1 se vuelve 4294967295." }
  ];
  const HITS = ["POW", "CLASH", "¡zas!", "BONK", "0xDEAD", "SEGFAULT", "¡crack!", "overflow", "undefined", "core dumped"];
  const COLORS = { a: "#ffb547", b: "#63d4e6", spark: "#f3e9dc", body: "rgba(44, 34, 53, 0.92)", muted: "#a99bb1" };
  const FONT = '600 13px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
  const HIT_FONT = '400 13px "Bungee", "Impact", sans-serif';
  const CAP_FONT = '500 12px "Chakra Petch", "Segoe UI", system-ui, sans-serif';
  const CAP_HEAD = '700 12px "Chakra Petch", "Segoe UI", system-ui, sans-serif';

  // En pantallas anchas se pelea en los costados (lienzo fijo detrás de todo).
  // En el celular el panel tapa casi todo, así que se usa una franja "arena" bajo el logo.
  let wideCanvas, arenaCanvas, canvas, ctx, W = 0, H = 0, dpr = 1, narrow = false;
  let running = false, raf = 0, last = 0;
  let duels = [], sparks = [], popups = [], spawnIn = 0;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const wasNarrow = narrow;
    narrow = window.innerWidth < 1000;
    canvas = narrow ? arenaCanvas : wideCanvas;
    wideCanvas.style.display = !narrow && active ? "" : "none";
    arenaCanvas.parentElement.hidden = !narrow;
    if (wasNarrow !== narrow) { duels = []; sparks = []; popups = []; }
    ctx = canvas.getContext("2d");
    if (narrow) { W = arenaCanvas.parentElement.clientWidth; H = arenaCanvas.parentElement.clientHeight; }
    else { W = window.innerWidth; H = window.innerHeight; }
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function textW(t) { ctx.font = FONT; return ctx.measureText(t).width + 18; }

  // Punto de encuentro: en pantallas anchas, en los costados libres; en el celular, en cualquier parte.
  function meetPoint() {
    if (narrow) {
      if (duels.length) return null;
      return { x: W / 2 + rand(-20, 20), y: H - 34, gap: Math.min(rand(120, 160), W / 2 - 50) };
    }
    const side = (W - 560) / 2;
    const left = Math.random() < 0.5;
    const x = left ? side / 2 : W - side / 2;
    const gap = Math.max(60, Math.min(rand(130, 200), side / 2 - 55));
    for (let tries = 0; tries < 12; tries++) {
      const y = rand(110, H - 40);
      if (duels.every(d => Math.abs(d.y - y) > 130 || Math.abs(d.mx - x) > 100)) return { x, y, gap };
    }
    return null;
  }

  function makeFighter(label, color, dir, x, y) {
    return { label, color, dir, x, y, w: textW(label), vx: 0, vy: 0, rot: 0, vr: 0, alpha: 0, bob: rand(0, 6), off: 0, ko: false };
  }

  function spawnDuel() {
    const p = meetPoint();
    if (!p) return;
    const busy = duels.map(d => d.info);
    const info = pick(DUELS.filter(x => !busy.includes(x)));
    const winLeft = Math.random() < 0.5;
    const gap = p.gap;
    const a = makeFighter(winLeft ? info.w : info.l, COLORS.a, 1, p.x - gap, p.y);
    const b = makeFighter(winLeft ? info.l : info.w, COLORS.b, -1, p.x + gap, p.y);
    duels.push({ a, b, info, winner: winLeft ? a : b, mx: p.x, y: p.y, phase: "walk", t: 0, hits: 2 + Math.floor(Math.random() * 3), title: 0, cap: 0 });
  }

  function burst(x, y) {
    for (let i = 0; i < 14; i++) {
      const ang = rand(0, Math.PI * 2), sp = rand(60, 220);
      sparks.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 40, life: rand(0.3, 0.6), max: 0.6, c: Math.random() < 0.5 ? COLORS.spark : pick([COLORS.a, COLORS.b]) });
    }
    popups.push({ x: x + rand(-14, 14), y: y - 26, text: pick(HITS), life: 0.8 });
    if (window.SFX) window.SFX.play("clash");
  }

  function step(d, dt) {
    const { a, b } = d;
    d.t += dt;
    [a, b].forEach(f => { if (!f.ko) f.alpha = Math.min(1, f.alpha + dt * 2.5); f.bob += dt * 10; });
    const contact = () => (b.x - b.w / 2) - (a.x + a.w / 2);

    if (d.phase === "walk") {
      a.x += 55 * dt; b.x -= 55 * dt;
      d.title = Math.min(1, d.title + dt * 2);
      if (contact() <= 4) { d.phase = "back"; d.t = 0; burst((a.x + a.w / 2 + b.x - b.w / 2) / 2, d.y); }
    } else if (d.phase === "back") {
      // Retroceden por el golpe y se preparan para el siguiente.
      const k = Math.max(0, 1 - d.t / 0.35);
      a.x -= 110 * k * dt; b.x += 110 * k * dt;
      a.off = b.off = Math.sin(d.t * 60) * 2 * k;
      if (d.t > 0.45) { d.hits--; d.phase = d.hits > 0 ? "lunge" : "ko"; d.t = 0; a.off = b.off = 0; if (d.phase === "ko") knockout(d); }
    } else if (d.phase === "lunge") {
      a.x += 190 * dt; b.x -= 190 * dt;
      if (contact() <= 2) { d.phase = "back"; d.t = 0; burst((a.x + a.w / 2 + b.x - b.w / 2) / 2, d.y); }
    } else if (d.phase === "ko") {
      // Tras el K.O. aparece la explicación de por qué ganó; se queda unos segundos para leerla.
      const END = 5.6;
      d.title = Math.max(0, d.title - dt * 3);
      d.cap = d.t < END - 0.6 ? Math.min(1, Math.max(0, (d.t - 0.4) * 3)) : Math.max(0, d.cap - dt * 2);
      [a, b].forEach(f => {
        if (f.ko) {
          f.vy += 520 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
          f.alpha = Math.max(0, f.alpha - dt * 0.9);
        } else {
          // El ganador celebra con saltitos y se queda mientras se lee la explicación.
          f.off = d.t < 1.2 ? -Math.abs(Math.sin(d.t * 9)) * 10 : 0;
          if (d.t > END - 0.6) f.alpha = Math.max(0, f.alpha - dt * 2);
        }
      });
      if (d.t > END) d.done = true;
    }
  }

  function knockout(d) {
    const loser = d.winner === d.a ? d.b : d.a;
    if (window.SFX) window.SFX.play("ko");
    loser.ko = true;
    loser.vx = -loser.dir * rand(140, 220);
    loser.vy = -rand(200, 280);
    loser.vr = -loser.dir * rand(5, 9);
    popups.push({ x: loser.x, y: loser.y - 4, text: "K.O.", life: 1.1, big: true });
  }

  function drawFighter(f, walking) {
    if (f.alpha <= 0) return;
    const bob = walking && !f.ko ? Math.sin(f.bob) * 1.5 : 0;
    ctx.save();
    ctx.globalAlpha = f.alpha * 0.9;
    ctx.translate(f.x, f.y + f.off + bob);
    ctx.rotate(f.rot);
    const w = f.w, h = 24;
    // Piernas
    ctx.strokeStyle = f.color; ctx.lineWidth = 2; ctx.lineCap = "round";
    const step = walking && !f.ko ? Math.sin(f.bob) * 4 : 0;
    ctx.beginPath();
    ctx.moveTo(-w / 4, h / 2); ctx.lineTo(-w / 4 + step, h / 2 + 7);
    ctx.moveTo(w / 4, h / 2); ctx.lineTo(w / 4 - step, h / 2 + 7);
    // Brazo que golpea, hacia el rival
    ctx.moveTo(f.dir * w / 2, 0); ctx.lineTo(f.dir * (w / 2 + 7), -3);
    ctx.stroke();
    // Cuerpo
    ctx.fillStyle = COLORS.body;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, 6); else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.lineWidth = 1.5; ctx.stroke();
    // Ojos que miran al rival (o X si quedó K.O.)
    ctx.fillStyle = f.color;
    const ex = f.dir * 3;
    if (f.ko) {
      ctx.font = '700 9px "JetBrains Mono", monospace'; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("x  x", 0, -h / 2 - 6);
    } else {
      ctx.fillRect(-5 + ex, -h / 2 - 8, 3, 3);
      ctx.fillRect(3 + ex, -h / 2 - 8, 3, 3);
    }
    // Texto
    ctx.font = FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(f.label, 0, 1);
    ctx.restore();
  }

  function wrap(text, maxW) {
    const words = text.split(" "), lines = [];
    let line = "";
    words.forEach(w => {
      const test = line ? line + " " + w : w;
      if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = w; } else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  // Recuadro con "Gana X" y la razón, encima del ganador.
  function drawCaption(d) {
    const maxW = narrow ? W - 36 : Math.max(160, Math.min(300, (W - 560) / 2 - 40));
    ctx.save();
    ctx.font = CAP_FONT;
    const lines = wrap(d.info.why, maxW);
    const head = "Gana " + d.info.w;
    ctx.font = CAP_HEAD;
    let bw = ctx.measureText(head).width;
    ctx.font = CAP_FONT;
    lines.forEach(l => { bw = Math.max(bw, ctx.measureText(l).width); });
    bw += 20;
    const lh = 15, bh = (lines.length + 1) * lh + 12;
    const bx = Math.max(6, Math.min(W - 6 - bw, d.mx - bw / 2));
    const by = Math.max(4, d.y - 34 - bh);
    ctx.globalAlpha = d.cap;
    ctx.fillStyle = "rgba(23, 18, 28, 0.92)";
    ctx.strokeStyle = d.winner.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 6); else ctx.rect(bx, by, bw, bh);
    ctx.fill(); ctx.stroke();
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.font = CAP_HEAD; ctx.fillStyle = d.winner.color;
    ctx.fillText(head, bx + 10, by + 6);
    ctx.font = CAP_FONT; ctx.fillStyle = "#f3e9dc";
    lines.forEach((l, i) => ctx.fillText(l, bx + 10, by + 6 + (i + 1) * lh));
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    duels.forEach(d => {
      const walking = d.phase === "walk" || d.phase === "lunge";
      if (d.title > 0) {
        ctx.save();
        ctx.globalAlpha = d.title * 0.55;
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.fillStyle = COLORS.muted; ctx.textAlign = "center";
        ctx.fillText(`${d.a.label} vs ${d.b.label}`, d.mx, d.y - 36);
        ctx.restore();
      }
      drawFighter(d.a, walking); drawFighter(d.b, walking);
      if (d.cap > 0) drawCaption(d);
    });
    sparks.forEach(s => {
      ctx.globalAlpha = Math.max(0, s.life / s.max);
      ctx.fillStyle = s.c;
      ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
    });
    popups.forEach(p => {
      ctx.globalAlpha = Math.min(1, p.life * 2) * 0.85;
      ctx.font = p.big ? '400 16px "Bungee", "Impact", sans-serif' : HIT_FONT;
      ctx.textAlign = "center";
      ctx.fillStyle = p.big ? "#ff6b6b" : COLORS.spark;
      ctx.fillText(p.text, p.x, p.y);
    });
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    const maxDuels = narrow ? 1 : 6;
    spawnIn -= dt;
    if (spawnIn <= 0 && duels.length < maxDuels) { spawnDuel(); spawnIn = rand(0.8, 2.2); }
    duels.forEach(d => step(d, dt));
    duels = duels.filter(d => !d.done);
    sparks.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 300 * dt; s.life -= dt; });
    sparks = sparks.filter(s => s.life > 0);
    popups.forEach(p => { p.y -= 22 * dt; p.life -= dt; });
    popups = popups.filter(p => p.life > 0);
    draw();
    raf = requestAnimationFrame(frame);
  }

  // Escena quieta para quien prefiere menos movimiento: unos duelos detenidos justo antes del choque.
  function drawStill() {
    duels = []; sparks = []; popups = [];
    const n = narrow ? 1 : 6;
    for (let i = 0; i < n; i++) {
      const p = meetPoint();
      if (!p) continue;
      const busy = duels.map(d => d.info);
      const info = pick(DUELS.filter(x => !busy.includes(x)));
      const a = makeFighter(info.w, COLORS.a, 1, 0, p.y), b = makeFighter(info.l, COLORS.b, -1, 0, p.y);
      a.x = p.x - a.w / 2 - 10; b.x = p.x + b.w / 2 + 10;
      a.alpha = b.alpha = 1;
      duels.push({ a, b, info, winner: a, mx: p.x, y: p.y, phase: "walk", title: 0, cap: 1 });
    }
    draw();
  }

  let active = false;
  function init() {
    wideCanvas = document.createElement("canvas");
    wideCanvas.id = "bg-fight";
    wideCanvas.setAttribute("aria-hidden", "true");
    document.body.insertBefore(wideCanvas, document.body.firstChild);
    arenaCanvas = document.getElementById("arena-canvas");
    window.addEventListener("resize", () => { if (!active) return; resize(); if (reduce) drawStill(); });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { cancelAnimationFrame(raf); running = false; }
      else if (active && !reduce) start();
    });
  }

  function start() {
    if (!wideCanvas) init();
    active = true;
    resize();
    if (reduce) { drawStill(); return; }
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (!wideCanvas) return;
    active = false;
    running = false;
    cancelAnimationFrame(raf);
    wideCanvas.style.display = "none";
    duels = []; sparks = []; popups = []; spawnIn = 0;
  }

  window.FightBG = { start, stop };
})();
