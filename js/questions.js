/* questions.js — contenido de los niveles.
   Las preguntas de punteros y de control de flujo se generan al azar, así nunca se repite la misma partida.
   Convención de texto: lo que va entre `comillas invertidas` se muestra como código. */
(function () {
  "use strict";

  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const hex = n => "0x" + n.toString(16);

  // Arma una pregunta de alternativas: la correcta + distractores distintos entre sí.
  function mkQ(ask, code, correct, distractors, explain, n) {
    n = n || 4;
    const c = String(correct);
    const opts = [c];
    for (const d of distractors) {
      const s = String(d);
      if (opts.length >= n) break;
      if (!opts.includes(s)) opts.push(s);
    }
    let filler = 1;
    while (opts.length < n) {
      const s = String(Number(c) + 10 * filler++);
      if (!opts.includes(s) && s !== "NaN") opts.push(s); else if (s === "NaN") opts.push("?" + filler);
    }
    const shuffled = shuffle(opts);
    return { ask, code, options: shuffled, answer: shuffled.indexOf(c), correctText: c, explain };
  }

  /* =====================================================================
     NIVEL 1 · STACK O HEAP (clasificador)
     ===================================================================== */
  const MEMORY_ITEMS = [
    { label: "x", code: "int x = 5;", ask: "¿Dónde vive `x`?", bin: "stack",
      explain: "Una variable local normal se guarda en el stack y se libera sola al salir del bloque `{ }`." },
    { label: "p", code: "int* p = new int(5);", ask: "¿Dónde vive el puntero `p`?", bin: "stack",
      explain: "`p` es una variable local (guarda una dirección), así que está en el stack. Lo que apunta sí está en el heap." },
    { label: "*p", code: "int* p = new int(5);", ask: "¿Dónde vive el `int` que creó `new` (o sea `*p`)?", bin: "heap",
      explain: "Todo lo que se crea con `new` va al heap y sigue ahí hasta que hagas `delete`." },
    { label: "v[10]", code: "double v[10];", ask: "¿Dónde viven los 10 `double` de `v`?", bin: "stack",
      explain: "Un arreglo estático con tamaño fijo, declarado dentro de una función, vive en el stack." },
    { label: "new double[n]", code: "double* v = new double[n];", ask: "¿Dónde viven los `n` doubles?", bin: "heap",
      explain: "Un arreglo dinámico (tamaño conocido solo al ejecutar) se pide con `new[]` y vive en el heap. Se libera con `delete[] v;`." },
    { label: "a", code: "void f(int a) { ... }", ask: "¿Dónde vive el parámetro `a` mientras corre `f`?", bin: "stack",
      explain: "Los parámetros por valor son copias locales: viven en el stack de la llamada a la función." },
    { label: "Bono b", code: "Bono b(100, 0.05);", ask: "¿Dónde vive el objeto `b`?", bin: "stack",
      explain: "Un objeto declarado como variable local (sin `new`) vive en el stack; su destructor corre solo al salir del ámbito." },
    { label: "*b", code: "Bono* b = new Bono(100, 0.05);", ask: "¿Dónde vive el objeto `Bono` creado?", bin: "heap",
      explain: "Con `new Bono(...)` el objeto queda en el heap; `b` (el puntero) está en el stack." },
    { label: "malloc", code: "int* a = (int*) malloc(4 * sizeof(int));", ask: "¿Dónde queda el bloque de 4 ints?", bin: "heap",
      explain: "`malloc` (estilo C) también reserva en el heap. Se libera con `free(a)`, no con `delete`." },
    { label: "n (recursión)", code: "int fact(int n) {\n  return n <= 1 ? 1 : n * fact(n - 1);\n}", ask: "Cada copia de `n` en las llamadas recursivas, ¿dónde vive?", bin: "stack",
      explain: "Cada llamada recursiva apila su propio marco en el stack. Por eso una recursión sin caso base termina en stack overflow." },
    { label: "char c", code: "char c = 'A';", ask: "¿Dónde vive `c`?", bin: "stack",
      explain: "Igual que cualquier variable local: stack. Ocupa 1 byte." },
    { label: "new int*[3]", code: "int** m = new int*[3];", ask: "¿Dónde vive el arreglo de 3 punteros?", bin: "heap",
      explain: "Es la primera etapa de una matriz dinámica: el arreglo de punteros se pide con `new[]`, así que está en el heap." },
    { label: "&x", code: "int x = 3;\nint& r = x;", ask: "¿Dónde vive el dato al que se refiere `r`?", bin: "stack",
      explain: "Una referencia es otro nombre para `x`. No crea memoria nueva: el dato sigue siendo `x`, en el stack." },
    { label: "new Opcion", code: "Opcion* op = new Opcion(\"call\", 100);", ask: "¿Dónde vive el objeto `Opcion`?", bin: "heap",
      explain: "Cualquier objeto creado con `new` vive en el heap hasta que alguien llame a `delete op;`." }
  ];
  const DELETE_ITEMS = [
    { label: "delete p;", code: "int* p = new int(5);\n// ...\ndelete p;", ask: "¿Qué memoria libera `delete p;`?", bin: "heap", isDelete: true,
      explain: "`delete` devuelve al sistema la memoria del heap que pediste con `new`. Sin él, hay fuga de memoria." },
    { label: "delete[] v;", code: "double* v = new double[n];\n// ...\ndelete[] v;", ask: "¿Qué memoria libera `delete[] v;`?", bin: "heap", isDelete: true,
      explain: "Para arreglos creados con `new[]` se usa `delete[]`. Usar `delete` sin corchetes en un arreglo es comportamiento indefinido." },
    { label: "free(a);", code: "int* a = (int*) malloc(16);\n// ...\nfree(a);", ask: "¿Qué memoria libera `free(a);`?", bin: "heap", isDelete: true,
      explain: "`free` es la pareja de `malloc`: libera memoria del heap. No se mezclan `new`/`free` ni `malloc`/`delete`." }
  ];

  /* =====================================================================
     NIVEL 4 · CLASES (clasificador en dos fases)
     ===================================================================== */
  const CLASS_FILES = [
    { label: "class Bono {…};", code: "class Bono {\n  double F, c; int n;\npublic:\n  double precio(double r) const;\n};", ask: "¿En qué archivo va la definición de la clase?", bin: ".h",
      explain: "La declaración de la clase (sus atributos y prototipos) va en el header `Bono.h`, para que otros archivos la puedan incluir." },
    { label: "#ifndef BONO_H", code: "#ifndef BONO_H\n#define BONO_H\n...\n#endif", ask: "¿Dónde van los include guards?", bin: ".h",
      explain: "Los include guards protegen al header de incluirse dos veces en la misma compilación." },
    { label: "Bono::precio(){…}", code: "double Bono::precio(double r) const {\n  // suma de flujos descontados\n}", ask: "¿Dónde va el cuerpo del método?", bin: ".cpp",
      explain: "La implementación (`Clase::metodo` con su cuerpo) va en `Bono.cpp`. El `::` indica a qué clase pertenece." },
    { label: "Bono::Bono(){…}", code: "Bono::Bono(double F, double c, int n)\n  : F(F), c(c), n(n) {}", ask: "¿Dónde va la implementación del constructor?", bin: ".cpp",
      explain: "Igual que cualquier método: la declaración en el `.h`, la implementación en el `.cpp`." },
    { label: "int main()", code: "int main() {\n  Bono b(100, 0.05, 4);\n  cout << b.precio(0.06);\n}", ask: "¿Dónde va la función que usa la clase?", bin: "main.cpp",
      explain: "`main` es quien usa la clase: incluye `\"Bono.h\"`, crea objetos y llama métodos. No necesita ver cómo están implementados." },
    { label: "Bono b(100);", code: "Bono b(100, 0.05, 4);", ask: "¿Dónde se crea un objeto para usarlo?", bin: "main.cpp",
      explain: "Crear objetos e instanciar la clase es trabajo de quien la usa (por ejemplo `main.cpp`)." },
    { label: "double df(…);", code: "double discountFactor(double r, int t);", ask: "¿Dónde va el prototipo de una función libre?", bin: ".h",
      explain: "Los prototipos (firma terminada en `;`) van en el header; así el compilador conoce la función antes de usarla." },
    { label: "df(…){ return …; }", code: "double discountFactor(double r, int t) {\n  return 1.0 / pow(1 + r, t);\n}", ask: "¿Dónde va el cuerpo de esa función?", bin: ".cpp",
      explain: "La definición va en el `.cpp`. Si la pones en el `.h` sin `inline`, al incluirlo en dos archivos el linker se queja de una definición duplicada." },
    { label: "inline cupon()", code: "inline double cupon(double F, double c) {\n  return F * c;\n}", ask: "¿Dónde va una función `inline` corta?", bin: ".h",
      explain: "Las funciones `inline` se ponen en el header: el compilador necesita ver el cuerpo en cada archivo que la usa." }
  ];
  const CLASS_ACCESS = [
    { label: "double F;", code: "class Bono {\n  double F;   // nominal\n  ...", ask: "Atributo nominal `F`: ¿público o privado?", bin: "private",
      explain: "Encapsulamiento: los datos internos van en `private` para que nadie los cambie sin control." },
    { label: "double c;", code: "class Bono {\n  double c;   // tasa cupón\n  ...", ask: "Atributo tasa cupón `c`: ¿público o privado?", bin: "private",
      explain: "Los atributos se dejan privados y se exponen, si hace falta, con getters/setters." },
    { label: "int n;", code: "class Bono {\n  int n;      // número de pagos\n  ...", ask: "Atributo `n`: ¿público o privado?", bin: "private",
      explain: "Si `n` fuera público, alguien podría ponerlo negativo y romper el cálculo del precio." },
    { label: "precio()", code: "double precio(double r) const;", ask: "Método `precio`: ¿público o privado?", bin: "public",
      explain: "Es el servicio que la clase ofrece al exterior, así que es público. Es la interfaz de la clase." },
    { label: "Bono(F,c,n)", code: "Bono(double F, double c, int n);", ask: "Constructor: ¿público o privado?", bin: "public",
      explain: "Si el constructor fuera privado, nadie fuera de la clase podría crear un `Bono`." },
    { label: "getNominal()", code: "double getNominal() const;", ask: "Getter `getNominal`: ¿público o privado?", bin: "public",
      explain: "Los getters existen justamente para leer desde fuera un atributo privado. El `const` dice que no modifica el objeto." },
    { label: "setTasa(r)", code: "void setTasa(double c);", ask: "Setter `setTasa`: ¿público o privado?", bin: "public",
      explain: "Un setter público permite cambiar el atributo pero validando (por ejemplo, rechazar tasas negativas)." },
    { label: "flujo(t)", code: "// solo lo usa precio() por dentro\ndouble flujo(int t) const;", ask: "Método auxiliar que solo usa `precio()` internamente: ¿público o privado?", bin: "private",
      explain: "Un método auxiliar interno conviene dejarlo privado: es un detalle de implementación, no parte de la interfaz." },
    { label: "~Bono()", code: "~Bono();", ask: "Destructor: ¿público o privado?", bin: "public",
      explain: "El destructor se llama solo al destruir el objeto (fin del ámbito o `delete`), y debe ser público para que eso pueda ocurrir." }
  ];

  /* =====================================================================
     NIVEL 2 · PUNTEROS (disparos, 4 alternativas, generadas)
     ===================================================================== */
  function addrPair() {
    const a = rnd(0x10, 0xf0) * 0x10;   // &a, múltiplo de 16
    return { A: a, P: a + 8 };          // &p unos bytes más allá
  }
  const PTR_GENS = [
    function () {
      const v = rnd(2, 9), m = addrPair();
      return mkQ("Dispara al valor de `*p`", `int a = ${v};        // &a == ${hex(m.A)}\nint* p = &a;      // &p == ${hex(m.P)}`,
        v, [hex(m.A), hex(m.P), v + 1],
        `\`*p\` desreferencia: va a la dirección guardada en \`p\` (${hex(m.A)}) y lee lo que hay ahí, o sea \`a\` = ${v}.`);
    },
    function () {
      const v = rnd(2, 9), m = addrPair();
      return mkQ("Dispara al valor de `p`", `int a = ${v};        // &a == ${hex(m.A)}\nint* p = &a;      // &p == ${hex(m.P)}`,
        hex(m.A), [v, hex(m.P), hex(m.A + 4)],
        `Un puntero guarda una dirección. \`p = &a\`, así que \`p\` vale ${hex(m.A)}. El ${v} sería \`*p\`.`);
    },
    function () {
      const v = rnd(2, 9), m = addrPair();
      return mkQ("Dispara al valor de `&p`", `int a = ${v};        // &a == ${hex(m.A)}\nint* p = &a;      // &p == ${hex(m.P)}`,
        hex(m.P), [hex(m.A), v, hex(m.P + 8)],
        `\`&p\` es la dirección de la propia variable \`p\` (${hex(m.P)}), no la dirección que guarda.`);
    },
    function () {
      const v = rnd(2, 9), w = rnd(10, 30);
      return mkQ("Dispara al valor final de `a`", `int a = ${v};\nint* p = &a;\n*p = ${w};`,
        w, [v, v + w, 0],
        `Escribir en \`*p\` es escribir en \`a\`, porque \`p\` apunta a \`a\`. Ahora \`a\` = ${w}.`);
    },
    function () {
      const v = rnd(2, 9), w = rnd(10, 30);
      return mkQ("Dispara al valor final de `a`", `int a = ${v};\nint& r = a;\nr = ${w};`,
        w, [v, v + w, 0],
        `Una referencia es otro nombre para la misma variable: cambiar \`r\` cambia \`a\`. Queda en ${w}.`);
    },
    function () {
      const v = rnd(2, 9), w = rnd(10, 30);
      return mkQ("Dispara al valor final de `a`", `int a = ${v};\nint b = a;\nb = ${w};`,
        v, [w, v + w, 0],
        `\`int b = a\` hace una copia. Después \`b\` y \`a\` son independientes, así que \`a\` sigue en ${v}.`);
    },
    function () {
      const v = [rnd(1, 9), rnd(10, 19), rnd(20, 29), rnd(30, 39)];
      return mkQ("Dispara al valor de `*(q + 2)`", `int v[4] = {${v.join(", ")}};\nint* q = v;`,
        v[2], [v[0] + 2, v[1], v[3]],
        `\`q + 2\` avanza dos elementos (no dos bytes). \`*(q + 2)\` es lo mismo que \`v[2]\` = ${v[2]}.`);
    },
    function () {
      const v = [rnd(1, 9), rnd(10, 19), rnd(20, 29), rnd(30, 39)];
      return mkQ("Dispara al valor de `*q + 1`", `int v[4] = {${v.join(", ")}};\nint* q = v;`,
        v[0] + 1, [v[1], v[0], v[2]],
        `Precedencia: \`*\` va antes que \`+\`. Primero \`*q\` = ${v[0]}, después +1 = ${v[0] + 1}. Para el siguiente elemento sería \`*(q + 1)\`.`);
    },
    function () {
      const base = rnd(0x10, 0xf0) * 0x10;
      return mkQ("Dispara a la dirección `q + 2`", `int v[4];          // v empieza en ${hex(base)}\nint* q = v;        // sizeof(int) == 4`,
        hex(base + 8), [hex(base + 2), hex(base + 4), hex(base + 16)],
        `Aritmética de punteros: \`q + 2\` suma 2 × sizeof(int) = 8 bytes. ${hex(base)} + 8 = ${hex(base + 8)}.`);
    },
    function () {
      const base = rnd(0x10, 0xf0) * 0x10;
      return mkQ("Dispara a la dirección `&d[1]`", `double d[3];       // d empieza en ${hex(base)}\n                   // sizeof(double) == 8`,
        hex(base + 8), [hex(base + 1), hex(base + 4), hex(base + 16)],
        `Cada \`double\` ocupa 8 bytes, así que \`d[1]\` está 8 bytes después del inicio: ${hex(base + 8)}.`);
    },
    function () {
      const v = rnd(2, 9);
      return mkQ("Dispara al valor de `a` después de `f(a)`", `void f(int x) { x = x * 2; }\n\nint a = ${v};\nf(a);`,
        v, [2 * v, 0, v + 2],
        `Paso por valor: \`f\` recibe una copia. Duplica la copia, no \`a\`, que sigue en ${v}.`);
    },
    function () {
      const v = rnd(2, 9);
      return mkQ("Dispara al valor de `a` después de `f(a)`", `void f(int& x) { x = x * 2; }\n\nint a = ${v};\nf(a);`,
        2 * v, [v, 0, v + 2],
        `Paso por referencia (\`int&\`): \`x\` es \`a\` con otro nombre, así que \`a\` queda en ${2 * v}.`);
    },
    function () {
      const v = rnd(2, 9);
      return mkQ("Dispara al valor de `a` después de `f(&a)`", `void f(int* x) { *x = *x * 2; }\n\nint a = ${v};\nf(&a);`,
        2 * v, [v, 0, v + 2],
        `Se pasa la dirección de \`a\`. Dentro, \`*x\` es \`a\`, así que se duplica: ${2 * v}.`);
    },
    function () {
      const v = rnd(2, 9);
      return mkQ("Dispara a lo que vale `*p` al final", `int* p = new int(${v});\ndelete p;\ncout << *p;`,
        "indefinido", [v, 0, "nullptr"],
        "Después de `delete`, `p` es un puntero colgante: apunta a memoria que ya no es tuya. Leer `*p` es comportamiento indefinido. Buena práctica: `p = nullptr;`.");
    },
    function () {
      return mkQ("Dispara: ¿compila la última línea?", "int a = 3;\nconst int* p = &a;\n*p = 5;",
        "No compila", ["Sí, a = 5", "Sí, a = 3", "Error al ejecutar"],
        "`const int* p` es un puntero a dato constante: puedes leer `*p` pero no modificarlo a través de `p`.");
    },
    function () {
      return mkQ("Dispara: ¿qué pasa con la última línea?", "int a = 3;\nint* const p = &a;\n*p = 5;",
        "Sí, a = 5", ["No compila", "Sí, a = 3", "Error al ejecutar"],
        "`int* const p` es un puntero constante: no puede apuntar a otra cosa, pero sí puede modificar el dato. `a` queda en 5.");
    },
    function () {
      const t = pick([["int", 4], ["double", 8], ["char", 1], ["int*", 8]]);
      return mkQ(`Dispara al valor de \`sizeof(${t[0]})\``, `// compilador típico de 64 bits\ncout << sizeof(${t[0]});`,
        t[1], [1, 2, 4, 8, 16].filter(x => x !== t[1]),
        t[0] === "int*" ? "Un puntero guarda una dirección; en 64 bits toda dirección ocupa 8 bytes, apunte a lo que apunte."
          : `En un compilador típico: char = 1, int = 4, double = 8 bytes. \`sizeof(${t[0]})\` = ${t[1]}.`);
    },
    function () {
      const v = rnd(2, 9);
      return mkQ("Dispara al valor de `**pp`", `int a = ${v};\nint* p = &a;\nint** pp = &p;`,
        v, ["&p", "&a", v * 2],
        `\`pp\` apunta a \`p\`, y \`p\` apunta a \`a\`. Desreferenciar dos veces llega a \`a\` = ${v}.`);
    }
  ];

  /* =====================================================================
     NIVEL 3 · CONTROL DE FLUJO (carrera de 3 pistas, generadas)
     ===================================================================== */
  const CTRL_GENS = [
    function () {
      const a = rnd(0, 3), s = pick([1, 2, 3]), b = a + s * rnd(2, 5) + rnd(0, s - 1);
      const n = Math.ceil((b - a) / s);
      return mkQ("¿Cuántas veces se ejecuta `n++`?", `int n = 0;\nfor (int i = ${a}; i < ${b}; i += ${s})\n  n++;`,
        n, [n + 1, Math.max(0, n - 1), n + 2],
        `\`i\` toma ${seq(a, b - 1, s)}: son ${n} vueltas. Con \`<\` el ${b} no entra.`, 3);
    },
    function () {
      const a = rnd(0, 3), b = a + rnd(3, 7);
      const n = b - a + 1;
      return mkQ("¿Cuántas veces se ejecuta `n++`?", `int n = 0;\nfor (int i = ${a}; i <= ${b}; i++)\n  n++;`,
        n, [n - 1, n + 1],
        `Con \`<=\` el ${b} sí entra: de ${a} a ${b} hay ${n} valores. Contar mal por uno es el error más típico.`, 3);
    },
    function () {
      const s = pick([2, 3, 4]), x = s * rnd(2, 4) + rnd(0, s - 1);
      const n = Math.ceil(x / s);
      return mkQ("¿Cuánto vale `n` al final?", `int x = ${x}, n = 0;\nwhile (x > 0) {\n  x -= ${s};\n  n++;\n}`,
        n, [n + 1, Math.max(0, n - 1), Math.floor(x / s) === n ? n + 2 : Math.floor(x / s)],
        `El \`while\` revisa la condición antes de cada vuelta. \`x\` baja de a ${s} desde ${x} hasta ≤ 0: son ${n} vueltas.`, 3);
    },
    function () {
      const k = rnd(5, 9);
      return mkQ("¿Cuánto vale `n` al final?", `int n = 0;\ndo {\n  n++;\n} while (n > ${k});`,
        1, [0, k + 1],
        "El `do-while` ejecuta el cuerpo al menos una vez y recién después revisa la condición. Como 1 no es mayor que " + k + ", termina con `n` = 1.", 3);
    },
    function () {
      const x = pick([3, 5, 6, 8, 10, 11, 14]);
      const out = x > 10 ? "A" : x > 5 ? "B" : "C";
      return mkQ("¿Qué imprime?", `int x = ${x};\nif (x > 10)       cout << "A";\nelse if (x > 5)   cout << "B";\nelse              cout << "C";`,
        out, ["A", "B", "C"],
        `Se evalúan en orden y solo entra a la primera que se cumple. Con x = ${x}: ${x > 10 ? "x > 10 es verdadero" : x > 5 ? "x > 10 es falso, x > 5 es verdadero" : "ninguna se cumple, cae al else"} → "${out}".`, 3);
    },
    function () {
      const k = rnd(1, 3);
      const out = { 1: "AB", 2: "B", 3: "C" }[k];
      return mkQ("¿Qué imprime?", `int k = ${k};\nswitch (k) {\n  case 1: cout << "A";\n  case 2: cout << "B"; break;\n  case 3: cout << "C";\n}`,
        out, ["A", "AB", "ABC", "B", "BC", "C"].filter(s => s !== out).slice(0, 2).concat(k === 1 ? ["A"] : k === 2 ? ["BC"] : ["BC"]).reverse(),
        k === 1 ? "El `case 1` no tiene `break`, así que sigue de largo al `case 2` (fall-through) y para en su `break`: \"AB\"."
          : k === 2 ? "Entra en `case 2`, imprime \"B\" y el `break` sale del switch."
            : "Entra en `case 3` y es el último, así que imprime solo \"C\".", 3);
    },
    function () {
      const n = rnd(5, 9);
      let odd = 0, all = 0, even = 0;
      for (let i = 1; i <= n; i++) { all += i; if (i % 2) odd += i; else even += i; }
      return mkQ("¿Cuánto vale `s` al final?", `int s = 0;\nfor (int i = 1; i <= ${n}; i++) {\n  if (i % 2 == 0) continue;\n  s += i;\n}`,
        odd, [all, even],
        `\`continue\` salta al siguiente ciclo cuando i es par, así que solo suma los impares: ${odd}.`, 3);
    },
    function () {
      const k = rnd(3, 7);
      return mkQ("¿Cuánto vale `n` al final?", `int n = 0;\nfor (int i = 0; i < 10; i++) {\n  if (i == ${k}) break;\n  n++;\n}`,
        k, [k + 1, 10],
        `\`break\` sale del ciclo entero cuando i llega a ${k}. Alcanzó a sumar para i = 0..${k - 1}: ${k} veces.`, 3);
    },
    function () {
      const b = pick([2, 3, 4]), a = b * rnd(2, 5) + rnd(1, b - 1);
      const q = Math.floor(a / b), real = (a / b).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
      return mkQ("¿Qué imprime?", `int a = ${a}, b = ${b};\ncout << a / b;`,
        q, [real, a % b],
        `División entre enteros: se trunca el decimal. ${a} / ${b} = ${q}.`, 3);
    },
    function () {
      const b = pick([3, 4, 5]), a = b * rnd(2, 5) + rnd(1, b - 1);
      return mkQ("¿Qué imprime?", `cout << ${a} % ${b};`,
        a % b, [Math.floor(a / b), b - (a % b) === a % b ? b : b - (a % b)],
        `\`%\` es el resto de la división entera: ${a} = ${b}·${Math.floor(a / b)} + ${a % b}.`, 3);
    },
    function () {
      const b = 2, a = pick([5, 7, 9]);
      return mkQ("¿Qué imprime?", `int a = ${a}, b = ${b};\ndouble r = a / b;\ncout << r;`,
        Math.floor(a / b), [a / b, "Error"],
        `Primero se hace \`a / b\` entre ints (= ${Math.floor(a / b)}) y recién después se guarda en el double. Para obtener ${a / b} hay que convertir: \`(double) a / b\`.`, 3);
    },
    function () {
      const k = rnd(3, 5);
      let f = 1; for (let i = 2; i <= k; i++) f *= i;
      return mkQ(`¿Cuánto devuelve \`f(${k})\`?`, `int f(int n) {\n  if (n <= 1) return 1;\n  return n * f(n - 1);\n}`,
        f, [k * (k - 1), (k * (k + 1)) / 2],
        `Es el factorial: f(${k}) = ${Array.from({ length: k }, (_, i) => k - i).join("·")} = ${f}. El \`if (n <= 1)\` es el caso base que detiene la recursión.`, 3);
    },
    function () {
      const k = rnd(3, 6);
      const s = (k * (k + 1)) / 2;
      return mkQ(`¿Cuánto devuelve \`s(${k})\`?`, `int s(int n) {\n  if (n == 0) return 0;\n  return n + s(n - 1);\n}`,
        s, [k * k, s - k],
        `s(${k}) = ${Array.from({ length: k }, (_, i) => k - i).join(" + ")} + 0 = ${s}.`, 3);
    },
    function () {
      const x = rnd(1, 10);
      const val = x > 3 && x < 8;
      return mkQ("¿Cuánto vale `b`?", `int x = ${x};\nbool b = (x > 3 && x < 8);`,
        String(val), [String(!val), "No compila"],
        `\`&&\` es verdadero solo si ambas partes lo son. Con x = ${x}: ${x > 3} && ${x < 8} → ${val}.`, 3);
    },
    function () {
      return mkQ("¿Cuánto valen `x` e `y`?", "void g(int a, int& b) { a++; b++; }\n\nint x = 1, y = 1;\ng(x, y);",
        "x=1, y=2", ["x=2, y=2", "x=1, y=1"],
        "`a` es una copia (por valor) y `b` es una referencia. Solo `y` cambia.", 3);
    },
    function () {
      const call = pick([["3.0", "double"], ["3", "int"], ["'a'", "int"]]);
      return mkQ(`¿Cuál versión llama \`f(${call[0]})\`?`, "void f(int x)    { cout << \"int\"; }\nvoid f(double x) { cout << \"double\"; }",
        call[1], [call[1] === "int" ? "double" : "int", "Ambigua"],
        call[0] === "'a'" ? "Sobrecarga: un `char` se promueve a `int` antes que convertirse a `double`, así que gana la versión `int`."
          : `Sobrecarga: el compilador elige según el tipo del argumento. \`${call[0]}\` es ${call[1]}.`, 3);
    },
    function () {
      const c = pick([["pot(3)", 9], ["pot(2, 3)", 8], ["pot(5)", 25]]);
      return mkQ(`¿Cuánto devuelve \`${c[0]}\`?`, "int pot(int b, int e = 2) {\n  int r = 1;\n  for (int i = 0; i < e; i++) r *= b;\n  return r;\n}",
        c[1], [c[0] === "pot(2, 3)" ? 4 : c[1] / (c[0] === "pot(3)" ? 3 : 5), c[0] === "pot(2, 3)" ? 6 : c[1] * (c[0] === "pot(3)" ? 3 : 5)],
        c[0] === "pot(2, 3)" ? "Se pasó `e = 3` explícitamente: 2·2·2 = 8." : "Si no se pasa `e`, toma el valor por defecto 2: se eleva al cuadrado.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "unsigned int u = 0;\nu = u - 1;\ncout << u;",
        "4294967295", ["-1", "0"],
        "Un `unsigned` no puede ser negativo: al bajar de 0 da la vuelta al máximo (2³² − 1 con 32 bits).", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "int x = 1;\n{\n  int x = 2;\n}\ncout << x;",
        1, [2, "No compila"],
        "Ámbito: el `x` de adentro es otra variable que oculta a la de afuera y muere al cerrar `}`. Afuera `x` sigue en 1.", 3);
    },
    function () {
      return mkQ("¿Cuánto vale `v[3]`?", "int v[5] = {1, 2};",
        0, ["basura", 2],
        "Si inicializas un arreglo con menos valores que su tamaño, el resto se llena con 0.", 3);
    },
    function () {
      const w = pick(["hola", "bono", "tasa", "call"]);
      const which = pick(["sizeof", "strlen"]);
      const val = which === "sizeof" ? w.length + 1 : w.length;
      return mkQ(`¿Cuánto vale \`${which}(s)\`?`, `char s[] = "${w}";`,
        val, [which === "sizeof" ? w.length : w.length + 1, w.length + 2],
        `Una cadena C termina con \`'\\0'\`. \`sizeof\` cuenta los ${w.length + 1} bytes del arreglo (incluido \`'\\0'\`); \`strlen\` cuenta solo los ${w.length} caracteres.`, 3);
    }
  ];
  function seq(a, last, s) {
    const out = [];
    for (let i = a; i <= last; i += s) out.push(i);
    return out.join(", ");
  }

  /* =====================================================================
     NIVEL · TIPOS Y OPERADORES (carrera, generadas)
     ===================================================================== */
  const TYPES_GENS = [
    function () {
      const a = rnd(1, 6), b = rnd(2, 5), c = rnd(2, 5);
      return mkQ("¿Qué imprime?", `cout << ${a} + ${b} * ${c};`,
        a + b * c, [(a + b) * c, a * b + c],
        `Precedencia: \`*\` va antes que \`+\`. ${b}·${c} = ${b * c}, más ${a} = ${a + b * c}.`, 3);
    },
    function () {
      const k = rnd(2, 9), post = Math.random() < 0.5;
      return mkQ("¿Cuánto vale `j`?", `int i = ${k};\nint j = ${post ? "i++" : "++i"};`,
        post ? k : k + 1, [post ? k + 1 : k, k + 2],
        post ? `\`i++\` (post-incremento) entrega el valor viejo (${k}) y después suma. \`j\` = ${k}, \`i\` = ${k + 1}.`
          : `\`++i\` (pre-incremento) suma primero y entrega el valor nuevo. \`j\` = ${k + 1}.`, 3);
    },
    function () {
      const n = rnd(2, 9), d = pick([1, 5, 9]);
      return mkQ("¿Cuánto vale `x`?", `int x = ${n}.${d};`,
        n, [n + 1, `${n}.${d}`],
        `Al guardar un decimal en un \`int\` se trunca la parte decimal (no se redondea): queda ${n}.`, 3);
    },
    function () {
      const k = rnd(1, 4), ch = String.fromCharCode(65 + k);
      return mkQ("¿Qué imprime?", `char c = 'A' + ${k};\ncout << c;`,
        ch, [`A${k}`, 65 + k],
        `Un \`char\` es un número (código ASCII). 'A' = 65, más ${k} = ${65 + k}, que es '${ch}'. Como \`c\` es char, \`cout\` muestra la letra.`, 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "cout << (3 > 2) + (5 == 5);",
        2, [1, "truetrue"],
        "Una comparación da un `bool`, y en una suma `true` vale 1. 1 + 1 = 2.", 3);
    },
    function () {
      const a = pick([5, 7, 9]);
      return mkQ("¿Qué imprime?", `int a = ${a}, b = 2;\ncout << (double) a / b;`,
        a / 2, [Math.floor(a / 2), Math.ceil(a / 2)],
        `El cast \`(double)\` convierte \`a\` antes de dividir, así que la división es con decimales: ${a / 2}.`, 3);
    },
    function () {
      const a = rnd(1, 5), b = rnd(2, 5), c = rnd(2, 4);
      return mkQ("¿Cuánto vale `x` al final?", `int x = ${a};\nx += ${b};\nx *= ${c};`,
        (a + b) * c, [a + b * c, a * c + b],
        `Paso a paso: x = ${a}; x += ${b} → ${a + b}; x *= ${c} → ${(a + b) * c}.`, 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "int x = 0;\nif (x = 5) cout << \"A\";\nelse       cout << \"B\";",
        "A", ["B", "No compila"],
        "Trampa clásica: `x = 5` asigna (no compara). La expresión vale 5, que es distinto de 0, o sea verdadero. Para comparar se usa `==`.", 3);
    },
    function () {
      const k = rnd(2, 9);
      const out = k % 2 === 0 ? "par" : "impar";
      return mkQ("¿Qué imprime?", `int x = ${k};\ncout << (x % 2 == 0 ? "par" : "impar");`,
        out, [out === "par" ? "impar" : "par", k % 2],
        `El operador ternario \`cond ? a : b\` entrega \`a\` si la condición es verdadera. ${k} % 2 = ${k % 2} → "${out}".`, 3);
    },
    function () {
      return mkQ("¿Qué pasa?", "const double r = 0.05;\nr = 0.06;",
        "No compila", ["r = 0.06", "r = 0.05"],
        "Una variable `const` no se puede modificar después de inicializarla. El compilador lo rechaza.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "#define DOBLE(x) x * 2\n\ncout << DOBLE(3 + 1);",
        5, [8, 6],
        "Una macro reemplaza texto antes de compilar: queda `3 + 1 * 2` = 5. Por eso en macros se ponen paréntesis: `(x) * 2`.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "int n = 0;\nbool b = true || (++n > 0);\ncout << n;",
        0, [1, "true"],
        "Cortocircuito: con `||`, si la izquierda ya es verdadera no se evalúa la derecha. El `++n` nunca corre.", 3);
    },
    function () {
      return mkQ("¿Cuánto vale?", "sizeof(char) + sizeof(int) + sizeof(double)",
        13, [12, 16],
        "Tamaños típicos: char 1, int 4, double 8 bytes. 1 + 4 + 8 = 13.", 3);
    },
    function () {
      const a = rnd(10, 30), d = pick([0.5, 1.5, 2.5]);
      return mkQ("¿Qué imprime?", `stringstream ss("${a} ${d}");\nint a; double b;\nss >> a >> b;\ncout << a + b;`,
        a + d, [`${a}${d}`, a],
        `\`stringstream\` lee el texto separado por espacios igual que \`cin\`: a = ${a}, b = ${d}. La suma es ${a + d}.`, 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "unsigned char c = 255;\nc = c + 1;\ncout << (int) c;",
        0, [256, -1],
        "Un `unsigned char` va de 0 a 255. Al pasarse del máximo da la vuelta a 0 (overflow).", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "int x = 1;          // global\nvoid f() { x = 5; }\n\nint main() {\n  f();\n  cout << x;\n}",
        5, [1, "No compila"],
        "`x` es global: `f` modifica esa misma variable, así que `main` ve 5. Ojo: las variables globales se usan poco porque cualquiera las puede cambiar.", 3);
    }
  ];

  /* =====================================================================
     NIVEL · ¿COMPILA? (clasificador)
     ===================================================================== */
  const COMPILE_ITEMS = [
    { code: "int x = 5\ncout << x;", bin: "no compila", explain: "Falta el `;` al final de la primera línea. Es un error de sintaxis." },
    { code: "int x = 3.7;", bin: "compila", explain: "Compila (a lo más con una advertencia): el decimal se trunca y `x` queda en 3." },
    { code: "cout << y;   // y nunca se declaró", bin: "no compila", explain: "Toda variable se declara antes de usarla. `y` no existe para el compilador." },
    { code: "const int N = 10;\nN = 20;", bin: "no compila", explain: "Una constante no se puede reasignar." },
    { code: "int v[3] = {1, 2, 3, 4};", bin: "no compila", explain: "Hay más valores que espacios en el arreglo: el compilador lo rechaza." },
    { code: "double r = 5 / 2;", bin: "compila", explain: "Compila, pero `r` vale 2.0: la división entre ints se hace antes de guardar en el double." },
    { code: "{\n  int a = 1;\n}\ncout << a;", bin: "no compila", explain: "`a` solo existe dentro de las llaves. Afuera de su ámbito no se puede usar." },
    { code: "int f(int x);          // prototipo\nint main() { cout << f(2); }\nint f(int x) { return 2 * x; }", bin: "compila", explain: "El prototipo avisa que `f` existe, así que `main` la puede usar aunque se defina más abajo." },
    { code: "int main() { cout << g(2); }\nint g(int x) { return x; }", bin: "no compila", explain: "Sin prototipo, el compilador lee de arriba hacia abajo y no conoce `g` cuando `main` la usa." },
    { code: "std::string s = \"bono\";\nint n = s;", bin: "no compila", explain: "No hay conversión automática de `string` a `int`. Habría que usar `stoi` o un `stringstream`." },
    { code: "int x = 10;\nint& r;", bin: "no compila", explain: "Una referencia debe inicializarse al declararla: `int& r = x;`." },
    { code: "int a = 1, b = 2;\nif (a = b) cout << \"igual\";", bin: "compila", explain: "Compila (es la trampa): `a = b` asigna 2, que es verdadero. Para comparar es `==`." },
    { code: "void f(int a, int b = 2);\nf(1);", bin: "compila", explain: "`b` tiene valor por defecto, así que se puede omitir: queda `f(1, 2)`." },
    { code: "void f(int a = 1, int b);", bin: "no compila", explain: "Los argumentos por defecto van al final de la lista. Después de uno con default, todos deben tener default." },
    { code: "int* p = 5;", bin: "no compila", explain: "No se puede guardar un entero en un puntero. Un puntero recibe direcciones (`&x`), `nullptr` o lo que entrega `new`." },
    { code: "unsigned int u = -1;", bin: "compila", explain: "Compila: el -1 se convierte y `u` queda en 4294967295 (el máximo de 32 bits)." }
  ];

  /* =====================================================================
     NIVEL · ARREGLOS Y CADENAS (disparos, generadas)
     ===================================================================== */
  const ARR_GENS = [
    function () {
      const v = [rnd(1, 9), rnd(10, 19), rnd(20, 29), rnd(30, 39), rnd(40, 49)], k = rnd(1, 3);
      return mkQ(`Dispara al valor de \`v[${k}]\``, `int v[5] = {${v.join(", ")}};`,
        v[k], [v[k + 1], v[k - 1], k],
        `Los índices parten en 0: v[0] = ${v[0]}, v[1] = ${v[1]}… así que v[${k}] = ${v[k]}.`);
    },
    function () {
      const n = rnd(4, 12);
      return mkQ("Dispara al índice del último elemento", `double precios[${n}];`,
        n - 1, [n, n + 1, 1],
        `Un arreglo de ${n} elementos va del índice 0 al ${n - 1}. Usar \`precios[${n}]\` se sale del arreglo.`);
    },
    function () {
      const v = [rnd(1, 9), rnd(1, 9), rnd(1, 9), rnd(1, 9)];
      const s = v.reduce((a, b) => a + b, 0);
      return mkQ("Dispara al valor de `s`", `int v[4] = {${v.join(", ")}};\nint s = 0;\nfor (int i = 1; i < 4; i++)\n  s += v[i];`,
        s - v[0], [s, s - v[3], v[3]],
        `El ciclo parte en i = 1, así que se salta v[0]. Suma ${v.slice(1).join(" + ")} = ${s - v[0]}.`);
    },
    function () {
      const m = [[rnd(1, 9), rnd(1, 9), rnd(1, 9)], [rnd(10, 19), rnd(20, 29), rnd(30, 39)]];
      const r = 1, c = rnd(0, 2);
      return mkQ(`Dispara al valor de \`m[${r}][${c}]\``, `int m[2][3] = {{${m[0].join(", ")}},\n               {${m[1].join(", ")}}};`,
        m[r][c], [m[0][c], m[r][(c + 1) % 3], m[0][(c + 1) % 3]],
        `Primero la fila, después la columna. Fila 1 (la segunda) = {${m[1].join(", ")}}, columna ${c} → ${m[r][c]}.`);
    },
    function () {
      const f = rnd(2, 4), c = rnd(3, 5);
      return mkQ("Dispara a la cantidad de elementos", `double m[${f}][${c}];`,
        f * c, [f + c, c, f],
        `Una matriz de ${f} filas por ${c} columnas tiene ${f}·${c} = ${f * c} elementos.`);
    },
    function () {
      return mkQ("Dispara a lo que imprime", "int v[3] = {1, 2, 3};\ncout << v[3];",
        "indefinido", [3, 0, "No compila"],
        "`v[3]` está fuera del arreglo (los índices válidos son 0, 1 y 2). C++ no lo revisa: compila, pero lee memoria ajena. Es comportamiento indefinido.");
    },
    function () {
      const a = rnd(1, 4), b = rnd(5, 8), w = rnd(10, 30);
      return mkQ("Dispara al valor de `v[0]` al final", `void f(int a[]) { a[0] = ${w}; }\n\nint v[2] = {${a}, ${b}};\nf(v);`,
        w, [a, b, "indefinido"],
        "Un arreglo se pasa a una función como la dirección de su primer elemento. La función modifica el arreglo original, no una copia.");
    },
    function () {
      const w = pick(["bono", "swap", "tasa", "cupon"]), size = 20, which = pick(["strlen", "sizeof"]);
      return mkQ(`Dispara al valor de \`${which}(s)\``, `char s[${size}] = "${w}";`,
        which === "strlen" ? w.length : size, which === "strlen" ? [w.length + 1, size, size - w.length] : [w.length, w.length + 1, size - 1],
        which === "strlen" ? `\`strlen\` cuenta caracteres hasta el \`'\\0'\`: "${w}" tiene ${w.length}.`
          : `\`sizeof\` mide el arreglo completo, usado o no: ${size} bytes.`);
    },
    function () {
      const w = pick(["opcion", "precio", "futuro", "accion"]), k = rnd(1, 4);
      const others = [w[k - 1], w[k + 1], w[0], ...w.split(""), "x", "z"].filter(c => c !== w[k]);
      return mkQ(`Dispara al carácter \`s[${k}]\``, `char s[] = "${w}";`,
        w[k], others,
        `Igual que en cualquier arreglo, s[0] = '${w[0]}'. Contando desde 0, s[${k}] = '${w[k]}'.`);
    },
    function () {
      const w = pick(["call", "put", "bono"]);
      return mkQ(`Dispara a lo que hay en \`s[${w.length}]\``, `char s[] = "${w}";`,
        "'\\0'", [`'${w[w.length - 1]}'`, "basura", "' '"],
        `Las cadenas C terminan con el carácter nulo. "${w}" ocupa ${w.length + 1} posiciones: la última, s[${w.length}], es \`'\\0'\`.`);
    },
    function () {
      const p = pick([["\"abc\", \"abd\"", "negativo"], ["\"put\", \"call\"", "positivo"], ["\"bono\", \"bono\"", "0"]]);
      return mkQ(`Dispara al signo de \`strcmp(${p[0].replace(/"/g, "\"")})\``, `strcmp(${p[0]});`,
        p[1], ["negativo", "positivo", "0", "1"].filter(x => x !== p[1]),
        "`strcmp` compara letra por letra: entrega 0 si son iguales, un negativo si la primera va antes en orden alfabético y un positivo si va después.");
    },
    function () {
      return mkQ("Dispara a lo que imprime", "char s[20] = \"Hola\";\nstrcat(s, \"Mundo\");\ncout << s;",
        "HolaMundo", ["Hola Mundo", "Hola", "Mundo"],
        "`strcat` pega la segunda cadena al final de la primera, sin agregar espacios. El arreglo `s` debe tener espacio suficiente.");
    },
    function () {
      const base = rnd(0x10, 0xf0) * 0x10;
      return mkQ("Dispara al valor de `v` (el nombre del arreglo)", `int v[3];     // v[0] está en ${hex(base)}`,
        hex(base), [hex(base + 4), hex(base + 8), "0x0"],
        "El nombre de un arreglo se comporta como la dirección de su primer elemento: `v` == `&v[0]`.");
    },
    function () {
      const v = shuffle([4, 8, 15, 16, 23, 42]).slice(0, rnd(4, 6));
      return mkQ("Dispara al resultado", `int v[] = {${v.join(", ")}};\ncout << sizeof(v) / sizeof(v[0]);`,
        v.length, [v.length * 4, v.length - 1, v.length + 1],
        `\`sizeof(v)\` = ${v.length * 4} bytes y cada int ocupa 4: ${v.length * 4} / 4 = ${v.length} elementos. Es el truco para contar elementos.`);
    }
  ];

  /* =====================================================================
     NIVEL · DETECTIVE DE MEMORIA (clasificador)
     ===================================================================== */
  const DETECTIVE_ITEMS = [
    { code: "int* p = new int(5);\ncout << *p;\ndelete p;", bin: "ok", explain: "Un `new` y su `delete`, usando el dato antes de liberarlo. Todo bien." },
    { code: "int* p = new int(5);\np = new int(7);\ndelete p;", bin: "fuga", explain: "Al reasignar `p` se perdió la dirección del primer `int`. Ya nadie lo puede liberar: fuga de memoria." },
    { code: "int* p = new int(5);\ndelete p;\ncout << *p;", bin: "colgante", explain: "Después del `delete`, `p` apunta a memoria liberada. Leer `*p` es usar un puntero colgante." },
    { code: "void f() {\n  double* v = new double[100];\n  // ... sin delete[]\n}", bin: "fuga", explain: "Al salir de `f` muere el puntero `v` (stack), pero los 100 doubles siguen en el heap. Fuga." },
    { code: "int* crear() {\n  int x = 5;\n  return &x;\n}", bin: "colgante", explain: "`x` es local: muere al terminar la función. La dirección que se devuelve queda apuntando a nada válido." },
    { code: "double* v = new double[n];\n// ...\ndelete[] v;\nv = nullptr;", bin: "ok", explain: "`new[]` con `delete[]`, y después el puntero se deja en `nullptr`. Es la forma correcta." },
    { code: "int* p = new int(1);\nint* q = p;\ndelete p;\n*q = 3;", bin: "colgante", explain: "`q` y `p` apuntan al mismo lugar. Después del `delete p`, `q` también queda colgante." },
    { code: "int a = 4;\nint* p = &a;\n*p = 8;", bin: "ok", explain: "`p` apunta a una variable del stack que sigue viva. No hay `new`, así que no hay nada que liberar." },
    { code: "for (int i = 0; i < 10; i++) {\n  Bono* b = new Bono(100);\n}", bin: "fuga", explain: "Cada vuelta crea un `Bono` en el heap y pierde el puntero al terminar la vuelta. Son 10 fugas." },
    { code: "int* p = new int(3);\ndelete p;\ndelete p;", bin: "colgante", explain: "Doble `delete`: el segundo usa un puntero que ya estaba colgante. Es comportamiento indefinido." },
    { code: "int& ref() {\n  int x = 1;\n  return x;\n}", bin: "colgante", explain: "Devuelve una referencia a una variable local que ya murió. Es el equivalente con referencias del puntero colgante." },
    { code: "Bono b(100);\nBono* p = &b;\ncout << p->getNominal();", bin: "ok", explain: "`p` apunta a un objeto vivo del stack. `->` es la forma de llamar un método a través de un puntero." },
    { code: "int* p = (int*) malloc(8 * sizeof(int));\n// ...\nfree(p);", bin: "ok", explain: "`malloc` con su `free`. Correcto (aunque en C++ se prefiere `new`/`delete`)." },
    { code: "char* s = new char[10];\ns = nullptr;", bin: "fuga", explain: "Poner `nullptr` no libera nada: solo pierdes la dirección. Primero `delete[] s;`, después `s = nullptr;`." }
  ];

  /* =====================================================================
     NIVEL · VIDA DE UN OBJETO (carrera, generadas)
     ===================================================================== */
  const T_CLASS = "struct T {\n  char id;\n  T(char c) : id(c) { cout << id; }\n  ~T() { cout << id; }\n};\n";
  const OBJ_GENS = [
    function () {
      return mkQ("¿Qué imprime?", "struct T {\n  T()  { cout << \"C\"; }\n  ~T() { cout << \"D\"; }\n};\n\nint main() {\n  T a;\n  cout << \"M\";\n}",
        "CMD", ["CDM", "MCD"],
        "El constructor corre al crear `a` (C), después el resto de `main` (M), y el destructor al cerrar `}` (D).", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", T_CLASS + "\nint main() {\n  T a('1');\n  T b('2');\n}",
        "1221", ["1212", "2112"],
        "Se construyen en orden (1, 2) y se destruyen en orden inverso (2, 1), como una pila.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", T_CLASS + "\nint main() {\n  { T a('1'); }\n  T b('2');\n}",
        "1122", ["1221", "1212"],
        "`a` vive solo dentro de sus llaves: se construye y se destruye ahí mismo (11). Después nace y muere `b` (22).", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", T_CLASS + "\nint main() {\n  T* p = new T('1');\n}   // sin delete",
        "1", ["11", "nada"],
        "Lo creado con `new` no se destruye solo: sin `delete` el destructor nunca corre (y hay fuga de memoria).", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", T_CLASS + "\nint main() {\n  T* p = new T('1');\n  delete p;\n  cout << \"M\";\n}",
        "11M", ["1M1", "M11"],
        "`delete p` llama al destructor en ese momento, antes del `cout`.", 3);
    },
    function () {
      const ref = Math.random() < 0.5;
      return mkQ("¿Qué imprime?", `struct Contador { int n = 0; };\n\nvoid sumar(Contador${ref ? "&" : ""} c) { c.n++; }\n\nint main() {\n  Contador k;\n  sumar(k);\n  cout << k.n;\n}`,
        ref ? 1 : 0, [ref ? 0 : 1, "No compila"],
        ref ? "Por referencia, `c` es el mismo objeto `k`: queda en 1." : "Los objetos también se pasan por valor (copia) si no hay `&`. Se modifica la copia y `k.n` sigue en 0.", 3);
    },
    function () {
      const k = rnd(2, 4);
      const names = ["a", "b", "c", "d"].slice(0, k).join(", ");
      return mkQ("¿Qué imprime?", `struct Op {\n  static int total;\n  Op() { total++; }\n};\nint Op::total = 0;\n\nint main() {\n  Op ${names};\n  cout << Op::total;\n}`,
        k, [1, 0],
        `Un miembro \`static\` es uno solo para toda la clase. Cada constructor lo incrementa: ${k} objetos → ${k}.`, 3);
    },
    function () {
      return mkQ("¿Qué pasa?", "class Bono {\n  double F;\n};\n\nBono b;\nb.F = 100;",
        "No compila", ["F = 100", "Error al ejecutar"],
        "En una `class` los miembros son privados por defecto. Desde afuera no se puede acceder a `F`.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "struct Bono {\n  double F;\n};\n\nBono b;\nb.F = 100;\ncout << b.F;",
        100, ["No compila", 0],
        "En un `struct` los miembros son públicos por defecto. Es la única diferencia real con `class`.", 3);
    },
    function () {
      return mkQ("¿Qué pasa?", "class Bono {\n  double F;\npublic:\n  double precio() const {\n    F = 0;\n    return 1;\n  }\n};",
        "No compila", ["F = 0", "Retorna 1"],
        "Un método `const` promete no modificar el objeto. Asignar `F = 0` adentro rompe la promesa y el compilador lo rechaza.", 3);
    },
    function () {
      const v = rnd(2, 9) * 10;
      return mkQ("¿Qué imprime?", `class Bono {\n  double F;\npublic:\n  Bono() : F(100) {}\n  void setF(double F) { F = F; }\n  double getF() const { return F; }\n};\n\nBono b;\nb.setF(${v});\ncout << b.getF();`,
        100, [v, "basura"],
        "Dentro de `setF`, `F` se refiere al parámetro, que oculta al atributo. `F = F` no hace nada útil. Lo correcto es `this->F = F;`.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "struct T {\n  T() { cout << \"C\"; }\n};\n\nint main() {\n  T v[3];\n}",
        "CCC", ["C", "nada"],
        "Un arreglo de objetos llama al constructor una vez por cada elemento.", 3);
    },
    function () {
      const f = pick([["Bono b;", 100], ["Bono b(50);", 50]]);
      return mkQ("¿Cuánto vale `b.getF()`?", `class Bono {\n  double F;\npublic:\n  Bono(double F = 100) : F(F) {}\n  double getF() const { return F; }\n};\n\n${f[0]}`,
        f[1], [f[1] === 100 ? 0 : 100, "No compila"],
        f[1] === 100 ? "El constructor tiene argumento por defecto: sin parámetros, `F` toma 100." : "Se pasó 50, que reemplaza el valor por defecto.", 3);
    }
  ];

  /* =====================================================================
     JEFES · preguntas conceptuales cortas (estilo prueba)
     Etiqueta: F fundamentos, C funciones/control/arreglos, M memoria, P clases
     ===================================================================== */
  const BOSS_BANK = [
    ["1", "¿Qué librería hay que incluir para usar `std::string`?", ["<string>", "<cstring>", "<iostream>", "<cmath>"], 0,
      "`<string>` trae la clase `std::string`. `<cstring>` es la de funciones para cadenas C como `strlen`."],
    ["2", "¿Para qué sirve `#ifndef / #define / #endif` en un header?", ["Evitar que se incluya dos veces", "Definir constantes globales", "Acelerar la ejecución", "Declarar el main"], 0,
      "Son include guards: si el header ya se incluyó, el preprocesador se salta su contenido."],
    ["2", "¿Qué va normalmente en un archivo `.h`?", ["Declaraciones y prototipos", "Solo el main", "El código compilado", "Las implementaciones largas"], 0,
      "El `.h` declara qué existe (interfaz). El `.cpp` define cómo funciona (implementación)."],
    ["1", "¿Qué hace `std::` delante de `cout`?", ["Indica el espacio de nombres estándar", "Imprime en pantalla", "Declara un puntero", "Incluye una librería"], 0,
      "`std` es el namespace de la librería estándar. `using namespace std;` permite omitirlo."],
    ["2", "¿Qué hace el operador `%`?", ["Entrega el resto de la división entera", "Calcula porcentajes", "Divide con decimales", "Eleva a potencia"], 0,
      "`7 % 3` = 1. Solo funciona con enteros."],
    ["1", "¿Qué tipo usarías para un precio con decimales?", ["double", "int", "bool", "char"], 0,
      "`double` guarda números reales con unos 15 dígitos de precisión."],
    ["1", "¿Qué valores puede tomar un `bool`?", ["true o false", "Cualquier entero", "Solo 1", "Texto"], 0,
      "`bool` es verdadero o falso. Al imprimirlo con `cout` aparece 1 o 0."],
    ["4", "Si una variable se declara dentro de un `for`, ¿existe después del ciclo?", ["No, su ámbito es el ciclo", "Sí, siempre", "Solo si es int", "Solo si es global"], 0,
      "Las variables viven dentro del bloque donde se declaran."],
    ["1", "¿Cuántos bytes ocupa normalmente un `int`?", ["4", "2", "8", "1"], 0,
      "En los compiladores actuales un `int` ocupa 4 bytes (32 bits)."],
    ["2", "`int x = 3.9;` ¿cuánto vale `x`?", ["3", "4", "3.9", "No compila"], 0,
      "Al pasar de decimal a entero se trunca, no se redondea."],
    ["2", "Diferencia entre `i++` y `++i`:", ["i++ entrega el valor antes de sumar", "Son idénticos siempre", "++i no existe en C++", "i++ suma 2"], 0,
      "Ambos suman 1, pero `i++` entrega el valor viejo y `++i` el nuevo. Solo importa si usas el resultado."],
    ["2", "¿Qué hace `cin >> x;`?", ["Lee un valor del teclado y lo guarda en x", "Imprime x", "Borra x", "Compara x con la entrada"], 0,
      "`cin` es el flujo de entrada estándar; `>>` extrae un valor hacia la variable."],
    ["1", "¿Qué pasa al restar 1 a un `unsigned` que vale 0?", ["Da la vuelta al valor máximo", "Queda en -1", "Queda en 0", "No compila"], 0,
      "Los `unsigned` no tienen negativos: hacen overflow y vuelven al máximo."],
    ["1", "`#define` es una instrucción del…", ["Preprocesador", "Linker", "Sistema operativo", "Depurador"], 0,
      "Las líneas con `#` las procesa el preprocesador antes de compilar: reemplazan texto."],
    ["2", "¿Para qué sirve `stringstream`?", ["Tratar un texto como flujo para leer o escribir", "Ordenar arreglos", "Reservar memoria", "Crear clases"], 0,
      "Permite usar `>>` y `<<` sobre un string, por ejemplo para convertir \"12\" en el número 12."],
    ["2", "Diferencia entre `=` y `==`:", ["= asigna, == compara", "Son iguales", "== asigna, = compara", "= solo sirve con int"], 0,
      "Confundirlos dentro de un `if` compila igual y es un error clásico."],

    ["3", "Paso por valor significa que la función recibe…", ["Una copia del argumento", "La dirección del argumento", "Un alias del argumento", "Un puntero nulo"], 0,
      "Por valor = copia. Cambiarla dentro de la función no afecta la variable original."],
    ["3", "¿Cuándo conviene pasar por referencia `const&`?", ["Objetos grandes que no se modifican", "Enteros que se modifican", "Siempre con int", "Nunca"], 0,
      "`const&` evita copiar algo pesado (como un vector o string) y garantiza que la función no lo cambie."],
    ["3", "¿Qué es la sobrecarga de funciones?", ["Mismo nombre, distintos parámetros", "Una función que se llama a sí misma", "Una función sin retorno", "Una función en el .h"], 0,
      "Sobrecarga: varias funciones con el mismo nombre que se distinguen por el número o tipo de parámetros."],
    ["3", "¿Qué necesita toda función recursiva para terminar?", ["Un caso base", "Un ciclo for", "Un puntero", "Un return void"], 0,
      "Sin caso base la función se llama para siempre y llena el stack (stack overflow)."],
    ["4", "Diferencia entre `while` y `do-while`:", ["do-while ejecuta al menos una vez", "while ejecuta al menos una vez", "do-while no tiene condición", "Son idénticos"], 0,
      "`do-while` revisa la condición al final, así que el cuerpo corre como mínimo una vez."],
    ["4", "¿Qué hace `continue` dentro de un ciclo?", ["Salta a la siguiente iteración", "Sale del ciclo", "Termina el programa", "Repite la iteración actual"], 0,
      "`continue` salta el resto del cuerpo y pasa a la siguiente vuelta. `break` es el que sale del ciclo."],
    ["4", "¿Qué hace `break` dentro de un ciclo?", ["Sale del ciclo", "Salta a la siguiente vuelta", "Termina el programa", "Reinicia el ciclo"], 0,
      "`break` termina el ciclo (o el `switch`) más cercano y sigue con lo que viene después."],
    ["4", "En un `switch`, ¿qué pasa si un `case` no tiene `break`?", ["Sigue ejecutando el siguiente case", "No compila", "Vuelve al inicio", "Sale del switch"], 0,
      "Se llama fall-through: la ejecución continúa en los case siguientes hasta encontrar un `break`."],
    ["4", "¿Con qué carácter termina una cadena estilo C?", ["'\\0'", "'\\n'", "' '", "'.'"], 0,
      "El carácter nulo `'\\0'` marca el fin. Por eso `char s[5]` alcanza para una palabra de 4 letras."],
    ["4", "¿Cuál es el índice del primer elemento de un arreglo en C++?", ["0", "1", "-1", "Depende del tipo"], 0,
      "Los arreglos parten en 0. Un arreglo de tamaño n va de 0 a n − 1."],
    ["3", "¿Qué hace una función declarada `inline`?", ["Sugiere copiar su cuerpo donde se llama", "La hace recursiva", "La vuelve privada", "La ejecuta en paralelo"], 0,
      "Es una sugerencia al compilador para evitar el costo de la llamada; se usa en funciones cortas y va en el header."],
    ["3", "¿Qué es un prototipo de función?", ["Su declaración sin cuerpo, terminada en ;", "Una función vacía", "La primera versión del programa", "Un puntero a función"], 0,
      "El prototipo le avisa al compilador el nombre, tipos de parámetros y retorno antes de que la función se defina."],
    ["4", "Al pasar un arreglo a una función…", ["Se pasa su dirección: la función puede modificarlo", "Se copia entero", "No se puede", "Se convierte en string"], 0,
      "El arreglo 'decae' a un puntero a su primer elemento. Por eso también conviene pasar su tamaño."],
    ["4", "¿Qué función compara dos cadenas C?", ["strcmp", "strlen", "strcat", "strcpy"], 0,
      "`strcmp` entrega 0 si son iguales. Con cadenas C, `==` compara direcciones, no el texto."],
    ["3", "Los argumentos por defecto deben ir…", ["Al final de la lista de parámetros", "Al inicio", "En cualquier orden", "Solo en el .cpp"], 0,
      "Si un parámetro tiene valor por defecto, todos los que vienen después también deben tenerlo."],

    ["M", "¿Qué guarda un puntero?", ["Una dirección de memoria", "Una copia del valor", "El tipo de dato", "El nombre de la variable"], 0,
      "Un puntero almacena la dirección donde está otro dato. Con `*` accedes al dato."],
    ["M", "¿Qué hace el operador `&` delante de una variable (`&x`)?", ["Entrega su dirección", "La desreferencia", "La copia", "La borra"], 0,
      "`&x` es la dirección de `x`. En una declaración (`int& r`) significa otra cosa: referencia."],
    ["M", "¿Qué es una referencia (`int& r = x;`)?", ["Otro nombre para x", "Una copia de x", "Un puntero nulo", "Un arreglo"], 0,
      "Una referencia es un alias: debe inicializarse y no se puede reasignar a otra variable."],
    ["M", "¿Dónde se guarda lo que se crea con `new`?", ["En el heap", "En el stack", "En el disco", "En el registro"], 0,
      "`new` pide memoria dinámica al heap; dura hasta que la liberas con `delete`."],
    ["M", "¿Qué es una fuga de memoria (memory leak)?", ["Memoria del heap que nunca se libera", "Un puntero nulo", "Un arreglo muy grande", "Un error de sintaxis"], 0,
      "Si pierdes el último puntero a memoria hecha con `new` sin hacer `delete`, ya no la puedes liberar."],
    ["M", "¿Qué es un puntero colgante (dangling)?", ["Apunta a memoria ya liberada", "Vale nullptr", "Apunta a un int", "No tiene tipo"], 0,
      "Tras `delete p;`, `p` sigue guardando la dirección vieja. Usarlo es comportamiento indefinido."],
    ["M", "¿Cómo se libera `int* v = new int[10];`?", ["delete[] v;", "delete v;", "free(v);", "v = 0;"], 0,
      "Lo que se pide con `new[]` se libera con `delete[]`."],
    ["M", "¿Para qué sirve `nullptr`?", ["Indicar que un puntero no apunta a nada", "Liberar memoria", "Crear un objeto", "Declarar una referencia"], 0,
      "Inicializar o resetear punteros con `nullptr` permite chequear `if (p)` antes de usarlos."],
    ["M", "Lo pedido con `malloc` se libera con…", ["free", "delete", "delete[]", "nullptr"], 0,
      "Cada par va junto: `malloc`/`free`, `new`/`delete`, `new[]`/`delete[]`."],
    ["M", "Las variables locales (stack) se liberan…", ["Solas, al salir de su ámbito", "Con delete", "Con free", "Nunca"], 0,
      "El stack se maneja solo: al terminar el bloque, sus variables desaparecen."],
    ["M", "`int* p;` sin inicializar apunta a…", ["Una dirección basura", "nullptr, siempre", "La variable anterior", "Un int nuevo"], 0,
      "Un puntero local sin inicializar tiene basura. Por eso se recomienda `int* p = nullptr;`."],
    ["M", "Devolver la dirección de una variable local…", ["Deja un puntero colgante", "Es la forma correcta", "Crea una copia en el heap", "Libera la variable"], 0,
      "La variable local muere al salir de la función; la dirección queda apuntando a memoria inválida."],
    ["M", "`const int* p` significa…", ["No se puede modificar *p a través de p", "p no puede cambiar de dirección", "p es nulo", "*p vale 0"], 0,
      "`const` a la izquierda del `*` protege el dato; a la derecha (`int* const p`) protege el puntero."],

    ["P", "¿Qué es una clase?", ["Un molde que define datos y comportamiento", "Una variable global", "Una función recursiva", "Un archivo .h"], 0,
      "La clase es el molde; cada objeto es una instancia concreta de ese molde."],
    ["P", "¿Para qué sirve el constructor?", ["Inicializar el objeto al crearlo", "Destruir el objeto", "Copiar el header", "Imprimir el objeto"], 0,
      "El constructor tiene el mismo nombre que la clase, no tiene tipo de retorno y se llama solo al crear el objeto."],
    ["P", "¿Por qué los atributos suelen ser `private`?", ["Encapsulamiento: controlar el acceso", "Para que corra más rápido", "Porque public no compila", "Para usar menos memoria"], 0,
      "Así solo los métodos de la clase pueden cambiarlos, validando que el objeto quede consistente."],
    ["P", "¿Qué significa `const` al final de un método?", ["No modifica los atributos", "Retorna una constante", "No recibe parámetros", "Es estático"], 0,
      "Un método `const` promete no cambiar el estado del objeto; se puede llamar sobre objetos constantes."],
    ["P", "¿Cuándo se llama al destructor de un objeto local?", ["Al salir de su ámbito", "Nunca", "Al compilar", "Al crear otro objeto"], 0,
      "Los objetos del stack se destruyen solos al terminar el bloque `{ }`; los del heap, al hacer `delete`."],
    ["P", "En un `struct`, los miembros por defecto son…", ["public", "private", "protected", "const"], 0,
      "Es la única diferencia con `class`, donde por defecto son `private`."],
    ["P", "¿Qué es `this` dentro de un método?", ["Un puntero al objeto actual", "Una copia del objeto", "La clase base", "Un atributo"], 0,
      "`this->F` distingue el atributo `F` de un parámetro con el mismo nombre."],
    ["P", "Un miembro `static`…", ["Es compartido por todos los objetos de la clase", "Es distinto en cada objeto", "No se puede modificar", "Vive en el heap"], 0,
      "Sirve, por ejemplo, para contar cuántos objetos se han creado."],
    ["P", "Los objetos locales se destruyen en orden…", ["Inverso al de creación", "Igual al de creación", "Al azar", "Alfabético"], 0,
      "Como en una pila: el último en construirse es el primero en destruirse."],
    ["P", "¿Qué es un objeto?", ["Una instancia de una clase", "Un archivo .cpp", "Un tipo primitivo", "Una función"], 0,
      "`Bono b(100);` crea el objeto `b`, una instancia de la clase `Bono`."]
  ];

  function bossQuestions(tags, n) {
    const pool = BOSS_BANK.filter(q => tags.includes(q[0]));
    return shuffle(pool).slice(0, n).map(([, ask, opts, ans, explain]) => {
      const correct = opts[ans];
      const sh = shuffle(opts);
      return { ask, code: "", options: sh, answer: sh.indexOf(correct), correctText: correct, explain };
    });
  }

  function fromGens(gens, n) {
    // Mezcla los generadores para no repetir el mismo tipo seguido
    const order = shuffle(gens);
    const out = [];
    for (let i = 0; i < n; i++) out.push(order[i % order.length]());
    return out;
  }
  // Para clasificadores donde el código está en el panel: el bloque que cae va sin texto (anon),
  // así no delata la respuesta; lleva monitos corriendo adentro.
  function cases(items, n, ask) {
    return shuffle(items).slice(0, n).map((it, i) => Object.assign({ label: `caso #${i + 1}`, anon: true, ask }, it));
  }

  /* #####################################################################
     CAMPAÑA · "Bases de C++, estructuras de programación y funciones"
     16 niveles (uno por sección del resumen; las secciones largas se dividen en dos),
     un jefe cada 4 niveles y el último jefe es el final.
     ##################################################################### */

  /* ---------- 1 · Estructura de un programa (clasificador) ---------- */
  const STRUCT_ITEMS = [
    { code: "#include <iostream>", ask: "¿Quién procesa esta línea?", bin: "pre",
      explain: "Las líneas que empiezan con `#` son directivas: el preprocesador copia ahí el contenido del header, antes de compilar." },
    { code: "#define PI 3.14159", ask: "¿Quién procesa esta línea?", bin: "pre",
      explain: "Una macro es sustitución de texto que hace el preprocesador. Por eso no lleva `;`." },
    { code: "#ifndef CALC_H\n#define CALC_H\n// ...\n#endif", ask: "¿Quién evalúa esta guarda de inclusión?", bin: "pre",
      explain: "`#ifndef`, `#define` y `#endif` son directivas: el preprocesador decide si copia o se salta el contenido del header." },
    { code: "#define NEWLINE '\\n'\ncout << \"Hola\" << NEWLINE;", ask: "¿Quién reemplaza `NEWLINE` por `'\\n'`?", bin: "pre",
      explain: "El preprocesador reemplaza el texto de la macro en cada uso antes de que el compilador vea el código." },
    { code: "int x = 5\ncout << x;", ask: "¿Quién reclama por este error?", bin: "comp",
      explain: "Falta el `;`. Es un error de sintaxis y lo detecta el compilador." },
    { code: "int main() {\n  cout << \"Hola\";\n}   // sin #include <iostream>", ask: "¿Quién reclama por este error?", bin: "comp",
      explain: "Sin el header, el compilador no conoce `cout` (\"was not declared\"). Es un error de compilación." },
    { code: "std::string s = \"bono\";\nint n = s;", ask: "¿Quién reclama por este error?", bin: "comp",
      explain: "Tipos incompatibles: el compilador verifica los tipos y rechaza guardar un `string` en un `int`." },
    { code: "cout << y;   // y nunca se declaró", ask: "¿Quién reclama por este error?", bin: "comp",
      explain: "Usar un nombre no declarado es un error de compilación." },
    { code: "using namespace std;", ask: "¿Quién usa esta línea? (no empieza con #)", bin: "comp",
      explain: "No es una directiva: es una instrucción para el compilador, que buscará nombres en `std`. No incluye ningún archivo." },
    { code: "double add(double a, double b);   // prototipo\nint main() { return add(2, 3); }\n// add nunca se definió", ask: "¿Quién reclama por este error?", bin: "link",
      explain: "Compila porque el prototipo existe, pero al armar el ejecutable falta la definición: \"undefined reference to add\". Es error del enlazador." },
    { code: "// calc.cpp tiene el cuerpo de add, pero:\ng++ main.cpp -o programa", ask: "¿Quién reclama por este error?", bin: "link",
      explain: "`calc.cpp` no se compiló ni se enlazó, así que falta la definición de `add` al unir el programa." },
    { code: "// a.cpp y b.cpp definen los dos:\nint square(int x) { return x * x; }", ask: "¿Quién reclama por este error?", bin: "link",
      explain: "Cada función se define en un solo `.cpp`. Dos definiciones chocan al enlazar (\"multiple definition\")." },
    { code: "programa.o + biblioteca estándar  →  ./programa", ask: "¿Quién une el código objeto en un ejecutable?", bin: "link",
      explain: "El enlazador (linker) junta los `.o` y las bibliotecas en el ejecutable final." }
  ];

  /* ---------- 2 · Variables y ámbito (carrera) ---------- */
  const VAR_GENS = [
    function () {
      const a = rnd(3, 9), b = rnd(1, a - 1);
      return mkQ("¿Cuánto vale `result`?", `int a = ${a};\nint b = ${b};\na = a + 1;\nint result = a - b;`,
        a + 1 - b, [a - b, a + 1 + b],
        `Traza: a = ${a}, b = ${b}; luego a = ${a + 1}; result = ${a + 1} − ${b} = ${a + 1 - b}.`, 3);
    },
    function () {
      const a = rnd(1, 5), b = rnd(6, 9), c = rnd(10, 20);
      return mkQ("¿Cuánto vale `a` al final?", `int a = ${a}, b = ${b};\na = b;\nb = ${c};`,
        b, [a, c],
        `\`a = b\` copia el valor que \`b\` tenía en ese momento (${b}). Después \`a\` y \`b\` no quedan conectados: cambiar \`b\` no cambia \`a\`.`, 3);
    },
    function () {
      const bad = pick([["2result", "empieza con un dígito"], ["tasa anual", "tiene un espacio"], ["int", "es una palabra clave"], ["precio-final", "tiene un guion (es una resta)"], ["for", "es una palabra clave"]]);
      const good = shuffle(["_total", "result_2", "Result", "tasaAnual", "precio_final", "x1"]).slice(0, 2);
      return mkQ("¿Cuál identificador es INVÁLIDO?", "",
        bad[0], good,
        `\`${bad[0]}\` no sirve porque ${bad[1]}. Un identificador usa letras, dígitos y \`_\`, y empieza con letra o \`_\`.`, 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "int result = 1;\nint Result = 2;\ncout << result;",
        1, [2, "No compila"],
        "C++ distingue mayúsculas de minúsculas: `result` y `Result` son dos variables distintas.", 3);
    },
    function () {
      const t = rnd(5, 15), i = rnd(1, 5);
      return mkQ("¿Qué imprime?", `int total = ${t};\n{\n  int increment = ${i};\n  total = total + increment;\n}\ncout << total;`,
        t + i, [t, "No compila"],
        `Desde el bloque interior se ve hacia afuera, así que modifica \`total\`: ${t} + ${i} = ${t + i}.`, 3);
    },
    function () {
      return mkQ("¿Qué pasa?", "{\n  int increment = 2;\n}\ncout << increment;",
        "No compila", [2, 0],
        "`increment` solo existe dentro de sus llaves. Desde afuera no se ve hacia adentro.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "int main() {\n  int z;\n  cout << z;\n}",
        "indeterminado", [0, "No compila"],
        "Una variable local de tipo fundamental sin inicializar tiene un valor indeterminado (basura). Leerla es un error.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "int g;          // global\nint main() {\n  cout << g;\n}",
        0, ["indeterminado", "No compila"],
        "Las variables globales se inicializan en cero. Las locales no.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "string s;\ncout << s.size();",
        0, ["indeterminado", 1],
        "Un `std::string` sin inicializar queda vacío, no con basura. Su tamaño es 0.", 3);
    },
    function () {
      const x = rnd(5, 9), y = rnd(1, 4);
      return mkQ("¿Cuánto vale `z`?", `int x = ${x};\nint y(${y});\nint z;\nz = x - y;`,
        x - y, [x + y, "indeterminado"],
        `\`int y(${y})\` es inicialización directa, igual que \`int y = ${y}\`. Luego se asigna z = ${x} − ${y} = ${x - y}.`, 3);
    },
    function () {
      return mkQ("¿Qué pasa?", "void f() {\n  int k = 5;\n}\nint main() {\n  f();\n  cout << k;\n}",
        "No compila", [5, 0],
        "`k` es local de `f`. Otra función no puede usarla, aunque `f` ya se haya ejecutado.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "int x = 1;          // global\nvoid f() { x = 5; }\n\nint main() {\n  f();\n  cout << x;\n}",
        5, [1, "No compila"],
        "`x` es global: `f` modifica esa misma variable, así que `main` ve 5.", 3);
    }
  ];

  /* ---------- 3 · Tipos y literales numéricos (disparos) ---------- */
  const NUM_GENS = [
    function () {
      return mkQ("Dispara al valor de `x`", "int x = 010;",
        8, [10, 2, 16],
        "El cero inicial hace que el literal sea octal: 010₈ = 1·8 = 8, no diez.");
    },
    function () {
      const n = rnd(20, 250), h = n.toString(16);
      return mkQ("Dispara al valor de `x` (en decimal)", `int x = 0x${h};`,
        n, [n + 16, n - 1, /^\d+$/.test(h) ? Number(h) : n * 2],
        `\`0x\` indica base 16. ${h} en hexadecimal = ${h.split("").map((d, i, a) => `${parseInt(d, 16)}·16^${a.length - 1 - i}`).join(" + ")} = ${n}.`);
    },
    function () {
      const n = rnd(9, 63), o = n.toString(8);
      return mkQ("Dispara al valor de `x` (en decimal)", `int x = 0${o};`,
        n, [Number(o), n + 8, n - 1],
        `El 0 inicial indica base 8. ${o} en octal = ${o.split("").map((d, i, a) => `${d}·8^${a.length - 1 - i}`).join(" + ")} = ${n}.`);
    },
    function () {
      const t = pick([["char", 1, "siempre vale 1, por definición"], ["short", 2, "típicamente ocupa 2 bytes"], ["float", 4, "típicamente ocupa 4 bytes"], ["long long", 8, "ocupa 8 bytes"], ["bool", 1, "típicamente ocupa 1 byte"], ["double", 8, "típicamente ocupa 8 bytes"]]);
      return mkQ(`Dispara al valor de \`sizeof(${t[0]})\``, `cout << sizeof(${t[0]});`,
        t[1], [1, 2, 4, 8, 16].filter(x => x !== t[1]),
        `\`sizeof\` mide bytes. \`${t[0]}\` ${t[2]}.`);
    },
    function () {
      const r = pick([["Máximo de un `unsigned char` (8 bits)", 255, [256, 127, 128], "Sin signo, n bits: de 0 a 2ⁿ − 1 = 255."],
        ["Mínimo de un `signed char` (8 bits)", -128, [-127, 0, -255], "Con signo, n bits: de −2ⁿ⁻¹ a 2ⁿ⁻¹ − 1, o sea −128 a 127."],
        ["Máximo de un `short` (16 bits)", 32767, [65535, 32768, 65536], "Con signo, 16 bits: hasta 2¹⁵ − 1 = 32767."],
        ["Máximo de un `unsigned short` (16 bits)", 65535, [32767, 65536, 32768], "Sin signo, 16 bits: hasta 2¹⁶ − 1 = 65535."]]);
      return mkQ(`Dispara al ${r[0].charAt(0).toLowerCase() + r[0].slice(1)}`, "", r[1], r[2], r[3]);
    },
    function () {
      const v = rnd(17, 126), bits = v.toString(2).padStart(8, "0");
      const rev = parseInt(bits.split("").reverse().join(""), 2);
      return mkQ(`Dispara al valor decimal del byte \`${bits}\``, "// binario, 8 bits",
        v, [v + 1, rev === v ? v * 2 : rev, v - 2],
        `Suma las potencias de 2 donde hay un 1: ${bits.split("").map((b, i) => b === "1" ? 2 ** (7 - i) : null).filter(x => x !== null).join(" + ")} = ${v}.`);
    },
    function () {
      const l = pick([["3.14", "double", "Un literal con punto y sin sufijo es `double`."], ["3.0F", "float", "El sufijo F lo hace `float`."],
        ["75U", "unsigned int", "El sufijo U lo hace `unsigned`."], ["6.02e23", "double", "El exponente `e` lo hace de punto flotante; sin sufijo es `double`."],
        ["75", "int", "Un entero sin sufijo ni punto es `int`."], ["75L", "long", "El sufijo L en un entero lo hace `long`."]]);
      return mkQ(`Dispara al tipo del literal \`${l[0]}\``, "",
        l[1], ["double", "float", "int", "long", "unsigned int"].filter(x => x !== l[1]), l[2]);
    },
    function () {
      return mkQ("Dispara a lo que imprime", "bool ready = true, finished = false;\ncout << ready << finished;",
        "10", ["truefalse", "01", "1 0"],
        "Por defecto `cout` muestra los `bool` como 1 y 0. Sin espacio entre medio, sale 10.");
    },
    function () {
      return mkQ("Dispara al valor de la comparación", "0.1 + 0.2 == 0.3",
        "false", ["true", "0.3", "No compila"],
        "0,1 y 0,2 no se representan exacto en binario, así que la suma no es exactamente 0,3. Los flotantes se comparan con tolerancia: `fabs(a - b) < 1e-9`.");
    },
    function () {
      const e = pick([["1.6e-3", "0.0016"], ["2.5e2", "250"], ["7e-1", "0.7"]]);
      const wrong = { "0.0016": ["0.016", "1600", "0.00016"], "250": ["25", "2500", "0.025"], "0.7": ["7", "0.07", "70"] }[e[1]];
      return mkQ(`Dispara al valor de \`${e[0]}\``, `double v = ${e[0]};`,
        e[1], wrong,
        "`e` significa ×10 elevado a lo que sigue. Exponente negativo mueve la coma a la izquierda.");
    }
  ];

  /* ---------- 4 · Texto y constantes (carrera) ---------- */
  const TEXT_GENS = [
    function () {
      return mkQ("¿Qué imprime?", "char x = 'A';\ncout << x << ' ' << 'x';",
        "A x", ["x A", "A A"],
        "Sin comillas, `x` es la variable (vale 'A'). Con comillas, `'x'` es la letra x.", 3);
    },
    function () {
      return mkQ("¿Qué hay entre Izq y Der?", "cout << \"Izq\\tDer\";",
        "una tabulación", ["un salto de línea", "los caracteres \\t"],
        "`\\t` es una secuencia de escape: produce una tabulación horizontal.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "cout << \"Hola \" \"mundo\";",
        "Hola mundo", ["No compila", "Hola"],
        "Los literales de cadena escritos uno al lado del otro se concatenan solos.", 3);
    },
    function () {
      const c = pick([["\\x4A", "J", 74], ["\\x41", "A", 65], ["\\x61", "a", 97]]);
      return mkQ("¿Qué imprime?", `char c = '${c[0]}';\ncout << c;`,
        c[1], [c[0].slice(2), c[2]],
        `\`\\x\` da el código en hexadecimal: ${c[0].slice(2)}₁₆ = ${c[2]}, que en ASCII es '${c[1]}'. Como es \`char\`, se imprime la letra.`, 3);
    },
    function () {
      const c = pick([["'0'", 48, [0, 1]], ["'a'", 97, [65, 1]], ["' '", 32, [0, 1]], ["'A'", 65, [97, 1]]]);
      return mkQ("¿Qué imprime?", `cout << (int) ${c[0]};`,
        c[1], c[2],
        "Convertir un `char` a `int` muestra su código ASCII: 'A' = 65, 'a' = 97, '0' = 48, espacio = 32.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "string m = \"Inicial\";\nm = \"Otro\";\ncout << m;",
        "Otro", ["InicialOtro", "Inicial"],
        "Asignar un `string` reemplaza su contenido completo.", 3);
    },
    function () {
      const p = pick([["bo", "no"], ["sw", "ap"], ["ta", "sa"]]);
      return mkQ("¿Qué imprime?", `string a = "${p[0]}", b = "${p[1]}";\ncout << a + b;`,
        p[0] + p[1], [`${p[0]} ${p[1]}`, "No compila"],
        "Con `std::string`, `+` concatena sin agregar espacios.", 3);
    },
    function () {
      const w = pick(["tasa", "swap", "bono", "call"]), k = rnd(0, 3);
      return mkQ("¿Qué imprime?", `string s = "${w}";\ncout << s[${k}];`,
        w[k], [...w.split("").filter(c => c !== w[k]), "x"].slice(0, 1).concat([w.length]),
        `\`s[i]\` es el carácter en la posición i, contando desde 0: s[${k}] = '${w[k]}'.`, 3);
    },
    function () {
      return mkQ("¿Qué pasa?", "const double pi = 3.14159;\npi = 3;",
        "No compila", ["pi = 3", "pi = 3.14159"],
        "Una constante `const` no se puede modificar después de su declaración.", 3);
    },
    function () {
      return mkQ("¿Qué pasa?", "#define TASA 0.05;\ndouble r = TASA * 2;",
        "No compila", ["r = 0.1", "r = 0.05"],
        "El `;` es parte del texto de la macro: queda `double r = 0.05; * 2;`, que no compila. Las directivas no llevan `;`.", 3);
    },
    function () {
      return mkQ("¿Qué tipo tiene `'z'`?", "char letter = 'z';",
        "char", ["string", "int"],
        "Comillas simples: un solo carácter (`char`). Comillas dobles: una cadena.", 3);
    },
    function () {
      return mkQ("¿Cuál se prefiere en C++ para una constante?", "const double pi = 3.14159;\n#define PI 3.14159",
        "const", ["#define", "Da lo mismo"],
        "`const` tiene tipo, respeta el ámbito y lo verifica el compilador. `#define` es solo reemplazo de texto.", 3);
    }
  ];

  /* ---------- 5 · Operadores aritméticos y asignación (carrera) ---------- */
  const ARITH_GENS = [
    TYPES_GENS[0], TYPES_GENS[1], TYPES_GENS[6], CTRL_GENS[8], CTRL_GENS[9],
    function () {
      const v = rnd(3, 8);
      return mkQ("¿Cuánto vale `a`?", `int a, b;\na = 2 + (b = ${v});`,
        2 + v, [v, 2],
        `La asignación es una expresión que vale lo asignado: \`b = ${v}\` vale ${v}, entonces a = 2 + ${v} = ${2 + v}.`, 3);
    },
    function () {
      const k = rnd(2, 9);
      return mkQ("¿Cuánto vale `a`?", `int a, b, c;\na = b = c = ${k};`,
        k, [0, "No compila"],
        "La asignación se agrupa de derecha a izquierda: `a = (b = (c = " + k + "))`. Las tres quedan en " + k + ".", 3);
    },
    function () {
      const p = pick([["-7 / 2", -3, [-4, -3.5]], ["-7 % 2", -1, [1, 3]], ["-9 / 4", -2, [-3, -2.25]]]);
      return mkQ("¿Qué imprime?", `cout << ${p[0]};`,
        p[1], p[2],
        "La división entera trunca hacia cero y el resto toma el signo del dividendo: a = (a / b)·b + a % b.", 3);
    },
    function () {
      return mkQ("¿Cuánto vale `y`?", "double y = 180 / 360;",
        0, [0.5, "No compila"],
        "Error frecuente: 180 / 360 se calcula entre enteros (= 0) antes de guardarse en el `double`. Hay que escribir 180.0 / 360.", 3);
    },
    function () {
      const v = pick([["5 / 2 * 2.0", 4, [5, 2]], ["2.0 * 5 / 2", 5, [4, 2]]]);
      return mkQ("¿Qué imprime?", `cout << ${v[0]};`,
        v[1], v[2],
        "Se evalúa de izquierda a derecha: el tipo de cada paso depende de los operandos de ese paso. 5 / 2 es entero (2); 2.0 * 5 es real (10.0).", 3);
    },
    function () {
      const p = rnd(2, 6), u = rnd(2, 5);
      return mkQ("¿Cuánto vale `price`?", `int price = ${p}, units = ${u};\nprice *= units + 1;`,
        p * (u + 1), [p * u + 1, p * u],
        `\`price *= units + 1\` es \`price = price * (units + 1)\`: el lado derecho se evalúa completo primero. ${p}·${u + 1} = ${p * (u + 1)}.`, 3);
    },
    function () {
      return mkQ("¿Cuánto vale `value` al final?", "int value = 3;\nvalue += 2;\nvalue *= 4;\nvalue -= 5;\nvalue /= 3;\nvalue %= 4;",
        1, [5, 15],
        "Paso a paso: 3 → 5 → 20 → 15 → 5 → 5 % 4 = 1.", 3);
    }
  ];

  /* ---------- 6 · Lógica, bits, conversiones y precedencia (disparos) ---------- */
  const LOGIC_GENS = [
    function () {
      return mkQ("Dispara al valor final de `i`", "int i = 10, n = 20;\nbool b = (i < 10) && (++i < n);",
        10, [11, 0, 1],
        "Cortocircuito: `i < 10` es falso, así que `&&` ya sabe que el resultado es falso y no evalúa `++i`.");
    },
    function () {
      const k = rnd(3, 8);
      return mkQ("Dispara al valor final de `i`", `int i = ${k}, n = 20;\nbool b = (i < 10) && (++i < n);`,
        k + 1, [k, 10, 0],
        `\`i < 10\` es verdadero, así que se evalúa también la derecha y \`++i\` corre: i = ${k + 1}.`);
    },
    function () {
      const a = rnd(1, 9), b = rnd(10, 19);
      const [x, y] = Math.random() < 0.5 ? [a, b] : [b, a];
      return mkQ("Dispara al valor de `m`", `int a = ${x}, b = ${y};\nint m = (a > b) ? a : b;`,
        Math.max(x, y), [Math.min(x, y), x + y, "No compila"],
        "`cond ? A : B` entrega A si la condición es verdadera y B si no. Aquí calcula el máximo.");
    },
    function () {
      const v = rnd(2, 6), d = rnd(1, 4);
      return mkQ("Dispara al valor de `x`", `int x, y;\nx = (y = ${v}, y + ${d});`,
        v + d, [v, d, "No compila"],
        `El operador coma evalúa de izquierda a derecha y vale lo último: y = ${v}, luego x = ${v} + ${d} = ${v + d}.`);
    },
    function () {
      const a = rnd(3, 15), b = rnd(1, 15), op = pick(["&", "|", "^"]);
      const r = op === "&" ? a & b : op === "|" ? a | b : a ^ b;
      const name = { "&": "Y", "|": "O", "^": "XOR" }[op];
      const others = [a & b, a | b, a ^ b, a + b].filter(x => x !== r);
      return mkQ(`Dispara al valor de \`${a} ${op} ${b}\``, `// ${a} = ${a.toString(2).padStart(4, "0")}₂   ${b} = ${b.toString(2).padStart(4, "0")}₂`,
        r, others,
        `Bit a bit (${name}) sobre ${a.toString(2).padStart(4, "0")} y ${b.toString(2).padStart(4, "0")} da ${r.toString(2).padStart(4, "0")} = ${r}.`);
    },
    function () {
      return mkQ("Dispara a lo que imprime", "cout << (2 ^ 3);",
        1, [8, 6, 5],
        "`^` NO es potencia: es XOR bit a bit. 10 ^ 11 = 01 = 1. Para potencias se usa `pow` de `<cmath>`.");
    },
    function () {
      const k = rnd(1, 5), s = rnd(1, 3);
      return mkQ("Dispara a lo que imprime", `cout << (${k} << ${s});`,
        k * 2 ** s, [k * s, `${k}${s}`, k + s],
        `\`x << k\` desplaza los bits k lugares a la izquierda, o sea multiplica por 2ᵏ: ${k}·${2 ** s} = ${k * 2 ** s}.`);
    },
    function () {
      const k = rnd(1, 5), s = rnd(1, 3);
      return mkQ("Dispara a lo que imprime", `cout << ${k} << ${s};`,
        `${k}${s}`, [k * 2 ** s, k * s, "No compila"],
        `Sin paréntesis, \`<<\` es la inserción en el flujo: imprime ${k} y después ${s}, o sea "${k}${s}".`);
    },
    function () {
      return mkQ("Dispara al valor de `k`", "int k = (int) -3.99;",
        -3, [-4, -3.99, 3],
        "Convertir de flotante a entero descarta la parte decimal hacia cero: −3,99 → −3. No redondea.");
    },
    function () {
      const a = rnd(2, 9), b = rnd(3, 9), c = pick([2, 3]);
      const par = Math.random() < 0.5;
      const val = par ? (a + b) % c : a + (b % c);
      return mkQ("Dispara a lo que imprime", par ? `cout << (${a} + ${b}) % ${c};` : `cout << ${a} + ${b} % ${c};`,
        val, [par ? a + (b % c) : (a + b) % c, a + b, (a + b) / c | 0],
        par ? `Los paréntesis obligan a sumar primero: ${a + b} % ${c} = ${val}.` : `\`%\` tiene más precedencia que \`+\`: ${b} % ${c} = ${b % c}, más ${a} = ${val}.`);
    },
    function () {
      return mkQ("Dispara a lo que imprime", "cout << ((5 == 5) && (3 > 6));",
        "0", ["1", "false", "true"],
        "Verdadero && falso = falso. `cout` muestra los `bool` como 1 y 0, así que imprime 0.");
    },
    function () {
      return mkQ("Dispara al valor final de `b`", "int a = 2, b = 3;\nbool result = ((b = 2) == a);",
        2, [3, "true", 0],
        "`b = 2` asigna (no compara): ahora `b` vale 2. Recién después se compara con `a`.");
    }
  ];

  /* ---------- 7 · Entrada, salida y stringstream (carrera) ---------- */
  const IO_GENS = [
    function () {
      const a = rnd(10, 20), b = rnd(1, 9);
      return mkQ("¿Qué imprime?", `int a, b;\ncin >> a >> b;       // entrada: ${a} ${b}\ncout << a - b;`,
        a - b, [`${a}${b}`, a + b],
        `\`>>\` separa por espacios: a = ${a}, b = ${b}. Es igual que \`cin >> a; cin >> b;\`.`, 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "string w;\ncin >> w;            // entrada: Hola mundo\ncout << w;",
        "Hola", ["Hola mundo", "mundo"],
        "`cin >> palabra` lee una sola palabra: se detiene en el primer espacio.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "string s;\ngetline(cin, s);     // entrada: Hola mundo\ncout << s;",
        "Hola mundo", ["Hola", "mundo"],
        "`getline` lee la línea completa, con espacios.", 3);
    },
    function () {
      return mkQ("¿Qué queda en `s`?", "int x; string s;\ncin >> x;\ngetline(cin, s);\n// entrada: 5⏎Santiago⏎",
        "vacío", ["Santiago", "5"],
        "`cin >> x` deja el salto de línea en el búfer, y `getline` lo toma como una línea vacía. Solución: leer todo por líneas o usar `cin.ignore`.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "string city = \"Santiago\";\ncout << \"city\";",
        "city", ["Santiago", "No compila"],
        "Entre comillas es texto literal. Para mostrar el valor de la variable se escribe `city` sin comillas.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "int value = 0;\ncin >> value;        // entrada: Santiago\nif (cin.fail()) cout << \"inválida\";\nelse cout << value * 2;",
        "inválida", [0, "Santiago"],
        "El texto no se puede leer como `int`, así que el flujo queda en falla. Que compile no garantiza una entrada válida.", 3);
    },
    function () {
      return mkQ("¿Qué hace `endl` además del salto de línea?", "cout << \"A\" << endl;\ncout << \"B\\n\";",
        "vacía el búfer", ["nada más", "borra la pantalla"],
        "`endl` = `'\\n'` + vaciar el búfer de salida (flush).", 3);
    },
    function () {
      const p = pick([12.5, 7.5, 20]), q = rnd(2, 5);
      return mkQ("¿Cuánto vale `total`?", `stringstream pin("${p}"), qin("${q}");\ndouble price = 0; int quantity = 0;\nbool ok = bool(pin >> price) && bool(qin >> quantity);\ndouble total = ok ? price * quantity : 0.0;`,
        p * q, [0, `${p}${q}`],
        `\`stringstream\` convierte el texto en números: ${p} × ${q} = ${p * q}.`, 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "stringstream in(\"abc\");\nint q = 0;\nbool ok = bool(in >> q);\ncout << ok;",
        0, [1, "abc"],
        "\"abc\" no es un número, así que la lectura falla y `ok` es falso (se imprime 0).", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "stringstream out;\nout << \"P=\" << 98.5;\ncout << out.str();",
        "P=98.5", ["P= 98.5", "98.5"],
        "`stringstream` también sirve al revés: con `<<` se arma un texto a partir de valores.", 3);
    },
    TYPES_GENS[13]
  ];

  /* ---------- 8 · Archivos fuente, header e #include (clasificador) ---------- */
  const FILE_ITEMS = [
    { code: "#ifndef CALCULATIONS_H\n#define CALCULATIONS_H", ask: "¿En qué archivo va?", bin: ".h",
      explain: "La guarda de inclusión va al principio del header para que no se procese dos veces." },
    { code: "double add(double first, double second);", ask: "¿En qué archivo va este prototipo?", bin: ".h",
      explain: "El header declara la interfaz: qué funciones existen y con qué tipos." },
    { code: "double add(double first, double second) {\n  return first + second;\n}", ask: "¿En qué archivo va?", bin: ".cpp",
      explain: "La definición (el cuerpo) va en un solo `.cpp`: la implementación." },
    { code: "int main() {\n  double total = add(2.0, 3.0);\n  std::cout << total;\n}", ask: "¿En qué archivo va?", bin: "main.cpp",
      explain: "`main` usa la función: incluye el header y la llama, sin necesitar el cuerpo." },
    { code: "#endif", ask: "¿En qué archivo va?", bin: ".h",
      explain: "`#endif` cierra la guarda de inclusión al final del header." },
    { code: "inline int square(int x) { return x * x; }", ask: "¿En qué archivo va una función `inline`?", bin: ".h",
      explain: "El cuerpo de una función `inline` debe verse en cada archivo que la usa, así que va en el header." },
    { code: "double discountFactor(double r, int t);", ask: "¿En qué archivo va este prototipo?", bin: ".h",
      explain: "Los prototipos de la interfaz van en el header." },
    { code: "double discountFactor(double r, int t) {\n  return 1.0 / std::pow(1 + r, t);\n}", ask: "¿En qué archivo va?", bin: ".cpp",
      explain: "Si pusieras el cuerpo en el header y lo incluyeras en dos `.cpp`, habría dos definiciones al enlazar." },
    { code: "#include \"calculations.h\"\n// para verificar que la definición\n// coincide con la declaración", ask: "Esta línea, con ese propósito, ¿en qué archivo va?", bin: ".cpp",
      explain: "El `.cpp` de implementación incluye su propio header para que el compilador revise que todo coincide." },
    { code: "std::cout << add(1.5, 2.5);", ask: "¿En qué archivo va?", bin: "main.cpp",
      explain: "Llamar la función es trabajo de quien la usa." }
  ];

  /* ---------- 9 · Funciones: definición y llamadas (carrera) ---------- */
  const FUNC_GENS = [
    function () {
      const x = rnd(5, 9), y = rnd(1, 4), k = rnd(2, 6);
      return mkQ("¿Cuánto vale `r`?", `int subtraction(int a, int b) {\n  return a - b;\n}\nint x = ${x}, y = ${y};\nint r = ${k} + subtraction(x, y);`,
        k + x - y, [k + x + y, x - y],
        `El valor retornado se usa como cualquier expresión: subtraction(${x}, ${y}) = ${x - y}, más ${k} = ${k + x - y}.`, 3);
    },
    function () {
      const a = rnd(2, 6), b = rnd(1, 5);
      return mkQ("¿Qué imprime?", `int doble(int x) { return 2 * x; }\nint suma(int a, int b) { return a + b; }\n\ncout << suma(doble(${a}), ${b});`,
        2 * a + b, [2 * (a + b), a + b],
        `Primero se evalúan los argumentos: doble(${a}) = ${2 * a}. Luego suma(${2 * a}, ${b}) = ${2 * a + b}.`, 3);
    },
    function () {
      const a = rnd(2, 9);
      return mkQ("¿Qué imprime?", `int f(int x) {\n  return x + 1;\n  x = 100;\n}\ncout << f(${a});`,
        a + 1, [100, 101],
        "`return` entrega el resultado y termina la función. Lo que viene después no se ejecuta.", 3);
    },
    function () {
      return mkQ("¿Qué pasa?", "int addition(int a, int b) {\n  int result = a + b;\n  return result;\n}\nint main() {\n  addition(5, 3);\n  cout << result;\n}",
        "No compila", [8, 0],
        "`result` es local de `addition`. Quien llama recibe el valor retornado, no las variables locales.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "void printmessage() { cout << \"Hola\"; }\n\nint main() {\n  printmessage;\n  cout << \"!\";\n}",
        "!", ["Hola!", "No compila"],
        "Escribir el nombre sin `()` no llama a la función. Los paréntesis son obligatorios para llamarla.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "void a() { cout << \"A\"; }\nvoid b() { cout << \"B\"; a(); }\n\nint main() {\n  b();\n  a();\n}",
        "BAA", ["AB", "BA"],
        "Una llamada salta a la función y al terminar vuelve justo después de la llamada. b imprime B y llama a a (A); luego main llama a a otra vez (A).", 3);
    },
    function () {
      return mkQ("En `addition(5, 3)`, ¿qué son 5 y 3?", "int addition(int a, int b) {\n  return a + b;\n}\nint z = addition(5, 3);",
        "argumentos", ["parámetros", "prototipos"],
        "Los argumentos pertenecen a la llamada (5, 3). Los parámetros son los nombres locales de la función (a, b).", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "void f() { cout << \"F\"; }\n\nint main() {\n  cout << \"M\";\n}",
        "M", ["FM", "MF"],
        "El programa empieza en `main`. Las demás funciones solo corren si alguien las llama.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "void saludo() { cout << \"S\"; }\n\nint main() {\n  cout << \"M\";\n  saludo();\n}",
        "MS", ["SM", "M"],
        "Aunque `saludo` esté escrita antes, se ejecuta cuando `main` la llama.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "int addition(int a, int b) { return a + b; }\n\nint main() {\n  addition(5, 3);\n  cout << \"fin\";\n}",
        "fin", ["8fin", "8"],
        "El valor retornado se descarta si nadie lo usa. Retornar no es imprimir.", 3);
    }
  ];

  /* ---------- 10 · Paso de argumentos (disparos) ---------- */
  const ARG_GENS = [
    function () {
      const x = rnd(2, 9);
      return mkQ("Dispara al valor final de `x`", `void doubleCopy(int value) {\n  value *= 2;\n}\nint x = ${x};\ndoubleCopy(x);`,
        x, [2 * x, 0, "No compila"],
        "Por valor: la función recibe una copia y duplica la copia. `x` no cambia.");
    },
    function () {
      const v = [rnd(1, 5), rnd(2, 6), rnd(3, 9)], k = rnd(0, 2), n = "xyz"[k];
      return mkQ(`Dispara al valor final de \`${n}\``, `void duplicate(int& a, int& b, int& c) {\n  a *= 2; b *= 2; c *= 2;\n}\nint x = ${v[0]}, y = ${v[1]}, z = ${v[2]};\nduplicate(x, y, z);`,
        2 * v[k], [v[k], 4 * v[k], v[0] + v[1] + v[2]],
        `Con \`&\` cada parámetro es un alias de la variable original, así que se duplican todas: ${n} = ${2 * v[k]}.`);
    },
    function () {
      const v = [rnd(1, 5), rnd(2, 6), rnd(3, 9)], k = rnd(0, 2), n = "xyz"[k];
      return mkQ(`Dispara al valor final de \`${n}\``, `void duplicate(int a, int b, int c) {\n  a *= 2; b *= 2; c *= 2;\n}\nint x = ${v[0]}, y = ${v[1]}, z = ${v[2]};\nduplicate(x, y, z);`,
        v[k], [2 * v[k], 0, "No compila"],
        "Sin `&`, el cuerpo es igual pero trabaja sobre copias. Las variables originales no cambian.");
    },
    function () {
      const x = rnd(10, 200), which = pick(["before", "after"]);
      return mkQ(`Dispara al valor de \`${which}\``, `void prevnext(int x, int& previous, int& next) {\n  previous = x - 1;\n  next = x + 1;\n}\nint before, after;\nprevnext(${x}, before, after);`,
        which === "before" ? x - 1 : x + 1, [x, which === "before" ? x + 1 : x - 1, "indeterminado"],
        `Los parámetros por referencia sirven como salidas: la función escribe dos resultados. before = ${x - 1}, after = ${x + 1}.`);
    },
    function () {
      return mkQ("Dispara: ¿qué pasa?", "void duplicate(int& a, int& b, int& c);\n\nduplicate(1, 2, 3);",
        "No compila", ["2 4 6", "1 2 3", "Error al ejecutar"],
        "A un parámetro `int&` hay que pasarle una variable, no un literal: el número 1 no tiene dónde guardar el resultado.");
    },
    function () {
      const x = rnd(1, 5), y = rnd(6, 9), ref = Math.random() < 0.6;
      return mkQ("Dispara al valor final de `x`", `void swap(int${ref ? "&" : ""} a, int${ref ? "&" : ""} b) {\n  int t = a; a = b; b = t;\n}\nint x = ${x}, y = ${y};\nswap(x, y);`,
        ref ? y : x, [ref ? x : y, x + y, 0],
        ref ? "Por referencia, el intercambio ocurre sobre las variables originales: `x` toma el valor de `y`." : "Por valor, se intercambian las copias. `x` e `y` quedan iguales.");
    },
    function () {
      return mkQ("Dispara al valor de `x + y`", "void f(int a, int& b) {\n  a = 10;\n  b = 20;\n}\nint x = 1, y = 2;\nf(x, y);",
        21, [30, 3, 12],
        "`a` es copia (x sigue en 1) y `b` es referencia (y pasa a 20). 1 + 20 = 21.");
    },
    function () {
      return mkQ("Dispara: ¿qué pasa?", "void f(const int& a) {\n  a = 5;\n}",
        "No compila", ["a = 5", "Nada", "Error al ejecutar"],
        "`const&` evita la copia pero protege el original: dentro de la función no se puede modificar.");
    }
  ];

  /* ---------- 11 · Interfaces de funciones (clasificador ¿compila?) ---------- */
  const IFACE_ITEMS = [
    { code: "int f(int x);\ndouble f(int x);", bin: "no compila", explain: "Un tipo de retorno distinto no basta para sobrecargar: los parámetros son idénticos." },
    { code: "int   operate(int a, int b)     { return a * b; }\nfloat operate(float a, float b) { return a / b; }", bin: "compila", explain: "Sobrecarga válida: difieren en el tipo de los parámetros. `operate(5, 2)` da 10 y `operate(5.0f, 2.0f)` da 2.5." },
    { code: "int divide(int a, int b = 2) { return a / b; }\nint r = divide(12);", bin: "compila", explain: "`b` toma su valor por defecto: 12 / 2 = 6." },
    { code: "int f(int a = 1, int b);", bin: "no compila", explain: "Los parámetros con valor por defecto van después de los obligatorios." },
    { code: "int divide(int a, int b = 2);\nint r = divide();", bin: "no compila", explain: "`a` no tiene valor por defecto, así que es obligatorio pasarlo." },
    { code: "int addition(int a, int b);   // prototipo\nint main() { return addition(5, 3); }\nint addition(int a, int b) { return a + b; }", bin: "compila", explain: "El prototipo hace visible la función antes de su cuerpo." },
    { code: "int main() { return addition(5, 3); }\nint addition(int a, int b) { return a + b; }", bin: "no compila", explain: "El compilador lee de arriba hacia abajo: sin prototipo, `addition` no está declarada cuando `main` la usa." },
    { code: "int addition(int, int);   // sin nombres", bin: "compila", explain: "En un prototipo los nombres de los parámetros son opcionales; bastan los tipos." },
    { code: "void printmessage() { cout << \"Hola\"; }\nint x = printmessage();", bin: "no compila", explain: "Una función `void` no retorna valor, así que no se puede guardar su resultado." },
    { code: "void f() {\n  return 5;\n}", bin: "no compila", explain: "Una función `void` no puede retornar un valor." },
    { code: "inline int square(int x) { return x * x; }\nint r = square(5);", bin: "compila", explain: "`inline` se escribe en la definición; la llamada es normal. r = 25." },
    { code: "int square(int x) { return x * x; }\nint r = inline square(5);", bin: "no compila", explain: "`inline` va en la definición de la función, no en la llamada." },
    { code: "void odd(int a);\nvoid even(int a);\nvoid odd(int a)  { if (a % 2) cout << \"impar\"; else even(a); }\nvoid even(int a) { if (a % 2 == 0) cout << \"par\"; else odd(a); }", bin: "compila", explain: "Recursión mutua: los prototipos permiten que cada función llame a la otra." },
    { code: "void odd(int a)  { if (a % 2) cout << \"impar\"; else even(a); }\nvoid even(int a) { if (a % 2 == 0) cout << \"par\"; else odd(a); }", bin: "no compila", explain: "Sin prototipos, `odd` usa `even` antes de que esté declarada." },
    { code: "void f(long x);\nvoid f(double x);\nf(3);", bin: "no compila", explain: "Llamada ambigua: convertir 3 (int) a `long` o a `double` cuesta lo mismo, y el compilador no puede elegir." },
    { code: "void f(int x);\nvoid f(int x, int y);\nf(1, 2);", bin: "compila", explain: "Sobrecarga por número de parámetros: se elige la versión de dos." }
  ];

  /* ---------- 12 · Recursión (carrera) ---------- */
  const REC_GENS = [
    CTRL_GENS[11], CTRL_GENS[12],
    function () {
      const k = rnd(3, 6);
      return mkQ(`¿Cuántas llamadas a \`factorial\` hace \`factorial(${k})\`?`, "long factorial(int n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}",
        k, [k - 1, k + 1],
        `Se llama con n = ${k}, ${k - 1}, …, 1: son ${k} llamadas. Cada una espera el resultado de la menor antes de retornar.`, 3);
    },
    function () {
      return mkQ("¿Qué pasa con `f(3)`?", "int f(int n) {\n  return n + f(n - 1);\n}",
        "Stack overflow", [6, 0],
        "No hay caso base: la recursión nunca termina y agota la pila de llamadas.", 3);
    },
    function () {
      const k = rnd(2, 9);
      return mkQ(`¿Qué imprime \`odd(${k})\`?`, "void odd(int a);\nvoid even(int a);\nvoid odd(int a)  { if (a % 2 != 0) cout << \"impar\"; else even(a); }\nvoid even(int a) { if (a % 2 == 0) cout << \"par\"; else odd(a); }",
        k % 2 ? "impar" : "par", [k % 2 ? "par" : "impar", "nada"],
        k % 2 ? `${k} es impar: \`odd\` lo imprime directo.` : `${k} es par: \`odd\` llama a \`even\`, que imprime "par".`, 3);
    },
    function () {
      const before = Math.random() < 0.5;
      return mkQ("¿Qué imprime `c(3)`?", before ? "void c(int n) {\n  if (n == 0) return;\n  cout << n;\n  c(n - 1);\n}" : "void c(int n) {\n  if (n == 0) return;\n  c(n - 1);\n  cout << n;\n}",
        before ? "321" : "123", [before ? "123" : "321", "3"],
        before ? "Imprime antes de la llamada recursiva: 3, luego 2, luego 1." : "Imprime después de la llamada recursiva: las llamadas bajan hasta 0 y se imprime al volver (1, 2, 3).", 3);
    },
    function () {
      const b = rnd(2, 3), e = rnd(2, 4);
      return mkQ(`¿Cuánto devuelve \`p(${b}, ${e})\`?`, "int p(int b, int e) {\n  if (e == 0) return 1;\n  return b * p(b, e - 1);\n}",
        b ** e, [b * e, b ** (e - 1)],
        `p(b, e) = b · p(b, e − 1) hasta e = 0: ${Array(e).fill(b).join("·")} = ${b ** e}.`, 3);
    },
    function () {
      return mkQ("¿Cuál es el mayor factorial que cabe en un `int` de 32 bits?", "// máximo int ≈ 2.147.483.647",
        "12!", ["20!", "31!"],
        "12! = 479.001.600 cabe; 13! ya supera 2³¹ − 1. Con `long` de 64 bits llega hasta 20!.", 3);
    },
    function () {
      const k = rnd(4, 7);
      const fib = n => n < 2 ? n : fib(n - 1) + fib(n - 2);
      return mkQ(`¿Cuánto devuelve \`fib(${k})\`?`, "int fib(int n) {\n  if (n < 2) return n;\n  return fib(n - 1) + fib(n - 2);\n}",
        fib(k), [fib(k - 1), fib(k + 1)],
        `fib: 0, 1, 1, 2, 3, 5, 8, 13… El de posición ${k} es ${fib(k)}.`, 3);
    }
  ];

  /* ---------- 13 · Selección e iteración (carrera) ---------- */
  const LOOP_GENS = [
    CTRL_GENS[0], CTRL_GENS[1], CTRL_GENS[2], CTRL_GENS[3], CTRL_GENS[4], CTRL_GENS[13],
    function () {
      const x = pick([100, rnd(1, 99)]);
      return mkQ("¿Qué imprime?", `int x = ${x};\nif (x == 100)\n  cout << "A";\n  cout << "B";`,
        x === 100 ? "AB" : "B", x === 100 ? ["B", "A"] : ["AB", "nada"],
        "Sin llaves, solo la sentencia siguiente pertenece al `if`. La segunda línea se ejecuta siempre, aunque esté indentada.", 3);
    },
    function () {
      const a = pick([50000, 500000, 2000000]);
      const r = a >= 1000000 ? "0,10 %" : a >= 100000 ? "0,20 %" : "0,30 %";
      return mkQ("¿Qué tasa de comisión se aplica?", `double amount = ${a};\nif (amount >= 1000000)     commission = 0.001 * amount;\nelse if (amount >= 100000) commission = 0.002 * amount;\nelse                       commission = 0.003 * amount;`,
        r, ["0,10 %", "0,20 %", "0,30 %"],
        "En una cadena `else if` gana la primera condición verdadera. Por eso el orden de los tramos importa.", 3);
    },
    function () {
      const n = rnd(2, 5), m = rnd(2, 5);
      return mkQ("¿Cuántas veces se ejecuta `c++`?", `int c = 0;\nfor (int i = 0; i < ${n}; i++)\n  for (int j = 0; j < ${m}; j++)\n    c++;`,
        n * m, [n + m, n * m + 1],
        `Ciclos anidados: el interior corre ${m} veces por cada una de las ${n} vueltas del exterior. ${n}·${m} = ${n * m}.`, 3);
    },
    function () {
      return mkQ("¿Cuántas iteraciones hace?", "int n, i;\nfor (n = 0, i = 100; n != i; ++n, --i) { }",
        50, [100, 49],
        "Con el operador coma se manejan dos contadores: n sube y i baja, y se encuentran en 50.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "int c = 0, n = 0;\nwhile (n > 0) {\n  c++;\n  n--;\n}\ncout << c;",
        0, [1, "Ciclo infinito"],
        "Si la condición es falsa desde el inicio, el cuerpo de un `while` se ejecuta cero veces.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "for (int n = 3; n > 0; --n)\n  cout << n;",
        "321", ["3210", "123"],
        "Inicia en 3, revisa la condición antes de cada vuelta y resta 1 después de cada cuerpo. Con n = 0 termina.", 3);
    }
  ];

  /* ---------- 14 · Saltos y switch (disparos) ---------- */
  const JUMP_GENS = [
    CTRL_GENS[5], CTRL_GENS[6], CTRL_GENS[7],
    function () {
      const c = rnd(2, 3), b = rnd(c + 2, 6);
      let t = 0; for (let n = 1; n < b; n++) if (n !== c) t += n;
      return mkQ("Dispara al valor final de `total`", `int total = 0;\nfor (int n = 1; n <= 6; ++n) {\n  if (n == ${c}) continue;\n  if (n == ${b}) break;\n  total += n;\n}`,
        t, [t + b, t + c, (b * (b - 1)) / 2],
        `Suma 1..${b - 1} saltándose el ${c} (\`continue\`) y se detiene al llegar a ${b} (\`break\`, sin sumarlo): ${t}.`);
    },
    function () {
      const x = rnd(1, 4);
      const out = x === 1 ? "uno" : x === 2 ? "dos" : "otro";
      return mkQ("Dispara a lo que imprime", `switch (${x}) {\n  case 1: cout << "uno"; break;\n  case 2: cout << "dos"; break;\n  default: cout << "otro";\n}`,
        out, ["uno", "dos", "otro", "nada"].filter(s => s !== out),
        `\`switch\` salta al \`case\` que coincide; si ninguno coincide va a \`default\`. Con ${x} → "${out}".`);
    },
    function () {
      const x = rnd(1, 5);
      const out = x <= 3 ? "bajo" : "alto";
      return mkQ("Dispara a lo que imprime", `switch (${x}) {\n  case 1:\n  case 2:\n  case 3: cout << "bajo"; break;\n  default: cout << "alto";\n}`,
        out, [out === "bajo" ? "alto" : "bajo", "bajoalto", "nada"],
        "Varias etiquetas `case` seguidas comparten la misma acción.");
    },
    function () {
      return mkQ("Dispara: ¿qué pasa?", "int k = 2;\nswitch (x) {\n  case k: cout << \"dos\"; break;\n}",
        "No compila", ["Imprime dos", "Nada", "Error al ejecutar"],
        "Las etiquetas `case` deben ser constantes, no variables.");
    },
    function () {
      const ex = Math.random() < 0.5;
      return mkQ("Dispara a lo que imprime", `void f() {\n  cout << "A";\n  ${ex ? "exit(0);" : "return;"}\n}\nint main() {\n  f();\n  cout << "B";\n}`,
        ex ? "A" : "AB", [ex ? "AB" : "A", "B", "nada"],
        ex ? "`exit` termina todo el programa: `main` nunca retoma." : "`return` termina solo la función actual; `main` sigue después de la llamada.");
    },
    function () {
      return mkQ("Dispara: ¿cómo termina este ciclo?", "int i = 0;\nwhile (i < 5) {\n  if (i == 2) continue;\n  i++;\n}",
        "Nunca termina", ["i = 5", "i = 2", "No compila"],
        "En un `while`, `continue` salta directo a la condición. Como el `i++` está después, con i = 2 ya nunca avanza.");
    },
    function () {
      return mkQ("Dispara a lo que imprime", "int n = 3;\nloop:\n  cout << n;\n  n--;\n  if (n > 0) goto loop;",
        "321", ["3", "123", "No compila"],
        "`goto` salta a la etiqueta dentro de la misma función. Funciona, pero se prefieren ciclos estructurados.");
    }
  ];

  /* ---------- 15 · Arreglos (disparos) ---------- */
  const ARRAY_GENS = [
    ARR_GENS[0], ARR_GENS[1], ARR_GENS[2], ARR_GENS[3], ARR_GENS[4], ARR_GENS[5], ARR_GENS[6], ARR_GENS[13],
    function () {
      const o = shuffle([0, 1, 2]), i = rnd(0, 2);
      return mkQ(`Dispara al valor de \`order[order[${i}]]\``, `int order[3] = {${o.join(", ")}};`,
        o[o[i]], [o[i], i, 3],
        `Primero el índice de adentro: order[${i}] = ${o[i]}. Luego order[${o[i]}] = ${o[o[i]]}.`);
    },
    function () {
      const v = rnd(2, 9);
      return mkQ("Dispara al valor de `p[2]`", `int p[4] = {${v}};`,
        0, [v, "indeterminado", 4],
        "Si la lista tiene menos valores que el tamaño, el resto se completa con cero.");
    },
    function () {
      const r = rnd(0, 2), c = rnd(0, 4);
      return mkQ(`Dispara a la posición de \`jimmy[${r}][${c}]\` en \`flat\``, "int jimmy[3][5];\nint flat[3 * 5];   // mismo orden, por filas",
        r * 5 + c, [c * 3 + r, r + c, r * 3 + c],
        `Índice lineal = fila × ancho + columna = ${r}·5 + ${c} = ${r * 5 + c}.`);
    },
    function () {
      const base = rnd(0x10, 0xf0) * 0x10, k = rnd(1, 4);
      return mkQ(`Dispara a la dirección de \`a[${k}]\``, `int a[5];      // a[0] está en ${hex(base)}\n               // sizeof(int) == 4`,
        hex(base + 4 * k), [hex(base + k), hex(base + 2 * k), hex(base + 8 * k)],
        `Los elementos son contiguos: dirección de a[i] = a[0] + i·4 = ${hex(base)} + ${4 * k} = ${hex(base + 4 * k)}.`);
    },
    function () {
      const v = [10, 20, 30, 40, 50].map(x => x + rnd(0, 5)), i = rnd(0, 2);
      return mkQ(`Dispara al valor de \`values[index + 2]\``, `int values[5] = {${v.join(", ")}};\nint index = ${i};`,
        v[i + 2], [v[i], v[i] + 2, v[i + 1]],
        `El índice se calcula primero: ${i} + 2 = ${i + 2}. values[${i + 2}] = ${v[i + 2]}.`);
    },
    function () {
      return mkQ("Dispara a lo que imprime", "int main() {\n  int local[3];\n  cout << local[0];\n}",
        "indeterminado", [0, 3, "No compila"],
        "Un arreglo local sin inicializar tiene valores indeterminados. Uno global sí parte en cero.");
    }
  ];

  /* ---------- 16 · Cadenas estilo C (carrera) ---------- */
  const CSTR_GENS = [
    CTRL_GENS[20],
    function () {
      return mkQ("¿Cuántos `char` ocupa el literal `\"Hello\"`?", "char word[] = \"Hello\";",
        6, [5, 7],
        "5 letras + el carácter nulo `'\\0'` que el literal agrega al final = 6.", 3);
    },
    function () {
      const n = pick([20, 10, 80]);
      return mkQ("¿Cuántos caracteres de texto caben como máximo?", `char jenny[${n}];`,
        n - 1, [n, n + 1],
        `Hay que dejar un espacio para \`'\\0'\`: ${n} − 1 = ${n - 1} caracteres de texto.`, 3);
    },
    function () {
      return mkQ("¿Qué pasa?", "char word[] = \"Hello\";\nword = \"Bye\";",
        "No compila", ["word = Bye", "word = Hello"],
        "Inicializar no es asignar: un arreglo nativo no se puede asignar completo. Con `std::string` sí se podría.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "char word[] = \"Hello\";\nword[0] = 'h';\ncout << word;",
        "hello", ["Hello", "No compila"],
        "Cada elemento sí se puede modificar como una variable normal.", 3);
    },
    function () {
      return mkQ("¿Cuánto vale `sizeof(letters)`?", "char letters[] = {'H', 'i', '\\0'};",
        3, [2, 4],
        "Son 3 elementos explícitos: 'H', 'i' y `'\\0'`. Es lo mismo que `char letters[] = \"Hi\";`.", 3);
    },
    function () {
      return mkQ("¿Qué pasa?", "char s[5] = \"Hello\";",
        "No compila", ["s = Hello", "s = Hell"],
        "\"Hello\" necesita 6 espacios (con `'\\0'`) y el arreglo tiene 5.", 3);
    },
    function () {
      const p = pick([["\"abc\", \"abd\"", "negativo"], ["\"put\", \"call\"", "positivo"], ["\"bono\", \"bono\"", "0"]]);
      return mkQ("¿Qué signo tiene el resultado?", `strcmp(${p[0]})`,
        p[1], ["negativo", "positivo", "0"].filter(x => x !== p[1]),
        "`strcmp` entrega 0 si son iguales, negativo si la primera va antes en orden alfabético y positivo si va después.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "char s[20] = \"Hola\";\nstrcat(s, \"Mundo\");\ncout << s;",
        "HolaMundo", ["Hola Mundo", "Hola"],
        "`strcat` pega la segunda cadena al final de la primera, sin agregar espacios.", 3);
    },
    function () {
      return mkQ("¿Cuál permite `s = \"texto\";` después de declararla?", "",
        "std::string", ["char s[20]", "Ambas"],
        "Una cadena C (`char s[N]`) no se asigna completa. `std::string` sí, y además crece sola.", 3);
    },
    function () {
      return mkQ("¿Qué imprime?", "char name[80];\ncin >> setw(80) >> name;   // entrada: Ana María\ncout << name;",
        "Ana", ["Ana María", "María"],
        "`cin >>` lee hasta el primer espacio, también en una cadena C. `setw(80)` evita escribir más de 79 caracteres + `'\\0'`.", 3);
    },
    function () {
      return mkQ("¿Qué carácter marca el fin de una cadena C?", "",
        "'\\0'", ["'0'", "'\\n'"],
        "El carácter nulo `'\\0'` (código 0), no el dígito '0' (código 48).", 3);
    }
  ];

  /* ---------- Conversión de clasificadores a alternativas (para jefes) ---------- */
  const NAMES = {
    pre: "Preprocesador", comp: "Compilador", link: "Enlazador",
    compila: "Compila", "no compila": "No compila",
    ".h": "calculations.h", ".cpp": "calculations.cpp", "main.cpp": "main.cpp"
  };
  function sorterQuiz(items, bins, n, ask) {
    return shuffle(items).slice(0, n).map(it => {
      const options = bins.map(b => NAMES[b] || b);
      const correct = NAMES[it.bin] || it.bin;
      return { ask: it.ask || ask, code: it.code, options, answer: options.indexOf(correct), correctText: correct, explain: it.explain };
    });
  }

  const SHOOT = "◀ ▶ mover · Espacio/Acción disparar";
  const SORT = "◀ ▶ mover · Espacio/Acción soltar rápido";
  const RUN = "◀ ▶ cambiar de carril";
  const STRUCT_LABELS = { pre: "PRE-\nPROCESADOR", comp: "COMPILADOR", link: "ENLAZADOR" };

  // Niveles de la campaña: cada uno sabe construir su partida y entregar preguntas para el jefe.
  function runner(gens) { return { engine: "runner", controls: RUN, build() { return { questions: fromGens(gens, 10) }; }, quiz: n => fromGens(gens, n) }; }
  function shooter(gens) { return { engine: "shooter", controls: SHOOT, build() { return { questions: fromGens(gens, 10), hazards: true }; }, quiz: n => fromGens(gens, n) }; }
  function sorter(items, bins, ask, labels) {
    return {
      engine: "sorter", controls: SORT,
      build() { return { phases: [{ bins, labels, items: cases(items, Math.min(10, items.length), ask) }] }; },
      quiz: n => sorterQuiz(items, bins, n, ask)
    };
  }

  const CAMPAIGN = [
    // Bloque 1
    Object.assign({ id: "c01-estructura", world: 1, addr: "0x0100", title: "Estructura de un programa", topic: "§1 Estructura de un programa",
      desc: "Preprocesador, compilador y enlazador: quién hace qué y quién reclama.",
      intro: "Cada caso cae hacia tres zonas. Mándalo a quien lo procesa o a quien reclama por el error: <code>PREPROCESADOR</code>, <code>COMPILADOR</code> o <code>ENLAZADOR</code>." },
      sorter(STRUCT_ITEMS, ["pre", "comp", "link"], "¿Quién se encarga?", STRUCT_LABELS)),
    Object.assign({ id: "c02-variables", world: 1, addr: "0x0110", title: "Variables y ámbito", topic: "§2 Variables y ámbito",
      desc: "Trazas, identificadores, inicialización y qué se ve desde cada bloque.",
      intro: "El programa corre hacia ti. Ponte en el carril con el valor correcto antes de cada compuerta y esquiva los bugs." },
      runner(VAR_GENS)),
    Object.assign({ id: "c03-tipos", world: 1, addr: "0x0120", title: "Tipos y literales", topic: "§3 Tipos y literales numéricos",
      desc: "sizeof, rangos, octal, hexadecimal, binario y tipos de literales.",
      intro: "Dispara a la respuesta correcta antes de que llegue abajo. Esquiva los <code>0xDEAD</code>." },
      shooter(NUM_GENS)),
    Object.assign({ id: "c04-texto", world: 1, addr: "0x0130", title: "Texto y constantes", topic: "§4 Texto y constantes",
      desc: "char vs string, secuencias de escape, ASCII, const y #define.",
      intro: "Ponte en el carril con la salida correcta de cada fragmento de texto." },
      runner(TEXT_GENS)),
    { id: "jefe-b1", world: 1, addr: "0x7FFF", engine: "shooter", boss: true, controls: SHOOT,
      title: "Jefe: Overflow", topic: "Jefe del bloque 1", desc: "Mezcla de los niveles 1 a 4.",
      intro: "Overflow se pasó del máximo. Sus preguntas mezclan los 4 niveles anteriores: dispara a la letra correcta y esquiva sus disparos.",
      bossOf: ["c01-estructura", "c02-variables", "c03-tipos", "c04-texto"], bank: ["1"], boss2: { label: "INT_MAX", color: "amber", pattern: "aimed", speed: 1 } },
    // Bloque 2
    Object.assign({ id: "c05-aritmetica", world: 2, addr: "0x0200", title: "Operadores aritméticos", topic: "§5 Operadores · asignación y aritmética",
      desc: "Asignación, división entera, %, asignación compuesta y ++/--.",
      intro: "Predice el resultado de cada expresión y ponte en el carril correcto." },
      runner(ARITH_GENS)),
    Object.assign({ id: "c06-logica", world: 2, addr: "0x0210", title: "Lógica, bits y precedencia", topic: "§5 Operadores · lógicos, bits, conversiones",
      desc: "Cortocircuito, ternario, coma, & | ^ <<, casts y precedencia.",
      intro: "Dispara al valor correcto. Ojo con el cortocircuito y con que <code>^</code> no es potencia." },
      shooter(LOGIC_GENS)),
    Object.assign({ id: "c07-io", world: 2, addr: "0x0220", title: "Entrada y salida", topic: "§6 Entrada, salida y conversión de texto",
      desc: "cin, getline, cin.fail, endl y stringstream.",
      intro: "Cada compuerta trae un programa con su entrada. Ponte en el carril con lo que imprime o lee." },
      runner(IO_GENS)),
    Object.assign({ id: "c08-archivos", world: 2, addr: "0x0230", title: "Header y .cpp", topic: "§7 Archivos fuente, header e #include",
      desc: "Qué va en calculations.h, en calculations.cpp y en main.cpp.",
      intro: "Manda cada pieza al archivo donde corresponde: la interfaz, la implementación o quien la usa." },
      sorter(FILE_ITEMS, [".h", ".cpp", "main.cpp"], "¿En qué archivo va?", { ".h": "calc.h", ".cpp": "calc.cpp", "main.cpp": "main.cpp" })),
    { id: "jefe-b2", world: 2, addr: "0x0BAD", engine: "shooter", boss: true, controls: SHOOT,
      title: "Jefe: Undefined Reference", topic: "Jefe del bloque 2", desc: "Mezcla de los niveles 5 a 8.",
      intro: "El error del enlazador cobró vida. Responde preguntas de los niveles 5 a 8 y esquiva sus abanicos de balas.",
      bossOf: ["c05-aritmetica", "c06-logica", "c07-io", "c08-archivos"], bank: ["2"], boss2: { label: "ld error", color: "cyan", pattern: "spread", speed: 1.1 } },
    // Bloque 3
    Object.assign({ id: "c09-funciones", world: 3, addr: "0x0300", title: "Funciones", topic: "§8 Funciones: definición y llamadas",
      desc: "Llamadas, valor retornado como expresión, parámetros vs argumentos.",
      intro: "Sigue la ejecución de cada llamada y ponte en el carril con lo que imprime o devuelve." },
      runner(FUNC_GENS)),
    Object.assign({ id: "c10-argumentos", world: 3, addr: "0x0310", title: "Paso de argumentos", topic: "§9 Paso por valor y por referencia",
      desc: "Copias, referencias, varias salidas (prevnext) y swap.",
      intro: "Dispara al valor final de cada variable. Fíjate si el parámetro tiene <code>&</code>." },
      shooter(ARG_GENS)),
    Object.assign({ id: "c11-interfaces", world: 3, addr: "0x0320", title: "Interfaces de funciones", topic: "§10 Interfaces: void, sobrecarga, defaults, prototipos, inline",
      desc: "¿Compila o no? Sobrecargas, argumentos por defecto y prototipos.",
      intro: "Mándalo a <code>COMPILA</code> o <code>NO COMPILA</code>. Piensa como el compilador leyendo de arriba hacia abajo." },
      sorter(IFACE_ITEMS, ["compila", "no compila"], "¿Este código compila?")),
    Object.assign({ id: "c12-recursion", world: 3, addr: "0x0330", title: "Recursión", topic: "§11 Recursión",
      desc: "Factorial, caso base, orden de impresión, recursión mutua y desbordes.",
      intro: "Sigue las llamadas recursivas y ponte en el carril con el resultado." },
      runner(REC_GENS)),
    { id: "jefe-b3", world: 3, addr: "0xF00F", engine: "shooter", boss: true, controls: SHOOT,
      title: "Jefe: Stack Overflow", topic: "Jefe del bloque 3", desc: "Mezcla de los niveles 9 a 12.",
      intro: "Una recursión sin caso base llenó la pila y ahora te lanza marcos de llamada. Esquívalos y responde lo de los niveles 9 a 12.",
      bossOf: ["c09-funciones", "c10-argumentos", "c11-interfaces", "c12-recursion"], bank: ["3"], boss2: { label: "f(f(f(…", color: "plum", pattern: "rain", speed: 1.15, rainText: "f()" } },
    // Bloque 4
    Object.assign({ id: "c13-control", world: 4, addr: "0x0400", title: "Selección e iteración", topic: "§12 Flujo de control · if, while, for",
      desc: "if sin llaves, else if, cuántas vueltas da cada ciclo, ciclos anidados.",
      intro: "Ponte en el carril con la salida o el número de vueltas de cada fragmento." },
      runner(LOOP_GENS)),
    Object.assign({ id: "c14-saltos", world: 4, addr: "0x0410", title: "Saltos y switch", topic: "§12 Flujo de control · break, continue, goto, exit, switch",
      desc: "break, continue, exit vs return, fall-through y etiquetas case.",
      intro: "Dispara a la salida correcta. Atento a los <code>case</code> sin <code>break</code>." },
      shooter(JUMP_GENS)),
    Object.assign({ id: "c15-arreglos", world: 4, addr: "0x0420", title: "Arreglos", topic: "§13 Arreglos uni y multidimensionales",
      desc: "Índices, inicialización parcial, matrices, índice lineal y direcciones.",
      intro: "Dispara al valor o a la dirección correcta. Recuerda: los índices parten en 0." },
      shooter(ARRAY_GENS)),
    Object.assign({ id: "c16-cadenas", world: 4, addr: "0x0430", title: "Cadenas estilo C", topic: "§13 Secuencias de caracteres",
      desc: "'\\0', capacidad, asignación, strlen, strcmp y strcat.",
      intro: "Ponte en el carril correcto para cada cadena C." },
      runner(CSTR_GENS)),
    { id: "jefe", world: 4, addr: "0xDEAD", engine: "shooter", boss: true, final: true, controls: SHOOT,
      title: "Jefe final: Segmentation Fault", topic: "Jefe final",
      desc: "Todo el resumen. Se desbloquea al vencer a los 3 jefes y completar el bloque 4.",
      intro: "El Segfault ataca con preguntas de los 16 niveles. Dispara a la letra correcta y esquiva sus ataques mixtos.",
      bossOf: "all", bank: ["1", "2", "3", "4"], boss2: { label: "SIGSEGV", color: "bad", pattern: "mixed", speed: 1.25 } }
  ];

  function buildBoss(lv) {
    const src = lv.bossOf === "all" ? CAMPAIGN.filter(l => !l.boss) : CAMPAIGN.filter(l => (lv.bossOf || []).includes(l.id));
    let qs;
    if (lv.bossOf === "all") qs = shuffle(src).slice(0, 10).map(l => l.quiz(1)[0]).concat(bossQuestions(lv.bank, 2));
    else qs = src.flatMap(l => l.quiz(2)).concat(bossQuestions(lv.bank, 2));
    return { questions: shuffle(qs), boss: lv.boss2 };
  }
  CAMPAIGN.filter(l => l.boss).forEach(l => { l.build = () => buildBoss(l); });

  // Contenido extra (otros PPT del curso): memoria y clases, fuera de la campaña.
  const EXTRA = [
    { id: "memoria", world: 5, extra: true, addr: "0x0500", engine: "sorter", controls: SORT,
      title: "Stack o Heap", topic: "Gestión de memoria", desc: "Manda cada dato a la zona de memoria donde vive. Ojo con las fugas.",
      intro: "Cae un dato. Guíalo hasta la zona de memoria donde vive. Cada <code>new</code> llena el heap; los <code>delete</code> lo liberan. Si el heap se llena, pierdes una vida por fuga de memoria.",
      build() {
        const allocs = shuffle(MEMORY_ITEMS).slice(0, 11);
        const dels = shuffle(DELETE_ITEMS);
        const out = [];
        let heapSeen = 0, d = 0;
        for (const it of allocs) {
          out.push(it);
          if (it.bin === "heap") { heapSeen++; if (heapSeen % 2 === 0) out.push(dels[d++ % dels.length]); }
        }
        return { phases: [{ bins: ["stack", "heap"], items: out }] };
      } },
    { id: "punteros", world: 5, extra: true, addr: "0x0510", engine: "shooter", controls: SHOOT,
      title: "Cazapunteros", topic: "Punteros y referencias", desc: "Dispara al valor correcto: *p, &a, p + 2… Esquiva los punteros colgantes.",
      intro: "Lee el código y dispara a la respuesta correcta antes de que lleguen abajo. Los <code>0xDEAD</code> son punteros colgantes: esquívalos o destrúyelos.",
      build() { return { questions: fromGens(PTR_GENS, 10), hazards: true }; } },
    { id: "detective", world: 5, extra: true, addr: "0x0520", engine: "sorter", controls: SORT,
      title: "Detective de memoria", topic: "Errores de memoria", desc: "¿Está bien, tiene una fuga o deja un puntero colgante?",
      intro: "Clasifica cada caso: <code>SIN ERROR</code>, <code>FUGA</code> o <code>COLGANTE</code>.",
      build() { return { phases: [{ bins: ["ok", "fuga", "colgante"], items: cases(DETECTIVE_ITEMS, 10, "¿Qué problema tiene este código?") }] }; } },
    { id: "jefe-leak", world: 5, extra: true, boss: true, addr: "0xBAD0", engine: "shooter", controls: SHOOT,
      title: "Jefe: Memory Leak", topic: "Jefe extra de memoria", desc: "Preguntas rápidas de punteros y memoria.",
      intro: "Memory Leak gotea bloques de heap que nadie libera. Esquívalos y dispara a la letra correcta.",
      build() { return { questions: bossQuestions(["M"], 7), boss: { label: "LEAK", color: "plum", pattern: "rain", speed: 1.15, rainText: "new" } }; } },
    { id: "clases", world: 6, extra: true, addr: "0x0600", engine: "sorter", controls: SORT,
      title: "Arquitecto de clases", topic: "Clases, .h y .cpp", desc: "Arma la clase Bono: qué va en el .h, en el .cpp y qué es público o privado.",
      intro: "Primera fase: manda cada pieza al archivo donde corresponde. Segunda fase: decide qué miembros de <code>Bono</code> son públicos y cuáles privados.",
      build() {
        return { phases: [
          { bins: [".h", ".cpp", "main.cpp"], items: shuffle(CLASS_FILES).slice(0, 8), title: "Fase 1 · ¿En qué archivo va?" },
          { bins: ["private", "public"], items: shuffle(CLASS_ACCESS).slice(0, 7), title: "Fase 2 · Encapsulamiento" }
        ] };
      } },
    { id: "objetos", world: 6, extra: true, addr: "0x0610", engine: "runner", controls: RUN,
      title: "Vida de un objeto", topic: "Objetos en ejecución", desc: "Constructores, destructores, static, this y copias de objetos.",
      intro: "Predice qué imprime cada programa con objetos: cuándo nacen, cuándo mueren y qué se copia.",
      build() { return { questions: fromGens(OBJ_GENS, 10) }; } },
    { id: "jefe-poo", world: 6, extra: true, boss: true, addr: "0xC1A5", engine: "shooter", controls: SHOOT,
      title: "Jefe: Constructor Loco", topic: "Jefe extra de clases", desc: "Preguntas rápidas de clases y objetos.",
      intro: "Un constructor que nunca deja de construir. Responde lo de clases y objetos y esquiva sus disparos.",
      build() { return { questions: bossQuestions(["P"], 7), boss: { label: "Clase()", color: "good", pattern: "spread", speed: 1.1 } }; } }
  ];

  window.Content = {
    shuffle,
    worlds: [
      { n: 1, name: "Bloque 1 · Bases", desc: "Secciones 1 a 4 del resumen: estructura, variables, tipos y texto." },
      { n: 2, name: "Bloque 2 · Operadores y archivos", desc: "Secciones 5 a 7: operadores, entrada/salida y headers." },
      { n: 3, name: "Bloque 3 · Funciones", desc: "Secciones 8 a 11: funciones, argumentos, interfaces y recursión." },
      { n: 4, name: "Bloque 4 · Control y arreglos", desc: "Secciones 12 y 13: flujo de control, arreglos y cadenas C." },
      { n: 5, name: "Extra · Memoria", desc: "Material del PPT de gestión de memoria (fuera de la campaña)." },
      { n: 6, name: "Extra · Clases", desc: "Clases y objetos (fuera de la campaña)." }
    ],
    levels: CAMPAIGN.concat(EXTRA)
  };
})();
