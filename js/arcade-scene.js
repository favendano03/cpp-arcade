/* arcade-scene.js — La taberna El Heap: la escena en pixel art del modo Arcade.
   Aquí solo se dibuja: sala, luces, cámara, el trader, el cantinero y los efectos. El guion de la partida
   (quién habla, cuándo se acerca la cámara, los finales) vive en arcade.js y mueve el estado `S`.

   Cómo se arma cada cuadro:
   1. La escena se pinta "a plena luz" en un lienzo interno de 320×180.
   2. Encima se multiplica un mapa de luces (lámpara, repisas, luna, pantalla) que da el ambiente.
   3. Lo que brilla solo (letrero, tele, ventana, pantalla del notebook) se pinta después de las luces.
   4. La cámara copia un recorte de ese lienzo al canvas visible, sin suavizar, y un primer plano con
      paralaje (barril, gato, vela) se dibuja encima. Así los acercamientos se ven nítidos. */
(function () {
  "use strict";
  const W = 320, H = 180, FEET = 128, STAND = FEET - 85, SIT = 66;
  const TABLE_Y = 126, CHAIR_X = 184, LAP_X = 212, LAMP_X = 190, BAR_Y = 88;
  const TABLE_X = 124, GLASS_X = 158, PHONE_X = 168;
  const SCREEN = { x: LAP_X - 12, y: 106, w: 24, h: 13.5 };   // pantalla del notebook: el final del zoom
  const C = {
    wallA: "#7a5034", wallB: "#704930", wallSeam: "#553622", knot: "#5f3d27", beam: "#3d2616",
    wainA: "#5e3b22", wainB: "#53331d", rail: "#9a683c", railD: "#3e2616", base: "#2e1c11",
    floorA: "#5a3a24", floorB: "#523420", floorSeam: "#38230f",
    rug: "#7d2e34", rugB: "#a9483f", rugC: "#dba659",
    shelf: "#9a6636", shelfD: "#5e3b1e", backbar: "#36210f",
    bar: "#a0683a", barHi: "#c88a50", barFront: "#74461f", barPanel: "#633a19", barLine: "#40250f", brass: "#e0ad42", brassD: "#9a6e1c",
    table: "#aa7240", tableHi: "#cf9558", tableEdge: "#7c4f28", apron: "#74471f", leg: "#573319",
    chair: "#7a4a24", chairD: "#5a3519", chairHi: "#96602f",
    skin: "#e0a880", skinD: "#bf8560", skinL: "#efbf9a", blush: "#e58d7c", hair: "#b9b9c0", hairD: "#84848e", bags: "#9a6a86",
    eye: "#2a1a14", white: "#f4ece0", lid: "#c08a66", mouth: "#7a3b2e", mouthD: "#3a1610", stubble: "#a07c68",
    suit: "#46506a", suitD: "#333b50", suitL: "#59658a", shirt: "#ece8e0", tie: "#c23b34", tieD: "#8e2823",
    pants: "#333a4d", pantsD: "#272c3b", shoe: "#17151a",
    bSkin: "#cf9468", bSkinD: "#a9744c", bHair: "#2a1c16", vest: "#22222a", vestL: "#34343f", bow: "#b3342f", towel: "#e9e2d0",
    glass: "#d8ecf2", glassD: "#9fc3cf", whisky: "#e09a30", whiskyD: "#b8741c",
    lap: "#8d95a3", lapD: "#636b78", lapL: "#aab2c0", bezel: "#23262e", scr: "#0b1418", scrBar: "#1a2026",
    box: "#c4955c", boxL: "#dcb078", boxD: "#9c7140",
    amber: "#ffb547", cyan: "#63d4e6", good: "#7ee08a", bad: "#ff6b6b", ink: "#17121c", fg: "#f3e9dc"
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const buf = mk(W, H), light = mk(W, H), fg = mk(W, H), act = mk(W, H), actL = mk(W, H);
  const bctx = buf.getContext("2d"), lctx = light.getContext("2d"), fctx = fg.getContext("2d"), actx = act.getContext("2d"), alctx = actL.getContext("2d");
  const UP = 4, big = mk(W * UP, H * UP), bigF = mk(W * UP, H * UP), bigctx = big.getContext("2d"), bigFctx = bigF.getContext("2d");
  bigctx.imageSmoothingEnabled = false; bigFctx.imageSmoothingEnabled = false;
  let ctx = bctx;                       // contexto en uso (se cambia para el primer plano y los retratos)
  let out = null, octx = null, isVisible = () => true;
  let bgCache = null, barCache = null;
  let raf = 0, last = 0, clock = 0;
  const S = {};
  const tv = { vals: [], t: 0 };

  function seeded(n) { let s = n * 2654435761 >>> 0; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9 >>> 0) / 4294967296); }
  function seedTV() { const r = seeded(11), a = []; let v = 0.5; for (let i = 0; i < 18; i++) { v = clamp(v + (r() - 0.5) * 0.25, 0.15, 0.85); a.push(v); } return a; }

  function reset() {
    Object.assign(S, {
      trader: { on: false, view: "front", flip: false, x: 300, y: STAND, walking: false, walkT: 0, mood: "tired", talk: false, look: 0,
        drink: 0, reach: 0, phone: 0, arms: 0, wave: 0, rub: 0, carry: 0, jump: 0, slump: 0, shiver: 0, bag: true, blinkT: 2, blink: 0 },
      bart: { x: 64, talk: false, pose: "wipe", look: 0, pour: 0, push: 0, cheer: 0, shake: 0, blinkT: 3.2, blink: 0 },
      door: 0, bell: 0,
      glass: { on: false, x: 84, y: BAR_Y, level: 0, held: false, squash: 0 },
      phone: { on: false, ring: 0 },
      laptop: "none", lapFlip: 1, box: false,
      cam: { x: W / 2, y: H / 2, s: 1 }, shake: 0,
      market: 0, rain: 0, dim: 0, flick: 0, party: 0, cat: 0,
      parts: [], pops: [], banner: null, ui: 0
    });
    tv.vals = seedTV(); tv.t = 0;
  }

  /* ---------- pinceles ---------- */
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  function arm(x0, y0, x1, y1, w, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
    for (let i = 0; i <= n; i++) { const k = n ? i / n : 0; R(x0 + (x1 - x0) * k - w / 2, y0 + (y1 - y0) * k - w / 2, w, w, c); }
  }
  // Letras de 3×5 píxeles: el texto de canvas se vería borroso a esta escala.
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
    "♥": "000101111111010", "…": "000000000000101", "'": "010010000000000"
  };
  function text(str, x, y, c, sc) {
    sc = sc || 1; let cx = Math.round(x);
    for (const ch of String(str).toUpperCase()) {
      const g = FONT[ch];
      if (g) for (let i = 0; i < 15; i++) if (g[i] === "1") R(cx + (i % 3) * sc, y + ((i / 3) | 0) * sc, sc, sc, c);
      cx += 4 * sc;
    }
  }
  const textW = (str, sc) => String(str).length * 4 * (sc || 1) - (sc || 1);

  /* ===================================================================
     FONDO (se dibuja una vez y se guarda)
     =================================================================== */
  function bottle(x, y, h, c, squat) {
    if (squat) { R(x, y - h + 3, 7, h - 3, c); R(x + 2, y - h, 3, 3, c); R(x + 2, y - h - 1, 3, 1, "#d9c9a0"); R(x + 1, y - h + 4, 1, h - 6, "rgba(255,255,255,0.4)"); R(x + 1, y - 5, 5, 3, "rgba(244,236,220,0.85)"); }
    else { R(x, y - h, 5, h, c); R(x + 1, y - h - 3, 3, 3, c); R(x + 1, y - h - 4, 3, 1, "#d9c9a0"); R(x + 1, y - h + 1, 1, h - 3, "rgba(255,255,255,0.4)"); if (h > 10) R(x, y - h + 4, 5, 3, "rgba(244,236,220,0.8)"); }
  }
  function buildBg() {
    const c = mk(W, H), keep = ctx; ctx = c.getContext("2d");
    const rnd = seeded(7);
    // pared de tablas
    for (let i = 0, x = 0; x < W; x += 16, i++) { R(x, 0, 16, 86, i % 2 ? C.wallB : C.wallA); R(x, 0, 1, 86, C.wallSeam); R(x + 1, 0, 1, 86, "rgba(255,220,170,0.05)"); }
    for (let i = 0; i < 70; i++) R((rnd() * W) | 0, 8 + ((rnd() * 72) | 0), 1, 3 + ((rnd() * 6) | 0), "rgba(40,22,12,0.3)");
    for (let i = 0; i < 8; i++) { const x = 150 + ((rnd() * 160) | 0), y = 46 + ((rnd() * 34) | 0); R(x, y, 3, 2, C.knot); R(x + 1, y, 1, 1, C.wallSeam); }
    R(0, 0, W, 5, C.beam); R(0, 5, W, 1, "#241509"); R(0, 6, W, 2, "rgba(0,0,0,0.18)");
    // zócalo
    R(0, 84, W, 2, C.rail); R(0, 86, W, 1, C.railD); R(0, 87, W, 25, C.wainA);
    for (let x = 6; x < W; x += 26) { R(x, 90, 20, 19, C.wainB); R(x, 90, 20, 1, C.railD); R(x, 90, 1, 19, C.railD); R(x, 108, 20, 1, "#74492a"); }
    R(0, 112, W, 4, C.base); R(0, 112, W, 1, "#4a2e1a");
    // piso de tablas (las juntas se separan hacia el frente)
    R(0, 116, W, 64, C.floorA);
    const rows = [116, 121, 127, 135, 145, 158, 174];
    rows.forEach((y, i) => {
      const h = (rows[i + 1] || H) - y;
      if (i % 2) R(0, y, W, h, C.floorB);
      R(0, y, W, 1, C.floorSeam);
      for (let x = (i * 47) % 70; x < W; x += 70 + i * 9) R(x, y + 1, 1, h - 1, C.floorSeam);
      for (let k = 0; k < 14; k++) R((rnd() * W) | 0, y + 1 + ((rnd() * (h - 1)) | 0), 3 + ((rnd() * 5) | 0), 1, "rgba(30,16,8,0.22)");
    });
    // alfombra ovalada bajo la mesa
    for (let dy = -12; dy <= 12; dy++) {
      const half = Math.round(66 * Math.sqrt(1 - (dy / 12.5) * (dy / 12.5)));
      R(LAMP_X - half, 161 + dy, half * 2, 1, C.rug);
      const inner = half - 5;
      if (inner > 0 && Math.abs(dy) < 10) { R(LAMP_X - inner, 161 + dy, 2, 1, C.rugC); R(LAMP_X + inner - 2, 161 + dy, 2, 1, C.rugC); }
      if (Math.abs(dy) === 9) R(LAMP_X - inner, 161 + dy, inner * 2, 1, C.rugC);
      if (Math.abs(dy) < 6) for (let x = -inner + 10; x < inner - 10; x += 12) if ((x / 12 + dy) & 1) R(LAMP_X + x, 161 + dy, 4, 1, C.rugB);
    }
    // mueble de las botellas detrás de la barra
    R(3, 27, 134, 61, C.shelfD); R(5, 29, 130, 59, C.backbar);
    for (let x = 5; x < 135; x += 13) R(x, 29, 1, 59, "rgba(0,0,0,0.25)");
    [44, 64].forEach((sy, row) => {
      R(5, sy, 130, 2, C.shelf); R(5, sy + 2, 130, 1, "rgba(0,0,0,0.5)"); R(5, sy, 130, 1, "#b87e48");
      const cols = ["#4fae6a", C.whisky, "#b8423f", "#4a7fc0", "#d9b25a", "#3f9060", "#7a58c0", "#c96a3a", "#5aa8a8"];
      for (let x = 8 + row * 3; x < 128;) {
        const squat = rnd() < 0.28, h = squat ? 8 + ((rnd() * 3) | 0) : 9 + ((rnd() * 5) | 0);
        bottle(x, sy, h, cols[(rnd() * cols.length) | 0], squat);
        x += (squat ? 9 : 7) + ((rnd() * 3) | 0);
      }
    });
    R(5, 78, 130, 10, "#4a2e18"); R(5, 78, 130, 1, C.shelf);                       // mesón trasero
    for (let x = 88; x < 130; x += 7) { R(x, 72, 5, 6, "rgba(216,236,242,0.55)"); R(x + 1, 73, 1, 4, "rgba(255,255,255,0.6)"); }   // vasos limpios
    // letrero colgante (las letras se pintan después, encendidas)
    R(46, 0, 1, 3, "#1a1208"); R(93, 0, 1, 3, "#1a1208");
    R(34, 2, 72, 24, "#8a5c36"); R(35, 3, 70, 22, "#20140c"); R(36, 4, 68, 1, "#2e1c11");
    // tele de la bolsa
    R(159, 5, 4, 10, "#15131a"); R(141, 14, 40, 27, "#15131a"); R(142, 15, 38, 1, "#34323c"); R(178, 39, 1, 1, "#ff6b6b");
    // reloj
    for (let dy = -7; dy <= 7; dy++) { const hw = Math.round(Math.sqrt(49.5 - dy * dy)); R(212 - hw, 30 + dy, hw * 2 + 1, 1, C.brassD); }
    for (let dy = -5; dy <= 5; dy++) { const hw = Math.round(Math.sqrt(30 - dy * dy)); R(212 - hw, 30 + dy, hw * 2 + 1, 1, "#efe6d2"); }
    R(212, 25, 1, 1, "#6a5a48"); R(212, 35, 1, 1, "#6a5a48"); R(207, 30, 1, 1, "#6a5a48"); R(217, 30, 1, 1, "#6a5a48");
    // cuadro: el gráfico de la mejor semana del trader
    R(202, 46, 20, 15, C.brassD); R(203, 47, 18, 13, "#efe6d2"); R(203, 59, 18, 1, "#d8ceb4");
    [[205, 56], [207, 55], [209, 56], [211, 53], [213, 54], [215, 51], [217, 49]].forEach(([x, y]) => R(x, y, 2, 1, "#3f9060")); R(217, 48, 2, 1, "#3f9060"); R(218, 49, 1, 2, "#3f9060");
    // ventana y puerta (los marcos; lo de afuera se pinta después de las luces)
    R(223, 23, 42, 42, "#8a5a32"); R(224, 24, 40, 40, "#6a4424"); R(221, 65, 46, 3, C.rail); R(221, 68, 46, 1, C.railD);
    R(275, 27, 42, 89, "#8a5a32"); R(276, 28, 40, 88, "#5e3b20"); R(279, 31, 34, 85, "#15203c");
    R(292, 21, 8, 1, C.brassD);                                                     // soporte de la campanilla
    ctx = keep; return c;
  }
  function buildBar() {
    const c = mk(W, H), keep = ctx; ctx = c.getContext("2d");
    R(0, BAR_Y, 141, 2, C.barHi); R(0, BAR_Y + 2, 141, 3, C.bar); R(0, BAR_Y + 5, 139, 1, C.barLine);
    R(0, BAR_Y + 6, 138, 30, C.barFront);
    for (let x = 4; x < 132; x += 27) { R(x, BAR_Y + 9, 22, 21, C.barPanel); R(x, BAR_Y + 9, 22, 1, C.barLine); R(x, BAR_Y + 9, 1, 21, C.barLine); R(x + 1, BAR_Y + 29, 21, 1, "#8a5630"); }
    R(138, BAR_Y + 5, 3, 31, C.barLine);
    R(0, BAR_Y + 32, 138, 1, C.brass); R(0, BAR_Y + 33, 138, 1, C.brassD);         // apoyapiés de bronce
    R(0, BAR_Y + 36, 142, 2, "#2a180b");
    // llaves de cerveza
    R(112, 78, 8, 10, C.brass); R(113, 78, 1, 10, "#f7d67a"); R(110, 86, 12, 2, C.brassD);
    R(111, 72, 3, 7, "#17151a"); R(111, 71, 3, 2, C.bad); R(117, 72, 3, 7, "#17151a"); R(117, 71, 3, 2, C.amber);
    // taburetes
    [22, 100].forEach(x => { R(x - 6, 104, 12, 3, C.rug); R(x - 6, 104, 12, 1, C.rugB); R(x - 1, 107, 2, 16, C.brassD); R(x - 4, 116, 8, 1, C.brass); R(x - 5, 123, 10, 2, "#2a180b"); });
    ctx = keep; return c;
  }

  /* ===================================================================
     COSAS QUE SE MUEVEN
     =================================================================== */
  function drawDoorAndBell() {
    const d = S.door;
    const w = Math.max(5, Math.round(34 * (1 - 0.86 * d))), x = 313 - w;
    R(x, 31, w, 85, "#74461f"); R(x, 31, 1, 85, "#4a2a12");
    if (w > 12) { const pw = w - 8; R(x + 4, 36, pw, 30, "#633a19"); R(x + 4, 36, pw, 1, "#40250f"); R(x + 4, 72, pw, 38, "#633a19"); R(x + 4, 72, pw, 1, "#40250f"); }
    R(x + 2, 76, 2, 3, C.brass);
    // campanilla: se balancea cuando la puerta se mueve
    const sw = Math.round(Math.sin(clock * 22) * 2 * S.bell);
    R(295 + sw, 22, 3, 3, C.brass); R(294 + sw, 25, 5, 1, C.brassD); R(296 + sw * 2, 26, 1, 1, "#f7d67a");
  }

  function drawBartender() {
    const b = S.bart, x = Math.round(b.x + (b.shake ? Math.sin(clock * 9) * 1.4 * b.shake : 0)), y = 52;
    const look = b.look;
    // cuerpo: camisa blanca, chaleco y humita
    R(x - 13, y + 19, 26, 20, C.shirt); R(x - 9, y + 18, 18, 2, C.shirt);
    R(x - 9, y + 20, 6, 19, C.vest); R(x + 3, y + 20, 6, 19, C.vest); R(x - 9, y + 20, 1, 19, C.vestL); R(x + 8, y + 20, 1, 19, "#15151a");
    R(x - 1, y + 22, 1, 1, "#b9b2a4"); R(x - 1, y + 27, 1, 1, "#b9b2a4"); R(x - 1, y + 32, 1, 1, "#b9b2a4");
    R(x - 4, y + 18, 3, 3, C.bow); R(x + 1, y + 18, 3, 3, C.bow); R(x - 1, y + 19, 2, 1, "#8a2420");
    R(x - 14, y + 20, 5, 9, C.towel); R(x - 14, y + 27, 5, 1, "#c9bfa8");               // paño al hombro
    // cabeza
    R(x - 2, y + 15, 5, 4, C.bSkinD);
    R(x - 6, y, 13, 1, C.bSkin); R(x - 7, y + 1, 15, 13, C.bSkin); R(x - 6, y + 14, 13, 2, C.bSkinD);
    R(x - 7, y + 2, 2, 8, C.bHair); R(x + 6, y + 2, 2, 8, C.bHair); R(x - 7, y + 1, 1, 1, C.bHair); R(x + 7, y + 1, 1, 1, C.bHair);
    R(x - 1, y + 1, 3, 1, "#e5b088");                                                 // brillo de la calva
    R(x - 8, y + 6, 1, 3, C.bSkinD); R(x + 8, y + 6, 1, 3, C.bSkinD);
    const sad = b.shake > 0.1, hap = b.cheer > 0.4;
    R(x - 5, y + (sad ? 5 : 4) - (hap ? 1 : 0), 4, 1, C.bHair); R(x + 2, y + (sad ? 5 : 4) - (hap ? 1 : 0), 4, 1, C.bHair);
    if (b.blink > 0 || hap) { R(x - 5, y + 7, 3, 1, C.eye); R(x + 3, y + 7, 3, 1, C.eye); }
    else { R(x - 5, y + 6, 3, 2, C.white); R(x + 3, y + 6, 3, 2, C.white); R(x - 4 + look, y + 6, 2, 2, C.eye); R(x + 4 + look, y + 6, 2, 2, C.eye); }
    R(x, y + 7, 2, 3, C.bSkinD);
    R(x - 5, y + 10, 11, 2, C.bHair); R(x - 6, y + 11, 2, 2, C.bHair); R(x + 5, y + 11, 2, 2, C.bHair);   // bigote
    const open = b.talk && Math.sin(clock * 19) > 0;
    if (open) R(x - 1, y + 12, 3, 2, C.mouthD); else if (hap) R(x - 2, y + 12, 5, 1, "#f4ece0");
    // brazos según lo que esté haciendo
    const sh = y + 22;
    if (b.cheer > 0) {                                                                // brinda
      const hx = x + 14 + 3 * b.cheer, hy = y + 30 - 34 * b.cheer;
      arm(x + 11, sh, x + 16, y + 30 - 14 * b.cheer, 4, C.shirt); arm(x + 16, y + 30 - 14 * b.cheer, hx, hy, 4, C.shirt);
      R(hx - 2, hy - 2, 4, 4, C.bSkin); glassAt(hx - 3, hy - 9, 0.7, 0);
      arm(x - 11, sh, x - 12, y + 34, 4, C.shirt);
    } else if (b.pour > 0) {                                                          // sirve: la botella se inclina sobre el vaso
      const gx = S.glass.x, hx = lerp(x + 8, gx - 8, b.pour), hy = lerp(y + 32, BAR_Y - 17, b.pour);
      arm(x + 11, sh, x + 15, y + 30, 4, C.shirt); arm(x + 15, y + 30, hx, hy, 4, C.shirt);
      const tilt = b.pour;
      arm(hx - 2, hy - 2, hx + 9 * tilt, hy - 6 + 5 * tilt, 4, "#b8741c"); arm(hx + 9 * tilt, hy - 6 + 5 * tilt, hx + 12 * tilt + 1, hy - 8 + 8 * tilt, 2, "#b8741c");
      R(hx - 1, hy - 3, 3, 2, "rgba(244,236,220,0.9)");
      R(hx - 2, hy - 1, 4, 4, C.bSkin);
      if (b.pour > 0.9) for (let k = 0; k < 9; k++) if ((k + ((clock * 20) | 0)) % 3) R(gx + 2, BAR_Y - 15 + k, 1, 1, C.whisky);
      arm(x - 11, sh, x - 12, y + 34, 4, C.shirt);
    } else if (b.push > 0) {                                                          // empuja el vaso por la barra
      const hx = x + 12 + 14 * b.push, hy = y + 33;
      arm(x + 11, sh, x + 14 + 6 * b.push, y + 29, 4, C.shirt); arm(x + 14 + 6 * b.push, y + 29, hx, hy, 4, C.shirt); R(hx - 1, hy - 2, 4, 4, C.bSkin);
      arm(x - 11, sh, x - 12, y + 34, 4, C.shirt);
    } else if (b.pose === "wipe") {                                                   // seca un vaso con el paño
      const wx = Math.round(Math.sin(clock * 3.4) * 2), wy = Math.round(Math.cos(clock * 3.4));
      arm(x - 11, sh, x - 12, y + 30, 4, C.shirt); arm(x - 12, y + 30, x - 4, y + 32, 4, C.shirt);
      arm(x + 11, sh, x + 12, y + 29, 4, C.shirt); arm(x + 12, y + 29, x + 5 + wx, y + 30 + wy, 4, C.shirt);
      glassAt(x - 4, y + 25, 0, 0);
      R(x + 1 + wx, y + 27 + wy, 5, 5, C.towel); R(x + 2 + wx, y + 31 + wy, 4, 1, "#c9bfa8");
      R(x - 6, y + 31, 3, 3, C.bSkin);
    } else {                                                                          // manos en la barra
      arm(x - 11, sh, x - 13, y + 34, 4, C.shirt); R(x - 15, y + 33, 4, 3, C.bSkin);
      arm(x + 11, sh, x + 13, y + 34, 4, C.shirt); R(x + 12, y + 33, 4, 3, C.bSkin);
    }
  }

  function glassAt(x, y, level, squash) {
    const h = 8 - squash, w = 6 + squash;
    R(x - (squash ? 1 : 0), y + squash, w, h, C.glass); R(x + 1 - (squash ? 1 : 0), y + 1 + squash, w - 2, h - 2, C.glassD);
    const lh = Math.round((h - 3) * clamp(level, 0, 1));
    if (lh > 0) { R(x + 1, y + h - 1 - lh + squash, 4, lh, C.whisky); R(x + 1, y + h - 1 - lh + squash, 4, 1, "#f2bd62"); }
    R(x + 1, y + 1 + squash, 1, h - 3, "rgba(255,255,255,0.7)");
  }

  // Parroquiano dormido en la barra, de espaldas.
  function drawPatron() {
    const x = 22, br = Math.round(Math.sin(clock * 1.1) * 0.6);
    R(x - 9, 82 + br, 18, 24, "#3a3344"); R(x - 9, 82 + br, 2, 24, "#2c2634"); R(x + 7, 82 + br, 2, 24, "#2c2634"); R(x - 7, 81 + br, 14, 1, "#3a3344");
    R(x - 12, 86 + br, 4, 6, "#3a3344"); R(x + 8, 86 + br, 5, 5, "#3a3344");               // codos sobre la barra
    R(x - 5, 71 + br, 10, 10, "#8a6248"); R(x - 5, 71 + br, 10, 6, "#4a3a30");            // nuca
    R(x - 8, 70 + br, 16, 2, "#2a2530"); R(x - 5, 64 + br, 10, 6, "#2a2530"); R(x - 5, 68 + br, 10, 1, C.bow);  // sombrero
    R(x - 4, 107, 3, 12, "#2c2634"); R(x + 1, 107, 3, 12, "#2c2634");
  }

  /* ---------- el trader ---------- */
  function drawHead(x, y, o) {
    const mood = o.mood || "tired", tilt = o.tilt || 0, look = o.look || 0;
    y -= Math.round(tilt * 2);
    R(x - 3, y + 16, 6, 4 + Math.round(tilt * 2), C.skinD);                                // cuello
    R(x - 7, y, 14, 1, C.skin); R(x - 9, y + 1, 18, 14, C.skin); R(x - 8, y + 15, 16, 1, C.skinD); R(x - 7, y + 16, 14, 1, C.skinD);
    R(x - 9, y + 13, 18, 2, "#d49b74");
    R(x - 2, y + 1, 4, 1, C.skinL);                                                        // brillo de la calva
    R(x - 9, y + 1, 2, 9, C.hair); R(x + 7, y + 1, 2, 9, C.hair); R(x - 9, y + 8, 2, 2, C.hairD); R(x + 7, y + 8, 2, 2, C.hairD);
    R(x - 7, y, 3, 1, C.hair); R(x + 4, y, 3, 1, C.hair); R(x + 5, y - 1, 2, 1, C.hair); R(x - 6, y - 1, 1, 1, C.hairD);   // mechones
    R(x - 10, y + 7, 1, 4, C.skinD); R(x + 9, y + 7, 1, 4, C.skinD);                       // orejas
    const worried = mood === "tired" || mood === "sad" || mood === "sweat";
    if (worried || mood === "panic") R(x - 3, y + 3, 6, 1, "#cf966f");                     // arruga en la frente
    // cejas
    if (mood === "happy" || mood === "joy" || mood === "smirk") { R(x - 7, y + 4, 5, 1, C.hairD); R(x + 2, y + (mood === "smirk" ? 3 : 4), 5, 1, C.hairD); }
    else if (mood === "panic" || mood === "shock") { R(x - 7, y + 3, 2, 1, C.hairD); R(x - 5, y + 4, 3, 1, C.hairD); R(x + 2, y + 4, 3, 1, C.hairD); R(x + 5, y + 3, 2, 1, C.hairD); }
    else if (worried) { R(x - 7, y + 6, 2, 1, C.hairD); R(x - 5, y + 5, 3, 1, C.hairD); R(x + 2, y + 5, 3, 1, C.hairD); R(x + 5, y + 6, 2, 1, C.hairD); }
    else { R(x - 7, y + 5, 5, 1, C.hairD); R(x + 2, y + 5, 5, 1, C.hairD); }
    // ojos
    const ex = [x - 7, x + 3];
    const closed = o.blink || mood === "drink";
    ex.forEach(e => {
      if (mood === "happy" || mood === "joy") { R(e, y + 8, 1, 1, C.eye); R(e + 1, y + 7, 2, 1, C.eye); R(e + 3, y + 8, 1, 1, C.eye); }
      else if (closed) R(e, y + 8, 4, 1, "#6b4a3a");
      else if (mood === "panic" || mood === "shock") { R(e, y + 6, 4, 3, C.white); R(e + 1, y + 7, 2, 1, C.eye); }
      else if (mood === "tired" || mood === "sad") { R(e, y + 7, 4, 1, C.lid); R(e, y + 8, 4, 1, C.white); R(e + 1 + look, y + 8, 2, 1, C.eye); }
      else { R(e, y + 7, 4, 2, C.white); R(e + 1 + look, y + 7, 2, 2, C.eye); }
    });
    // ojeras (se le notan menos cuando está contento)
    if (mood !== "joy") { R(x - 7, y + 9, 4, 1, C.bags); R(x + 3, y + 9, 4, 1, C.bags); if (mood !== "happy") { R(x - 6, y + 10, 2, 1, C.bags); R(x + 4, y + 10, 2, 1, C.bags); } }
    if (mood === "joy") { R(x - 8, y + 10, 2, 1, C.blush); R(x + 6, y + 10, 2, 1, C.blush); }
    R(x - 1, y + 8, 2, 3, C.skinD); R(x - 1, y + 11, 3, 1, "#a8704e"); R(x, y + 8, 1, 2, "#d49b74");   // nariz
    for (const [sx, sy] of [[-7, 13], [-6, 15], [-4, 16], [-2, 15], [1, 16], [3, 15], [5, 16], [6, 14], [7, 12], [-8, 12], [0, 14], [-4, 14], [4, 14]]) R(x + sx, y + sy, 1, 1, C.stubble);
    // boca
    const open = o.talk && Math.sin(clock * 18) > -0.1;
    if (mood === "joy") { R(x - 4, y + 12, 8, 1, C.mouthD); R(x - 3, y + 13, 6, 2, C.mouthD); R(x - 3, y + 13, 6, 1, C.white); }
    else if (mood === "happy") { R(x - 4, y + 12, 1, 1, C.mouth); R(x - 3, y + 13, 6, 1, C.mouth); R(x + 3, y + 12, 1, 1, C.mouth); if (open) R(x - 2, y + 14, 4, 1, C.mouthD); }
    else if (mood === "smirk") { R(x - 3, y + 13, 5, 1, C.mouth); R(x + 2, y + 12, 2, 1, C.mouth); if (open) R(x - 2, y + 14, 3, 1, C.mouthD); }
    else if (mood === "panic" || mood === "shock") R(x - 2, y + 12, 4, mood === "panic" ? 4 : 3, C.mouthD);
    else if (mood === "drink") R(x - 2, y + 13, 3, 2, C.mouthD);
    else if (open) { R(x - 2, y + 12, 4, 3, C.mouthD); R(x - 2, y + 12, 4, 1, C.white); }
    else if (mood === "sad") { R(x - 3, y + 13, 6, 1, C.mouth); R(x - 4, y + 14, 1, 1, C.mouth); R(x + 3, y + 14, 1, 1, C.mouth); }
    else if (mood === "sweat") { R(x - 4, y + 13, 2, 1, C.mouth); R(x - 2, y + 14, 2, 1, C.mouth); R(x, y + 13, 2, 1, C.mouth); R(x + 2, y + 14, 2, 1, C.mouth); }
    else { R(x - 3, y + 13, 6, 1, C.mouth); if (mood === "tired") R(x - 4, y + 14, 1, 1, C.mouth); }
    if (mood === "sweat" || mood === "panic") {
      const k = (clock * 1.4) % 1;
      R(x + 8, y + 2 + Math.round(k * 10), 2, 3, "#9fdcff"); R(x + 8, y + 2 + Math.round(k * 10), 1, 1, "#e8f8ff");
      if (mood === "panic") R(x - 10, y + 3 + Math.round(((k + 0.5) % 1) * 10), 2, 3, "#9fdcff");
    }
    if (mood === "sad" && o.tear) R(x - 6, y + 10 + Math.round(((clock * 0.8) % 1) * 5), 1, 2, "#9fdcff");
  }

  function drawTraderFront(t) {
    const shiver = t.shiver ? Math.round(Math.sin(clock * 40) * t.shiver) : 0;
    const x = Math.round(t.x) + shiver, sitting = t.y > STAND + 8;
    const jump = Math.round(t.jump), breathe = t.walking ? 0 : Math.round(Math.sin(clock * 1.7) * 0.6);
    const y = Math.round(t.y) - jump, slump = Math.round(t.slump * 3);
    if (!sitting || jump) {                                                               // piernas
      R(x - 8, y + 52, 7, 30 + jump, C.pants); R(x + 1, y + 52, 7, 30 + jump, C.pants); R(x - 2, y + 52, 1, 30, C.pantsD); R(x + 1, y + 52, 1, 30, C.pantsD);
      R(x - 9, y + 82 + jump, 9, 3, C.shoe); R(x + 1, y + 82 + jump, 9, 3, C.shoe);
    }
    // torso: chaqueta arrugada, camisa abierta y corbata suelta
    R(x - 12, y + 19, 24, 2, C.suit); R(x - 14, y + 21, 28, 32, C.suit); R(x - 14, y + 21, 2, 32, C.suitD); R(x + 12, y + 21, 2, 32, C.suitD);
    R(x - 12, y + 19, 24, 1, C.suitL);
    for (let i = 0; i < 9; i++) { const k = (i / 2) | 0; R(x - 4 + k, y + 20 + i, 8 - 2 * k, 1, C.shirt); R(x - 5 + k, y + 20 + i, 1, 1, C.suitD); R(x + 4 - k, y + 20 + i, 1, 1, C.suitD); }
    R(x - 6, y + 19, 3, 2, C.white); R(x + 3, y + 19, 3, 2, C.white);
    R(x, y + 22, 3, 2, C.tie); R(x + 1, y + 24, 2, 5, C.tie); R(x + 2, y + 29, 2, 9, C.tie); R(x + 3, y + 30, 1, 8, C.tieD); R(x + 2, y + 38, 1, 1, C.tie);
    R(x - 10, y + 36, 4, 1, C.suitD); R(x + 5, y + 43, 5, 1, C.suitD); R(x - 8, y + 46, 3, 1, C.suitD);
    R(x + 6, y + 29, 5, 1, C.suitD); R(x + 7, y + 28, 2, 1, C.shirt);
    R(x - 1, y + 41, 1, 1, C.suitD); R(x - 1, y + 46, 1, 1, C.suitD);
    return { x, y, sitting, hy: y + slump + breathe };
  }
  function drawTraderArms(t, p) {
    const { x, y, sitting } = p;
    const cuff = (hx, hy) => { R(hx - 2, hy - 2, 5, 5, C.skin); R(hx - 2, hy + 2, 5, 1, C.skinD); };
    const twoSeg = (sx, sy, ex, ey, hx, hy) => { arm(sx, sy, ex, ey, 5, C.suit); arm(ex, ey, hx, hy, 5, C.suit); arm(sx, sy, ex, ey, 1, C.suitD); };
    // brazo derecho (a la derecha de la pantalla): teléfono, saludo, celebración o apoyado
    let rx, ry, rex = x + 17, rey = y + 40;
    if (t.arms > 0) { rx = x + 14 + 7 * t.arms; ry = y + 46 - 54 * t.arms; rex = x + 18; rey = y + 40 - 26 * t.arms; }
    else if (t.carry > 0) { rx = x + 9; ry = y + 44; }
    else if (t.phone > 0) { rx = lerp(x + 8, x + 11, t.phone); ry = lerp(y + 56, y + 10, t.phone); rey = y + 40 - 6 * t.phone; rex = x + 18; }
    else if (t.wave > 0) { rx = x + 15 + 5 * t.wave + Math.round(Math.sin(clock * 14) * 2 * t.wave); ry = y + 56 - 56 * t.wave; rex = x + 18; rey = y + 40 - 22 * t.wave; }
    else if (sitting) { rx = x + 8; ry = y + 56; }
    else { rx = x + 16; ry = y + 48; rex = x + 16; rey = y + 38; }
    twoSeg(x + 13, y + 24, rex, rey, rx, ry); cuff(rx, ry);
    if (t.phone > 0.5) { R(rx - 2, ry - 6, 5, 10, "#111118"); R(rx - 1, ry - 5, 3, 6, C.cyan); }
    // brazo izquierdo: vaso, mano en la frente, celebración o apoyado
    let lx, ly, lex = x - 17, ley = y + 40;
    if (t.arms > 0) { lx = x - 14 - 7 * t.arms; ly = y + 46 - 54 * t.arms; lex = x - 18; ley = y + 40 - 26 * t.arms; }
    else if (t.carry > 0) { lx = x - 9; ly = y + 44; }
    else if (t.drink > 0) { const gx = S.glass.x + 3, gy = TABLE_Y - 4; lx = lerp(gx, x - 5, t.drink); ly = lerp(gy, y + 16, t.drink); ley = y + 40 - 8 * t.drink; }
    else if (t.reach > 0) { lx = lerp(x - 8, S.glass.x + 3, t.reach); ly = lerp(y + 56, TABLE_Y - 4, t.reach); }
    else if (t.rub > 0) { lx = lerp(x - 8, x - 4, t.rub); ly = lerp(y + 56, y + 5, t.rub); ley = y + 40 - 8 * t.rub; }
    else if (sitting) { lx = x - 8; ly = y + 56; }
    else { lx = x - 16; ly = y + 48; lex = x - 16; ley = y + 38; }
    twoSeg(x - 13, y + 24, lex, ley, lx, ly); cuff(lx, ly);
    if (t.drink > 0 && S.glass.held) glassAt(lx - 3, ly - 8, S.glass.level, 0);
    if (t.carry > 0) drawBox(x - 16, y + 34);
  }
  function drawTraderSide(t) {
    // De perfil, mirando a la izquierda (para caminar hacia la derecha se espeja).
    const x0 = Math.round(t.x), ph = Math.sin(t.walkT * 7.5), walking = t.walking;
    const bob = walking ? Math.round(Math.abs(Math.cos(t.walkT * 7.5)) * 1.6) : 0;
    const y = Math.round(t.y) + bob;
    ctx.save();
    if (t.flip) { ctx.translate(2 * x0, 0); ctx.scale(-1, 1); }
    const x = x0, sw = walking ? ph : 0;
    // pierna de atrás, luego la de adelante
    const hipY = y + 52, footY = y + 82 - bob;
    const leg = (dx, lift, c) => { const fx = x + dx, fy = footY - lift; arm(x, hipY, x + dx * 0.4, hipY + 15, 6, c); arm(x + dx * 0.4, hipY + 15, fx, fy - 2, 6, c); R(fx - 6, fy, 9, 3, C.shoe); };
    leg(Math.round(sw * 6), sw > 0 ? 0 : Math.round(-sw * 2), C.pantsD);
    leg(Math.round(-sw * 6), sw < 0 ? 0 : Math.round(sw * 2), C.pants);
    // torso encorvado
    R(x - 8, y + 20, 16, 33, C.suit); R(x + 6, y + 20, 2, 33, C.suitD); R(x - 9, y + 23, 1, 22, C.suit); R(x - 7, y + 19, 13, 1, C.suitL);
    R(x - 8, y + 20, 2, 7, C.shirt); R(x - 9, y + 23, 1, 10, C.tie); R(x - 8, y + 27, 1, 5, C.tieD);
    // cabeza de perfil
    R(x - 3, y + 15, 7, 6, C.skinD);
    R(x - 6, y, 12, 1, C.skin); R(x - 8, y + 1, 16, 13, C.skin); R(x - 7, y + 14, 13, 2, C.skinD);
    R(x + 2, y, 5, 2, C.hair); R(x + 3, y + 1, 5, 9, C.hair); R(x + 4, y + 8, 4, 3, C.hairD); R(x + 6, y - 1, 2, 1, C.hair);
    R(x + 1, y + 7, 2, 3, C.skinD);                                                        // oreja
    R(x - 10, y + 8, 2, 3, C.skin); R(x - 10, y + 10, 2, 1, C.skinD);                       // nariz
    R(x - 8, y + 5, 4, 1, C.hairD);
    if (t.blink) R(x - 7, y + 8, 3, 1, "#6b4a3a"); else { R(x - 7, y + 7, 3, 1, C.lid); R(x - 7, y + 8, 3, 1, C.white); R(x - 7, y + 8, 1, 1, C.eye); }
    R(x - 7, y + 9, 3, 1, C.bags); R(x - 6, y + 10, 2, 1, C.bags);
    R(x - 8, y + 13, 4, 1, C.mouth); if (t.mood === "sad") R(x - 5, y + 14, 1, 1, C.mouth);
    for (const [sx, sy] of [[-7, 11], [-5, 12], [-3, 14], [-6, 15], [-1, 13], [-4, 15], [-2, 11]]) R(x + sx, y + sy, 1, 1, C.stubble);
    if (t.carry > 0) {                                                                    // se va con la caja en los brazos
      arm(x, y + 24, x - 6, y + 40, 5, C.suit); R(x - 10, y + 39, 5, 5, C.skin);
      drawBox(x - 26, y + 30);
    } else {                                                                              // brazo que se balancea, con el bolso del notebook
      const hx = x + 1 + Math.round(sw * 5), hy = y + 46;
      arm(x + 1, y + 24, x + 2 + Math.round(sw * 2), y + 36, 5, C.suit); arm(x + 2 + Math.round(sw * 2), y + 36, hx, hy, 5, C.suit);
      R(hx - 2, hy - 1, 5, 4, C.skin);
      if (t.bag) { R(hx - 1, hy + 3, 1, 3, "#1c1c22"); R(hx + 2, hy + 3, 1, 3, "#1c1c22"); R(hx - 8, hy + 6, 17, 12, "#2a2a33"); R(hx - 8, hy + 6, 17, 2, "#3a3a46"); R(hx - 1, hy + 10, 3, 2, C.brassD); }
    }
    ctx.restore();
  }
  function drawBox(x, y) {
    R(x, y, 32, 16, C.box); R(x, y, 32, 3, C.boxL); R(x, y + 15, 32, 1, C.boxD); R(x + 13, y + 3, 6, 13, C.boxD);
    R(x + 3, y - 5, 5, 6, "#3f9060"); R(x + 4, y - 8, 1, 3, "#4fae6a"); R(x + 6, y - 7, 1, 2, "#4fae6a");   // la plantita
    R(x + 21, y - 4, 8, 5, C.lap); R(x + 21, y - 4, 8, 1, C.lapL);                                          // el notebook
    R(x + 12, y - 6, 4, 7, C.fg); R(x + 13, y - 5, 2, 2, C.amber);                                          // el marco con la foto
  }
  function drawChair() {
    const x = CHAIR_X;
    R(x - 16, 86, 3, 42, C.chair); R(x + 13, 86, 3, 42, C.chair); R(x - 16, 86, 1, 42, C.chairHi); R(x + 15, 86, 1, 42, C.chairD);
    R(x - 17, 84, 34, 5, C.chair); R(x - 16, 83, 32, 1, C.chairHi); R(x - 17, 88, 34, 1, C.chairD);
    for (let i = -8; i <= 8; i += 8) { R(x + i - 1, 89, 3, 30, C.chair); R(x + i + 1, 89, 1, 30, C.chairD); }
    R(x - 14, 118, 28, 3, C.chair); R(x - 14, 120, 28, 1, C.chairD);
  }

  function drawTableItems(withGlass) {
    const g = S.glass;
    if (withGlass && g.on && !g.held) glassAt(Math.round(g.x), Math.round(g.y) - 8, g.level, g.squash);
    if (S.phone.on && !(S.trader.phone > 0.05)) {
      const v = S.phone.ring ? Math.round(Math.sin(clock * 60)) : 0;
      R(PHONE_X + v, TABLE_Y - 2, 8, 2, "#111118"); R(PHONE_X + 1 + v, TABLE_Y - 2, 6, 1, S.phone.ring ? C.cyan : "#2a2a33");
    }
    const f = S.lapFlip;
    if (S.laptop === "back") {
      const w = Math.max(2, Math.round(28 * f));
      R(LAP_X - w / 2, 105, w, 21, C.lap); R(LAP_X - w / 2, 105, w, 1, C.lapL); R(LAP_X - w / 2, 105, 1, 21, C.lapL);
      if (w > 12) { R(LAP_X - 2, 113, 4, 4, C.lapD); R(LAP_X - 1, 114, 2, 2, C.cyan); }
      R(LAP_X - 16, 125, 32, 1, C.lapD);
    } else if (S.laptop === "front") {
      const w = Math.max(2, Math.round(28 * f));
      R(LAP_X - w / 2, 104, w, 21, C.bezel); R(LAP_X - w / 2, 104, w, 1, "#3a3d48");
      R(LAP_X - 16, 124, 32, 2, C.lap); R(LAP_X - 16, 124, 32, 1, C.lapL);
    } else if (S.laptop === "closed") { R(LAP_X - 16, 123, 32, 3, C.lap); R(LAP_X - 16, 123, 32, 1, C.lapL); }
    if (S.box) drawBox(LAP_X - 22, TABLE_Y - 16);
  }
  function drawTable() {
    const x0 = TABLE_X, cx = LAMP_X;
    R(x0, TABLE_Y, 132, 1, C.tableHi); R(x0, TABLE_Y + 1, 132, 3, C.table); R(x0, TABLE_Y + 4, 132, 2, C.tableEdge);
    for (let x = x0 + 8; x < x0 + 128; x += 31) R(x, TABLE_Y + 1, 9, 1, "rgba(255,230,190,0.18)");
    R(x0 + 4, TABLE_Y + 6, 124, 8, C.apron); R(x0 + 4, TABLE_Y + 6, 124, 1, "#4a2a12");
    R(cx - 6, TABLE_Y + 14, 12, 33, C.leg); R(cx - 6, TABLE_Y + 14, 2, 33, "#6a4222"); R(cx - 20, TABLE_Y + 46, 40, 4, C.leg); R(cx - 20, TABLE_Y + 46, 40, 1, "#6a4222");
  }

  /* ---------- luces ---------- */
  function glow(L, x, y, r, col, a, steps) {
    steps = steps || 5;
    for (let i = 0; i < steps; i++) { L.fillStyle = rgba(col, a / steps); L.beginPath(); L.arc(x, y, r * (1 - i / steps), 0, 6.2832); L.fill(); }
  }
  const lampX = () => LAMP_X + Math.sin(clock * 0.9) * 1.2;
  function lampPower() {
    const flick = S.flick ? (Math.sin(clock * 31) > 0.2 ? 1 : 0.35) * S.flick + (1 - S.flick) : 1;
    return (0.94 + 0.04 * Math.sin(clock * 7) + 0.02 * Math.sin(clock * 17.3)) * flick * (1 - 0.45 * S.dim);
  }
  const TVCOL = () => (S.market > 0.3 ? [120, 255, 150] : S.market < -0.3 ? [255, 110, 110] : [130, 200, 255]);
  function buildLight() {
    const L = lctx, d = S.dim, lx = lampX(), lp = lampPower();
    L.globalCompositeOperation = "source-over";
    L.fillStyle = `rgb(${Math.round(lerp(104, 62, d))},${Math.round(lerp(90, 60, d))},${Math.round(lerp(130, 100, d))})`; L.fillRect(0, 0, W, H);
    L.globalCompositeOperation = "lighter";
    // lámpara sobre la mesa: un cono de luz y su resplandor
    L.fillStyle = rgba([255, 208, 140], 0.1 * lp);
    L.beginPath(); L.moveTo(lx - 9, 30); L.lineTo(lx + 9, 30); L.lineTo(lx + 84, H); L.lineTo(lx - 84, H); L.fill();
    glow(L, lx, 92, 104, [255, 200, 130], 0.56 * lp, 7); glow(L, lx, 36, 26, [255, 230, 180], 0.4 * lp);
    // repisas, letrero, tele
    glow(L, 70, 56, 78, [255, 190, 120], 0.46 * (1 - 0.3 * d));
    glow(L, 70, 14, 40, [255, 170, 70], 0.3 * signPower());
    glow(L, 161, 30, 34, TVCOL(), 0.26);
    // luna por la ventana
    L.fillStyle = rgba([120, 150, 255], 0.13);
    L.beginPath(); L.moveTo(227, 27); L.lineTo(261, 27); L.lineTo(230, H); L.lineTo(150, H); L.fill();
    glow(L, 244, 44, 30, [130, 160, 255], 0.2);
    if (S.door > 0.01) {                                                                    // luz fría de la calle
      L.fillStyle = rgba([140, 170, 255], 0.3 * S.door);
      L.beginPath(); L.moveTo(279, 31); L.lineTo(279 + 34 * S.door, 31); L.lineTo(300, H); L.lineTo(190, H); L.lineTo(279, 116); L.fill();
    }
    if (S.laptop === "front" && S.lapFlip > 0.6) glow(L, LAP_X, 112, 34, [110, 220, 240], 0.34);
    if (S.phone.ring) glow(L, PHONE_X + 4, TABLE_Y - 2, 14, [110, 220, 240], 0.3 + 0.2 * Math.sin(clock * 30));
    glow(L, 300, 150, 44, [255, 190, 110], 0.26 + 0.05 * Math.sin(clock * 11));              // vela del primer plano
    if (S.party > 0) {
      const cols = [[255, 181, 71], [99, 212, 230], [126, 224, 138], [255, 107, 107]];
      for (let i = 0; i < 4; i++) glow(L, 40 + i * 80 + Math.sin(clock * 2 + i) * 30, 50 + Math.cos(clock * 3 + i * 2) * 26, 64, cols[(i + ((clock * 3) | 0)) % 4], 0.3 * S.party);
    }
  }
  const signPower = () => (Math.sin(clock * 2.7) > -0.93 && Math.sin(clock * 11.3) > -0.985 ? 1 : 0.25);

  /* ---------- lo que brilla solo (se pinta después de las luces) ---------- */
  function drawEmissiveBack() {
    const lx = Math.round(lampX()), lp = lampPower();
    // letrero
    const on = signPower() > 0.5;
    text("TABERNA", 56, 5, on ? "#ffd58a" : "#6a4a1c", 1);
    if (on) text("EL HEAP", 44, 13, "#c9701a", 2);
    text("EL HEAP", 43, 12, on ? C.amber : "#5a3d14", 2);
    // tele: velas de la bolsa
    R(143, 16, 36, 22, "#07101a");
    const n = tv.vals.length, col = TVCOL();
    for (let i = 1; i < n; i++) {
      const a = tv.vals[i - 1], b = tv.vals[i], up = b >= a, y0 = 36 - Math.round(Math.max(a, b) * 14), h = Math.max(1, Math.round(Math.abs(b - a) * 14));
      R(143 + i * 2, y0, 1, h, up ? C.good : C.bad);
      if (i % 3 === 0) R(143 + i * 2, y0 - 1, 1, h + 2, up ? "rgba(126,224,138,0.5)" : "rgba(255,107,107,0.5)");
    }
    text("IPSA", 145, 18, rgba(col, 0.9), 1); text(S.market < -0.3 ? "▼" : "▲", 162, 18, S.market < -0.3 ? C.bad : C.good, 1);
    R(143, 16, 36, 1, "rgba(255,255,255,0.08)"); if (((clock * 8) | 0) % 9 === 0) R(143, 18 + (((clock * 37) | 0) % 18), 36, 1, "rgba(255,255,255,0.06)");
    // reloj con la hora real
    const now = new Date(), mi = now.getMinutes() / 60 * 6.2832, ho = ((now.getHours() % 12) + now.getMinutes() / 60) / 12 * 6.2832;
    arm(212, 30, 212 + Math.sin(mi) * 4, 30 - Math.cos(mi) * 4, 1, "#2a1a14"); arm(212, 30, 212 + Math.sin(ho) * 2.4, 30 - Math.cos(ho) * 2.4, 1, "#2a1a14");
    // ventana: cielo, luna, ciudad y lluvia
    R(227, 27, 34, 34, "#101c3c"); R(227, 44, 34, 17, "#182850");
    R(250, 31, 6, 6, "#f6eed8"); R(251, 30, 4, 8, "#f6eed8"); R(249, 32, 8, 4, "#f6eed8"); R(252, 33, 2, 2, "#d8ceb4");
    [[230, 31], [236, 38], [243, 30], [258, 42], [233, 45], [246, 41]].forEach(([x, y], i) => { if (Math.sin(clock * 1.7 + i * 2.1) > -0.4) R(x, y, 1, 1, "#e8f0ff"); });
    [[227, 50, 7], [234, 46, 6], [240, 52, 8], [248, 48, 6], [254, 53, 7]].forEach(([x, y, w], i) => {
      R(x, y, w, 61 - y, "#0a1226");
      for (let wy = y + 2; wy < 59; wy += 3) for (let wx = x + 1; wx < x + w - 1; wx += 2) if (((wx * 7 + wy * 13 + i) % 5) < 2 && Math.sin(clock * 0.3 + wx + wy) > -0.8) R(wx, wy, 1, 1, "#ffd58a");
    });
    if (S.rain > 0) for (let i = 0; i < 16; i++) { const k = (clock * 1.9 + i * 0.37) % 1, x = 227 + ((i * 29) % 34), y = 27 + k * 34; if (y < 59) R(x, y, 1, 2, rgba([170, 200, 255], 0.75 * S.rain)); }
    R(243, 27, 2, 34, "#3a2616"); R(227, 43, 34, 2, "#3a2616");
    // la calle por la puerta abierta
    if (S.door > 0.01) {
      const w = Math.round(34 * 0.86 * S.door);
      ctx.save(); ctx.beginPath(); ctx.rect(279, 31, w, 85); ctx.clip();
      R(279, 31, 34, 85, "#0e1a36"); R(279, 98, 34, 18, "#1b2540"); R(279, 98, 34, 1, "#2c3a5e");
      R(279, 52, 12, 46, "#0a1226"); R(282, 58, 2, 3, "#ffd58a"); R(286, 70, 2, 3, "#ffd58a");
      R(301, 50, 1, 48, "#060a14"); R(298, 47, 7, 3, "#060a14"); R(299, 50, 5, 2, "#ffe9b0");
      ctx.fillStyle = "rgba(255,233,176,0.12)"; ctx.beginPath(); ctx.moveTo(299, 52); ctx.lineTo(304, 52); ctx.lineTo(312, 98); ctx.lineTo(290, 98); ctx.fill();
      if (S.rain > 0) for (let i = 0; i < 12; i++) { const k = (clock * 2.2 + i * 0.31) % 1; R(280 + ((i * 17) % 32), 31 + k * 85, 1, 3, rgba([170, 200, 255], 0.6 * S.rain)); }
      ctx.restore();
    }
    // destellos en las botellas
    for (let i = 0; i < 3; i++) { const k = (clock * 0.35 + i * 0.37) % 1; if (k < 0.08) { const bx = 12 + ((i * 53 + ((clock * 0.35 + i * 0.37) | 0) * 31) % 110), by = 34 + (i % 2) * 20; R(bx, by, 1, 3, "#fff"); R(bx - 1, by + 1, 3, 1, "#fff"); } }
    // lámpara
    R(lx, 5, 1, 19, "#141018"); R(lx - 5, 24, 11, 2, "#2e5a50"); R(lx - 8, 26, 17, 3, "#3d7868"); R(lx - 9, 29, 19, 1, "#234840"); R(lx - 6, 26, 2, 3, "#5aa090");
    R(lx - 3, 30, 7, 2, lp > 0.6 ? "#fff3cf" : "#9a8a60");
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, lx, 31, 12, [255, 220, 150], 0.3 * lp, 3);
    if (on) glow(ctx, 70, 16, 34, [255, 150, 40], 0.14, 3);
    glow(ctx, 161, 27, 26, col, 0.1, 3);
    ctx.globalCompositeOperation = "source-over";
  }
  function drawEmissiveFront() {
    // pantalla del notebook
    if (S.laptop === "front" && S.lapFlip > 0.5) {
      const w = Math.round(24 * S.lapFlip), x0 = LAP_X - w / 2;
      R(x0, 106, w, 14, C.scr); R(x0, 106, w, 2, C.scrBar);
      R(x0 + 1, 106, 1, 1, C.bad); R(x0 + 3, 106, 1, 1, C.amber); R(x0 + 5, 106, 1, 1, C.good);
      [[1, 7, C.cyan], [1, 11, C.amber], [3, 9, C.good], [3, 13, C.fg], [3, 8, C.cyan], [1, 5, C.amber]].forEach(([dx, len, c], i) => { if (w > dx + 4) R(x0 + 1 + dx, 109 + i * 2, Math.min(len, w - dx - 3), 1, c); });
      if (Math.sin(clock * 6) > 0) R(x0 + 8, 119, 2, 1, C.fg);
    }
    ctx.globalCompositeOperation = "lighter";
    if (S.laptop === "front" && S.lapFlip > 0.6) glow(ctx, LAP_X, 113, 18, [99, 212, 230], 0.16, 3);
    ctx.globalCompositeOperation = "source-over";
  }

  /* ---------- partículas, globos de texto y cartel final ---------- */
  function burst(kind, x, y, n) {
    const cols = [C.amber, C.cyan, C.good, C.bad, C.fg, "#b58cff"];
    for (let i = 0; i < n; i++) {
      if (kind === "confetti") S.parts.push({ k: "c", x: Math.random() * W, y: -Math.random() * 90, vx: 0, vy: 22 + Math.random() * 34, p: Math.random() * 6, c: cols[i % cols.length], life: 9, w: Math.random() < 0.5 ? 2 : 1, h: 2 });
      else if (kind === "pop") { const a = Math.random() * 6.28, v = 30 + Math.random() * 60; S.parts.push({ k: "p", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, g: 120, c: cols[i % cols.length], life: 0.9 + Math.random() * 0.6, w: 2, h: 2 }); }
      else if (kind === "dust") S.parts.push({ k: "d", x: x + (Math.random() - 0.5) * 16, y, vx: (Math.random() - 0.5) * 16, vy: -6 - Math.random() * 10, g: 0, c: "rgba(230,210,180,0.5)", life: 0.5 + Math.random() * 0.3, w: 2, h: 2 });
      else if (kind === "puff") S.parts.push({ k: "d", x: x + i * 3, y: y - i, vx: -4 - Math.random() * 4, vy: -7 - Math.random() * 5, g: 0, c: "rgba(240,236,228,0.55)", life: 0.9 + i * 0.15, w: 3 - (i > 1 ? 1 : 0), h: 2 });
      else if (kind === "spark") { const a = Math.random() * 6.28, v = 14 + Math.random() * 22; S.parts.push({ k: "p", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 12, g: 60, c: i % 2 ? "#fff" : C.amber, life: 0.35 + Math.random() * 0.2, w: 1, h: 1 }); }
      else if (kind === "drop") S.parts.push({ k: "p", x: x + (Math.random() - 0.5) * 4, y, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 20, g: 160, c: C.whisky, life: 0.5, w: 1, h: 1 });
    }
  }
  function pop(str, x, y, c, o) { S.pops.push(Object.assign({ str, x, y, c, t: 0, life: 1.4, sc: 1, vy: -9 }, o || {})); }
  function drawFx(dt) {
    for (const p of S.parts) {
      p.life -= dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === "c") { p.x += Math.sin(clock * 4 + p.p) * 0.35; if (p.y > H) p.life = 0; R(p.x, p.y, Math.sin(clock * 9 + p.p) > 0 ? p.w : 1, p.h, p.c); }
      else R(p.x, p.y, p.w, p.h, p.c);
    }
    S.parts = S.parts.filter(p => p.life > 0);
    for (const p of S.pops) {
      p.t += dt; p.y += p.vy * dt;
      const a = clamp((p.life - p.t) / 0.3, 0, 1);
      ctx.globalAlpha = a; text(p.str, p.x + 1, p.y + 1, "rgba(0,0,0,0.6)", p.sc); text(p.str, p.x, p.y, p.c, p.sc); ctx.globalAlpha = 1;
    }
    S.pops = S.pops.filter(p => p.t < p.life);
    const t = S.trader;
    if (S.rain > 0 && t.on && t.mood === "sad") {                                          // su nube personal
      const x = Math.round(t.x), y = Math.round(t.y) - 15;
      R(x - 12, y, 24, 6, "#7a7f8c"); R(x - 8, y - 3, 14, 4, "#8d92a0"); R(x - 10, y + 5, 20, 1, "#5d6270");
      for (let i = 0; i < 4; i++) { const k = (clock * 2 + i * 0.25) % 1; R(x - 9 + i * 6, y + 7 + Math.round(k * 9), 1, 3, "#9fdcff"); }
    }
    if (S.banner) {
      const b = S.banner; b.t += dt;
      const sc = 3, w = textW(b.str, sc), x0 = Math.round((W - w) / 2), drop = Math.min(1, b.t / 0.45), y0 = Math.round(lerp(-24, 12, 1 - Math.pow(1 - drop, 3)));
      R(x0 - 8, y0 - 6, w + 16, 27, "rgba(15,11,19,0.82)"); R(x0 - 8, y0 - 6, w + 16, 1, b.c); R(x0 - 8, y0 + 20, w + 16, 1, b.c);
      [...b.str].forEach((ch, i) => { const wob = b.wave ? Math.round(Math.sin(clock * 6 - i * 0.7) * 1.5) : 0; text(ch, x0 + i * 4 * sc + 1, y0 + wob + 1, "rgba(0,0,0,0.7)", sc); text(ch, x0 + i * 4 * sc, y0 + wob, b.c, sc); });
    }
  }

  /* ---------- primer plano con paralaje: barril con el gato y una vela ---------- */
  function drawForeground() {
    const keep = ctx; ctx = fctx; ctx.clearRect(0, 0, W, H);
    // barril
    R(-2, 152, 40, 30, "#2a190e"); R(0, 152, 36, 2, "#4a2e18"); R(-2, 160, 40, 2, "#15100c"); R(-2, 174, 40, 2, "#15100c");
    for (let x = 4; x < 36; x += 8) R(x, 154, 1, 26, "#1c110a");
    // gato dormido (despierta en la fiesta)
    const awake = S.cat > 0.5, br = Math.round(Math.sin(clock * 1.6) * 0.6), tail = Math.round(Math.sin(clock * (awake ? 6 : 1.3)) * 2);
    const cy = 141 - br;
    R(8, cy, 20, 11 + br, "#d98a3a"); R(10, cy - 1, 16, 1, "#d98a3a"); R(12, cy + 2, 3, 2, "#b86a24"); R(18, cy + 1, 3, 2, "#b86a24"); R(23, cy + 3, 3, 2, "#b86a24");
    const hy = awake ? cy - 6 : cy + 1, hx = 3;
    R(hx, hy, 10, 8, "#e09a48"); R(hx, hy - 2, 3, 2, "#e09a48"); R(hx + 7, hy - 2, 3, 2, "#e09a48"); R(hx + 1, hy - 1, 1, 1, "#f0b8a0"); R(hx + 8, hy - 1, 1, 1, "#f0b8a0");
    if (awake) { R(hx + 2, hy + 3, 2, 2, "#2a3a1a"); R(hx + 6, hy + 3, 2, 2, "#2a3a1a"); R(hx + 2, hy + 3, 1, 1, "#c8f08a"); R(hx + 6, hy + 3, 1, 1, "#c8f08a"); }
    else { R(hx + 2, hy + 4, 2, 1, "#5a3414"); R(hx + 6, hy + 4, 2, 1, "#5a3414"); }
    R(hx + 4, hy + 5, 2, 1, "#c0604a");
    R(27, cy + 6, 3, 3, "#d98a3a"); R(29 + (tail > 0 ? 1 : 0), cy + 4 - tail, 2, 4, "#d98a3a"); R(30 + tail, cy + 1 - tail, 2, 3, "#b86a24");
    // mesa vecina con una vela en una botella
    R(282, 162, 42, 4, "#3a2414"); R(282, 162, 42, 1, "#5a3a20"); R(286, 166, 38, 14, "#22140b");
    R(296, 148, 7, 14, "#2f5d44"); R(298, 142, 3, 6, "#2f5d44"); R(297, 150, 1, 9, "#4a8a66"); R(298, 138, 3, 5, "#efe6d2"); R(297, 141, 1, 3, "#efe6d2"); R(301, 142, 1, 4, "#efe6d2");
    const f = Math.sin(clock * 13) > 0 ? 1 : 0;
    R(298, 134 - f, 3, 4 + f, "#ffb547"); R(299, 135 - f, 1, 3, "#fff3cf"); R(299, 132 - f, 1, 2, "#ff8a3a");
    R(306, 157, 9, 5, "rgba(216,236,242,0.35)"); R(307, 159, 7, 3, "rgba(224,154,48,0.6)");
    ctx.globalCompositeOperation = "lighter"; glow(ctx, 299, 135, 14, [255, 180, 80], 0.22, 3); ctx.globalCompositeOperation = "source-over";
    ctx = keep;
  }

  /* ===================================================================
     CUADRO
     =================================================================== */
  function tick(dt) {
    const t = S.trader, b = S.bart;
    if (t.walking) t.walkT += dt;
    [t, b].forEach(a => { a.blinkT -= dt; if (a.blinkT <= 0) { a.blink = 0.13; a.blinkT = 2 + Math.random() * 3.5; } if (a.blink > 0) a.blink = Math.max(0, a.blink - dt); });
    if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 5);
    if (S.bell > 0) S.bell = Math.max(0, S.bell - dt * 0.9);
    tv.t += dt;
    if (tv.t > 0.28) {
      tv.t = 0; const lastV = tv.vals[tv.vals.length - 1];
      let v = lastV + (Math.random() - 0.5) * 0.3 + S.market * 0.16;
      if (S.market > 0.3 && v > 0.9) { tv.vals = tv.vals.map(q => q * 0.55); v = 0.5; }
      if (S.market < -0.3 && v < 0.08) v = 0.08 + Math.random() * 0.05;
      tv.vals.push(clamp(v, 0.06, 0.95)); tv.vals.shift();
    }
    if (Math.random() < dt * 0.35) pop("Z", 30, 62, "rgba(220,210,235,0.75)", { life: 1.6, vy: -5 });   // el parroquiano ronca
  }
  function drawScene(dt) {
    if (!bgCache) { bgCache = buildBg(); barCache = buildBar(); }
    buildLight();
    // 1) la sala con su luz y, encima, lo que brilla solo (ventana, tele, letrero)
    ctx = bctx; ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.drawImage(bgCache, 0, 0);
    ctx.globalCompositeOperation = "multiply"; ctx.drawImage(light, 0, 0); ctx.globalCompositeOperation = "source-over";
    drawEmissiveBack();
    // 2) personajes y muebles en su propia capa: reciben la misma luz, recortada a su silueta,
    //    para que nada de lo que brilla al fondo quede pintado encima de ellos
    ctx = actx; ctx.clearRect(0, 0, W, H);
    drawDoorAndBell();
    drawBartender();
    ctx.drawImage(barCache, 0, 0);
    const g = S.glass, onBar = g.on && !g.held && g.y < TABLE_Y - 2;
    if (onBar) glassAt(Math.round(g.x), Math.round(g.y) - 8, g.level, g.squash);
    drawPatron();
    drawChair();
    const t = S.trader;
    let pose = null;
    if (t.on && t.view === "front") pose = drawTraderFront(t);
    else if (t.on) drawTraderSide(t);
    drawTableItems(!onBar);
    if (pose) { drawTraderArms(t, pose); drawHead(pose.x, pose.hy, { mood: t.mood, talk: t.talk, blink: t.blink > 0, look: t.look, tilt: t.drink > 0.6 ? (t.drink - 0.6) / 0.4 : 0, tear: S.rain > 0 }); }
    drawTable();
    alctx.globalCompositeOperation = "source-over"; alctx.clearRect(0, 0, W, H); alctx.drawImage(act, 0, 0);
    alctx.globalCompositeOperation = "source-in"; alctx.drawImage(light, 0, 0);
    ctx = bctx;
    ctx.drawImage(act, 0, 0);
    ctx.globalCompositeOperation = "multiply"; ctx.drawImage(actL, 0, 0); ctx.globalCompositeOperation = "source-over";
    // 3) brillos de primer término y efectos
    drawEmissiveFront();
    drawFx(dt);
  }
  function view() {
    const s = S.cam.s, vw = W / s, vh = H / s;
    const sh = reduce ? 0 : S.shake;
    const cx = clamp(S.cam.x + (sh ? (Math.random() - 0.5) * 5 * sh : 0), vw / 2, W - vw / 2), cy = clamp(S.cam.y + (sh ? (Math.random() - 0.5) * 5 * sh : 0), vh / 2, H - vh / 2);
    return { s, vw, vh, x: cx - vw / 2, y: cy - vh / 2, cx, cy };
  }
  function present() {
    if (!out) return;
    const cw = out.width, ch = out.height, v = view(), k = cw / W;
    // Los píxeles se agrandan primero a un múltiplo entero y recién ahí se ajustan al tamaño final con
    // suavizado: así, con la cámara a cualquier distancia, todos se ven del mismo ancho y con bordes limpios.
    bigctx.drawImage(buf, 0, 0, W * UP, H * UP);
    bigFctx.clearRect(0, 0, W * UP, H * UP); bigFctx.drawImage(fg, 0, 0, W * UP, H * UP);
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = "medium";
    octx.drawImage(big, v.x * UP, v.y * UP, v.vw * UP, v.vh * UP, 0, 0, cw, ch);
    // primer plano: más cerca de la cámara, así que se mueve y crece más que el fondo
    const fs = (1 + (v.s - 1) * 1.25) * k / UP, fx = 160 + (v.cx - 160) * 1.3, fy = 90 + (v.cy - 90) * 1.3;
    octx.setTransform(fs, 0, 0, fs, cw / 2 - fx * fs * UP, ch / 2 - fy * fs * UP);
    octx.drawImage(bigF, 0, 0);
    octx.setTransform(1, 0, 0, 1, 0, 0);
    // de cerca, la pantalla del notebook deja de ser píxeles y pasa a ser el editor de verdad
    if (S.ui > 0.01 && S.laptop === "front") {
      const sx = (SCREEN.x - v.x) * v.s * k, sy = (SCREEN.y - v.y) * v.s * k, sw = SCREEN.w * v.s * k, shh = SCREEN.h * v.s * k, u = sw / 100;
      octx.globalAlpha = clamp(S.ui, 0, 1);
      octx.fillStyle = C.scr; octx.fillRect(sx, sy, sw, shh);
      octx.fillStyle = C.scrBar; octx.fillRect(sx, sy, sw, 7 * u);
      [C.bad, C.amber, C.good].forEach((c, i) => { octx.fillStyle = c; octx.beginPath(); octx.arc(sx + (4 + i * 3.2) * u, sy + 3.5 * u, 1.05 * u, 0, 6.2832); octx.fill(); });
      const lines = [[6, 34, C.cyan], [6, 52, C.amber], [12, 40, C.good], [12, 58, C.fg], [12, 30, C.cyan], [6, 20, C.amber], [6, 44, C.fg]];
      lines.forEach(([dx, len, c], i) => { octx.fillStyle = c; octx.globalAlpha = clamp(S.ui, 0, 1) * 0.85; octx.fillRect(sx + dx * u, sy + (13 + i * 5.6) * u, len * u, 1.7 * u); });
      octx.globalAlpha = 1;
    }
  }
  function frame(now) {
    raf = 0;
    if (!out || !isVisible()) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; clock += dt;
    if (!api.paused) { tick(dt); drawScene(dt); drawForeground(); present(); }
    if (api.onFrame) api.onFrame(dt, clock);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
  function fit() {
    if (!out) return;
    // El canvas se dibuja a los píxeles reales de la pantalla (sin que el CSS lo vuelva a escalar).
    const dpr = Math.min(window.devicePixelRatio || 1, 3), cssW = out.clientWidth || W;
    const w = clamp(Math.round(cssW * dpr), W, W * 8), h = Math.round(w * H / W);
    if (out.width !== w) { out.width = w; out.height = h; }
  }
  function init(canvas, visibleFn) {
    out = canvas; octx = canvas.getContext("2d"); isVisible = visibleFn || (() => true);
    fit();
    if (!init.bound) { init.bound = true; window.addEventListener("resize", fit); }
  }

  /* ---------- retratos (caja de diálogo y tablero) y miniatura del menú ---------- */
  function portrait(canvas, who, o) {
    const keep = ctx, c = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
    ctx = c; c.setTransform(1, 0, 0, 1, 0, 0);
    R(0, 0, w, h, "#2a1a10"); for (let x = 0; x < w; x += 8) R(x, 0, 1, h, "#20140c");
    const cx = w >> 1, top = Math.round(h * 0.2) + (o && o.dy || 0);
    if (who === "bart") {
      const b = S.bart, kx = b.x, kp = b.pose, kc = b.cheer, ks = b.shake, kpo = b.pour, kpu = b.push;
      Object.assign(b, { x: cx, pose: "idle", cheer: 0, pour: 0, push: 0, shake: (o && o.sad) ? 0.2 : 0 });
      const save = c.getTransform(); c.translate(0, top - 52 + 3); drawBartender(); c.setTransform(save);
      Object.assign(b, { x: kx, pose: kp, cheer: kc, shake: ks, pour: kpo, push: kpu });
    } else {
      R(cx - 14, top + 21, 28, h, C.suit); R(cx - 12, top + 19, 24, 2, C.suit); R(cx - 14, top + 21, 2, h, C.suitD); R(cx + 12, top + 21, 2, h, C.suitD);
      for (let i = 0; i < 9; i++) { const k = (i / 2) | 0; R(cx - 4 + k, top + 20 + i, 8 - 2 * k, 1, C.shirt); }
      R(cx, top + 22, 3, 2, C.tie); R(cx + 1, top + 24, 2, 5, C.tie); R(cx + 2, top + 29, 2, 9, C.tie);
      drawHead(cx, top, o || {});
      if (o && o.drink > 0) { R(cx - 12, top + 22 - 6 * o.drink, 5, 5, C.skin); glassAt(cx - 13, top + 14 - 6 * o.drink, 0.5, 0); }
    }
    R(0, 0, w, 1, "rgba(255,200,120,0.18)");
    ctx = keep;
  }
  function thumb(canvas) {
    const keepS = JSON.stringify(S), keepClock = clock;
    reset(); clock = 2.2;
    Object.assign(S.trader, { on: true, view: "front", x: CHAIR_X, y: SIT, mood: "tired", bag: false });
    S.laptop = "front"; S.glass.on = true; S.glass.x = GLASS_X; S.glass.y = TABLE_Y; S.glass.level = 0.5; S.phone.on = true;
    drawScene(0); drawForeground();
    const c = canvas.getContext("2d"); c.imageSmoothingEnabled = false;
    canvas.width = W * 2; canvas.height = H * 2; c.imageSmoothingEnabled = false;
    c.drawImage(buf, 0, 0, W * 2, H * 2); c.drawImage(fg, 0, 0, W * 2, H * 2);
    const prev = JSON.parse(keepS); Object.keys(S).forEach(k => delete S[k]); Object.assign(S, prev); clock = keepClock;
    if (!S.cam) reset();
  }

  reset();
  const api = { W, H, S, C, FEET, STAND, SIT, TABLE_Y, CHAIR_X, LAP_X, LAMP_X, BAR_Y, GLASS_X, PHONE_X, SCREEN, reduce,
    paused: false, onFrame: null,
    init, reset, start, fit, burst, pop, portrait, thumb, banner: (str, c, wave) => { S.banner = { str, c, t: 0, wave: !!wave }; }, time: () => clock };
  window.ArcadeScene = api;
})();
