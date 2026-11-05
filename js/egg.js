/* egg.js — sorpresa del menú de inicio: al tocar la "C" del título sale un monito bailando con un cartel
   de agradecimiento, baila unos 5 segundos y vuelve a meterse en la C. */
(function () {
  "use strict";

  const C_EL = document.getElementById("logo-c");
  if (!C_EL) return;

  const LINES = ["Agradecimientos al", "profesor Jacques Burrus"];
  const COL = { amber: "#ffb547", amberDeep: "#c97d14", cyan: "#63d4e6", fg: "#f3e9dc", body: "#221a29", panel: "rgba(23,18,28,0.94)" };
  const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';
  const BODY = '"Chakra Petch", "Segoe UI", system-ui, sans-serif';
  const T_OUT = 0.8, T_DANCE = 5, T_IN = 0.9;          // salida, baile y salto de vuelta (segundos)
  // El cartel se escribe letra por letra mientras baila: cada letra tiene su instante (con algo de
  // irregularidad, como alguien tecleando) y una pausa corta al pasar a la segunda línea.
  const TYPE_AT = [];
  (function () {
    let t = 0.15;
    LINES.forEach((line, li) => {
      if (li) t += 0.22;
      for (let i = 0; i < line.length; i++) { TYPE_AT.push(t); t += 0.062 + ((i * 37 + li * 11) % 5) * 0.009; }
    });
  })();
  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  let canvas = null, ctx = null, running = false, t0 = 0, typed = 0, jumpedIn = false;

  const sfx = (n, a) => { if (window.SFX) SFX.play(n, a); };
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  function setup() {
    canvas = document.createElement("canvas");
    canvas.className = "egg-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
  }
  function resize() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Posiciones a partir de dónde está la C ahora (por si la página se movió).
  // Baila justo debajo de la descripción, con el cartel a su lado.
  const TAG = document.querySelector(".brand .tagline");
  const ARENA = document.querySelector(".brand .arena");
  function layout() {
    const r = C_EL.getBoundingClientRect();
    const s = Math.max(0.85, Math.min(1.4, r.height / 52));
    const start = { x: r.left + r.width * 0.55, y: r.top + r.height * 0.55 };
    let spot;
    const arena = ARENA && !ARENA.hidden ? ARENA.getBoundingClientRect() : null;
    if (arena && arena.height > 0) {
      // Celular: baila dentro de la franja de los duelos (que se pausan).
      spot = { x: arena.left + 50 * s, y: arena.top + arena.height * 0.6 };
    } else if (innerWidth >= 1000 && r.left > 300) {
      // Pantalla ancha: baila en el margen izquierdo, que queda libre.
      spot = { x: Math.max(60, r.left - 270), y: r.bottom + 150 };
    } else {
      const below = TAG ? TAG.getBoundingClientRect().bottom : r.bottom;
      spot = { x: r.left + r.width / 2 + 10 * s, y: below + 52 * s };
    }
    return { r, s, start, spot };
  }

  // Parábola entre dos puntos con una altura extra en el medio.
  function arc(a, b, k, lift) {
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k - Math.sin(Math.PI * k) * lift };
  }

  function drawMonito(x, y, s, st) {
    const w = 46 * s, h = 30 * s;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(st.rot || 0);
    ctx.strokeStyle = COL.amber; ctx.lineCap = "round"; ctx.lineWidth = 2.4 * s;
    // Piernas (patadas alternadas al bailar)
    ctx.beginPath();
    ctx.moveTo(-w / 4, h / 2); ctx.lineTo(-w / 4 - st.kickL * 7 * s, h / 2 + 9 * s);
    ctx.moveTo(w / 4, h / 2); ctx.lineTo(w / 4 + st.kickR * 7 * s, h / 2 + 9 * s);
    // Brazo izquierdo saludando
    ctx.moveTo(-w / 2, -2 * s);
    ctx.lineTo(-w / 2 - 9 * s, -2 * s - st.wave * 12 * s);
    ctx.stroke();
    // Cuerpo
    ctx.fillStyle = COL.body;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, 7 * s); else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill(); ctx.stroke();
    // Ojos (parpadean)
    ctx.fillStyle = COL.amber;
    const eh = st.blink ? 1 : 3.5 * s;
    ctx.fillRect(-7 * s, -h / 2 - 9 * s, 3.5 * s, eh);
    ctx.fillRect(4 * s, -h / 2 - 9 * s, 3.5 * s, eh);
    // Etiqueta
    ctx.font = `700 ${Math.round(12 * s)}px ${MONO}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("C++", 0, 1);
    ctx.restore();
    return { hand: { x: x + Math.cos(st.rot || 0) * (w / 2 + 8 * s), y: y - 4 * s + Math.sin(st.rot || 0) * (w / 2) } };
  }

  function drawSign(hand, s, alpha, wiggle, shown, cursor) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    const fs = Math.round(13 * s);
    ctx.font = `700 ${fs}px ${BODY}`;
    const tw = Math.max(...LINES.map(l => ctx.measureText(l).width));
    const pad = 10 * s, bw = tw + pad * 2, bh = fs * 2 + pad * 2 + 4 * s;
    // El cartel va a la derecha de la mano, a la altura del cuerpo, sin salirse de la pantalla.
    const bx = Math.min(hand.x + 16 * s, innerWidth - bw - 8);
    const by = hand.y - bh / 2;
    ctx.translate(hand.x, hand.y);
    ctx.rotate(wiggle);
    ctx.translate(-hand.x, -hand.y);
    // Palo del cartel
    ctx.strokeStyle = COL.amberDeep; ctx.lineWidth = 3 * s; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(bx + 4 * s, hand.y); ctx.stroke();
    // Tabla
    ctx.fillStyle = COL.panel; ctx.strokeStyle = COL.cyan; ctx.lineWidth = 2 * s;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 8 * s); else ctx.rect(bx, by, bw, bh);
    ctx.fill(); ctx.stroke();
    // Texto escrito hasta ahora, alineado a la izquierda como en un editor, con cursor.
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    const n0 = Math.min(shown, LINES[0].length), n1 = Math.max(0, shown - LINES[0].length);
    const t0 = LINES[0].slice(0, n0), t1 = LINES[1].slice(0, n1);
    const x0 = bx + pad, y0 = by + pad, y1 = by + pad + fs + 4 * s;
    ctx.fillStyle = COL.fg; ctx.fillText(t0, x0, y0);
    ctx.fillStyle = COL.amber; ctx.fillText(t1, x0, y1);
    if (cursor) {
      const onSecond = shown >= LINES[0].length;
      const cx = x0 + ctx.measureText(onSecond ? t1 : t0).width + 1 * s;
      ctx.fillStyle = COL.cyan;
      ctx.fillRect(cx, (onSecond ? y1 : y0) + 1 * s, 2 * s, fs);
    }
    ctx.restore();
  }

  function drawNotes(L, t) {
    ctx.save();
    ctx.font = `700 ${Math.round(16 * L.s)}px ${BODY}`;
    ctx.textAlign = "center";
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.55 + i / 3) % 1);
      ctx.globalAlpha = Math.sin(Math.PI * k) * 0.8;
      ctx.fillStyle = i % 2 ? COL.cyan : COL.amber;
      ctx.fillText(["{ }", ";", "</>"][i], L.spot.x - 34 * L.s + i * 6 * L.s + Math.sin(k * 6 + i) * 6 * L.s, L.spot.y - 30 * L.s - k * 50 * L.s);
    }
    ctx.restore();
  }

  function frame(now) {
    const t = (now - t0) / 1000;
    // Si se salió del menú de inicio, se termina sin más.
    if (!C_EL.offsetParent) { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); canvas.hidden = true; return; }
    const L = layout();
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    // Sale de dentro de la C creciendo desde chiquitito y vuelve encogiéndose hasta desaparecer en ella
    // (g = tamaño, a = opacidad), así no hay ningún recorte cuadrado alrededor de la letra.
    const st = { kickL: 0, kickR: 0, wave: 0.6, rot: 0, blink: false };
    let pos, signA = 0, wiggle = 0, g = 1, a = 1;

    if (t < T_OUT) {                                   // sale saltando desde detrás de la C
      const k = ease(t / T_OUT);
      pos = arc(L.start, L.spot, k, 70 * L.s);
      g = 0.12 + 0.88 * k; a = Math.min(1, k * 2.5);
      st.kickL = st.kickR = 0.8; st.wave = 1; st.rot = (1 - k) * -0.4;
      signA = Math.max(0, (k - 0.6) / 0.4);
    } else if (t < T_OUT + T_DANCE) {                  // baila
      const d = t - T_OUT, beat = d * 2.4;             // ~144 pasos por minuto
      let n = typed;
      while (n < TYPE_AT.length && TYPE_AT[n] <= d) n++;
      if (n > typed) {
        const ch = n <= LINES[0].length ? LINES[0][n - 1] : LINES[1][n - 1 - LINES[0].length];
        sfx("key", ch === " " ? 0 : n + 1);
        if (n === TYPE_AT.length) sfx("enter");
        typed = n;
      }
      const ph = beat * Math.PI;
      const hop = reduced ? 0 : Math.abs(Math.sin(ph)) * 7 * L.s;
      pos = { x: L.spot.x + (reduced ? 0 : Math.sin(ph / 2) * 6 * L.s), y: L.spot.y - hop };
      st.rot = reduced ? 0 : Math.sin(ph / 2) * 0.14;
      st.kickL = reduced ? 0 : Math.max(0, Math.sin(ph));
      st.kickR = reduced ? 0 : Math.max(0, -Math.sin(ph));
      st.wave = reduced ? 0.6 : 0.5 + 0.5 * Math.sin(ph * 2);
      st.blink = (d % 2.7) < 0.12;
      signA = 1; wiggle = reduced ? 0 : Math.sin(ph) * 0.05;
      if (!reduced) drawNotes(L, d);
    } else if (t < T_OUT + T_DANCE + T_IN) {          // vuelve a saltar detrás de la C
      if (!jumpedIn) { jumpedIn = true; sfx("jumpIn"); }
      const k = ease((t - T_OUT - T_DANCE) / T_IN);
      pos = arc(L.spot, L.start, k, 90 * L.s);
      g = 1 - 0.88 * k; a = Math.min(1, (1 - k) * 2.5);
      st.kickL = st.kickR = 0.9; st.wave = 1; st.rot = k * 0.5;
      signA = Math.max(0, 1 - k * 4);
      typed = TYPE_AT.length;
    } else {
      finish();
      return;
    }
    ctx.save();
    ctx.globalAlpha = a;
    const m = drawMonito(pos.x, pos.y, L.s * g, st);
    ctx.restore();
    const cursor = typed < TYPE_AT.length ? (t % 0.6 < 0.4 || typed > 0) : (t % 1 < 0.5);
    drawSign(m.hand, L.s, signA, wiggle, typed, cursor);
    requestAnimationFrame(frame);
  }

  function finish() {
    running = false;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    canvas.hidden = true;
    sfx("pop");
    if (window.FightBG && C_EL.offsetParent) FightBG.start();
    C_EL.classList.remove("wobble"); void C_EL.offsetWidth; C_EL.classList.add("wobble");
  }

  function start() {
    if (running) return;
    if (!canvas) setup();
    running = true; typed = 0; jumpedIn = false;
    canvas.hidden = false;
    // Escenario limpio: se pausan los duelos del fondo mientras baila.
    if (window.FightBG) {
      FightBG.stop();
      const arena = document.getElementById("arena-canvas");
      if (arena) arena.getContext("2d").clearRect(0, 0, arena.width, arena.height);
    }
    resize();
    sfx("jumpOut");
    C_EL.classList.remove("wobble"); void C_EL.offsetWidth; C_EL.classList.add("wobble");   // la C "lo lanza"
    t0 = performance.now();
    requestAnimationFrame(frame);
  }

  C_EL.addEventListener("click", start);
  C_EL.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); start(); } });
})();
