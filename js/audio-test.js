/* audio-test.js — prueba de sonido para diagnosticar problemas de audio.
   Solo se activa al abrir la página con #audio al final (por ejemplo cpparcade.cl/#audio). */
(function () {
  "use strict";
  if (location.hash !== "#audio") return;

  const box = document.createElement("div");
  box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;max-width:520px;margin:0 auto;" +
    "background:#fff;color:#111;font:13px/1.45 ui-monospace,Menlo,monospace;border-radius:10px;padding:12px;box-shadow:0 8px 30px #0008";
  box.innerHTML = '<strong style="font:700 14px system-ui">Prueba de sonido</strong>' +
    '<div id="at-info" style="margin:6px 0;white-space:pre-wrap"></div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
    '<button id="at-1">1 · Sonido del juego</button>' +
    '<button id="at-2">2 · Web Audio nuevo</button>' +
    '<button id="at-3">3 · Audio HTML</button></div>' +
    '<div id="at-log" style="margin-top:6px;white-space:pre-wrap;max-height:9em;overflow:auto"></div>';
  document.body.appendChild(box);
  box.querySelectorAll("button").forEach(b => { b.style.cssText = "font:600 13px system-ui;padding:8px 10px;border-radius:8px;border:1px solid #999;background:#f3f3f3;color:#111"; });

  const log = msg => { const el = document.getElementById("at-log"); el.textContent = new Date().toLocaleTimeString() + "  " + msg + "\n" + el.textContent; };
  let watched = null;
  function info() {
    const d = window.SFX && SFX.debug ? SFX.debug() : { state: "SFX no cargó" };
    if (d.ctx && d.ctx !== watched) { watched = d.ctx; d.ctx.addEventListener("statechange", () => log("contexto → " + d.ctx.state)); }
    document.getElementById("at-info").textContent =
      "Estado del audio: " + d.state + "\nSilenciado: " + (d.muted ? "sí" : "no") + "   audioSession: " + d.session +
      "\nNavegador: " + navigator.userAgent.replace(/^Mozilla\/5\.0 /, "");
  }
  setInterval(info, 300); info();
  ["pointerdown", "touchend", "click", "keydown"].forEach(ev =>
    window.addEventListener(ev, e => { if (!box.contains(e.target)) log(ev + " (estado: " + (SFX.debug().state) + ")"); }, true));

  document.getElementById("at-1").addEventListener("click", () => {
    const d = SFX.debug();
    log("1: estado antes = " + d.state);
    if (d.muted) log("1: el juego está silenciado (botón del parlante)");
    SFX.play("start");
  });
  document.getElementById("at-2").addEventListener("click", () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const c = new AC();
      log("2: contexto nuevo, estado = " + c.state);
      const o = c.createOscillator(), g = c.createGain();
      g.gain.value = 0.15; o.frequency.value = 660;
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + 0.3);
      c.resume().then(() => log("2: resume OK, estado = " + c.state), e => log("2: resume falló: " + e));
    } catch (e) { log("2: error " + e.message); }
  });
  document.getElementById("at-3").addEventListener("click", () => {
    // Tono de 0,3 s generado como WAV.
    const sr = 22050, n = Math.floor(sr * 0.3), buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
    w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, "data"); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.sin(2 * Math.PI * 520 * i / sr) * 6000, true);
    const a = new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/wav" })));
    a.play().then(() => log("3: Audio HTML sonando"), e => log("3: Audio HTML bloqueado: " + e.name));
  });
})();
