/* arcade.js — Modo Arcade: "La taberna".
   Un trader de 50 años, cansado y con ojeras, llega a la taberna, pide un trago y te pide ayuda con un
   programa en C++ a medio escribir. La cámara se acerca a su computador y su pantalla es el tablero.
   Si te equivocas más de la cuenta, lo despiden; si no, lo ascienden.
   La escena se dibuja en pixel art sobre un canvas de 320×180 que el CSS agranda sin suavizar. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const AC = window.ArcadeCases;
  const sfx = (n, a) => { try { if (window.SFX) SFX.play(n, a); } catch (e) { /* sin sonido */ } };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = s => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
  const KW = /\b(int|double|char|bool|void|return|if|else|for|while|do|switch|case|break|continue|new|delete|const|nullptr|sizeof|true|false)\b/g;
  const highlight = code => code.split("\n").map(line => {
    const i = line.indexOf("//"), body = i >= 0 ? line.slice(0, i) : line, cm = i >= 0 ? line.slice(i) : "";
    return esc(body).replace(KW, '<span class="kw">$1</span>').replace(/\/\* \?\?\? \*\//g, '<span class="pc-hole">/* ??? */</span>') + (cm ? `<span class="cm">${esc(cm)}</span>` : "");
  }).join("\n");
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  /* ===================================================================
     ESCENA
     =================================================================== */
  const W = 320, H = 180;
  const C = {
    wall: "#2b1a12", plank: "#24150e", wains: "#3a2416", wainsLine: "#2e1b11", shelf: "#6b4423", floor: "#1d130d", floorLine: "#160e09",
    bar: "#7a4a26", barFront: "#4e2f19", barLine: "#3e2513", table: "#8a5a30", tableEdge: "#a06a3a", apron: "#5e3a1d", leg: "#4a2e1a",
    skin: "#d9a27a", skinD: "#b9825e", hair: "#a9a9a9", hairD: "#7d7d7d", bags: "#8d5f7a", eye: "#2a1a14", lid: "#9a6a4e",
    suit: "#3a3f4a", suitD: "#2c3039", shirt: "#e8e4dc", tie: "#b3342f", tieD: "#8a2420", pants: "#2a2d36", shoe: "#141414",
    glass: "#cfe3ea", whisky: "#d08a2a", lap: "#7d8591", lapD: "#5d646f", scr: "#0d1a1f", amber: "#ffb547", cyan: "#63d4e6", good: "#7ee08a", bad: "#ff6b6b"
  };
  let cv, ctx, raf = 0, last = 0, clock = 0;
  const S = {};          // estado de la escena
  function resetScene() {
    Object.assign(S, {
      trader: { x: 300, y: 44, pose: "none", mood: "tired", talk: false, drink: 0, phone: 0, arms: 0, box: false, walkT: 0 },
      bart: { talk: false, wipe: true }, door: 0,
      glass: { on: false, x: 128, level: 1 }, laptop: "none", lapFlip: 1,
      cam: { s: 1, x: W / 2, y: H / 2 }, confetti: [], cloud: false, sweat: 0
    });
  }
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

  function drawRoom() {
    R(0, 0, W, H, C.wall);
    for (let x = 0; x < W; x += 16) R(x, 0, 1, 100, C.plank);
    R(0, 100, W, 28, C.wains); for (let x = 8; x < W; x += 24) R(x, 102, 1, 24, C.wainsLine);
    R(0, 128, W, 52, C.floor); for (let y = 136; y < H; y += 9) R(0, y, W, 1, C.floorLine);
    // letrero
    R(34, 6, 84, 13, "#4a2e1a"); R(35, 7, 82, 11, "#1b120c");
    ctx.font = "bold 8px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = (Math.sin(clock * 3) > -0.92) ? C.amber : "#7a5520"; ctx.fillText("TABERNA EL HEAP", 76, 13);
    // repisas con botellas
    const bottles = [[14, C.good, 12], [22, C.whisky, 14], [30, "#a33b3b", 11], [40, "#3d6fa8", 13], [50, C.whisky, 12], [60, "#2f7d4f", 14], [72, "#a33b3b", 12], [82, C.whisky, 10], [94, "#6a4aa8", 13], [106, "#2f7d4f", 12], [118, C.whisky, 14], [128, "#3d6fa8", 11]];
    [36, 58].forEach((sy, row) => {
      R(8, sy, 130, 3, C.shelf);
      bottles.forEach(([bx, c, h], i) => {
        if ((i + row) % 3 === 2) return;
        const hh = h - row * 2;
        R(bx, sy - hh, 5, hh, c); R(bx + 1, sy - hh - 3, 3, 3, c); R(bx + 1, sy - hh + 2, 1, hh - 4, "rgba(255,255,255,0.25)");
      });
    });
    // ventana con luna
    R(228, 26, 40, 40, "#5a3a22"); R(231, 29, 34, 34, "#13203a"); R(247, 29, 2, 34, "#5a3a22"); R(231, 45, 34, 2, "#5a3a22");
    R(254, 32, 6, 6, "#f3e9dc"); R(256, 32, 4, 2, "#13203a");
    [[236, 34], [241, 52], [258, 55], [237, 58]].forEach(([x, y], i) => { if (Math.sin(clock * 2 + i) > -0.5) R(x, y, 1, 1, "#f3e9dc"); });
    // puerta
    R(280, 40, 34, 88, "#5a3a22");
    if (S.door > 0) { R(283, 43, 28, 85, "#0b0806"); R(283, 43, Math.round(28 * (1 - S.door)), 85, "#4a2e1a"); }
    else { R(283, 43, 28, 85, "#4a2e1a"); R(287, 48, 20, 30, "#3e2616"); R(287, 84, 20, 36, "#3e2616"); R(305, 86, 2, 3, C.amber); }
    // lámpara
    R(159, 0, 1, 16, "#111"); R(152, 16, 16, 5, C.amber); R(150, 21, 20, 2, "#c97d14");
    const g = ctx.createRadialGradient(160, 26, 2, 160, 60, 110);
    const fl = 0.16 + 0.02 * Math.sin(clock * 7) + 0.01 * Math.sin(clock * 17);
    g.addColorStop(0, `rgba(255,190,90,${fl + 0.1})`); g.addColorStop(1, "rgba(255,190,90,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function drawBar() {
    // cantinero detrás de la barra
    const bx = 56, by = 62 + (S.bart.talk ? Math.round(Math.sin(clock * 12)) * 0 : 0);
    R(bx - 12, by + 18, 24, 14, C.shirt); R(bx - 12, by + 18, 7, 14, "#1f1f24"); R(bx + 5, by + 18, 7, 14, "#1f1f24");
    R(bx - 3, by + 18, 6, 2, "#a33b3b");
    R(bx - 7, by, 14, 16, C.skin); R(bx - 7, by, 14, 3, "#2a1a14"); R(bx - 8, by + 4, 1, 4, "#2a1a14"); R(bx + 7, by + 4, 1, 4, "#2a1a14");
    R(bx - 4, by + 7, 2, 1, C.eye); R(bx + 2, by + 7, 2, 1, C.eye);
    R(bx - 4, by + 11, 8, 2, "#3b2418"); R(bx - 1, by + 13, 2, S.bart.talk && Math.sin(clock * 18) > 0 ? 2 : 1, "#5a2a20");
    R(bx - 2, by + 16, 4, 2, C.skinD);
    // brazo secando un vaso
    const wx = S.bart.wipe ? Math.round(Math.sin(clock * 3) * 4) : 0;
    R(bx + 10 + wx, by + 24, 6, 6, C.glass); R(bx + 11 + wx, by + 27, 4, 2, C.whisky); R(bx + 8 + wx, by + 26, 4, 4, "#e9e2d0");
    // barra
    R(0, 92, 150, 6, C.bar); R(0, 98, 150, 30, C.barFront); for (let x = 10; x < 150; x += 28) R(x, 100, 1, 26, C.barLine);
    R(150, 92, 2, 36, C.barLine);
  }
  function drawTrader() {
    const t = S.trader; if (t.pose === "none") return;
    const x = Math.round(t.x), sitting = t.pose === "sit";
    const bob = t.pose === "walk" ? Math.round(Math.abs(Math.sin(t.walkT * 8))) : 0;
    const y = Math.round(t.y) - bob;
    if (sitting) { R(x - 18, y + 14, 36, 56, "#5a3a22"); R(x - 16, y + 16, 32, 52, "#4a2e1a"); }       // respaldo de la silla
    if (!sitting) {                                                                                       // piernas
      const ph = Math.sin(t.walkT * 8), l1 = t.pose === "walk" ? Math.round(ph * 3) : 0;
      R(x - 8 + l1, y + 50, 7, 32, C.pants); R(x + 1 - l1, y + 50, 7, 32, C.pants);
      R(x - 9 + l1, y + 82, 9, 3, C.shoe); R(x + 1 - l1, y + 82, 9, 3, C.shoe);
    }
    // torso
    R(x - 14, y + 20, 28, 32, C.suit); R(x - 14, y + 20, 3, 32, C.suitD); R(x + 11, y + 20, 3, 32, C.suitD);
    R(x - 5, y + 20, 10, 4, C.shirt); R(x - 4, y + 24, 8, 4, C.shirt); R(x - 3, y + 28, 6, 4, C.shirt); R(x - 2, y + 32, 4, 3, C.shirt);
    R(x - 1, y + 23, 4, 3, C.tie); R(x, y + 26, 3, 12, C.tie); R(x + 1, y + 30, 1, 8, C.tieD);                  // corbata suelta y chueca
    R(x - 7, y + 20, 2, 7, C.suitD); R(x + 5, y + 20, 2, 7, C.suitD);                                           // solapas
    drawArms(x, y, sitting);
    drawHead(x, y, t.mood, t.talk);
    if (t.box) drawBox(x - 18, y + 40);
  }
  function arm(x0, y0, x1, y1, w, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
    for (let i = 0; i <= n; i++) { const k = n ? i / n : 0; R(x0 + (x1 - x0) * k - w / 2, y0 + (y1 - y0) * k - w / 2, w, w, c); }
  }
  function drawArms(x, y, sitting) {
    const t = S.trader;
    // brazo derecho (a la derecha de la pantalla): apoyado en la mesa o arriba celebrando
    if (t.arms > 0) { arm(x + 13, y + 24, x + 13 + 8 * t.arms, y + 24 - 22 * t.arms, 5, C.suit); R(x + 11 + 8 * t.arms, y + 20 - 22 * t.arms, 5, 5, C.skin); }
    else if (sitting) { arm(x + 13, y + 24, x + 16, y + 48, 5, C.suit); arm(x + 16, y + 52, x + 6, y + 55, 5, C.suit); R(x + 3, y + 53, 5, 4, C.skin); }
    else { arm(x + 13, y + 24, x + 15, y + 46, 5, C.suit); R(x + 13, y + 46, 5, 4, C.skin); }
    // brazo izquierdo: tomar el vaso, contestar el teléfono, celebrar o apoyado
    let hx, hy;
    if (t.arms > 0) { hx = x - 13 - 8 * t.arms; hy = y + 20 - 22 * t.arms; }
    else if (t.phone > 0) { hx = x - 15 + 4 * t.phone; hy = y + 46 - 36 * t.phone; }
    else if (t.drink > 0) { hx = x - 12 + 9 * t.drink; hy = y + 52 - 38 * t.drink; }
    else if (sitting) { hx = x - 8; hy = y + 54; }
    else { hx = x - 16; hy = y + 46; }
    const ex = x - 17, ey = y + 40;
    arm(x - 13, y + 24, ex, ey, 5, C.suit); arm(ex, ey, hx, hy, 5, C.suit);
    R(hx - 2, hy - 2, 5, 4, C.skin);
    if (t.drink > 0 && S.glass.on) drawGlass(hx - 2, hy - 8, S.glass.level);
    if (t.phone > 0) { R(hx - 2, hy - 7, 4, 9, "#111"); R(hx - 1, hy - 6, 2, 4, C.cyan); }
  }
  function drawHead(x, y, mood, talk) {
    R(x - 9, y, 18, 18, C.skin); R(x - 9, y + 14, 18, 4, C.skinD);
    R(x - 10, y + 6, 1, 4, C.skinD); R(x + 9, y + 6, 1, 4, C.skinD);                                      // orejas
    R(x - 9, y + 2, 3, 9, C.hair); R(x + 6, y + 2, 3, 9, C.hair); R(x - 6, y, 3, 2, C.hair); R(x + 2, y, 4, 1, C.hairD); // canas y calva
    for (const [sx, sy] of [[-6, 15], [-3, 16], [1, 16], [4, 15], [6, 13], [-7, 13], [-1, 17]]) R(x + sx, y + sy, 1, 1, "#8f6a52"); // barba de tres días
    R(x - 1, y + 9, 2, 3, C.skinD);                                                                         // nariz
    const brow = mood === "sweat" || mood === "panic" ? 1 : 0;
    R(x - 6, y + 5 + (mood === "tired" ? 1 : 0), 4, 1, C.hairD); R(x + 2, y + 5 + (mood === "tired" ? 1 : 0), 4, 1, C.hairD);
    if (brow) { R(x - 3, y + 4, 1, 1, C.hairD); R(x + 2, y + 4, 1, 1, C.hairD); }
    // ojos y ojeras
    if (mood === "happy" || mood === "joy") { R(x - 6, y + 7, 4, 1, C.eye); R(x - 7, y + 8, 1, 1, C.eye); R(x - 2, y + 8, 1, 1, C.eye); R(x + 2, y + 7, 4, 1, C.eye); R(x + 1, y + 8, 1, 1, C.eye); R(x + 6, y + 8, 1, 1, C.eye); }
    else if (mood === "panic") { R(x - 6, y + 6, 4, 3, "#fff"); R(x + 2, y + 6, 4, 3, "#fff"); R(x - 5, y + 7, 2, 2, C.eye); R(x + 3, y + 7, 2, 2, C.eye); }
    else if (mood === "sad") { R(x - 6, y + 8, 4, 1, C.eye); R(x + 2, y + 8, 4, 1, C.eye); }
    else { R(x - 6, y + 7, 4, 1, C.lid); R(x + 2, y + 7, 4, 1, C.lid); R(x - 5, y + 8, 2, 1, C.eye); R(x + 3, y + 8, 2, 1, C.eye); }
    R(x - 6, y + 9, 4, 1, C.bags); R(x + 2, y + 9, 4, 1, C.bags); R(x - 5, y + 10, 3, 1, C.bags); R(x + 3, y + 10, 3, 1, C.bags);
    // boca
    const open = talk && Math.sin(clock * 20) > 0;
    if (mood === "happy" || mood === "joy") { R(x - 4, y + 13, 8, 1, "#5a2a20"); R(x - 3, y + 14, 6, mood === "joy" ? 2 : 1, "#5a2a20"); }
    else if (mood === "panic") R(x - 2, y + 12, 4, 4, "#3a1610");
    else if (mood === "sad") { R(x - 3, y + 14, 6, 1, "#5a2a20"); R(x - 4, y + 15, 1, 1, "#5a2a20"); R(x + 3, y + 15, 1, 1, "#5a2a20"); }
    else if (mood === "sweat") { R(x - 3, y + 14, 2, 1, "#5a2a20"); R(x - 1, y + 13, 2, 1, "#5a2a20"); R(x + 1, y + 14, 2, 1, "#5a2a20"); }
    else R(x - 3, y + 13, 6, open ? 2 : 1, open ? "#3a1610" : "#7a3b2e");
    if (mood === "sweat" || mood === "panic") {
      const k = (clock * 1.5) % 1;
      R(x + 8, y + 2 + Math.round(k * 10), 2, 3, "#8fd3ff"); if (mood === "panic") R(x - 10, y + 3 + Math.round(((k + 0.5) % 1) * 10), 2, 3, "#8fd3ff");
    }
  }
  function drawGlass(x, y, level) {
    R(x, y, 6, 8, C.glass); R(x + 1, y + 1, 4, 6, "#9fc3cf");
    const h = Math.round(5 * level); if (h > 0) R(x + 1, y + 7 - h, 4, h, C.whisky);
    R(x + 1, y + 1, 1, 5, "rgba(255,255,255,0.55)");
  }
  function drawBox(x, y) { R(x, y, 36, 18, "#b98b55"); R(x, y, 36, 3, "#d3a46a"); R(x + 15, y + 3, 6, 15, "#a0743f"); R(x + 4, y - 4, 4, 5, C.good); R(x + 26, y - 6, 3, 7, C.amber); }
  function drawTable() {
    if (S.glass.on && !(S.trader.drink > 0)) drawGlass(S.glass.x, 118, S.glass.level);
    if (S.laptop === "back") {
      const w = Math.max(2, Math.round(30 * S.lapFlip));
      R(186 - w / 2, 106, w, 20, C.lap); R(186 - w / 2, 106, w, 2, C.lapD); if (w > 10) R(184, 114, 4, 4, C.cyan);
    } else if (S.laptop === "front") {
      const w = Math.max(2, Math.round(32 * S.lapFlip));
      R(186 - w / 2, 104, w, 22, "#2a2d36");
      if (w > 12) {
        R(186 - w / 2 + 2, 106, w - 4, 17, C.scr);
        const lines = [[2, 6, C.cyan], [2, 10, C.amber], [5, 8, C.good], [5, 12, C.cyan], [2, 4, C.amber], [5, 9, C.shirt]];
        lines.forEach(([dx, len, c], i) => R(186 - w / 2 + 2 + dx, 108 + i * 2.5, Math.min(len, w - 8), 1, c));
        if (Math.sin(clock * 6) > 0) R(186 - w / 2 + 10, 121, 3, 1, C.shirt);
      }
      R(170, 126, 32, 2, "#9aa1ad");
    }
    R(96, 126, 128, 8, C.table); R(96, 126, 128, 1, C.tableEdge); R(98, 134, 124, 10, C.apron); R(154, 144, 12, 36, C.leg); R(144, 176, 32, 4, C.leg);
  }
  function drawFx(dt) {
    S.confetti.forEach(c => { c.y += c.vy * dt; c.x += Math.sin(clock * 4 + c.p) * 0.3; R(c.x, c.y, 2, 2, c.c); });
    S.confetti = S.confetti.filter(c => c.y < H);
    if (S.cloud) {
      const x = Math.round(S.trader.x), y = Math.round(S.trader.y) - 16;
      R(x - 12, y, 24, 6, "#6b6f7a"); R(x - 8, y - 3, 14, 4, "#7c808b");
      for (let i = 0; i < 4; i++) { const k = (clock * 2 + i * 0.25) % 1; R(x - 9 + i * 6, y + 7 + Math.round(k * 10), 1, 3, "#8fd3ff"); }
    }
    if (S.trader.phone > 0.9 && Math.sin(clock * 16) > 0) { ctx.fillStyle = C.amber; ctx.font = "bold 7px monospace"; ctx.fillText("¡RIIING!", S.trader.x - 30, S.trader.y + 2); }
  }
  function frame(now) {
    raf = 0;
    if (!cv || $("screen-arcade").hidden) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; clock += dt;
    if (S.trader.pose === "walk") S.trader.walkT += dt;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const k = S.cam.s;
    ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-S.cam.x, -S.cam.y);
    drawRoom(); drawBar(); drawTrader(); drawTable(); drawFx(dt);
    if (!$("arc-pc").hidden) drawFace();
    raf = requestAnimationFrame(frame);
  }
  function startLoop() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }

  // Retrato del trader en la esquina del tablero: reacciona a cada respuesta.
  let face = { mood: "tired", drink: 0 };
  function drawFace() {
    const fc = $("pc-face"), f = fc.getContext("2d");
    const keep = ctx; ctx = f;
    f.setTransform(1, 0, 0, 1, 0, 0); f.fillStyle = "#1b120c"; f.fillRect(0, 0, 40, 40);
    f.fillStyle = "rgba(255,190,90,0.10)"; f.fillRect(0, 0, 40, 40);
    R(6, 30, 28, 10, C.suit); R(16, 30, 8, 4, C.shirt); R(19, 31, 3, 9, C.tie);
    drawHead(20, 12, face.mood, false);
    if (face.drink > 0) { R(10, 26 - 10 * face.drink, 5, 4, C.skin); drawGlass(9, 18 - 10 * face.drink, 0.5); }
    ctx = keep;
  }

  /* ---------- utilidades de animación ---------- */
  const wait = ms => new Promise(r => setTimeout(r, skipping ? 0 : ms));
  function tween(obj, key, to, ms, fn) {
    const from = obj[key];
    if (skipping || ms <= 0) { obj[key] = to; return Promise.resolve(); }
    return new Promise(res => {
      const t0 = performance.now();
      const step = now => {
        const k = Math.min(1, (now - t0) / ms);
        obj[key] = from + (to - from) * (fn || ease)(k);
        if (k < 1 && !skipping) requestAnimationFrame(step); else { obj[key] = to; res(); }
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- diálogos ---------- */
  let skipping = false, sayDone = null, typing = null;
  function say(who, text, choices) {
    const box = $("arc-dialog"), line = $("arc-line"), ch = $("arc-choices");
    box.hidden = false; $("arc-who").textContent = who; ch.innerHTML = ""; $("arc-next").hidden = true;
    const speaker = who === "Cantinero" ? S.bart : S.trader;
    speaker.talk = true;
    return new Promise(res => {
      let i = 0;
      const full = fmt(text), plain = text.replace(/[`*]/g, "");
      const finishTyping = () => {
        clearInterval(typing); typing = null; line.innerHTML = full; speaker.talk = false;
        if (choices && choices.length) {
          choices.forEach((c, k) => {
            const b = document.createElement("button"); b.className = "btn " + (k ? "secondary" : "primary"); b.innerHTML = `${esc(c)} <kbd>${k + 1}</kbd>`;
            b.addEventListener("click", () => { sayDone = null; ch.innerHTML = ""; res(k); });
            ch.appendChild(b);
          });
        } else $("arc-next").hidden = false;
        sayDone = choices && choices.length ? { choices: choices.length, res } : { res };
      };
      sayDone = { typing: true, finish: finishTyping };
      if (skipping) { finishTyping(); if (!choices) { sayDone = null; res(0); } return; }
      typing = setInterval(() => {
        i++;
        line.textContent = plain.slice(0, i);
        if (i % 3 === 0 && plain[i] && plain[i] !== " ") sfx("key", i);
        if (i >= plain.length) finishTyping();
      }, 24);
    });
  }
  function advance() {
    if (!sayDone) return;
    if (sayDone.typing) { sayDone.finish(); return; }
    if (sayDone.choices) return;
    const r = sayDone.res; sayDone = null; $("arc-dialog").hidden = true; r(0);
  }
  function hideDialog() { $("arc-dialog").hidden = true; }

  /* ===================================================================
     PARTIDA
     =================================================================== */
  let profile = null, onBack = null, run = null, st = null, runToken = 0;
  const QUIPS = {
    good: ["Eso es. Sigue así.", "¡Ja! Sabía que eras bueno.", "Uf, el pulso me vuelve al cuerpo.", "Así lo habría hecho yo… hace veinte años.", "Perfecto. El jefe ni se va a enterar.", "Esto merece otro sorbo."],
    bad: ["*Le cae una gota de sudor por la frente.*", "Cantinero… otro trago, por favor.", "Tranquilo. Tranquilo. Todavía hay margen.", "Mi jefe no puede ver esto.", "*Se afloja aún más la corbata.*"],
    last: ["Un error más y estoy en la calle.", "*Mira el teléfono, nervioso.* No me falles ahora."],
    late: ["¡Se nos fue el tiempo! El mercado no espera."]
  };

  function open(p, back) {
    profile = p; onBack = back;
    cv = $("arc-canvas"); ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
    resetScene(); S.trader.pose = "none";
    showMenu();
    startLoop();
  }
  function showMenu() {
    runToken++; st = null; run = null; skipping = false;
    ["arc-pc", "arc-result", "arc-dialog"].forEach(id => { $(id).hidden = true; });
    $("arc-frame").hidden = false; $("arc-menu").hidden = false; $("arc-skip").hidden = true;
    $("arc-crumb").textContent = "Arcade · La taberna";
    resetScene();
    Object.keys(AC.DIFFS).forEach(d => {
      const rec = (profile.levels || {})["arcade-" + d] || {};
      const el = $("arc-rec-" + d);
      if (el) el.textContent = rec.plays ? `Récord ${rec.best} · ${"★".repeat(rec.stars || 0)}${"☆".repeat(3 - (rec.stars || 0))}` : "Sin jugar";
    });
    startLoop();
  }

  async function play(diff) {
    const my = ++runToken;
    run = AC.buildRun(diff);
    const D = AC.DIFFS[diff];
    st = { diff, i: 0, errors: 0, correct: 0, score: 0, missed: [], answered: false, timer: 0, left: 0 };
    $("arc-menu").hidden = true; $("arc-result").hidden = true; $("arc-pc").hidden = true; $("arc-frame").hidden = false;
    $("arc-crumb").textContent = `Arcade · ${D.name} · ${run.title}`;
    $("arc-skip").hidden = false; skipping = false;
    resetScene();
    sfx("start");
    // 1. Llega el trader
    await tween(S, "door", 1, 400);
    S.trader.pose = "walk"; S.trader.x = 298; S.trader.y = 44;
    await tween(S.trader, "x", 160, 2300, k => k);
    S.trader.pose = "stand"; await tween(S, "door", 0, 300);
    S.laptop = "back";
    S.trader.pose = "sit"; await tween(S.trader, "y", 68, 450);
    // 2. Pide un trago y bebe
    await say("Trader", "¡Cantinero! Un whisky doble. Sin hielo, sin preguntas.");
    S.bart.wipe = false;
    await say("Cantinero", "Marchando.");
    S.glass.on = true; S.glass.x = 98; sfx("pop"); await tween(S.glass, "x", 128, 600); S.bart.wipe = true;
    await wait(300);
    await tween(S.trader, "drink", 1, 600); await tween(S.glass, "level", 0.45, 700); await tween(S.trader, "drink", 0, 500);
    await say("Trader", "…Ahh. Veintiocho años en esto y nunca había tenido un viernes así.");
    // 3. El caso
    for (const l of run.pitch) await say("Trader", l);
    const k = await say("Trader", "El junior dejó el programa en C++ a medio escribir y renunció. ¿Me ayudas a terminarlo?", ["Te ayudo", "¿Y qué gano yo?"]);
    if (k === 1) await say("Trader", "La cuenta de esta noche corre por mí. Y mi eterna gratitud.", ["Trato hecho"]);
    hideDialog();
    S.trader.mood = "tired";
    await say("Trader", `Te advierto una cosa: si esto sale mal, pierdo mi empleo. Tengo margen para ${D.strikes} error${D.strikes > 1 ? "es" : ""}, ni uno más.` + (D.clock ? ` Y el mercado no espera: ${D.clock} segundos por pregunta.` : ""));
    // 4. Gira el computador y la cámara se acerca
    await tween(S, "lapFlip", 0, 250); S.laptop = "front"; await tween(S, "lapFlip", 1, 250);
    await say("Trader", "Mira, aquí está. Ponte cómodo.");
    if (my !== runToken) return;
    await zoomIn();
    if (my !== runToken) return;
    startBoard();
  }
  async function zoomIn() {
    hideDialog(); $("arc-skip").hidden = true; skipping = false;
    sfx("enter");
    await Promise.all([tween(S.cam, "s", 7, 1100), tween(S.cam, "x", 186, 1100), tween(S.cam, "y", 115, 1100)]);
    const fl = $("arc-flash"); fl.classList.add("on"); await wait(220);
    $("arc-frame").hidden = true; $("arc-pc").hidden = false; fl.classList.remove("on");
  }
  async function zoomOut() {
    $("arc-pc").hidden = true; $("arc-frame").hidden = false;
    await Promise.all([tween(S.cam, "s", 1, 900), tween(S.cam, "x", W / 2, 900), tween(S.cam, "y", H / 2, 900)]);
  }

  /* ---------- tablero ---------- */
  function startBoard() {
    face = { mood: "tired", drink: 0 };
    $("pc-quip").innerHTML = fmt("A ver qué dejó el junior…");
    showQuestion();
  }
  function strikesHTML() {
    const D = AC.DIFFS[st.diff];
    let s = "";
    for (let i = 0; i < D.strikes; i++) s += `<span class="${i < st.errors ? "x on" : "x"}">✕</span>`;
    return `<span class="pc-lbl">Margen</span>${s}`;
  }
  function showQuestion() {
    const q = run.questions[st.i], D = AC.DIFFS[st.diff];
    st.answered = false;
    $("pc-title").textContent = `trader.cpp — ${run.title}`;
    $("pc-step").textContent = `Paso ${st.i + 1} de ${run.questions.length} · ${AC.TOPICS[q.tag] || q.tag}`;
    $("pc-strikes").innerHTML = strikesHTML();
    $("pc-ask").innerHTML = fmt(q.ask);
    $("pc-code").innerHTML = q.code ? highlight(q.code) : "";
    $("pc-code").hidden = !q.code;
    const box = $("pc-opts"); box.innerHTML = "";
    q.options.forEach((o, k) => {
      const b = document.createElement("button");
      b.className = "pc-opt"; b.innerHTML = `<b>${k + 1}</b><span>${esc(o)}</span>`;
      b.addEventListener("click", () => answer(k));
      box.appendChild(b);
    });
    $("pc-fb").hidden = true;
    clearInterval(st.timer);
    if (D.clock) {
      st.left = D.clock; $("pc-clock").hidden = false; $("pc-clock").textContent = `⏱ ${st.left}s`; $("pc-clock").classList.remove("hurry");
      st.timer = setInterval(() => {
        st.left--; $("pc-clock").textContent = `⏱ ${st.left}s`;
        if (st.left <= 10) $("pc-clock").classList.add("hurry");
        if (st.left <= 0) { clearInterval(st.timer); answer(-1); }
      }, 1000);
    } else $("pc-clock").hidden = true;
  }
  function answer(k) {
    if (!st || st.answered) return;
    st.answered = true; clearInterval(st.timer);
    const q = run.questions[st.i], D = AC.DIFFS[st.diff], ok = k === q.answer;
    const btns = [...$("pc-opts").children];
    btns.forEach((b, i) => { b.disabled = true; if (i === q.answer) b.classList.add("right"); else if (i === k) b.classList.add("wrong"); });
    const mult = { facil: 1, intermedio: 1.5, leyenda: 2 }[st.diff];
    if (ok) {
      st.correct++; st.score += Math.round((100 + (D.clock ? st.left * 3 : 0)) * mult);
      sfx("right", st.correct); face.mood = "happy";
      $("pc-quip").innerHTML = fmt(pick(QUIPS.good));
    } else {
      st.errors++; sfx("wrong");
      st.missed.push({ ask: q.ask, code: q.code, answer: q.correctText, explain: q.explain });
      const out = st.errors > D.strikes, lastOne = st.errors === D.strikes;
      face.mood = out || lastOne ? "panic" : "sweat";
      const quip = k < 0 ? QUIPS.late[0] : lastOne ? pick(QUIPS.last) : pick(QUIPS.bad);
      $("pc-quip").innerHTML = fmt(quip);
      if (/trago/.test(quip)) { face.drink = 1; setTimeout(() => { face.drink = 0; }, 1400); }
    }
    $("pc-strikes").innerHTML = strikesHTML();
    $("pc-fb").hidden = false;
    $("pc-fb").className = "pc-fb " + (ok ? "ok" : "ko");
    $("pc-fb-title").textContent = ok ? "✓ Correcto" : k < 0 ? `⏱ Sin tiempo · era: ${q.correctText}` : `✕ Era: ${q.correctText}`;
    $("pc-fb-text").innerHTML = fmt(q.explain);
    const fired = st.errors > D.strikes, last = st.i === run.questions.length - 1;
    $("pc-next").innerHTML = fired ? "Ver qué pasa… <kbd>Enter</kbd>" : last ? "Entregar el programa <kbd>Enter</kbd>" : "Siguiente paso <kbd>Enter</kbd>";
    $("pc-next").focus({ preventScroll: true });
  }
  function next() {
    if (!st || !st.answered) return;
    const D = AC.DIFFS[st.diff];
    if (st.errors > D.strikes) return finish(false);
    if (st.i === run.questions.length - 1) return finish(true);
    st.i++;
    face.mood = st.errors === D.strikes ? "sweat" : "tired";
    showQuestion();
    $("arc-pc").scrollIntoView({ block: "start", behavior: "smooth" });
  }

  /* ---------- finales ---------- */
  async function finish(promoted) {
    const D = AC.DIFFS[st.diff], s = st, my = runToken;
    st = null;
    await zoomOut();
    $("arc-skip").hidden = false;
    S.laptop = "back"; S.trader.mood = "tired";
    await wait(400);
    await tween(S.trader, "phone", 1, 500);
    if (promoted) {
      S.trader.mood = "happy";
      await say("Trader", "*Suena su teléfono.* ¿Aló? … ¿En serio? … ¡Gracias, jefe!");
      await tween(S.trader, "phone", 0, 300);
      S.trader.mood = "joy"; S.trader.pose = "stand"; await tween(S.trader, "y", 44, 350); await tween(S.trader, "arms", 1, 300);
      for (let i = 0; i < 90; i++) S.confetti.push({ x: Math.random() * W, y: -Math.random() * 80, vy: 20 + Math.random() * 30, p: Math.random() * 6, c: [C.amber, C.cyan, C.good, C.bad, C.shirt][i % 5] });
      sfx("win");
      await say("Trader", "¡Me ascendieron a jefe de mesa! Esta ronda la pago yo, socio.");
      S.bart.talk = true; await say("Cantinero", "¡Salud por eso!");
    } else {
      S.trader.mood = "sweat";
      await say("Trader", "*Suena su teléfono.* ¿Aló? … Sí, jefe. … Entiendo. …");
      await tween(S.trader, "phone", 0, 300);
      S.trader.mood = "sad"; S.cloud = true; sfx("lose");
      await say("Trader", "Me despidieron. Dicen que no vuelva el lunes.");
      S.laptop = "none"; S.trader.box = true; S.trader.pose = "stand"; await tween(S.trader, "y", 44, 350);
      await say("Cantinero", "…Ese trago lo invita la casa.");
      await tween(S, "door", 1, 300); S.trader.pose = "walk"; S.cloud = true;
      await tween(S.trader, "x", 298, 1800, k => k); S.trader.pose = "none"; S.cloud = false; await tween(S, "door", 0, 300);
    }
    if (my !== runToken) return;
    hideDialog(); $("arc-skip").hidden = true; skipping = false;
    const stars = promoted ? (s.errors === 0 ? 3 : s.errors === 1 ? 2 : 1) : 0;
    const res = { score: s.score, completed: promoted, stars, missed: s.missed, correct: s.correct, answered: s.i + 1 };
    const rec = window.Store && profile ? Store.recordLevel(profile, "arcade-" + s.diff, res) : { best: s.score };
    $("arc-res-eyebrow").textContent = `${D.name} · ${run.title}`;
    $("arc-res-title").textContent = promoted ? "¡Lo ascendieron!" : "Lo despidieron";
    $("arc-res-text").textContent = promoted
      ? (s.errors ? `Terminaste el programa con ${s.errors} error${s.errors > 1 ? "es" : ""}.` : "Programa perfecto, sin un solo error.")
      : `Se pasó del margen de ${D.strikes} error${D.strikes > 1 ? "es" : ""}. Los errores quedaron en "Repasar errores" con su explicación.`;
    $("arc-res-stars").innerHTML = [0, 1, 2].map(i => (i < stars ? "★" : '<span class="off">★</span>')).join("");
    $("arc-res-score").textContent = s.score; $("arc-res-acc").textContent = `${s.correct}/${s.i + 1}`; $("arc-res-best").textContent = rec.best;
    $("arc-result").hidden = false; $("arc-result").dataset.diff = s.diff;
    $("arc-result").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];

  /* ---------- controles ---------- */
  function bind() {
    $("arc-back").addEventListener("click", () => {
      if (!$("arc-menu").hidden || !$("arc-result").hidden) { stop(); onBack && onBack(); return; }
      if (st) clearInterval(st.timer);
      skipping = true; setTimeout(showMenu, 30);
    });
    document.querySelectorAll("[data-arc-diff]").forEach(b => b.addEventListener("click", () => play(b.dataset.arcDiff)));
    $("arc-skip").addEventListener("click", () => { skipping = true; advance(); });
    $("arc-dialog").addEventListener("click", e => { if (!e.target.closest("button")) advance(); });
    $("pc-next").addEventListener("click", next);
    $("arc-again").addEventListener("click", () => play($("arc-result").dataset.diff));
    $("arc-levels").addEventListener("click", showMenu);
    $("arc-hub").addEventListener("click", () => { stop(); onBack && onBack(); });
    window.addEventListener("keydown", e => {
      if ($("screen-arcade").hidden || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
      const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, KeyA: 0, KeyB: 1, KeyC: 2, KeyD: 3 }[e.code];
      if (!$("arc-pc").hidden && st) {
        if (n !== undefined && !st.answered) { e.preventDefault(); answer(n); }
        else if ((e.code === "Enter" || e.code === "Space") && st.answered && !e.repeat) { e.preventDefault(); next(); }
        return;
      }
      if (!$("arc-dialog").hidden && sayDone) {
        if (sayDone.choices && n !== undefined && n < sayDone.choices && e.code.startsWith("Digit")) { e.preventDefault(); $("arc-choices").children[n].click(); }
        else if ((e.code === "Enter" || e.code === "Space") && !e.repeat) { e.preventDefault(); advance(); }
      }
    });
  }
  function stop() { if (st) clearInterval(st.timer); st = null; skipping = true; sayDone = null; if (typing) clearInterval(typing); setTimeout(() => { skipping = false; }, 50); }

  bind();
  window.Arcade = { open, stop, _state: () => ({ S, st, run }) };
})();
