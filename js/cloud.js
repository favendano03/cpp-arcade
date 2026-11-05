/* cloud.js — cuentas en la nube con Firebase (Google o correo) y avance guardado en Firestore.
   El SDK se carga solo si hay configuración y el dominio está habilitado; si no, Cloud.available() es false
   y el juego sigue con perfiles locales. Documento por jugador: users/{uid}. */
(function () {
  "use strict";
  if (window.Cloud && window.Cloud.__mock) return; // las pruebas pueden reemplazarlo

  const SETTINGS = window.CPP_ARCADE_CLOUD || {};
  const VENDOR = ["js/vendor/firebase/firebase-app-compat.js", "js/vendor/firebase/firebase-auth-compat.js", "js/vendor/firebase/firebase-firestore-compat.js"];
  let auth = null, db = null, ready = null;
  let saveTimer = null, pending = null;
  const statusListeners = [];

  function available() {
    return !!(SETTINGS.config && (SETTINGS.hosts || []).includes(location.hostname));
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("No se pudo cargar " + src));
      document.head.appendChild(s);
    });
  }

  function init() {
    if (ready) return ready;
    ready = VENDOR.reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve()).then(() => {
      const app = firebase.initializeApp(SETTINGS.config);
      auth = app.auth();
      db = app.firestore();
      return auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    });
    return ready;
  }

  // Mensajes en español para los errores más comunes de Firebase Auth.
  const ERRORS = {
    "auth/invalid-email": "Ese correo no es válido.",
    "auth/missing-password": "Escribe tu contraseña.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/email-already-in-use": "Ya hay una cuenta con ese correo. Usa “Entrar”.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "No hay una cuenta con ese correo. Usa “Crear cuenta”.",
    "auth/too-many-requests": "Demasiados intentos. Espera un momento y vuelve a probar.",
    "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permite ventanas emergentes para este sitio.",
    "auth/popup-closed-by-user": "Se cerró la ventana de Google antes de terminar.",
    "auth/cancelled-popup-request": "Se cerró la ventana de Google antes de terminar.",
    "auth/network-request-failed": "No hay conexión a internet.",
    "auth/unauthorized-domain": "Este sitio todavía no está autorizado en Firebase.",
    "permission-denied": "La base de datos rechazó el acceso. Revisa las reglas de Firestore.",
    "unavailable": "No hay conexión con la nube. Revisa tu internet."
  };
  function niceError(e) {
    const code = e && e.code;
    return ERRORS[code] || "Algo falló con la cuenta" + (code ? ` (${code})` : "") + ". Intenta de nuevo.";
  }
  function wrap(p) { return p.catch(e => { const err = new Error(niceError(e)); err.code = e && e.code; throw err; }); }

  function userInfo(u) {
    if (!u) return null;
    return { uid: u.uid, email: u.email || "", name: u.displayName || "", provider: (u.providerData[0] || {}).providerId || "" };
  }

  // Convierte entre el perfil del juego y el documento guardado.
  function toDoc(profile) {
    return {
      v: 1,
      name: profile.name,
      xp: profile.xp || 0,
      levels: profile.levels || {},
      missed: (profile.missed || []).slice(0, 60),
      created: profile.created || Date.now(),
      lastPlayed: profile.lastPlayed || Date.now(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  }
  function fromDoc(uid, d) {
    return {
      id: "cloud:" + uid, uid, cloud: true, pin: null,
      name: d.name || "Jugador",
      xp: Number(d.xp) || 0,
      levels: d.levels || {},
      missed: Array.isArray(d.missed) ? d.missed : [],
      created: d.created || Date.now(),
      lastPlayed: d.lastPlayed || Date.now()
    };
  }

  function setStatus(s) { statusListeners.forEach(fn => fn(s)); }

  function flush() {
    if (!pending) return Promise.resolve();
    const p = pending;
    pending = null;
    clearTimeout(saveTimer);
    setStatus("saving");
    return db.collection("users").doc(p.uid).set(toDoc(p))
      .then(() => setStatus("saved"))
      .catch(e => { setStatus("error:" + niceError(e)); pending = pending || p; });
  }
  // Si se cierra la pestaña con cambios pendientes, se intenta guardar igual.
  window.addEventListener("pagehide", () => { if (pending && db) flush(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && pending && db) flush(); });

  window.Cloud = {
    available,
    init: () => wrap(init()),
    onAuth(cb) { init().then(() => auth.onAuthStateChanged(u => cb(userInfo(u)))).catch(() => cb(null)); },
    signInGoogle() {
      return wrap(init().then(() => {
        const prov = new firebase.auth.GoogleAuthProvider();
        prov.setCustomParameters({ prompt: "select_account" });
        return auth.signInWithPopup(prov);
      }).then(r => userInfo(r.user)));
    },
    signInEmail(email, pw) { return wrap(init().then(() => auth.signInWithEmailAndPassword(email.trim(), pw)).then(r => userInfo(r.user))); },
    signUpEmail(email, pw) { return wrap(init().then(() => auth.createUserWithEmailAndPassword(email.trim(), pw)).then(r => userInfo(r.user))); },
    resetPassword(email) { return wrap(init().then(() => auth.sendPasswordResetEmail(email.trim()))); },
    signOut() { return flush().then(() => auth && auth.signOut()); },
    // Devuelve el perfil guardado de este usuario, o null si es su primera vez.
    loadProfile(uid) {
      return wrap(init().then(() => db.collection("users").doc(uid).get()).then(snap => snap.exists ? fromDoc(uid, snap.data()) : null));
    },
    // Crea el perfil en la nube (opcionalmente con el avance de un perfil local).
    createProfile(user, name, fromLocal) {
      const base = fromLocal ? JSON.parse(JSON.stringify(fromLocal)) : { xp: 0, levels: {}, missed: [], created: Date.now() };
      const p = Object.assign(base, { id: "cloud:" + user.uid, uid: user.uid, cloud: true, pin: null, name, lastPlayed: Date.now() });
      return wrap(init().then(() => db.collection("users").doc(user.uid).set(toDoc(p))).then(() => p));
    },
    // Guardado con espera corta, para juntar varios cambios seguidos en una sola escritura.
    save(profile) {
      pending = profile;
      setStatus("pending");
      clearTimeout(saveTimer);
      saveTimer = setTimeout(flush, 1200);
    },
    flush,
    onStatus(fn) { statusListeners.push(fn); }
  };
})();
