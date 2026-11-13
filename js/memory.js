/* memory.js — Campaña, sección 2: "Gestión de memoria".
   Todo sale del PPT "Gestión de memoria" (J. Burrus), en el mismo orden:
   1 Direcciones y punteros · 2 Arreglos y aritmética · 3 Punteros especiales ·
   4 Asignación dinámica + 5 Liberación y uso · 6 Funciones de ANSI C + 7 Ejemplo del bono.
   Usa las mismas herramientas que la sección 1 (questions.js las expone en Content.kit).
   Convención: lo que va entre `comillas invertidas` se muestra como código. */
(function () {
  "use strict";
  const C = window.Content, K = C.kit;
  const { rnd, pick, shuffle, cout6, mkQ, fromGens, cases, freshIdx, SORT, SHOOT, RUN } = K;

  const R = (ask, code, c, d, e) => mkQ(ask, code, c, d, e, 3);   // carrera: 3 carriles
  const S = (ask, code, c, d, e) => mkQ(ask, code, c, d, e, 4);   // disparos: 4 alternativas
  const INTS = ["a", "b", "x", "y", "n", "m", "k", "v", "w", "z"];
  const PTRS = ["p", "q", "r", "ptr", "pa", "pb", "pt"];
  const ints = k => shuffle(INTS).slice(0, k);
  const ptrs = k => shuffle(PTRS).slice(0, k);
  function distinct(k, lo, hi) { const s = new Set(); while (s.size < k) s.add(rnd(lo, hi)); return [...s]; }
  const addr = () => rnd(250, 2400) * 4;                      // direcciones ilustrativas, como 1776 en el PPT
  const letters = k => shuffle("abcdefghjkmnpqrstuvwz".split("")).slice(0, k);
  const nextChar = ch => String.fromCharCode(ch.charCodeAt(0) + 1);
  // Arreglo con valores distintos y fáciles de seguir.
  const arr = (k, lo, hi) => distinct(k, lo || 1, hi || 60);

  /* ===================================================================
     BLOQUE 1 · DIRECCIONES Y PUNTEROS (PPT §1)
     =================================================================== */

  /* ---------- m01 · Valor y dirección (carrera) ---------- */
  const M_ADDR_GENS = [
    function () {
      const [a, b] = ints(2), [p] = ptrs(1), v = rnd(2, 40), w = rnd(41, 90);
      return R(`¿Cuánto vale \`${a}\`?`, `int ${a} = ${v};\nint ${b} = ${a};\nint* ${p} = &${a};\n*${p} = ${w};`,
        w, [v, v + w], `\`${p}\` guarda la dirección de \`${a}\`, así que \`*${p} = ${w}\` escribe en \`${a}\`. Como andy en el PPT: pasa a ${w}.`);
    },
    function () {
      const [a, b] = ints(2), [p] = ptrs(1), v = rnd(2, 40), w = rnd(41, 90);
      return R(`¿Cuánto vale \`${b}\`?`, `int ${a} = ${v};\nint ${b} = ${a};\nint* ${p} = &${a};\n*${p} = ${w};`,
        v, [w, 0], `\`int ${b} = ${a}\` copia el valor: \`${b}\` es un entero independiente. Escribir mediante \`${p}\` cambia \`${a}\`, no la copia (como fred en el PPT).`);
    },
    function () {
      const [a, b] = ints(2), [p] = ptrs(1), v = rnd(2, 40), w = rnd(41, 90);
      return R(`¿Cuánto vale \`*${p}\`?`, `int ${a} = ${v};\nint ${b} = ${a};\nint* ${p} = &${a};\n*${p} = ${w};`,
        w, [v, 0], `\`*${p}\` es el valor al que apunta \`${p}\`, o sea \`${a}\`, que ahora vale ${w}.`);
    },
    function () {
      const v = rnd(2, 40), A = addr();
      return R("¿Cuánto vale `beth`?", `int andy = ${v};      // &andy == ${A}\nint* ted = &andy;\nint beth = *ted;`,
        v, [A, A + 4], `\`*ted\` lee el entero que está en la dirección guardada en \`ted\`: el de andy. beth recibe ${v}.`);
    },
    function () {
      const v = rnd(2, 40), A = addr();
      return R("¿Cuánto vale `ted`?", `int andy = ${v};      // &andy == ${A}\nint* ted = &andy;`,
        A, [v, A + 1], `Un puntero guarda una dirección: \`ted = &andy\`, así que vale ${A}. El ${v} sería \`*ted\`.`);
    },
    function () {
      const [a] = ints(1), [p] = ptrs(1), v = rnd(2, 40), A = addr();
      return R(`¿Cuánto vale \`*${p}\`?`, `int ${a} = ${v};      // &${a} == ${A}\nint* ${p} = &${a};`,
        v, [A, A + 4], `\`*${p}\` va a la dirección ${A} y lee lo que hay ahí: el valor de \`${a}\`, ${v}.`);
    },
    function () {
      const [a] = ints(1), v = rnd(2, 40), A = addr();
      return R(`¿Cuánto vale \`&${a}\`?`, `int ${a} = ${v};      // ${a} está en la dirección ${A}`,
        A, [v, 0], `\`&${a}\` se lee "dirección de ${a}": ${A}. Los números de dirección son ilustrativos, como el 1776 del PPT.`);
    },
    function () {
      const [a] = ints(1), [p] = ptrs(1), v = rnd(2, 40), k = rnd(2, 9);
      return R(`¿Cuánto vale \`${a}\`?`, `int ${a} = ${v};\nint* ${p} = &${a};\n*${p} = *${p} + ${k};`,
        v + k, [v, k], `\`*${p}\` es \`${a}\`, así que la línea equivale a \`${a} = ${a} + ${k}\`: ${v} + ${k} = ${v + k}.`);
    },
    function () {
      const [a] = ints(1), [p, q] = ptrs(2), v = rnd(2, 30), w = rnd(31, 60), k = rnd(2, 9);
      return R(`¿Cuánto vale \`${a}\`?`, `int ${a} = ${v};\nint* ${p} = &${a};\nint* ${q} = &${a};\n*${p} = ${w};\n*${q} = *${q} + ${k};`,
        w + k, [v + k, w], `\`${p}\` y \`${q}\` son alias: apuntan al mismo entero. Primero queda en ${w} y luego ${q} le suma ${k}: ${w + k}.`);
    },
    function () {
      const [a] = ints(1), [p] = ptrs(1), v = rnd(2, 40), w = rnd(41, 90);
      return R(`¿Cuánto vale \`*${p}\`?`, `int ${a} = ${v};\nint* ${p} = &${a};\n${a} = ${w};`,
        w, [v, 0], `El puntero no guarda una copia: guarda la dirección. Si \`${a}\` cambia a ${w}, \`*${p}\` también lee ${w}.`);
    },
    function () {
      const [a, b] = ints(2), [p] = ptrs(1), v = rnd(2, 30), w = rnd(31, 60), k = rnd(61, 90);
      return R(`¿Cuánto vale \`${a}\`?`, `int ${a} = ${v}, ${b} = ${w};\nint* ${p} = &${a};\n${p} = &${b};\n*${p} = ${k};`,
        v, [k, w], `\`${p} = &${b}\` cambia la dirección guardada en el puntero. Después \`*${p} = ${k}\` escribe en \`${b}\`; \`${a}\` sigue en ${v}.`);
    },
    function () {
      const [a, b] = ints(2), [p] = ptrs(1), v = rnd(2, 30), w = rnd(31, 60), k = rnd(61, 90);
      return R(`¿Cuánto vale \`${b}\`?`, `int ${a} = ${v}, ${b} = ${w};\nint* ${p} = &${a};\n${p} = &${b};\n*${p} = ${k};`,
        k, [w, v], `Al final \`${p}\` apunta a \`${b}\`, así que \`*${p} = ${k}\` deja \`${b}\` en ${k}.`);
    },
    function () {
      const [a] = ints(1), [p] = ptrs(1), v = rnd(2, 40);
      return R(`¿Qué imprime \`cout << (${p} == &${a});\`?`, `int ${a} = ${v};\nint* ${p} = &${a};`,
        1, [0, v], `\`${p}\` guarda justamente \`&${a}\`: la comparación es verdadera y cout muestra 1. Como en el PPT: ted == &andy.`);
    },
    function () {
      const [a] = ints(1), [p] = ptrs(1), v = rnd(2, 40);
      return R(`¿Qué imprime \`cout << (*${p} == ${a});\`?`, `int ${a} = ${v};\nint* ${p} = &${a};`,
        1, [0, v], `\`*${p}\` es el valor de \`${a}\`: son iguales, cout muestra 1. Como en el PPT: *ted == andy.`);
    },
    function () {
      const [a, b] = ints(2), [p] = ptrs(1), v = rnd(2, 40);
      return R(`¿Qué imprime \`cout << (${p} == &${b});\`?`, `int ${a} = ${v}, ${b} = ${v};\nint* ${p} = &${a};`,
        0, [1, v], `\`${a}\` y \`${b}\` valen lo mismo, pero son objetos distintos con direcciones distintas. \`${p}\` guarda la de \`${a}\`: 0.`);
    },
    function () {
      const [a, b] = ints(2), [p] = ptrs(1), v = rnd(2, 30), w = rnd(31, 60);
      return R("¿Qué imprime?", `int ${a} = ${v};\nint ${b} = ${a};\nint* ${p} = &${b};\n*${p} = ${w};\ncout << ${a} + ${b};`,
        v + w, [2 * v, 2 * w], `\`${p}\` apunta a la copia \`${b}\`, que pasa a ${w}. \`${a}\` sigue en ${v}: ${v} + ${w} = ${v + w}.`);
    },
    function () {
      const [a] = ints(1), [p, q] = ptrs(2), v = rnd(2, 40), w = rnd(41, 90);
      return R("¿Qué imprime?", `int ${a} = ${v};\nint* ${p} = &${a};\nint* ${q} = ${p};\n*${q} = ${w};\ncout << ${a};`,
        w, [v, 0], `\`${q} = ${p}\` copia la dirección: ahora ambos son alias de \`${a}\`. Escribir mediante \`${q}\` cambia \`${a}\` a ${w}.`);
    },
    function () {
      const [a, b] = ints(2), [p] = ptrs(1), v = rnd(2, 40), w = rnd(41, 90);
      return R("¿Qué imprime?", `int ${a} = ${v};\nint* ${p} = &${a};\nint ${b} = *${p};\n${b} = ${w};\ncout << ${a};`,
        v, [w, 0], `\`int ${b} = *${p}\` copia el valor ${v} en un entero nuevo. Cambiar \`${b}\` no afecta a \`${a}\`.`);
    },
    function () {
      const [a] = ints(1), [p] = ptrs(1), v = rnd(2, 40);
      return R("¿Qué imprime?", `int ${a} = ${v};\nint* ${p} = &${a};\n++(*${p});\ncout << ${a};`,
        v + 1, [v, v + 4], `\`++(*${p})\` incrementa el entero apuntado, o sea \`${a}\`: ${v + 1}.`);
    },
    function () {
      const [a] = ints(1), [p] = ptrs(1), v = rnd(2, 40);
      return R("¿Qué imprime?", `int ${a} = ${v};\nint* ${p} = &${a};\n*${p} = *${p} * 2;\ncout << ${a};`,
        2 * v, [v, v + 2], `Leer y escribir mediante \`*${p}\` es usar \`${a}\`: ${v} × 2 = ${2 * v}.`);
    },
    function () {
      return R("¿Qué guarda `ted`?", "int andy = 25;\nint* ted = &andy;",
        "La dirección de andy", ["El valor 25", "Una copia de andy"], "`ted` es un puntero: su valor es la dirección de otro objeto (andy), no el 25.");
    },
    function () {
      const [a] = ints(1);
      return R(`¿Cómo se lee \`&${a}\`?`, `int ${a} = 25;`,
        `Dirección de ${a}`, [`Valor apuntado por ${a}`, `Copia de ${a}`], `\`&\` antepuesto a una variable da su dirección: "dirección de ${a}".`);
    },
    function () {
      const [p] = ptrs(1);
      return R(`¿Cómo se lee \`*${p}\` en una expresión?`, `int andy = 25;\nint* ${p} = &andy;\nint beth = *${p};`,
        `Valor al que apunta ${p}`, [`Dirección de ${p}`, `Copia de ${p}`], `En una expresión, \`*\` desreferencia: \`*${p}\` es el valor guardado en la dirección que tiene \`${p}\` (25).`);
    },
    function () {
      const v = rnd(2, 40), w = rnd(41, 90);
      return R("¿Qué imprime?", `int andy = ${v};\nint fred = andy;\nint* ted = &andy;\n*ted = ${w};\ncout << andy << " " << fred;`,
        `${w} ${v}`, [`${w} ${w}`, `${v} ${v}`], `Copiar un valor en fred no crea conexión: fred queda en ${v}. En cambio \`*ted = ${w}\` modifica andy.`);
    }
  ];

  /* ---------- m02 · Declarar e inicializar (clasificador) ---------- */
  const DECL_BINS = ["ok", "nocomp", "invalido"];
  const DECL_LABELS = { ok: "CORRECTO", nocomp: "NO\nCOMPILA", invalido: "USO\nINVÁLIDO" };
  const M_DECL_ITEMS = [
    { code: "int number = 0;\nint* tommy = &number;\n*tommy = 7;", bin: "ok", explain: "La inicialización guarda una dirección válida y la asignación `*tommy = 7` guarda un valor en number." },
    { code: "int* first = nullptr;\nint* second = nullptr;", bin: "ok", explain: "Declaraciones separadas, cada una con su `*` y su valor nulo: es la forma clara que recomienda el PPT." },
    { code: "int number = 0;\nint* tommy;\ntommy = &number;\n*tommy = 7;", bin: "ok", explain: "Declarar y luego asignar `tommy = &number` tiene el mismo efecto que inicializarlo. Se desreferencia después de tener dirección." },
    { code: "int* p1, *p2;\nint x = 3;\np1 = &x;\np2 = p1;", bin: "ok", explain: "Con `*` en cada declarador, p1 y p2 son punteros a int. Copiar p1 en p2 crea un alias de x." },
    { code: "int* p3, value;\nvalue = 5;\np3 = &value;", bin: "ok", explain: "`int* p3, value;` declara un puntero (p3) y un int (value). Al int se le asigna 5 y al puntero una dirección: tipos correctos." },
    { code: "int* p = nullptr;\nif (p != nullptr) *p = 5;", bin: "ok", explain: "Comprobar si un puntero es nulo es válido; como lo es, no se desreferencia." },
    { code: "char letter = 'a';\nchar* c = &letter;\n*c = 'b';", bin: "ok", explain: "Un `char*` guarda la dirección de un char. Escribir mediante él cambia letter a 'b'." },
    { code: "float rate = 0.5f;\nfloat* f = &rate;\n*f = 0.75f;", bin: "ok", explain: "Puntero a float apuntando a un float: el tipo apuntado coincide." },
    { code: "int* old_style = 0;", bin: "ok", explain: "El 0 también es una constante de puntero nulo (estilo antiguo). Hoy se prefiere `nullptr`." },
    { code: "int a = 1, b = 2;\nint* p = &a;\np = &b;\n*p = 3;", bin: "ok", explain: "Un puntero puede cambiar de objeto. Al final apunta a b y lo deja en 3." },
    { code: "int number = 0;\nint* tommy;\n*tommy = &number;", bin: "nocomp", explain: "`*tommy` tiene tipo int, pero `&number` tiene tipo int*: no se puede asignar. Es el error que muestra el PPT; lo correcto es `tommy = &number`." },
    { code: "int* p3, value;\nint x = 4;\nvalue = &x;", bin: "nocomp", explain: "En `int* p3, value;` el `*` solo afecta a p3: value es un int y no puede guardar una dirección." },
    { code: "int x = 5;\nint* p = x;", bin: "nocomp", explain: "Un puntero se inicializa con una dirección (`&x`), no con un valor int." },
    { code: "int x = 5;\nchar* c = &x;", bin: "nocomp", explain: "`&x` es int* y c es char*: son tipos de puntero distintos. El tipo apuntado importa." },
    { code: "double d = 1.5;\nint* p = &d;", bin: "nocomp", explain: "`&d` es double*; no se puede guardar en un int*." },
    { code: "int* p1, p2;\nint x = 1;\np2 = &x;", bin: "nocomp", explain: "Solo p1 es puntero: el `*` pertenece a cada declarador. p2 es un int y no recibe direcciones." },
    { code: "int x = 5;\nint p = &x;", bin: "nocomp", explain: "Para guardar una dirección hace falta un puntero (`int* p`). Un int no la acepta." },
    { code: "int* p = &5;", bin: "nocomp", explain: "Solo los objetos tienen dirección. El literal 5 no es una variable, así que `&5` no compila." },
    { code: "int x = 3;\nint* p = &x;\nint y = p;", bin: "nocomp", explain: "`p` es una dirección (int*). Para leer el entero hay que desreferenciar: `int y = *p;`." },
    { code: "int* tommy;\n*tommy = 7;", bin: "invalido", explain: "Compila, pero tommy no tiene inicializador: su valor es indeterminado. Desreferenciarlo escribe en una dirección cualquiera." },
    { code: "int* p = nullptr;\n*p = 5;", bin: "invalido", explain: "Compila, pero un puntero nulo no selecciona ningún objeto. Es válido compararlo, no desreferenciarlo." },
    { code: "int* p = nullptr;\nint v = *p;", bin: "invalido", explain: "Leer `*p` con p nulo no es válido: no hay objeto al que acceder." },
    { code: "int* p1, *p2;\nint x = 1;\np1 = &x;\n*p2 = *p1;", bin: "invalido", explain: "p2 nunca recibió una dirección. `*p2 = …` escribe en un lugar indeterminado aunque compile." },
    { code: "int* p3, value;\n*p3 = 5;", bin: "invalido", explain: "Los tipos calzan (`*p3` es int), pero p3 no fue inicializado: no apunta a nada válido." },
    { code: "int* p = 0;\ncout << *p;", bin: "invalido", explain: "`0` deja a p nulo. Desreferenciar un puntero nulo no es válido." }
  ];

  /* ---------- m03 · Seguir punteros (disparos) ---------- */
  const M_TRACE_GENS = [
    function () {
      const [v1, v2] = distinct(2, 2, 60);
      return S("¿Qué imprime?", `int firstvalue = 0, secondvalue = 0;\nint* mypointer = &firstvalue;\n*mypointer = ${v1};\nmypointer = &secondvalue;\n*mypointer = ${v2};\ncout << firstvalue << " " << secondvalue;`,
        `${v1} ${v2}`, [`0 ${v2}`, `${v2} ${v2}`, `${v1} 0`], `Ambos enteros se modificaron indirectamente. \`mypointer = &secondvalue\` cambia la dirección guardada; no toca ningún entero.`);
    },
    function () {
      const [a, b] = ints(2), [x, y, k, m] = distinct(4, 2, 60);
      return S("¿Qué imprime?", `int ${a} = ${x}, ${b} = ${y};\nint* p1 = &${a};\nint* p2 = &${b};\n*p1 = ${k};\n*p2 = *p1;\np1 = p2;\n*p1 = ${m};\ncout << ${a} << " " << ${b};`,
        `${k} ${m}`, [`${m} ${m}`, `${k} ${k}`, `${x} ${m}`], `Es la tabla del PPT: \`*p1 = ${k}\` → ${a} = ${k}; \`*p2 = *p1\` copia el entero → ${b} = ${k}; \`p1 = p2\` copia la dirección y \`*p1 = ${m}\` cambia ${b}. ${a} sigue en ${k}.`);
    },
    function () {
      const [a, b] = ints(2), [x, y, k] = distinct(3, 2, 60);
      return S("¿Qué imprime?", `int ${a} = ${x}, ${b} = ${y};\nint* p1 = &${a};\nint* p2 = &${b};\n*p1 = ${k};\n*p2 = *p1;\ncout << ${a} << " " << ${b};`,
        `${k} ${k}`, [`${k} ${y}`, `${x} ${k}`, `${x} ${y}`], `\`*p2 = *p1\` copia un entero: ${b} recibe el valor de ${a} (${k}). Los punteros siguen apuntando cada uno a su variable.`);
    },
    function () {
      const [a, b] = ints(2), [x, y] = distinct(2, 2, 60);
      return S("¿Qué imprime?", `int ${a} = ${x}, ${b} = ${y};\nint* p1 = &${a};\nint* p2 = &${b};\nint aux = *p1;\n*p1 = *p2;\n*p2 = aux;\ncout << ${a} << " " << ${b};`,
        `${y} ${x}`, [`${x} ${y}`, `${y} ${y}`, `${x} ${x}`], `Se intercambian los valores mediante los punteros: aux guarda ${x}, ${a} recibe ${y} y ${b} recibe ${x}.`);
    },
    function () {
      const [a, b] = ints(2), [x, y, k] = distinct(3, 2, 60);
      return S(`¿Cuánto vale \`${a}\`?`, `int ${a} = ${x}, ${b} = ${y};\nint* p1 = &${a};\nint* p2 = &${b};\np1 = p2;\n*p1 = ${k};`,
        x, [k, y, 0], `\`p1 = p2\` copia una dirección: ahora ambos apuntan a ${b}. \`*p1 = ${k}\` cambia ${b}; ${a} sigue en ${x}.`);
    },
    function () {
      const [a, b] = ints(2), [x, y, k] = distinct(3, 2, 60);
      return S(`¿Cuánto vale \`${a}\`?`, `int ${a} = ${x}, ${b} = ${y};\nint* p1 = &${a};\nint* p2 = &${b};\n*p1 = *p2;\n*p2 = ${k};`,
        y, [k, x, x + y], `\`*p1 = *p2\` copia el valor ${y} en ${a}. Luego cambiar ${b} no afecta a ${a}: copiar enteros no crea alias.`);
    },
    function () {
      const [a, b] = ints(2), [x, y] = distinct(2, 2, 40), k = rnd(2, 9);
      return S(`¿Cuánto vale \`${a}\`?`, `int ${a} = ${x}, ${b} = ${y};\nint* p1 = &${a};\nint* p2 = &${b};\np2 = p1;\n*p2 = *p2 + ${k};`,
        x + k, [y + k, x, y], `\`p2 = p1\` hace que p2 también apunte a ${a}. Sumarle ${k} mediante p2 deja ${a} en ${x + k}.`);
    },
    function () {
      const [a, b] = ints(2), [x, y] = distinct(2, 2, 40);
      return S(`¿Cuánto vale \`${a}\`?`, `int ${a} = ${x}, ${b} = ${y};\nint* p1 = &${a};\nint* p2 = &${b};\n*p1 = *p1 + *p2;`,
        x + y, [x, y, 2 * x], `\`*p1\` es ${a} y \`*p2\` es ${b}: ${a} = ${x} + ${y} = ${x + y}.`);
    },
    function () {
      const [a, b] = ints(2), [x, y] = distinct(2, 2, 40);
      return S(`¿Cuánto vale \`${b}\`?`, `int ${a} = ${x}, ${b} = ${y};\nint* p1 = &${a};\nint* p2 = &${b};\np1 = &${b};\np2 = &${a};\n*p1 = *p2 * 2;`,
        2 * x, [2 * y, y, x], `Tras reasignar, p1 apunta a ${b} y p2 a ${a}. Entonces ${b} = ${a} × 2 = ${2 * x}.`);
    },
    function () {
      const [a, b] = ints(2), [p] = ptrs(1), [x, y, k] = distinct(3, 2, 60);
      return S("¿Qué imprime?", `int ${a} = ${x}, ${b} = ${y};\nint* ${p} = &${a};\n*${p} = ${k};\n${p} = &${b};\ncout << *${p};`,
        y, [k, x, 0], `Al final \`${p}\` apunta a ${b}, que nunca cambió: ${y}. El ${k} quedó en ${a}.`);
    },
    function () {
      const [a, b] = ints(2), [x, y] = distinct(2, 2, 60);
      return S("¿Qué imprime?", `int ${a} = ${x}, ${b} = ${y};\nint* p1 = &${a};\nint* p2 = &${b};\np1 = p2;\ncout << (p1 == p2);`,
        1, [0, x, y], "`p1 = p2` copia la dirección: ambos guardan la de " + b + ". Comparar punteros compara direcciones: 1 (verdadero).");
    },
    function () {
      const [a, b] = ints(2), v = rnd(2, 60);
      return S("¿Qué imprime?", `int ${a} = ${v}, ${b} = ${v};\nint* p1 = &${a};\nint* p2 = &${b};\ncout << (p1 == p2) << " " << (*p1 == *p2);`,
        "0 1", ["1 1", "0 0", "1 0"], `Las direcciones son distintas (dos objetos), pero los valores apuntados son iguales (${v}). \`p1 == p2\` compara direcciones; \`*p1 == *p2\`, valores.`);
    },
    function () {
      const [a, b, c] = ints(3), [x, y] = distinct(2, 2, 20), [p] = ptrs(1);
      return S(`¿Cuánto vale \`${c}\`?`, `int ${a} = 0, ${b} = ${x}, ${c} = ${y};\nint* ${p} = &${a};\n*${p} = 1;\n${p} = &${b};\n*${p} = *${p} + ${a};\n${p} = &${c};\n*${p} = ${a} + ${b};`,
        1 + x + 1, [y, 1 + x, x + y], `Paso a paso: ${a} = 1; ${b} = ${x} + 1 = ${x + 1}; ${c} = ${a} + ${b} = 1 + ${x + 1} = ${x + 2}.`);
    },
    function () {
      const [a, b] = ints(2), [x, y, k] = distinct(3, 2, 60);
      return S(`¿Cuánto vale \`${a}\`?`, `int ${a} = ${x}, ${b} = ${y};\nint* p1 = &${a};\nint* p2 = p1;\np1 = &${b};\n*p2 = ${k};`,
        k, [x, y, 0], `\`p2 = p1\` copió la dirección de ${a} en ese momento. Mover p1 a ${b} después no cambia p2: \`*p2 = ${k}\` escribe en ${a}.`);
    },
    function () {
      const [a] = ints(1), [x, y, z] = distinct(3, 2, 60);
      return S(`¿Cuánto vale \`${a}\`?`, `int ${a} = ${x};\nint* p1 = &${a};\nint* p2 = &${a};\n*p1 = ${y};\n*p2 = ${z};`,
        z, [y, x, y + z], `p1 y p2 son alias del mismo entero: la última escritura (${z}) es la que queda.`);
    },
    function () {
      const [a] = ints(1), [p] = ptrs(1), k = rnd(2, 60);
      return S("¿Qué imprime?", `int ${a} = 0;\nint* ${p} = &${a};\n${a} = ${k};\ncout << *${p} + 1;`,
        k + 1, [1, k, 2], `\`*${p}\` lee el valor actual de ${a} (${k}), y luego se suma 1: ${k + 1}.`);
    },
    function () {
      const [a, b] = ints(2), [x, y, k, m] = distinct(4, 2, 60);
      return S("¿Qué imprime?", `int ${a} = ${x}, ${b} = ${y};\nint* p1 = &${a};\nint* p2 = &${b};\np1 = p2;\np2 = &${a};\n*p1 = ${k};\n*p2 = ${m};\ncout << ${a} << " " << ${b};`,
        `${m} ${k}`, [`${k} ${m}`, `${k} ${y}`, `${x} ${m}`], `Tras \`p1 = p2\`, p1 apunta a ${b}; luego p2 pasa a apuntar a ${a}. Por eso ${b} = ${k} y ${a} = ${m}.`);
    },
    function () {
      const [a, b] = ints(2), [x, y] = distinct(2, 2, 40);
      return S("¿Qué imprime?", `int ${a} = ${x}, ${b} = ${y};\nint* p1 = &${a};\nint* p2 = &${b};\n*p1 = *p2;\np1 = p2;\n*p1 = *p1 + 1;\ncout << ${a} << " " << ${b};`,
        `${y} ${y + 1}`, [`${y + 1} ${y + 1}`, `${x} ${y + 1}`, `${y} ${y}`, `${x} ${y}`, `${y + 1} ${y}`], `\`*p1 = *p2\` copia ${y} en ${a}. Luego p1 apunta a ${b} y le suma 1: ${b} = ${y + 1}.`);
    },
    function () {
      const [a] = ints(1), [p, q] = ptrs(2), x = rnd(2, 40), k = rnd(2, 9);
      return S("¿Qué imprime?", `int ${a} = ${x};\nint* ${p} = &${a};\nint* ${q} = &${a};\n*${p} = *${q} + ${k};\ncout << *${q};`,
        x + k, [x, k, x + 2 * k], `${p} y ${q} apuntan al mismo entero. Se lee ${x} mediante ${q}, se suma ${k} y se escribe mediante ${p}. ${q} observa el mismo valor: ${x + k}.`);
    },
    function () {
      const [a, b] = ints(2), [x, y, k] = distinct(3, 2, 60);
      return S("¿Cuántos enteros cambian de valor?", `int ${a} = ${x}, ${b} = ${y};\nint* p1 = &${a};\nint* p2 = &${a};\n*p1 = ${k};\np2 = &${b};`,
        1, [2, 0, 3], `Solo \`*p1 = ${k}\` escribe un entero (${a}). \`p2 = &${b}\` cambia la dirección guardada en p2, no un entero.`);
    },
    function () {
      const [a, b] = ints(2), [x, y] = distinct(2, 2, 60);
      return S("¿Qué hace `p1 = p2;`?", `int ${a} = ${x}, ${b} = ${y};\nint* p1 = &${a};\nint* p2 = &${b};\np1 = p2;`,
        "Copia una dirección", ["Copia un entero", `Cambia ${a}`, `Cambia ${b}`], `Asignar punteros copia la dirección: p1 pasa a ser alias de ${b}. Ningún entero cambia; para copiar el entero sería \`*p1 = *p2\`.`);
    }
  ];

  /* ===================================================================
     BLOQUE 2 · ARREGLOS Y ARITMÉTICA (PPT §2)
     =================================================================== */

  /* ---------- m04 · Arreglos y punteros (carrera) ---------- */
  const M_ARR_GENS = [
    function () {
      const v = arr(5);
      return R("¿Qué imprime?", `int numbers[5] = {${v.join(", ")}};\nint* p = numbers;\ncout << *p;`,
        v[0], [v[1], v[4]], `\`int* p = numbers\` convierte el arreglo en un puntero a su primer elemento: \`*p\` = numbers[0] = ${v[0]}.`);
    },
    function () {
      const v = arr(6), k = rnd(1, 5), w = rnd(61, 99);
      return R("¿Qué imprime?", `int values[6] = {${v.join(", ")}};\nint* a = values;\n*(a + ${k}) = ${w};\ncout << values[${k}];`,
        w, [v[k], v[k] + w], `\`*(a + ${k})\` es el mismo elemento que \`a[${k}]\` y \`values[${k}]\`: queda en ${w}.`);
    },
    function () {
      const v = arr(5), k = rnd(1, 3);
      return R("¿Qué imprime?", `int numbers[5] = {${v.join(", ")}};\nint* p = numbers;\ncout << *(p + ${k});`,
        v[k], [v[0] + k, v[k + 1]], `\`p + ${k}\` es la dirección del elemento ${k} (cuenta elementos desde cero). Desreferenciarla da ${v[k]}.`);
    },
    function () {
      const v = arr(5), k = rnd(1, 3);
      return R("¿Qué imprime?", `int numbers[5] = {${v.join(", ")}};\nint* p = numbers;\ncout << *p + ${k};`,
        v[0] + k, [v[k], v[0]], `Sin paréntesis, \`*\` va primero: \`*p\` = ${v[0]} y luego + ${k} = ${v[0] + k}. Para el elemento ${k} sería \`*(p + ${k})\`.`);
    },
    function () {
      const v = arr(5, 1, 99);
      return R("¿Cuánto vale `*p` al final?", `int numbers[5] = {};\nint* p = numbers;\n*p = ${v[0]};\n++p; *p = ${v[1]};\np = &numbers[2]; *p = ${v[2]};\np = numbers + 3; *p = ${v[3]};\np = numbers; *(p + 4) = ${v[4]};`,
        v[0], [v[4], v[3]], `Como en el PPT: la última línea deja p en numbers y escribe en \`*(p + 4)\`. Calcular p + 4 no mueve p, así que \`*p\` = numbers[0] = ${v[0]}.`);
    },
    function () {
      const v = arr(5, 1, 99), k = rnd(0, 4);
      return R(`¿Cuánto vale \`numbers[${k}]\`?`, `int numbers[5] = {};\nint* p = numbers;\n*p = ${v[0]};\n++p; *p = ${v[1]};\np = &numbers[2]; *p = ${v[2]};\np = numbers + 3; *p = ${v[3]};\np = numbers; *(p + 4) = ${v[4]};`,
        v[k], [v[(k + 1) % 5], v[(k + 4) % 5]], `Las cinco formas del PPT escriben los elementos 0 a 4 en orden: numbers[${k}] = ${v[k]}.`);
    },
    function () {
      const v = arr(6), k = rnd(1, 3);
      return R("¿Qué imprime?", `int values[6] = {${v.join(", ")}};\nint* p = values + ${k};\ncout << p[1];`,
        v[k + 1], [v[1], v[k]], `p apunta al elemento ${k}, así que \`p[1]\` es \`*(p + 1)\`: el elemento ${k + 1} del arreglo, ${v[k + 1]}.`);
    },
    function () {
      const v = arr(5), k = rnd(2, 4);
      return R("¿Qué imprime?", `int numbers[5] = {${v.join(", ")}};\nint* p = &numbers[${k}];\ncout << *(p - 1);`,
        v[k - 1], [v[k], v[k] - 1], `p apunta al elemento ${k}; restar 1 retrocede un elemento: numbers[${k - 1}] = ${v[k - 1]}.`);
    },
    function () {
      const v = arr(5), k = rnd(2, 4);
      return R("¿Qué imprime?", `int numbers[5] = {${v.join(", ")}};\nint* p = numbers;\nint x = *(p + ${k});\ncout << *p;`,
        v[0], [v[k], v[k - 1]], `Calcular \`p + ${k}\` no modifica p (solo \`p = p + ${k}\` lo haría). \`*p\` sigue siendo ${v[0]}.`);
    },
    function () {
      const v = arr(5), k = rnd(2, 4);
      return R("¿Qué imprime?", `int numbers[5] = {${v.join(", ")}};\nint* p = numbers;\np = p + ${k};\ncout << *p;`,
        v[k], [v[0], v[0] + k], `Ahora sí se asigna: p avanza ${k} elementos y \`*p\` = numbers[${k}] = ${v[k]}.`);
    },
    function () {
      const n = rnd(3, 9);
      return R("Si `int` ocupa 4 bytes y un puntero 8, ¿cuánto vale `sizeof(numbers)`?", `int numbers[${n}] = {};\nint* p = numbers;`,
        4 * n, [8, n], `sizeof del arreglo mide sus ${n} enteros: ${n} × 4 = ${4 * n} bytes. Un arreglo y un puntero tienen almacenamiento distinto.`);
    },
    function () {
      const n = rnd(3, 9);
      return R("Si `int` ocupa 4 bytes y un puntero 8, ¿cuánto vale `sizeof(p)`?", `int numbers[${n}] = {};\nint* p = numbers;`,
        8, [4 * n, 4], `sizeof(p) mide solo el puntero (8 bytes), sin importar cuántos elementos tenga el arreglo al que apunta.`);
    },
    function () {
      const n = rnd(3, 9);
      return R("¿Cuánto vale `sizeof(numbers) / sizeof(numbers[0])`?", `int numbers[${n}] = {};`,
        n, [4 * n, 4], `Tamaño total del arreglo dividido por el de un elemento: la cantidad de elementos, ${n}.`);
    },
    function () {
      const v = arr(5);
      return R("¿Qué pasa con este código?", `int numbers[5] = {${v.join(", ")}};\nint* p = numbers;\nnumbers = p;`,
        "No compila", [v[0], "Compila"], "Un puntero común puede cambiar de destino, pero el nombre de un arreglo nativo no puede reasignarse: `numbers = p` es inválido.");
    },
    function () {
      const v = arr(5), w = arr(5, 61, 99);
      return R("¿Qué imprime?", `int numbers[5] = {${v.join(", ")}};\nint other[5] = {${w.join(", ")}};\nint* p = numbers;\np = other;\ncout << *p;`,
        w[0], [v[0], "No compila"], `Cambiar el puntero es válido: \`p = other\` lo deja en el primer elemento de other (${w[0]}).`);
    },
    function () {
      const v = arr(5), k = rnd(2, 3);
      return R("¿Qué imprime?", `int numbers[5] = {${v.join(", ")}};\nint* p = numbers;\n${"++p;\n".repeat(k)}cout << *p;`,
        v[k], [v[0] + k, v[k - 1]], `Cada \`++p\` avanza un elemento. Tras ${k} incrementos, p apunta a numbers[${k}] = ${v[k]}.`);
    },
    function () {
      const v = arr(5), [i, j] = distinct(2, 0, 4);
      return R("¿Qué imprime?", `int numbers[5] = {${v.join(", ")}};\ncout << numbers[${i}] + *(numbers + ${j});`,
        v[i] + v[j], [v[i] + j, v[i] + v[(j + 1) % 5]], `\`*(numbers + ${j})\` es numbers[${j}]. La suma es ${v[i]} + ${v[j]} = ${v[i] + v[j]}.`);
    },
    function () {
      const v = arr(4, 1, 20), s = v.reduce((x, y) => x + y, 0);
      return R("¿Qué imprime?", `int values[4] = {${v.join(", ")}};\nint total = 0;\nfor (int* q = values; q != values + 4; ++q)\n  total += *q;\ncout << total;`,
        s, [s - v[3], v[3]], `q recorre los 4 elementos y se detiene en \`values + 4\`, la posición posterior al último (no se desreferencia). Suma: ${s}.`);
    },
    function () {
      const v = arr(5);
      return R("¿Qué imprime?", `int numbers[5] = {${v.join(", ")}};\nint* p = &numbers[4];\ncout << *p - *numbers;`,
        v[4] - v[0], [v[4], 4], `\`*p\` es numbers[4] = ${v[4]} y \`*numbers\` es numbers[0] = ${v[0]}: ${v[4] - v[0]}.`);
    },
    function () {
      const v = arr(5), w = rnd(61, 99);
      return R("¿Qué imprime?", `int numbers[5] = {${v.join(", ")}};\nint* p = numbers;\np[0] = ${w};\ncout << numbers[0];`,
        w, [v[0], 0], `p apunta al mismo bloque: \`p[0]\` es numbers[0]. Cambia a ${w}.`);
    },
    function () {
      const k = rnd(1, 4);
      return R("¿Qué imprime?", `int numbers[5] = {};\ncout << (numbers + ${k} == &numbers[${k}]);`,
        1, [0, k], `\`numbers + ${k}\` es la dirección del elemento ${k}, igual que \`&numbers[${k}]\`: 1 (verdadero).`);
    },
    function () {
      const w = pick(["hello", "world", "bonos", "flujo", "renta"]), k = rnd(0, 4);
      const others = [...new Set(w.split("").filter(ch => ch !== w[k]))];
      return R("¿Qué imprime?", `const char* terry = "${w}";\ncout << terry[${k}];`,
        w[k], shuffle(others).slice(0, 2), `terry guarda la dirección del primer carácter; \`terry[${k}]\` (igual a \`*(terry + ${k})\`) es '${w[k]}'.`);
    },
    function () {
      const w = pick(["hello", "world", "bonos", "flujo", "renta"]), k = rnd(1, 4);
      const others = [...new Set(w.split("").filter(ch => ch !== w[k]))];
      return R("¿Qué imprime?", `const char* terry = "${w}";\ncout << *(terry + ${k});`,
        w[k], shuffle(others).slice(0, 2), `\`*(terry + ${k})\` avanza ${k} caracteres desde el primero y lo lee: '${w[k]}', igual que \`terry[${k}]\`.`);
    },
    function () {
      const w = pick(["hello", "hola", "bono", "cupones", "tasa"]);
      return R(`¿Cuántos caracteres ocupa el literal \`"${w}"\`?`, `const char* terry = "${w}";`,
        w.length + 1, [w.length, w.length + 2], `${w.length} letras más el terminador '\\0': ${w.length + 1} caracteres.`);
    }
  ];

  /* ---------- m05 · Aritmética según el tipo (disparos) ---------- */
  const TYPES = [["char", 1], ["short", 2], ["int", 4], ["double", 8]];
  const M_STEP_GENS = [
    function () {
      const [t, s] = pick(TYPES), A = addr(), [p] = ptrs(1);
      return S(`Si \`${t}\` ocupa ${s} byte${s > 1 ? "s" : ""}, ¿qué dirección guarda \`${p}\` después de \`++${p}\`?`, `${t}* ${p};       // ${p} == ${A}`,
        A + s, [A + 1, A + 8, A].filter(x => x !== A + s).concat([A + 2]), `Incrementar un puntero lo mueve al siguiente elemento del tipo apuntado: ${A} + ${s} = ${A + s}.`);
    },
    function () {
      const [t, s] = pick(TYPES.slice(1)), A = addr(), k = rnd(2, 5), [p] = ptrs(1);
      return S(`Si \`${t}\` ocupa ${s} bytes, ¿qué dirección es \`${p} + ${k}\`?`, `${t}* ${p};       // ${p} == ${A}`,
        A + k * s, [A + k, A + s, A + k * s + s], `Un desplazamiento de ${k} elementos son ${k} × sizeof(${t}) = ${k * s} bytes: ${A} + ${k * s} = ${A + k * s}.`);
    },
    function () {
      const [t, s] = pick(TYPES.slice(1)), A = addr(), k = rnd(2, 5), [p] = ptrs(1);
      return S(`Si \`${t}\` ocupa ${s} bytes, ¿qué dirección guarda \`${p}\` al final?`, `${t}* ${p};       // ${p} == ${A}\n${p} += ${k};\n--${p};`,
        A + (k - 1) * s, [A + k - 1, A + k * s, A + (k + 1) * s], `\`+= ${k}\` avanza ${k} elementos y \`--\` retrocede uno: ${k - 1} × ${s} = ${(k - 1) * s} bytes después de ${A}.`);
    },
    function () {
      const v = arr(4, 10, 99);
      return S("¿Qué imprime?", `int values[4] = {${v.join(", ")}};\nint* p = values;\np = p + 1;\np += 2;\n--p;\ncout << *p;`,
        v[2], [v[3], v[1], v[0] + 2], `Como en el PPT: elemento 1, luego elemento 3, luego elemento 2. \`*p\` = values[2] = ${v[2]}.`);
    },
    function () {
      const n = rnd(4, 9);
      return S("¿Qué imprime?", `int values[${n}] = {};\nint* first = values;\nint* last = values + ${n};\ncout << last - first;`,
        n, [n - 1, 4 * n, n + 1], `Restar dos punteros del mismo arreglo da la distancia en elementos (no en bytes): ${n}. \`last\` es la posición posterior al último.`);
    },
    function () {
      const [i, j] = distinct(2, 0, 7).sort((a, b) => a - b);
      return S("¿Qué imprime?", `int values[8] = {};\ncout << (values + ${j}) - (values + ${i});`,
        j - i, [4 * (j - i), j + i, i - j], `La resta de punteros cuenta elementos: ${j} − ${i} = ${j - i}.`);
    },
    function () {
      const [i, j] = distinct(2, 0, 7).sort((a, b) => a - b);
      return S("¿Qué imprime?", `double values[8] = {};\ncout << &values[${j}] - &values[${i}];`,
        j - i, [8 * (j - i), j + i, 4 * (j - i)], `Aunque cada double ocupe 8 bytes, la distancia entre punteros se mide en elementos: ${j - i}.`);
    },
    function () {
      const [t, s] = pick(TYPES), k = rnd(2, 6);
      return S(`Si \`${t}\` ocupa ${s} byte${s > 1 ? "s" : ""}, ¿cuántos bytes hay entre \`p\` y \`p + ${k}\`?`, `${t}* p;`,
        k * s, [k, s, k * s + s].filter(x => x !== k * s).concat([k * 8 === k * s ? k * 4 : k * 8]), `k elementos son k × sizeof(*p) bytes: ${k} × ${s} = ${k * s}.`);
    },
    function () {
      return S("¿Qué operación entre punteros NO está definida?", "int values[5] = {};\nint* p = values;\nint* q = values + 3;",
        "p * q", ["q - p", "p + 2", "q - 1"], "Se puede sumar o restar un entero y restar dos punteros del mismo arreglo. Multiplicar o dividir punteros no es una operación definida.");
    },
    function () {
      const n = rnd(4, 8);
      return S(`¿Se puede leer \`*(values + ${n})\`?`, `int values[${n}] = {};`,
        "No: es el límite", ["Sí, vale 0", "Sí, es el último", "No compila"], `\`values + ${n}\` es la posición posterior al último elemento: sirve como límite de un recorrido, pero no se puede desreferenciar.`);
    },
    function () {
      const A = addr(), k = rnd(2, 5);
      return S(`Si \`double\` ocupa 8 bytes, ¿qué dirección es \`d + ${k}\`?`, `double* d;       // d == ${A}`,
        A + 8 * k, [A + k, A + 4 * k, A + 8], `Cada paso avanza un double (8 bytes): ${A} + ${k} × 8 = ${A + 8 * k}.`);
    },
    function () {
      const A = addr(), k = rnd(2, 6);
      return S(`¿Qué dirección es \`c + ${k}\`?`, `char* c;       // c == ${A}`,
        A + k, [A + 4 * k, A + 8 * k, A + k + 1], `sizeof(char) siempre es 1 byte, así que avanzar ${k} chars avanza ${k} bytes: ${A + k}.`);
    },
    function () {
      const A = addr(), k = rnd(2, 5);
      return S("Si `int` ocupa 4 bytes, ¿cuánto vale `q - p`?", `int* p;          // p == ${A}\nint* q = p + ${k};   // q == ${A + 4 * k}`,
        k, [4 * k, A + 4 * k, k + 1], `Aunque las direcciones se separen ${4 * k} bytes, \`q - p\` da la distancia en elementos: ${k}.`);
    },
    function () {
      const v = arr(5, 10, 99), k = rnd(1, 3);
      return S("¿Qué imprime?", `int values[5] = {${v.join(", ")}};\nint* p = values + 4;\np -= ${k};\ncout << *p;`,
        v[4 - k], [v[4], v[k], v[4] - k], `p parte en el elemento 4 y retrocede ${k}: elemento ${4 - k} = ${v[4 - k]}.`);
    },
    function () {
      const [t, s] = pick([["double", 8], ["char", 1], ["short", 2], ["int", 4]]);
      return S(`Si un puntero ocupa 8 bytes, ¿cuánto vale \`sizeof(*p)\`?`, `${t} x = 0;\n${t}* p = &x;`,
        s, [8, 1, 4, 2].filter(x => x !== s), `sizeof(*p) describe el tipo apuntado (${t}: ${s} byte${s > 1 ? "s" : ""}). sizeof(p) sería el puntero.`);
    },
    function () {
      return S("¿Cuál NO avanza `p` un elemento?", "int values[4] = {10, 20, 30, 40};\nint* p = values;",
        "*p += 1;", ["++p;", "p += 1;", "p = p + 1;"], "`++p`, `p += 1` y `p = p + 1` avanzan el mismo paso. `*p += 1` cambia el valor apuntado (10 → 11) y deja p donde estaba.");
    },
    function () {
      return S("Un desplazamiento de `k` elementos desde `p` corresponde a…", "T* p;",
        "k * sizeof(*p) bytes", ["k bytes", "k * sizeof(p) bytes", "sizeof(*p) bytes"], "El tipo apuntado determina el paso: k elementos son k × sizeof(*p) bytes.");
    },
    function () {
      const A = addr(), k = rnd(2, 4);
      return S("Si `short` ocupa 2 bytes, ¿qué dirección es `s - " + k + "`?", `short* s;       // s == ${A}`,
        A - 2 * k, [A - k, A + 2 * k, A - 4 * k], `Restar también cuenta elementos: ${k} shorts hacia atrás son ${2 * k} bytes: ${A - 2 * k}.`);
    },
    function () {
      const k = rnd(2, 6);
      return S("¿Qué imprime?", `int values[8] = {};\nint* p = values;\np += ${k};\ncout << p - values;`,
        k, [4 * k, k + 1, 8 - k], `p avanzó ${k} elementos desde el inicio; la distancia en elementos es ${k}.`);
    },
    function () {
      const v = arr(4, 10, 99);
      return S("¿Qué imprime?", `int values[4] = {${v.join(", ")}};\nint* p = values;\n++p;\np += 1;\np = p + 1;\ncout << *p;`,
        v[3], [v[2], v[1], v[0] + 3], `Las tres formas avanzan un elemento cada una: queda en values[3] = ${v[3]}.`);
    },
    function () {
      const [t, s] = pick(TYPES.slice(1)), A = addr();
      return S(`Si \`${t}\` ocupa ${s} bytes, ¿qué dirección tiene \`&values[3]\`?`, `${t} values[5];       // values está en ${A}`,
        A + 3 * s, [A + 3, A + 4 * s, A + 2 * s], `El elemento 3 está 3 × ${s} = ${3 * s} bytes después del inicio: ${A + 3 * s}.`);
    }
  ];

  /* ---------- m06 · *p++ o (*p)++ (carrera) ---------- */
  const M_PREC_GENS = [
    function () {
      const [a, b] = arr(2, 2, 60);
      return R("¿Cuánto vale `x`?", `int values[2] = {${a}, ${b}};\nint* p = values;\nint x = *p++;`,
        a, [a + 1, b], `\`*p++\` es \`*(p++)\`: el ++ posfijo entrega la dirección anterior, así que x lee values[0] = ${a}; después p avanza.`);
    },
    function () {
      const [a, b] = arr(2, 2, 60);
      return R("¿Cuánto vale `*p` al final?", `int values[2] = {${a}, ${b}};\nint* p = values;\nint x = *p++;`,
        b, [a, a + 1], `Además de entregar ${a}, \`p++\` mueve p al elemento 1: \`*p\` = ${b}.`);
    },
    function () {
      const [a, b] = arr(2, 2, 60);
      return R("¿Cuánto vale `y`?", `int values[2] = {${a}, ${b}};\nint* p = values;\nint y = (*p)++;`,
        a, [a + 1, b], `\`(*p)++\` incrementa el entero apuntado, pero el posfijo entrega el valor anterior: y = ${a} y values[0] pasa a ${a + 1}.`);
    },
    function () {
      const [a, b] = arr(2, 2, 60);
      return R("¿Cuánto vale `values[0]`?", `int values[2] = {${a}, ${b}};\nint* p = values;\nint y = (*p)++;`,
        a + 1, [a, b], `Los paréntesis eligen el entero como operando: values[0] pasa de ${a} a ${a + 1}. p no se movió.`);
    },
    function () {
      const [a, b] = arr(2, 2, 60);
      return R("¿Qué imprime?", `int values[2] = {${a}, ${b}};\nint* p = values;\nint x = *p++;\nint y = (*p)++;\ncout << x << " " << y << " " << values[1];`,
        `${a} ${b} ${b + 1}`, [`${a} ${b} ${b}`, `${a} ${a + 1} ${b}`, `${a + 1} ${b} ${b}`, `${b} ${b} ${b + 1}`], `Es el ejemplo del PPT: x = ${a} y p avanza; y = ${b} y el elemento 1 pasa a ${b + 1}.`);
    },
    function () {
      const s = arr(3, 1, 60);
      return R("¿Qué imprime?", `int source[3] = {${s.join(", ")}};\nint target[3] = {};\nint* p = target;\nint* q = source;\nfor (int i = 0; i < 3; ++i)\n  *p++ = *q++;\ncout << target[0] << " " << target[1] << " " << target[2];`,
        s.join(" "), [`${s[0]} ${s[0]} ${s[0]}`, "0 0 0"], `Cada vuelta equivale a \`*p = *q; ++p; ++q;\`: copia y avanza ambos. target queda igual a source.`);
    },
    function () {
      const s = arr(3, 1, 60), k = rnd(1, 2);
      const t = s.map((x, i) => (i < k ? x : 0));
      return R("¿Qué imprime?", `int source[3] = {${s.join(", ")}};\nint target[3] = {};\nint* p = target;\nint* q = source;\nfor (int i = 0; i < ${k}; ++i)\n  *p++ = *q++;\ncout << target[0] << " " << target[1] << " " << target[2];`,
        t.join(" "), [s.join(" "), `${s[0]} 0 0` === t.join(" ") ? `${s[0]} ${s[1]} 0` : `${s[0]} 0 0`], `El ciclo da ${k} vuelta${k > 1 ? "s" : ""}: copia ${k} elemento${k > 1 ? "s" : ""}; el resto de target sigue en 0.`);
    },
    function () {
      const [a, b] = arr(2, 2, 60), w = rnd(61, 99);
      return R("¿Qué imprime?", `int values[2] = {${a}, ${b}};\nint* p = values;\n*p++ = ${w};\ncout << values[0] << " " << *p;`,
        `${w} ${b}`, [`${a} ${w}`, `${w} ${w}`], `\`*p++ = ${w}\` escribe en la dirección original (values[0]) y luego avanza p al elemento 1.`);
    },
    function () {
      const [a, b] = arr(2, 2, 60), [w, z] = arr(2, 61, 99);
      return R("¿Qué imprime?", `int values[2] = {${a}, ${b}};\nint* p = values;\n*p++ = ${w};\n*p = ${z};\ncout << values[0] << " " << values[1];`,
        `${w} ${z}`, [`${z} ${b}`, `${w} ${b}`], `La primera escritura va a values[0] y p avanza; la segunda va a values[1].`);
    },
    function () {
      const [a, b] = arr(2, 2, 60);
      return R("¿Qué imprime?", `int values[2] = {${a}, ${b}};\nint* p = values;\n(*p)++;\n(*p)++;\ncout << values[0];`,
        a + 2, [a, b], `\`(*p)++\` incrementa el entero y p no se mueve: dos veces sobre values[0], ${a} + 2 = ${a + 2}.`);
    },
    function () {
      const [a, b] = arr(2, 2, 60);
      return R("¿Qué imprime?", `int values[2] = {${a}, ${b}};\nint* p = values;\nint u = *p++;\nint v = *p++;\ncout << u + v;`,
        a + b, [2 * a, a + 1], `Cada \`*p++\` lee un elemento y avanza: u = ${a}, v = ${b}. Suma ${a + b}.`);
    },
    function () {
      const [a, b] = arr(2, 2, 60);
      return R("¿Qué imprime?", `int values[2] = {${a}, ${b}};\nint* p = values;\nint x = *p++ + 1;\ncout << x << " " << *p;`,
        `${a + 1} ${b}`, [`${b + 1} ${b}`, `${a + 1} ${a}`], `\`*p++\` lee ${a} (y p avanza); luego + 1 = ${a + 1}. Al final p apunta a ${b}.`);
    },
    function () {
      const v = arr(3, 1, 30), s = v[0] + v[1] + v[2];
      return R("¿Qué imprime?", `int values[3] = {${v.join(", ")}};\nint* p = values;\nint total = 0;\nfor (int i = 0; i < 3; ++i)\n  total += *p++;\ncout << total;`,
        s, [3 * v[0], v[0] + 3], `Cada vuelta lee el elemento actual y avanza p: ${v.join(" + ")} = ${s}.`);
    },
    function () {
      const v = arr(3, 1, 30);
      return R("¿Qué imprime?", `int values[3] = {${v.join(", ")}};\nint* p = values;\nfor (int i = 0; i < 3; ++i)\n  (*p)++;\ncout << values[0] << " " << values[1];`,
        `${v[0] + 3} ${v[1]}`, [`${v[0] + 1} ${v[1] + 1}`, `${v[0]} ${v[1]}`], `\`(*p)++\` nunca mueve p: las 3 vueltas incrementan values[0]. values[1] no cambia.`);
    },
    function () {
      const [a, b] = arr(2, 2, 60);
      return R("¿Qué imprime?", `int values[2] = {${a}, ${b}};\nint* p = values;\nint y = (*p)++;\ncout << y << " " << *p;`,
        `${a} ${a + 1}`, [`${a + 1} ${a + 1}`, `${a} ${b}`, `${a} ${a}`, `${a + 1} ${a}`], `y recibe el valor anterior (${a}); el entero apuntado queda en ${a + 1} y p sigue en el elemento 0.`);
    },
    function () {
      const [a, b] = arr(2, 2, 60);
      return R("¿Qué imprime?", `int values[2] = {${a}, ${b}};\nint* p = values;\nint x = *p++;\ncout << x << " " << *p;`,
        `${a} ${b}`, [`${a + 1} ${b}`, `${b} ${b}`, `${a} ${a}`, `${b} ${a}`], `x lee el elemento 0 (${a}) y p avanza al 1 (${b}).`);
    },
    function () {
      return R("`*p++` equivale a…", "int values[2] = {10, 20};\nint* p = values;\nint x = *p++;",
        "*(p++)", ["(*p)++", "*(p + 1)"], "El ++ posfijo tiene mayor precedencia que el * unario: primero se aplica a p, y el * actúa sobre la dirección anterior.");
    },
    function () {
      return R("¿Qué incrementa `(*p)++`?", "int values[2] = {10, 20};\nint* p = values;\n(*p)++;",
        "El valor apuntado", ["El puntero", "Ambos"], "Los paréntesis seleccionan el entero apuntado como operando: values[0] pasa a 11 y p no se mueve.");
    },
    function () {
      const s = arr(3, 1, 60), t = arr(3, 61, 99);
      return R("¿Qué imprime?", `int source[3] = {${s.join(", ")}};\nint target[3] = {${t.join(", ")}};\nint* p = target;\nint* q = source;\nfor (int i = 0; i < 2; ++i)\n  *p++ = *q++;\ncout << target[0] << " " << target[1] << " " << target[2];`,
        `${s[0]} ${s[1]} ${t[2]}`, [s.join(" "), `${s[0]} ${s[1]} 0`], `Se copian 2 elementos; el tercero de target conserva su valor (${t[2]}).`);
    },
    function () {
      const s = arr(3, 1, 60);
      return R("¿Qué imprime?", `int source[3] = {${s.join(", ")}};\nint target[3] = {};\nint* p = target;\nint* q = source;\nfor (int i = 0; i < 3; ++i)\n  *p++ = *q++;\ncout << p - target;`,
        3, [2, 0], "Cada vuelta avanza p un elemento: tras 3 vueltas queda en la posición posterior al último, a distancia 3 del inicio.");
    },
    function () {
      const s = arr(3, 1, 60);
      return R("¿Qué imprime?", `int source[3] = {${s.join(", ")}};\nint target[3] = {};\nint* p = target;\nint* q = source;\nfor (int i = 0; i < 3; ++i)\n  *p++ = *q++;\ncout << *(q - 1);`,
        s[2], [s[0], 0], `q terminó una posición después del último elemento de source; \`*(q - 1)\` es el último: ${s[2]}.`);
    },
    function () {
      const v = arr(3, 1, 30);
      return R("¿Qué imprime?", `int values[3] = {${v.join(", ")}};\nint* p = values;\nfor (int i = 0; i < 3; ++i)\n  *p++ *= 2;\ncout << values[0] << " " << values[2];`,
        `${2 * v[0]} ${2 * v[2]}`, [`${8 * v[0]} ${v[2]}`, `${v[0]} ${2 * v[2]}`], "`*p++ *= 2` duplica el elemento actual y luego avanza: se duplican los tres.");
    }
  ];

  /* ---------- m07 · Cadenas y const (clasificador) ---------- */
  const M_STR_ITEMS = [
    { code: "const char* terry = \"hello\";\nchar fifth = terry[4];", bin: "compila", explain: "Leer mediante un `const char*` está permitido: fifth = 'o' (también `*(terry + 4)`)." },
    { code: "const char* terry = \"hello\";\nterry = \"world\";", bin: "compila", explain: "`const char*` impide escribir los caracteres, no cambiar la dirección: el puntero puede apuntar a otro literal." },
    { code: "char word[] = \"hello\";\nchar* const fixed = word;\nfixed[0] = 'H';", bin: "compila", explain: "`char* const` fija el puntero, pero los caracteres del arreglo siguen siendo modificables." },
    { code: "char word[] = \"hello\";\nword[0] = 'J';", bin: "compila", explain: "word es un arreglo propio (copia del literal): sus caracteres se pueden cambiar." },
    { code: "const char* t = \"hello\";\nchar c = *(t + 1);", bin: "compila", explain: "Solo lee: c = 'e'. `t[i]` y `*(t + i)` acceden al mismo carácter." },
    { code: "int numbers[5] = {};\nint other[5] = {};\nint* p = numbers;\np = other;", bin: "compila", explain: "Un puntero común puede apuntar a otro lugar." },
    { code: "char word[] = \"abc\";\nconst char* r = word;", bin: "compila", explain: "Se puede mirar un arreglo modificable con un `const char*`: solo restringe lo que se escribe mediante r." },
    { code: "char word[] = \"hola\";\nchar* const fixed = word;\n*(fixed + 1) = 'O';", bin: "compila", explain: "fixed no cambia de dirección; solo se escribe un carácter: word queda \"hOla\"." },
    { code: "const char* t = \"hello\";\nt++;", bin: "compila", explain: "Mover un `const char*` es válido: ahora apunta a la 'e'." },
    { code: "int numbers[5] = {};\nint* const p = numbers;\n*(p + 2) = 7;", bin: "compila", explain: "`int* const` fija la dirección, no los valores: se puede escribir numbers[2]." },
    { code: "char word[] = \"hello\";\nconst char* r = word;\nword[0] = 'J';", bin: "compila", explain: "El arreglo sigue siendo modificable por su nombre; el const de r solo limita lo que se hace mediante r." },
    { code: "const char* t = \"hi\";\nconst char* u = t;", bin: "compila", explain: "Copiar un puntero crea un alias; ambos son `const char*`." },
    { code: "const char* terry = \"hello\";\nterry[0] = 'H';", bin: "no compila", explain: "Con `const char*` los caracteres apuntados son de solo lectura: no se pueden escribir." },
    { code: "const char* terry = \"hello\";\n*terry = 'J';", bin: "no compila", explain: "`*terry` es un `const char`: no se puede asignar. Los caracteres de un literal no deben modificarse." },
    { code: "char word[] = \"hello\";\nchar other[] = \"world\";\nchar* const fixed = word;\nfixed = other;", bin: "no compila", explain: "`char* const` fija el valor del puntero: no puede pasar a apuntar a otro arreglo." },
    { code: "int numbers[5] = {};\nint* p = numbers;\nnumbers = p;", bin: "no compila", explain: "El nombre de un arreglo nativo no puede reasignarse a otro bloque." },
    { code: "int numbers[5] = {};\nint other[5] = {};\nnumbers = other;", bin: "no compila", explain: "Los arreglos nativos no se asignan así; habría que copiar elemento por elemento." },
    { code: "char word[] = \"hello\";\nword = \"world\";", bin: "no compila", explain: "word es un arreglo, no un puntero: no se le asigna otra dirección ni otro literal completo." },
    { code: "const char* t = \"hello\";\nchar* s = t;", bin: "no compila", explain: "Pasar de `const char*` a `char*` quitaría la protección de solo lectura: el compilador lo rechaza." },
    { code: "char word[] = \"abc\";\nchar* const fixed = word;\nfixed++;", bin: "no compila", explain: "fixed es un puntero constante: no se puede mover." },
    { code: "int numbers[5] = {};\nnumbers++;", bin: "no compila", explain: "Un arreglo no se puede mover como un puntero. Para recorrerlo se usa un puntero aparte: `int* p = numbers; p++;`." },
    { code: "int values[3] = {};\nint* const p = values;\np = values + 1;", bin: "no compila", explain: "`int* const` no permite cambiar la dirección guardada." },
    { code: "const char* t = \"hello\";\n*(t + 4) = '!';", bin: "no compila", explain: "`*(t + 4)` es lo mismo que `t[4]`: un carácter de solo lectura mediante un `const char*`." },
    { code: "char word[] = \"hello\";\nconst char* r = word;\nr[0] = 'J';", bin: "no compila", explain: "Aunque word sea modificable, r es `const char*`: no permite escribir mediante él." }
  ];

  /* ===================================================================
     BLOQUE 3 · PUNTEROS ESPECIALES (PPT §3)
     =================================================================== */

  /* ---------- m08 · Puntero a puntero (carrera) ---------- */
  // Aquí b, c y d ya son punteros: los enteros usan otros nombres.
  const intsPP = k => shuffle(["a", "n", "m", "k", "v", "w", "z", "y", "x"]).slice(0, k);
  const M_PP_GENS = [
    function () {
      const [z] = letters(1), A = addr(), B = addr() + 10000;
      return R("¿Cuánto vale `c`?", `char a = '${z}';      // &a == ${A}\nchar* b = &a;     // &b == ${B}\nchar** c = &b;`,
        B, [A, z], `c guarda la dirección del puntero b: ${B}. *c sería ${A} y **c sería '${z}'.`);
    },
    function () {
      const [z] = letters(1), A = addr(), B = addr() + 10000;
      return R("¿Cuánto vale `*c`?", `char a = '${z}';      // &a == ${A}\nchar* b = &a;     // &b == ${B}\nchar** c = &b;`,
        A, [B, z], `\`*c\` es lo que guarda b: la dirección de a, ${A}.`);
    },
    function () {
      const [z] = letters(1), A = addr(), B = addr() + 10000;
      return R("¿Cuánto vale `**c`?", `char a = '${z}';      // &a == ${A}\nchar* b = &a;     // &b == ${B}\nchar** c = &b;`,
        z, [A, B], `Dos desreferencias: c → b → a. \`**c\` es el carácter '${z}'.`);
    },
    function () {
      const [z, x] = letters(2);
      return R("¿Qué imprime?", `char a = '${z}';\nchar* b = &a;\nchar** c = &b;\n**c = '${x}';\ncout << a;`,
        x, [z, "Ninguno", nextChar(x)], `\`**c = '${x}'\` sigue ambos enlaces (c → b → a) y modifica a.`);
    },
    function () {
      const [z, q] = letters(2);
      return R("¿Qué imprime?", `char a = '${z}';\nchar* b = &a;\nchar** c = &b;\nchar other = '${q}';\n*c = &other;\ncout << *b;`,
        q, [z, "Ninguno", nextChar(q)], `\`*c = &other\` modifica b (c sigue apuntando a b). Ahora b apunta a other: \`*b\` = '${q}'.`);
    },
    function () {
      const [z, q, w] = letters(3);
      return R("¿Qué imprime?", `char a = '${z}';\nchar* b = &a;\nchar** c = &b;\nchar other = '${q}';\n*c = &other;\n**c = '${w}';\ncout << a << other;`,
        `${z}${w}`, [`${w}${q}`, `${w}${w}`], `Primero b pasa a apuntar a other; luego \`**c\` escribe en other. a no cambia: '${z}'.`);
    },
    function () {
      return R("¿Qué tipo tiene `*c`?", "char a = 'z';\nchar* b = &a;\nchar** c = &b;",
        "char*", ["char**", "char"], "Cada `*` quita un nivel: c es char**, *c es char* (la dirección de a) y **c es char.");
    },
    function () {
      return R("¿Qué tipo tiene `**c`?", "char a = 'z';\nchar* b = &a;\nchar** c = &b;",
        "char", ["char*", "char**"], "Dos desreferencias desde un char** llegan al carácter: char.");
    },
    function () {
      return R("¿Qué tipo tiene `c`?", "char a = 'z';\nchar* b = &a;\nchar** c = &b;",
        "char**", ["char*", "char"], "c guarda la dirección de un char*: es un puntero a puntero, char**.");
    },
    function () {
      return R("¿Qué tipo tiene `&b`?", "char a = 'z';\nchar* b = &a;",
        "char**", ["char*", "char"], "b es char*; su dirección agrega un nivel: char**. Por eso `char** c = &b;` calza.");
    },
    function () {
      const [a] = intsPP(1), v = rnd(2, 40), k = rnd(2, 9);
      return R("¿Qué imprime?", `int ${a} = ${v};\nint* b = &${a};\nint** c = &b;\n**c += ${k};\ncout << ${a};`,
        v + k, [v, k], `\`**c\` llega a ${a}: ${v} + ${k} = ${v + k}.`);
    },
    function () {
      const [a] = intsPP(1), v = rnd(2, 40), w = rnd(41, 90);
      return R("¿Qué imprime?", `int ${a} = ${v};\nint* b = &${a};\nint** c = &b;\nint* d = *c;\n*d = ${w};\ncout << ${a};`,
        w, [v, 0], `\`*c\` es la dirección guardada en b (la de ${a}); d la copia y escribe ${w} en ${a}.`);
    },
    function () {
      const [a] = intsPP(1), v = rnd(2, 90);
      return R("¿Qué imprime?", `int ${a} = ${v};\nint* b = &${a};\nint** c = &b;\nint*** d = &c;\ncout << ***d;`,
        v, [0, "No compila"], "El patrón se extiende: tres asteriscos, tres niveles. d → c → b → " + a + `: ${v}.`);
    },
    function () {
      return R("¿Qué tipo apunta a un `int**`?", "int a = 1;\nint* b = &a;\nint** c = &b;\n/* ??? */ d = &c;",
        "int***", ["int**", "int*"], "Un asterisco más por cada nivel de puntero: la dirección de un int** es un int***.");
    },
    function () {
      const [z, q] = letters(2);
      return R("¿Qué imprime?", `char a = '${z}';\nchar* b = &a;\nchar** c = &b;\nchar other = '${q}';\n*c = &other;\ncout << (b == &other);`,
        1, [0, q], "`*c` es b: asignarle `&other` hace que b guarde la dirección de other. La comparación da 1.");
    },
    function () {
      const [z, q] = letters(2);
      return R("¿Qué imprime?", `char a = '${z}';\nchar* b = &a;\nchar** c = &b;\nchar other = '${q}';\n*c = &other;\ncout << a;`,
        z, [q, "Ninguno", nextChar(z)], `\`*c = &other\` solo cambia la dirección guardada en b; el carácter a sigue siendo '${z}'.`);
    },
    function () {
      const [z, q] = letters(2);
      return R("¿Qué imprime?", `char a = '${z}';\nchar other = '${q}';\nchar* b = &a;\nchar** c = &b;\nb = &other;\ncout << **c;`,
        q, [z, "Ninguno", nextChar(q)], `c sigue apuntando a b, y b ahora apunta a other: \`**c\` = '${q}'.`);
    },
    function () {
      const [a, x] = intsPP(2), [v, w, k] = distinct(3, 2, 60);
      return R("¿Qué imprime?", `int ${a} = ${v}, ${x} = ${w};\nint* b = &${a};\nint** c = &b;\n*c = &${x};\n**c = ${k};\ncout << ${a} << " " << ${x};`,
        `${v} ${k}`, [`${k} ${w}`, `${k} ${k}`], `\`*c = &${x}\` redirige b hacia ${x}; luego \`**c = ${k}\` escribe en ${x}.`);
    },
    function () {
      return R("¿Qué modifica `*c = &other;`?", "char a = 'z';\nchar* b = &a;\nchar** c = &b;\nchar other = 'q';\n*c = &other;",
        "b", ["a", "c"], "`*c` es b. Se cambia la dirección que guarda b; c sigue apuntando a b y a no cambia.");
    },
    function () {
      return R("¿Qué modifica `**c = 'x';`?", "char a = 'z';\nchar* b = &a;\nchar** c = &b;\n**c = 'x';",
        "a", ["b", "c"], "`**c` recorre ambos enlaces hasta el carácter: modifica a.");
    },
    function () {
      const [a] = intsPP(1), v = rnd(2, 40);
      return R("¿Qué pasa con este código?", `int ${a} = ${v};\nint* b = &${a};\nint** c = b;`,
        "No compila", [v, "Compila"], "c necesita la dirección de un int* (`&b`). b es int*, no int**: los tipos no calzan.");
    },
    function () {
      const [z] = letters(1);
      return R("¿Qué imprime?", `char a = '${z}';\nchar* b = &a;\nchar** c = &b;\ncout << (*c == &a);`,
        1, [0, z], "`*c` es el valor de b, que es la dirección de a: la comparación es verdadera (1).");
    }
  ];

  /* ---------- m09 · void* y punteros nulos (disparos) ---------- */
  const M_VOID_GENS = [
    function () {
      const [n] = ints(1), v = rnd(100, 2000);
      return S("¿Qué imprime?", `int ${n} = ${v};\nvoid* data = &${n};\nint* typed = static_cast<int*>(data);\n++(*typed);\ncout << ${n};`,
        v + 1, [v, v + 4, "No compila"], `Se recupera el tipo correcto (int*) y se incrementa el objeto: ${v + 1}.`);
    },
    function () {
      const [n] = ints(1), v = rnd(100, 2000);
      return S("¿Qué pasa con este código?", `int ${n} = ${v};\nvoid* data = &${n};\ncout << *data;`,
        "No compila", [v, 0, "Imprime la dirección"], "void no indica un tipo de valor para leer: `*data` es inválido. Primero hay que convertir al tipo correcto.");
    },
    function () {
      const [ch] = letters(1), v = rnd(100, 2000);
      return S("¿Qué imprime?", `void increase(void* data, bool is_char) {\n  if (is_char) ++(*static_cast<char*>(data));\n  else         ++(*static_cast<int*>(data));\n}\n\nchar a = '${ch}'; int b = ${v};\nincrease(&b, false);\ncout << a << ", " << b;`,
        `${ch}, ${v + 1}`, [`${ch}, ${v}`, `${v + 1}, ${v + 1}`, "No compila"], `Quien llama dice qué tipo hay: con false la función trata el dato como int y lo incrementa (${v} → ${v + 1}). La variable a no se pasó a la función, así que sigue siendo '${ch}'.`);
    },
    function () {
      const v = rnd(100, 2000), k = rnd(2, 3);
      return S("¿Qué imprime?", `void increase(void* data, bool is_char) {\n  if (is_char) ++(*static_cast<char*>(data));\n  else         ++(*static_cast<int*>(data));\n}\n\nint b = ${v};\n${"increase(&b, false);\n".repeat(k)}cout << b;`,
        v + k, [v + 1, v, v + 4 * k], `Cada llamada incrementa el int una vez: ${v} + ${k} = ${v + k}.`);
    },
    function () {
      const [t, s] = pick([["int", 4], ["double", 8], ["char", 1], ["short", 2]]);
      return S("Si un puntero ocupa 8 bytes, ¿cuánto vale `sizeof(*p)`?", `${t} x = 0;\n${t}* p = &x;`,
        s, [8, 4, 1, 2].filter(x => x !== s).slice(0, 3), `sizeof(*p) describe el tipo apuntado (${t}). sizeof(p) describiría el puntero.`);
    },
    function () {
      const [t] = pick([["int"], ["double"], ["char"], ["short"]]);
      return S("Si un puntero ocupa 8 bytes, ¿cuánto vale `sizeof(p)`?", `${t} x = 0;\n${t}* p = &x;`,
        8, [1, 2, 4], "El tamaño de un puntero no depende del objeto al que apunta: aquí 8 bytes, sea cual sea el tipo.");
    },
    function () {
      const ch = letters(1)[0];
      return S("¿Cuánto vale `sizeof(a)`?", `char a = '${ch}';`,
        1, [2, 4, 8], "sizeof(char) siempre es 1 byte en C++. Los tamaños de short, int y long dependen de la implementación.");
    },
    function () {
      return S("¿Qué imprime?", "int* p = nullptr;\ncout << (p == nullptr);",
        1, [0, "No compila", "Basura"], "Comprobar un puntero nulo es válido: la comparación es verdadera (1).");
    },
    function () {
      return S("¿Qué imprime?", "int* old_style = 0;\ncout << (old_style == nullptr);",
        1, [0, "No compila", "Basura"], "0 también es una constante de puntero nulo: old_style es nulo y la comparación da 1.");
    },
    function () {
      const [x] = ints(1), v = rnd(2, 99);
      return S("¿Qué imprime?", `int ${x} = ${v};\nvoid* r = &${x};\ncout << (r == nullptr);`,
        0, [1, v, "No compila"], `r es genérico (void*), pero no es nulo: guarda la dirección de ${x}. "void" y "nulo" son cosas distintas.`);
    },
    function () {
      return S("¿Cómo es `q`?", "void* q = nullptr;",
        "Genérico y nulo", ["Con tipo y nulo", "Genérico, no nulo", "Con tipo, no nulo"], "void* = genérico (sin tipo apuntado concreto); nullptr = nulo. Son dos propiedades independientes.");
    },
    function () {
      return S("¿Cómo es `p`?", "int* p = nullptr;",
        "Con tipo y nulo", ["Genérico y nulo", "Genérico, no nulo", "Con tipo, no nulo"], "int* tiene tipo apuntado; nullptr lo deja nulo: no selecciona ningún objeto.");
    },
    function () {
      return S("¿Cómo es `r`?", "int x = 5;\nvoid* r = &x;",
        "Genérico, no nulo", ["Genérico y nulo", "Con tipo y nulo", "Con tipo, no nulo"], "void* es genérico, y guarda la dirección de x, así que no es nulo. Igual necesita conversión antes de acceder.");
    },
    function () {
      return S("¿Qué pasa al evaluar `*p`?", "int* p = nullptr;",
        "Uso inválido", ["Vale 0", "No compila", "Vale nullptr"], "Compila, pero un puntero nulo no tiene un objeto al que acceder: es válido compararlo, no desreferenciarlo.");
    },
    function () {
      return S("Antes de leer el valor de un `void*` no nulo hay que…", "int x = 5;\nvoid* r = &x;",
        "Convertir a su tipo", ["Comparar con nullptr", "Sumarle 1", "Nada, se lee directo"], "void* no tiene la información de tipo: hay que recuperar el tipo concreto, por ejemplo `static_cast<int*>(r)`.");
    },
    function () {
      const d = pick([1.5, 2.25, 3.5, 0.75, 4.5]);
      return S("¿Qué imprime?", `double d = ${d};\nvoid* g = &d;\ncout << *static_cast<double*>(g) * 2;`,
        cout6(d * 2), [cout6(d), cout6(d * 2 + 1), "No compila"], `La conversión coincide con el objeto (double): se lee ${d} y se multiplica: ${cout6(d * 2)}.`);
    },
    function () {
      const [a] = ints(1), v = rnd(2, 40), w = rnd(41, 99);
      return S("¿Qué imprime?", `int ${a} = ${v};\nvoid* g = &${a};\nint* t = static_cast<int*>(g);\n*t = ${w};\ncout << ${a};`,
        w, [v, 0, "No compila"], `t recupera el tipo int* y apunta a ${a}: escribir mediante t cambia ${a} a ${w}.`);
    },
    function () {
      return S("¿Cuál NO es un puntero nulo?", "int* a = nullptr;\nint* b = 0;\nint* c = NULL;\nint x = 1;\nint* d = &x;",
        "d", ["a", "b", "c"], "nullptr, 0 y NULL son formas de puntero nulo (nullptr es la moderna). d guarda la dirección de x.");
    },
    function () {
      return S("¿Qué imprime?", "int* p = nullptr;\nif (p == nullptr) cout << \"nulo\";\nelse cout << *p;",
        "nulo", ["0", "Uso inválido", "No compila"], "Se comprueba antes de desreferenciar: como p es nulo, imprime \"nulo\" y nunca evalúa *p.");
    },
    function () {
      const [x] = ints(1), v = rnd(2, 99);
      return S("¿Qué imprime?", `int ${x} = ${v};\nint* p = nullptr;\np = &${x};\nif (p != nullptr) cout << *p;`,
        v, [0, "Nada", "nulo"], `p deja de ser nulo al recibir la dirección de ${x}: se imprime ${v}.`);
    },
    function () {
      return S("¿Qué indica el `void` de `void*`?", "void* data;",
        "Tipo no especificado", ["Que es nulo", "Que no apunta a nada", "Puntero a función"], "\"void\" dice que no se especifica el tipo del objeto apuntado; \"nulo\" diría que no selecciona ningún objeto.");
    },
    function () {
      const v = rnd(2, 99);
      return S("¿Qué pasa con este código?", `int x = ${v};\nvoid* g = &x;\nint* t = g;`,
        "No compila", [v, "Compila", "t queda nulo"], "En C++ un void* no se convierte solo a int*: hace falta `static_cast<int*>(g)`.");
    }
  ];

  /* ---------- m10 · Punteros a funciones (carrera) ---------- */
  const FN_HDR = "int addition(int a, int b) { return a + b; }\nint subtraction(int a, int b) { return a - b; }";
  const OP_FN = "int operation(int x, int y, int (*call)(int, int)) {\n  return (*call)(x, y);\n}";
  const M_FN_GENS = [
    function () {
      const x = rnd(5, 20), y = rnd(2, 9), z = rnd(25, 60), m = x + y;
      return R("¿Qué imprime?", `${FN_HDR}\n${OP_FN}\n\nint (*minus)(int, int) = subtraction;\nint m = operation(${x}, ${y}, addition);\nint n = operation(${z}, m, minus);\ncout << m << " " << n;`,
        `${m} ${z - m}`, [`${x - y} ${z - x + y}`, `${m} ${z + m}`], `Es el ejemplo del PPT: operation llama a la función recibida. m = ${x} + ${y} = ${m}; n = ${z} − ${m} = ${z - m}.`);
    },
    function () {
      const [x, y] = distinct(2, 2, 30);
      return R("¿Qué imprime?", `${FN_HDR}\n\nint (*minus)(int, int) = subtraction;\ncout << minus(${x}, ${y});`,
        x - y, [x + y, y - x], `minus guarda la dirección de subtraction: ${x} − ${y} = ${x - y}.`);
    },
    function () {
      const [x, y] = distinct(2, 2, 30);
      return R("¿Qué imprime?", `${FN_HDR}\n\nint (*minus)(int, int) = subtraction;\ncout << (*minus)(${x}, ${y});`,
        x - y, [x + y, "No compila"], `\`minus(${x}, ${y})\` y \`(*minus)(${x}, ${y})\` son formas de llamada equivalentes: ${x - y}.`);
    },
    function () {
      const [x, y] = distinct(2, 2, 30);
      return R("¿Qué imprime?", `${FN_HDR}\n\nint (*f)(int, int) = addition;\nf = subtraction;\ncout << f(${x}, ${y});`,
        x - y, [x + y, "No compila"], `Un puntero a función puede cambiar de destino si la firma coincide. f termina apuntando a subtraction: ${x - y}.`);
    },
    function () {
      const [x, y] = distinct(2, 30, 60);
      return R(`¿Cuánto devuelve \`operation(${x}, ${y}, addition)\`?`, `${FN_HDR}\n${OP_FN}`,
        x + y, [x - y, x * y], `operation llama a la función que recibe: addition(${x}, ${y}) = ${x + y}.`);
    },
    function () {
      const [x, y] = distinct(2, 2, 60);
      return R(`¿Cuánto devuelve \`operation(${x}, ${y}, subtraction)\`?`, `${FN_HDR}\n${OP_FN}`,
        x - y, [x + y, y - x], `Se elige subtraction sin cambiar el cuerpo de operation: ${x} − ${y} = ${x - y}.`);
    },
    function () {
      const [x, y] = distinct(2, 2, 12);
      return R("¿Qué imprime?", `int multiply(int a, int b) { return a * b; }\n${OP_FN}\n\ncout << operation(${x}, ${y}, multiply);`,
        x * y, [x + y, x - y], `Cualquier función int(int, int) sirve como argumento: multiply(${x}, ${y}) = ${x * y}.`);
    },
    function () {
      return R("¿Qué declara esto?", "int (*minus)(int, int);",
        "Puntero a función", ["Función que da int*", "Un int"], "Los paréntesis alrededor de *minus hacen que sea un puntero a una función que recibe (int, int) y devuelve int.");
    },
    function () {
      return R("¿Qué declara esto?", "int* minus(int, int);",
        "Función que da int*", ["Puntero a función", "Un int*"], "Sin paréntesis alrededor de *minus, es una función que recibe dos int y devuelve un puntero a int.");
    },
    function () {
      const [x, y] = distinct(2, 2, 30);
      return R("¿Qué imprime?", `${FN_HDR}\n\nint (*f)(int, int) = &addition;\ncout << f(${x}, ${y});`,
        x + y, [x - y, "No compila"], `Se puede escribir \`&addition\` de forma explícita o solo \`addition\`: ambos dan la dirección de la función. ${x + y}.`);
    },
    function () {
      return R("¿Qué pasa con `f(1, 2)`?", "int (*f)(int, int) = nullptr;\nf(1, 2);",
        "Uso inválido", ["Devuelve 0", "Devuelve 3"], "Como con los punteros a datos: un puntero a función nulo no puede invocarse. Hay que asignarle un destino válido antes.");
    },
    function () {
      return R("¿Qué pasa con este código?", "int negate(int a) { return -a; }\n\nint (*f)(int, int) = negate;",
        "No compila", ["Compila", "f vale -a"], "La función apuntada debe coincidir con la firma: negate recibe un solo int, y f espera (int, int).");
    },
    function () {
      return R("¿Qué pasa con este código?", `${FN_HDR}\n\ndouble (*f)(int, int) = addition;`,
        "No compila", ["Compila", "f da un double"], "El tipo devuelto también es parte de la firma: addition devuelve int, y f espera una función que devuelva double.");
    },
    function () {
      const [x, y, z] = distinct(3, 2, 30);
      return R("¿Qué imprime?", `${FN_HDR}\n${OP_FN}\n\ncout << operation(operation(${x}, ${y}, addition), ${z}, subtraction);`,
        x + y - z, [x + y + z, x - y - z], `Primero la llamada interna: ${x} + ${y} = ${x + y}. Luego ${x + y} − ${z} = ${x + y - z}.`);
    },
    function () {
      const [x, y] = distinct(2, 2, 40);
      return R("¿Qué imprime?", `${FN_HDR}\n\nint (*f)(int, int);\nif (${x} > ${y}) f = addition;\nelse f = subtraction;\ncout << f(${x}, ${y});`,
        x > y ? x + y : x - y, [x > y ? x - y : x + y, x * y], `Como ${x} ${x > y ? ">" : "<"} ${y}, f apunta a ${x > y ? "addition" : "subtraction"}: ${x > y ? x + y : x - y}.`);
    },
    function () {
      const [x, y] = distinct(2, 2, 40);
      return R("¿Qué imprime?", `${FN_HDR}\n${OP_FN}\n\nint (*minus)(int, int) = subtraction;\ncout << operation(${y}, ${x}, minus);`,
        y - x, [x - y, x + y], `El orden de los argumentos importa: subtraction(${y}, ${x}) = ${y - x}.`);
    },
    function () {
      return R("¿Qué guarda `minus`?", `${FN_HDR}\n\nint (*minus)(int, int) = subtraction;\nint n = minus(20, 12);`,
        "Dirección de función", ["Un entero", "El valor 8"], "minus guarda la dirección de una función; n guarda el entero devuelto (8).");
    },
    function () {
      const [x, y] = distinct(2, 2, 30);
      return R("¿Qué imprime?", `${FN_HDR}\n${OP_FN}\n\nint r = operation(${x}, ${y}, addition) - operation(${x}, ${y}, subtraction);\ncout << r;`,
        2 * y, [2 * x, 0], `(${x} + ${y}) − (${x} − ${y}) = ${2 * y}.`);
    },
    function () {
      const x = rnd(2, 9);
      return R("¿Qué imprime?", "int twice(int v) { return 2 * v; }\nint apply(int x, int (*g)(int)) {\n  return g(g(x));\n}\n\ncout << apply(" + x + ", twice);",
        4 * x, [2 * x, x], `apply aplica g dos veces: twice(twice(${x})) = twice(${2 * x}) = ${4 * x}.`);
    },
    function () {
      const [x, y] = distinct(2, 2, 40);
      return R("¿Qué imprime?", `${FN_HDR}\n${OP_FN}\n\nint (*f)(int, int) = subtraction;\ncout << operation(${x}, ${y}, f);`,
        x - y, [x + y, "No compila"], `Se puede pasar el puntero f (que apunta a subtraction) como argumento: ${x - y}.`);
    },
    function () {
      const x = rnd(5, 20), y = rnd(2, 9), z = rnd(25, 60);
      return R(`¿Qué función elige \`operation(${z}, m, minus)\`?`, `${FN_HDR}\n${OP_FN}\n\nint (*minus)(int, int) = subtraction;\nint m = operation(${x}, ${y}, addition);\nint n = operation(${z}, m, minus);`,
        "subtraction", ["addition", "minus"], "minus es el puntero; la función elegida es aquella cuya dirección guarda: subtraction.");
    },
    function () {
      const [x, y] = distinct(2, 2, 30);
      return R("¿Qué imprime?", `${FN_HDR}\n\nint (*f)(int, int) = addition;\nint (*g)(int, int) = f;\ncout << g(${x}, ${y});`,
        x + y, [x - y, "No compila"], `Copiar un puntero a función copia la dirección: g también llama a addition. ${x + y}.`);
    }
  ];

  /* ===================================================================
     BLOQUE 4 · ASIGNACIÓN DINÁMICA Y LIBERACIÓN (PPT §4 y §5)
     =================================================================== */

  /* ---------- m11 · new y new[] (carrera) ---------- */
  const M_NEW_GENS = [
    function () {
      const [p] = ptrs(1), v = rnd(2, 99);
      return R("¿Qué imprime?", `int* ${p} = new int;\n*${p} = ${v};\ncout << *${p};\ndelete ${p};`,
        v, [0, "Basura"], `\`new int\` reserva un int sin inicializar; se escribe ${v} antes de leerlo.`);
    },
    function () {
      return R("¿Qué imprime?", "int* zero = new int(0);\ncout << *zero;\ndelete zero;",
        0, ["Basura", 1], "`new int(0)` asigna un int y lo inicializa en cero.");
    },
    function () {
      const [p] = ptrs(1), v = rnd(2, 60), k = rnd(2, 9);
      return R("¿Qué imprime?", `int* ${p} = new int(${v});\n*${p} += ${k};\ncout << *${p};\ndelete ${p};`,
        v + k, [v, k], `\`new int(${v})\` crea el int con ${v}; luego se le suma ${k}: ${v + k}.`);
    },
    function () {
      const [a, b] = arr(2, 2, 99);
      return R("¿Qué imprime?", `int* bobby = new int[5];\nbobby[0] = ${a};\n*(bobby + 1) = ${b};\ncout << bobby[1];\ndelete[] bobby;`,
        b, [a, "Basura"], "`*(bobby + 1)` equivale a `bobby[1]`: new[] devuelve un puntero al primer elemento de un bloque contiguo.");
    },
    function () {
      const [a, b] = arr(2, 2, 99);
      return R("¿Qué imprime?", `int* bobby = new int[5];\nbobby[0] = ${a};\n*(bobby + 1) = ${b};\ncout << *bobby;\ndelete[] bobby;`,
        a, [b, "5"], "`*bobby` es el primer elemento, igual que `bobby[0]`.");
    },
    function () {
      const count = rnd(3, 6), m = pick([2, 5, 10, 3]), k = rnd(0, count - 1);
      return R(`¿Cuánto vale \`values[${k}]\`?`, `int count = ${count};\nint* values = new int[count];\nfor (int i = 0; i < count; ++i)\n  values[i] = (i + 1) * ${m};`,
        (k + 1) * m, [k * m, (k + 2) * m], `En la vuelta i = ${k} se guarda (${k} + 1) × ${m} = ${(k + 1) * m}.`);
    },
    function () {
      const count = rnd(3, 9);
      return R("¿Cuál es el último índice válido?", `int count = ${count};\nint* values = new int[count];`,
        count - 1, [count, count + 1], `Igual que en un arreglo fijo, los índices van de 0 a count − 1 = ${count - 1}.`);
    },
    function () {
      const count = rnd(3, 8), k = rnd(0, count - 1);
      return R(`¿Cuánto vale \`values[${k}]\`?`, `int count = ${count};\nint* values = new int[count]();`,
        0, ["Basura", k], "`new int[count]()` (con paréntesis) inicializa los enteros en cero.");
    },
    function () {
      const count = rnd(3, 8);
      return R("¿Qué valor tiene `values[1]`?", `int count = ${count};\nint* values = new int[count];\n// no se asigna nada todavía`,
        "Indeterminado", ["0", count], "`new int[count]` reserva los elementos pero no los inicializa: hay que asignarles valores antes de leerlos.");
    },
    function () {
      const count = rnd(3, 6), s = (count * (count + 1)) / 2;
      return R("¿Qué imprime?", `int count = ${count};\nint* values = new int[count];\nfor (int i = 0; i < count; ++i)\n  values[i] = i + 1;\nint total = 0;\nfor (int i = 0; i < count; ++i)\n  total += values[i];\ncout << total;\ndelete[] values;`,
        s, [s - count, count], `Se guardan 1, 2, …, ${count}; la suma es ${s}.`);
    },
    function () {
      return R("¿Qué devuelve `new int[5]`?", "int* bobby = new int[5];",
        "Puntero al primero", ["El arreglo entero", "La cantidad 5"], "new tipo[count] devuelve un puntero al primer elemento de un bloque contiguo de count elementos.");
    },
    function () {
      return R("Si `new` habitual no consigue memoria…", "int* bobby = new int[5];",
        "Lanza bad_alloc", ["Devuelve nulo", "Devuelve 0 elementos"], "El new habitual informa el fallo lanzando std::bad_alloc; la ejecución salta al manejador (catch) o el programa termina.");
    },
    function () {
      return R("Si `new (std::nothrow)` no consigue memoria…", "int* bobby = new (std::nothrow) int[5];",
        "Devuelve nulo", ["Lanza bad_alloc", "Devuelve 0 elementos"], "nothrow informa el fallo mediante el puntero: hay que comprobar que no sea nulo antes de usarlo.");
    },
    function () {
      return R("¿Cómo se libera `values`?", "int count = 8;\nint* values = new int[count];",
        "delete[] values;", ["delete values;", "free(values);"], "Lo asignado con new[] se libera con delete[], aunque el tipo sea un simple int.");
    },
    function () {
      const n = rnd(3, 7);
      return R("¿Qué imprime?", `// entrada: ${n}\nint count;\ncin >> count;\nint* v = new int[count];\nfor (int i = 0; i < count; ++i)\n  v[i] = i * i;\ncout << v[count - 1];\ndelete[] v;`,
        (n - 1) * (n - 1), [n * n, n - 1], `La cantidad (${n}) se decide en ejecución. El último elemento es v[${n - 1}] = ${n - 1}² = ${(n - 1) * (n - 1)}.`);
    },
    function () {
      const n = pick([-3, 0, -1, -7]);
      return R("¿Qué imprime?", `// entrada: ${n}\nint count;\nif (!(cin >> count) || count <= 0) {\n  cout << "error";\n  return 1;\n}\nint* values = new int[count];\ncout << "ok";\ndelete[] values;`,
        "error", ["ok", "Nada"], `Se valida la cantidad antes de asignar: ${n} no es positiva, así que sale con "error" sin pedir memoria.`);
    },
    function () {
      const n = rnd(2, 9);
      return R("¿Qué imprime?", `// entrada: ${n}\nint count;\nif (!(cin >> count) || count <= 0) {\n  cout << "error";\n  return 1;\n}\nint* values = new (std::nothrow) int[count];\nif (values == nullptr) return 1;\ncout << "ok";\ndelete[] values;`,
        "ok", ["error", "Nada"], `${n} es una cantidad válida y la asignación tuvo éxito (no es nulo): imprime "ok".`);
    },
    function () {
      const n = rnd(3, 9);
      return R("Si un puntero ocupa 8 bytes, ¿cuánto vale `sizeof(values)`?", `int* values = new int[${n}];`,
        8, [4 * n, n], "values es un puntero: sizeof mide el puntero, no el bloque. El puntero no indica cuántos elementos se asignaron; hay que guardar la cantidad aparte.");
    },
    function () {
      const [p, q] = ptrs(2), v = rnd(2, 40), w = rnd(41, 99);
      return R("¿Qué imprime?", `int* ${p} = new int(${v});\nint* ${q} = ${p};\n*${q} = ${w};\ncout << *${p};\ndelete ${p};`,
        w, [v, 0], `${q} es un alias del mismo int dinámico: escribir mediante ${q} se ve desde ${p}.`);
    },
    function () {
      const v = arr(3, 2, 60);
      return R("¿Qué imprime?", `int* p = new int[3];\np[0] = ${v[0]}; p[1] = ${v[1]}; p[2] = ${v[2]};\ncout << p[0] + p[2];\ndelete[] p;`,
        v[0] + v[2], [v[0] + v[1], v[1] + v[2]], `p[0] + p[2] = ${v[0]} + ${v[2]} = ${v[0] + v[2]}.`);
    },
    function () {
      const v = rnd(2, 99);
      return R("¿Qué imprime?", `try {\n  int* bobby = new int[5];\n  bobby[0] = ${v};\n  cout << bobby[0];\n  delete[] bobby;\n} catch (const std::bad_alloc&) {\n  cout << "falló";\n}`,
        v, ["falló", "Nada"], "La asignación tuvo éxito, así que no se lanza bad_alloc: imprime el valor y nunca entra al catch.");
    },
    function () {
      return R("¿Cuándo se decide la cantidad en `new int[count]`?", "int count;\ncin >> count;\nint* values = new int[count];",
        "Al ejecutar", ["Al compilar", "Al enlazar"], "La asignación dinámica pide almacenamiento durante la ejecución, con una cantidad conocida en ese momento. Un arreglo nativo fija su tamaño al compilar.");
    }
  ];

  /* ---------- m12 · Liberar bien (clasificador) ---------- */
  const FREE_BINS = ["ok", "fuga", "invalido"];
  const FREE_LABELS = { ok: "CORRECTO", fuga: "FUGA", invalido: "INVÁLIDO" };
  const M_FREE_ITEMS = [
    { code: "int* one = new int(5);\ndelete one;", bin: "ok", explain: "new escalar con delete escalar: la liberación corresponde a la asignación." },
    { code: "int* many = new int[5];\ndelete[] many;", bin: "ok", explain: "new[] con delete[]." },
    { code: "int* empty = nullptr;\ndelete empty;", bin: "ok", explain: "Eliminar un puntero nulo no tiene efecto: es válido." },
    { code: "int* empty = nullptr;\ndelete[] empty;", bin: "ok", explain: "También es válido con la forma de arreglo: delete[] de nulo no hace nada." },
    { code: "int* owner = new int(25);\nint* alias = owner;\ndelete owner;\nowner = nullptr;\nalias = nullptr;", bin: "ok", explain: "Se libera una vez y se anulan ambos punteros: ningún alias queda colgando." },
    { code: "int* base = new int[3];\nint* cursor = base;\nfor (int i = 0; i < 3; ++i)\n  *cursor++ = i;\ndelete[] base;", bin: "ok", explain: "Se recorre con un cursor aparte y se libera mediante la dirección original (base)." },
    { code: "int* p = new int[3];\ndelete[] p;\np = nullptr;\ndelete[] p;", bin: "ok", explain: "El segundo delete[] recibe un puntero nulo, y eso no tiene efecto. No es doble liberación." },
    { code: "int* p = new int[3];\ndelete[] p;\np = new int[5];\ndelete[] p;", bin: "ok", explain: "Se libera el primer bloque antes de reutilizar el puntero, y luego el segundo." },
    { code: "int* p = new int[3];\np = new int[5];\ndelete[] p;", bin: "fuga", explain: "`p = new int[5]` pierde la única dirección del bloque de 3: ya no se puede liberar." },
    { code: "int* p = new int(7);\np = nullptr;", bin: "fuga", explain: "Anular el único puntero no libera el objeto: queda inaccesible." },
    { code: "int* p = new int[4];\nint x = 0;\np = &x;", bin: "fuga", explain: "Al apuntar p a x se pierde el último puntero al bloque dinámico." },
    { code: "int* p = new int(1);\nint* q = new int(2);\np = q;\ndelete p;", bin: "fuga", explain: "Tras `p = q` ambos apuntan al segundo int; se libera ese, pero el primero quedó sin ningún puntero." },
    { code: "void f() {\n  int* tmp = new int[10];\n  tmp[0] = 1;\n}", bin: "fuga", explain: "Al terminar f desaparece tmp (la variable local), pero no el bloque dinámico: nunca se liberó." },
    { code: "int* p = new int[3];\nif (!(cin >> p[0])) return 1;\ndelete[] p;", bin: "fuga", explain: "Si falla la entrada se sale sin liberar. El PPT pide liberar el bloque existente antes de salir: `delete[] p; return 1;`." },
    { code: "int* a = new int[2];\nint* b = new int[2];\ndelete[] a;", bin: "fuga", explain: "Cada asignación exitosa necesita su liberación: falta `delete[] b;`." },
    { code: "int local = 5;\ndelete &local;", bin: "invalido", explain: "local no se asignó con new: su dirección no puede pasarse a delete." },
    { code: "int* block = new int[3];\nint* inside = block + 1;\ndelete[] inside;", bin: "invalido", explain: "inside es un puntero interior, no el inicio del bloque. Hay que liberar con block." },
    { code: "int* block = new int[3];\ndelete[] block;\ndelete[] block;", bin: "invalido", explain: "Se libera exactamente una vez: el segundo delete[] recibe una asignación que ya no existe." },
    { code: "int* p = new int[3];\ndelete p;", bin: "invalido", explain: "Se asignó un arreglo: corresponde delete[], no delete." },
    { code: "int* p = new int(5);\ndelete[] p;", bin: "invalido", explain: "Se asignó un solo objeto: corresponde delete, no delete[]. Las formas deben corresponderse." },
    { code: "int* owner = new int(25);\nint* alias = owner;\ndelete owner;\ncout << *alias;", bin: "invalido", explain: "alias quedó colgante: delete no actualiza los otros punteros y el objeto ya no existe." },
    { code: "int* base = new int[3];\nint* cursor = base;\nfor (int i = 0; i < 3; ++i)\n  *cursor++ = i;\ndelete[] cursor;", bin: "invalido", explain: "cursor terminó después del último elemento: no sirve para liberar. Hay que conservar base." },
    { code: "int* owner = new int(4);\nint* alias = owner;\ndelete owner;\ndelete alias;", bin: "invalido", explain: "owner y alias son la misma asignación: se libera dos veces." },
    { code: "int* p = new int[3];\np[3] = 9;\ndelete[] p;", bin: "invalido", explain: "Los índices válidos van de 0 a 2: p[3] escribe fuera del bloque." },
    { code: "int* p = new int(3);\ndelete p;\n*p = 4;", bin: "invalido", explain: "Después de delete, p es un puntero colgante: no se puede escribir mediante él." }
  ];

  /* ---------- m13 · Programa dinámico (disparos) ---------- */
  const DYN_PROG = (body) => `int count;\nif (!(cin >> count) || count <= 0) return 1;\nint* p = new (std::nothrow) int[count];\nif (p == nullptr) return 1;\nfor (int n = 0; n < count; ++n) {\n  if (!(cin >> p[n])) { delete[] p; return 1; }\n}\n${body}\ndelete[] p;`;
  const M_DYN_GENS = [
    function () {
      const c = rnd(2, 4), v = arr(c, 1, 99);
      return S("¿Qué imprime?", `// entrada: ${c} ${v.join(" ")}\n` + DYN_PROG("for (int n = 0; n < count; ++n) cout << p[n] << \" \";"),
        v.join(" "), [v.slice(1).join(" ") || "Nada", [c].concat(v.slice(0, -1)).join(" "), "Nada"], `Lee la cantidad (${c}), asigna, lee ${c} números y los imprime: ${v.join(" ")}.`);
    },
    function () {
      const n = pick([0, -2, -5]);
      return S("¿Qué imprime?", `// entrada: ${n} 4 6\n` + DYN_PROG("for (int n = 0; n < count; ++n) cout << p[n] << \" \";"),
        "Nada", ["4 6", "0", "error"], `La cantidad ${n} no es positiva: el programa termina antes de asignar memoria o leer elementos.`);
    },
    function () {
      const [a] = arr(1, 1, 99);
      return S("¿Qué imprime?", `// entrada: 3 ${a} x\n` + DYN_PROG("for (int n = 0; n < count; ++n) cout << p[n] << \" \";"),
        "Nada", [`${a}`, `${a} 0 0`, "error"], "La segunda lectura falla (\"x\" no es número): se libera el bloque y se sale antes de imprimir.");
    },
    function () {
      const c = rnd(2, 4), v = arr(c, 1, 50), s = v.reduce((x, y) => x + y, 0);
      return S("¿Qué imprime?", `// entrada: ${c} ${v.join(" ")}\n` + DYN_PROG("int total = 0;\nfor (int n = 0; n < count; ++n) total += p[n];\ncout << total;"),
        s, [s - v[c - 1], c, v[0] * c], `Se suman los ${c} números leídos: ${s}.`);
    },
    function () {
      const c = rnd(3, 6), k = pick([2, 3, 5]);
      return S("¿Qué imprime?", `int count = ${c};\nint* base = new int[count];\nint* cursor = base;\nfor (int i = 0; i < count; ++i)\n  *cursor++ = (i + 1) * ${k};\ncout << cursor - base;\ndelete[] base;`,
        c, [c - 1, c * k, 0], `Cada vuelta avanza el cursor una posición: queda una después del último, a distancia ${c} del inicio.`);
    },
    function () {
      const c = rnd(3, 6), k = pick([2, 3, 5]), j = rnd(0, c - 1);
      return S("¿Qué imprime?", `int count = ${c};\nint* base = new int[count];\nint* cursor = base;\nfor (int i = 0; i < count; ++i)\n  *cursor++ = (i + 1) * ${k};\ncout << base[${j}];\ndelete[] base;`,
        (j + 1) * k, [j * k, (j + 2) * k, k], `Indexar con base y avanzar un cursor son dos formas de usar el mismo bloque: base[${j}] = (${j} + 1) × ${k} = ${(j + 1) * k}.`);
    },
    function () {
      const c = rnd(3, 6), k = pick([2, 3, 5]);
      return S("¿Qué imprime?", `int count = ${c};\nint* base = new int[count];\nint* cursor = base;\nfor (int i = 0; i < count; ++i)\n  *cursor++ = (i + 1) * ${k};\ncout << *(cursor - 1);\ndelete[] base;`,
        c * k, [(c - 1) * k, k, "Uso inválido"], `cursor quedó una posición después del último; \`*(cursor - 1)\` es el último elemento: ${c} × ${k} = ${c * k}.`);
    },
    function () {
      return S("¿Con qué puntero se libera el bloque?", "int count = 3;\nint* base = new int[count];\nint* cursor = base;\nfor (int i = 0; i < count; ++i)\n  *cursor++ = (i + 1) * 2;\n// delete[] ???",
        "base", ["cursor", "cursor - 1", "base + count"], "Hay que conservar el puntero inicial para delete[]: el cursor terminó después del último elemento.");
    },
    function () {
      return S("Con `new` habitual, si la asignación falla…", "try {\n  int* bobby = new int[5];\n  bobby[0] = 10;\n} catch (const std::bad_alloc&) {\n  // ...\n}",
        "Salta al catch", ["Sigue con bobby nulo", "bobby[0] vale 0", "No compila"], "El new habitual lanza std::bad_alloc: no llega a la siguiente instrucción normal y la ejecución salta al manejador.");
    },
    function () {
      return S("Con `nothrow`, ¿qué hay que hacer antes de usar el bloque?", "int* bobby = new (std::nothrow) int[5];",
        "Ver que no sea nulo", ["Nada", "Atrapar bad_alloc", "Llenarlo con 0"], "Con nothrow la ejecución continúa aunque falle, y el puntero puede ser nulo: hay que comprobarlo explícitamente.");
    },
    function () {
      const n = pick(["abc", "-4", "0"]);
      return S("¿Qué imprime?", `// entrada: ${n}\nint count;\nif (!(cin >> count) || count <= 0) {\n  cout << "error";\n  return 1;\n}\nint* values = new (std::nothrow) int[count];\nif (values == nullptr) return 1;\ncout << "ok";\ndelete[] values;`,
        "error", ["ok", "Nada", "0"], n === "abc" ? "La lectura falla (no es un número), y eso se detecta antes de asignar memoria." : `${n} no es una cantidad positiva: se rechaza antes de asignar memoria.`);
    },
    function () {
      return S("¿nothrow valida la cantidad que ingresó el usuario?", "int* values = new (std::nothrow) int[count];",
        "No, se valida aparte", ["Sí, rechaza negativos", "Sí, devuelve nulo", "Solo si es 0"], "nothrow solo cambia cómo se informa un fallo de asignación. La cantidad (entrada fallida o no positiva) se valida aparte.");
    },
    function () {
      const c = rnd(3, 7), s = (c * (c + 1)) / 2;
      return S("¿Qué imprime?", `int count = ${c};\nint* values = new int[count];\nfor (int i = 0; i < count; ++i)\n  values[i] = i + 1;\nint total = 0;\nfor (int i = 0; i < count; ++i)\n  total += values[i];\ncout << total;\ndelete[] values;`,
        s, [s - c, c, s + c], `Se escriben todos los elementos (1 a ${c}) antes de leerlos: suma ${s}.`);
    },
    function () {
      const c = rnd(3, 7);
      return S("¿Qué imprime?", `int count = ${c};\nint* values = new int[count]();\nint s = 0;\nfor (int i = 0; i < count; ++i)\n  s += values[i];\ncout << s;\ndelete[] values;`,
        0, [c, "Basura", c * (c - 1) / 2], "Con `()` los enteros parten en cero, así que la suma es 0.");
    },
    function () {
      return S("¿Qué marca `cursor` al terminar el ciclo?", "int* base = new int[3];\nint* cursor = base;\nfor (int i = 0; i < 3; ++i)\n  *cursor++ = (i + 1) * 2;",
        "Una después del último", ["El último elemento", "El inicio del bloque", "Nulo"], "Cada vuelta escribe y avanza: tras 3 vueltas queda en base + 3, que no se desreferencia ni se libera.");
    },
    function () {
      return S("Si `cin >> p[n]` falla después de asignar, antes de salir hay que…", "int* p = new (std::nothrow) int[count];\n// ...\nif (!(cin >> p[n])) { /* ??? */ return 1; }",
        "delete[] p;", ["Nada", "p = nullptr;", "delete p;"], "El bloque ya existe: hay que liberarlo antes de salir, si no queda una fuga.");
    },
    function () {
      const c = rnd(2, 3), v = arr(c, 1, 40);
      return S("¿Qué imprime?", `// entrada: ${c} ${v.join(" ")}\n` + DYN_PROG("for (int n = 0; n < count; ++n) cout << p[n] * 2 << \" \";"),
        v.map(x => 2 * x).join(" "), [v.join(" "), v.map(x => x + 2).join(" "), "Nada"], "Lee los números y los imprime al doble.");
    },
    function () {
      const v = arr(2, 1, 50);
      return S("¿Qué imprime?", `// entrada: 2 ${v.join(" ")}\n` + DYN_PROG("cout << p[0] + p[1];"),
        v[0] + v[1], [2 + v[0], v[0], "Nada"], `count = 2 y se leen ${v[0]} y ${v[1]}: la suma es ${v[0] + v[1]}.`);
    },
    function () {
      return S("¿Quién decide la cantidad en `new int[count]` de este programa?", "int count;\ncin >> count;\nint* p = new (std::nothrow) int[count];",
        "El usuario al ejecutar", ["El compilador", "sizeof(p)", "El preprocesador"], "La cantidad la ingresa el usuario durante la ejecución, en lugar de ser una constante de compilación.");
    },
    function () {
      return S("¿Se puede recuperar `count` con `sizeof(p)`?", "int* p = new (std::nothrow) int[count];",
        "No, se guarda aparte", ["Sí, sizeof(p) / 4", "Sí, sizeof(p)", "Solo con delete[]"], "sizeof(p) mide el puntero. El puntero devuelto no indica cuántos elementos se asignaron: la cantidad controla los ciclos y se guarda aparte.");
    },
    function () {
      return S("¿Qué problema tiene este código?", "int* p = new int[3];\np = new int[5];\ndelete[] p;",
        "Fuga de memoria", ["Doble liberación", "Lee fuera del bloque", "Puntero nulo"], "Es una fuga: si se pierde el último puntero utilizable antes de liberar el bloque, este queda inaccesible.");
    },
    function () {
      return S("Tras `delete owner; owner = nullptr;`, ¿qué pasa con `alias`?", "int* owner = new int(25);\nint* alias = owner;\ndelete owner;\nowner = nullptr;",
        "Queda colgante", ["También queda nulo", "Sigue valiendo 25", "Se libera de nuevo"], "Asignar nulo a un puntero no actualiza sus alias: alias guarda una dirección residual (colgante).");
    }
  ];

  /* ===================================================================
     BLOQUE 5 · FUNCIONES DE ANSI C Y EL BONO (PPT §6 y §7)
     =================================================================== */

  /* ---------- m14 · ¿Con qué se libera? (clasificador) ---------- */
  const FAM_BINS = ["delete", "delete[]", "free"];
  const FAM_LABELS = { delete: "delete", "delete[]": "delete[]", free: "free" };
  const M_FAM_ITEMS = [
    { code: "int* value = new int;", bin: "delete", explain: "new T (un objeto) se libera con delete." },
    { code: "int* zero = new int(0);", bin: "delete", explain: "Sigue siendo un solo objeto (inicializado en 0): delete." },
    { code: "double* d = new double(2.5);", bin: "delete", explain: "Un double creado con new: delete." },
    { code: "char* c = new char('a');", bin: "delete", explain: "Un char creado con new, con su valor entre paréntesis: delete." },
    { code: "int* p = new (std::nothrow) int;", bin: "delete", explain: "nothrow solo cambia cómo se informa el fallo; la forma es escalar: delete." },
    { code: "float* f = new float;", bin: "delete", explain: "new T escalar: delete." },
    { code: "int* one = new int(5);", bin: "delete", explain: "Es la tabla del PPT: `new int(5)` → `delete one;`." },
    { code: "int* bobby = new int[5];", bin: "delete[]", explain: "new T[n] se libera con delete[]." },
    { code: "int* values = new int[count];", bin: "delete[]", explain: "Arreglo dinámico de tamaño decidido en ejecución: delete[]." },
    { code: "int* values = new int[count]();", bin: "delete[]", explain: "Los `()` solo inicializan en cero; sigue siendo un arreglo: delete[]." },
    { code: "int* bobby = new (std::nothrow) int[5];", bin: "delete[]", explain: "new (nothrow) T[n] se libera con delete[] (tabla resumen del PPT)." },
    { code: "double* cashFlows = new (std::nothrow) double[couponCount];", bin: "delete[]", explain: "Es el arreglo del bono: al final `delete[] cashFlows;`." },
    { code: "char* buffer = new char[10];", bin: "delete[]", explain: "Un arreglo de chars con new[]: delete[]." },
    { code: "int* single = new int[1];", bin: "delete[]", explain: "Aunque tenga un solo elemento, se asignó con la forma de arreglo: delete[]." },
    { code: "double* rates = new double[n];", bin: "delete[]", explain: "new double[n]: delete[]." },
    { code: "int* a = static_cast<int*>(std::malloc(n * sizeof(int)));", bin: "free", explain: "malloc es de la familia de C: se libera con free." },
    { code: "int* b = static_cast<int*>(std::calloc(n, sizeof(int)));", bin: "free", explain: "calloc también es de C: free." },
    { code: "int* resized = static_cast<int*>(std::realloc(p, 4 * sizeof(int)));", bin: "free", explain: "Lo que entrega realloc se libera con free." },
    { code: "double* d = static_cast<double*>(std::malloc(2 * sizeof(double)));", bin: "free", explain: "malloc: free, sin importar el tipo." },
    { code: "char* s = static_cast<char*>(std::calloc(3, sizeof(char)));", bin: "free", explain: "calloc: free." },
    { code: "int* one = static_cast<int*>(std::malloc(sizeof(int)));", bin: "free", explain: "Aunque sea un solo int, viene de malloc: free (nunca delete)." },
    { code: "double* x = static_cast<double*>(std::calloc(1, sizeof(double)));", bin: "free", explain: "calloc de un elemento: free." },
    { code: "int* p = static_cast<int*>(std::malloc(count * sizeof(int)));", bin: "free", explain: "Nunca se mezclan familias: lo de malloc va con free." }
  ];

  /* ---------- m15 · malloc, calloc y realloc (disparos) ---------- */
  const M_C_GENS = [
    function () {
      const n = rnd(2, 9);
      return S("Si `int` ocupa 4 bytes, ¿cuántos bytes pide este malloc?", `const int n = ${n};\nint* a = static_cast<int*>(std::malloc(n * sizeof(int)));`,
        4 * n, [n, 4, 8 * n], `malloc recibe una cantidad de bytes: ${n} × 4 = ${4 * n}.`);
    },
    function () {
      const n = rnd(2, 9);
      return S("Si `double` ocupa 8 bytes, ¿cuántos bytes reserva en total este calloc?", `const int n = ${n};\ndouble* b = static_cast<double*>(std::calloc(n, sizeof(double)));`,
        8 * n, [n, 8, 4 * n], `calloc recibe la cantidad y el tamaño de cada elemento: ${n} × 8 = ${8 * n} bytes.`);
    },
    function () {
      const n = rnd(3, 8), k = rnd(0, n - 1);
      return S("¿Qué imprime?", `const int n = ${n};\nint* b = static_cast<int*>(std::calloc(n, sizeof(int)));\ncout << b[${k}];\nstd::free(b);`,
        0, ["Basura", k, n], "calloc llena de ceros los bytes asignados.");
    },
    function () {
      const n = rnd(3, 8), k = rnd(0, n - 1);
      return S("¿Qué imprime?", `const int n = ${n};\nint* a = static_cast<int*>(std::malloc(n * sizeof(int)));\nfor (int i = 0; i < n; ++i) a[i] = i + 1;\ncout << a[${k}];\nstd::free(a);`,
        k + 1, [k, 0, k + 2], `malloc no inicializa, por eso el ciclo escribe 1, 2, …, ${n}. a[${k}] = ${k + 1}.`);
    },
    function () {
      const [x, y, z, w] = arr(4, 10, 99), j = rnd(0, 1);
      return S(`¿Qué imprime?`, `int* p = static_cast<int*>(std::malloc(2 * sizeof(int)));\np[0] = ${x}; p[1] = ${y};\nint* resized = static_cast<int*>(std::realloc(p, 4 * sizeof(int)));\nif (resized == nullptr) { std::free(p); return 1; }\np = resized;\np[2] = ${z}; p[3] = ${w};\ncout << p[${j}];\nstd::free(p);`,
        [x, y][j], [0, [z, w][j], "Basura"], `Si tiene éxito, realloc conserva el contenido anterior: p[${j}] sigue en ${[x, y][j]}.`);
    },
    function () {
      const v = arr(4, 10, 99);
      return S("¿Qué imprime?", `int* p = static_cast<int*>(std::malloc(4 * sizeof(int)));\np[0] = ${v[0]}; p[1] = ${v[1]}; p[2] = ${v[2]}; p[3] = ${v[3]};\nint* smaller = static_cast<int*>(std::realloc(p, 2 * sizeof(int)));\nif (smaller == nullptr) { std::free(p); return 1; }\np = smaller;\ncout << p[0] + p[1];\nstd::free(p);`,
        v[0] + v[1], [v[2] + v[3], 0, v[0]], `realloc conserva el contenido hasta el menor de los tamaños: los 2 primeros (${v[0]} y ${v[1]}).`);
    },
    function () {
      return S("Si `realloc` falla, el bloque original…", "int* resized = static_cast<int*>(std::realloc(p, 4 * sizeof(int)));\nif (resized == nullptr) { /* ? */ }",
        "Sigue existiendo", ["Se libera solo", "Queda en ceros", "Se pierde siempre"], "Si falla, realloc devuelve nulo y conserva el bloque: hay que liberarlo (o seguir usándolo).");
    },
    function () {
      return S("¿Por qué se usa un puntero temporal con `realloc`?", "int* resized = static_cast<int*>(std::realloc(p, 4 * sizeof(int)));\nif (resized == nullptr) { std::free(p); return 1; }\np = resized;",
        "No perder p si falla", ["Es obligatorio", "Para que compile", "Para llenar con ceros"], "Si se escribiera `p = realloc(p, …)` y fallara, p quedaría nulo y se perdería la dirección del bloque original (fuga).");
    },
    function () {
      return S("`malloc` deja el bloque…", "int* a = static_cast<int*>(std::malloc(3 * sizeof(int)));",
        "Sin inicializar", ["Lleno de ceros", "Con unos", "Con nullptr"], "malloc recibe bytes y deja el almacenamiento sin inicializar. calloc es el que llena de ceros.");
    },
    function () {
      return S("`calloc` deja el bloque…", "int* b = static_cast<int*>(std::calloc(3, sizeof(int)));",
        "Lleno de ceros", ["Sin inicializar", "Con unos", "Con nullptr"], "calloc llena de ceros los bytes asignados.");
    },
    function () {
      return S("¿Qué hace `free(nullptr)`?", "int* p = nullptr;\nstd::free(p);",
        "Nada", ["Error en ejecución", "No compila", "Libera todo"], "free(nullptr) no tiene efecto, como delete de un puntero nulo.");
    },
    function () {
      return S("¿Cómo informa `malloc` que falló?", "int* a = static_cast<int*>(std::malloc(n * sizeof(int)));",
        "Devuelve nulo", ["Lanza bad_alloc", "Devuelve 0 bytes", "Termina el programa"], "malloc, calloc y realloc indican el fallo mediante un puntero nulo.");
    },
    function () {
      return S("¿Qué tipo devuelve `malloc`?", "std::malloc(8)",
        "void*", ["int*", "char", "Un objeto"], "Las funciones de C gestionan almacenamiento bruto y devuelven void*. Por eso hay que convertir con `static_cast<int*>(…)`.");
    },
    function () {
      return S("¿Qué pasa con este código?", "int* p = std::malloc(2 * sizeof(int));",
        "No compila", ["Compila", "p queda nulo", "Lanza bad_alloc"], "malloc devuelve void*, y en C++ no se convierte solo a int*: hace falta `static_cast<int*>(…)`.");
    },
    function () {
      return S("¿Cómo está este código?", "int* p = new int[3];\nstd::free(p);",
        "Mezcla familias", ["Correcto", "Fuga", "No compila"], "Lo de new[] se libera con delete[]. Nunca se mezclan las familias de C y C++.");
    },
    function () {
      return S("¿Cómo está este código?", "int* p = static_cast<int*>(std::malloc(sizeof(int)));\ndelete p;",
        "Mezcla familias", ["Correcto", "Fuga", "No compila"], "Lo de malloc se libera con free, nunca con delete.");
    },
    function () {
      return S("`calloc(n, size)` recibe…", "std::calloc(n, sizeof(int))",
        "Cantidad y tamaño", ["Solo bytes", "Un tipo", "Puntero y bytes"], "calloc recibe cuántos elementos y cuántos bytes ocupa cada uno. malloc recibe solo bytes.");
    },
    function () {
      return S("En `realloc(p, bytes)`, `bytes` es…", "std::realloc(p, 4 * sizeof(int))",
        "El nuevo total de bytes", ["Los bytes que se agregan", "La cantidad de elementos", "Los bytes que se quitan"], "realloc recibe el nuevo tamaño total del bloque, no lo que se agrega.");
    },
    function () {
      return S("¿Qué solicitud informa su fallo con `bad_alloc`?", "",
        "new T[n]", ["new (nothrow) T[n]", "malloc(bytes)", "calloc(n, size)"], "Solo el new habitual lanza bad_alloc. nothrow, malloc, calloc y realloc devuelven nulo.");
    },
    function () {
      return S("Tras crecer con `realloc`, ¿cuánto vale `p[3]` sin asignarlo?", "p[0] = 10; p[1] = 20;\nint* resized = static_cast<int*>(std::realloc(p, 4 * sizeof(int)));\np = resized;\n// p[2] y p[3] aún no se asignan",
        "Indeterminado", ["0", "20", "40"], "realloc conserva lo anterior, pero los elementos agregados no se inicializan: hay que asignarlos (p[2] = 30; p[3] = 40;).");
    },
    function () {
      const k = rnd(3, 8);
      return S("Si `int` ocupa 4 bytes, ¿cuántos int caben en el bloque nuevo?", `int* resized = static_cast<int*>(std::realloc(p, ${k} * sizeof(int)));`,
        k, [4 * k, k + 2, 4], `Se pidieron ${k} × sizeof(int) bytes: caben ${k} int.`);
    },
    function () {
      const n = rnd(3, 7), s = (n * (n - 1)) / 2;
      return S("¿Qué imprime?", `const int n = ${n};\nint* b = static_cast<int*>(std::calloc(n, sizeof(int)));\nint total = 0;\nfor (int i = 0; i < n; ++i) { b[i] += i; total += b[i]; }\ncout << total;\nstd::free(b);`,
        s, [s + n, "Basura", n], `Como calloc parte en ceros, b[i] queda en i. Suma 0 + 1 + … + ${n - 1} = ${s}.`);
    }
  ];

  /* ---------- m16 · Valorizar un bono (carrera) ---------- */
  function bond() {
    const nominal = pick([100, 100, 1000, 500]);
    const rate = pick([0.04, 0.05, 0.06, 0.08]);
    let yld = pick([0.04, 0.06, 0.08, 0.1]);
    const count = rnd(2, 5);
    const coupon = nominal * rate * 0.5;
    const flows = Array.from({ length: count }, (_, i) => coupon + (i === count - 1 ? nominal : 0));
    const pv = flows.map((f, i) => f / Math.pow(1 + yld / 2, i + 1));
    const value = pv.reduce((a, b) => a + b, 0);
    return { nominal, rate, yld, count, coupon, flows, pv, value };
  }
  const pct = x => `${+(x * 100).toFixed(2)}`;
  const BOND_SETUP = b => `const double nominal = ${b.nominal}.0, annualCouponRate = ${b.rate};\nconst double yearFraction = 180.0 / 360.0;\nconst double coupon = nominal * annualCouponRate * yearFraction;\nint couponCount = ${b.count};\ndouble* cashFlows = new (std::nothrow) double[couponCount];\nif (cashFlows == 0) return 1;\nfor (int i = 0; i < couponCount; ++i) {\n  cashFlows[i] = coupon;\n  if (i == couponCount - 1) cashFlows[i] += nominal;\n}`;
  const M_BOND_GENS = [
    function () {
      const b = bond();
      return R("¿Cuánto vale `coupon`?", `const double nominal = ${b.nominal}.0, annualCouponRate = ${b.rate};\nconst double yearFraction = 180.0 / 360.0;\nconst double coupon = nominal * annualCouponRate * yearFraction;`,
        cout6(b.coupon), [cout6(b.coupon * 2), cout6(b.nominal * b.rate * 0.25)], `${b.nominal} × ${b.rate} × 0.5 = ${cout6(b.coupon)}. El 0.5 es 180/360: el cupón se paga cada 6 meses.`);
    },
    function () {
      const b = bond();
      return R(`¿Cuánto vale \`cashFlows[${b.count - 1}]\`?`, BOND_SETUP(b),
        cout6(b.coupon + b.nominal), [cout6(b.coupon), cout6(b.nominal)], `El último elemento recibe intereses más principal: ${cout6(b.coupon)} + ${b.nominal} = ${cout6(b.coupon + b.nominal)}.`);
    },
    function () {
      const b = bond();
      return R("¿Cuánto vale `cashFlows[0]`?", BOND_SETUP(b),
        cout6(b.coupon), [cout6(b.coupon + b.nominal), "Basura"], `Todos los elementos menos el último reciben solo el cupón: ${cout6(b.coupon)}.`);
    },
    function () {
      const b = bond();
      return R("¿Cuál es el último índice válido de `cashFlows`?", BOND_SETUP(b),
        b.count - 1, [b.count, b.count + 1], `Los índices válidos van de 0 a couponCount − 1 = ${b.count - 1}.`);
    },
    function () {
      const y = pick([0.04, 0.05, 0.06, 0.08, 0.1]);
      return R("¿Cuánto vale `perPeriod`?", `const double annualYield = ${y};\nconst double perPeriod = annualYield / 2.0;`,
        cout6(y / 2), [cout6(y), cout6(y * 2)], `Rendimiento nominal anual con capitalización semestral: ${pct(y)} % / 2 = ${pct(y / 2)} % por período.`);
    },
    function () {
      const b = bond();
      return R("¿Qué imprime?", BOND_SETUP(b) + `\nconst double annualYield = ${b.yld};\ndouble value = 0.0;\nfor (int i = 0; i < couponCount; ++i)\n  value += cashFlows[i] / std::pow(1.0 + annualYield / 2.0, i + 1);\ncout << value;\ndelete[] cashFlows;`,
        cout6(b.value), [cout6(b.flows.reduce((x, y) => x + y, 0)), cout6(b.flows.reduce((x, f, i) => x + f / Math.pow(1 + b.yld, i + 1), 0))], `Se descuenta cada flujo al ${pct(b.yld / 2)} % por período: la suma de valores presentes es ${cout6(b.value)}.`);
    },
    function () {
      const b = bond();
      return R("¿Qué imprime?", BOND_SETUP(b) + `\nconst double annualYield = ${b.yld};\ncout << cashFlows[0] / std::pow(1.0 + annualYield / 2.0, 1);\ndelete[] cashFlows;`,
        cout6(b.pv[0]), [cout6(b.coupon), cout6(b.coupon / (1 + b.yld))], `El primer flujo (${cout6(b.coupon)}) se descuenta un período: ${cout6(b.coupon)} / ${cout6(1 + b.yld / 2)} = ${cout6(b.pv[0])}.`);
    },
    function () {
      const b = bond(), s = b.flows.reduce((x, y) => x + y, 0);
      return R("¿Qué imprime?", BOND_SETUP(b) + `\ndouble total = 0.0;\nfor (int i = 0; i < couponCount; ++i) total += cashFlows[i];\ncout << total;\ndelete[] cashFlows;`,
        cout6(s), [cout6(s - b.nominal), cout6(b.nominal)], `${b.count} cupones de ${cout6(b.coupon)} más el nominal ${b.nominal}: ${cout6(s)} (sin descontar).`);
    },
    function () {
      const nominal = pick([100, 1000]), rate = pick([0.04, 0.05, 0.06]), count = rnd(2, 4), coupon = nominal * rate * 0.5;
      const flows = Array.from({ length: count }, (_, i) => cout6(coupon + (i === count - 1 ? nominal : 0)));
      return R(`Con entrada ${count}, ¿qué contiene \`cashFlows\`?`, `// nominal ${nominal}, cupón anual ${pct(rate)} %, pagos cada 6 meses\nfor (int i = 0; i < couponCount; ++i) {\n  cashFlows[i] = coupon;\n  if (i == couponCount - 1) cashFlows[i] += nominal;\n}`,
        flows.join(", "), [Array(count).fill(cout6(coupon)).join(", "), flows.slice(0, -1).concat([cout6(nominal)]).join(", ")], `Cada período paga ${cout6(coupon)} y el último devuelve además el nominal: ${flows.join(", ")}.`);
    },
    function () {
      return R("¿Cómo se libera `cashFlows` al final?", "double* cashFlows = new (std::nothrow) double[couponCount];",
        "delete[] cashFlows;", ["delete cashFlows;", "free(cashFlows);"], "new[] se corresponde con delete[] después del último uso (nothrow no cambia eso).");
    },
    function () {
      const n = pick([0, -4, 1500, 2000]);
      return R("¿Qué imprime?", `// entrada: ${n}\nint couponCount = 0;\nif (!(cin >> couponCount) || couponCount <= 0 || couponCount > 1000) return 1;\ncout << "ok";`,
        "Nada", ["ok", n], n > 0 ? `${n} supera el límite de 1000 del programa: termina antes de asignar memoria.` : `${n} no es una cantidad positiva: termina antes de asignar memoria.`);
    },
    function () {
      return R("El elemento `cashFlows[i]` corresponde al período…", "value += cashFlows[i] / std::pow(1.0 + annualYield / 2.0, i + 1);",
        "i + 1", ["i", "i - 1"], "Los índices parten en 0, pero los pagos en el período 1: por eso el exponente es i + 1.");
    },
    function () {
      const n = rnd(2, 8);
      return R("Si `double` ocupa 8 bytes, ¿cuántos bytes ocupa el bloque?", `// entrada: ${n}\ndouble* cashFlows = new (std::nothrow) double[couponCount];`,
        8 * n, [n, 8], `${n} doubles × 8 bytes = ${8 * n}.`);
    },
    function () {
      const nominal = pick([100, 1000]), rate = pick([0.04, 0.06, 0.08]), coupon = nominal * rate * 0.25;
      return R("¿Cuánto vale `coupon` con pagos trimestrales?", `const double nominal = ${nominal}.0, annualCouponRate = ${rate};\nconst double yearFraction = 90.0 / 360.0;\nconst double coupon = nominal * annualCouponRate * yearFraction;`,
        cout6(coupon), [cout6(coupon * 2), cout6(nominal * rate)], `yearFraction = 90/360 = 0.25: ${nominal} × ${rate} × 0.25 = ${cout6(coupon)}.`);
    },
    function () {
      const y = pick([0.04, 0.06, 0.08]), k = rnd(2, 4);
      return R("¿Qué imprime?", `const double annualYield = ${y};\ncout << std::pow(1.0 + annualYield / 2.0, ${k});`,
        cout6(Math.pow(1 + y / 2, k)), [cout6(Math.pow(1 + y, k)), cout6(1 + (y / 2) * k)], `std::pow (de <cmath>) calcula la potencia: ${cout6(1 + y / 2)}^${k} = ${cout6(Math.pow(1 + y / 2, k))}.`);
    },
    function () {
      return R("¿Qué indica `cashFlows == 0` después del new?", "double* cashFlows = new (std::nothrow) double[couponCount];\nif (cashFlows == 0) return 1;",
        "Falló la asignación", ["El arreglo está vacío", "El cupón es 0"], "Con nothrow, un puntero nulo (0) indica que no se obtuvo el bloque.");
    },
    function () {
      const r = pick([0.04, 0.05, 0.06, 0.08]), b = { nominal: 100, rate: r, yld: r, count: rnd(2, 5) };
      b.coupon = 100 * r * 0.5;
      return R("¿Qué imprime?", BOND_SETUP(b) + `\nconst double annualYield = ${r};\ndouble value = 0.0;\nfor (int i = 0; i < couponCount; ++i)\n  value += cashFlows[i] / std::pow(1.0 + annualYield / 2.0, i + 1);\ncout << value;\ndelete[] cashFlows;`,
        "100", [cout6(100 + b.coupon * b.count), cout6(100 - b.coupon)], "Si la tasa cupón es igual al rendimiento, el bono vale exactamente su nominal (\"a la par\"): 100.");
    },
    function () {
      const r = pick([0.04, 0.05]), y = r + pick([0.01, 0.02]);
      return R(`Cupón anual ${pct(r)} % y rendimiento ${pct(y)} %: ¿el valor queda…?`, "value += cashFlows[i] / std::pow(1.0 + annualYield / 2.0, i + 1);",
        "Bajo el nominal", ["Sobre el nominal", "Igual al nominal"], "Si el rendimiento exigido supera la tasa cupón, se descuenta más de lo que paga el cupón: el bono vale menos que su nominal (como 98.14 en el PPT).");
    },
    function () {
      const y = pick([0.03, 0.04]), r = y + pick([0.01, 0.02]);
      return R(`Cupón anual ${pct(r)} % y rendimiento ${pct(y)} %: ¿el valor queda…?`, "value += cashFlows[i] / std::pow(1.0 + annualYield / 2.0, i + 1);",
        "Sobre el nominal", ["Bajo el nominal", "Igual al nominal"], "Si el cupón paga más que el rendimiento exigido, el bono vale más que su nominal.");
    },
    function () {
      return R("¿Qué logra `cashFlows = 0;` después de `delete[]`?", "delete[] cashFlows;\ncashFlows = 0;",
        "Anula solo ese puntero", ["Anula todos los alias", "Libera el bloque"], "La liberación la hace delete[]. Asignar nulo a este puntero no corrige otros alias que guarden la misma dirección.");
    },
    function () {
      const b = bond();
      return R(`¿Qué imprime?`, BOND_SETUP(b) + `\nconst double annualYield = ${b.yld};\ncout << cashFlows[couponCount - 1] / std::pow(1.0 + annualYield / 2.0, couponCount);\ndelete[] cashFlows;`,
        cout6(b.pv[b.count - 1]), [cout6(b.flows[b.count - 1]), cout6(b.flows[b.count - 1] / Math.pow(1 + b.yld / 2, b.count - 1))], `El último flujo (${cout6(b.flows[b.count - 1])}) se descuenta ${b.count} períodos: ${cout6(b.pv[b.count - 1])}.`);
    },
    function () {
      const b = bond();
      return R("¿Cuánto suman solo los cupones?", BOND_SETUP(b),
        cout6(b.coupon * b.count), [cout6(b.coupon * b.count + b.nominal), cout6(b.coupon)], `${b.count} pagos de ${cout6(b.coupon)}: ${cout6(b.coupon * b.count)} (el nominal se suma aparte en el último).`);
    }
  ];

  /* ===================================================================
     NIVELES DE LA SECCIÓN
     =================================================================== */
  Object.entries({ M_ADDR_GENS, M_DECL_ITEMS, M_TRACE_GENS, M_ARR_GENS, M_STEP_GENS, M_PREC_GENS, M_STR_ITEMS,
    M_PP_GENS, M_VOID_GENS, M_FN_GENS, M_NEW_GENS, M_FREE_ITEMS, M_DYN_GENS, M_FAM_ITEMS, M_C_GENS, M_BOND_GENS })
    .forEach(([k, a]) => { a.key = k; });

  const NAMES = {
    ok: "Correcto", nocomp: "No compila", invalido: "Inválido", fuga: "Fuga",
    compila: "Compila", "no compila": "No compila", delete: "delete", "delete[]": "delete[]", free: "free"
  };
  function sorterQuiz(items, bins, n, ask) {
    return freshIdx(items.key, items.length, n).map(k => {
      const it = items[k];
      const options = bins.map(b => NAMES[b] || b);
      const correct = NAMES[it.bin] || it.bin;
      return { ask: it.ask || ask, code: it.code, options, answer: options.indexOf(correct), correctText: correct, explain: it.explain };
    });
  }
  function runner(gens) { return { engine: "runner", controls: RUN, build() { return { questions: fromGens(gens, 10) }; }, quiz: n => fromGens(gens, n) }; }
  function shooter(gens) { return { engine: "shooter", controls: SHOOT, build() { return { questions: fromGens(gens, 10), hazards: true }; }, quiz: n => fromGens(gens, n) }; }
  function sorter(items, bins, ask, labels) {
    return {
      engine: "sorter", controls: SORT,
      build() { return { phases: [{ bins, labels, items: cases(items, Math.min(10, items.length), ask) }] }; },
      quiz: n => sorterQuiz(items, bins, n, ask)
    };
  }
  const L = (o, kind) => Object.assign({ section: "memoria" }, o, kind);

  const MEMORY = [
    // Bloque 1 · Direcciones y punteros
    L({ id: "m01-direcciones", world: 11, addr: "0x1100", title: "Valor y dirección", topic: "§1 Valores y direcciones",
      desc: "&, *, copiar un valor o guardar su dirección (andy, fred y ted).",
      intro: "El programa corre hacia ti. Ponte en el carril con el valor correcto: ¿es una copia, una dirección o el valor apuntado?" },
      runner(M_ADDR_GENS)),
    L({ id: "m02-declarar", world: 11, addr: "0x1110", title: "Declarar e inicializar", topic: "§1 Declaración e inicialización",
      desc: "Un * por declarador, tipos que calzan y punteros sin dirección válida.",
      intro: "Mándalo a <code>CORRECTO</code>, <code>NO COMPILA</code> o <code>USO INVÁLIDO</code> (compila, pero desreferencia algo que no es un objeto)." },
      sorter(M_DECL_ITEMS, DECL_BINS, "¿Cómo está este código?", DECL_LABELS)),
    L({ id: "m03-seguimiento", world: 11, addr: "0x1120", title: "Seguir punteros", topic: "§1 Seguimiento de ejemplos",
      desc: "firstvalue y secondvalue: reasignar punteros, copiar enteros y alias.",
      intro: "Sigue cada línea como en la tabla del PPT y dispara a lo que queda. Fíjate si se copia un entero o una dirección." },
      shooter(M_TRACE_GENS)),
    { id: "jefe-m1", section: "memoria", world: 11, addr: "0xBEEF", engine: "shooter", boss: true, controls: SHOOT,
      title: "Jefe: Wild Pointer", topic: "Jefe del bloque 1", desc: "Mezcla de los niveles 1 a 3.",
      intro: "Un puntero sin inicializar apunta a cualquier parte. Responde lo de los niveles 1 a 3 y esquiva sus disparos.",
      bossOf: ["m01-direcciones", "m02-declarar", "m03-seguimiento"], boss2: { label: "int* p;", color: "amber", pattern: "aimed", speed: 1 } },
    // Bloque 2 · Arreglos y aritmética
    L({ id: "m04-arreglos", world: 12, addr: "0x1200", title: "Arreglos y punteros", topic: "§2 Arreglos y punteros",
      desc: "El arreglo da la dirección de su primer elemento, a[k] == *(a + k) y sizeof.",
      intro: "Ponte en el carril con el valor correcto. Recuerda: calcular <code>p + k</code> no mueve <code>p</code>." },
      runner(M_ARR_GENS)),
    L({ id: "m05-aritmetica", world: 12, addr: "0x1210", title: "Aritmética según el tipo", topic: "§2 Aritmética según el tipo",
      desc: "Sumar uno avanza un elemento, distancias entre punteros y la posición final.",
      intro: "Dispara a la dirección o distancia correcta. El paso depende del tipo apuntado." },
      shooter(M_STEP_GENS)),
    L({ id: "m06-precedencia", world: 12, addr: "0x1220", title: "*p++ o (*p)++", topic: "§2 Precedencia",
      desc: "¿Se mueve el puntero o cambia el valor? Copiar con *p++ = *q++.",
      intro: "Sigue cada <code>++</code>: el posfijo va antes que el <code>*</code>. Ponte en el carril con el resultado." },
      runner(M_PREC_GENS)),
    L({ id: "m07-cadenas", world: 12, addr: "0x1230", title: "Cadenas y const", topic: "§2 Secuencias de caracteres",
      desc: "const char*, char* const y arreglos que no se reasignan.",
      intro: "Mándalo a <code>COMPILA</code> o <code>NO COMPILA</code>. Piensa qué protege cada <code>const</code>." },
      sorter(M_STR_ITEMS, ["compila", "no compila"], "¿Este código compila?")),
    { id: "jefe-m2", section: "memoria", world: 12, addr: "0xB0FF", engine: "shooter", boss: true, controls: SHOOT,
      title: "Jefe: Buffer Overflow", topic: "Jefe del bloque 2", desc: "Mezcla de los niveles 4 a 7.",
      intro: "Escribió una posición más allá del final y ahora todo se desborda. Responde lo de los niveles 4 a 7.",
      bossOf: ["m04-arreglos", "m05-aritmetica", "m06-precedencia", "m07-cadenas"], boss2: { label: "a[n]", color: "cyan", pattern: "spread", speed: 1.1 } },
    // Bloque 3 · Punteros especiales
    L({ id: "m08-doble", world: 13, addr: "0x1300", title: "Puntero a puntero", topic: "§3 Punteros a punteros",
      desc: "char** c = &b: qué es c, *c y **c, y qué modifica cada uno.",
      intro: "Cada asterisco agrega un nivel. Sigue la cadena un enlace a la vez y ponte en el carril correcto." },
      runner(M_PP_GENS)),
    L({ id: "m09-void", world: 13, addr: "0x1310", title: "void* y nulos", topic: "§3 Punteros void y nulos",
      desc: "Recuperar el tipo con static_cast, sizeof(*p) vs sizeof(p), nullptr.",
      intro: "Dispara a la respuesta correcta. \"void\" dice que no hay tipo; \"nulo\" dice que no hay objeto." },
      shooter(M_VOID_GENS)),
    L({ id: "m10-funciones", world: 13, addr: "0x1320", title: "Punteros a funciones", topic: "§3 Punteros a funciones",
      desc: "int (*minus)(int, int), operation(7, 5, addition) y firmas que calzan.",
      intro: "Sigue qué función se elige en cada llamada y ponte en el carril con el resultado." },
      runner(M_FN_GENS)),
    { id: "jefe-m3", section: "memoria", world: 13, addr: "0x0000", engine: "shooter", boss: true, controls: SHOOT,
      title: "Jefe: Null Dereference", topic: "Jefe del bloque 3", desc: "Mezcla de los niveles 8 a 10.",
      intro: "Alguien desreferenció un puntero nulo. Responde lo de los niveles 8 a 10 y esquiva la lluvia de nulos.",
      bossOf: ["m08-doble", "m09-void", "m10-funciones"], boss2: { label: "*nullptr", color: "plum", pattern: "rain", speed: 1.15, rainText: "0" } },
    // Bloque 4 · Asignación dinámica y liberación
    L({ id: "m11-new", world: 14, addr: "0x1400", title: "new y new[]", topic: "§4 Asignación dinámica",
      desc: "new int, new int(0), new int[count], valores sin inicializar y fallos.",
      intro: "Ponte en el carril correcto. Ojo: <code>new int[count]</code> no inicializa; <code>new int[count]()</code> deja ceros." },
      runner(M_NEW_GENS)),
    L({ id: "m12-liberar", world: 14, addr: "0x1410", title: "Liberar bien", topic: "§5 Asignación y liberación",
      desc: "delete o delete[], punteros interiores, dobles liberaciones, alias colgantes y fugas.",
      intro: "Mándalo a <code>CORRECTO</code>, <code>FUGA</code> (se pierde un bloque sin liberar) o <code>INVÁLIDO</code> (se libera o usa mal)." },
      sorter(M_FREE_ITEMS, FREE_BINS, "¿Cómo termina la memoria?", FREE_LABELS)),
    L({ id: "m13-programa", world: 14, addr: "0x1420", title: "Programa dinámico", topic: "§4–5 Entrada y vida útil",
      desc: "Validar la cantidad, nothrow, leer e imprimir, y recorrer con un cursor.",
      intro: "Cada caso trae su entrada. Dispara a lo que imprime o a la regla correcta." },
      shooter(M_DYN_GENS)),
    { id: "jefe-m4", section: "memoria", world: 14, addr: "0xDF00", engine: "shooter", boss: true, controls: SHOOT,
      title: "Jefe: Double Free", topic: "Jefe del bloque 4", desc: "Mezcla de los niveles 11 a 13.",
      intro: "Liberó el mismo bloque dos veces y quedó en dos lugares a la vez. Responde lo de los niveles 11 a 13.",
      bossOf: ["m11-new", "m12-liberar", "m13-programa"], boss2: { label: "delete×2", color: "cyan", pattern: "spread", speed: 1.2 } },
    // Bloque 5 · Funciones de ANSI C y el bono
    L({ id: "m14-familias", world: 15, addr: "0x1500", title: "¿Con qué se libera?", topic: "§6 Familias de asignación",
      desc: "new con delete, new[] con delete[] y malloc/calloc/realloc con free.",
      intro: "Cada asignación cae hacia tres zonas. Mándala a la liberación que le corresponde: nunca se mezclan familias." },
      sorter(M_FAM_ITEMS, FAM_BINS, "¿Con qué se libera?", FAM_LABELS)),
    L({ id: "m15-ansi-c", world: 15, addr: "0x1510", title: "malloc, calloc y realloc", topic: "§6 Funciones de memoria de C",
      desc: "Bytes vs elementos, ceros, redimensionar sin perder el bloque y free.",
      intro: "Dispara a la respuesta correcta. malloc pide bytes, calloc llena de ceros y realloc puede mover el bloque." },
      shooter(M_C_GENS)),
    L({ id: "m16-bono", world: 15, addr: "0x1520", title: "Valorizar un bono", topic: "§7 Ejemplo: valorización de un bono",
      desc: "cashFlows dinámico: cupón, flujos, valor presente y delete[].",
      intro: "El bono bullet del PPT con datos que cambian. Ponte en el carril con el valor que calcula el programa." },
      runner(M_BOND_GENS)),
    { id: "jefe-mf", section: "memoria", world: 15, addr: "0x1EAF", engine: "shooter", boss: true, final: true, controls: SHOOT,
      title: "Jefe final: Memory Leak", topic: "Jefe final de memoria",
      desc: "Toda la sección. Se desbloquea al vencer a los 4 jefes y completar el bloque 5.",
      intro: "Memory Leak gotea bloques que nadie liberó. Ataca con preguntas de los 16 niveles: dispara a la letra correcta y esquiva sus ataques mixtos.",
      bossOf: "all", boss2: { label: "LEAK", color: "bad", pattern: "mixed", speed: 1.25 } }
  ];

  function buildBoss(lv) {
    const src = lv.bossOf === "all" ? MEMORY.filter(l => !l.boss) : MEMORY.filter(l => lv.bossOf.includes(l.id));
    let qs;
    if (lv.bossOf === "all") qs = shuffle(src).slice(0, 12).map(l => l.quiz(1)[0]);
    else {
      const per = Math.floor(10 / src.length);
      qs = src.flatMap(l => l.quiz(per));
      shuffle(src).slice(0, 10 - qs.length).forEach(l => qs.push(l.quiz(1)[0]));
    }
    return { questions: shuffle(qs), boss: lv.boss2 };
  }
  MEMORY.filter(l => l.boss).forEach(l => { l.build = () => buildBoss(l); });

  C.worlds.push(
    { n: 11, name: "Bloque 1 · Direcciones y punteros", desc: "Sección 1 del PPT: valores y direcciones, declaración e inicialización, seguimiento." },
    { n: 12, name: "Bloque 2 · Arreglos y aritmética", desc: "Sección 2: arreglos y punteros, aritmética según el tipo, precedencia y cadenas." },
    { n: 13, name: "Bloque 3 · Punteros especiales", desc: "Sección 3: punteros a punteros, void, nulos y punteros a funciones." },
    { n: 14, name: "Bloque 4 · Asignación y liberación", desc: "Secciones 4 y 5: new y new[], fallos, liberación correcta y fugas." },
    { n: 15, name: "Bloque 5 · Memoria de C y el bono", desc: "Secciones 6 y 7: malloc, calloc, realloc, free y la valorización del bono." }
  );
  MEMORY.forEach(l => C.levels.push(l));
  C.memoryBanks = { M_ADDR_GENS, M_DECL_ITEMS, M_TRACE_GENS, M_ARR_GENS, M_STEP_GENS, M_PREC_GENS, M_STR_ITEMS,
    M_PP_GENS, M_VOID_GENS, M_FN_GENS, M_NEW_GENS, M_FREE_ITEMS, M_DYN_GENS, M_FAM_ITEMS, M_C_GENS, M_BOND_GENS };
})();
