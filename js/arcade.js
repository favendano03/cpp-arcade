/* arcade.js — Modo Arcade: "La taberna".
   Un trader de 50 años, cansado y con ojeras, llega a la taberna, pide un trago y te pide ayuda con un
   programa en C++ a medio escribir. La cámara entra a la pantalla de su computador, que es el tablero.
   Si te equivocas más de la cuenta, lo despiden; si no, lo ascienden.
   Este archivo es el guion (quién habla, qué hace cada uno, dónde mira la cámara), el tablero de preguntas
   y los finales. El dibujo de la escena está en arcade-scene.js y las preguntas en arcade-cases.js. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const AC = window.ArcadeCases, A = window.ArcadeScene, S = A.S;
  const sfx = (n, a) => { try { if (window.SFX && !skipping) SFX.play(n, a); } catch (e) { /* sin sonido */ } };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = s => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
  const KW = /\b(int|double|char|bool|void|return|if|else|for|while|do|switch|case|break|continue|new|delete|const|nullptr|sizeof|true|false)\b/g;
  // Cada línea va en su propio <span> para que el código "se escriba" de arriba hacia abajo al aparecer.
  const highlight = code => code.split("\n").map((line, n) => {
    const i = line.indexOf("//"), body = i >= 0 ? line.slice(0, i) : line, cm = i >= 0 ? line.slice(i) : "";
    const html = esc(body).replace(KW, '<span class="kw">$1</span>').replace(/\/\* \?\?\? \*\//g, '<span class="pc-hole">/* ??? */</span>') + (cm ? `<span class="cm">${esc(cm)}</span>` : "");
    return `<span class="ln" style="--i:${n}">${html || " "}</span>`;
  }).join("");
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    lin: k => k,
    io: k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
    out: k => 1 - Math.pow(1 - k, 3),
    in: k => k * k * k,
    back: k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2)
  };

  /* ===================================================================
     ANIMACIÓN: esperas, interpolaciones y cámara
     =================================================================== */
  let skipping = false, runToken = 0;
  const CANCEL = { cancel: true };
  const sleep = ms => new Promise(r => setTimeout(r, skipping ? 0 : ms));
  // Interpola una o varias propiedades de un objeto. Con "Saltar escena" llega de inmediato al final.
  function tween(obj, to, ms, fn) {
    const from = {}; Object.keys(to).forEach(k => { from[k] = obj[k]; });
    const set = k => Object.keys(to).forEach(p => { obj[p] = lerp(from[p], to[p], k); });
    if (skipping || ms <= 0) { set(1); return Promise.resolve(); }
    const my = runToken;
    return new Promise(res => {
      const t0 = performance.now();
      const step = now => {
        if (my !== runToken) return res();
        const k = Math.min(1, (now - t0) / ms);
        set((fn || E.io)(k));
        if (k < 1 && !skipping) requestAnimationFrame(step); else { set(1); res(); }
      };
      requestAnimationFrame(step);
    });
  }
  // Herramientas del guion: cada paso revisa que la partida siga siendo la misma (si no, corta el guion).
  function tools(my) {
    const ck = () => { if (my !== runToken) throw CANCEL; };
    return {
      ck,
      wait: async ms => { await sleep(ms); ck(); },
      tw: async (o, to, ms, fn) => { await tween(o, to, ms, fn); ck(); },
      say: async (who, text, choices, opt) => { const r = await say(who, text, choices, opt); ck(); return r; }
    };
  }
  const W = A.W, H = A.H;
  const SHOT = {
    wide: { x: W / 2, y: H / 2, s: 1 },
    menu: { x: W / 2, y: 88, s: 1.05 },
    door: { x: 262, y: 84, s: 1.3 },
    table: { x: A.LAMP_X + 2, y: 98, s: 1.5 },
    trader: { x: A.CHAIR_X + 3, y: 93, s: 2 },
    close: { x: A.CHAIR_X, y: 84, s: 2.7 },
    bart: { x: 78, y: 74, s: 2 },
    bar: { x: 118, y: 86, s: 1.42 },
    screen: { x: A.SCREEN.x + A.SCREEN.w / 2, y: A.SCREEN.y + A.SCREEN.h / 2, s: W / A.SCREEN.w }
  };
  const cam = (shot, ms, fn) => tween(S.cam, shot, A.reduce ? 0 : ms, fn);

  /* ===================================================================
     DIÁLOGOS
     =================================================================== */
  let sayDone = null, typing = null, speaker = null;
  function say(who, text, choices, opt) {
    opt = opt || {};
    const box = $("arc-dialog"), line = $("arc-line"), ch = $("arc-choices");
    const isBart = who === "Cantinero", actor = isBart ? S.bart : S.trader;
    box.hidden = false; box.classList.remove("is-off"); box.classList.toggle("bart", isBart);
    $("arc-who").textContent = who; ch.innerHTML = ""; $("arc-next").hidden = true;
    speaker = isBart ? "bart" : "trader";
    actor.talk = true;
    if (isBart) { S.bart.look = 1; S.trader.look = -1; } else S.trader.look = 0;
    if (opt.shot !== false) cam(opt.shot || (isBart ? SHOT.bart : SHOT.trader), opt.ms || 650);
    return new Promise(res => {
      let i = 0;
      const full = fmt(text), plain = text.replace(/[`*]/g, "");
      const finishTyping = () => {
        clearInterval(typing); typing = null; line.innerHTML = full; actor.talk = false;
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
      line.textContent = "";
      typing = setInterval(() => {
        i++;
        line.textContent = plain.slice(0, i);
        if (i % 3 === 0 && plain[i] && plain[i] !== " ") sfx("key", isBart ? 0 : i);
        if (i >= plain.length) finishTyping();
      }, 22);
    });
  }
  function advance() {
    if (!sayDone) return;
    if (sayDone.typing) { sayDone.finish(); return; }
    if (sayDone.choices) return;
    const r = sayDone.res; sayDone = null; quiet(); r(0);
  }
  // Entre una línea y otra la caja queda en su lugar, pero vacía, para que la página no salte.
  function quiet() { $("arc-dialog").classList.add("is-off"); $("arc-next").hidden = true; }
  function hideDialog() { $("arc-dialog").hidden = true; }

  /* ===================================================================
     PARTIDA
     =================================================================== */
  let profile = null, onBack = null, run = null, st = null, phase = "menu";
  // La fase también va en <body data-arc>: el CSS ajusta el tamaño de la escena y muestra el título en el menú.
  const setPhase = p => { phase = p; document.body.dataset.arc = p; $("arc-title").hidden = p !== "menu"; };
  const QUIPS = {
    good: ["Eso es. Sigue así.", "¡Ja! Sabía que eras bueno.", "Uf, el pulso me vuelve al cuerpo.", "Así lo habría hecho yo… hace veinte años.", "Perfecto. El jefe ni se va a enterar.", "Esto merece otro sorbo."],
    bad: ["*Le cae una gota de sudor por la frente.*", "Cantinero… otro trago, por favor.", "Tranquilo. Tranquilo. Todavía hay margen.", "Mi jefe no puede ver esto.", "*Se afloja aún más la corbata.*"],
    last: ["Un error más y estoy en la calle.", "*Mira el teléfono, nervioso.* No me falles ahora."],
    late: ["¡Se nos fue el tiempo! El mercado no espera."]
  };
  let face = { mood: "tired", drink: 0, dy: 0 };

  function open(p, back) {
    profile = p; onBack = back;
    A.init($("arc-canvas"), () => !$("screen-arcade").hidden);
    A.onFrame = onFrame;
    showMenu();
  }
  // En cada cuadro: retratos (caja de diálogo y tablero) y, en el menú, un paneo lento de la taberna.
  function onFrame(dt, clock) {
    if (phase === "menu" && !A.reduce) { S.cam.x = SHOT.menu.x + Math.sin(clock * 0.16) * 7; S.cam.y = SHOT.menu.y; S.cam.s = SHOT.menu.s; }
    const dlg = $("arc-dialog");
    if (!dlg.hidden && !dlg.classList.contains("is-off") && speaker) A.portrait($("arc-portrait"), speaker, speaker === "trader" ? { mood: S.trader.mood, talk: S.trader.talk, blink: S.trader.blink > 0 } : { sad: S.bart.shake > 0 });
    if (!$("arc-pc").hidden) {
      face.dy += (0 - face.dy) * Math.min(1, dt * 10);
      A.portrait($("pc-face"), "trader", { mood: face.mood, drink: face.drink, blink: S.trader.blink > 0, dy: Math.round(face.dy) });
    }
  }
  function showMenu() {
    runToken++; st = null; run = null; skipping = false; setPhase("menu"); sayDone = null; speaker = null;
    if (typing) { clearInterval(typing); typing = null; }
    ["arc-pc", "arc-result", "arc-dialog"].forEach(id => { $(id).hidden = true; });
    $("arc-frame").hidden = false; $("arc-menu").hidden = false; $("arc-skip").hidden = true;
    $("arc-frame").classList.remove("into-pc");
    $("arc-crumb").textContent = "Arcade · La taberna";
    A.paused = false; A.reset(); Object.assign(S.cam, A.reduce ? SHOT.wide : SHOT.menu);
    Object.keys(AC.DIFFS).forEach(d => {
      const rec = (profile.levels || {})["arcade-" + d] || {};
      const el = $("arc-rec-" + d);
      if (el) el.innerHTML = rec.plays ? `<span class="stars">${"★".repeat(rec.stars || 0)}<span class="off">${"★".repeat(3 - (rec.stars || 0))}</span></span> Récord ${rec.best}` : "Sin jugar";
    });
    A.fit(); A.start();
  }

  /* ---------- gestos que se repiten ---------- */
  // Camina hasta x con pasos que suenan; la cámara puede acompañarlo.
  async function walkTo(T, x, ms) {
    const t = S.trader; t.walking = true;
    const my = runToken, steps = setInterval(() => { if (my !== runToken || !t.walking) clearInterval(steps); else sfx("step"); }, 330);
    try { await T.tw(t, { x }, ms, E.lin); } finally { clearInterval(steps); t.walking = false; t.walkT = 0; }
  }
  // Toma el vaso, bebe hasta `level` y lo deja en la mesa.
  async function drink(T, level) {
    const t = S.trader, g = S.glass, moodBefore = t.mood;
    await T.tw(t, { reach: 1 }, 240, E.out);
    g.held = true; t.reach = 0; t.drink = 0.001;
    await T.tw(t, { drink: 1 }, 380);
    t.mood = "drink"; sfx("gulp");
    await T.tw(g, { level }, 720, E.lin);
    t.mood = moodBefore;
    await T.tw(t, { drink: 0.001 }, 340);
    g.held = false; t.drink = 0; t.reach = 1; g.x = A.GLASS_X; g.y = A.TABLE_Y; sfx("clink", 1);
    await T.tw(t, { reach: 0 }, 220);
  }
  function sigh() { const t = S.trader; sfx("sigh"); A.burst("puff", t.x - 4, t.y + 12, 3); }

  /* ---------- la escena de entrada ---------- */
  async function intro(T, D) {
    const t = S.trader, b = S.bart, g = S.glass;
    Object.assign(S.cam, SHOT.wide);
    await T.wait(450);
    // 1. Se abre la puerta y entra, arrastrando los pies
    sfx("door"); cam(SHOT.door, 800);
    await T.tw(S, { door: 1 }, 480, E.out);
    S.bell = 1; sfx("bell");
    Object.assign(t, { on: true, view: "side", flip: false, x: 302, y: A.STAND, bag: true, mood: "tired" });
    cam({ x: 214, y: 90, s: 1.3 }, 2500, E.io);
    const mine = runToken;
    setTimeout(() => { if (mine === runToken && S.trader.view === "side") tween(S, { door: 0 }, 420, E.in).then(() => { if (mine === runToken) { sfx("thud", 1); S.bell = 0.6; } }); }, skipping ? 0 : 1100);
    await walkTo(T, A.CHAIR_X + 2, 2500);
    // 2. Suspira y se deja caer en la silla
    await T.wait(260); sigh(); await T.wait(620);
    Object.assign(t, { view: "front", x: A.CHAIR_X, bag: false });
    S.door = 0;
    cam(SHOT.table, 700);
    await T.tw(t, { y: A.SIT + 2 }, 300, E.in);
    sfx("thud"); A.burst("dust", A.CHAIR_X, A.TABLE_Y + 2, 7); S.shake = 0.5;
    await T.tw(t, { y: A.SIT }, 160, E.out);
    S.laptop = "back"; S.lapFlip = 0; sfx("pop");
    await T.tw(S, { lapFlip: 1 }, 220, E.back);
    S.phone.on = true;
    await T.wait(250);
    // 3. Pide un trago
    t.mood = "talk";
    tween(t, { wave: 1 }, 260, E.back);
    await T.say("Trader", "¡Cantinero! Un whisky doble. Sin hielo, sin preguntas.");
    tween(t, { wave: 0 }, 260); t.mood = "tired";
    b.pose = "idle";
    await T.say("Cantinero", "Marchando.");
    // 4. El cantinero sirve y desliza el vaso por la barra: salta el borde y cae en la mesa
    cam(SHOT.bar, 600);
    Object.assign(g, { on: true, x: 84, y: A.BAR_Y, level: 0, held: false });
    await T.tw(b, { pour: 1 }, 320, E.out);
    sfx("pour");
    await T.tw(g, { level: 0.9 }, 780, E.lin);
    await T.tw(b, { pour: 0 }, 240);
    sfx("slide");
    tween(b, { push: 1 }, 160, E.out).then(() => tween(b, { push: 0 }, 320));
    cam({ x: 150, y: 96, s: 1.5 }, 800);
    await T.tw(g, { x: 134 }, 520, E.in);
    const hop = { k: 0 };
    tween(hop, { k: 1 }, 400, E.lin);
    const my = runToken, x0 = g.x;
    await new Promise(res => {
      const step = () => {
        if (my !== runToken) return res();
        g.x = lerp(x0, A.GLASS_X, hop.k); g.y = lerp(A.BAR_Y, A.TABLE_Y, hop.k * hop.k) - Math.sin(hop.k * Math.PI) * 9;
        if (hop.k < 1 && !skipping) requestAnimationFrame(step); else { g.x = A.GLASS_X; g.y = A.TABLE_Y; res(); }
      };
      step();
    });
    T.ck();
    sfx("clink"); g.squash = 1; g.level = 0.8; S.shake = 0.3;
    A.burst("spark", A.GLASS_X + 3, A.TABLE_Y - 4, 6); A.burst("drop", A.GLASS_X + 3, A.TABLE_Y - 8, 4);
    await T.wait(110); g.squash = 0;
    b.pose = "wipe"; b.look = 0;
    // 5. Bebe y se desahoga
    cam(SHOT.trader, 600);
    await T.wait(280);
    await drink(T, 0.42);
    sigh();
    await T.say("Trader", "…Ahh. Veintiocho años en esto y nunca había tenido un viernes así.");
    // 6. El caso
    for (let i = 0; i < run.pitch.length; i++) {
      if (i === 0) tween(t, { rub: 1 }, 300).then(() => sleep(700)).then(() => tween(t, { rub: 0 }, 300));
      t.mood = i % 2 ? "sweat" : "talk";
      await T.say("Trader", run.pitch[i]);
    }
    t.mood = "tired";
    const k = await T.say("Trader", "El junior dejó el programa en C++ a medio escribir y renunció. ¿Me ayudas a terminarlo?", ["Te ayudo", "¿Y qué gano yo?"]);
    if (k === 1) { t.mood = "smirk"; await T.say("Trader", "La cuenta de esta noche corre por mí. Y mi eterna gratitud.", ["Trato hecho"]); }
    else { t.mood = "happy"; await T.wait(350); }
    // 7. La advertencia: la cámara se le acerca despacio y la lámpara parpadea
    t.mood = "sweat"; S.flick = 0.7;
    cam(SHOT.close, 2600, E.out);
    setTimeout(() => { S.flick = 0; }, skipping ? 0 : 900);
    await T.say("Trader", `Te advierto una cosa: si esto sale mal, pierdo mi empleo. Tengo margen para ${D.strikes} error${D.strikes > 1 ? "es" : ""}, ni uno más.` + (D.clock ? ` Y el mercado no espera: ${D.clock} segundos por pregunta.` : ""), null, { shot: false });
    S.flick = 0;
    // 8. Da vuelta el computador
    t.mood = "tired"; cam(SHOT.table, 600);
    sfx("slide");
    await T.tw(S, { lapFlip: 0 }, 200, E.in); S.laptop = "front"; await T.tw(S, { lapFlip: 1 }, 220, E.out);
    sfx("boot");
    await T.say("Trader", "Mira, aquí está. Ponte cómodo.", null, { shot: SHOT.table });
  }

  async function play(diff) {
    const my = ++runToken, T = tools(my);
    run = AC.buildRun(diff);
    const D = AC.DIFFS[diff];
    st = { diff, i: 0, errors: 0, correct: 0, score: 0, missed: [], marks: [], answered: false, timer: 0, left: 0 };
    setPhase("scene");
    $("arc-menu").hidden = true; $("arc-result").hidden = true; $("arc-pc").hidden = true; $("arc-frame").hidden = false;
    $("arc-frame").classList.remove("into-pc");
    $("arc-dialog").hidden = false; quiet();
    $("arc-crumb").textContent = `Arcade · ${D.name} · ${run.title}`;
    $("arc-skip").hidden = false; skipping = false;
    A.paused = false; A.reset(); A.fit();
    $("arc-frame").scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (window.SFX) SFX.play("start");
    try {
      await intro(T, D);
      await zoomIn(T);
      startBoard();
    } catch (e) { if (e !== CANCEL) throw e; }
  }
  // La cámara entra a la pantalla del notebook; cuando la pantalla llena el cuadro, aparece el tablero.
  async function zoomIn(T) {
    quiet(); $("arc-skip").hidden = true; skipping = false;
    sfx("whoosh");
    tween(S, { ui: 1 }, 900, E.in);
    await T.tw(S.cam, SHOT.screen, A.reduce ? 0 : 1250, E.io);
    hideDialog();
    setPhase("board"); A.paused = true;
    $("arc-frame").hidden = true; $("arc-pc").hidden = false;
    $("arc-pc").classList.remove("boot"); void $("arc-pc").offsetWidth; $("arc-pc").classList.add("boot");
  }
  async function zoomOut(T) {
    A.paused = false; setPhase("scene");
    Object.assign(S.cam, SHOT.screen); S.ui = 1;
    $("arc-pc").hidden = true; $("arc-frame").hidden = false; $("arc-dialog").hidden = false; quiet();
    A.fit();
    $("arc-frame").scrollIntoView({ block: "nearest" });
    tween(S, { ui: 0 }, 500, E.out);
    await T.tw(S.cam, SHOT.table, A.reduce ? 0 : 1000, E.io);
  }

  /* ---------- tablero ---------- */
  function startBoard() {
    face = { mood: "tired", drink: 0, dy: 0 };
    $("pc-quip").innerHTML = fmt("A ver qué dejó el junior…");
    showQuestion();
  }
  function strikesHTML() {
    const D = AC.DIFFS[st.diff];
    let s = "";
    for (let i = 0; i < D.strikes; i++) s += `<span class="${i < st.errors ? "x on" : "x"}">✕</span>`;
    return `<span class="pc-lbl">Margen</span>${s}`;
  }
  function stepsHTML() {
    return run.questions.map((q, i) => `<i class="${i < st.marks.length ? (st.marks[i] ? "ok" : "ko") : i === st.i ? "now" : ""}"></i>`).join("");
  }
  function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function showQuestion() {
    const q = run.questions[st.i], D = AC.DIFFS[st.diff];
    st.answered = false;
    $("pc-title").textContent = `trader.cpp — ${run.title}`;
    $("pc-step").textContent = `Paso ${st.i + 1} de ${run.questions.length} · ${AC.TOPICS[q.tag] || q.tag}`;
    $("pc-steps").innerHTML = stepsHTML();
    $("pc-strikes").innerHTML = strikesHTML();
    $("pc-ask").innerHTML = fmt(q.ask);
    $("pc-code").innerHTML = q.code ? highlight(q.code) : "";
    $("pc-code").hidden = !q.code;
    const box = $("pc-opts"); box.innerHTML = "";
    q.options.forEach((o, k) => {
      const b = document.createElement("button");
      b.className = "pc-opt"; b.style.setProperty("--i", k); b.innerHTML = `<b>${k + 1}</b><span>${esc(o)}</span>`;
      b.addEventListener("click", () => answer(k));
      box.appendChild(b);
    });
    $("pc-fb").hidden = true;
    $("arc-pc").classList.remove("is-ok", "is-ko");
    restart($("pc-main"), "enter");
    clearInterval(st.timer);
    const bar = $("pc-timebar");
    if (D.clock) {
      st.left = D.clock; $("pc-clock").hidden = false; $("pc-clock").textContent = `⏱ ${st.left}s`; $("pc-clock").classList.remove("hurry");
      bar.hidden = false; bar.classList.remove("hurry");
      const fill = $("pc-timefill"); fill.style.transition = "none"; fill.style.transform = "scaleX(1)"; void fill.offsetWidth;
      fill.style.transition = `transform ${D.clock}s linear`; fill.style.transform = "scaleX(0)";
      st.timer = setInterval(() => {
        st.left--; $("pc-clock").textContent = `⏱ ${st.left}s`;
        if (st.left <= 10) { $("pc-clock").classList.add("hurry"); bar.classList.add("hurry"); if (st.left > 0) sfx("move"); }
        if (st.left <= 0) { clearInterval(st.timer); answer(-1); }
      }, 1000);
    } else { $("pc-clock").hidden = true; bar.hidden = true; }
  }
  function answer(k) {
    if (!st || st.answered) return;
    st.answered = true; clearInterval(st.timer);
    const fill = $("pc-timefill"); fill.style.transition = "none"; fill.style.transform = getComputedStyle(fill).transform;
    const q = run.questions[st.i], D = AC.DIFFS[st.diff], ok = k === q.answer;
    const btns = [...$("pc-opts").children];
    btns.forEach((b, i) => { b.disabled = true; if (i === q.answer) b.classList.add("right"); else if (i === k) b.classList.add("wrong"); });
    const mult = { facil: 1, intermedio: 1.5, leyenda: 2 }[st.diff];
    st.marks[st.i] = ok;
    if (ok) {
      st.correct++; st.score += Math.round((100 + (D.clock ? st.left * 3 : 0)) * mult);
      sfx("right", st.correct); face.mood = "happy"; face.dy = -5;
      $("pc-quip").innerHTML = fmt(pick(QUIPS.good));
    } else {
      st.errors++; sfx("wrong");
      st.missed.push({ ask: q.ask, code: q.code, answer: q.correctText, explain: q.explain });
      const out = st.errors > D.strikes, lastOne = st.errors === D.strikes;
      face.mood = out || lastOne ? "panic" : "sweat"; face.dy = 3;
      const quip = k < 0 ? QUIPS.late[0] : lastOne ? pick(QUIPS.last) : pick(QUIPS.bad);
      $("pc-quip").innerHTML = fmt(quip);
      if (/trago/.test(quip)) { face.drink = 1; setTimeout(() => { face.drink = 0; }, 1400); }
    }
    restart($("arc-pc"), ok ? "is-ok" : "is-ko"); $("arc-pc").classList.remove(ok ? "is-ko" : "is-ok");
    restart($("pc-quip"), "pop");
    $("pc-steps").innerHTML = stepsHTML();
    $("pc-strikes").innerHTML = strikesHTML();
    if (!ok) { const xs = $("pc-strikes").querySelectorAll(".x.on"); if (xs.length) xs[xs.length - 1].classList.add("new"); }
    $("pc-fb").hidden = false;
    $("pc-fb").className = "pc-fb " + (ok ? "ok" : "ko");
    $("pc-fb-title").textContent = ok ? "✓ Correcto" : k < 0 ? `⏱ Sin tiempo · era: ${q.correctText}` : `✕ Era: ${q.correctText}`;
    $("pc-fb-text").innerHTML = fmt(q.explain);
    const fired = st.errors > D.strikes, last = st.i === run.questions.length - 1;
    $("pc-next").innerHTML = fired ? "Ver qué pasa… <kbd>Enter</kbd>" : last ? "Entregar el programa <kbd>Enter</kbd>" : "Siguiente paso <kbd>Enter</kbd>";
    $("pc-next").focus({ preventScroll: true });
    if (window.innerWidth < 900) $("pc-fb").scrollIntoView({ block: "nearest", behavior: "smooth" });
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
  async function promotedScene(T) {
    const t = S.trader, b = S.bart;
    t.mood = "shock";
    await T.say("Trader", "*Suena su teléfono.* ¿Aló? … ¿En serio? … ¡Gracias, jefe!", null, { shot: SHOT.close, ms: 1400 });
    t.mood = "joy";
    await T.tw(t, { phone: 0 }, 260); S.phone.on = false;
    cam(SHOT.wide, 700, E.out);
    S.market = 1;
    await T.tw(t, { y: A.STAND }, 300, E.back);
    tween(t, { arms: 1 }, 240, E.back);
    S.party = 1; S.cat = 1; b.pose = "idle"; b.look = 1;
    A.burst("confetti", 0, 0, 150); A.burst("pop", t.x, t.y + 10, 26);
    A.banner("¡ASCENDIDO!", A.C.good, true);
    if (window.SFX && !skipping) SFX.play("win");
    tween(b, { cheer: 1 }, 400, E.back);
    // salta de alegría (sigue saltando mientras habla)
    const my = runToken;
    (async () => {
      for (let i = 0; i < 6 && my === runToken && !skipping; i++) {
        sfx("jumpOut"); await tween(t, { jump: 11 }, 190, E.out); await tween(t, { jump: 0 }, 190, E.in);
        if (my !== runToken) return;
        S.shake = 0.35; A.burst("dust", t.x, A.FEET, 3); await sleep(i < 2 ? 60 : 420);
      }
    })();
    await T.say("Trader", "¡Me ascendieron a jefe de mesa! Esta ronda la pago yo, socio.", null, { shot: false });
    A.burst("confetti", 0, 0, 60);
    await T.say("Cantinero", "¡Salud por eso!", null, { shot: false });
  }
  async function firedScene(T) {
    const t = S.trader, b = S.bart, g = S.glass;
    t.mood = "sweat";
    await T.say("Trader", "*Suena su teléfono.* ¿Aló? … Sí, jefe. … Entiendo. …", null, { shot: SHOT.close, ms: 1400 });
    // la noticia: se apaga el ambiente, llueve y la bolsa se desploma
    t.mood = "sad"; S.market = -1; S.rain = 1; S.flick = 0.8; b.pose = "idle"; b.look = 1;
    if (window.SFX && !skipping) SFX.play("lose");
    tween(S, { dim: 1 }, 900);
    tween(t, { slump: 1 }, 700);
    await T.tw(t, { phone: 0 }, 800, E.io); S.phone.on = false;
    setTimeout(() => { S.flick = 0; }, skipping ? 0 : 500);
    await T.say("Trader", "Me despidieron. Dicen que no vuelva el lunes.", null, { shot: false });
    // guarda sus cosas en una caja
    cam(SHOT.table, 700);
    sfx("slide"); await T.tw(S, { lapFlip: 0 }, 220, E.in); S.laptop = "none"; S.lapFlip = 1;
    S.box = true; sfx("thud"); A.burst("dust", A.LAP_X, A.TABLE_Y, 5);
    await T.wait(350);
    tween(b, { shake: 1 }, 200);
    await T.say("Cantinero", "…Ese trago lo invita la casa.");
    tween(b, { shake: 0 }, 300);
    if (g.on && g.level > 0.05) { cam(SHOT.trader, 500); await drink(T, 0); await T.wait(150); }
    // se levanta con la caja y se va bajo la lluvia
    cam(SHOT.wide, 900);
    await T.tw(t, { y: A.STAND, slump: 0 }, 420);
    S.box = false; t.carry = 1;
    A.banner("DESPEDIDO", A.C.bad, false);
    await T.wait(500);
    sfx("door"); tween(S, { door: 1 }, 480, E.out); S.bell = 1; sfx("bell");
    Object.assign(t, { view: "side", flip: true });
    await walkTo(T, 304, 3000);
    t.on = false;
    await T.tw(S, { door: 0 }, 420, E.in); sfx("thud", 1); S.bell = 0.6;
    b.pose = "wipe"; b.look = 0;
    await T.wait(600);
  }
  async function finish(promoted) {
    const D = AC.DIFFS[st.diff], s = st, T = tools(runToken);
    st = null;
    try {
      await zoomOut(T);
      $("arc-skip").hidden = false;
      const t = S.trader;
      // gira el computador de vuelta y espera
      sfx("slide"); await T.tw(S, { lapFlip: 0 }, 180, E.in); S.laptop = "back"; await T.tw(S, { lapFlip: 1 }, 200, E.out);
      t.mood = s.errors ? "sweat" : "tired";
      await T.wait(500);
      // suena el teléfono sobre la mesa
      cam(SHOT.trader, 700);
      S.phone.ring = 1; t.look = -1;
      for (let i = 0; i < 2; i++) { sfx("ring"); A.pop("¡RIIING!", A.PHONE_X - 12, A.TABLE_Y - 12, A.C.amber, { life: 0.8, vy: -6 }); S.shake = 0.25; await T.wait(650); }
      S.phone.ring = 0; t.look = 0;
      await T.tw(t, { phone: 1 }, 360, E.out);
      await (promoted ? promotedScene(T) : firedScene(T));
    } catch (e) { if (e !== CANCEL) throw e; return; }
    quiet(); hideDialog(); $("arc-skip").hidden = true; skipping = false; setPhase("result");
    const stars = promoted ? (s.errors === 0 ? 3 : s.errors === 1 ? 2 : 1) : 0;
    const res = { score: s.score, completed: promoted, stars, missed: s.missed, correct: s.correct, answered: s.i + 1 };
    const rec = window.Store && profile ? Store.recordLevel(profile, "arcade-" + s.diff, res) : { best: s.score };
    const box = $("arc-result");
    $("arc-res-eyebrow").textContent = `${D.name} · ${run.title}`;
    $("arc-res-title").textContent = promoted ? "¡Lo ascendieron!" : "Lo despidieron";
    $("arc-res-text").textContent = promoted
      ? (s.errors ? `Terminaste el programa con ${s.errors} error${s.errors > 1 ? "es" : ""}.` : "Programa perfecto, sin un solo error.")
      : `Se pasó del margen de ${D.strikes} error${D.strikes > 1 ? "es" : ""}. Los errores quedaron en "Repasar errores" con su explicación.`;
    $("arc-res-stars").innerHTML = [0, 1, 2].map(i => (i < stars ? `<span class="on" style="--i:${i}">★</span>` : '<span class="off">★</span>')).join("");
    $("arc-res-score").textContent = s.score; $("arc-res-acc").textContent = `${s.correct}/${s.i + 1}`; $("arc-res-best").textContent = rec.best;
    box.classList.toggle("win", promoted); box.classList.toggle("lose", !promoted);
    box.hidden = false; box.dataset.diff = s.diff;
    box.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  /* ---------- controles ---------- */
  function bind() {
    $("arc-back").addEventListener("click", () => {
      if (!$("arc-menu").hidden || !$("arc-result").hidden) { stop(); onBack && onBack(); return; }
      if (st) clearInterval(st.timer);
      showMenu();
    });
    document.querySelectorAll("[data-arc-diff]").forEach(b => b.addEventListener("click", () => play(b.dataset.arcDiff)));
    $("arc-skip").addEventListener("click", () => { skipping = true; advance(); });
    $("arc-dialog").addEventListener("click", e => { if (!e.target.closest("button")) advance(); });
    $("arc-frame").addEventListener("click", advance);
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
  function stop() {
    if (st) clearInterval(st.timer);
    runToken++; st = null; sayDone = null; skipping = false; setPhase("menu");
    if (typing) { clearInterval(typing); typing = null; }
  }

  bind();
  window.Arcade = { open, stop, _state: () => ({ S, st, run, phase }) };
})();
