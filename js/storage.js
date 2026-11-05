/* storage.js — perfiles y partidas guardadas en el navegador (localStorage).
   Si el navegador bloquea el almacenamiento, todo sigue funcionando en memoria. */
(function () {
  "use strict";
  const KEY = "stackheap.v1";
  let memory = null; // copia en memoria por si localStorage falla

  function emptyDB() { return { profiles: {}, lastProfile: null }; }

  function load() {
    if (memory) return memory;
    let db = null;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) db = JSON.parse(raw);
    } catch (e) { db = null; }
    if (!db || typeof db !== "object" || !db.profiles) db = emptyDB();
    memory = db;
    return db;
  }

  function persist() {
    try { window.localStorage.setItem(KEY, JSON.stringify(memory)); } catch (e) { /* sin almacenamiento: queda en memoria */ }
  }

  // Hash simple (FNV-1a) para no guardar el PIN en texto plano. No es criptografía real.
  function hashPin(pin) {
    let h = 0x811c9dc5;
    const s = "sh:" + pin;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16);
  }

  function newProfile(name, pin) {
    return {
      id: "p" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
      name: name,
      pin: pin ? hashPin(pin) : null,
      created: Date.now(),
      xp: 0,
      levels: {},   // { id: { best, stars, done, plays } }
      missed: []    // [{ level, ask, code, answer, explain, ts }]
    };
  }

  const Store = {
    list() {
      const db = load();
      return Object.values(db.profiles).sort((a, b) => (b.lastPlayed || b.created) - (a.lastPlayed || a.created));
    },
    get(id) { return load().profiles[id] || null; },
    create(name, pin) {
      const db = load();
      const clean = String(name).trim().slice(0, 16);
      if (!clean) return { error: "Escribe un nombre." };
      if (pin && !/^\d{4}$/.test(pin)) return { error: "El PIN debe tener exactamente 4 dígitos." };
      const taken = Object.values(db.profiles).some(p => p.name.toLowerCase() === clean.toLowerCase());
      if (taken) return { error: "Ya existe un perfil con ese nombre." };
      const p = newProfile(clean, pin);
      db.profiles[p.id] = p;
      persist();
      return { profile: p };
    },
    checkPin(id, pin) {
      const p = this.get(id);
      if (!p) return false;
      if (!p.pin) return true;
      return p.pin === hashPin(pin);
    },
    setLast(id) { load().lastProfile = id; persist(); },
    save(profile) {
      const db = load();
      profile.lastPlayed = Date.now();
      db.profiles[profile.id] = profile;
      persist();
    },
    recordLevel(profile, levelId, result) {
      const lv = profile.levels[levelId] || { best: 0, stars: 0, done: false, plays: 0 };
      lv.plays += 1;
      lv.best = Math.max(lv.best, result.score);
      if (result.completed) {
        lv.done = true;
        lv.stars = Math.max(lv.stars, result.stars);
      }
      profile.levels[levelId] = lv;
      profile.xp += Math.round(result.score / 10);
      for (const m of result.missed) {
        profile.missed.unshift(Object.assign({ level: levelId, ts: Date.now() }, m));
      }
      // sin duplicados exactos, máximo 60 entradas
      const seen = new Set();
      profile.missed = profile.missed.filter(m => {
        const k = m.ask + "|" + m.code;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }).slice(0, 60);
      this.save(profile);
      return lv;
    },
    exportCode(profile) {
      const json = JSON.stringify({ app: "stack-heap", v: 1, profile: profile });
      return "SH1:" + btoa(unescape(encodeURIComponent(json)));
    },
    exportJSON(profile) {
      return JSON.stringify({ app: "stack-heap", v: 1, profile: profile }, null, 2);
    },
    importData(text) {
      let data;
      const t = String(text || "").trim();
      try {
        if (t.startsWith("SH1:")) data = JSON.parse(decodeURIComponent(escape(atob(t.slice(4)))));
        else data = JSON.parse(t);
      } catch (e) {
        return { error: "El código no es válido. Revisa que lo hayas copiado completo." };
      }
      if (!data || data.app !== "stack-heap" || !data.profile || !data.profile.id || !data.profile.name) {
        return { error: "Ese archivo no es una partida de C++ Arcade." };
      }
      const p = data.profile;
      p.levels = p.levels || {};
      p.missed = Array.isArray(p.missed) ? p.missed : [];
      p.xp = Number(p.xp) || 0;
      const db = load();
      db.profiles[p.id] = p;
      persist();
      return { profile: p };
    }
  };

  window.Store = Store;
})();
