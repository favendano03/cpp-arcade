/* intro.js — Video de bienvenida de la Campaña (≈70 s, se puede saltar).
   Es una escena en pixel art que se dibuja en vivo, no un archivo de video: así pesa poco, se ve nítida en
   cualquier pantalla y queda en el mismo estilo que la taberna del modo Arcade.

   Cómo está armado:
   - LINES es el guion. Cada frase tiene un id y su texto (lo que se lee en los subtítulos).
   - La narración, si existe, viene de js/intro-voice.js (window.INTRO_VOICE): la ruta del mp3 y, para cada
     frase, cuándo empieza, cuándo termina y en qué segundo se dice cada palabra. Con eso las animaciones
     caen justo en la palabra ("videojuegos", "cohetes", "funciones"...). Sin ese archivo, los tiempos se
     estiman por largo de texto y la intro corre igual, solo con subtítulos.
   - El reloj es el audio: si la voz se atrasa o el navegador la pausa, la animación la espera.
   - Se dibuja en dos lienzos de 320×180: la pieza (`room`) y lo que muestra el monitor (`scr`). La cámara se
     acerca al monitor y su contenido se pinta encima ya escalado, para que el texto se vea nítido. */
(function () {
  "use strict";
  const W = 320, H = 180, UP = 4;
  const SCR = { x: 150, y: 68, w: 64, h: 36 };              // la pantalla del monitor dentro de la pieza
  const ZOOM = 4.7;                                          // acercamiento máximo: el monitor llena el cuadro
  const reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const LINES = [
    { id: "pago", text: "Cada vez que pagas con tarjeta, compras una acción o miras un gráfico de la bolsa, hay código trabajando a toda velocidad." },
    { id: "cpp", text: "Gran parte de ese código está escrito en C++, un lenguaje creado en 1985 por Bjarne Stroustrup." },
    { id: "mem", text: "Su gracia es que habla casi directo con la máquina: tú decides cómo se usa cada byte de memoria." },
    { id: "rapido", text: "Por eso es tan rápido, y por eso mueve videojuegos, navegadores, sistemas operativos y hasta cohetes." },
    { id: "fin", text: "En finanzas, la velocidad es dinero. Bancos y fondos lo usan para ejecutar órdenes en millonésimas de segundo, valorar bonos y opciones, y simular miles de escenarios de riesgo." },
    { id: "datos", text: "Y en el análisis de datos, muchas librerías que usas desde Python corren por dentro en C y C++." },
    { id: "ia", text: "Hoy, una inteligencia artificial escribe código en segundos." },
    { id: "quien", text: "Pero alguien tiene que saber si ese código es correcto, si es eficiente y si va a fallar con la plata de un cliente." },
    { id: "diseno", text: "Ese alguien entiende cómo funciona la máquina. Saber diseñar en C++ te da justamente eso." },
    { id: "campana", text: "Esta campaña te lleva paso a paso: estructuras, funciones, arreglos y memoria. ¿Listo? Empecemos." }
  ];
  // Lo que se le manda a la voz: "C++" se lee "C más más".
  const spoken = s => s.replace(/C\+\+/g, "C más más");
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9+ñ]/g, "");
  const words = s => s.split(/\s+/).filter(Boolean);

  /* ---------------- tiempos ---------------- */
  let TL = null;
  function buildTimeline() {
    const V = window.INTRO_VOICE;
    const lines = [];
    if (V && V.lines && V.lines.length === LINES.length) {
      LINES.forEach((l, i) => lines.push({ id: l.id, text: l.text, start: V.lines[i].start, end: V.lines[i].end, w: V.lines[i].words || null }));
      return { lines, total: V.total || lines[lines.length - 1].end + 1.2, audio: V.src || null };
    }
    let t = 0.8;
    LINES.forEach(l => { const d = l.text.length / 15.5; lines.push({ id: l.id, text: l.text, start: t, end: t + d, w: null }); t += d + 0.55; });
    return { lines, total: t + 0.8, audio: null };
  }
  const line = id => TL.lines.find(l => l.id === id);
  const T = id => line(id).start;
  // Segundo en que se dice una palabra de una frase (con la voz real, exacto; sin ella, estimado).
  function wordT(id, word, nth) {
    const l = line(id), ws = words(l.text), key = norm(word);
    let idx = -1, seen = 0;
    for (let i = 0; i < ws.length; i++) if (norm(ws[i]).startsWith(key) && seen++ === (nth || 0)) { idx = i; break; }
    if (idx < 0) return l.start;
    if (l.w && l.w[idx] != null) return l.w[idx];
    const off = ws.slice(0, idx).join(" ").length + (idx ? 1 : 0);
    return l.start + (l.end - l.start) * off / l.text.length;
  }

  /* ---------------- utilidades ---------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const easeOut = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const since = (t, t0, d) => clamp((t - t0) / (d || 1), 0, 1);       // 0→1 entre t0 y t0+d
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  function seeded(n) { let s = n * 2654435761 >>> 0; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9 >>> 0) / 4294967296); }

  const room = mk(W, H), scr = mk(W, H), map = mk(W, H);
  const rctx = room.getContext("2d"), sctx = scr.getContext("2d"), mctx = map.getContext("2d");
  const bigR = mk(W * UP, H * UP), bigS = mk(W * UP, H * UP), bigM = mk(W * UP, H * UP);
  [bigR, bigS, bigM].forEach(c => { c.getContext("2d").imageSmoothingEnabled = false; });
  let ctx = rctx;
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  function line2(x0, y0, x1, y1, c, w) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; w = w || 1;
    for (let i = 0; i <= n; i++) { const k = n ? i / n : 0; R(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, w, w, c); }
  }
  function disc(cx, cy, r, c) { for (let dy = -r; dy <= r; dy++) { const h = Math.round(Math.sqrt(r * r - dy * dy + r * 0.6)); R(cx - h, cy + dy, h * 2 + 1, 1, c); } }

  /* Letras de 3×5 (las mismas de la taberna, con símbolos de código y tildes). */
  const FONT = {
    A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", F: "111100110100100",
    G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111",
    M: "101111111101101", N: "110101101101101", O: "111101101101111", P: "110101110100100", Q: "010101101110011", R: "110101110101101",
    S: "011100010001110", T: "111010010010010", U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101",
    Y: "101101010010010", Z: "111001010100111",
    0: "010101101101010", 1: "010110010010111", 2: "110001010100111", 3: "110001010001110", 4: "101101111001001", 5: "111100110001110",
    6: "011100110101010", 7: "111001010010010", 8: "010101010101010", 9: "010101011001110",
    "!": "010010010000010", "¡": "010000010010010", "?": "110001010000010", "¿": "010000010100011", ".": "000000000000010",
    "+": "000010111010000", "-": "000000111000000", "$": "011110010011110", "%": "101001010100101", "▲": "000010111111000", "▼": "000111111010000",
    "'": "010010000000000", ",": "000000000010100", ":": "000010000010000", ";": "000010000010100", "(": "010100100100010",
    ")": "010001001001010", "{": "011010110010011", "}": "110010011010110", "<": "001010100010001", ">": "100010001010100",
    "=": "000111000111000", "/": "001001010100100", "*": "000101010101000", "&": "010101010101011", "#": "101111101111101",
    "_": "000000000000111", "\"": "101101000000000", "✓": "000001001101010", "·": "000000010000000", "[": "110100100100110", "]": "011001001001011"
  };
  const ACC = { "Á": "A", "É": "E", "Í": "I", "Ó": "O", "Ú": "U", "Ñ": "N" };
  function text(str, x, y, c, sc) {
    sc = sc || 1; let cx = Math.round(x);
    for (let ch of String(str).toUpperCase()) {
      const base = ACC[ch];
      if (base) { if (ch === "Ñ") R(cx, y - 2 * sc, 3 * sc, sc, c); else R(cx + sc, y - 2 * sc, 2 * sc, sc, c); ch = base; }
      const g = FONT[ch];
      if (g) for (let i = 0; i < 15; i++) if (g[i] === "1") R(cx + (i % 3) * sc, y + ((i / 3) | 0) * sc, sc, sc, c);
      cx += 4 * sc;
    }
  }
  const textW = (str, sc) => [...String(str)].length * 4 * (sc || 1) - (sc || 1);
  function textC(str, cx, y, c, sc, shadow) {
    const x = Math.round(cx - textW(str, sc) / 2);
    if (shadow) text(str, x + (sc || 1), y + (sc || 1), shadow, sc);
    text(str, x, y, c, sc);
  }
  // Texto que se escribe letra a letra (k de 0 a 1).
  const typed = (str, k) => str.slice(0, Math.floor(str.length * clamp(k, 0, 1)));

  const P = {
    wall: "#4d2f27", wallB: "#472b23", wallL: "#5a382d", trim: "#2d1b16",
    sky0: "#2b2550", sky1: "#40366e", sky2: "#6c4a7e", sky3: "#b8606a", sky4: "#e9905e",
    city: "#2a2148", cityB: "#352a58", win: "#ffd27a", frame: "#2a1a15", frameL: "#3d2820",
    desk: "#a8693c", deskL: "#c48550", deskD: "#7a4826", deskF: "#6a3d20", deskFD: "#55301a",
    mon: "#dacfb6", monD: "#b9ab8f", monDD: "#8e8068", bezel: "#2a2622",
    owl: "#b5743f", owlD: "#8b522c", owlL: "#cf9058", belly: "#f3dcb4", bellyD: "#d9b07c", face: "#f8ead0",
    eye: "#fffaf0", pupil: "#1c1410", beak: "#f2a33a", beakD: "#c47a1c",
    amber: "#ffb547", cyan: "#63d4e6", good: "#7ee08a", bad: "#ff6b6b", plum: "#b58cff", fg: "#f3e9dc", muted: "#a99bb1",
    ink: "#17121c", term: "#101418", termL: "#1a2128", termLine: "#24303a"
  };

  /* =====================================================================
     LA PIEZA: escritorio de noche, ventana a la ciudad, el búho y el monitor
     ===================================================================== */
  let roomBg = null;
  function buildRoom() {
    const c = mk(W, H), keep = ctx; ctx = c.getContext("2d");
    const rnd = seeded(5);
    // pared
    R(0, 0, W, 118, P.wall);
    for (let x = 0; x < W; x += 24) R(x, 0, 1, 118, P.wallB);
    for (let i = 0; i < 60; i++) R((rnd() * W) | 0, (rnd() * 112) | 0, 2, 1, "rgba(0,0,0,0.12)");
    R(0, 0, W, 4, P.trim);
    // ventana: cielo de atardecer con la ciudad (el distrito financiero) recortada
    const wx = 18, wy = 20, ww = 118, wh = 74;
    R(wx - 4, wy - 4, ww + 8, wh + 8, P.frame);
    const bands = [P.sky0, P.sky1, P.sky2, P.sky3, P.sky4];
    for (let y = 0; y < wh; y++) { const k = y / wh, i = Math.min(4, Math.floor(k * 5.2)); R(wx, wy + y, ww, 1, bands[i]); }
    for (let i = 0; i < 18; i++) R(wx + ((rnd() * ww) | 0), wy + ((rnd() * 28) | 0), 1, 1, "#e9e3ff");
    disc(wx + 92, wy + 13, 6, "#f4e7c4"); disc(wx + 95, wy + 11, 5, P.sky0);       // luna creciente
    const towers = [[0, 30, 14], [12, 44, 12], [22, 24, 10], [31, 52, 13], [43, 36, 11], [53, 60, 9], [61, 40, 14], [74, 28, 10], [83, 48, 12], [94, 34, 11], [104, 42, 14]];
    towers.forEach(([dx, h, w], i) => {
      const x = wx + dx, y = wy + wh - h;
      R(x, y, w, h, i % 2 ? P.city : P.cityB);
      if (i === 5) { R(x + 4, y - 8, 1, 8, P.city); R(x + 3, y - 9, 3, 1, "#ff6b6b"); }
      for (let yy = y + 3; yy < wy + wh - 3; yy += 4) for (let xx = x + 2; xx < x + w - 2; xx += 3) if (rnd() < 0.33) R(xx, yy, 1, 2, P.win);
    });
    // marco en cruz
    R(wx + ww / 2 - 2, wy, 4, wh, P.frame); R(wx, wy + 32, ww, 3, P.frame);
    R(wx - 4, wy - 4, ww + 8, 1, P.frameL);
    // repisa de la ventana con una planta chica
    R(wx - 8, wy + wh + 4, ww + 16, 4, P.deskD); R(wx - 8, wy + wh + 4, ww + 16, 1, P.deskL);
    R(wx + 6, wy + wh - 2, 8, 6, "#c0603a"); R(wx + 6, wy + wh - 2, 8, 1, "#d8784e");
    [[0, -6], [3, -9], [5, -5], [-2, -4]].forEach(([dx, h]) => R(wx + 9 + dx, wy + wh - 2 + h, 2, -h, dx % 2 ? "#4e7a35" : "#6f9a4a"));
    // calendario
    R(250, 26, 30, 32, "#efe6d6"); R(250, 26, 30, 8, "#c94a3a"); R(250, 57, 30, 1, "#c9bda8");
    text("NOV", 259, 28, "#fff3e6", 1);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) R(253 + k * 5, 38 + r * 4, 3, 2, r === 2 && k === 2 ? "#c94a3a" : "#c9bda8");
    R(264, 24, 2, 3, P.trim);
    // estante con libros sobre el escritorio (derecha)
    R(222, 64, 46, 3, P.deskD); R(222, 64, 46, 1, P.deskL);
    [["#b8443a", 9], ["#3f6fb0", 7], ["#e0b050", 10], ["#5e8e4a", 8], ["#8c5bb0", 9]].forEach(([c, h], i) => { R(226 + i * 6, 64 - h, 5, h, c); R(226 + i * 6, 64 - h + 2, 5, 1, "rgba(255,255,255,0.25)"); });
    // escritorio
    R(0, 112, W, 14, P.desk); R(0, 112, W, 1, P.deskL);
    for (let i = 0; i < 26; i++) R((rnd() * W) | 0, 114 + ((rnd() * 10) | 0), 6 + ((rnd() * 10) | 0), 1, "rgba(90,50,20,0.25)");
    R(0, 126, W, 4, P.deskD); R(0, 130, W, 50, P.deskF);
    for (let x = 10; x < W; x += 100) { R(x, 136, 86, 36, P.deskFD); R(x + 1, 137, 84, 34, P.deskF); R(x + 38, 152, 10, 2, "#c99a52"); }
    ctx = keep;
    return c;
  }

  function drawLights(t) {   // guirnalda de ampolletas tibias
    R(0, 9, W, 1, "#2a1a14");
    const cols = ["#ffcf6b", "#ff9a4a", "#f6e7b0", "#ffb547"];
    for (let i = 0, x = 6; x < W; x += 15, i++) {
      const sag = Math.round(Math.sin((x / W) * Math.PI * 6) * 2);
      const on = reduce ? 1 : 0.55 + 0.45 * Math.sin(t * 2 + i * 1.7);
      R(x, 9 + sag, 1, 2, "#2a1a14");
      ctx.globalAlpha = 0.35 + 0.65 * on; R(x - 1, 11 + sag, 3, 4, cols[i % 4]); ctx.globalAlpha = 1;
      if (on > 0.8) { ctx.globalAlpha = 0.18; R(x - 3, 9 + sag, 7, 8, cols[i % 4]); ctx.globalAlpha = 1; }
    }
  }

  function drawMonitor() {
    const x = SCR.x - 6, y = SCR.y - 6, w = SCR.w + 12, h = SCR.h + 13;
    R(x + 10, y - 3, w - 20, 4, P.monD);                           // lomo del CRT asomando
    R(x, y, w, h, P.mon); R(x, y, w, 1, "#ece4d0"); R(x, y + h - 1, w, 1, P.monDD); R(x + w - 1, y, 1, h, P.monD);
    R(SCR.x - 2, SCR.y - 2, SCR.w + 4, SCR.h + 4, P.bezel);
    R(SCR.x, SCR.y, SCR.w, SCR.h, P.term);
    for (let i = 0; i < 6; i++) R(x + 6 + i * 3, y + h - 4, 2, 1, P.monDD);      // rejilla
    R(x + w - 10, y + h - 5, 3, 2, "#7ee08a");                                    // luz de encendido
    R(x + w / 2 - 10, y + h, 20, 4, P.monD); R(x + w / 2 - 18, y + h + 3, 36, 3, P.mon); R(x + w / 2 - 18, y + h + 5, 36, 1, P.monDD);
    // teclado
    R(156, 118, 52, 5, "#cfc3a8"); R(156, 122, 52, 1, P.monDD);
    for (let r = 0; r < 2; r++) for (let k = 0; k < 12; k++) R(158 + k * 4, 119 + r * 2, 3, 1, "#a99d84");
  }

  function drawMug(t) {
    R(118, 105, 9, 9, "#e9e2d0"); R(118, 105, 9, 1, "#fffaf0"); R(127, 107, 2, 5, "#e9e2d0"); R(119, 106, 7, 1, "#5a3420");
    R(120, 109, 5, 2, "#c94a3a");
    if (!reduce) for (let i = 0; i < 3; i++) {
      const k = (t * 0.6 + i / 3) % 1;
      ctx.globalAlpha = 0.45 * (1 - k); R(121 + Math.sin(t * 3 + i * 2) * 2 + i, 103 - k * 14, 1, 2, "#f4ece0"); ctx.globalAlpha = 1;
    }
  }

  function drawLamp() {
    R(292, 108, 18, 4, "#2a1c16"); R(300, 58, 2, 50, "#2a1c16");
    R(286, 48, 24, 10, "#efe2c4"); R(288, 46, 20, 2, "#efe2c4"); R(286, 57, 24, 1, "#c9b896");
    R(296, 58, 6, 1, "#fff2c4");
  }

  // Libros apilados donde se para el búho.
  function drawBooks() {
    R(236, 106, 34, 6, "#b8443a"); R(236, 106, 34, 1, "#d8665a"); R(266, 106, 4, 6, "#efe6d6");
    R(238, 100, 30, 6, "#3f6fb0"); R(238, 100, 30, 1, "#5f8fd0"); R(238, 100, 3, 6, "#efe6d6");
    R(240, 95, 26, 5, "#e0b050"); R(240, 95, 26, 1, "#f2cc74"); R(262, 95, 4, 5, "#efe6d6");
  }

  /* El búho: la mascota de la intro (personaje propio). Origen: entre las patas. */
  function owl(x, y, o) {
    o = o || {};
    const bob = Math.round(o.bob || 0); y = Math.round(y) - bob; x = Math.round(x);
    const rows = [6, 8, 9, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 9, 8, 6];
    rows.forEach((hw, i) => R(x - hw, y - 24 + i, hw * 2, 1, P.owl));
    R(x - 11, y - 14, 2, 10, P.owlD); R(x + 9, y - 14, 2, 10, P.owlD);
    R(x - 10, y - 28, 3, 4, P.owlD); R(x - 9, y - 29, 2, 1, P.owlD); R(x + 7, y - 28, 3, 4, P.owlD); R(x + 7, y - 29, 2, 1, P.owlD);
    R(x - 8, y - 24, 16, 1, P.owlL);
    // panza con plumas en V
    [4, 6, 7, 7, 7, 7, 6, 5, 3].forEach((hw, i) => R(x - hw, y - 12 + i, hw * 2, 1, P.belly));
    for (let r = 0; r < 3; r++) for (let k = -1; k <= 1; k++) { R(x + k * 4 - 1 + (r & 1) * 2, y - 10 + r * 3, 1, 1, P.bellyD); R(x + k * 4 + (r & 1) * 2, y - 9 + r * 3, 1, 1, P.bellyD); }
    // cara: dos discos claros, ojos grandes
    const eyeY = y - 19, look = clamp(o.look || 0, -1, 1), up = o.up || 0;
    [-5, 5].forEach(dx => {
      [2, 3, 4, 4, 4, 3, 2].forEach((hw, i) => R(x + dx - hw, eyeY - 3 + i, hw * 2, 1, P.face));
      if (o.blink) { R(x + dx - 3, eyeY, 6, 1, P.owlD); }
      else {
        [1, 2, 2, 2, 1].forEach((hw, i) => R(x + dx - hw - 0, eyeY - 2 + i, hw * 2, 1, P.eye));
        R(x + dx - 1 + Math.round(look * 1.4), eyeY - 1 + Math.round(up), 2, 2, P.pupil);
        R(x + dx - 1 + Math.round(look * 1.4), eyeY - 1 + Math.round(up), 1, 1, "#ffffff");
      }
    });
    R(x - 1, y - 16, 2, 2, P.beak); R(x - 1, y - 14, 2, 1, P.beakD);
    // ala derecha: levantada para saludar o apuntar
    const wg = clamp(o.wing || 0, 0, 1);
    if (wg > 0.05) {
      const ex = x + 11 + wg * 5, ey = y - 10 - wg * 12;
      line2(x + 9, y - 12, ex, ey, P.owlD, 3); R(ex, ey - 1, 3, 3, P.owl);
    }
    // patas
    R(x - 6, y - 2, 4, 2, P.beak); R(x + 2, y - 2, 4, 2, P.beak);
    R(x - 6, y, 1, 1, P.beakD); R(x - 3, y, 1, 1, P.beakD); R(x + 2, y, 1, 1, P.beakD); R(x + 5, y, 1, 1, P.beakD);
    if (o.glasses) { R(x - 9, eyeY - 3, 8, 1, "#2a1a14"); R(x + 1, eyeY - 3, 8, 1, "#2a1a14"); R(x - 1, eyeY - 2, 2, 1, "#2a1a14"); }
  }

  // Estado del búho según el momento de la intro.
  function owlPose(t) {
    const blink = !reduce && (t % 3.7) < 0.12;
    const bob = reduce ? 0 : Math.max(0, Math.sin(t * 2.2)) * 0.9;
    let look = -1, up = 0.4, wing = 0;
    if (t < 1.4) look = lerp(0, -1, since(t, 0.6, 0.8));                        // mira la cámara y luego el monitor
    const dz = T("diseno");
    if (t > dz + 0.6) { look = lerp(-1, 0, since(t, dz + 0.6, 0.5)); up = 0; }  // se da vuelta hacia nosotros
    if (t > wordT("diseno", "saber") - 0.2) wing = ease(since(t, wordT("diseno", "saber") - 0.2, 0.4)) * (0.8 + 0.2 * Math.sin(t * 6));
    return { look, up, blink, bob, wing, glasses: true };
  }

  function drawRoom(t) {
    ctx = rctx;
    if (!roomBg) roomBg = buildRoom();
    ctx.drawImage(roomBg, 0, 0);
    drawLights(t);
    drawLamp();
    drawMonitor();
    drawMug(t);
    drawBooks();
    owl(253, 95, owlPose(t));
    // luz: todo un poco más oscuro, con la lámpara y el monitor como focos tibios
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "#9a8494"; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    const g1 = ctx.createRadialGradient(298, 70, 2, 298, 90, 90);
    g1.addColorStop(0, "rgba(255,190,110,0.45)"); g1.addColorStop(1, "rgba(255,190,110,0)");
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
    const tint = screenTint(t), g2 = ctx.createRadialGradient(182, 86, 4, 182, 96, 80);
    g2.addColorStop(0, `rgba(${tint},0.28)`); g2.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    // viñeta
    const v = ctx.createRadialGradient(W / 2, H / 2, 70, W / 2, H / 2, 200);
    v.addColorStop(0, "rgba(10,5,10,0)"); v.addColorStop(1, "rgba(10,5,10,0.55)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  function screenTint(t) {
    const id = currentId(t);
    return id === "fin" ? "126,224,138" : id === "quien" ? "255,120,110" : id === "pago" ? "255,190,100" : "120,210,230";
  }

  /* =====================================================================
     LO QUE MUESTRA EL MONITOR (un cuadro por frase del guion)
     ===================================================================== */
  function termBg(title, t) {
    R(0, 0, W, H, P.term);
    for (let y = 0; y < H; y += 12) R(0, y, W, 1, "rgba(255,255,255,0.025)");
    R(0, 0, W, 14, P.termL); R(0, 14, W, 1, P.termLine);
    [P.bad, P.amber, P.good].forEach((c, i) => R(8 + i * 8, 5, 4, 4, c));
    if (title) text(title, 40, 5, P.muted, 1);
  }

  function scrPago(t) {
    const l = line("pago"), t1 = wordT("pago", "compras"), t2 = wordT("pago", "miras"), t3 = wordT("pago", "hay");
    termBg("", t);
    if (t < t1) {          // pago con tarjeta
      const k = easeOut(since(t, l.start, 0.6)), x = lerp(-90, 100, k);
      R(x + 4, 50, 120, 76, "rgba(0,0,0,0.35)");
      R(x, 46, 120, 76, "#e8a33c"); R(x, 46, 120, 3, "#ffd27a"); R(x, 62, 120, 12, "#8a5a1c");
      R(x + 12, 82, 22, 16, "#f6d77a"); R(x + 14, 86, 18, 1, "#c99a3a"); R(x + 14, 90, 18, 1, "#c99a3a");
      text("**** 4021", x + 44, 100, "#5a3410", 2);
      const ok = since(t, l.start + 1.0, 0.3);
      if (ok > 0) { ctx.globalAlpha = ok; R(232, 66, 60, 48, "#1d3a24"); textC("✓", 262, 72, P.good, 5); textC("PAGO OK", 262, 102, P.good, 1); ctx.globalAlpha = 1; }
    } else if (t < t2) {   // orden de compra
      textC("COMPRAR", 160, 40, P.fg, 4);
      textC("100 ACCIONES", 160, 76, P.amber, 3);
      const blink = Math.sin(t * 10) > 0;
      R(100, 112, 120, 30, blink ? P.good : "#4fa05a"); textC("ENVIAR", 160, 120, P.ink, 3);
    } else {               // gráfico que sube
      const k = since(t, t2, (l.end - t2) + 1.5);
      R(20, 30, 280, 130, "#141a1f");
      for (let y = 40; y < 160; y += 20) R(20, y, 280, 1, P.termLine);
      let v = 120; const rnd = seeded(3), n = Math.floor(lerp(8, 56, k)), pts = [];
      for (let i = 0; i < 56; i++) { v = clamp(v - (rnd() - 0.42) * 12, 50, 150); pts.push(v); }
      for (let i = 1; i < n; i++) line2(24 + (i - 1) * 5, pts[i - 1], 24 + i * 5, pts[i], P.good, 2);
      R(24 + (n - 1) * 5 - 2, pts[n - 1] - 2, 5, 5, "#fff");
      text("+2,4% ▲", 220, 36, P.good, 2);
      if (t > t3) { const a = since(t, t3, 0.3); ctx.globalAlpha = a; R(60, 150, 200, 20, "rgba(0,0,0,0.6)"); textC("CODIGO A TODA VELOCIDAD", 160, 156, P.cyan, 2); ctx.globalAlpha = 1; }
    }
  }

  const CODE = [
    ["#include <iostream>", P.plum],
    ["int main() {", P.cyan],
    ["  double precio = 99.5;", P.fg],
    ["  std::cout << precio;", P.fg],
    ["  return 0;", P.amber],
    ["}", P.cyan]
  ];
  function scrCpp(t) {
    const l = line("cpp"), t0 = l.start;
    termBg("MAIN.CPP", t);
    // el logo: un "C++" grande que cae y rebota
    const k = since(t, wordT("cpp", "c++") - 0.25, 0.5), drop = easeOut(k);
    const y = Math.round(lerp(-50, 26, drop) - Math.sin(k * Math.PI) * 4);
    if (k > 0) {
      R(98, y - 6, 124, 60, "#22324a"); R(98, y - 6, 124, 2, "#4a7ac0"); R(98, y + 52, 124, 2, "#16243a");
      textC("C++", 160 + 3, y + 3, "#0c1424", 11); textC("C++", 160, y, "#7fb2ff", 11);
    }
    const t85 = wordT("cpp", "1985");
    if (t > t85 - 0.1) { const a = since(t, t85 - 0.1, 0.25); ctx.globalAlpha = a; textC("1985", 160, 98, P.amber, 4); ctx.globalAlpha = 1; }
    const tb = wordT("cpp", "bjarne");
    if (t > tb - 0.1) textC(typed("BJARNE STROUSTRUP", since(t, tb - 0.1, 0.9)), 160, 126, P.fg, 2);
    // código que se va escribiendo abajo, chiquito
    // antes del logo: el código de un programa mínimo, grande y escribiéndose
    const kpre = 1 - since(t, wordT("cpp", "c++") - 0.4, 0.3);
    if (kpre > 0) {
      ctx.globalAlpha = kpre; let left = Math.floor(since(t, t0 - 0.4, 1.6) * 80);
      CODE.forEach(([s, c], i) => { const n = Math.min(s.length, Math.max(0, left)); left -= s.length; if (n > 0) text(s.slice(0, n), 40, 34 + i * 16, c, 2); });
      ctx.globalAlpha = 1;
    }
    const kc = since(t, t0 + 0.3, l.end - t0);
    const lineNow = CODE.map(x => x[0]).join("  ").slice(0, Math.floor(kc * 60));
    R(0, 150, W, 30, "#0c1013"); text(lineNow, 10, 160, P.muted, 1);
    if (Math.sin(t * 8) > 0) R(10 + textW(lineNow, 1) + 2, 159, 3, 7, P.amber);
  }

  function scrMem(t) {
    const l = line("mem");
    termBg("MEMORIA", t);
    const tm = wordT("mem", "maquina"), tb = wordT("mem", "byte"), td = wordT("mem", "decides");
    textC("TU PROGRAMA", 160, 24, P.fg, 2);
    // flecha directa a la máquina
    const ka = since(t, l.start + 0.2, tm - l.start);
    R(60, 40, 200 * ka, 2, P.amber); if (ka > 0.98) { R(256, 37, 3, 8, P.amber); R(259, 39, 2, 4, P.amber); }
    textC("MAQUINA", 160, 46, ka > 0.98 ? P.amber : P.muted, 2);
    // la grilla de memoria: 8×4 casillas con dirección
    const cols = 8, rows = 4, cw = 32, ch = 20, gx = 172 - cols * cw / 2, gy = 66;
    const rnd = seeded(9), hex = "0123456789ABCDEF";
    const filled = Math.floor(clamp((t - td) / Math.max(0.5, tb - td), 0, 1) * cols * rows);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, x = gx + c * cw, y = gy + r * ch;
      const val = hex[(rnd() * 16) | 0] + hex[(rnd() * 16) | 0];
      R(x + 1, y + 1, cw - 2, ch - 2, i < filled ? "#1d3140" : "#151b21");
      R(x + 1, y + 1, cw - 2, 1, i < filled ? "#2f5266" : P.termLine);
      if (i < filled) text(val, x + 12, y + 8, P.cyan, 1);
      if (i === filled && t > td && filled < cols * rows) { R(x + 1, y + 1, cw - 2, ch - 2, "#3a3018"); R(x + 1, y + ch - 3, cw - 2, 2, P.amber); }
    }
    for (let r = 0; r < rows; r++) text("0X" + (r * 8).toString(16).toUpperCase().padStart(2, "0"), gx - 24, gy + r * ch + 8, P.muted, 1);
    if (t > tb - 0.1) {     // zoom a un byte: 8 bits
      const k = easeOut(since(t, tb - 0.1, 0.4));
      ctx.globalAlpha = k;
      R(70, 150, 180, 22, "#0c1013"); R(70, 150, 180, 1, P.amber);
      "01001011".split("").forEach((b, i) => { R(78 + i * 15, 154, 12, 14, b === "1" ? "#3a3018" : "#151b21"); text(b, 82 + i * 15, 158, b === "1" ? P.amber : P.muted, 1); });
      text("= 1 BYTE", 202, 158, P.fg, 1);
      ctx.globalAlpha = 1;
    }
  }

  function icon(kind, cx, cy, t, k) {
    const s = Math.round(lerp(0, 1, easeOut(k)) * 100) / 100; if (s <= 0) return;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
    if (kind === "game") {
      R(cx - 24, cy - 10, 48, 22, "#c94a6a"); R(cx - 28, cy - 4, 8, 18, "#c94a6a"); R(cx + 20, cy - 4, 8, 18, "#c94a6a"); R(cx - 24, cy - 10, 48, 2, "#e8708a");
      R(cx - 18, cy - 2, 10, 3, "#2a1a20"); R(cx - 15, cy - 5, 3, 10, "#2a1a20");
      R(cx + 10, cy - 4, 4, 4, P.amber); R(cx + 16, cy, 4, 4, P.cyan);
    } else if (kind === "web") {
      R(cx - 26, cy - 18, 52, 38, "#e9e2d0"); R(cx - 26, cy - 18, 52, 7, "#6c7a90");
      [P.bad, P.amber, P.good].forEach((c, i) => R(cx - 23 + i * 5, cy - 16, 3, 3, c));
      disc(cx, cy + 4, 11, "#3f8fd0"); R(cx - 6, cy - 3, 6, 5, "#5ec07a"); R(cx + 2, cy + 6, 6, 6, "#5ec07a"); R(cx - 11, cy + 4, 22, 1, "rgba(255,255,255,0.4)");
    } else if (kind === "os") {
      R(cx - 26, cy - 18, 52, 36, "#2a2f3a"); R(cx - 26, cy + 18, 52, 4, "#4a5266");
      R(cx - 20, cy - 12, 18, 13, P.cyan); R(cx + 2, cy - 12, 18, 13, P.plum); R(cx - 20, cy + 3, 18, 11, P.amber); R(cx + 2, cy + 3, 18, 11, P.good);
    } else if (kind === "rocket") {
      const fly = clamp(k - 1, 0, 2) * 40; cy -= fly;
      R(cx - 6, cy - 20, 12, 30, "#e9e2d0"); R(cx - 4, cy - 26, 8, 6, "#e9e2d0"); R(cx - 2, cy - 29, 4, 3, "#c94a3a");
      disc(cx, cy - 10, 3, P.cyan); R(cx - 12, cy + 2, 6, 10, "#c94a3a"); R(cx + 6, cy + 2, 6, 10, "#c94a3a");
      for (let i = 0; i < 4; i++) R(cx - 4 + ((t * 40 + i * 3) % 8), cy + 10 + i * 3, 2, 3, i % 2 ? P.amber : "#ff7a3a");
    }
    ctx.restore();
  }
  function scrRapido(t) {
    const l = line("rapido");
    termBg("RENDIMIENTO", t);
    // líneas de velocidad
    const rnd = seeded(4);
    for (let i = 0; i < 26; i++) { const y = (rnd() * H) | 0, sp = 200 + rnd() * 300, x = (W - ((t * sp + rnd() * 600) % (W + 80))); R(x, y, 30 + rnd() * 40, 1, "rgba(99,212,230,0.25)"); }
    textC("RAPIDO", 160, 24, P.amber, 4);
    const kinds = [["game", "videojuegos", "JUEGOS"], ["web", "navegadores", "NAVEGADOR"], ["os", "sistemas", "SISTEMAS"], ["rocket", "cohetes", "COHETES"]];
    kinds.forEach(([k, w, lab], i) => {
      const tw = wordT("rapido", w), kk = since(t, tw - 0.1, 0.35) + (k === "rocket" ? since(t, tw + 0.5, 1.5) * 2 : 0);
      const cx = 46 + i * 76, cy = 96;
      if (t > tw - 0.1) { R(cx - 34, 62, 68, 82, "rgba(255,255,255,0.04)"); icon(k, cx, cy, t, kk); textC(lab, cx, 134, P.fg, 1); }
    });
  }

  function scrFin(t) {
    const l = line("fin");
    const tv = wordT("fin", "velocidad"), te = wordT("fin", "ejecutar"), tbo = wordT("fin", "valorar"), ts = wordT("fin", "simular");
    termBg("MESA DE DINERO", t);
    if (t < te - 0.2) {
      textC("LA VELOCIDAD", 160, 50, P.fg, 4); textC("ES DINERO", 160, 82, P.good, 4);
      const rnd = seeded(6);
      for (let i = 0; i < 14; i++) { const x = 20 + rnd() * 280, y = (130 + ((t - tv) * (30 + rnd() * 30) * -1 + rnd() * 50) % 60 + 60) % 60 + 110; text("$", x, y, i % 2 ? P.good : P.amber, 2); }
    } else if (t < tbo - 0.2) {
      // la orden se ejecuta y el cronómetro marca microsegundos
      textC("ORDEN: COMPRA 500", 160, 34, P.fg, 2);
      const k = since(t, te, 0.9), us = Math.round(lerp(0, 4, k));
      R(70, 58, 180, 50, "#0c1013"); R(70, 58, 180, 1, P.good);
      textC("0,00000" + us + " S", 160, 72, P.good, 4);
      if (k >= 1) textC("EJECUTADA ✓", 160, 118, P.good, 2);
      // libro de órdenes que tiembla
      for (let i = 0; i < 6; i++) { const w = 20 + ((Math.sin(t * 9 + i) + 1) * 30); R(70, 136 + i * 6, w, 4, "rgba(126,224,138,0.5)"); R(250 - w, 136 + i * 6, w, 4, "rgba(255,107,107,0.5)"); }
    } else if (t < ts - 0.2) {
      const kb = easeOut(since(t, tbo, 0.4)), ko = easeOut(since(t, wordT("fin", "opciones") - 0.1, 0.4));
      if (kb > 0) { R(lerp(-140, 24, kb), 40, 130, 100, "#1c2733"); text("BONO", lerp(-140, 24, kb) + 12, 52, P.cyan, 3); text("CUPON 5%", lerp(-140, 24, kb) + 12, 82, P.fg, 2); text("P = 98,4", lerp(-140, 24, kb) + 12, 108, P.amber, 2); }
      if (ko > 0) { R(lerp(340, 166, ko), 40, 130, 100, "#2a1f33"); text("OPCION", lerp(340, 166, ko) + 12, 52, P.plum, 3); text("CALL K=100", lerp(340, 166, ko) + 12, 82, P.fg, 2); text("C = 7,13", lerp(340, 166, ko) + 12, 108, P.amber, 2); }
    } else {
      // muchos escenarios de riesgo (Monte Carlo) dibujándose de a poco
      const k = since(t, ts, Math.max(1.5, l.end - ts + 0.4));
      R(16, 24, 288, 130, "#141a1f"); R(16, 89, 288, 1, P.termLine);
      const n = 40, steps = 54, shown = Math.floor(k * steps);
      for (let p = 0; p < n; p++) {
        const r = seeded(100 + p); let v = 89, x = 18;
        const c = p % 5 === 0 ? "rgba(255,107,107,0.8)" : p % 3 === 0 ? "rgba(255,181,71,0.6)" : "rgba(99,212,230,0.45)";
        for (let s = 0; s < shown; s++) { const nv = v + (r() - 0.5) * 7; line2(x, v, x + 5, nv, c); v = nv; x += 5; }
      }
      textC("10.000 ESCENARIOS", 160, 160, P.amber, 2);
    }
  }

  function scrDatos(t) {
    const l = line("datos");
    termBg("ANALISIS DE DATOS", t);
    const tp = wordT("datos", "python"), tc = wordT("datos", "dentro");
    // tablero con barras y un KPI
    const k = since(t, l.start, 1.2);
    const bars = [40, 62, 50, 78, 70, 92];
    bars.forEach((h, i) => { const hh = Math.round(h * easeOut(k - i * 0.06)); R(20 + i * 18, 150 - hh, 12, hh, i === 5 ? P.amber : P.cyan); });
    R(16, 150, 112, 1, P.muted);
    text("VENTAS", 20, 24, P.muted, 1); text("+18%", 20, 34, P.good, 3);
    // la caja "Python" que se abre y muestra el motor en C/C++ adentro
    const kp = easeOut(since(t, tp - 0.2, 0.4)), open = easeOut(since(t, tc - 0.1, 0.5));
    if (kp > 0) {
      const bx = 160, by = 70, bw = 140, bh = 86;
      ctx.globalAlpha = kp;
      if (open > 0) {   // el motor brilla adentro
        R(bx + 6, by + 6, bw - 12, bh - 12, "#0e1a26");
        const rot = t * 3;
        for (let a = 0; a < 8; a++) { const ang = rot + a * Math.PI / 4; R(bx + bw / 2 + Math.cos(ang) * 22 - 4, by + bh / 2 + Math.sin(ang) * 22 - 4, 8, 8, "#4a7ac0"); }
        disc(bx + bw / 2, by + bh / 2, 20, "#4a7ac0"); disc(bx + bw / 2, by + bh / 2, 14, "#22324a");
        textC("C++", bx + bw / 2, by + bh / 2 - 4, "#7fb2ff", 2);
      }
      // la tapa sube
      const lid = Math.round(open * 54);
      R(bx, by - lid, bw, 22, "#3a6ea5"); R(bx, by - lid, bw, 2, "#5f93cc"); R(bx, by + 20 - lid, bw, 2, "#e0b84a");
      textC("PYTHON", bx + bw / 2, by + 6 - lid, "#ffe08a", 2);
      R(bx, by + 22, 4, bh - 22, "#3a6ea5"); R(bx + bw - 4, by + 22, 4, bh - 22, "#3a6ea5"); R(bx, by + bh - 4, bw, 4, "#3a6ea5");
      if (open < 0.05) R(bx + 4, by + 22, bw - 8, bh - 26, "#2c5480");
      ctx.globalAlpha = 1;
    }
  }

  function bot(cx, cy, t) {
    R(cx - 1, cy - 30, 2, 8, P.muted); disc(cx, cy - 32, 3, Math.sin(t * 8) > 0 ? P.bad : P.amber);
    R(cx - 24, cy - 22, 48, 38, "#8d95a3"); R(cx - 24, cy - 22, 48, 2, "#aab2c0"); R(cx - 28, cy - 10, 4, 14, "#636b78"); R(cx + 24, cy - 10, 4, 14, "#636b78");
    R(cx - 18, cy - 14, 36, 18, "#17202a");
    const blink = (t % 2.4) < 0.1;
    R(cx - 12, cy - 9, 8, blink ? 1 : 7, P.cyan); R(cx + 4, cy - 9, 8, blink ? 1 : 7, P.cyan);
    R(cx - 10, cy + 8, 20, 3, "#636b78"); for (let i = 0; i < 4; i++) R(cx - 8 + i * 5, cy + 8, 2, 3, "#2a2f3a");
  }
  function codeRain(t, x0, y0, w, h, speed, seed, bug) {
    const rnd = seeded(seed), lineH = 9, n = Math.ceil(h / lineH) + 1, off = (t * speed) % lineH, base = Math.floor(t * speed / lineH);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    for (let i = 0; i < n; i++) {
      const r = seeded(seed * 31 + base + i), ind = ((r() * 3) | 0) * 8;
      let x = x0 + 6 + ind; const y = y0 + i * lineH - off;
      const parts = 1 + ((r() * 3) | 0);
      for (let p = 0; p < parts; p++) { const len = 8 + ((r() * 40) | 0); R(x, y + 2, len, 3, [P.cyan, P.fg, P.amber, P.plum][(r() * 4) | 0]); x += len + 5; }
    }
    ctx.restore();
    void rnd;
  }
  function scrIA(t) {
    const l = line("ia");
    termBg("ASISTENTE IA", t);
    bot(64, 92, t);
    textC("IA", 64, 122, P.cyan, 3);
    R(124, 24, 186, 144, "#0c1013");
    codeRain(t, 124, 24, 186, 144, 160, 7);
    const k = since(t, wordT("ia", "segundos") - 0.2, 0.3);
    if (k > 0) { ctx.globalAlpha = k; R(140, 76, 154, 36, "rgba(12,16,19,0.92)"); R(140, 76, 154, 1, P.amber); textC("LISTO EN 3 S", 217, 88, P.amber, 2); ctx.globalAlpha = 1; }
  }

  function bugSprite(x, y, t) {
    const leg = Math.sin(t * 20) > 0 ? 1 : 0;
    R(x - 4, y - 3, 8, 7, "#c94a3a"); R(x - 3, y - 5, 6, 2, "#2a1a14"); R(x, y - 3, 1, 7, "#2a1a14");
    for (let i = 0; i < 3; i++) { R(x - 6, y - 2 + i * 2 + leg, 2, 1, "#2a1a14"); R(x + 4, y - 2 + i * 2 - leg, 2, 1, "#2a1a14"); }
  }
  const QS = [["correcto", "¿CORRECTO?"], ["eficiente", "¿EFICIENTE?"], ["fallar", "¿FALLA?"]];
  function scrQuien(t, fixed) {
    const l = line("quien");
    termBg("REVISION DE CODIGO", t);
    // el mismo código, ahora quieto y revisándose
    R(10, 24, 170, 146, "#0c1013");
    const r = seeded(77);
    for (let i = 0; i < 14; i++) { let x = 16 + ((r() * 3) | 0) * 8; const parts = 1 + ((r() * 3) | 0); for (let p = 0; p < parts; p++) { const len = 8 + ((r() * 30) | 0); R(x, 30 + i * 10, len, 3, [P.cyan, P.fg, P.amber, P.plum][(r() * 4) | 0]); x += len + 5; } }
    if (!fixed) {
      // un bicho camina por el código
      const bx = 30 + ((t * 30) % 130), by = 30 + 10 * (5 + Math.round(Math.sin(t * 0.8) * 3));
      R(12, by - 2, 166, 8, "rgba(255,107,107,0.18)");
      bugSprite(bx, by + 2, t);
    }
    QS.forEach(([w, lab], i) => {
      const tw = wordT("quien", w), k = fixed ? 1 : easeOut(since(t, tw - 0.15, 0.35));
      if (k <= 0) return;
      const y = 36 + i * 32, x = lerp(330, 192, k);
      R(x, y, 120, 24, fixed ? "#1d3a24" : "#2a1f33"); R(x, y, 3, 24, fixed ? P.good : P.amber);
      text(fixed ? lab.replace(/[¿?]/g, "") : lab, x + 10, y + 6, fixed ? P.good : P.fg, 2);
      if (fixed) text("✓", x + 104, y + 6, P.good, 2);
    });
    const tp = wordT("quien", "plata");
    if (!fixed && t > tp - 0.15) {
      const on = Math.sin(t * 12) > -0.2;
      R(192, 136, 120, 30, on ? "#5a1e22" : "#3a1416"); R(192, 136, 120, 2, P.bad);
      text("$ CLIENTE", 204, 146, on ? "#ffd0d0" : P.bad, 2);
    }
  }

  function scrDiseno(t) { scrQuien(t, true); }

  function currentId(t) {
    let id = TL.lines[0].id;
    for (const l of TL.lines) if (t >= l.start - 0.15) id = l.id;
    return id;
  }
  const SCREENS = { pago: scrPago, cpp: scrCpp, mem: scrMem, rapido: scrRapido, fin: scrFin, datos: scrDatos, ia: scrIA, quien: scrQuien, diseno: scrDiseno, campana: scrDiseno };
  function drawScreen(t) { ctx = sctx; ctx.save(); SCREENS[currentId(t)](t); ctx.restore(); }

  /* =====================================================================
     EL CAMINO DE LA CAMPAÑA (cierre)
     ===================================================================== */
  const STOPS = [["estructuras", "ESTRUCTURAS", 54, 106, P.cyan], ["funciones", "FUNCIONES", 126, 70, P.good], ["arreglos", "ARREGLOS", 198, 106, P.amber], ["memoria", "MEMORIA", 268, 70, P.plum]];
  function drawMap(t) {
    ctx = mctx;
    R(0, 0, W, H, "#2a1b22");
    for (let y = 0; y < H; y += 6) R(0, y, W, 3, "rgba(255,200,140,0.03)");
    // estrellas y colinas
    const rnd = seeded(12);
    for (let i = 0; i < 40; i++) { const x = (rnd() * W) | 0, y = (rnd() * 70) | 0; if (reduce || Math.sin(t * 2 + i) > -0.6) R(x, y, 1, 1, "#f4e7c4"); }
    for (let x = 0; x < W; x++) { const h = 30 + Math.sin(x * 0.03) * 8 + Math.sin(x * 0.011 + 1) * 10; R(x, H - h, 1, h, "#3a2630"); }
    for (let x = 0; x < W; x++) { const h = 18 + Math.sin(x * 0.05 + 2) * 5; R(x, H - h, 1, h, "#4a3038"); }
    textC("CAMPAÑA", 160, 14, P.amber, 3, "#5a3410");
    // camino punteado entre paradas
    const lit = STOPS.map(s => wordT("campana", s[0]));
    for (let i = 0; i < STOPS.length - 1; i++) {
      const [, , x0, y0] = STOPS[i], [, , x1, y1] = STOPS[i + 1], k = since(t, lit[i], Math.max(0.2, lit[i + 1] - lit[i]));
      for (let s = 0; s <= 20; s++) { const kk = s / 20, x = lerp(x0, x1, kk), y = lerp(y0, y1, kk) - Math.sin(kk * Math.PI) * 8; R(x - 1, y - 1, 3, 3, kk <= k ? "#e8c48a" : "#5a4048"); }
    }
    STOPS.forEach(([, lab, x, y, c], i) => {
      const on = t >= lit[i] - 0.1, pop = on ? easeOut(since(t, lit[i] - 0.1, 0.3)) : 0;
      disc(x, y, 9, "#1a1016"); disc(x, y, 8, on ? c : "#5a4048"); disc(x, y, 5, on ? "#fff4dc" : "#3a2630");
      if (on) text(String(i + 1), x - 1, y - 2, "#2a1a14", 1);
      ctx.globalAlpha = 0.4 + 0.6 * pop; textC(lab, x, y + 13, on ? c : P.muted, 1); ctx.globalAlpha = 1;
    });
    // el búho salta de parada en parada
    let ox = STOPS[0][2] - 34, oy = STOPS[0][3] + 4;
    for (let i = 0; i < STOPS.length; i++) {
      const k = since(t, lit[i] - 0.35, 0.35);
      if (k > 0) {
        const px = i ? STOPS[i - 1][2] : STOPS[0][2] - 34, py = i ? STOPS[i - 1][3] - 8 : STOPS[0][3] + 4;
        ox = lerp(px, STOPS[i][2], ease(k)); oy = lerp(py, STOPS[i][3] - 8, ease(k)) - Math.sin(k * Math.PI) * 14;
      }
    }
    const tl = wordT("campana", "listo"), te = wordT("campana", "empecemos");
    ctx.save(); const sc = 0.7; ctx.translate(ox, oy); ctx.scale(sc, sc); ctx.translate(-ox, -oy);
    owl(ox, oy, { look: t > tl ? 0 : 1, up: 0, bob: 0, blink: (t % 3.1) < 0.12, wing: t > te - 0.2 ? 1 : 0, glasses: true });
    ctx.restore();
    // título final
    if (t > tl - 0.1) {
      const k = easeOut(since(t, tl - 0.1, 0.5));
      R(0, 132 + (1 - k) * 60, W, 48, "rgba(15,10,15,0.85)");
      textC("C++ ARCADE", 160, 142 + (1 - k) * 60, P.amber, 4, "#5a3410");
      if (t > te - 0.1) textC("¡EMPECEMOS!", 160, 166 + (1 - k) * 60, P.fg, 2);
    }
  }

  /* =====================================================================
     CÁMARA, COMPOSICIÓN Y CICLO
     ===================================================================== */
  function camAt(t) {
    const tc = T("cpp"), td = T("diseno");
    const wide = { x: 160, y: 90, s: 1 }, push = { x: 182, y: 88, s: 1.22 }, full = { x: SCR.x + SCR.w / 2, y: SCR.y + SCR.h / 2, s: ZOOM };
    const mix = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), k)) });
    if (t < tc - 0.7) return mix(wide, push, ease(t / (tc - 0.7)));
    if (t < td) return mix(push, full, ease(since(t, tc - 0.7, 1.2)));
    return mix(full, { x: 196, y: 92, s: 1.12 }, ease(since(t, td, 1.6)));
  }
  let out = null, octx = null;
  function present(t) {
    const cw = out.width, ch = out.height, k = cw / W;
    const cam = camAt(t), vw = W / cam.s, vh = H / cam.s;
    const vx = clamp(cam.x - vw / 2, 0, W - vw), vy = clamp(cam.y - vh / 2, 0, H - vh);
    drawRoom(t);
    drawScreen(t);
    const br = bigR.getContext("2d"), bs = bigS.getContext("2d");
    br.drawImage(room, 0, 0, W * UP, H * UP); bs.drawImage(scr, 0, 0, W * UP, H * UP);
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = "medium";
    octx.fillStyle = "#000"; octx.fillRect(0, 0, cw, ch);
    octx.drawImage(bigR, vx * UP, vy * UP, vw * UP, vh * UP, 0, 0, cw, ch);
    // la pantalla del monitor, pintada encima a la resolución real
    const sx = (SCR.x - vx) * cam.s * k, sy = (SCR.y - vy) * cam.s * k, sw = SCR.w * cam.s * k, sh = SCR.h * cam.s * k;
    octx.drawImage(bigS, 0, 0, W * UP, H * UP, sx, sy, sw, sh);
    // efecto CRT: líneas de barrido y bordes más oscuros, más notorios de cerca
    const z = clamp((cam.s - 1) / (ZOOM - 1), 0, 1);
    octx.save(); octx.beginPath(); octx.rect(sx, sy, sw, sh); octx.clip();
    octx.globalAlpha = 0.10 + 0.08 * z; octx.fillStyle = "#000";
    const step = Math.max(2, Math.round(sh / 180 * 1.5));
    for (let y = sy; y < sy + sh; y += step * 2) octx.fillRect(sx, y, sw, step);
    octx.globalAlpha = 1;
    const g = octx.createRadialGradient(sx + sw / 2, sy + sh / 2, sh * 0.35, sx + sw / 2, sy + sh / 2, sw * 0.62);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.45)");
    octx.fillStyle = g; octx.fillRect(sx, sy, sw, sh);
    octx.restore();
    // cierre: el camino de la campaña aparece encima
    const tm = T("campana") - 0.3, km = since(t, tm, 0.7);
    if (km > 0) {
      drawMap(t);
      bigM.getContext("2d").drawImage(map, 0, 0, W * UP, H * UP);
      octx.globalAlpha = km; octx.drawImage(bigM, 0, 0, W * UP, H * UP, 0, 0, cw, ch); octx.globalAlpha = 1;
    }
    // fundido de entrada y salida
    const fade = Math.max(1 - since(t, 0, 0.6), since(t, TL.total - 0.6, 0.6));
    if (fade > 0) { octx.globalAlpha = fade; octx.fillStyle = "#000"; octx.fillRect(0, 0, cw, ch); octx.globalAlpha = 1; }
  }

  /* ---------------- reproductor ---------------- */
  const $ = id => document.getElementById(id);
  let raf = 0, last = 0, clock = 0, audio = null, onDone = null, running = false, waiting = false, hiddenPause = false, subIdx = -1;
  function fit() {
    if (!out) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3), cssW = out.clientWidth || W;
    const w = clamp(Math.round(cssW * dpr), W, W * 8), h = Math.round(w * H / W);
    if (out.width !== w) { out.width = w; out.height = h; }
  }
  let frozen = null;          // solo para grabar la vista previa cuadro a cuadro (Intro._freeze)
  function now() { if (frozen != null) return frozen; return audio && !audio.error && !waiting ? audio.currentTime : clock; }
  function subtitle(t) {
    // la frase se parte en oraciones para que el subtítulo no sea un párrafo
    let txt = "";
    for (const l of TL.lines) {
      if (t < l.start - 0.15 || t > l.end + 0.5) continue;
      const parts = l.text.split(/(?<=[.:?!])\s+/);
      let acc = 0; txt = parts[0];
      parts.forEach(p => { const first = words(l.text.slice(acc))[0] || ""; const tw = acc ? wordT(l.id, first, countBefore(l.text, acc, first)) : l.start; if (t >= tw - 0.1) txt = p; acc += p.length + 1; });
    }
    if (txt !== $("camp-intro-sub").textContent) $("camp-intro-sub").textContent = txt;
  }
  function countBefore(text, upto, w) { const key = norm(w); return words(text.slice(0, upto)).filter(x => norm(x).startsWith(key)).length; }
  function frame(ts) {
    raf = 0; if (!running) return;
    const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
    if (!waiting && !hiddenPause && (!audio || audio.error || audio.paused || audio.ended)) clock += dt;
    if (audio && !audio.error && !audio.paused) clock = audio.currentTime;
    const t = now();
    fit(); present(t); subtitle(t);
    $("camp-intro-prog").style.width = (clamp(t / TL.total, 0, 1) * 100) + "%";
    if (t >= TL.total) { finish(false); return; }
    raf = requestAnimationFrame(frame);
  }
  function setMuteIcon() {
    const m = audio ? audio.muted : true;
    $("camp-intro-mute").textContent = m ? "🔇" : "🔊";
    $("camp-intro-mute").setAttribute("aria-label", m ? "Activar la voz" : "Silenciar la voz");
    $("camp-intro-mute").hidden = !audio;
  }
  function play(done) {
    TL = TL || buildTimeline();
    onDone = done || null; clock = 0; last = 0; subIdx = -1; running = true; waiting = false;
    const box = $("camp-intro");
    box.hidden = false; document.body.classList.add("intro-on");
    out = $("camp-intro-canvas"); octx = out.getContext("2d"); fit();
    $("camp-intro-sub").textContent = ""; $("camp-intro-tap").hidden = true;
    if (TL.audio) {
      audio = audio || new Audio(TL.audio);
      audio.preload = "auto"; audio.currentTime = 0;
      audio.muted = !!(window.SFX && SFX.isMuted && SFX.isMuted());
      setMuteIcon();
      const p = audio.play();
      if (p && p.catch) p.catch(() => {        // el navegador no dejó sonar sin un toque: esperamos uno
        waiting = true; $("camp-intro-tap").hidden = false;
      });
    } else setMuteIcon();
    $("camp-intro-skip").focus({ preventScroll: true });
    raf = requestAnimationFrame(frame);
  }
  function finish(skipped) {
    if (!running) return;
    running = false; cancelAnimationFrame(raf); raf = 0;
    if (audio) { try { audio.pause(); } catch (e) { /* nada */ } }
    $("camp-intro").hidden = true; document.body.classList.remove("intro-on");
    const cb = onDone; onDone = null;
    if (cb) cb(!!skipped);
  }

  function bind() {
    $("camp-intro-skip").addEventListener("click", () => finish(true));
    $("camp-intro-mute").addEventListener("click", () => { if (!audio) return; audio.muted = !audio.muted; setMuteIcon(); });
    $("camp-intro-tap").addEventListener("click", () => {
      $("camp-intro-tap").hidden = true;
      if (audio) audio.play().then(() => { waiting = false; }).catch(() => { waiting = false; audio = null; });
      else waiting = false;
    });
    document.addEventListener("keydown", e => { if (running && e.key === "Escape") { e.preventDefault(); finish(true); } });
    document.addEventListener("visibilitychange", () => {
      if (!running) return;
      hiddenPause = document.hidden;
      if (audio && !audio.error && !waiting) { if (document.hidden) audio.pause(); else audio.play().catch(() => { /* sigue sin voz */ }); }
    });
    window.addEventListener("resize", fit);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();

  // Para revisar la intro sin pasar por el menú: cpparcade.cl/#intro
  window.addEventListener("load", () => { if (location.hash === "#intro") play(() => { history.replaceState(null, "", location.pathname); }); });

  window.Intro = { play, skip: () => finish(true), lines: LINES, spoken, get timeline() { return TL || (TL = buildTimeline()); }, _t: () => now(), _seek: s => { clock = s; if (audio && !audio.error) audio.currentTime = s; }, _freeze: s => { frozen = s; } };
})();
