/* arcade-cases.js — Casos del modo Arcade: "C++ aplicado" en la taberna.
   Un caso por partida (bono, forward o acción ficticia) y tres dificultades sobre el mismo caso.
   Cada pregunta trae una etiqueta de tema (tag) y, cuando se puede, un programa de verificación (check)
   que se compila con g++ para confirmar la respuesta.
   Para sumar materia nueva (POO, Cloud, APIs…) basta agregar generadores con su tag y, si hace falta,
   un caso nuevo en CASES: la escena y el tablero no cambian. */
(function () {
  "use strict";
  const K = window.Content.kit;
  const { rnd, pick, shuffle, cout6, mkQ, freshIdx } = K;

  // Temas que cubre el Arcade hoy. Las materias futuras se agregan aquí (y sus preguntas con ese tag).
  const TOPICS = {
    tipos: "Tipos y conversiones", operadores: "Operadores", cmath: "<cmath>", if: "if / else", for: "Ciclos",
    funciones: "Funciones", referencia: "Paso por valor y referencia", arreglos: "Arreglos", punteros: "Punteros",
    dinamica: "Memoria dinámica", bugs: "Encontrar el bug", completar: "Completar la línea"
  };

  /* Pregunta del tablero.
     check: { prog, out } — programa que g++ debe imprimir exactamente `out` (out por defecto = correcta).
     Si no se pasa check y la pregunta es "¿Qué imprime?", se verifica el mismo código mostrado. */
  function Q(tag, ask, code, correct, dis, explain, check) {
    const q = mkQ(ask, code, correct, dis, explain, 4);
    q.tag = tag;
    if (check === undefined && /¿qué imprime\?/i.test(ask)) check = { prog: code };
    if (check && check.prog === "__CODE__") check.prog = code;
    if (check) q.check = Object.assign({ out: String(correct) }, check);
    return q;
  }
  const n6 = cout6;
  const lit = x => (Number.isInteger(x) ? x + ".0" : String(x));      // literal double en el código
  const STOCKS = ["Empanadas Galácticas S.A.", "Sopaipillas Cuánticas S.A.", "Pingüinos Voladores Ltda.",
    "Completos Espaciales S.A.", "Llamas Turbo S.A.", "Choclo Cripto S.A.", "Mote con Huesillo Holdings"];
  const FILL = "/* ??? */";
  const fill = (code, line) => code.replace(FILL, line);

  /* =====================================================================
     CASO 1 · COMPRA O VENTA DE UN BONO
     ===================================================================== */
  function bondParams() {
    const N = pick([100, 1000]), r = pick([0.03, 0.04, 0.05, 0.06, 0.07, 0.08]), T = rnd(2, 5);
    const c = pick([0.04, 0.05, 0.06, 0.08]);
    const zero = N / Math.pow(1 + r, T);
    const coupon = N * c;
    let cb = 0; for (let t = 1; t <= T; t++) cb += coupon / Math.pow(1 + r, t); cb += N / Math.pow(1 + r, T);
    const mkt = +(zero * (1 + pick([-0.06, -0.04, -0.03, 0.03, 0.04, 0.06]))).toFixed(2);
    const mktC = +(cb * (1 + pick([-0.05, -0.03, 0.03, 0.05]))).toFixed(2);
    return { N, r, T, c, zero, coupon, cb, mkt, mktC, qty: pick([10, 20, 50, 100]), budget: pick([5000, 10000, 25000]) };
  }
  const B_HEAD = p => `double nominal = ${lit(p.N)};\ndouble r = ${p.r};\nint T = ${p.T};`;
  const BOND_EASY = [
    p => Q("tipos", "¿Qué imprime?", `int tasa = ${p.r};\ncout << tasa;`,
      0, [p.r, Math.round(p.r * 100), "No compila"], `Un int no guarda decimales: ${p.r} se trunca a 0. Para una tasa se usa \`double\`.`),
    p => Q("cmath", "¿Qué imprime?", `${B_HEAD(p)}\ncout << pow(1 + r, T);`,
      n6(Math.pow(1 + p.r, p.T)), [n6(1 + p.r * p.T), n6((1 + p.r) * p.T), n6(Math.pow(p.r, p.T))], `pow(base, exp) de <cmath>: (1 + ${p.r})^${p.T} = ${n6(Math.pow(1 + p.r, p.T))}. Es el factor por el que se descuenta el nominal.`),
    p => Q("operadores", "¿Qué imprime?", `${B_HEAD(p)}\ndouble precio = nominal / pow(1 + r, T);\ncout << precio;`,
      n6(p.zero), [n6(p.N * Math.pow(1 + p.r, p.T)), n6(p.N / (1 + p.r * p.T)), n6(p.N / (1 + p.r))], `Bono cero cupón: nominal / (1 + r)^T = ${p.N} / ${n6(Math.pow(1 + p.r, p.T))} = ${n6(p.zero)}.`),
    p => {
      const code = `${B_HEAD(p)}\ndouble precio;\n${FILL}\ncout << precio;   // debe imprimir ${n6(p.zero)}`;
      return Q("completar", "¿Qué línea falta?", code,
        "precio = nominal / pow(1 + r, T);", ["precio = nominal * pow(1 + r, T);", "precio = nominal / (1 + r) * T;", "precio = pow(nominal / (1 + r), T);"],
        "Se trae el nominal a valor presente dividiendo por (1 + r)^T. Multiplicar daría el valor futuro.", { prog: fill(code, "precio = nominal / pow(1 + r, T);"), out: n6(p.zero) });
    },
    p => {
      const buy = p.mkt < p.zero;
      return Q("if", "¿Qué imprime?", `double precio = ${n6(p.zero)};    // valor justo\ndouble mercado = ${p.mkt};\nif (mercado < precio) cout << "COMPRAR";\nelse cout << "VENDER";`,
        buy ? "COMPRAR" : "VENDER", [buy ? "VENDER" : "COMPRAR", "COMPRARVENDER", "Nada"], `El mercado lo vende a ${p.mkt} y vale ${n6(p.zero)}: ${buy ? "está barato, conviene comprar" : "está caro, conviene vender"}. Solo se ejecuta una rama del if.`);
    },
    p => {
      const z = +n6(p.zero), v = (z - p.mkt) * p.qty;
      return Q("operadores", "¿Qué imprime?", `double precio = ${z};\ndouble mercado = ${p.mkt};\nint cantidad = ${p.qty};\ncout << (precio - mercado) * cantidad;`,
        n6(v), [n6(z - p.mkt), n6(z - p.mkt * p.qty), n6(-v)], `Ganancia por bono (${n6(z - p.mkt)}) por ${p.qty} bonos. Los paréntesis hacen que la resta vaya primero.`);
    },
    p => {
      const pc = Math.round(p.r * 100);
      return Q("bugs", "El junior escribió esto. ¿Qué imprime?", `double r = ${pc} / 100;\ncout << r;`,
        0, [p.r, pc, "No compila"], `${pc} / 100 es una división entre enteros: da 0 antes de guardarse en el double. Se arregla con \`${pc} / 100.0\`.`, { prog: `double r = ${pc} / 100;\ncout << r;` });
    },
    p => {
      const px = +p.zero.toFixed(2), n = Math.floor(p.budget / px);
      return Q("tipos", "¿Qué imprime?", `double presupuesto = ${lit(p.budget)};\ndouble precio = ${px};\nint cantidad = presupuesto / precio;\ncout << cantidad;`,
        n, [n6(p.budget / px), n + 1, Math.round(p.budget / 100)], `${p.budget} / ${px} = ${n6(p.budget / px)}, y al guardarlo en un int se trunca: ${n} bonos.`);
    },
    p => Q("tipos", "¿Qué pasa con este código?", `const double nominal = ${lit(p.N)};\nnominal = ${p.N * 2};`,
      "No compila", [p.N * 2, p.N, "Imprime 0"], "Una constante no se puede reasignar: el compilador rechaza la segunda línea.", { prog: `const double nominal = ${lit(p.N)};\nnominal = ${p.N * 2};`, fail: true })
  ];

  const C_HEAD = p => `double nominal = ${lit(p.N)}, tasaCupon = ${p.c}, r = ${p.r};\nint T = ${p.T};\ndouble cupon = nominal * tasaCupon;`;
  const C_LOOP = "double precio = 0;\nfor (int t = 1; t <= T; ++t)\n  precio += cupon / pow(1 + r, t);\nprecio += nominal / pow(1 + r, T);";
  const BOND_MID = [
    p => Q("operadores", "¿Cuánto vale `cupon`?", C_HEAD(p),
      n6(p.coupon), [n6(p.c), n6(p.coupon * p.T), n6(p.N / p.T)], `nominal × tasa cupón = ${p.N} × ${p.c} = ${n6(p.coupon)} por año.`, { prog: C_HEAD(p) + "\ncout << cupon;", out: n6(p.coupon) }),
    p => {
      const s = Array.from({ length: p.T }, (_, i) => i + 1).join(" ");
      return Q("for", "¿Qué imprime?", `int T = ${p.T};\nfor (int t = 1; t <= T; ++t)\n  cout << t << " ";`,
        s, [Array.from({ length: p.T }, (_, i) => i).join(" "), Array.from({ length: p.T - 1 }, (_, i) => i + 1).join(" "), String(p.T)], `Un pago por año, del 1 al ${p.T}: el \`<=\` incluye el último.`, { prog: `int T = ${p.T};\nfor (int t = 1; t <= T; ++t)\n  cout << t << " ";`, out: s });
    },
    p => {
      const noNom = p.cb - p.N / Math.pow(1 + p.r, p.T), raw = p.coupon * p.T + p.N;
      return Q("for", "¿Qué imprime?", `${C_HEAD(p)}\n${C_LOOP}\ncout << precio;`,
        n6(p.cb), [n6(raw), n6(noNom), n6(noNom + p.N)], `Cada cupón se descuenta a su año y el nominal al año ${p.T}: ${n6(p.cb)}.`);
    },
    p => {
      const code = `${C_HEAD(p)}\ndouble precio = 0;\n${FILL}\n  precio += cupon / pow(1 + r, t);\nprecio += nominal / pow(1 + r, T);\ncout << precio;   // debe imprimir ${n6(p.cb)}`;
      return Q("completar", "¿Qué encabezado de for falta?", code,
        "for (int t = 1; t <= T; ++t)", ["for (int t = 0; t < T; ++t)", "for (int t = 1; t < T; ++t)", "for (int t = 0; t <= T; ++t)"],
        `Los cupones se pagan en los años 1 a ${p.T}: t parte en 1 y llega hasta T inclusive.`, { prog: fill(code, "for (int t = 1; t <= T; ++t)"), out: n6(p.cb) });
    },
    p => {
      const t = rnd(1, p.T), v = p.coupon / Math.pow(1 + p.r, t);
      const code = `double vp(double flujo, double r, int t) {\n  return flujo / pow(1 + r, t);\n}\n\n${C_HEAD(p)}`;
      return Q("funciones", `¿Cuánto devuelve \`vp(cupon, r, ${t})\`?`, code,
        n6(v), [n6(p.coupon * Math.pow(1 + p.r, t)), n6(p.coupon), n6(p.coupon / (1 + p.r * t))], `vp descuenta un flujo t años: ${n6(p.coupon)} / (1 + ${p.r})^${t} = ${n6(v)}.`, { prog: code + `\ncout << vp(cupon, r, ${t});`, out: n6(v) });
    },
    p => {
      const eq = Math.random() < 0.25, m = eq ? +p.cb.toFixed(2) : p.mktC, pr = +p.cb.toFixed(2);
      const ans = m < pr ? "COMPRAR" : m > pr ? "VENDER" : "MANTENER";
      const code = `void decidir(double precio, double mercado) {\n  if (mercado < precio) cout << "COMPRAR";\n  else if (mercado > precio) cout << "VENDER";\n  else cout << "MANTENER";\n}\n\ndecidir(${pr}, ${m});`;
      return Q("funciones", "¿Qué imprime?", code, ans, ["COMPRAR", "VENDER", "MANTENER", "Nada"].filter(x => x !== ans),
        `Los argumentos se copian en orden: precio = ${pr}, mercado = ${m}. ${ans === "MANTENER" ? "Son iguales: ninguna de las dos primeras condiciones se cumple." : ans === "COMPRAR" ? "El mercado está bajo el valor justo." : "El mercado está sobre el valor justo."}`);
    },
    p => {
      const ref = Math.random() < 0.5, out = ref ? n6(p.r + 0.01) : n6(p.r);
      const code = `void aplicarSpread(double${ref ? "&" : ""} r) {\n  r = r + 0.01;\n}\n\ndouble r = ${p.r};\naplicarSpread(r);\ncout << r;`;
      return Q("referencia", "¿Qué imprime?", code, out, [ref ? n6(p.r) : n6(p.r + 0.01), "0.01", n6(p.r + 0.1)],
        ref ? "Con `&` el parámetro es la misma variable: el spread sí queda aplicado." : "Sin `&` la función recibe una copia: la r de afuera no cambia. Para modificarla habría que pasarla por referencia.");
    },
    p => {
      const pr = +p.cb.toFixed(2), m = +(pr + pick([-3, -0.5, 0.5, 3])).toFixed(2), dif = +(m - pr).toFixed(2);
      const ans = dif > 1 ? "VENDER" : dif < -1 ? "COMPRAR" : "MANTENER";
      return Q("if", "¿Qué imprime?", `double precio = ${pr}, mercado = ${m};\ndouble dif = mercado - precio;\nif (dif > 1) cout << "VENDER";\nelse if (dif < -1) cout << "COMPRAR";\nelse cout << "MANTENER";`,
        ans, ["VENDER", "COMPRAR", "MANTENER", "Nada"].filter(x => x !== ans), `dif = ${dif}. ${ans === "MANTENER" ? "Está dentro de ±1: no vale la pena operar." : ans === "VENDER" ? "Supera +1: el mercado paga de más." : "Es menor que −1: está barato."}`);
    },
    p => Q("bugs", "El precio sale con basura. ¿Qué falta?", `double cupon = ${n6(p.coupon)}, r = ${p.r};\nint T = ${p.T};\ndouble precio;\nfor (int t = 1; t <= T; ++t)\n  precio += cupon / pow(1 + r, t);`,
      "Inicializar precio en 0", ["Usar int t = 0", "Cambiar += por =", "Usar pow(r, t)"], "`precio` empieza con un valor indeterminado y el ciclo le suma encima. Un acumulador se inicializa: `double precio = 0;`."),
    p => {
      const r2 = +(p.r + 0.01).toFixed(2); let v = 0; for (let t = 1; t <= p.T; t++) v += p.coupon / Math.pow(1 + r2, t); v += p.N / Math.pow(1 + r2, p.T);
      const code = `double precioBono(double nominal, double cupon, double r, int T) {\n  double precio = 0;\n  for (int t = 1; t <= T; ++t)\n    precio += cupon / pow(1 + r, t);\n  return precio + nominal / pow(1 + r, T);\n}\n\ncout << precioBono(${lit(p.N)}, ${n6(p.coupon)}, ${r2}, ${p.T});`;
      return Q("funciones", "¿Qué imprime?", code, n6(v), [n6(p.cb), n6(v - p.N / Math.pow(1 + r2, p.T)), n6(p.N)],
        `Con r = ${r2} el precio baja a ${n6(v)}: si sube la tasa, baja el precio del bono.`);
    }
  ];

  const L_FLOWS = p => `double* flujos = new double[T];\nfor (int t = 0; t < T; ++t)\n  flujos[t] = cupon;\nflujos[T - 1] += nominal;`;
  const L_HEAD = p => `double nominal = ${lit(p.N)}, cupon = ${n6(p.coupon)}, r = ${p.r};\nint T = ${p.T};`;
  const BOND_HARD = [
    p => Q("dinamica", "¿Qué imprime?", `${L_HEAD(p)}\n${L_FLOWS(p)}\ncout << flujos[T - 1];\ndelete[] flujos;`,
      n6(p.coupon + p.N), [n6(p.coupon), n6(p.N), "Basura"], `El último elemento (índice T − 1 = ${p.T - 1}) recibe cupón más nominal: ${n6(p.coupon + p.N)}.`),
    p => Q("bugs", "¿Qué problema tiene este ciclo?", `${L_HEAD(p)}\ndouble* flujos = new double[T];\nfor (int t = 0; t <= T; ++t)\n  flujos[t] = cupon;`,
      "Escribe fuera del arreglo", ["Se salta el primer flujo", "No compila", "Ninguno"], `Con \`<=\` la última vuelta usa t = ${p.T}, pero los índices válidos van de 0 a ${p.T - 1}: escribe fuera del bloque.`),
    p => {
      const c = pick([3, 5, 7, 9]), N = 100, got = Math.floor(Math.floor(N * c / 100) / 2);
      return Q("bugs", "Cupón semestral de un bono de 100 al " + c + " %. ¿Qué imprime?", `int nominal = ${N};\ndouble cupon = nominal * ${c} / 100 / 2;\ncout << cupon;`,
        got, [n6(c / 2), c, 0], `Todo el lado derecho es aritmética entera: ${N} × ${c} / 100 = ${N * c / 100 | 0}, / 2 = ${got}. Se pierde el ,5. Bastaba con \`100.0\` o \`2.0\`.`);
    },
    p => Q("punteros", "¿Qué imprime?", `${L_HEAD(p)}\n${L_FLOWS(p)}\ndouble total = 0;\nfor (double* f = flujos; f != flujos + T; ++f)\n  total += *f;\ncout << total;\ndelete[] flujos;`,
      n6(p.coupon * p.T + p.N), [n6(p.coupon * p.T), n6(p.cb), n6(p.coupon * (p.T - 1) + p.N)], `f recorre los ${p.T} flujos y se detiene en \`flujos + T\` (sin leerlo): ${p.T} cupones más el nominal.`),
    p => Q("arreglos", "¿Qué imprime?", `${L_HEAD(p)}\n${L_FLOWS(p)}\ndouble precio = 0;\nfor (int t = 0; t < T; ++t)\n  precio += flujos[t] / pow(1 + r, t + 1);\ncout << precio;\ndelete[] flujos;`,
      n6(p.cb), [n6(p.coupon * p.T + p.N), n6(p.cb * (1 + p.r)), n6(p.cb - p.N / Math.pow(1 + p.r, p.T))], `El índice t corresponde al año t + 1. Descontando cada flujo: ${n6(p.cb)}.`),
    p => Q("dinamica", "¿Cómo se libera `flujos` al terminar?", `double* flujos = new double[T];`,
      "delete[] flujos;", ["delete flujos;", "free(flujos);", "No hace falta"], "Lo asignado con new[] se libera con delete[], exactamente una vez."),
    p => {
      let v = 0; for (let t = 0; t < p.T; t++) v += (p.coupon + (t === p.T - 1 ? p.N : 0)) / Math.pow(1 + p.r, t + 1);
      const code = `double valorar(double* f, int n, double r) {\n  double v = 0;\n  for (int t = 0; t < n; ++t)\n    v += f[t] / pow(1 + r, t + 1);\n  return v;\n}\n\n${L_HEAD(p)}\n${L_FLOWS(p)}\ncout << valorar(flujos, T, r);\ndelete[] flujos;`;
      return Q("punteros", "¿Qué imprime?", code, n6(v), [n6(p.coupon * p.T + p.N), n6(p.coupon), "No compila"],
        "La función recibe la dirección del primer flujo y la cantidad aparte (el puntero no sabe cuántos hay).");
    },
    p => {
      const code = `${L_HEAD(p)}   // pagos semestrales\n${L_FLOWS(p)}\ndouble precio = 0;\nfor (int t = 0; t < T; ++t)\n  ${FILL}`;
      let v = 0; for (let t = 0; t < p.T; t++) v += (p.coupon + (t === p.T - 1 ? p.N : 0)) / Math.pow(1 + p.r / 2, t + 1);
      return Q("completar", "Si `r` es anual y los pagos son semestrales, ¿qué línea descuenta bien?", code,
        "precio += flujos[t] / pow(1 + r / 2, t + 1);", ["precio += flujos[t] / pow(1 + r, t + 1);", "precio += flujos[t] / pow(1 + r / 2, t);", "precio += flujos[t] / pow(1 + r, (t + 1) / 2);"],
        "Con capitalización semestral la tasa por período es r / 2, y el flujo t se paga en el período t + 1. (Además (t + 1) / 2 sería división entera.)",
        { prog: fill(code, "precio += flujos[t] / pow(1 + r / 2, t + 1);") + "\ncout << precio;\ndelete[] flujos;", out: n6(v) });
    },
    p => Q("dinamica", "¿Qué problema tiene esto?", `double* flujos = new double[T];\n// ...\nflujos = new double[2 * T];\n// ...\ndelete[] flujos;`,
      "Fuga de memoria", ["Doble liberación", "No compila", "Ninguno"], "Al reasignar `flujos` se pierde la única dirección del primer bloque: nunca se libera."),
    p => Q("punteros", "¿Qué imprime?", `${L_HEAD(p)}\n${L_FLOWS(p)}\ndouble* ultimo = flujos + T - 1;\ncout << *ultimo - *flujos;\ndelete[] flujos;`,
      n6(p.N), [n6(p.coupon), n6(p.N + p.coupon), p.T - 1], `\`*ultimo\` es cupón + nominal y \`*flujos\` es el primer cupón: la diferencia es el nominal.`)
  ];

  /* =====================================================================
     CASO 2 · CONSTRUIR UN FORWARD
     ===================================================================== */
  function fwdParams() {
    const S = rnd(40, 160), r = pick([0.03, 0.04, 0.05, 0.06]), T = pick([0.5, 1, 2]), q = pick([0.01, 0.02]);
    const F = S * Math.exp(r * T), Fq = S * Math.exp((r - q) * T);
    const ST = S + pick([-12, -8, -5, 5, 8, 12]);
    return { S, r, T, q, F, Fq, ST, n: pick([5, 10, 20]), size: pick([10, 100]), meses: pick([3, 6, 9]) };
  }
  const F_HEAD = p => `double S = ${lit(p.S)}, r = ${p.r}, T = ${p.T};`;
  const FWD_EASY = [
    p => Q("cmath", "¿Qué imprime?", `${F_HEAD(p)}\ndouble F = S * exp(r * T);\ncout << F;`,
      n6(p.F), [n6(p.S * (1 + p.r * p.T)), n6(p.S * Math.exp(p.r) * p.T), n6(p.S / Math.exp(p.r * p.T))], `Forward con capitalización continua: S·e^(rT) = ${p.S} · e^(${n6(p.r * p.T)}) = ${n6(p.F)}. exp está en <cmath>.`),
    p => {
      const code = `${F_HEAD(p)}\ndouble F;\n${FILL}\ncout << F;   // debe imprimir ${n6(p.F)}`;
      return Q("completar", "¿Qué línea falta?", code, "F = S * exp(r * T);", ["F = S * exp(r) * T;", "F = S / exp(r * T);", "F = exp(S * r * T);"],
        "El spot se lleva al futuro con el factor e^(rT). Dividir lo traería al pasado.", { prog: fill(code, "F = S * exp(r * T);"), out: n6(p.F) });
    },
    p => {
      const F = +p.F.toFixed(2);
      return Q("operadores", "Al vencimiento el precio es `ST`. ¿Qué imprime?", `double F = ${F};     // precio pactado\ndouble ST = ${lit(p.ST)};\ndouble payoff = ST - F;   // posición larga\ncout << payoff;`,
        n6(p.ST - F), [n6(F - p.ST), n6(p.ST), n6(p.ST + F)], `El largo compra a F = ${F} algo que vale ${p.ST}: gana ST − F = ${n6(p.ST - F)}${p.ST < F ? " (pierde)" : ""}.`, { prog: `double F = ${F};\ndouble ST = ${lit(p.ST)};\ndouble payoff = ST - F;\ncout << payoff;`, out: n6(p.ST - F) });
    },
    p => {
      const F = +p.F.toFixed(2), ans = p.ST > F ? "GANA EL COMPRADOR" : "GANA EL VENDEDOR";
      return Q("if", "¿Qué imprime?", `double F = ${F}, ST = ${lit(p.ST)};\nif (ST > F) cout << "GANA EL COMPRADOR";\nelse cout << "GANA EL VENDEDOR";`,
        ans, [ans === "GANA EL COMPRADOR" ? "GANA EL VENDEDOR" : "GANA EL COMPRADOR", "Nada", "Ambos"], `ST = ${p.ST} ${p.ST > F ? ">" : "<"} F = ${F}.`);
    },
    p => {
      const F = +p.F.toFixed(2), v = p.n * p.size * (p.ST - F);
      return Q("operadores", "¿Qué imprime?", `double F = ${F}, ST = ${lit(p.ST)};\nint contratos = ${p.n}, tamano = ${p.size};\ncout << contratos * tamano * (ST - F);`,
        n6(v), [n6(p.ST - F), n6(p.n * (p.ST - F)), n6(-v)], `${p.n} contratos de ${p.size} unidades: ${p.n * p.size} × (${n6(p.ST - F)}) = ${n6(v)}.`);
    },
    p => Q("bugs", "El forward es a " + p.meses + " meses. ¿Qué imprime?", `int meses = ${p.meses};\ndouble T = meses / 12;\ncout << T;`,
      0, [n6(p.meses / 12), p.meses, 12], `meses / 12 es división entera: da 0. El forward quedaría igual al spot. Se arregla con \`meses / 12.0\`.`),
    p => Q("tipos", "¿Qué imprime?", `int meses = ${p.meses};\ndouble T = meses / 12.0;\ncout << T;`,
      n6(p.meses / 12), [0, p.meses, n6(12 / p.meses)], `Con 12.0 la división es real: ${p.meses} / 12 = ${n6(p.meses / 12)} años.`),
    p => {
      const F = +p.F.toFixed(2);
      return Q("operadores", "Para el vendedor (posición corta), ¿qué imprime?", `double F = ${F}, ST = ${lit(p.ST)};\ndouble payoff = F - ST;\ncout << payoff;`,
        n6(F - p.ST), [n6(p.ST - F), n6(F), 0], `El corto vende a F lo que vale ST: gana F − ST = ${n6(F - p.ST)}. Es exactamente lo contrario del largo.`);
    },
    p => Q("tipos", "¿Qué pasa con este código?", `const double r = ${p.r};\nr = ${p.r + 0.01};`,
      "No compila", [n6(p.r + 0.01), n6(p.r), "Imprime 0"], "r es const: no se puede asignar después de inicializarla.", { prog: `const double r = ${p.r};\nr = ${p.r + 0.01};`, fail: true })
  ];

  const FWD_FN = "double forward(double S, double r, double T) {\n  return S * exp(r * T);\n}";
  const FWD_MID = [
    p => Q("funciones", `¿Cuánto devuelve \`forward(${p.S}, ${p.r}, ${p.T})\`?`, FWD_FN,
      n6(p.F), [n6(p.S * (1 + p.r * p.T)), n6(p.S), n6(p.S * Math.exp(p.r))], `S·e^(rT) = ${n6(p.F)}.`, { prog: FWD_FN + `\ncout << forward(${p.S}, ${p.r}, ${p.T});`, out: n6(p.F) }),
    p => {
      const code = `double forwardDiv(double S, double r, double q, double T) {\n  return S * exp((r - q) * T);\n}\n\ncout << forwardDiv(${p.S}, ${p.r}, ${p.q}, ${p.T});`;
      return Q("funciones", "La acción paga dividendos continuos `q`. ¿Qué imprime?", code,
        n6(p.Fq), [n6(p.F), n6(p.S * Math.exp((p.r + p.q) * p.T)), n6(p.S * Math.exp(p.r - p.q * p.T))], `Los dividendos restan al costo de mantener: S·e^((r − q)T) = ${n6(p.Fq)}.`, { prog: code, out: n6(p.Fq) });
    },
    p => {
      const code = `double forwardDiv(double S, double r, double q, double T) {\n  ${FILL}\n}\n\ncout << forwardDiv(${p.S}, ${p.r}, ${p.q}, ${p.T});   // ${n6(p.Fq)}`;
      return Q("completar", "¿Qué línea falta?", code, "return S * exp((r - q) * T);", ["return S * exp(r - q * T);", "return S * exp((r + q) * T);", "S * exp((r - q) * T);"],
        "Hay que restar q de r antes de multiplicar por T (paréntesis), y la función debe devolver el valor con return.", { prog: fill(code, "return S * exp((r - q) * T);"), out: n6(p.Fq) });
    },
    p => {
      const F = +p.F.toFixed(2), d = pick([5, 10, 15]);
      const s = [-1, 0, 1].map(i => (p.S + i * d > F ? "+" : "-")).join("");
      const code = `double S = ${lit(p.S)}, F = ${F};\nfor (int i = 0; i < 3; ++i) {\n  double ST = S + (i - 1) * ${d};\n  if (ST > F) cout << "+";\n  else cout << "-";\n}`;
      return Q("for", "Escenarios para el comprador. ¿Qué imprime?", code, s, ["---", "+++", "-++", "--+", "+--"].filter(x => x !== s),
        `Se prueban ST = ${p.S - d}, ${p.S} y ${p.S + d} contra F = ${F}: "+" si gana el comprador.`, { prog: code, out: s });
    },
    p => {
      const F = +p.F.toFixed(2), a = p.ST, b = p.ST + pick([4, -4, 6]);
      const code = `void liquidar(double ST, double F, double& pnl) {\n  pnl += ST - F;\n}\n\ndouble pnl = 0;\nliquidar(${lit(a)}, ${F}, pnl);\nliquidar(${lit(b)}, ${F}, pnl);\ncout << pnl;`;
      return Q("referencia", "¿Qué imprime?", code, n6(a - F + b - F), [0, n6(b - F), n6(a + b - F)],
        "pnl se pasa por referencia, así que cada llamada acumula en la misma variable: dos liquidaciones.");
    },
    p => {
      const F = +p.F.toFixed(2), largo = Math.random() < 0.5;
      const code = `double payoff(double ST, double F, bool largo) {\n  if (largo) return ST - F;\n  return F - ST;\n}\n\ncout << payoff(${lit(p.ST)}, ${F}, ${largo});`;
      return Q("funciones", "¿Qué imprime?", code, n6(largo ? p.ST - F : F - p.ST), [n6(largo ? F - p.ST : p.ST - F), 0, n6(p.ST)],
        `largo = ${largo}: ${largo ? "devuelve ST − F" : "el if no se cumple y devuelve F − ST"}.`);
    },
    p => Q("bugs", "El forward sale con basura. ¿Qué falta?", "double forward(double S, double r, double T) {\n  S * exp(r * T);\n}",
      "Un return", ["Un punto y coma", "Pasar S por referencia", "Declararla void"], "La función calcula el valor pero no lo devuelve: falta `return S * exp(r * T);`. Compila (con advertencia), pero llegar al final de una función no void sin return deja un valor indefinido."),
    p => {
      const meses = pick([12, 18, 24]), k = Math.floor((meses - 1) / 3) + 1;
      return Q("for", "Revisión trimestral del margen. ¿Cuántas veces se imprime?", `int meses = ${meses};\nfor (int m = 1; m <= meses; m += 3)\n  cout << "margen ";`,
        k, [meses / 3 + 1, meses, meses / 3 - 1], `m toma 1, 4, 7, …, hasta no pasar de ${meses}: ${k} vueltas.`, { prog: `int meses = ${meses};\nint n = 0;\nfor (int m = 1; m <= meses; m += 3)\n  ++n;\ncout << n;`, out: String(k) });
    },
    p => {
      const v = p.S * Math.exp(p.r);
      const code = "double forward(double S, double r, double T = 1.0) {\n  return S * exp(r * T);\n}\n\ncout << forward(" + p.S + ", " + p.r + ");";
      return Q("funciones", "¿Qué imprime?", code, n6(v), ["No compila", n6(p.S), n6(p.S * Math.exp(p.r * 2))], "T toma su valor por defecto (1.0 año).");
    }
  ];

  const FWD_HARD = [
    p => {
      const n = rnd(3, 5), v = p.S * (0.9 + 0.1 * (n - 1));
      return Q("dinamica", "¿Qué imprime?", `double S = ${lit(p.S)};\nint n = ${n};\ndouble* ST = new double[n];\nfor (int i = 0; i < n; ++i)\n  ST[i] = S * (0.9 + 0.1 * i);\ncout << ST[n - 1];\ndelete[] ST;`,
        n6(v), [n6(p.S * (0.9 + 0.1 * n)), n6(p.S * 0.9), "Basura"], `El último escenario es el índice ${n - 1}: S × ${n6(0.9 + 0.1 * (n - 1))} = ${n6(v)}.`);
    },
    p => {
      const n = 5, F = +p.F.toFixed(2), sc = Array.from({ length: n }, (_, i) => p.S * (0.9 + 0.05 * i)), w = sc.filter(x => x > F).length;
      return Q("arreglos", "¿Cuántos escenarios gana el comprador?", `double S = ${lit(p.S)}, F = ${F};\nint n = ${n};\ndouble* ST = new double[n];\nfor (int i = 0; i < n; ++i)\n  ST[i] = S * (0.9 + 0.05 * i);\nint gana = 0;\nfor (int i = 0; i < n; ++i)\n  if (ST[i] > F) ++gana;\ncout << gana;\ndelete[] ST;`,
        w, [0, 1, 2, 3, 4, 5].filter(x => x !== w), `Escenarios: ${sc.map(n6).join(", ")}. Superan F = ${F}: ${w}.`, { prog: "__CODE__" });
    },
    p => {
      const F = +p.F.toFixed(2), sc = [0.9, 1.0, 1.1].map(k => p.S * k), best = Math.max(...sc) - F;
      const code = `double S = ${lit(p.S)}, F = ${F};\ndouble* ST = new double[3];\nST[0] = S * 0.9; ST[1] = S; ST[2] = S * 1.1;\ndouble mejor = *ST - F;\nfor (double* p = ST + 1; p != ST + 3; ++p)\n  if (*p - F > mejor) mejor = *p - F;\ncout << mejor;\ndelete[] ST;`;
      return Q("punteros", "¿Qué imprime?", code, n6(best), [n6(sc[0] - F), n6(sc[1] - F), n6(Math.max(...sc))], `p recorre los escenarios 1 y 2 buscando el mayor ST − F: ${n6(best)} (con ST = ${n6(sc[2])}).`);
    },
    p => {
      const code = `${FWD_FN.replace("double T", "int meses").replace("r * T", "r * (meses / 12)")}\n\ncout << forward(${p.S}, ${p.r}, ${p.meses});`;
      return Q("bugs", "¿Qué imprime?", code, n6(p.S), [n6(p.S * Math.exp(p.r * p.meses / 12)), n6(p.S * Math.exp(p.r * p.meses)), 0],
        `meses / 12 con ${p.meses} es división entera: 0. Entonces e^0 = 1 y el forward sale igual al spot (${p.S}). Debería ser meses / 12.0.`);
    },
    p => Q("bugs", "¿Qué problema tiene este ciclo?", "double total = 0;\nfor (int i = 1; i <= n; ++i)\n  total += ST[i] - F;",
      "Se salta ST[0] y lee ST[n]", ["Solo se salta ST[n]", "No compila", "Ninguno"], "Los índices válidos van de 0 a n − 1. Partir en 1 omite el primero y `<=` lee una posición fuera del arreglo."),
    p => {
      const v = p.ST - p.F;
      const code = `void forwardYPnl(double S, double r, double T, double ST, double& F, double& pnl) {\n  F = S * exp(r * T);\n  pnl = ST - F;\n}\n\ndouble F = 0, pnl = 0;\nforwardYPnl(${lit(p.S)}, ${p.r}, ${p.T}, ${lit(p.ST)}, F, pnl);\ncout << pnl;`;
      return Q("referencia", "¿Qué imprime?", code, n6(v), [0, n6(p.F), n6(-v)], `Las dos salidas vuelven por referencia: F = ${n6(p.F)} y pnl = ST − F = ${n6(v)}.`);
    },
    p => {
      const F = +p.F.toFixed(2), corto = Math.random() < 0.5;
      const code = `double largo(double ST, double F) { return ST - F; }\ndouble corto(double ST, double F) { return F - ST; }\n\ndouble (*pago)(double, double) = ${corto ? "corto" : "largo"};\ncout << pago(${lit(p.ST)}, ${F});`;
      return Q("punteros", "¿Qué imprime?", code, n6(corto ? F - p.ST : p.ST - F), [n6(corto ? p.ST - F : F - p.ST), "No compila", 0],
        `pago apunta a ${corto ? "corto" : "largo"}, así que la llamada usa esa función.`);
    },
    p => Q("dinamica", "Si `new (std::nothrow)` no consigue memoria para los escenarios…", "double* ST = new (std::nothrow) double[n];",
      "ST queda nulo", ["Lanza bad_alloc", "ST queda con ceros", "No compila"], "nothrow informa el fallo con un puntero nulo: hay que comprobar `ST == nullptr` antes de usarlo."),
    p => Q("dinamica", "¿Qué problema tiene esto?", "double* ST = new double[n];\nfor (int i = 0; i < n; ++i) ST[i] = S;\ndelete[] ST;\ncout << ST[0];",
      "Usa memoria ya liberada", ["Fuga de memoria", "No compila", "Ninguno"], "Después de delete[] el puntero queda colgante: leer ST[0] no es válido.")
  ];

  /* =====================================================================
     CASO 3 · VALORAR UNA ACCIÓN FICTICIA
     ===================================================================== */
  function stockParams() {
    const name = pick(STOCKS), D0 = pick([0.8, 1.2, 1.5, 2, 2.5, 3]), g = pick([0.02, 0.03, 0.04]), k = pick([0.08, 0.1, 0.12]);
    const D1 = D0 * (1 + g), P = D1 / (k - g);
    const mkt = +(P * (1 + pick([-0.15, -0.08, 0.08, 0.15]))).toFixed(2);
    return { name, D0, g, k, D1, P, mkt, budget: pick([1000, 2500, 5000]) };
  }
  const S_HEAD = p => `double D0 = ${lit(p.D0)}, g = ${p.g}, k = ${p.k};`;
  const STOCK_EASY = [
    p => Q("operadores", "¿Qué imprime?", `${S_HEAD(p)}\ndouble D1 = D0 * (1 + g);\ncout << D1;`,
      n6(p.D1), [n6(p.D0 * p.g), n6(p.D0 + p.g), n6(p.D0)], `El dividendo del próximo año crece a la tasa g: ${p.D0} × ${1 + p.g} = ${n6(p.D1)}.`),
    p => Q("operadores", "¿Qué imprime?", `${S_HEAD(p)}\ndouble D1 = D0 * (1 + g);\ndouble P = D1 / (k - g);\ncout << P;`,
      n6(p.P), [n6(p.D1 / p.k - p.g), n6(p.D1 / (p.k + p.g)), n6(p.D0 / (p.k - p.g))], `Modelo de Gordon: D1 / (k − g) = ${n6(p.D1)} / ${n6(p.k - p.g)} = ${n6(p.P)}.`),
    p => {
      const code = `${S_HEAD(p)}\ndouble D1 = D0 * (1 + g);\ndouble P;\n${FILL}\ncout << P;   // debe imprimir ${n6(p.P)}`;
      return Q("completar", "¿Qué línea falta?", code, "P = D1 / (k - g);", ["P = D1 / k - g;", "P = D1 / (g - k);", "P = D0 / (k + g);"],
        "Sin paréntesis, `D1 / k - g` divide primero y después resta. El denominador completo es (k − g).", { prog: fill(code, "P = D1 / (k - g);"), out: n6(p.P) });
    },
    p => {
      const buy = p.mkt < p.P;
      return Q("if", "¿Qué imprime?", `double P = ${n6(p.P)};      // valor por dividendos\ndouble mercado = ${p.mkt};\nif (mercado < P) cout << "COMPRAR";\nelse cout << "VENDER";`,
        buy ? "COMPRAR" : "VENDER", [buy ? "VENDER" : "COMPRAR", "Nada", "COMPRARVENDER"], `La acción se transa a ${p.mkt} y vale ${n6(p.P)}: ${buy ? "está barata" : "está cara"}.`);
    },
    p => {
      const n = Math.floor(p.budget / p.mkt);
      return Q("tipos", "¿Qué imprime?", `double presupuesto = ${lit(p.budget)};\ndouble mercado = ${p.mkt};\nint acciones = presupuesto / mercado;\ncout << acciones;`,
        n, [n6(p.budget / p.mkt), n + 1, Math.round(p.budget / 10)], `${p.budget} / ${p.mkt} = ${n6(p.budget / p.mkt)}; al guardarlo en un int se trunca a ${n} acciones.`);
    },
    p => {
      const n = Math.floor(p.budget / p.mkt), rest = p.budget - n * p.mkt;
      return Q("operadores", "¿Cuánto vuelto queda? ¿Qué imprime?", `double presupuesto = ${lit(p.budget)};\ndouble mercado = ${p.mkt};\nint acciones = presupuesto / mercado;\ncout << presupuesto - acciones * mercado;`,
        n6(rest), [0, n6(p.mkt), n6(p.budget - (n + 1) * p.mkt)], `Se compran ${n} acciones por ${n6(n * p.mkt)}: sobran ${n6(rest)}.`);
    },
    p => Q("bugs", "El junior olvidó los paréntesis. ¿Qué imprime?", `${S_HEAD(p)}\ndouble D1 = D0 * (1 + g);\ndouble P = D1 / k - g;\ncout << P;`,
      n6(p.D1 / p.k - p.g), [n6(p.P), n6(p.D1 / (p.k + p.g)), "No compila"], `La división va antes que la resta: ${n6(p.D1)} / ${p.k} − ${p.g} = ${n6(p.D1 / p.k - p.g)}. Debía ser D1 / (k − g) = ${n6(p.P)}.`),
    p => {
      const b = p.mkt < p.P ? 1 : 0;
      return Q("tipos", "¿Qué imprime?", `double P = ${n6(p.P)}, mercado = ${p.mkt};\nbool barata = mercado < P;\ncout << barata;`,
        b, [1 - b, "true", "false"], `cout muestra un bool como 1 o 0 (sin boolalpha). ${p.mkt} ${b ? "<" : ">"} ${n6(p.P)}: ${b}.`);
    },
    p => {
      const v = p.D0 / p.k;
      return Q("operadores", "Si el dividendo no creciera (perpetuidad), ¿qué imprime?", `double D = ${lit(p.D0)}, k = ${p.k};\ncout << D / k;`,
        n6(v), [n6(p.D0 * p.k), n6(p.P), n6(p.D0 / (1 + p.k))], `Una perpetuidad constante vale D / k = ${n6(v)}. Es Gordon con g = 0.`);
    }
  ];

  const STOCK_MID = [
    p => {
      const n = rnd(2, 4), v = p.D0 * Math.pow(1 + p.g, n);
      return Q("for", "¿Qué imprime?", `double d = ${lit(p.D0)}, g = ${p.g};\nfor (int t = 1; t <= ${n}; ++t)\n  d = d * (1 + g);\ncout << d;`,
        n6(v), [n6(p.D0 * (1 + p.g * n)), n6(p.D0 * Math.pow(1 + p.g, n - 1)), n6(p.D0 * Math.pow(1 + p.g, n + 1))], `${n} vueltas: el dividendo crece ${n} veces, ${p.D0} × ${1 + p.g}^${n} = ${n6(v)}.`);
    },
    p => {
      const bad = Math.random() < 0.4, k = bad ? p.g : p.k, ans = bad ? "-1" : n6(p.D1 / (p.k - p.g));
      const code = `double gordon(double D1, double k, double g) {\n  if (k <= g) return -1;   // el modelo no aplica\n  return D1 / (k - g);\n}\n\ncout << gordon(${n6(p.D1)}, ${k}, ${p.g});`;
      return Q("funciones", "¿Qué imprime?", code, ans, bad ? ["inf", "0", "No compila"] : ["-1", n6(p.D1 / p.k), n6(p.D1 / (p.k + p.g))],
        bad ? "k no supera a g: la función lo detecta y devuelve −1 antes de dividir por cero." : `k > g, así que calcula D1 / (k − g) = ${ans}.`);
    },
    p => {
      const n = 3; let d = p.D0, v = 0; for (let t = 1; t <= n; t++) { d *= 1 + p.g; v += d / Math.pow(1 + p.k, t); }
      const code = `${S_HEAD(p)}\ndouble d = D0, vp = 0;\nfor (int t = 1; t <= ${n}; ++t) {\n  d = d * (1 + g);\n  vp += d / pow(1 + k, t);\n}\ncout << vp;`;
      return Q("for", "Valor presente de los próximos 3 dividendos. ¿Qué imprime?", code, n6(v),
        [n6(p.D0 * 3 / (1 + p.k)), n6(p.D1 * 3), n6(v * (1 + p.k))], `Cada vuelta hace crecer el dividendo y lo descuenta a su año: ${n6(v)}.`);
    },
    p => {
      const obj = +(p.D0 * pick([1.1, 1.2, 1.3])).toFixed(2); let d = p.D0, n = 0; while (d < obj) { d *= 1 + p.g; n++; }
      const code = `double d = ${lit(p.D0)}, g = ${p.g};\nint anios = 0;\nwhile (d < ${obj}) {\n  d = d * (1 + g);\n  ++anios;\n}\ncout << anios;`;
      return Q("for", `¿En cuántos años el dividendo llega a ${obj}?`, code, n, [n - 1, n + 1, Math.round((obj - p.D0) / (p.D0 * p.g))].filter(x => x !== n),
        `El while repite mientras d < ${obj}: crece ${n} veces.`, { prog: code, out: String(n) });
    },
    p => {
      const code = `void subirDividendo(double d) {\n  d = d * 1.1;\n}\n\ndouble D0 = ${lit(p.D0)};\nsubirDividendo(D0);\ncout << D0;`;
      return Q("referencia", "¿Qué imprime?", code, n6(p.D0), [n6(p.D0 * 1.1), "0", n6(p.D0 + 1.1)],
        "d es una copia: la función cambia su copia y D0 sigue igual. Para modificarlo: `void subirDividendo(double& d)`.");
    },
    p => {
      const m = p.mkt, ans = p.P > m * 1.2 ? "MUY BARATA" : p.P > m ? "BARATA" : "CARA";
      return Q("if", "¿Qué imprime?", `double P = ${n6(p.P)}, mercado = ${m};\nif (P > mercado * 1.2) cout << "MUY BARATA";\nelse if (P > mercado) cout << "BARATA";\nelse cout << "CARA";`,
        ans, ["MUY BARATA", "BARATA", "CARA", "MUY BARATABARATA"].filter(x => x !== ans), `mercado × 1.2 = ${n6(m * 1.2)}. Se evalúan las condiciones en orden y se ejecuta solo la primera que se cumple.`);
    },
    p => {
      const two = Math.random() < 0.5;
      const code = `double precio(double D1, double k) { return D1 / k; }\ndouble precio(double D1, double k, double g) { return D1 / (k - g); }\n\ncout << precio(${n6(p.D1)}, ${p.k}${two ? "" : ", " + p.g});`;
      const v = two ? p.D1 / p.k : p.D1 / (p.k - p.g);
      return Q("funciones", "¿Qué imprime?", code, n6(v), [n6(two ? p.D1 / (p.k - p.g) : p.D1 / p.k), "No compila", n6(p.D1)],
        `Sobrecarga: con ${two ? "dos" : "tres"} argumentos se llama a la versión ${two ? "de perpetuidad (D1 / k)" : "de Gordon (D1 / (k − g))"}.`);
    },
    p => {
      const n = rnd(3, 6), code = `double d = ${lit(p.D0)}, g = ${p.g};\n${FILL}\n  d = d * (1 + g);\ncout << d;   // dividendo del año ${n}`;
      return Q("completar", `¿Qué encabezado hace crecer el dividendo hasta el año ${n}?`, code,
        `for (int t = 1; t <= ${n}; ++t)`, [`for (int t = 1; t < ${n}; ++t)`, `for (int t = 0; t <= ${n}; ++t)`, `for (int t = ${n}; t < 0; ++t)`],
        `Hay que aplicar el crecimiento ${n} veces: t de 1 a ${n} inclusive.`, { prog: fill(code, `for (int t = 1; t <= ${n}; ++t)`), out: n6(p.D0 * Math.pow(1 + p.g, n)) });
    },
    p => Q("tipos", "¿Qué pasa si `k` y `g` son iguales?", "double gordonSinValidar(double D1, double k, double g) {\n  return D1 / (k - g);\n}",
      "Divide por cero (inf)", ["Devuelve 0", "No compila", "Devuelve D1"], "k − g = 0 y dividir un double por 0.0 da infinito (inf). Por eso conviene validar k > g antes.")
  ];

  const D_ARR = (p, n) => `${S_HEAD(p)}\nint n = ${n};\ndouble* divs = new double[n];\ndivs[0] = D0 * (1 + g);\nfor (int t = 1; t < n; ++t)\n  divs[t] = divs[t - 1] * (1 + g);`;
  const STOCK_HARD = [
    p => {
      const n = rnd(3, 5), v = p.D0 * Math.pow(1 + p.g, n);
      return Q("dinamica", "¿Qué imprime?", `${D_ARR(p, n)}\ncout << divs[n - 1];\ndelete[] divs;`,
        n6(v), [n6(p.D0 * Math.pow(1 + p.g, n - 1)), n6(p.D0 * Math.pow(1 + p.g, n + 1)), n6(p.D1)], `divs[t] es el dividendo del año t + 1. El último (índice ${n - 1}) es D0 × (1 + g)^${n} = ${n6(v)}.`);
    },
    p => Q("bugs", "¿Qué problema tiene este ciclo?", "double* divs = new double[n];\nfor (int t = 0; t < n; ++t)\n  divs[t] = divs[t - 1] * (1 + g);",
      "Lee divs[-1] y valores sin asignar", ["Escribe divs[n]", "No compila", "Ninguno"], "En la vuelta t = 0 lee divs[-1], fuera del arreglo, y además nada inicializó los elementos. Hay que asignar divs[0] y partir en t = 1."),
    p => {
      const n = 3; let v = 0, d = p.D0; for (let t = 0; t < n; t++) { d *= 1 + p.g; v += d / Math.pow(1 + p.k, t + 1); }
      return Q("arreglos", "¿Qué imprime?", `${D_ARR(p, n)}\ndouble vp = 0;\nfor (int t = 0; t < n; ++t)\n  vp += divs[t] / pow(1 + k, t + 1);\ncout << vp;\ndelete[] divs;`,
        n6(v), [n6(v * (1 + p.k)), n6(p.D1 * 3 / (1 + p.k)), n6(p.D1 * 3)], `Cada dividendo se descuenta a su año (t + 1): ${n6(v)}.`);
    },
    p => {
      const n = 3; let v = 0, d = p.D0; for (let t = 0; t < n; t++) { d *= 1 + p.g; v += d / Math.pow(1 + p.k, t + 1); }
      const term = d * (1 + p.g) / (p.k - p.g), tot = v + term / Math.pow(1 + p.k, n);
      const code = `${D_ARR(p, n)}\ndouble vp = 0;\nfor (int t = 0; t < n; ++t)\n  vp += divs[t] / pow(1 + k, t + 1);\ndouble terminal = divs[n - 1] * (1 + g) / (k - g);\nvp += terminal / pow(1 + k, n);\ncout << vp;\ndelete[] divs;`;
      return Q("arreglos", "Tres dividendos explícitos más un valor terminal de Gordon. ¿Qué imprime?", code, n6(tot), [n6(v), n6(v + term), n6(p.P * 1.5)],
        `El valor terminal (${n6(term)}) está en el año 3, así que también se descuenta: total ${n6(tot)}.`);
    },
    p => {
      const n = 4, ds = Array.from({ length: n }, (_, i) => p.D0 * Math.pow(1 + p.g, i + 1)), s = ds.reduce((a, b) => a + b, 0);
      const code = `${D_ARR(p, n)}\ndouble total = 0;\ndouble* cursor = divs;\nfor (int t = 0; t < n; ++t)\n  total += *cursor++;\ncout << total;\ndelete[] divs;`;
      return Q("punteros", "¿Qué imprime?", code, n6(s), [n6(ds[0] * n), n6(s - ds[0]), n6(ds[n - 1])], `\`*cursor++\` lee el dividendo actual y luego avanza: suma los ${n}.`);
    },
    p => {
      const k = Math.round(p.k * 100), g = Math.round(p.g * 100);
      return Q("bugs", "Las tasas vienen en porcentaje. ¿Qué imprime?", `double D1 = ${n6(p.D1)};\nint k = ${k}, g = ${g};\ndouble P = D1 / ((k - g) / 100);\ncout << P;`,
        "inf", [n6(p.P), "0", "No compila"], `(${k} − ${g}) / 100 es división entera: da 0, y un double dividido por 0 da inf. Debía ser (k − g) / 100.0.`);
    },
    p => Q("dinamica", "¿Cómo se libera `divs`?", "double* divs = new double[n];",
      "delete[] divs;", ["delete divs;", "free(divs);", "divs = nullptr;"], "new[] con delete[]. Asignar nullptr solo anula el puntero y deja el bloque perdido."),
    p => {
      const perp = Math.random() < 0.5, v = perp ? p.D1 / p.k : p.D1 / (p.k - p.g);
      const code = `double gordon(double D1, double k, double g) { return D1 / (k - g); }\ndouble perpetuidad(double D1, double k, double g) { return D1 / k; }\n\ndouble (*metodo)(double, double, double) = ${perp ? "perpetuidad" : "gordon"};\ncout << metodo(${n6(p.D1)}, ${p.k}, ${p.g});`;
      return Q("punteros", "¿Qué imprime?", code, n6(v), [n6(perp ? p.D1 / (p.k - p.g) : p.D1 / p.k), "No compila", n6(p.D1)],
        `metodo apunta a ${perp ? "perpetuidad (ignora g)" : "gordon"}: la llamada usa esa función.`);
    },
    p => {
      const buy = p.mkt < p.P;
      const code = `void valorar(double D1, double k, double g, double mercado, double& P, bool& comprar) {\n  P = D1 / (k - g);\n  comprar = mercado < P;\n}\n\ndouble P = 0;\nbool comprar = false;\nvalorar(${n6(p.D1)}, ${p.k}, ${p.g}, ${p.mkt}, P, comprar);\ncout << comprar;`;
      return Q("referencia", "¿Qué imprime?", code, buy ? 1 : 0, [buy ? 0 : 1, "true", n6(p.P)], `P y comprar vuelven por referencia. P = ${n6(p.P)} y el mercado está en ${p.mkt}: comprar = ${buy ? 1 : 0}.`);
    }
  ];

  /* =====================================================================
     RELATOS Y REGISTRO DE CASOS
     ===================================================================== */
  const CASES = {
    bono: {
      title: "Compra o venta de un bono", params: bondParams,
      pools: { facil: BOND_EASY, intermedio: BOND_MID, leyenda: BOND_HARD },
      pitch: {
        facil: p => [`Mi cliente quiere un bono cero cupón de ${p.N} a ${p.T} años, con tasa del ${+(p.r * 100).toFixed(1)} %.`, `En la pantalla está a ${p.mkt}. ¿Lo compro o lo vendo? No sé ni cuánto vale.`],
        intermedio: p => [`Un bono de ${p.N} a ${p.T} años que paga cupón del ${+(p.c * 100).toFixed(1)} % anual. La tasa de mercado es ${+(p.r * 100).toFixed(1)} %.`, "Tengo que valorarlo cupón por cupón y decidir si compro o vendo antes del cierre."],
        leyenda: p => [`El fondo grande quiere una cartera de bonos de ${p.N} con cupones del ${+(p.c * 100).toFixed(1)} %, a ${p.T} años.`, "Los flujos van en un arreglo dinámico, y el junior dejó el código lleno de trampas. Una más y estoy fuera."]
      }
    },
    forward: {
      title: "Construir un forward", params: fwdParams,
      pools: { facil: FWD_EASY, intermedio: FWD_MID, leyenda: FWD_HARD },
      pitch: {
        facil: p => [`Un cliente quiere fijar hoy el precio de una acción que vale ${p.S}, para dentro de ${p.T} año${p.T === 1 ? "" : "s"}.`, `La tasa libre de riesgo es ${+(p.r * 100).toFixed(1)} %. Tengo que armar el forward y ver quién gana.`],
        intermedio: p => [`Me piden un forward sobre una acción de ${p.S} que paga dividendos.`, "Quieren funciones limpias, escenarios y la liquidación de varios contratos. Para ayer."],
        leyenda: p => [`Mesa de derivados, viernes a las seis. Forward sobre un spot de ${p.S} con escenarios guardados en memoria dinámica.`, "El código compila, pero algo da mal. Si el riesgo lo detecta antes que yo, me echan."]
      }
    },
    accion: {
      title: "Valorar una acción", params: stockParams,
      pools: { facil: STOCK_EASY, intermedio: STOCK_MID, leyenda: STOCK_HARD },
      pitch: {
        facil: p => [`¿Has oído de ${p.name}? Pagó un dividendo de ${p.D0} y crece ${+(p.g * 100).toFixed(1)} % al año.`, `Le exigimos un ${+(p.k * 100).toFixed(1)} % y en bolsa está a ${p.mkt}. ¿Está barata o cara?`],
        intermedio: p => [`${p.name} quiere que le pongamos precio a su acción.`, `Dividendo de ${p.D0}, crecimiento de ${+(p.g * 100).toFixed(1)} %, retorno exigido de ${+(p.k * 100).toFixed(1)} %. Hay que proyectar dividendos con ciclos y funciones.`],
        leyenda: p => [`El comité quiere la valoración completa de ${p.name}: dividendos año a año en un arreglo dinámico y un valor terminal.`, "Si presento un número malo frente al comité, recojo mis cosas hoy mismo."]
      }
    }
  };

  // Cuántas preguntas por partida, errores permitidos antes del despido y reloj por pregunta (segundos).
  const DIFFS = {
    facil: { name: "Fácil", q: 6, strikes: 3, clock: 0, desc: "Un flujo y fórmulas directas: variables, operadores, cout e if." },
    intermedio: { name: "Intermedio", q: 7, strikes: 2, clock: 0, desc: "Ciclos for, funciones con parámetros y decisiones de compra o venta." },
    leyenda: { name: "Leyenda", q: 8, strikes: 2, clock: 45, desc: "Arreglos, punteros, memoria dinámica y errores sutiles. Con reloj." }
  };

  // Arma una partida: elige el caso (rotando los que no salieron hace poco) y sus preguntas en orden.
  function buildRun(diff, forceCase) {
    const keys = Object.keys(CASES);
    const caseKey = forceCase || keys[freshIdx("ARC_case_" + diff, keys.length, 1)[0]];
    const cs = CASES[caseKey], p = cs.params(), pool = cs.pools[diff], n = Math.min(DIFFS[diff].q, pool.length);
    const idx = freshIdx(`ARC_${caseKey}_${diff}`, pool.length, n).sort((a, b) => a - b);   // el orden del pool es el orden del relato
    return { caseKey, title: cs.title, params: p, pitch: cs.pitch[diff](p), questions: idx.map(i => pool[i](p)), diff };
  }

  window.ArcadeCases = { CASES, DIFFS, TOPICS, buildRun };
})();
