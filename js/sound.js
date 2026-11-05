/* Efectos de sonido sintetizados con Web Audio: no hay archivos de audio.
   El navegador solo deja sonar audio después de un clic o una tecla, así que el contexto se activa ahí.
   El silencio se recuerda en este navegador. */
(function () {
  "use strict";

  const KEY = "cpparcade-muted";
  let ctx = null, master = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem(KEY) === "1"; } catch (e) { muted = false; }
  const last = {};

  // Cómo se activa el audio. Computador: con el primer clic o tecla, de la forma normal.
  // Pantallas táctiles (iPhone/iPad), que tienen reglas propias:
  // - iOS solo habilita el sonido al TERMINAR un toque (touchend), no al apoyar el dedo.
  // - En el primer toque también se reproduce un audio HTML vacío y se pide la sesión de audio "playback":
  //   así el iPhone suena aunque esté en modo silencio.
  // - Si tras un toque el contexto sigue sin sonar, se descarta y se crea uno nuevo en el siguiente toque.
  const TOUCH = (navigator.maxTouchPoints || 0) > 0 || "ontouchstart" in window;
  let queued = [];
  function flushQueued() {
    const now = performance.now();
    const list = queued.filter(q => now - q.t < 800);
    queued = [];
    list.forEach(q => play(q.name, q.arg));
  }

  let htmlUnlocked = false;
  function unlockHtmlAudio() {
    if (htmlUnlocked) return;
    htmlUnlocked = true;
    try {
      // WAV de 0,05 s en silencio.
      const sr = 8000, n = 400, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
      const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
      w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
      v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
      w(36, "data"); v.setUint32(40, n, true);
      for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
      const a = new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/wav" })));
      a.setAttribute("playsinline", "");
      const r = a.play();
      if (r && r.catch) r.catch(() => { htmlUnlocked = false; });
    } catch (e) { htmlUnlocked = false; }
  }

  function create() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (TOUCH) { try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* no soportado */ } }
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      ctx.onstatechange = () => { if (ctx && ctx.state === "running") flushQueued(); };
    } catch (e) { ctx = null; return false; }
    return true;
  }

  function unlock(fromTouch) {
    if (ctx.state === "running") return;
    const c = ctx;
    try {
      const r = c.resume();
      if (r && r.then) r.then(flushQueued, () => {});
    } catch (e) { /* nada */ }
    // Un sonido vacío dentro del gesto termina de desbloquear el audio en Safari de iOS.
    try {
      const src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, 22050);
      src.connect(c.destination);
      src.start(0);
    } catch (e) { /* nada */ }
    // Si no arrancó, en el próximo toque se usa un contexto nuevo (solo en pantallas táctiles).
    if (fromTouch) setTimeout(() => {
      if (ctx === c && c.state !== "running") {
        try { c.close(); } catch (e) { /* nada */ }
        if (ctx === c) ctx = null;
      }
    }, 1000);
  }

  function ensure(fromTouch) {
    if (!ctx && !create()) return false;
    unlock(fromTouch);
    return true;
  }
  // Solo eventos que el navegador considera "gesto del usuario" para activar audio.
  function onGesture(e) {
    const touch = e.type === "touchend" || (e.type === "pointerup" && e.pointerType !== "mouse");
    if (e.type === "pointerup" && !touch) return;                       // mouse: ya lo hizo pointerdown
    if (e.type === "pointerdown" && e.pointerType !== "mouse") return;  // dedo apoyado: aún no vale en iOS
    if (touch) unlockHtmlAudio();
    ensure(touch);
  }
  ["pointerdown", "mousedown", "pointerup", "touchend", "click", "keydown"].forEach(ev =>
    window.addEventListener(ev, onGesture, { capture: true, passive: true }));

  // Una nota: oscilador con envolvente corta. f2 permite un barrido de frecuencia.
  function tone(f, dur, opt) {
    const o = opt || {};
    const t0 = ctx.currentTime + (o.at || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || "square";
    osc.frequency.setValueAtTime(f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
    const v = (o.vol || 0.5);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  function noise(dur, opt) {
    const o = opt || {};
    const t0 = ctx.currentTime + (o.at || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filt = ctx.createBiquadFilter();
    filt.type = o.filter || "lowpass";
    filt.frequency.setValueAtTime(o.freq || 1800, t0);
    if (o.freq2) filt.frequency.exponentialRampToValueAtTime(o.freq2, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol || 0.4, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G4: 392, E4: 329.63, C4: 261.63 };

  // Música del monito que baila (sorpresa de la C): un compás por cada 4 pulsos, a 144 pulsos por minuto.
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);       // nota MIDI → Hz
  const BEAT = 1 / 2.4;
  const DANCE = [                                          // [bajo, melodía en corcheas (0 = silencio)]
    [45, [76, 79, 81, 0, 84, 81, 79, 76]],                 // La menor
    [41, [77, 81, 84, 0, 81, 77, 79, 81]],                 // Fa
    [43, [79, 83, 86, 0, 83, 79, 81, 83]]                  // Sol
  ];

  const SOUNDS = {
    // Un pulso del baile: bombo, platillo, caja, bajo saltando de octava y la melodía.
    dance(b) {
      const n = b || 0, bar = DANCE[Math.floor(n / 4) % DANCE.length], i = n % 4, h = BEAT / 2;
      tone(150, 0.14, { type: "sine", f2: 45, vol: 0.7 });
      noise(0.04, { filter: "highpass", freq: 7000, vol: 0.16, at: h });
      if (i % 2) noise(0.13, { filter: "bandpass", freq: 1900, vol: 0.32 });
      tone(hz(bar[0]), 0.16, { type: "square", vol: 0.16 });
      tone(hz(bar[0] + 12), 0.14, { type: "square", vol: 0.13, at: h });
      [bar[1][i * 2], bar[1][i * 2 + 1]].forEach((m, k) => {
        if (m) tone(hz(m), 0.17, { type: "triangle", vol: 0.34, at: k * h });
      });
    },
    // Saltos del monito: hacia arriba al salir, hacia abajo al esconderse.
    jumpOut() { tone(260, 0.28, { type: "triangle", f2: 1040, vol: 0.4 }); tone(520, 0.2, { type: "square", f2: 1560, vol: 0.06, at: 0.04 }); },
    jumpIn() { tone(1000, 0.35, { type: "triangle", f2: 180, vol: 0.4 }); noise(0.12, { freq: 1200, freq2: 200, vol: 0.25, at: 0.3 }); },
    click() { tone(880, 0.05, { vol: 0.18 }); },
    move() { tone(520, 0.03, { vol: 0.08, type: "triangle" }); },
    start() { tone(N.C5, 0.08, { vol: 0.3 }); tone(N.G5, 0.12, { vol: 0.3, at: 0.09 }); },
    // Acierto: arpegio que sube un poco con la racha.
    right(streak) {
      const k = Math.pow(2, Math.min(streak || 0, 8) / 24);
      [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f * k, 0.09, { vol: 0.32, at: i * 0.055 }));
    },
    wrong() {
      tone(330, 0.28, { type: "sawtooth", f2: 110, vol: 0.28 });
      tone(311, 0.28, { type: "square", f2: 104, vol: 0.12, at: 0.02 });
    },
    hit() { noise(0.22, { freq: 900, freq2: 120, vol: 0.5 }); tone(140, 0.18, { type: "triangle", f2: 60, vol: 0.5 }); },
    shoot() { tone(1200, 0.06, { f2: 500, vol: 0.09 }); },
    pop() { noise(0.08, { filter: "bandpass", freq: 2400, vol: 0.35 }); tone(900, 0.05, { vol: 0.12, f2: 1500 }); },
    bossHit() { noise(0.3, { freq: 3000, freq2: 200, vol: 0.5 }); tone(220, 0.3, { type: "sawtooth", f2: 70, vol: 0.3 }); },
    bossShot() { tone(180, 0.12, { type: "square", f2: 120, vol: 0.08 }); },
    win() {
      [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6].forEach((f, i) => tone(f, i === 5 ? 0.45 : 0.12, { vol: 0.3, at: [0, 0.1, 0.2, 0.3, 0.45, 0.55][i] }));
      tone(N.E6, 0.45, { vol: 0.12, type: "triangle", at: 0.55 });
    },
    lose() { [N.G4, N.E4, N.C4, 196].forEach((f, i) => tone(f, i === 3 ? 0.5 : 0.18, { type: "triangle", vol: 0.4, at: i * 0.2 })); },
    // Fondo del menú: mucho más suave.
    clash() { noise(0.07, { filter: "bandpass", freq: 1600 + Math.random() * 800, vol: 0.09 }); },
    ko() { tone(600, 0.35, { type: "triangle", f2: 150, vol: 0.08 }); }
  };
  // Mínimo de tiempo entre repeticiones del mismo sonido, para que no se amontonen.
  const GAP = { shoot: 0.07, move: 0.04, clash: 0.12, bossShot: 0.1, pop: 0.05 };

  function play(name, arg) {
    if (muted || !SOUNDS[name]) return;
    if (!ctx) return;
    if (ctx.state !== "running") {
      if (!GAP[name]) { queued.push({ name, arg, t: performance.now() }); if (queued.length > 3) queued.shift(); }
      return;
    }
    const now = ctx.currentTime;
    if (GAP[name] && last[name] && now - last[name] < GAP[name]) return;
    last[name] = now;
    try { SOUNDS[name](arg); } catch (e) { /* sin audio no pasa nada */ }
  }

  const listeners = [];
  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem(KEY, muted ? "1" : "0"); } catch (e) { /* ignorar */ }
    listeners.forEach(fn => fn(muted));
    if (!muted && ensure()) setTimeout(() => play("click"), 30);
  }

  window.SFX = {
    play,
    isMuted: () => muted,
    setMuted,
    toggle: () => setMuted(!muted),
    onChange: fn => { listeners.push(fn); fn(muted); },
    // Para la prueba de sonido (cpparcade.cl/#audio).
    debug: () => ({ ctx, state: ctx ? ctx.state : "sin crear", muted, queued: queued.length,
      session: navigator.audioSession ? navigator.audioSession.type : "no soportado" })
  };
})();
