/* app.js — pantallas, sesión de jugador y conexión entre la interfaz y los motores. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const { W, H, Input, KEYMAP } = window.Engines;
  const LEVELS = window.Content.levels;

  /* ---------------- Texto con `código` seguro ---------------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function fmt(s) { return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>"); }
  const KW = /\b(int|double|char|bool|void|return|if|else|for|while|do|switch|case|break|continue|new|delete|class|public|private|const|unsigned|inline|nullptr|sizeof|struct|true|false)\b/g;
  function highlight(code) {
    return code.split("\n").map(line => {
      const i = line.indexOf("//");
      const body = i >= 0 ? line.slice(0, i) : line;
      const cm = i >= 0 ? line.slice(i) : "";
      return esc(body).replace(KW, '<span class="kw">$1</span>') + (cm ? `<span class="cm">${esc(cm)}</span>` : "");
    }).join("\n");
  }

  /* ---------------- Sonido ---------------- */
  const ICON_ON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const ICON_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  if (window.SFX) {
    SFX.onChange(m => {
      ["btn-sound", "btn-sound-hud"].forEach(id => {
        const b = $(id);
        b.innerHTML = m ? ICON_OFF : ICON_ON;
        b.setAttribute("aria-label", m ? "Activar sonido" : "Silenciar sonido");
        b.classList.toggle("off", m);
      });
    });
    ["btn-sound", "btn-sound-hud"].forEach(id => $(id).addEventListener("click", e => { e.currentTarget.blur(); SFX.toggle(); }));
    window.addEventListener("keydown", e => {
      if (e.code !== "KeyM" || e.repeat) return;
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      SFX.toggle();
    });
    // Clic suave en los botones del menú (no en los del juego, que ya tienen sus propios sonidos).
    document.addEventListener("click", e => {
      const b = e.target.closest && e.target.closest(".btn, .level-card, .mode-card, .profile-list button, summary");
      if (!b || b.closest(".touch-controls") || b.id === "btn-sound" || b.id === "btn-sound-hud") return;
      setTimeout(() => SFX.play("click"), 0);
    });
  } else {
    $("btn-sound").hidden = true; $("btn-sound-hud").hidden = true;
  }

  /* ---------------- Pantallas ---------------- */
  const screens = ["login", "hub", "play", "result", "review"];
  function show(name) {
    screens.forEach(s => { $("screen-" + s).hidden = s !== name; });
    $("btn-sound").hidden = name === "play" || !window.SFX;
    if (window.FightBG) { if (name === "login") FightBG.start(); else FightBG.stop(); }
    window.scrollTo(0, 0);
  }

  let profile = null;

  /* ---------------- Login ---------------- */
  let pendingId = null;
  function renderLogin() {
    const list = Store.list();
    const ul = $("profile-list");
    ul.innerHTML = "";
    $("no-profiles").hidden = list.length > 0;
    $("new-profile").open = list.length === 0;
    for (const p of list) {
      const li = document.createElement("li");
      const done = LEVELS.filter(l => p.levels[l.id] && p.levels[l.id].done).length;
      li.innerHTML = `<button class="profile-btn" type="button">
          <span class="avatar">${esc(p.name.charAt(0).toUpperCase())}</span>
          <span class="profile-meta"><strong>${esc(p.name)}</strong><span>${done}/${LEVELS.length} niveles · ${p.xp} XP</span></span>
          ${p.pin ? '<span class="lock">PIN</span>' : ""}
        </button>`;
      li.querySelector("button").addEventListener("click", () => chooseProfile(p.id));
      ul.appendChild(li);
    }
    $("pin-form").hidden = true;
    show("login");
  }
  function chooseProfile(id) {
    const p = Store.get(id);
    if (!p) return;
    if (!p.pin) return login(p);
    pendingId = id;
    $("pin-name").textContent = p.name;
    $("pin-input").value = "";
    $("pin-error").hidden = true;
    $("pin-form").hidden = false;
    $("pin-input").focus();
  }
  $("pin-form").addEventListener("submit", e => {
    e.preventDefault();
    if (Store.checkPin(pendingId, $("pin-input").value)) login(Store.get(pendingId));
    else { $("pin-error").hidden = false; $("pin-input").select(); }
  });
  $("pin-cancel").addEventListener("click", () => { $("pin-form").hidden = true; });
  $("create-form").addEventListener("submit", e => {
    e.preventDefault();
    const r = Store.create($("new-name").value, $("new-pin").value.trim());
    if (r.error) { $("create-error").textContent = r.error; $("create-error").hidden = false; return; }
    $("create-error").hidden = true;
    $("new-name").value = ""; $("new-pin").value = "";
    login(r.profile);
  });
  $("import-form").addEventListener("submit", e => {
    e.preventDefault();
    const r = Store.importData($("import-code").value);
    const msg = $("import-msg");
    if (r.error) { msg.textContent = r.error; msg.className = "error"; msg.hidden = false; return; }
    msg.hidden = true;
    $("import-code").value = "";
    renderLogin();
  });
  $("import-file").addEventListener("change", e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { $("import-code").value = reader.result; };
    reader.readAsText(f);
  });

  function login(p) {
    profile = p;
    if (!p.cloud) Store.setLast(p.id);
    hubView = "modes";
    renderHub();
  }

  /* ---------------- Cuenta en la nube ---------------- */
  const CLOUD = !!(window.Cloud && Cloud.available());
  let cloudUser = null, cloudProfile = null, autoEnter = false;
  function cloudMsg(text, ok) {
    const m = $("cloud-msg");
    m.textContent = text || "";
    m.className = ok ? "muted small" : "error";
    m.hidden = !text;
  }
  function cloudView(v) {
    ["cloud-loading", "cloud-out", "cloud-in", "cloud-setup"].forEach(id => { $(id).hidden = id !== v; });
  }
  function busy(on) {
    $("cloud-box").querySelectorAll("button, input, select").forEach(el => { el.disabled = on; });
  }
  function renderCloud() {
    if (!CLOUD) return;
    if (!cloudUser) { cloudProfile = null; cloudView("cloud-out"); return; }
    cloudView("cloud-loading");
    Cloud.loadProfile(cloudUser.uid).then(p => {
      cloudProfile = p;
      if (!p) return showSetup();
      const done = LEVELS.filter(l => p.levels[l.id] && p.levels[l.id].done).length;
      $("cloud-avatar").textContent = p.name.charAt(0).toUpperCase();
      $("cloud-name-label").textContent = p.name;
      $("cloud-meta").textContent = `${done}/${LEVELS.length} niveles · ${p.xp} XP`;
      $("cloud-email").textContent = cloudUser.email || "tu cuenta";
      cloudView("cloud-in");
      if (autoEnter) { autoEnter = false; login(p); }
    }).catch(e => { cloudView("cloud-out"); cloudMsg(e.message); });
  }
  function showSetup() {
    autoEnter = false;
    const guess = (cloudUser.name || (cloudUser.email || "").split("@")[0] || "").split(" ")[0].slice(0, 16);
    $("cloud-name").value = guess;
    const locals = Store.list();
    const sel = $("cloud-migrate");
    sel.innerHTML = '<option value="">No, empezar desde cero</option>' + locals.map(p => {
      const done = LEVELS.filter(l => p.levels[l.id] && p.levels[l.id].done).length;
      return `<option value="${esc(p.id)}">${esc(p.name)} (${done}/${LEVELS.length} niveles · ${p.xp} XP)</option>`;
    }).join("");
    $("cloud-migrate-wrap").hidden = locals.length === 0;
    cloudView("cloud-setup");
    $("cloud-name").focus();
  }
  if (CLOUD) {
    $("cloud-box").hidden = false;
    $("local-title").textContent = "O juega sin cuenta";
    $("local-fineprint").textContent = "Los perfiles sin cuenta se guardan solo en este navegador. El PIN evita que otra persona juegue con tu perfil en el mismo computador; no es una contraseña segura.";
    cloudView("cloud-loading");
    Cloud.onAuth(u => { cloudUser = u; renderCloud(); });
    const run = (promise, okText) => {
      cloudMsg("");
      busy(true);
      return promise.then(r => { if (okText) cloudMsg(okText, true); return r; })
        .catch(e => { autoEnter = false; cloudMsg(e.message); })
        .finally(() => busy(false));
    };
    $("btn-google").addEventListener("click", () => { autoEnter = true; run(Cloud.signInGoogle()); });
    $("email-form").addEventListener("submit", e => {
      e.preventDefault();
      autoEnter = true;
      run(Cloud.signInEmail($("email-input").value, $("pw-input").value));
    });
    $("btn-signup").addEventListener("click", () => {
      if (!$("email-form").reportValidity()) return;
      autoEnter = true;
      run(Cloud.signUpEmail($("email-input").value, $("pw-input").value));
    });
    $("btn-reset").addEventListener("click", () => {
      if (!$("email-input").value.trim()) { cloudMsg("Escribe tu correo arriba y vuelve a apretar “Olvidé mi contraseña”."); return; }
      run(Cloud.resetPassword($("email-input").value), "Te enviamos un correo para crear una contraseña nueva. Revisa también la carpeta de spam.");
    });
    $("btn-cloud-continue").addEventListener("click", () => { if (cloudProfile) login(cloudProfile); });
    $("btn-cloud-signout").addEventListener("click", () => run(Cloud.signOut()));
    $("cloud-setup-cancel").addEventListener("click", () => run(Cloud.signOut()));
    $("cloud-setup").addEventListener("submit", e => {
      e.preventDefault();
      const name = $("cloud-name").value.trim().slice(0, 16);
      if (!name) return;
      const local = $("cloud-migrate").value ? Store.get($("cloud-migrate").value) : null;
      run(Cloud.createProfile(cloudUser, name, local)).then(p => { if (p) { cloudProfile = p; login(p); } });
    });
    Cloud.onStatus(st => {
      const el = $("hub-save");
      if (!profile || !profile.cloud) return;
      if (st === "saved") { el.textContent = "☁ Avance guardado en tu cuenta"; el.className = "save-status ok"; }
      else if (st === "saving" || st === "pending") { el.textContent = "☁ Guardando…"; el.className = "save-status"; }
      else if (st.startsWith("error:")) { el.textContent = "⚠ " + st.slice(6) + " Se reintentará al guardar de nuevo."; el.className = "save-status err"; }
    });
  }

  /* ---------------- Mapa de niveles ---------------- */
  function starsHTML(n, big) {
    let s = "";
    for (let i = 0; i < 3; i++) s += i < n ? "★" : '<span class="off">★</span>';
    return s;
  }
  const WORLDS = window.Content.worlds;
  function isDone(id) { const st = profile.levels[id]; return !!(st && st.done); }
  // Los niveles normales siempre están abiertos (para estudiar el tema que quieras).
  // Cada jefe se abre al completar los niveles de su mundo; el final, además, pide vencer a los otros 3 jefes.
  function isUnlocked(l) {
    if (!l.boss || isDone(l.id)) return true;
    if (!LEVELS.filter(x => x.world === l.world && !x.boss).every(x => isDone(x.id))) return false;
    if (l.final) return LEVELS.filter(x => x.boss && !x.final && !x.extra).every(x => isDone(x.id));
    return true;
  }
  function lockText(l) {
    return l.final ? "Vence a los 3 jefes y completa el bloque 4" : l.extra ? "Completa los niveles de esta sección" : "Completa los 4 niveles de este bloque";
  }
  // El mapa tiene tres vistas: modo de juego → sección de la campaña → niveles.
  let hubView = "modes";
  const VIEW_PARENT = { campaign: "modes", levels: "campaign" };
  const VIEW_CRUMB = { campaign: "Campaña", levels: "Campaña · Estructuras y Funciones" };
  function setHubView(v) { hubView = v; renderHub(); }
  function showSoon(eyebrow, text) {
    $("soon-eyebrow").textContent = eyebrow;
    $("soon-text").textContent = text;
    $("soon-modal").hidden = false;
    $("soon-close").focus();
  }
  function closeSoon() { $("soon-modal").hidden = true; }
  $("soon-close").addEventListener("click", closeSoon);
  $("soon-modal").addEventListener("click", e => { if (e.target === $("soon-modal")) closeSoon(); });
  $("hub-back").addEventListener("click", () => setHubView(VIEW_PARENT[hubView] || "modes"));
  $("mode-campaign").addEventListener("click", () => setHubView("campaign"));
  $("sec-estructuras").addEventListener("click", () => setHubView("levels"));
  $("mode-arcade").addEventListener("click", () => showSoon("Modo Arcade", "Casos cortos y más dinámicos. Este modo está en construcción."));
  $("sec-memoria").addEventListener("click", () => showSoon("Campaña · Gestión de memoria", "Los niveles de esta sección están en construcción."));

  function renderHub() {
    $("hub-name").textContent = profile.name;
    if (profile.cloud) {
      if (!/save-status (ok|err)/.test($("hub-save").className) || !$("hub-save").textContent) { $("hub-save").textContent = "☁ Avance guardado en tu cuenta"; $("hub-save").className = "save-status ok"; }
    } else { $("hub-save").textContent = "Guardado solo en este equipo"; $("hub-save").className = "save-status"; }
    const camp = LEVELS.filter(l => !l.extra);
    const campDone = camp.filter(l => isDone(l.id)).length;
    $("mode-campaign-meta").textContent = `${campDone}/${camp.length} niveles completados`;
    $("sec-estructuras-meta").textContent = `${campDone}/${camp.length} completados · 4 bloques y jefe final`;
    $("view-modes").hidden = hubView !== "modes";
    $("view-campaign").hidden = hubView !== "campaign";
    $("level-list").hidden = hubView !== "levels";
    $("hub-nav").hidden = hubView === "modes";
    $("hub-crumb").textContent = VIEW_CRUMB[hubView] || "";
    $("soon-modal").hidden = true;
    $("hub-xp").textContent = profile.xp;
    $("hub-stars").textContent = LEVELS.reduce((s, l) => s + ((profile.levels[l.id] || {}).stars || 0), 0) + "/" + LEVELS.length * 3;
    $("hub-missed").textContent = profile.missed.length;
    const ol = $("level-list");
    ol.innerHTML = "";
    let currentWorld = null;
    LEVELS.forEach((l, idx) => {
      if (l.world !== currentWorld) {
        currentWorld = l.world;
        const w = WORLDS.find(x => x.n === l.world);
        const total = LEVELS.filter(x => x.world === l.world).length;
        const done = LEVELS.filter(x => x.world === l.world && isDone(x.id)).length;
        const head = document.createElement("li");
        head.className = "world-head";
        head.innerHTML = `<span class="eyebrow">${done}/${total} completados</span><h3>${esc(w.name)}</h3><p class="muted">${esc(w.desc)}</p>`;
        ol.appendChild(head);
      }
      const st = profile.levels[l.id] || {};
      const locked = !isUnlocked(l);
      const li = document.createElement("li");
      li.innerHTML = `<button class="level-card${l.boss ? " boss" : ""}" type="button" ${locked ? "disabled" : ""}>
          <span class="level-addr">${l.addr}</span>
          <span class="level-title">${esc(l.title)}</span>
          <span class="level-desc">${locked ? esc(lockText(l)) + "." : esc(l.topic) + " · " + esc(l.desc)}</span>
          <span class="level-side">
            <span class="stars">${locked ? "🔒" : starsHTML(st.stars || 0)}</span>
            <span class="best">${st.best ? "récord " + st.best : locked ? "bloqueado" : "sin jugar"}</span>
          </span>
        </button>`;
      li.querySelector("button").addEventListener("click", () => startLevel(idx));
      ol.appendChild(li);
    });
    $("export-box").hidden = true;
    show("hub");
  }
  $("btn-logout").addEventListener("click", () => {
    const wasCloud = profile && profile.cloud;
    profile = null;
    if (wasCloud) Cloud.signOut().catch(() => {});
    renderLogin();
  });
  $("btn-review").addEventListener("click", renderReview);
  $("btn-export").addEventListener("click", () => {
    const box = $("export-box");
    box.hidden = !box.hidden;
    $("export-code").value = Store.exportCode(profile);
    $("copy-msg").textContent = "";
    // Descargar archivo funciona cuando el juego corre en su propia página (por ejemplo GitHub Pages).
    let topLevel = false;
    try { topLevel = window.self === window.top; } catch (e) { topLevel = false; }
    $("btn-download").hidden = !topLevel;
  });
  $("btn-copy").addEventListener("click", () => {
    const ta = $("export-code");
    const done = () => { $("copy-msg").textContent = "Copiado."; };
    try {
      navigator.clipboard.writeText(ta.value).then(done, () => { ta.select(); $("copy-msg").textContent = "Selecciónalo y cópialo con Ctrl+C."; });
    } catch (e) { ta.select(); $("copy-msg").textContent = "Selecciónalo y cópialo con Ctrl+C."; }
  });
  $("btn-download").addEventListener("click", () => {
    const blob = new Blob([Store.exportJSON(profile)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cpp-arcade-${profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });

  /* ---------------- Repaso ---------------- */
  function missedItemHTML(m, withTag) {
    const lv = LEVELS.find(l => l.id === m.level);
    return `${withTag && lv ? `<span class="tag">${esc(lv.title)}</span>` : ""}
      <span class="q">${fmt(m.ask)}</span>
      ${m.code ? `<pre>${esc(m.code)}</pre>` : ""}
      <span class="a">✓ ${esc(m.answer)}</span>
      <span class="why">${fmt(m.explain)}</span>`;
  }
  function renderReview() {
    const ul = $("review-list");
    ul.innerHTML = "";
    profile.missed.forEach(m => {
      const li = document.createElement("li");
      li.innerHTML = missedItemHTML(m, true);
      ul.appendChild(li);
    });
    $("review-empty").hidden = profile.missed.length > 0;
    $("review-clear").hidden = profile.missed.length === 0;
    show("review");
  }
  $("review-back").addEventListener("click", renderHub);
  let clearArmed = false;
  $("review-clear").addEventListener("click", () => {
    if (!clearArmed) {
      clearArmed = true;
      $("review-clear").textContent = "¿Seguro? Toca otra vez";
      setTimeout(() => { clearArmed = false; $("review-clear").textContent = "Borrar lista"; }, 3000);
      return;
    }
    clearArmed = false;
    $("review-clear").textContent = "Borrar lista";
    profile.missed = [];
    Store.save(profile);
    renderReview();
  });

  /* ---------------- Juego ---------------- */
  const canvas = $("canvas");
  const ctx = canvas.getContext("2d");
  function sizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeCanvas();

  // En el celular, achica el tablero para que tablero y botones quepan en la pantalla sin hacer scroll.
  function fitStage() {
    if ($("screen-play").hidden) return;
    canvas.style.width = "";
    const pads = document.querySelector(".touch-controls");
    const padsH = getComputedStyle(pads).display === "none" ? 0 : pads.offsetHeight + 10;
    const top = canvas.getBoundingClientRect().top + window.scrollY;
    const avail = window.innerHeight - top - padsH - 12;
    const full = canvas.parentElement.clientWidth;
    const w = Math.max(230, Math.min(full, avail * W / H));
    if (w < full - 1) canvas.style.width = Math.floor(w) + "px";
  }
  window.addEventListener("resize", fitStage);
  if (window.ResizeObserver) new ResizeObserver(() => fitStage()).observe($("prompt"));

  let game = null, levelIdx = 0, running = false, paused = false, last = 0;
  let explainCb = null, toastTimer = null, explainReadyAt = 0;
  const EXPLAIN_LOCK_MS = 1200;

  const ui = {
    hud({ score, mult, lives, progress }) {
      $("hud-score").textContent = score;
      $("hud-combo").textContent = "x" + mult;
      let h = "";
      for (let i = 0; i < 3; i++) h += i < lives ? "♥" : '<span class="off">♥</span>';
      $("hud-lives").innerHTML = h;
      $("hud-progress").style.width = Math.round(progress * 100) + "%";
    },
    prompt({ ask, code, options, phase }) {
      $("prompt-ask").innerHTML = (phase ? `<span class="eyebrow">${esc(phase)}</span><br>` : "") + fmt(ask);
      $("prompt-code").innerHTML = code ? highlight(code) : "";
      const ol = $("prompt-options");
      if (options) {
        ol.innerHTML = options.map((o, i) => `<li><b>${"ABCD"[i]}</b><span>${esc(o)}</span></li>`).join("");
        ol.hidden = false;
      } else { ol.hidden = true; ol.innerHTML = ""; }
    },
    toast(ok, title, text) {
      const fb = $("feedback");
      if (explainCb) return; // no tapar una explicación
      fb.className = "feedback toast " + (ok ? "good" : "bad");
      $("fb-title").textContent = title;
      $("fb-text").innerHTML = fmt(text || "");
      fb.hidden = false;
      fb.style.pointerEvents = "none";
      clearTimeout(toastTimer);
      const ms = ok ? Math.min(6500, Math.max(2600, (text || "").length * 55)) : 1800;
      toastTimer = setTimeout(() => { if (!explainCb) fb.hidden = true; }, ms);
    },
    explain(title, text, cb, ok) {
      clearTimeout(toastTimer);
      const fb = $("feedback");
      fb.className = "feedback " + (ok ? "good" : "bad");
      $("fb-title").textContent = title;
      $("fb-text").innerHTML = fmt(text);
      fb.hidden = false;
      fb.style.pointerEvents = "auto";
      explainCb = cb;
      // Queda en pantalla hasta que el jugador la cierre. El botón se activa tras una pausa corta
      // para que un disparo o un toque que venía en camino no la cierre sin leerla.
      const btn = $("fb-continue");
      const lock = ok ? 600 : EXPLAIN_LOCK_MS;
      btn.innerHTML = (ok ? "OK, siguiente pregunta" : "Entendido, seguir") + " <kbd>Enter</kbd>";
      btn.style.setProperty("--wait", lock + "ms");
      btn.disabled = true;
      btn.classList.add("wait");
      explainReadyAt = performance.now() + lock;
      setTimeout(() => {
        btn.disabled = false;
        btn.classList.remove("wait");
        btn.focus({ preventScroll: true });
      }, lock);
    },
    finish(res) { setTimeout(() => endLevel(res), 500); }
  };
  function continueExplain() {
    if (!explainCb || performance.now() < explainReadyAt) return;
    const cb = explainCb;
    explainCb = null;
    $("feedback").hidden = true;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    Input.clear();
    cb();
  }
  $("fb-continue").addEventListener("click", continueExplain);

  function startLevel(idx) {
    levelIdx = idx;
    const lv = LEVELS[idx];
    const data = lv.build();
    const Engine = { sorter: Engines.Sorter, shooter: Engines.Shooter, runner: Engines.Runner }[lv.engine];
    explainCb = null;
    $("feedback").hidden = true;
    $("pause-menu").hidden = true;
    Input.clear();
    $("hud-level").textContent = lv.title;
    $("pad-action").textContent = lv.engine === "shooter" ? "Disparar" : lv.engine === "sorter" ? "Soltar" : "·";
    $("pad-action").disabled = lv.engine === "runner";
    ui.prompt({ ask: "Prepárate…", code: "" });
    game = new Engine(lv, data, ui);
    game.pushHud();
    // intro
    $("intro-eyebrow").textContent = lv.topic;
    $("intro-title").textContent = lv.title;
    $("intro-text").innerHTML = lv.intro;
    $("intro-controls").textContent = lv.controls;
    $("intro").hidden = false;
    paused = true;
    show("play");
    fitStage();
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    setTimeout(() => $("btn-start").focus({ preventScroll: true }), 50);
  }
  function begin() {
    if (window.SFX) SFX.play("start");
    $("intro").hidden = true;
    paused = false;
    Input.clear();
    last = performance.now();
  }
  $("btn-start").addEventListener("click", begin);

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (game) game.frame(ctx, paused || explainCb ? 0 : dt);
    requestAnimationFrame(loop);
  }

  function setPause(on) {
    if (!game || game.done || !$("intro").hidden) return;
    paused = on;
    $("pause-menu").hidden = !on;
    Input.clear();
  }
  $("btn-pause").addEventListener("click", () => setPause(!paused));
  $("btn-resume").addEventListener("click", () => setPause(false));
  $("btn-restart").addEventListener("click", () => startLevel(levelIdx));
  $("btn-quit").addEventListener("click", () => { stopGame(); renderHub(); });
  function stopGame() { game = null; running = false; paused = false; explainCb = null; }

  function endLevel(res) {
    const lv = LEVELS[levelIdx];
    const before = LEVELS.filter(isUnlocked).map(l => l.id);
    const rec = Store.recordLevel(profile, lv.id, res);
    stopGame();
    $("res-eyebrow").textContent = lv.topic;
    $("res-title").textContent = res.completed ? (lv.boss ? "¡Segfault derrotado!" : "Nivel completado") : "Sin vidas";
    $("res-stars").innerHTML = starsHTML(res.stars);
    $("res-score").textContent = res.score;
    $("res-acc").textContent = `${res.correct}/${res.answered}`;
    $("res-best").textContent = rec.best;
    const ul = $("res-missed");
    ul.innerHTML = "";
    res.missed.forEach(m => { const li = document.createElement("li"); li.innerHTML = missedItemHTML(m, false); ul.appendChild(li); });
    $("res-missed-wrap").hidden = res.missed.length === 0;
    const opened = LEVELS.filter(l => isUnlocked(l) && !before.includes(l.id));
    if (opened.length) $("res-eyebrow").textContent = `¡Desbloqueaste: ${opened.map(l => l.title).join(", ")}!`;
    show("result");
  }
  $("res-retry").addEventListener("click", () => startLevel(levelIdx));
  $("res-hub").addEventListener("click", renderHub);

  /* ---------------- Teclado y controles táctiles ---------------- */
  window.addEventListener("keydown", e => {
    if (!$("soon-modal").hidden && e.code === "Escape") { closeSoon(); return; }
    if ($("screen-play").hidden) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.code === "Escape" || e.code === "KeyP") { setPause(!paused); e.preventDefault(); return; }
    if (explainCb) {
      if ((e.code === "Enter" || e.code === "NumpadEnter") && !e.repeat) { e.preventDefault(); continueExplain(); }
      else if (KEYMAP[e.code]) e.preventDefault();
      return;
    }
    const k = KEYMAP[e.code];
    if (!k) return;
    e.preventDefault();
    if (k === "action" && !$("intro").hidden) { if (!e.repeat) begin(); return; }
    if (e.repeat && k !== "action") return;
    Input.set(k, true);
  });
  window.addEventListener("keyup", e => {
    const k = KEYMAP[e.code];
    if (k) Input.set(k, false);
  });
  document.querySelectorAll(".pad").forEach(btn => {
    const k = btn.dataset.key;
    const down = e => {
      e.preventDefault();
      if (explainCb) return; // la explicación se cierra solo con su botón
      if (k === "action" && !$("intro").hidden) { begin(); return; }
      btn.classList.add("held");
      Input.set(k, true);
    };
    const up = e => { e.preventDefault(); btn.classList.remove("held"); Input.set(k, false); };
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("pointerleave", up);
  });
  // tocar la mitad izquierda/derecha del canvas también mueve
  canvas.addEventListener("pointerdown", e => {
    const r = canvas.getBoundingClientRect();
    const k = e.clientX - r.left < r.width / 2 ? "left" : "right";
    Input.set(k, true);
    const up = () => { Input.set(k, false); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointerup", up);
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && game && !game.done) setPause(true); });

  /* ---------------- Inicio ---------------- */
  function boot() {
    renderLogin();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot, boot); else boot();
})();
