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

  // En iPhone/iPad, que el sonido del juego se escuche aunque el teléfono esté en modo silencio.
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* no soportado */ }

  // Safari solo habilita el audio al terminar un toque o clic (touchend/click), no al apoyar el dedo,
  // y puede dejar el contexto "interrupted". Por eso se reintenta en cada gesto hasta que quede sonando.
  function unlock() {
    if (ctx.state === "running") return;
    try { const r = ctx.resume(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* nada */ }
    // Un sonido vacío dentro del gesto termina de desbloquear el audio en Safari de iOS.
    try {
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
    } catch (e) { /* nada */ }
  }

  function ensure() {
    if (ctx) { unlock(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      unlock();
    } catch (e) { ctx = null; return false; }
    return true;
  }
  ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "click", "keydown"].forEach(ev =>
    window.addEventListener(ev, ensure, { capture: true, passive: true }));

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

  const SOUNDS = {
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
    if (!ctx || ctx.state !== "running") return;
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
    onChange: fn => { listeners.push(fn); fn(muted); }
  };
})();
