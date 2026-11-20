/* poo.js — Campaña, sección 3: "Programación orientada a objetos".
   Todo sale del PPT "Programación orientada a objetos" (J. Burrus), en el mismo orden:
   1 Estructuras · 2 Clases · 3 Estructuras, clases y uniones + 4 Herencia · 5 Polimorfismo ·
   6 Amistad + 7 Ejemplo: valorización de un bono.
   Usa las mismas herramientas que las otras secciones (questions.js las expone en Content.kit).
   Cada pregunta con código trae `check` (decl fuera de main, body dentro) para verificarla con g++:
   out = lo que debe imprimir; compiles = true/false. Lo que va entre `comillas invertidas` se muestra como código. */
(function () {
  "use strict";
  const C = window.Content, K = C.kit;
  const { rnd, pick, shuffle, cout6, mkQ, fromGens, cases, freshIdx, SORT, SHOOT, RUN } = K;

  function distinct(k, lo, hi) { const s = new Set(); while (s.size < k) s.add(rnd(lo, hi)); return [...s]; }
  const pickN = (list, k) => shuffle(list).slice(0, k);

  // Código que se muestra y su versión verificable (decl va fuera de main y body dentro).
  // chkDecl permite verificar con la definición completa cuando en pantalla se muestra un resumen.
  function src(decl, body, chkDecl) {
    return { code: [decl, body].filter(Boolean).join("\n"), decl: chkDecl !== undefined ? chkDecl : (decl || ""), body: body || "" };
  }
  // probe: texto → se imprime esa expresión y debe dar la correcta; true → el body imprime la correcta;
  // "FAIL" → el código no debe compilar; false → solo se revisa que compile. Por defecto, si la
  // pregunta dice "imprime", se compara la salida.
  function Q(n, ask, s, correct, dis, explain, probe) {
    const code = typeof s === "string" ? s : s.code;
    const q = mkQ(ask, code, correct, dis, explain, n);
    if (s && typeof s === "object") {
      if (probe === "FAIL") q.check = { decl: s.decl, body: s.body, compiles: false };
      else if (typeof probe === "string") q.check = { decl: s.decl, body: s.body + `\ncout << (${probe});`, out: String(correct) };
      else if (probe === true || (probe !== false && /imprime/i.test(ask))) q.check = { decl: s.decl, body: s.body, out: String(correct) };
      else q.check = { decl: s.decl, body: s.body, compiles: true };
    }
    return q;
  }
  const R = (ask, s, c, d, e, probe) => Q(3, ask, s, c, d, e, probe);   // carrera: 3 carriles
  const S = (ask, s, c, d, e, probe) => Q(4, ask, s, c, d, e, probe);   // disparos: 4 alternativas

  /* ---------- Tipos del PPT ---------- */
  const PRODUCT = "struct Product {\n  int weight;\n  float price;\n};";
  const MOVIE = "struct Movie {\n  string title;\n  int year;\n};";
  const PRINTMOVIE = "void printmovie(Movie movie) {\n  cout << movie.title << \" (\" << movie.year << \")\";\n}";
  const FRIEND = "struct Friend {\n  string name, email;\n  Movie favorite_movie;\n};";
  const FILMS = [["Alien", 1979], ["Matrix", 1999], ["Up", 2009], ["Coco", 2017], ["Rocky", 1976], ["Titanic", 1997], ["Tiburón", 1975], ["Amélie", 2001]];
  const FRUITS = ["apple", "banana", "melon", "pear", "kiwi", "plum", "grape"];
  const film = () => pick(FILMS);
  const fruits = k => pickN(FRUITS, k);

  const RECT_SET = "class Rectangle {\n  int width, height;\npublic:\n  void set_values(int w, int h) {\n    width = w; height = h;\n  }\n  int area() { return width * height; }\n};";
  const RECT_CTOR = "class Rectangle {\n  int width, height;\npublic:\n  Rectangle(int w, int h) { width = w; height = h; }\n  int area() { return width * height; }\n};";
  const RECT_BOTH = "class Rectangle {\n  int width, height;\npublic:\n  Rectangle(int w, int h) { width = w; height = h; }\n  void set_values(int w, int h) {\n    width = w; height = h;\n  }\n  int area() { return width * height; }\n};";
  const RECT_DEF = d => `class Rectangle {\n  int width, height;\npublic:\n  Rectangle() { width = ${d}; height = ${d}; }\n  Rectangle(int w, int h) { width = w; height = h; }\n  int area() { return width * height; }\n};`;
  const OBJS = ["rect", "rectb", "box", "tile", "room", "card", "door"];
  const objs = k => pickN(OBJS, k);

  /* ===================================================================
     BLOQUE 1 · ESTRUCTURAS (PPT §1)
     =================================================================== */

  /* ---------- p01 · Registros y miembros (carrera) ---------- */
  const P_REC_GENS = [
    function () {
      const [a, b] = fruits(2), v = rnd(100, 200), k = rnd(5, 40);
      return R(`¿Cuánto vale \`${b}.weight\`?`, src(PRODUCT, `Product ${a}, ${b};\n${a}.weight = ${v};\n${b}.weight = ${a}.weight + ${k};`),
        v + k, [v, k], `\`${a}.weight\` es un int que vale ${v}; \`${b}.weight\` recibe ${v} + ${k} = ${v + k}. Cada objeto tiene su propio campo.`, `${b}.weight`);
    },
    function () {
      const [a, b] = fruits(2), v = rnd(100, 200), w = rnd(201, 300);
      return R(`¿Cuánto vale \`${a}.weight\`?`, src(PRODUCT, `Product ${a}, ${b};\n${a}.weight = ${v};\n${b}.weight = ${w};`),
        v, [w, v + w], `Cambiar \`${b}\` no modifica \`${a}\`: son dos objetos con sus propios miembros.`, `${a}.weight`);
    },
    function () {
      const [t, y] = film(), y2 = y + rnd(1, 9);
      return R("¿Qué imprime?", src(MOVIE + "\n" + PRINTMOVIE, `Movie mine = {"${t}", ${y}};\nMovie yours = mine;\nyours.year = ${y2};\nprintmovie(mine);`),
        `${t} (${y})`, [`${t} (${y2})`, `mine (${y})`], `\`Movie yours = mine\` copia el registro completo. Luego se cambia el año de la copia: mine sigue con ${y}.`);
    },
    function () {
      const [t, y] = film(), y2 = y + rnd(1, 9);
      return R("¿Qué imprime?", src(MOVIE + "\n" + PRINTMOVIE, `Movie mine = {"${t}", ${y}};\nMovie yours = mine;\nyours.year = ${y2};\nprintmovie(yours);`),
        `${t} (${y2})`, [`${t} (${y})`, `yours (${y2})`], `yours es una copia con el mismo título, y luego su año pasa a ${y2}.`);
    },
    function () {
      const [a] = fruits(1), v = rnd(100, 200), k = rnd(5, 40);
      return R(`¿Cuánto vale \`${a}.weight\`?`, src(PRODUCT + `\nvoid bump(Product p) {\n  p.weight += ${k};\n}`, `Product ${a};\n${a}.weight = ${v};\nbump(${a});`),
        v, [v + k, k], `\`bump\` recibe una copia (paso por valor): suma ${k} a la copia y \`${a}\` queda en ${v}.`, `${a}.weight`);
    },
    function () {
      const [a] = fruits(1), v = rnd(100, 200), k = rnd(5, 40);
      return R(`¿Cuánto vale \`${a}.weight\`?`, src(PRODUCT + `\nvoid bump(Product& p) {\n  p.weight += ${k};\n}`, `Product ${a};\n${a}.weight = ${v};\nbump(${a});`),
        v + k, [v, k], `Con \`Product&\` el parámetro es el mismo registro de quien llama (como readmovie en el PPT): queda en ${v + k}.`, `${a}.weight`);
    },
    function () {
      const v = rnd(10, 60), i = rnd(0, 2);
      return R(`¿Cuánto vale \`items[${i}].weight\`?`, src(PRODUCT, `Product items[3];\nfor (int i = 0; i < 3; ++i)\n  items[i].weight = (i + 1) * ${v};`),
        (i + 1) * v, [i * v, (i + 2) * v], `Cada elemento es un Product completo. Con i = ${i}: (${i} + 1) × ${v} = ${(i + 1) * v}.`, `items[${i}].weight`);
    },
    function () {
      const w = distinct(3, 50, 300), t = w[0] + w[1] + w[2];
      return R("¿Qué imprime?", src(PRODUCT, `Product box[3] = {{${w[0]}, 0.5f},\n                  {${w[1]}, 0.8f},\n                  {${w[2]}, 1.2f}};\nint total = 0;\nfor (int i = 0; i < 3; ++i)\n  total += box[i].weight;\ncout << total;`),
        t, [w[0] + w[1], w[2]], `El ciclo selecciona el campo weight de cada registro: ${w[0]} + ${w[1]} + ${w[2]} = ${t}.`);
    },
    function () {
      const [a] = fruits(1);
      return R(`En este código, ¿qué es \`${a}\`?`, src(PRODUCT, `Product ${a};`),
        "Un objeto", ["Un tipo", "Un miembro"], `Product es el tipo (como int) y \`${a}\` es un objeto de ese tipo, con sus propios weight y price.`, false);
    },
    function () {
      const [a] = fruits(1);
      return R("En este código, ¿qué es `Product`?", src(PRODUCT, `Product ${a};`),
        "Un tipo", ["Un objeto", "Una función"], "Un struct define un tipo nuevo. Luego se puede usar Product donde se requiera un tipo.", false);
    },
    function () {
      const [a] = fruits(1);
      return R(`¿Qué tipo tiene \`${a}.price\`?`, src(PRODUCT, `Product ${a};`),
        "float", ["int", "Product"], `\`${a}.price\` se comporta como una variable float, porque así se declaró ese miembro.`, false);
    },
    function () {
      const [a, b, c] = fruits(3);
      return R("¿Cuántos objetos Product se declaran?", src(`struct Product {\n  int weight;\n  float price;\n} ${a}, ${b};\nProduct ${c};`, ""),
        3, [2, 1], `\`${a}\` y \`${b}\` se declaran en la lista opcional después de la llave, y \`${c}\` usando el nombre del tipo: 3 objetos.`, false);
    },
    function () {
      const [a, b] = fruits(2), v = rnd(100, 200), w = rnd(201, 300);
      return R("¿Qué imprime?", src(PRODUCT, `Product ${a}, ${b};\n${a}.weight = ${v};\n${b} = ${a};\n${b}.weight = ${w};\ncout << ${a}.weight + ${b}.weight;`),
        v + w, [2 * v, 2 * w], `\`${b} = ${a}\` copia los miembros; luego solo cambia \`${b}\`. ${v} + ${w} = ${v + w}.`);
    },
    function () {
      const [t, y] = film();
      return R("¿Qué imprime?", src(MOVIE + "\n" + PRINTMOVIE, `Movie mine = {"${t}", ${y}};\nprintmovie(mine);`),
        `${t} (${y})`, [`${t} ${y}`, `mine (${y})`], "Se pasa el registro completo y printmovie imprime el título, un espacio y el año entre paréntesis.");
    },
    function () {
      const [t, y] = film();
      return R("En `printmovie(Movie movie)`, el parámetro movie es…", src(MOVIE + "\n" + PRINTMOVIE, `Movie mine = {"${t}", ${y}};\nprintmovie(mine);`),
        "Una copia de mine", ["mine mismo", "Un puntero a mine"], "Sin `&`, pasar un registro por valor copia todos sus miembros. Cambiar movie dentro no afectaría a mine.", false);
    },
    function () {
      return R("¿Por qué `readmovie` recibe `Movie& movie`?", "void readmovie(Movie& movie) {\n  getline(cin, movie.title);\n  // ...\n}",
        "Para actualizar el registro de quien llama", ["Para copiar el registro", "Porque getline lo exige"], "El parámetro por referencia es el mismo registro de quien llama, así la función puede llenarlo.");
    },
    function () {
      return R("¿Por qué el título se lee con `getline`?", "getline(cin, movie.title);",
        "Conserva los espacios del título", ["Convierte el texto en entero", "Lee solo una palabra"], "`cin >>` se detiene en el primer espacio; getline lee la línea completa, como \"2001: Odisea del espacio\".");
    },
    function () {
      const [t, y] = film(), k = rnd(1, 9);
      return R("¿Qué imprime?", src(MOVIE, `Movie m;\nstring line = "${y}";\nstringstream(line) >> m.year;\ncout << m.year + ${k};`),
        y + k, [`${y}${k}`, y], `El flujo de cadenas convierte el texto "${y}" en el entero ${y}; luego se suma ${k}: ${y + k}.`);
    },
    function () {
      const i = rnd(0, 2);
      return R(`¿Qué selecciona \`films[${i}].year\`?`, src(MOVIE, "Movie films[3];"),
        `El año del registro ${i}`, [`El año número ${i}`, "Todos los años"], `films[${i}] es un Movie completo (el elemento ${i}) y .year selecciona su campo.`, false);
    },
    function () {
      const base = rnd(1960, 2000), k = rnd(1, 9);
      return R("¿Qué imprime?", src(MOVIE, `Movie films[3];\nfor (int i = 0; i < 3; ++i)\n  films[i].year = ${base} + i * ${k};\ncout << films[2].year - films[0].year;`),
        2 * k, [k, 3 * k], `films[0].year = ${base} y films[2].year = ${base} + 2 × ${k}. La diferencia es ${2 * k}.`);
    },
    function () {
      const [a, b] = fruits(2), v = rnd(100, 200), w = rnd(201, 300), z = rnd(301, 400);
      return R(`¿Cuánto vale \`${b}.weight\`?`, src(PRODUCT, `Product ${a} = {${v}, 0.8f};\nProduct ${b} = {${w}, 0.9f};\n${b} = ${a};\n${a}.weight = ${z};`),
        v, [z, w], `\`${b} = ${a}\` copia los miembros en ese momento (${v}). Cambiar \`${a}\` después no toca la copia.`, `${b}.weight`);
    },
    function () {
      const [a] = fruits(1);
      return R("¿Qué agrupa un registro (struct)?", src(PRODUCT, `Product ${a};`),
        "Campos relacionados de distintos tipos", ["Valores de un mismo tipo", "Solo funciones"], "Un arreglo agrupa valores de un mismo tipo; un registro agrupa campos relacionados (aquí un int y un float).", false);
    }
  ];

  /* ---------- p02 · Sintaxis de registros (clasificador) ---------- */
  const P_SYN_ITEMS = [
    { decl: PRODUCT, body: "Product apple;\napple.weight = 150;", bin: "compila", explain: "Se declara el objeto con el nombre del tipo y el punto selecciona un miembro." },
    { decl: "struct Product {\n  int weight;\n  float price;\n} apple, banana;", body: "banana.price = 0.9f;", bin: "compila", explain: "La lista opcional de objetos va después de la llave de cierre, y la declaración termina con punto y coma." },
    { decl: MOVIE, body: "Movie mine = {\"Alien\", 1979};\nMovie yours = mine;", bin: "compila", explain: "Se inicializa campo por campo en orden y luego se copia el registro completo." },
    { decl: MOVIE, body: "Movie movie = {\"Alien\", 1979};\nMovie* pmovie = &movie;\npmovie->year = 1980;", bin: "compila", explain: "Con un puntero se usa la flecha: `pmovie->year`." },
    { decl: MOVIE, body: "Movie movie = {\"Alien\", 1979};\nMovie* pmovie = &movie;\n(*pmovie).year = 1980;", bin: "compila", explain: "`(*pmovie).year` equivale a `pmovie->year`: los paréntesis desreferencian primero." },
    { decl: MOVIE + "\n" + FRIEND, body: "Friend charlie;\ncharlie.favorite_movie.year = 2001;", bin: "compila", explain: "En registros anidados se selecciona un nivel a la vez: charlie, luego favorite_movie, luego year." },
    { decl: MOVIE + "\n" + FRIEND, body: "Friend charlie;\nFriend* pfriend = &charlie;\npfriend->favorite_movie.year = 2001;", bin: "compila", explain: "Flecha para el puntero y luego punto para el miembro del objeto anidado." },
    { decl: MOVIE, body: "Movie films[3];\nfilms[0].year = 1968;", bin: "compila", explain: "Cada elemento del arreglo es un Movie: films[0].year selecciona un campo." },
    { decl: MOVIE + "\nvoid setyear(Movie& m) {\n  m.year = 2000;\n}", body: "Movie films[3];\nsetyear(films[1]);", bin: "compila", explain: "Las mismas funciones sirven para un registro individual o un elemento del arreglo." },
    { decl: PRODUCT, body: "Product apple, banana;\nbanana = apple;", bin: "compila", explain: "Un registro se puede asignar a otro del mismo tipo: se copian sus miembros." },
    { decl: MOVIE, body: "Movie m;\nstring line = \"1968\";\nstringstream(line) >> m.year;", bin: "compila", explain: "Un flujo de cadenas convierte el texto en el entero year, como en readmovie." },
    { decl: "struct Product {\n  int weight;\n  float price;\n}\nProduct apple;", body: "", bin: "no compila", explain: "Falta el punto y coma después de la llave de cierre: la declaración del struct debe terminar con `;`." },
    { decl: MOVIE, body: "Movie movie;\nMovie* pmovie = &movie;\n*pmovie.year = 1969;", bin: "no compila", explain: "El punto tiene mayor precedencia que `*`: se intenta `pmovie.year` y pmovie es un puntero. Se escribe `(*pmovie).year` o `pmovie->year`." },
    { decl: MOVIE, body: "Movie mine;\nmine->year = 1969;", bin: "no compila", explain: "mine es un objeto, no un puntero: se usa `mine.year`." },
    { decl: MOVIE, body: "Movie movie;\nMovie* pmovie = &movie;\npmovie.year = 1969;", bin: "no compila", explain: "pmovie es un puntero: para llegar al miembro hay que usar `->` (o `(*pmovie).`)." },
    { decl: PRODUCT, body: "Product.weight = 150;", bin: "no compila", explain: "Product es el tipo, no un objeto. Se necesita un objeto: `apple.weight`." },
    { decl: PRODUCT, body: "Product apple;\napple.color = 3;", bin: "no compila", explain: "Product solo tiene weight y price: no existe el miembro color." },
    { decl: MOVIE + "\n" + FRIEND, body: "Friend charlie;\nFriend* pfriend = &charlie;\npfriend.favorite_movie.year = 2001;", bin: "no compila", explain: "pfriend es un puntero: el primer nivel se selecciona con `->`." },
    { decl: MOVIE + "\n" + FRIEND, body: "Friend charlie;\nFriend* pfriend = &charlie;\npfriend->favorite_movie->year = 2001;", bin: "no compila", explain: "favorite_movie es un objeto Movie, no un puntero: después de la flecha va un punto." },
    { decl: MOVIE + "\n" + FRIEND, body: "Friend charlie;\ncharlie.year = 2001;", bin: "no compila", explain: "year es miembro de Movie, no de Friend: hay que pasar por `charlie.favorite_movie.year`." },
    { decl: MOVIE, body: "Movie films[3];\nfilms.year = 1968;", bin: "no compila", explain: "films es un arreglo; primero hay que elegir un elemento: `films[0].year`." },
    { decl: MOVIE, body: "Movie mine = {1979, \"Alien\"};", bin: "no compila", explain: "Los valores entre llaves van en el orden de los miembros: primero title (string), luego year (int)." }
  ];

  /* ---------- p03 · Punteros y anidación (disparos) ---------- */
  const P_PTR_GENS = [
    function () {
      const [t, y] = film(), y2 = y + rnd(1, 9);
      return S(`¿Cuánto vale \`movie.year\`?`, src(MOVIE, `Movie movie = {"${t}", ${y}};\nMovie* pmovie = &movie;\npmovie->year = ${y2};`),
        y2, [y, 0, y2 - y], `pmovie guarda la dirección de movie, así que \`pmovie->year\` y \`movie.year\` son el mismo campo: ${y2}.`, "movie.year");
    },
    function () {
      const [t, y] = film(), y2 = y + rnd(1, 9);
      return S("¿Qué imprime?", src(MOVIE, `Movie movie = {"${t}", ${y}};\nMovie* pmovie = &movie;\nmovie.year = ${y2};\ncout << (*pmovie).year;`),
        y2, [y, 0, y + y2], `\`(*pmovie).year\` desreferencia el puntero y selecciona year: lee el campo de movie, que ahora es ${y2}.`);
    },
    function () {
      return S("¿Qué expresión equivale a `pmovie->year`?", src(MOVIE, "Movie movie;\nMovie* pmovie = &movie;"),
        "(*pmovie).year", ["*pmovie.year", "*(pmovie.year)", "&pmovie.year"], "La flecha desreferencia el puntero y luego selecciona el miembro: `(*pmovie).year`.", false);
    },
    function () {
      return S("¿Por qué `*pmovie.year` no compila?", "Movie* pmovie = &movie;\n*pmovie.year = 1969;",
        "El punto se aplica antes que el *", ["Falta un punto y coma", "year es privado", "Movie no tiene year"], "La selección de miembros tiene mayor precedencia que la desreferenciación: se intenta `pmovie.year` y pmovie es un puntero.");
    },
    function () {
      const [t, y] = film(), z = rnd(1960, 2020);
      return S("¿Qué imprime?", src(MOVIE + "\n" + FRIEND, `Friend charlie = {"Charlie", "", {"${t}", ${y}}};\nFriend* pfriend = &charlie;\ncharlie.favorite_movie.year = ${z};\ncout << pfriend->favorite_movie.year;`),
        z, [y, 0, z - y], `pfriend apunta a charlie: flecha para el puntero y punto para el objeto anidado. Lee el año ya cambiado, ${z}.`);
    },
    function () {
      return S("¿Cómo se lee el año de la película favorita mediante `pfriend`?", src(MOVIE + "\n" + FRIEND, "Friend charlie;\nFriend* pfriend = &charlie;"),
        "pfriend->favorite_movie.year", ["pfriend.favorite_movie.year", "pfriend->favorite_movie->year", "pfriend->year"], "Se selecciona un nivel a la vez: `->` porque pfriend es puntero, y `.` porque favorite_movie es un objeto.", false);
    },
    function () {
      const [t, y] = film(), z = y + rnd(1, 9);
      return S("¿Qué imprime?", src(MOVIE, `Movie m = {"${t}", ${y}};\nMovie* p = &m;\nMovie* q = p;\nq->year = ${z};\ncout << p->year;`),
        z, [y, 0, z + y], `\`q = p\` copia la dirección: ambos apuntan a m. Escribir mediante q cambia el año que lee p: ${z}.`);
    },
    function () {
      const [ya, yb] = distinct(2, 1960, 2020), z = rnd(1900, 1959);
      return S("¿Cuánto vale `a.year`?", src(MOVIE, `Movie a = {"A", ${ya}}, b = {"B", ${yb}};\nMovie* p = &a;\np = &b;\np->year = ${z};`),
        ya, [z, yb, 0], `\`p = &b\` cambia la dirección guardada. La escritura llega a b; a sigue con ${ya}.`, "a.year");
    },
    function () {
      const [ya, yb] = distinct(2, 1960, 2020), z = rnd(1900, 1959);
      return S("¿Cuánto vale `b.year`?", src(MOVIE, `Movie a = {"A", ${ya}}, b = {"B", ${yb}};\nMovie* p = &a;\np = &b;\np->year = ${z};`),
        z, [yb, ya, 0], `Al final p apunta a b, así que \`p->year = ${z}\` cambia el año de b.`, "b.year");
    },
    function () {
      const [t, y] = film(), z = y + rnd(1, 9);
      return S("¿Qué imprime?", src(MOVIE, `Movie m = {"${t}", ${y}};\nMovie* p = &m;\nMovie copy = *p;\ncopy.year = ${z};\ncout << p->year;`),
        y, [z, 0, y + z], `\`*p\` es el registro m y \`Movie copy = *p\` lo copia. Cambiar la copia no toca m: ${y}.`);
    },
    function () {
      const i = rnd(0, 2), z = rnd(1960, 2020);
      return S(`¿Qué imprime?`, src(MOVIE, `Movie films[3];\nMovie* p = &films[${i}];\np->year = ${z};\ncout << films[${i}].year;`),
        z, [0, i, z + i], `p guarda la dirección del elemento ${i}; la flecha escribe en ese registro.`);
    },
    function () {
      return S("¿Qué tipo tiene `pmovie`?", src(MOVIE, "Movie movie;\nMovie* pmovie = &movie;"),
        "Movie*", ["Movie", "int*", "Movie&"], "`Movie*` apunta a un Movie; &movie proporciona su dirección.", false);
    },
    function () {
      return S("¿Qué tipo tiene `*pmovie`?", src(MOVIE, "Movie movie;\nMovie* pmovie = &movie;"),
        "Movie", ["Movie*", "int", "string"], "Desreferenciar un Movie* da el registro apuntado, que es un Movie.", false);
    },
    function () {
      return S("¿Qué tipo tiene `pfriend->favorite_movie`?", src(MOVIE + "\n" + FRIEND, "Friend charlie;\nFriend* pfriend = &charlie;"),
        "Movie", ["Movie*", "Friend", "int"], "favorite_movie es un miembro de tipo Movie: un registro dentro de otro.", false);
    },
    function () {
      const [t, y] = film(), z = y + rnd(1, 9);
      return S("¿Qué imprime?", src(MOVIE + "\n" + FRIEND, `Friend charlie = {"Charlie", "", {"${t}", ${y}}};\nFriend other = charlie;\nother.favorite_movie.year = ${z};\ncout << charlie.favorite_movie.year;`),
        y, [z, 0, y + z], "Copiar un registro copia todos sus miembros, incluido el registro anidado. Cambiar other no toca charlie.");
    },
    function () {
      const [t, y] = film(), z = y + rnd(1, 9);
      return S("¿Qué imprime?", src(MOVIE + "\n" + FRIEND, `Friend charlie = {"Charlie", "", {"${t}", ${y}}};\nMovie* pm = &charlie.favorite_movie;\npm->year = ${z};\ncout << charlie.favorite_movie.year;`),
        z, [y, 0, y + z], `pm apunta al registro anidado dentro de charlie: la flecha escribe directamente en él (${z}).`);
    },
    function () {
      const [t, y] = film(), z = y + rnd(1, 9);
      return S("¿Qué imprime?", src(MOVIE + `\nvoid setyear(Movie* m, int y) {\n  m->year = y;\n}`, `Movie mine = {"${t}", ${y}};\nsetyear(&mine, ${z});\ncout << mine.year;`),
        z, [y, 0, y + z], `La función recibe la dirección de mine y escribe mediante la flecha: mine.year pasa a ${z}.`);
    },
    function () {
      const [t, y] = film(), z = y + rnd(1, 9);
      return S("¿Qué imprime?", src(MOVIE + `\nvoid setyear(Movie m, int y) {\n  m.year = y;\n}`, `Movie mine = {"${t}", ${y}};\nsetyear(mine, ${z});\ncout << mine.year;`),
        y, [z, 0, y + z], "Por valor, la función cambia una copia del registro: mine conserva su año.");
    },
    function () {
      const y = rnd(1960, 2020);
      return S("¿Qué imprime?", src(MOVIE, `Movie m = {"M", ${y}};\nMovie* p = &m;\ncout << (*p).year + p->year;`),
        2 * y, [y, 0, `${y}${y}`], `Ambas expresiones leen el mismo campo: ${y} + ${y} = ${2 * y}.`);
    },
    function () {
      const [a] = fruits(1), v = rnd(100, 200), k = rnd(5, 40);
      return S(`¿Cuánto vale \`${a}.weight\`?`, src(PRODUCT, `Product ${a} = {${v}, 0.8f};\nProduct* p = &${a};\np->weight += ${k};`),
        v + k, [v, k, 0], `p apunta a ${a}: \`p->weight += ${k}\` cambia su campo a ${v + k}.`, `${a}.weight`);
    },
    function () {
      return S("En un registro anidado, ¿cómo se seleccionan los miembros?", src(MOVIE + "\n" + FRIEND, "Friend charlie;"),
        "Un nivel a la vez", ["Todos de una vez con ->", "Solo mediante punteros", "No se puede"], "Un miembro puede ser a su vez una estructura: charlie.favorite_movie.year selecciona un nivel en cada paso.", false);
    }
  ];

  /* ===================================================================
     BLOQUE 2 · CLASES (PPT §2)
     =================================================================== */

  /* ---------- p04 · Estado y acceso (clasificador) ---------- */
  const P_ACC_ITEMS = [
    { decl: RECT_SET, body: "Rectangle rect;\nrect.set_values(3, 4);\nint a = rect.area();", bin: "compila", explain: "El código externo usa la interfaz pública: set_values y area." },
    { decl: "class Rectangle {\n  int width, height;\npublic:\n  void set_values(int, int);\n};\nvoid Rectangle::set_values(int w, int h) {\n  width = w;\n  height = h;\n}", body: "", bin: "compila", explain: "`Rectangle::` indica que es la definición de un miembro: tiene acceso a los miembros privados." },
    { decl: "struct Record {\n  int value;\n};", body: "Record r;\nr.value = 3;", bin: "compila", explain: "En un struct el acceso es público por defecto." },
    { decl: "class Object {\npublic:\n  int value;\n};", body: "Object o;\no.value = 2;", bin: "compila", explain: "La etiqueta `public:` hace accesible a value desde fuera." },
    { decl: RECT_SET, body: "Rectangle rect, rectb;\nrect.set_values(3, 4);\nrectb.set_values(5, 6);", bin: "compila", explain: "Cada objeto llama a la interfaz pública con su propio estado." },
    { decl: RECT_SET, body: "Rectangle rect;\nRectangle* p = &rect;\np->set_values(1, 2);", bin: "compila", explain: "Un puntero a objeto usa la flecha para llamar a un miembro público." },
    { decl: "class Counter {\n  int x;\npublic:\n  void set(int v) { x = v; }\n  int get() { return x; }\n};", body: "Counter c;\nc.set(4);\ncout << c.get();", bin: "compila", explain: "Las funciones miembro de la propia clase sí pueden usar el miembro privado x." },
    { decl: "class Counter {\nprotected:\n  int x;\npublic:\n  void set(int v) { x = v; }\n};", body: "Counter c;\nc.set(7);", bin: "compila", explain: "protected es accesible desde la misma clase: set puede escribir x." },
    { decl: "class Rectangle {\n  int width, height;\npublic:\n  void set_values(int w, int h) {\n    width = w; height = h;\n  }\n  bool same(Rectangle o) {\n    return width == o.width;\n  }\n};", body: "", bin: "compila", explain: "Una función de la misma clase puede leer los miembros privados de otro objeto Rectangle." },
    { decl: "class Mixed {\npublic:\n  int a;\nprivate:\n  int b;\n};", body: "Mixed m;\nm.a = 1;", bin: "compila", explain: "Cada etiqueta se aplica a los miembros siguientes: a quedó público." },
    { decl: RECT_SET, body: "Rectangle rect;\nrect.width = 8;", bin: "no compila", explain: "width es privado (class comienza con acceso privado). Hay que cambiarlo mediante la interfaz: set_values." },
    { decl: "class Object {\n  int value;\n};", body: "Object o;\no.value = 3;", bin: "no compila", explain: "En una class, sin etiqueta, los miembros son privados." },
    { decl: RECT_SET, body: "Rectangle rect;\nrect.set_values(3, 4);\ncout << rect.height;", bin: "no compila", explain: "Leer un miembro privado desde fuera tampoco se permite, aunque solo sea para imprimirlo." },
    { decl: RECT_SET, body: "Rectangle rect;\nRectangle* p = &rect;\np->width = 5;", bin: "no compila", explain: "Un puntero no evita las restricciones de acceso: width sigue siendo privado." },
    { decl: "class Rectangle {\n  int width, height;\npublic:\n  void set_values(int, int);\n};\nvoid set_values(int w, int h) {\n  width = w;\n}", body: "", bin: "no compila", explain: "Sin `Rectangle::` se define una función suelta, que no conoce width. Falta el ámbito de la clase." },
    { decl: "class Counter {\nprotected:\n  int x;\n};", body: "Counter c;\nc.x = 1;", bin: "no compila", explain: "protected se comporta como private para el código externo." },
    { decl: RECT_SET, body: "Rectangle rect;\nint a = area();", bin: "no compila", explain: "area es un miembro: se llama sobre un objeto, `rect.area()`." },
    { decl: "class Mixed {\npublic:\n  int a;\nprivate:\n  int b;\n};", body: "Mixed m;\nm.b = 1;", bin: "no compila", explain: "La etiqueta `private:` se aplica a b: no es accesible desde fuera." },
    { decl: "class Tool {\n  void helper() {}\npublic:\n  void run() { helper(); }\n};", body: "Tool t;\nt.helper();", bin: "no compila", explain: "helper es una función miembro privada: solo run (de la misma clase) puede llamarla." },
    { decl: "class Tool {\n  void helper() {}\npublic:\n  void run() { helper(); }\n};", body: "Tool t;\nt.run();", bin: "compila", explain: "run es público y, como miembro, puede llamar al privado helper." },
    { decl: RECT_SET, body: "Rectangle.set_values(3, 4);", bin: "no compila", explain: "Rectangle es el tipo. Se necesita un objeto: `Rectangle rect; rect.set_values(3, 4);`." }
  ];

  /* ---------- p05 · Constructores (carrera) ---------- */
  const P_CTOR_GENS = [
    function () {
      const [o] = objs(1), [w, h] = distinct(2, 2, 12);
      return R("¿Qué imprime?", src(RECT_CTOR, `Rectangle ${o}(${w}, ${h});\ncout << ${o}.area();`),
        w * h, [w + h, 0], `El constructor se ejecuta al crear ${o} y deja width = ${w}, height = ${h}. Área: ${w * h}.`);
    },
    function () {
      const d = rnd(2, 9), [w, h] = distinct(2, 2, 12);
      return R("¿Cuánto vale `a.area()`?", src(RECT_DEF(d), `Rectangle a;\nRectangle b(${w}, ${h});`),
        d * d, [w * h, 0], `\`Rectangle a;\` no tiene argumentos: usa el constructor predeterminado, que deja ${d} × ${d}.`, "a.area()");
    },
    function () {
      const d = rnd(2, 9), [w, h] = distinct(2, 2, 12);
      return R("¿Cuánto vale `b.area()`?", src(RECT_DEF(d), `Rectangle a;\nRectangle b(${w}, ${h});`),
        w * h, [d * d, w + h], `Los dos argumentos seleccionan el constructor de dos parámetros: ${w} × ${h} = ${w * h}.`, "b.area()");
    },
    function () {
      const d = rnd(2, 9), [w, h] = distinct(2, 2, 12);
      return R("¿Qué imprime?", src(RECT_DEF(d), `Rectangle a;\nRectangle b(${w}, ${h});\ncout << a.area() + b.area();`),
        d * d + w * h, [2 * d * d, 2 * w * h], `a usa el predeterminado (${d * d}) y b el de dos argumentos (${w * h}). Suma: ${d * d + w * h}.`);
    },
    function () {
      return R("¿Qué tipo de retorno tiene un constructor?", src(RECT_CTOR, ""),
        "Ninguno, ni siquiera void", ["void", "Rectangle"], "Un constructor lleva el nombre de la clase y no tiene tipo de retorno, ni siquiera void.", false);
    },
    function () {
      return R("¿Qué hace `Pair fourth();`?", "class Pair {\npublic:\n  Pair(int a, int b) { }\n};\nPair fourth();",
        "Declara una función", ["Crea un objeto", "No compila"], "Con paréntesis vacíos, la línea declara una función llamada fourth que devuelve un Pair. No crea ningún objeto.");
    },
    function () {
      return R("¿Compila `Pair third;`?", src("class Pair {\npublic:\n  Pair(int a, int b) { }\n};", "Pair third;"),
        "No compila", ["Sí, con a y b en 0", "Sí, con valores basura"], "Como Pair declara un constructor, el compilador no agrega uno predeterminado. No hay constructor sin argumentos.", "FAIL");
    },
    function () {
      return R("¿Compila `Example first;`?", src("class Example {\npublic:\n  int a, b;\n};", "Example first;"),
        "Sí: constructor implícito", ["No: falta un constructor", "Solo con new"], "Example no declara constructores, así que el compilador proporciona uno predeterminado implícito.", false);
    },
    function () {
      return R("Tras `Example first;`, ¿cuánto vale `first.a`?", "class Example {\npublic:\n  int a, b;\n};\n// dentro de main:\nExample first;",
        "Sin inicializar", ["0", "1"], "Un constructor implícito no inicializa por sí solo los campos enteros con valores útiles: leerlo sería leer basura.");
    },
    function () {
      return R("¿Cuándo se ejecuta el constructor?", src(RECT_CTOR, "Rectangle rect(3, 4);"),
        "Al crear el objeto", ["Al llamar a area()", "Al terminar main"], "Se ejecuta en la declaración del objeto, antes de usarlo.", false);
    },
    function () {
      const order = shuffle(["", "", "3"]), out = order.map(x => (x ? "B" : "A")).join("");
      const names = ["x", "y", "z"];
      const lines = order.map((a, i) => `Tag ${names[i]}${a ? `(${a})` : ""};`).join("\n");
      return R("¿Qué imprime?", src("class Tag {\npublic:\n  Tag() { cout << \"A\"; }\n  Tag(int n) { cout << \"B\"; }\n};", lines),
        out, shuffle(["AAA", "BBB", "AAB", "ABA", "BAA", "ABB", "BAB", "BBA"].filter(s => s !== out)),
        "Cada declaración construye un objeto. Sin argumentos se usa Tag() (A); con un int, Tag(int) (B).");
    },
    function () {
      const [w, h, w2, h2] = [rnd(2, 9), rnd(2, 9), rnd(2, 9), rnd(10, 12)];
      return R("¿Qué imprime?", src("class Rectangle {\n  int width, height;\npublic:\n  Rectangle(int, int);\n  int area() { return width * height; }\n};\nRectangle::Rectangle(int w, int h) {\n  width = w; height = h;\n}",
        `Rectangle rect(${w}, ${h}), rectb(${w2}, ${h2});\ncout << rectb.area();`),
        w2 * h2, [w * h, w2 + h2], `El constructor se define fuera con \`Rectangle::Rectangle\`. rectb queda ${w2} × ${h2} = ${w2 * h2}.`);
    },
    function () {
      const [w, h] = distinct(2, 2, 12);
      return R("¿Qué imprime?", src(RECT_SET, `Rectangle r;\nr.set_values(${w}, ${h});\ncout << r.area();`),
        w * h, [0, w + h], `Esta clase no declara constructores (usa el implícito) y set_values fija el estado: ${w * h}.`);
    },
    function () {
      return R("¿Cómo se llama el constructor de la clase `Rectangle`?", src(RECT_CTOR, ""),
        "Rectangle", ["~Rectangle", "set_values"], "El constructor lleva el nombre de la clase. ~Rectangle sería el destructor.", false);
    },
    function () {
      return R("¿Es válido `rect.Rectangle(3, 4);`?", "Rectangle rect(5, 6);\nrect.Rectangle(3, 4);",
        "No: no es una llamada ordinaria", ["Sí, reinicia rect", "Sí, crea otro objeto"], "La construcción ocurre en la declaración del objeto. Un constructor no se llama como una función miembro.");
    },
    function () {
      const k = rnd(2, 9);
      return R("¿Qué imprime?", src("class Rectangle {\n  int width, height;\npublic:\n  Rectangle() { width = 1; height = 1; }\n  Rectangle(int s) { width = s; height = s; }\n  Rectangle(int w, int h) { width = w; height = h; }\n  int area() { return width * height; }\n};",
        `Rectangle sq(${k});\ncout << sq.area();`),
        k * k, [k, 1], `Un argumento selecciona Rectangle(int s): ${k} × ${k} = ${k * k}. Los argumentos eligen la sobrecarga.`);
    },
    function () {
      const n = rnd(2, 4);
      return R("¿Qué imprime?", src("class Tag {\npublic:\n  Tag() { cout << \"A\"; }\n};", `Tag tags[${n}];`),
        "A".repeat(n), ["A", "A".repeat(n + 1)], `Cada elemento del arreglo es un objeto: el constructor predeterminado corre ${n} veces.`);
    },
    function () {
      const [a, b] = distinct(2, 2, 40);
      return R("¿Qué imprime?", src("class Point {\n  int x, y;\npublic:\n  Point(int a, int b) : x(a), y(b) {}\n  int sum() { return x + y; }\n};", `Point p(${a}, ${b});\ncout << p.sum();`),
        a + b, [a * b, 0], `Lo que va después de los dos puntos inicializa los miembros (como en Coupon del PPT): x = ${a}, y = ${b}.`);
    },
    function () {
      return R("Si una clase declara solo `Pair(int a, int b)`, ¿qué constructor predeterminado agrega el compilador?", "class Pair {\npublic:\n  Pair(int a, int b) { }\n};",
        "Ninguno", ["Pair()", "Pair(int)"], "El constructor predeterminado implícito existe solo si no se declara ningún constructor.");
    },
    function () {
      const [w, h] = distinct(2, 2, 12);
      return R("¿Qué imprime?", src(RECT_CTOR, `Rectangle* p = new Rectangle(${w}, ${h});\ncout << p->area();\ndelete p;`),
        w * h, [0, w + h], `new crea el objeto y llama al constructor con (${w}, ${h}). La flecha llama a area: ${w * h}.`);
    },
    function () {
      const [w, h, w2, h2] = [rnd(2, 6), rnd(2, 6), rnd(7, 9), rnd(7, 9)];
      return R("¿Qué imprime?", src(RECT_BOTH, `Rectangle r(${w}, ${h});\nr.set_values(${w2}, ${h2});\ncout << r.area();`),
        w2 * h2, [w * h, w * h + w2 * h2], `El constructor fija el estado inicial (${w} × ${h}); después set_values lo reemplaza: ${w2 * h2}.`);
    },
    function () {
      return R("¿Qué es el constructor predeterminado?", src(RECT_DEF(5), ""),
        "El que no recibe argumentos", ["El primero que se escribe", "El que recibe dos ints"], "El constructor sin argumentos se denomina constructor predeterminado (como Rectangle() con 5 × 5).", false);
    }
  ];

  /* ---------- p06 · Vida de un objeto (disparos) ---------- */
  const TAG = "class T {\n  char n;\npublic:\n  T(char c) { n = c; cout << n; }\n  ~T() { cout << '~' << n; }\n};";
  const UNIT = "class U {\npublic:\n  U() { cout << \"c\"; }\n  ~U() { cout << \"d\"; }\n};";
  const LET = () => pickN("ABCDEFGHKMPQRS".split(""), 3);
  const P_LIFE_GENS = [
    function () {
      const [a] = LET();
      return S("¿Qué imprime?", src(TAG, `{\n  T x('${a}');\n}\ncout << "|";`),
        `${a}~${a}|`, [`${a}|~${a}`, `${a}|`, `~${a}${a}|`], "Un objeto automático se destruye al salir de su ámbito: el destructor corre antes de imprimir |.");
    },
    function () {
      const [a, b] = LET();
      return S("¿Qué imprime?", src(TAG, `{\n  T x('${a}');\n  T y('${b}');\n}`),
        `${a}${b}~${b}~${a}`, [`${a}${b}~${a}~${b}`, `${a}${b}`, `${a}~${a}${b}~${b}`], "Se construyen en orden y, al cerrar la llave, se destruyen en orden inverso.");
    },
    function () {
      const [a, b] = LET();
      return S("¿Qué imprime?", src(TAG, `{\n  T* p = new T('${a}');\n  T y('${b}');\n  delete p;\n}`),
        `${a}${b}~${a}~${b}`, [`${a}${b}~${b}~${a}`, `${a}${b}~${b}`, `${a}~${a}${b}~${b}`], `delete p destruye ${a} en ese momento; ${b} se destruye después, al salir del bloque.`);
    },
    function () {
      const [a, b] = LET();
      return S("¿Qué imprime?", src(TAG, `{\n  T* p = new T('${a}');\n  T y('${b}');\n}`),
        `${a}${b}~${b}`, [`${a}${b}~${b}~${a}`, `${a}${b}~${a}~${b}`, `${a}${b}`], `Sin delete, el objeto dinámico ${a} nunca se destruye (queda una fuga). Solo ${b} se destruye al salir del bloque.`);
    },
    function () {
      const [a, b, c] = LET();
      return S("¿Qué imprime?", src(TAG, `{\n  T x('${a}');\n  {\n    T y('${b}');\n  }\n  T z('${c}');\n}`),
        `${a}${b}~${b}${c}~${c}~${a}`, [`${a}${b}${c}~${c}~${b}~${a}`, `${a}${b}~${b}${c}~${a}~${c}`, `${a}${b}${c}`], `${b} vive solo en el bloque interior y muere al cerrarlo. Luego nace ${c}, y al final mueren ${c} y ${a}.`);
    },
    function () {
      const [a] = LET(), n = rnd(2, 3);
      return S("¿Qué imprime?", src(TAG, `for (int i = 0; i < ${n}; ++i) {\n  T t('${a}');\n}`),
        `${a}~${a}`.repeat(n), [a.repeat(n) + `~${a}`.repeat(n), a.repeat(n), `${a}~${a}`], "El cuerpo del ciclo es un ámbito: en cada vuelta se crea t y se destruye al terminar la vuelta.");
    },
    function () {
      const [a, f] = LET();
      return S("¿Qué imprime?", src(TAG + `\nvoid f() {\n  T t('${f}');\n}`, `{\n  T x('${a}');\n  f();\n}`),
        `${a}${f}~${f}~${a}`, [`${a}${f}~${a}~${f}`, `${a}${f}`, `${f}${a}~${a}~${f}`], `El objeto local de f se destruye al terminar f, antes de que ${a} salga de su ámbito.`);
    },
    function () {
      const [a, b] = LET();
      return S("¿Qué imprime?", src(TAG, `{\n  T* p = new T('${a}');\n  delete p;\n  T x('${b}');\n}`),
        `${a}~${a}${b}~${b}`, [`${a}${b}~${b}~${a}`, `${a}${b}~${a}~${b}`, `${a}${b}~${b}`], "delete destruye el objeto dinámico de inmediato; después se construye x.");
    },
    function () {
      return S("¿Cuándo se ejecuta el destructor de un objeto automático?", src(TAG, ""),
        "Al terminar su ámbito", ["Al final del programa siempre", "Nunca", "Al llamar a delete"], "La destrucción ocurre al terminar el ámbito de un objeto automático.", false);
    },
    function () {
      return S("¿Cuándo se ejecuta el destructor de un objeto creado con new?", "Example* p = new Example;\n// ...\ndelete p;",
        "Al hacer delete", ["Al salir del bloque", "Al crear otro objeto", "Nunca"], "Un objeto asignado dinámicamente se destruye cuando se elimina con delete.");
    },
    function () {
      return S("¿Cómo se llama el destructor de la clase `Example`?", "class Example {\npublic:\n  Example();\n  ??? ();\n};",
        "~Example", ["Example", "delete Example", "!Example"], "El destructor es el nombre de la clase con ~ delante, sin tipo de retorno.");
    },
    function () {
      return S("¿Qué tipo de retorno tiene un destructor?", "~Example() { cout << \"destruido\"; }",
        "Ninguno", ["void", "int", "bool"], "Como el constructor, el destructor no tiene tipo de retorno.");
    },
    function () {
      const [w, h] = distinct(2, 2, 12);
      return S("¿Qué imprime?", src("class Rectangle {\n  int *width, *height;\npublic:\n  Rectangle(int w, int h) {\n    width = new int(w); height = new int(h);\n  }\n  ~Rectangle() { delete width; delete height; }\n  int area() { return *width * *height; }\n};",
        `Rectangle rect(${w}, ${h});\ncout << rect.area();`),
        w * h, [w + h, 0, `${w}${h}`], `Los campos son punteros a enteros dinámicos: area los desreferencia. ${w} × ${h} = ${w * h}.`);
    },
    function () {
      return S("¿Qué libera `~Rectangle() { delete width; delete height; }`?", "Rectangle(int w, int h) {\n  width = new int(w); height = new int(h);\n}\n~Rectangle() { delete width; delete height; }",
        "Los dos int creados en el constructor", ["El objeto rect", "Nada: lo hace el compilador", "Solo width"], "El constructor adquiere memoria y el destructor la libera. Sin él, esos dos int quedarían como fuga.");
    },
    function () {
      const n = rnd(2, 3);
      return S("¿Qué imprime?", src(UNIT, `{\n  U arr[${n}];\n}`),
        "c".repeat(n) + "d".repeat(n), ["cd".repeat(n), "c".repeat(n), "c".repeat(n) + "d"], `Se construyen los ${n} elementos y, al salir del bloque, se destruyen los ${n}.`);
    },
    function () {
      const n = rnd(2, 3);
      return S("¿Qué imprime?", src(UNIT, `U* p = new U[${n}];\ndelete[] p;`),
        "c".repeat(n) + "d".repeat(n), ["c".repeat(n) + "d", "cd".repeat(n), "c".repeat(n)], `new[] construye ${n} objetos y delete[] destruye todos los elementos.`);
    },
    function () {
      const [a, b, c] = LET();
      return S("¿Qué imprime?", src(TAG, `{\n  T x('${a}');\n  T y('${b}');\n  T z('${c}');\n}`),
        `${a}${b}${c}~${c}~${b}~${a}`, [`${a}${b}${c}~${a}~${b}~${c}`, `${a}${b}${c}`, `${a}~${a}${b}~${b}${c}~${c}`], "Los objetos automáticos de un mismo ámbito se destruyen en orden inverso al de creación.");
    },
    function () {
      const [a] = LET();
      return S("¿Qué imprime?", src(TAG, `{\n  T x('${a}');\n  T* p = &x;\n}`),
        `${a}~${a}`, [`${a}~${a}~${a}`, a, `${a}${a}~${a}~${a}`], "El puntero no crea otro objeto ni lo destruye: x se construye y se destruye una sola vez.");
    },
    function () {
      const [a, b] = LET();
      return S("¿Qué imprime?", src(TAG, `T* p = new T('${a}');\nT* q = new T('${b}');\ndelete p;\ndelete q;`),
        `${a}${b}~${a}~${b}`, [`${a}${b}~${b}~${a}`, `${a}${b}`, `${a}~${a}${b}~${b}`], "Con objetos dinámicos, el orden de destrucción lo decide el orden de los delete.");
    },
    function () {
      return S("¿Qué pasa si se copia un Rectangle que guarda `int*` y tiene destructor con delete?", "Rectangle a(3, 4);\nRectangle b(a);",
        "Ambos intentan liberar la misma memoria", ["Se copian los enteros", "No compila", "Nada especial"], "Copiar un int* copia la dirección, no el entero. Los dos destructores harían delete sobre lo mismo.");
    },
    function () {
      const [a, b] = LET();
      return S("¿Qué imprime?", src(TAG, `cout << "1";\n{\n  T x('${a}');\n  cout << "2";\n}\ncout << "3";`),
        `1${a}2~${a}3`, [`1${a}23~${a}`, `1${a}2${a}3`, `12${a}~${a}3`], "El destructor corre al cerrar la llave del bloque, antes de imprimir 3.");
    }
  ];

  /* ---------- p07 · Copias y punteros a objetos (carrera) ---------- */
  const P_COPY_GENS = [
    function () {
      const [w, h] = distinct(2, 2, 12);
      return R("¿Qué imprime?", src(RECT_CTOR, `Rectangle original(${w}, ${h});\nRectangle copy(original);\ncout << copy.area();`),
        w * h, [0, w + h], `\`Rectangle copy(original)\` construye copy a partir de original: copia width y height. Área: ${w * h}.`);
    },
    function () {
      const [w, h, w2, h2] = [rnd(2, 6), rnd(2, 6), rnd(7, 12), rnd(7, 12)];
      return R("¿Qué imprime?", src(RECT_CTOR, `Rectangle original(${w}, ${h});\nRectangle other(${w2}, ${h2});\nother = original;\ncout << other.area();`),
        w * h, [w2 * h2, w * h + w2 * h2], `La asignación por copia sustituye el estado de other, que ya existía, por el de original: ${w * h}.`);
    },
    function () {
      const [w, h, w2, h2] = [rnd(2, 6), rnd(2, 6), rnd(7, 12), rnd(7, 12)];
      return R("¿Qué imprime?", src(RECT_BOTH, `Rectangle original(${w}, ${h});\nRectangle copy(original);\noriginal.set_values(${w2}, ${h2});\ncout << copy.area();`),
        w * h, [w2 * h2, 0], `La copia se hizo antes del cambio y es independiente: copy conserva ${w} × ${h}.`);
    },
    function () {
      return R("Si `other` ya existe, `other = original;` es…", src(RECT_CTOR, "Rectangle original(3, 4);\nRectangle other(5, 6);\nother = original;"),
        "Asignación por copia", ["Construcción por copia", "Un objeto nuevo"], "La asignación actúa sobre un objeto que ya existe; la construcción por copia crea uno nuevo.", false);
    },
    function () {
      return R("`Rectangle copy(original);` es…", src(RECT_CTOR, "Rectangle original(3, 4);\nRectangle copy(original);"),
        "Construcción por copia", ["Asignación por copia", "Un puntero"], "Crea copy a partir de original usando el constructor de copia que el compilador declara implícitamente.", false);
    },
    function () {
      const [w, h] = distinct(2, 2, 12);
      return R("¿Qué imprime?", src(RECT_CTOR, `Rectangle a(${w}, ${h});\nRectangle* c = &a;\ncout << (*c).area();`),
        w * h, [0, w + h], "c apunta al objeto automático a. `(*c).area()` equivale a `c->area()`.");
    },
    function () {
      const [w, h] = distinct(2, 2, 12);
      return R("¿Qué imprime?", src(RECT_CTOR, `Rectangle* b = new Rectangle(${w}, ${h});\ncout << b->area();\ndelete b;`),
        w * h, [0, w + h], `b posee un objeto dinámico construido con (${w}, ${h}); se libera con delete.`);
    },
    function () {
      const [a1, b1, a2, b2] = [rnd(2, 9), rnd(2, 9), rnd(2, 9), rnd(2, 9)];
      return R("¿Qué imprime?", src(RECT_SET, `Rectangle* d = new Rectangle[2];\nd->set_values(${a1}, ${b1});\nd[1].set_values(${a2}, ${b2});\ncout << (d + 1)->area();\ndelete[] d;`),
        a2 * b2, [a1 * b1, a1 * b1 + a2 * b2], `\`d->\` selecciona el elemento 0 y \`d[1]\` el 1. \`(d + 1)->area()\` es el área del elemento 1: ${a2 * b2}.`);
    },
    function () {
      const [a1, b1, a2, b2] = [rnd(2, 9), rnd(2, 9), rnd(2, 9), rnd(2, 9)];
      return R("¿Qué imprime?", src(RECT_SET, `Rectangle* d = new Rectangle[2];\nd->set_values(${a1}, ${b1});\nd[1].set_values(${a2}, ${b2});\ncout << d[0].area();\ndelete[] d;`),
        a1 * b1, [a2 * b2, a1 * b1 + a2 * b2], `d apunta al elemento 0, así que \`d->set_values\` cambió d[0]: ${a1 * b1}.`);
    },
    function () {
      return R("¿Con qué se libera `d = new Rectangle[2]`?", src(RECT_SET, "Rectangle* d = new Rectangle[2];\ndelete[] d;"),
        "delete[] d;", ["delete d;", "No se libera"], "Lo creado con new[] se libera con delete[], que destruye ambos elementos.", false);
    },
    function () {
      return R("Si `Rectangle* c = &a;` con `a` automático, ¿se hace `delete c`?", src(RECT_CTOR, "Rectangle a(1, 2);\nRectangle* c = &a;"),
        "No: a no es dinámico", ["Sí, al final", "Sí, con delete[]"], "c no posee el objeto: a se destruye solo al terminar su ámbito. Eliminarlo sería un error.", false);
    },
    function () {
      return R("En la versión con `int *width, *height`, ¿qué copia `Rectangle b(a);`?", "class Rectangle {\n  int *width, *height;\n  // ...\n};\nRectangle a(3, 4);\nRectangle b(a);",
        "Las direcciones", ["Los enteros", "Nada"], "La copia predeterminada copia cada miembro: copia las direcciones, así que a y b comparten los mismos enteros.");
    },
    function () {
      return R("¿Un puntero a objeto permite leer un miembro privado?", src(RECT_SET, "Rectangle rect;\nRectangle* p = &rect;"),
        "No, el acceso sigue igual", ["Sí, con ->", "Sí, con (*p)."], "Un puntero no evita las restricciones de acceso de un miembro.", false);
    },
    function () {
      return R("Si `p` apunta a objetos, ¿qué designa `p[0]`?", src(RECT_SET, "Rectangle* p = new Rectangle[3];"),
        "El mismo objeto que *p", ["El objeto 1", "La dirección de p"], "p[0] y *p designan el primer objeto apuntado.", false);
    },
    function () {
      const [w, h] = distinct(2, 2, 12);
      return R("¿Qué imprime?", src(RECT_SET, `Rectangle a;\nRectangle* c = &a;\nc->set_values(${w}, ${h});\ncout << a.area();`),
        w * h, [0, w + h], `c apunta a a: la llamada mediante la flecha cambia el estado de a (${w} × ${h}).`);
    },
    function () {
      const [w, h, w2, h2] = [rnd(2, 6), rnd(2, 6), rnd(7, 12), rnd(7, 12)];
      return R("¿Qué imprime?", src(RECT_BOTH, `Rectangle original(${w}, ${h});\nRectangle copy = original;\ncopy.set_values(${w2}, ${h2});\ncout << original.area();`),
        w * h, [w2 * h2, 0], "La copia tiene su propio estado: cambiarla no toca original.");
    },
    function () {
      const [w, h, w2, h2] = [rnd(2, 6), rnd(2, 6), rnd(7, 12), rnd(7, 12)];
      return R("¿Qué imprime?", src(RECT_BOTH, `Rectangle original(${w}, ${h});\nRectangle other(1, 1);\nother = original;\noriginal.set_values(${w2}, ${h2});\ncout << other.area();`),
        w * h, [w2 * h2, 1], `La asignación copió ${w} × ${h} en ese momento. Cambiar original después no afecta a other.`);
    },
    function () {
      return R("Para una clase con campos `int`, la copia implícita…", src(RECT_CTOR, ""),
        "Copia width y height uno por uno", ["Comparte los campos", "Deja los campos en 0"], "Las operaciones de copia copian los miembros correspondientes.", false);
    },
    function () {
      return R("¿Qué declara implícitamente el compilador para una clase simple?", src(RECT_CTOR, ""),
        "Copia, asignación y destructor", ["Solo el constructor", "Nada"], "Para una clase simple puede declarar un constructor de copia, un operador de asignación por copia y un destructor.", false);
    },
    function () {
      const [a1, b1, a2, b2] = [rnd(2, 9), rnd(2, 9), rnd(2, 9), rnd(2, 9)];
      return R("¿Qué imprime?", src(RECT_SET, `Rectangle* d = new Rectangle[2];\nd[0].set_values(${a1}, ${b1});\nd[1].set_values(${a2}, ${b2});\ncout << d->area() + d[1].area();\ndelete[] d;`),
        a1 * b1 + a2 * b2, [2 * a1 * b1, 2 * a2 * b2], `\`d->area()\` es el elemento 0 (${a1 * b1}) y d[1] el elemento 1 (${a2 * b2}).`);
    },
    function () {
      return R("¿Basta un destructor para copiar seguro una clase que posee memoria?", "class Rectangle {\n  int *width, *height;\npublic:\n  ~Rectangle() { delete width; delete height; }\n};",
        "No: falta copia adecuada", ["Sí, siempre", "Sí, si es public"], "Una clase que posee memoria necesita una copia adecuada o debe impedirla (como Bond en el ejemplo del bono).");
    }
  ];

  /* ===================================================================
     BLOQUE 3 · ESTRUCTURAS, CLASES Y UNIONES + HERENCIA (PPT §3 y §4)
     =================================================================== */

  /* ---------- p08 · struct, class y union (disparos) ---------- */
  const KIND = "enum Kind { Whole, Real };";
  const VALUE_TAGGED = KIND + "\nstruct Value {\n  Kind kind;\n  union { int whole; double real; } data;\n};";
  const VALUE_ANON = KIND + "\nstruct Value {\n  Kind kind;\n  union { int whole; double real; };\n};";
  const reals = () => pick(["2.5", "1.25", "3.75", "0.5", "4.5", "7.25"]);
  const P_UNION_GENS = [
    function () {
      return S("En un `struct`, ¿qué acceso tienen los miembros por defecto?", "struct Record {\n  int value;\n};",
        "public", ["private", "protected", "Ninguno"], "struct usa acceso público por defecto; class, privado.");
    },
    function () {
      return S("En una `class`, ¿qué acceso tienen los miembros por defecto?", "class Object {\n  int value;\n};",
        "private", ["public", "protected", "Ninguno"], "class comienza con acceso privado a los miembros.");
    },
    function () {
      return S("En una `union`, ¿qué acceso tienen los miembros por defecto?", "union Number {\n  int whole;\n  double real;\n};",
        "public", ["private", "protected", "Ninguno"], "Una unión también es un tipo clase y su acceso a miembros es público por defecto.");
    },
    function () {
      return S("¿Cuántas alternativas mantiene a la vez una unión?", "union Number {\n  int whole;\n  double real;\n};",
        "Una: el miembro activo", ["Todas", "Dos", "Ninguna"], "Los miembros de una unión comparten almacenamiento: representa una alternativa a la vez.");
    },
    function () {
      const k = rnd(2, 99), r = reals();
      const first = pick([true, false]);
      const lines = first ? `n.whole = ${k};\nn.real = ${r};` : `n.real = ${r};\nn.whole = ${k};`;
      return S("¿Cuál es el miembro activo al final?", src("union Number {\n  int whole;\n  double real;\n};", `Number n;\n${lines}`),
        first ? "real" : "whole", [first ? "whole" : "real", "Ambos", "Ninguno"], "El miembro activo es el último que se escribió: usa ahora el almacenamiento compartido.", false);
    },
    function () {
      const r = reals();
      return S("¿Qué imprime?", src(VALUE_TAGGED, `Value v;\nv.kind = Real;\nv.data.real = ${r};\nif (v.kind == Real) cout << v.data.real;\nelse cout << v.data.whole;`),
        r, ["0", "1", "Real"], "La etiqueta kind dice que la alternativa activa es real, y eso es lo que se lee.");
    },
    function () {
      const k = rnd(2, 99);
      return S("¿Qué imprime?", src(VALUE_TAGGED, `Value v;\nv.kind = Whole;\nv.data.whole = ${k};\nif (v.kind == Real) cout << v.data.real;\nelse cout << v.data.whole;`),
        k, ["0", "Whole", "1"], "kind vale Whole, así que se lee la alternativa whole.");
    },
    function () {
      const k = rnd(2, 99);
      return S("¿Qué imprime?", src(VALUE_ANON, `Value v;\nv.kind = Whole;\nv.whole = ${k};\ncout << v.whole;`),
        k, ["0", "No compila", "1"], "Una unión anónima expone sus miembros directamente en el ámbito que la contiene: `v.whole`, sin nivel `.data`.");
    },
    function () {
      return S("Con la unión anónima, ¿cómo se escribe `whole`?", src(VALUE_ANON, "Value v;"),
        "v.whole = 7;", ["v.data.whole = 7;", "v->whole = 7;", "Value.whole = 7;"], "La unión anónima no tiene un objeto con nombre en ese nivel: sus miembros se usan directo.", false);
    },
    function () {
      return S("Con la unión con nombre `data`, ¿cómo se escribe `real`?", src(VALUE_TAGGED, "Value v;"),
        "v.data.real = 2.5;", ["v.real = 2.5;", "v->data.real = 2.5;", "data.real = 2.5;"], "La unión es el miembro data de Value: hay que pasar por ese nivel.", false);
    },
    function () {
      const k = rnd(2, 99);
      return S("¿Qué imprime?", src("struct Record {\n  int value;\n  int read() { return value; }\n};", `Record r;\nr.value = ${k};\ncout << r.read();`),
        k, ["0", "No compila", `${k}${k}`], "En C++, un struct también puede tener funciones miembro. value es público, así que se puede asignar desde fuera.");
    },
    function () {
      return S("¿Puede un `struct` tener funciones miembro?", "struct Record {\n  int value;\n  int read() { return value; }\n};",
        "Sí, igual que una class", ["No, solo datos", "Solo si son private", "Solo en C"], "struct y class ofrecen las mismas capacidades básicas; cambian los valores por defecto.");
    },
    function () {
      return S("¿Puede una `union` tener funciones miembro?", "union Number {\n  int whole;\n  double real;\n};",
        "Sí: también es un tipo clase", ["No, nunca", "Solo constructores", "Solo si es anónima"], "Una unión también es un tipo clase: puede tener funciones miembro.");
    },
    function () {
      return S("¿Qué herencia se usa por defecto con `struct`?", "struct Rectangle : Polygon { };",
        "Pública", ["Privada", "Protegida", "Ninguna"], "struct usa acceso y herencia públicos por defecto; class, privados.");
    },
    function () {
      const k = rnd(2, 99), r = reals();
      return S("¿Qué imprime?", src("struct Both {\n  int whole;\n  double real;\n};", `Both b;\nb.whole = ${k};\nb.real = ${r};\ncout << b.whole;`),
        k, [r, "0", "Basura"], "En una estructura, cada campo tiene su propio espacio: escribir real no afecta a whole.");
    },
    function () {
      return S("Para guardar a la vez cantidad y precio, ¿qué conviene?", "",
        "struct", ["union", "Una unión anónima", "enum"], "Una estructura conserva todos sus campos a la vez; una unión, una alternativa a la vez.");
    },
    function () {
      return S("Para guardar un entero o un real, pero nunca ambos, ¿qué conviene?", "",
        "union", ["struct con dos campos", "Dos variables globales", "class vacía"], "Una unión ofrece alternativas en el mismo almacenamiento.");
    },
    function () {
      return S("¿Quién mantiene la etiqueta `kind` coherente con la unión?", src(VALUE_TAGGED, "Value v;\nv.kind = Real;\nv.data.real = 2.5;"),
        "El programa, al escribir", ["El compilador", "La unión sola", "Nadie: no hace falta"], "La etiqueta es un campo ordinario: el programa la actualiza junto con el último miembro escrito.", false);
    },
    function () {
      return S("¿Qué pasa con este código?", src("class Object {\n  int value;\npublic:\n  int read() { return value; }\n};", "Object o;\no.value = 1;"),
        "No compila: value es privado", ["Compila", "Falla al ejecutar", "No compila: falta struct"], "En una class, value queda privado (no hay etiqueta antes). Solo read es público.", "FAIL");
    },
    function () {
      return S("¿En qué se diferencian `struct` y `class` en C++?", "",
        "En el acceso y la herencia por defecto", ["struct no tiene funciones", "class no tiene datos", "En nada"], "Ambos pueden tener datos y funciones; struct usa público por defecto y class privado. Las etiquetas explícitas lo sustituyen.");
    },
    function () {
      const k = rnd(2, 99);
      return S("¿Qué imprime?", src("struct Safe {\nprivate:\n  int v;\npublic:\n  void set(int x) { v = x; }\n  int get() { return v; }\n};", `Safe s;\ns.set(${k});\ncout << s.get();`),
        k, ["0", "No compila", `${k + 1}`], "Las etiquetas explícitas sustituyen los valores por defecto: v es privado, pero set y get son públicos.");
    },
    function () {
      return S("Tras escribir `v.data.real`, ¿qué debe leer el programa?", src(VALUE_TAGGED, "Value v;\nv.kind = Real;\nv.data.real = 2.5;"),
        "v.data.real, según kind", ["v.data.whole", "Cualquiera de los dos", "kind como double"], "Lea la alternativa indicada por la etiqueta, en vez de deducirla del almacenamiento compartido.", false);
    }
  ];

  /* ---------- p09 · Herencia y acceso (clasificador) ---------- */
  const POLY = "class Polygon {\nprotected:\n  int width, height;\npublic:\n  void set_values(int w, int h) {\n    width = w; height = h;\n  }\n};";
  const POLY_PRIV = "class Polygon {\n  int width, height;\npublic:\n  void set_values(int w, int h) {\n    width = w; height = h;\n  }\n};";
  const RECT_D = "class Rectangle : public Polygon {\npublic:\n  int area() { return width * height; }\n};";
  const TRI_D = "class Triangle : public Polygon {\npublic:\n  int area() { return width * height / 2; }\n};";
  const MOTHER = "class Mother {\npublic:\n  void inherited_operation() {}\n};";
  const P_INH_ITEMS = [
    { decl: POLY + "\n" + RECT_D, body: "Rectangle rect;\nrect.set_values(4, 5);", bin: "compila", explain: "set_values es público en Polygon y la herencia es pública: sigue público en Rectangle." },
    { decl: POLY + "\n" + RECT_D, body: "Rectangle rect;\nint a = rect.area();", bin: "compila", explain: "Una función miembro derivada puede usar los datos protegidos heredados (width, height)." },
    { decl: MOTHER + "\nclass Daughter : protected Mother {\npublic:\n  void own_operation() { inherited_operation(); }\n};", body: "Daughter d;\nd.own_operation();", bin: "compila", explain: "own_operation es público en Daughter y, por dentro, puede usar lo heredado." },
    { decl: POLY + "\nclass Output {\npublic:\n  void output(int value) { cout << value; }\n};\nclass PrintedRectangle\n  : public Polygon, public Output { };", body: "PrintedRectangle r;\nr.set_values(4, 5);\nr.output(20);", bin: "compila", explain: "Herencia múltiple: cada base aporta sus miembros accesibles (set_values de Polygon y output de Output)." },
    { decl: "class Base {\npublic:\n  void f() {}\n};\nstruct Derived : Base { };", body: "Derived d;\nd.f();", bin: "compila", explain: "Con struct, si se omite el modo, la herencia es pública: f sigue siendo público." },
    { decl: POLY + "\n" + TRI_D, body: "Triangle t;\nt.set_values(4, 5);\nint a = t.area();", bin: "compila", explain: "Triangle reutiliza set_values y aporta su propia fórmula de área." },
    { decl: "class Mother {\npublic:\n  Mother() {}\n  Mother(int n) {}\n};\nclass Son : public Mother {\npublic:\n  Son(int n) : Mother(n) {}\n};", body: "Son daniel(0);", bin: "compila", explain: "El inicializador después de los dos puntos selecciona el constructor base Mother(int)." },
    { decl: "class Base {\npublic:\n  Base(int n) {}\n};\nclass Derived : public Base {\npublic:\n  Derived() : Base(0) {}\n};", body: "Derived d;", bin: "compila", explain: "La base no tiene constructor predeterminado, pero el derivado elige Base(int) con `: Base(0)`." },
    { decl: POLY + "\nclass Rectangle : protected Polygon {\npublic:\n  void init(int w, int h) { set_values(w, h); }\n};", body: "Rectangle rect;\nrect.init(4, 5);", bin: "compila", explain: "Con herencia protegida, set_values queda protegido, pero los miembros de Rectangle sí pueden usarlo." },
    { decl: POLY + "\n" + RECT_D, body: "Rectangle rect;\nPolygon* p = &rect;\np->set_values(4, 5);", bin: "compila", explain: "Con herencia pública, un puntero a la base puede apuntar a un objeto derivado y usar la interfaz de la base." },
    { decl: POLY + "\n" + RECT_D, body: "Rectangle rect;\nrect.width = 4;", bin: "no compila", explain: "width es protected: el código externo no puede acceder directamente." },
    { decl: POLY_PRIV + "\n" + RECT_D, body: "", bin: "no compila", explain: "Si width y height son privados en la base, ni siquiera las funciones de la derivada pueden usarlos. Por eso Polygon los declara protected." },
    { decl: MOTHER + "\nclass Daughter : protected Mother {\npublic:\n  void own_operation() { inherited_operation(); }\n};", body: "Daughter d;\nd.inherited_operation();", bin: "no compila", explain: "Con herencia protegida, inherited_operation queda protegido en Daughter: el código externo no lo ve." },
    { decl: "class Base {\npublic:\n  void f() {}\n};\nclass Derived : Base { };", body: "Derived d;\nd.f();", bin: "no compila", explain: "Con class, si se omite el modo, la herencia es privada: f queda privado en Derived." },
    { decl: "class Base {\npublic:\n  void f() {}\n};\nclass Derived : private Base { };", body: "Derived d;\nd.f();", bin: "no compila", explain: "Herencia privada: lo público de la base pasa a ser privado en la derivada." },
    { decl: "class Base {\n  int x;\n};\nclass Derived : public Base {\npublic:\n  int get() { return x; }\n};", body: "", bin: "no compila", explain: "Un miembro privado de la base es inaccesible en la derivada, con cualquier modo de herencia." },
    { decl: "class Base {\npublic:\n  Base(int n) {}\n};\nclass Derived : public Base {\npublic:\n  Derived() {}\n};", body: "", bin: "no compila", explain: "Sin inicializador se usaría Base(), que no existe. El constructor derivado debe elegir otro: `Derived() : Base(0) {}`." },
    { decl: POLY + "\n" + RECT_D, body: "Polygon poly;\npoly.set_values(4, 5);\nint a = poly.area();", bin: "no compila", explain: "La base no adquiere los miembros de la derivada: Polygon no tiene area." },
    { decl: POLY + "\nclass PrintedRectangle : public Polygon { };", body: "PrintedRectangle r;\nr.output(20);", bin: "no compila", explain: "output viene de Output, y PrintedRectangle aquí solo hereda de Polygon. Faltaría `, public Output`." },
    { decl: POLY + "\nclass Rectangle : protected Polygon { };", body: "Rectangle rect;\nrect.set_values(4, 5);", bin: "no compila", explain: "Con herencia protegida, set_values queda protegido en Rectangle: no se puede llamar desde fuera." },
    { decl: POLY + "\n" + RECT_D, body: "Polygon poly;\nRectangle* r = &poly;", bin: "no compila", explain: "Un objeto base no es un Rectangle: no se puede tratar implícitamente un Polygon como derivado." }
  ];

  /* ---------- p10 · Clases derivadas (carrera) ---------- */
  const SHAPES = POLY + "\n" + RECT_D + "\n" + TRI_D;
  const evenPair = () => { let w, h; do { w = rnd(2, 12); h = rnd(2, 12); } while ((w * h) % 2); return [w, h]; };
  const P_DER_GENS = [
    function () {
      const [w, h] = distinct(2, 2, 12);
      return R("¿Qué imprime?", src(SHAPES, `Rectangle rect;\nrect.set_values(${w}, ${h});\ncout << rect.area();`),
        w * h, [w * h / 2, 0], `rect usa set_values heredado de Polygon y su propia area: ${w} × ${h} = ${w * h}.`);
    },
    function () {
      const [w, h] = evenPair();
      return R("¿Qué imprime?", src(SHAPES, `Triangle trgl;\ntrgl.set_values(${w}, ${h});\ncout << trgl.area();`),
        w * h / 2, [w * h, 0], `Triangle::area aplica su fórmula: ${w} × ${h} / 2 = ${w * h / 2}.`);
    },
    function () {
      const [w, h] = evenPair();
      return R("¿Qué imprime?", src(SHAPES, `Rectangle rect;\nTriangle trgl;\nrect.set_values(${w}, ${h});\ntrgl.set_values(${w}, ${h});\ncout << rect.area() + trgl.area();`),
        w * h * 1.5, [w * h * 2, w * h], `Ambos reutilizan set_values, pero cada uno tiene su area: ${w * h} + ${w * h / 2} = ${w * h * 1.5}.`);
    },
    function () {
      return R("¿Qué recibe Rectangle de Polygon?", src(SHAPES, ""),
        "width, height y set_values", ["Solo area", "Nada: hay que repetirlo"], "Una derivada amplía la base: el estado y set_values se agrupan en Polygon y se reutilizan.", false);
    },
    function () {
      return R("¿Tiene Polygon una función area?", src(SHAPES, ""),
        "No", ["Sí, la de Rectangle", "Sí, la de Triangle"], "La clase base no adquiere los miembros adicionales de la clase derivada.", false);
    },
    function () {
      const [a, b, c, d] = [rnd(2, 9), rnd(2, 9), rnd(2, 9), rnd(10, 12)];
      return R("¿Cuánto vale `rect.area()`?", src(SHAPES, `Rectangle rect;\nTriangle trgl;\nrect.set_values(${a}, ${b});\ntrgl.set_values(${c}, ${d});`),
        a * b, [c * d, Math.floor(c * d / 2)], "Compartir la definición de set_values no significa compartir variables: cada objeto tiene su propio estado base.", "rect.area()");
    },
    function () {
      const [w, h] = distinct(2, 2, 12);
      return R("¿Qué imprime?", src(POLY + "\nclass Output {\npublic:\n  void output(int value) { cout << value; }\n};\nclass PrintedRectangle\n  : public Polygon, public Output {\npublic:\n  int area() { return width * height; }\n};",
        `PrintedRectangle r;\nr.set_values(${w}, ${h});\nr.output(r.area());`),
        w * h, [0, w + h], "Herencia múltiple: set_values viene de Polygon y output de Output. Imprime el área.");
    },
    function () {
      return R("¿Cómo se separan las bases en herencia múltiple?", "class PrintedRectangle\n  : public Polygon, public Output { };",
        "Con comas", ["Con punto y coma", "Con dos clases :"], "Se separan las clases base con comas, cada una con su modo de herencia.");
    },
    function () {
      return R("En `class Rectangle : public Polygon`, ¿qué indica `public`?", "class Rectangle : public Polygon { };",
        "El modo de la herencia", ["Que area es pública", "Que Polygon es struct"], "Los dos puntos introducen la base; public especifica el modo de acceso de la herencia.");
    },
    function () {
      return R("Con herencia protected, un miembro public de la base queda…", "class Daughter : protected Mother { };",
        "protected", ["public", "private"], "Tabla del PPT: con herencia protegida, public y protected de la base quedan protected.");
    },
    function () {
      return R("Con herencia private, un miembro protected de la base queda…", "class Derived : private Base { };",
        "private", ["protected", "inaccesible"], "Tabla del PPT: con herencia privada, public y protected de la base quedan private.");
    },
    function () {
      return R("Con herencia public, un miembro private de la base queda…", "class Derived : public Base { };",
        "inaccesible", ["private", "public"], "Ningún modo de herencia permite acceso directo a un miembro privado de la base.");
    },
    function () {
      return R("Si se omite el modo con `class`, la herencia es…", "class Derived : Base { };",
        "privada", ["pública", "protegida"], "Si se omite, la herencia es privada con class y pública con struct.");
    },
    function () {
      const [w, h] = distinct(2, 2, 12);
      return R("¿Qué imprime?", src(POLY + "\nclass Rectangle : public Polygon {\npublic:\n  int perimeter() { return 2 * (width + height); }\n};", `Rectangle rect;\nrect.set_values(${w}, ${h});\ncout << rect.perimeter();`),
        2 * (w + h), [w * h, w + h], `La derivada aporta su propio miembro, que usa el estado heredado: 2 × (${w} + ${h}) = ${2 * (w + h)}.`);
    },
    function () {
      const [a, b, c, d] = [rnd(2, 6), rnd(2, 6), rnd(7, 12), rnd(7, 12)];
      return R("¿Qué imprime?", src(SHAPES, `Rectangle rect;\nrect.set_values(${a}, ${b});\nrect.set_values(${c}, ${d});\ncout << rect.area();`),
        c * d, [a * b, a * b + c * d], "La segunda llamada reemplaza el estado base: queda el último par de valores.");
    },
    function () {
      const s = rnd(2, 12);
      return R("¿Qué imprime?", src(POLY + "\nclass Square : public Polygon {\npublic:\n  void set_side(int s) { set_values(s, s); }\n  int area() { return width * height; }\n};", `Square sq;\nsq.set_side(${s});\ncout << sq.area();`),
        s * s, [2 * s, s], `Una función derivada puede llamar a la heredada: set_values(${s}, ${s}). Área: ${s * s}.`);
    },
    function () {
      return R("Para el código cliente, `protected` se comporta como…", src(POLY, ""),
        "private", ["public", "Un amigo"], "protected se asemeja a private para el código externo, pero permite acceso desde funciones miembro derivadas.", false);
    },
    function () {
      return R("¿La amistad de una clase base da acceso a los privados de la derivada?", "",
        "No", ["Sí, siempre", "Solo con herencia public"], "La amistad de una clase base no concede automáticamente acceso a los miembros privados de una derivada.");
    },
    function () {
      return R("¿El constructor base es un constructor del tipo derivado?", "",
        "No: inicializa la parte base", ["Sí, se hereda", "Solo si es public"], "Un constructor base inicializa la parte base; cada clase se ocupa de su propia parte.");
    },
    function () {
      let w, h; do { w = rnd(3, 11); h = rnd(3, 11); } while ((w * h) % 2 === 0);
      return R("¿Qué imprime?", src(SHAPES, `Triangle trgl;\ntrgl.set_values(${w}, ${h});\ncout << trgl.area();`),
        Math.floor(w * h / 2), [String(w * h / 2), w * h], `width, height y la división son int: ${w * h} / 2 = ${Math.floor(w * h / 2)} (división entera).`);
    },
    function () {
      return R("¿Qué tiene un objeto Rectangle?", src(SHAPES, "Rectangle rect;"),
        "Una parte base y su parte propia", ["Solo sus miembros nuevos", "Un puntero a un Polygon"], "El estado heredado pertenece a la parte base de cada objeto derivado.", false);
    }
  ];

  /* ---------- p11 · Orden de construcción (disparos) ---------- */
  const FAMILY = "class Mother {\npublic:\n  Mother() { cout << \"M\"; }\n  Mother(int n) { cout << \"m\"; }\n  ~Mother() { cout << \"~M\"; }\n};";
  const DAUGHTER = "class Daughter : public Mother {\npublic:\n  Daughter(int n) { cout << \"D\"; }\n  ~Daughter() { cout << \"~D\"; }\n};";
  const SON = "class Son : public Mother {\npublic:\n  Son(int n) : Mother(n) { cout << \"S\"; }\n  ~Son() { cout << \"~S\"; }\n};";
  const FAM_ALL = FAMILY + "\n" + DAUGHTER + "\n" + SON;
  const P_ORDER_GENS = [
    function () {
      return S("¿Qué imprime?", src(FAMILY + "\n" + DAUGHTER, "Daughter cynthia(0);", FAMILY + "\n" + DAUGHTER),
        "MD~D~M", ["mD~D~M", "DM~M~D", "MD~M~D"], "Daughter(int) no elige constructor base: se usa Mother() (M). Al terminar main, primero ~Daughter y luego ~Mother.");
    },
    function () {
      return S("¿Qué imprime?", src(FAMILY + "\n" + SON, "Son daniel(0);"),
        "mS~S~M", ["MS~S~M", "Sm~M~S", "mS~M~S"], "`: Mother(n)` selecciona Mother(int) (m). Se destruye primero la parte derivada (~S) y luego la base (~M).");
    },
    function () {
      return S("¿Qué imprime?", src(FAMILY + "\n" + DAUGHTER, "{\n  Daughter d(0);\n}\ncout << \"|\";"),
        "MD~D~M|", ["MD~M~D|", "MD|~D~M", "DM~M~D|"], "Construcción de la base a la derivada; destrucción al revés, al cerrar el bloque.");
    },
    function () {
      return S("¿Qué imprime?", src(FAM_ALL, "{\n  Daughter a(0);\n  Son b(1);\n}"),
        "MDmS~S~M~D~M", ["MDmS~D~M~S~M", "MDmS~M~S~M~D", "mDMS~S~M~D~M"], "Se construye a (M, D) y luego b (m, S). Al salir, b se destruye primero (~S ~M) y después a (~D ~M).");
    },
    function () {
      return S("¿Qué constructor base usa `Daughter(int n) {}`?", src(FAMILY + "\n" + DAUGHTER, ""),
        "Mother()", ["Mother(int)", "Ninguno", "Daughter()"], "Sin inicializador después de los dos puntos, se usa el constructor base predeterminado.", false);
    },
    function () {
      return S("¿Qué constructor base usa `Son(int n) : Mother(n) {}`?", src(FAMILY + "\n" + SON, ""),
        "Mother(int)", ["Mother()", "Ninguno", "Son()"], "El inicializador `: Mother(n)` selecciona Mother(int).", false);
    },
    function () {
      return S("Si la base no tiene constructor predeterminado, el derivado…", "class Base {\npublic:\n  Base(int n) {}\n};",
        "Debe elegir uno con : Base(...)", ["Usa Base() igual", "No puede existir", "Hereda Base(int)"], "Si la base no tiene un constructor predeterminado utilizable, el constructor derivado debe seleccionar otro adecuado.");
    },
    function () {
      return S("Al destruir un objeto derivado, ¿qué destructor corre primero?", src(FAMILY + "\n" + DAUGHTER, ""),
        "El de la derivada", ["El de la base", "Al mismo tiempo", "Solo el de la base"], "Al destruir, el destructor derivado se ejecuta antes que el base.", false);
    },
    function () {
      return S("Al construir un objeto derivado, ¿qué corre primero?", src(FAMILY + "\n" + DAUGHTER, ""),
        "El constructor base", ["El cuerpo del derivado", "El destructor base", "Da lo mismo"], "Primero se ejecuta el constructor base seleccionado; luego el cuerpo del constructor derivado.", false);
    },
    function () {
      return S("¿Qué imprime?", src(FAMILY + "\n" + DAUGHTER, "Daughter* p = new Daughter(0);\ndelete p;"),
        "MD~D~M", ["MD~M", "MD", "DM~M~D"], "new construye base y derivada; delete mediante un Daughter* destruye la derivada y luego la base.");
    },
    function () {
      const [w, h] = distinct(2, 2, 12);
      return S("¿Qué imprime?", src("class Polygon {\nprotected:\n  int width, height;\npublic:\n  Polygon(int w, int h) { width = w; height = h; }\n};\nclass Rectangle : public Polygon {\npublic:\n  Rectangle(int w, int h) : Polygon(w, h) {}\n  int area() { return width * height; }\n};",
        `Rectangle rect(${w}, ${h});\ncout << rect.area();`),
        w * h, [0, w + h, "No compila"], "El constructor derivado delega la inicialización de la parte base en Polygon(w, h), sin repetirla.");
    },
    function () {
      const k = rnd(2, 9);
      return S("¿Qué imprime?", src("class Mother {\npublic:\n  Mother(int n) { cout << n << \"-\"; }\n};\nclass Son : public Mother {\npublic:\n  Son(int n) : Mother(n * 2) { cout << n; }\n};", `Son s(${k});`),
        `${2 * k}-${k}`, [`${k}-${2 * k}`, `${k}-${k}`, `${2 * k}-${2 * k}`], `El inicializador llama a Mother(${2 * k}) primero; después corre el cuerpo de Son, que imprime ${k}.`);
    },
    function () {
      return S("¿De qué se ocupa cada destructor (base y derivado)?", "",
        "De su propia parte", ["Del objeto completo", "Solo de la memoria dinámica", "De las otras clases"], "Cada destructor, base y derivado, se ocupa de su propia parte.");
    },
    function () {
      return S("¿Qué imprime?", src(FAMILY + "\nclass Kid : public Mother { };", "Kid k;"),
        "M~M", ["", "m~M", "Error"], "Kid no declara constructores: el implícito construye la parte base con Mother() y su destructor implícito destruye la base.");
    },
    function () {
      return S("¿Qué imprime?", src(FAMILY + "\n" + DAUGHTER, "Daughter d1(0);\nDaughter d2(1);"),
        "MDMD~D~M~D~M", ["MMDD~D~D~M~M", "MDMD~M~D~M~D", "MDMD"], "Cada objeto construye su base y luego su parte propia. Al final se destruyen en orden inverso, cada uno derivado → base.");
    },
    function () {
      return S("¿Asignar solo la parte base equivale a asignar el objeto derivado completo?", "",
        "No", ["Sí", "Solo con herencia public", "Solo si no hay punteros"], "La clase derivada tiene su propia asignación por copia; asignar su parte base no equivale a asignar el objeto completo.");
    },
    function () {
      return S("¿Qué imprime?", src(FAMILY + "\n" + SON, "cout << \"1\";\n{\n  Son s(0);\n  cout << \"2\";\n}\ncout << \"3\";"),
        "1mS2~S~M3", ["1mS23~S~M", "1Sm2~M~S3", "1MS2~S~M3"], "Se construye la base (m), luego Son (S); al cerrar el bloque se destruye Son y después la base, antes del 3.");
    },
    function () {
      return S("¿Qué imprime?", src(FAM_ALL, "Son* p = new Son(5);\ndelete p;\nDaughter d(0);"),
        "mS~S~MMD~D~M", ["mS~M~SMD~D~M", "MS~S~MMD~D~M", "mSMD~D~M~S~M"], "El Son dinámico se destruye con delete (derivada y luego base). Después se construye d, que se destruye al final de main.");
    },
    function () {
      return S("¿Para qué sirve el inicializador `: Mother(n)`?", src(FAMILY + "\n" + SON, ""),
        "Elegir el constructor base", ["Llamar a ~Mother", "Copiar un Mother", "Heredar de dos clases"], "El inicializador después de los dos puntos selecciona el constructor base.", false);
    },
    function () {
      return S("¿Qué imprime?", src(FAM_ALL, "Son a(1);\nSon b(2);"),
        "mSmS~S~M~S~M", ["mmSS~S~S~M~M", "mSmS~M~S~M~S", "MSMS~S~M~S~M"], "Cada Son construye su base con Mother(int) (m) y luego su cuerpo (S). Al final, b y luego a, cada uno derivado → base.");
    }
  ];

  /* ===================================================================
     BLOQUE 4 · POLIMORFISMO (PPT §5)
     =================================================================== */
  // Polygon con area según la versión: sin virtual, virtual concreta o virtual pura.
  const POLY_V = line => `class Polygon {\nprotected:\n  int width, height;\npublic:\n  void set_values(int w, int h) {\n    width = w; height = h;\n  }\n  ${line}\n};`;
  const NONVIRT = "int area() { return 0; }", VIRT = "virtual int area() { return 0; }", PURE = "virtual int area() = 0;";
  const DERIVED = RECT_D + "\n" + TRI_D;
  const DERIVED_NOTE = "// Rectangle: area() = width * height\n// Triangle:  area() = width * height / 2";
  // En pantalla se resume Rectangle y Triangle; la verificación usa las clases completas.
  const shapesSrc = (line, body) => src(POLY_V(line) + "\n" + DERIVED_NOTE, body, POLY_V(line) + "\n" + DERIVED);
  const P_VIRT_GENS = [
    function () {
      const [w, h] = distinct(2, 2, 12);
      return R("¿Qué imprime?", shapesSrc(NONVIRT, `Rectangle rect;\nrect.set_values(${w}, ${h});\nPolygon* p = &rect;\ncout << p->area();`),
        0, [w * h, "No compila"], "Sin virtual, el tipo del puntero (Polygon*) selecciona la función: se llama Polygon::area, que devuelve 0.");
    },
    function () {
      const [w, h] = distinct(2, 2, 12);
      return R("¿Qué imprime?", shapesSrc(NONVIRT, `Rectangle rect;\nrect.set_values(${w}, ${h});\nPolygon* p = &rect;\ncout << rect.area();`),
        w * h, [0, "No compila"], "Llamada directa sobre el objeto rect: se usa Rectangle::area.");
    },
    function () {
      const [w, h] = distinct(2, 2, 12);
      return R("¿Qué imprime?", shapesSrc(VIRT, `Rectangle rect;\nrect.set_values(${w}, ${h});\nPolygon* p = &rect;\ncout << p->area();`),
        w * h, [0, "No compila"], "Con virtual, la llamada mediante el puntero base selecciona la implementación del objeto real: Rectangle::area.");
    },
    function () {
      const [w, h] = evenPair();
      return R("¿Qué imprime?", shapesSrc(VIRT, `Triangle trgl;\ntrgl.set_values(${w}, ${h});\nPolygon* q = &trgl;\ncout << q->area();`),
        w * h / 2, [0, w * h], `El objeto real es un Triangle y area es virtual: ${w} × ${h} / 2 = ${w * h / 2}.`);
    },
    function () {
      const [w, h] = distinct(2, 2, 12);
      return R("¿Qué imprime?", shapesSrc(VIRT, `Polygon poly;\npoly.set_values(${w}, ${h});\nPolygon* r = &poly;\ncout << r->area();`),
        0, [w * h, "No compila"], "El objeto real es un Polygon: se llama Polygon::area, que devuelve 0. Virtual no significa abstracta.");
    },
    function () {
      const [w, h] = evenPair();
      return R("¿Qué imprime?", shapesSrc(NONVIRT, `Triangle trgl;\ntrgl.set_values(${w}, ${h});\nPolygon* q = &trgl;\ncout << q->area();`),
        0, [w * h / 2, w * h], "Sin virtual, una función derivada con el mismo nombre no basta: mediante Polygon* se llama Polygon::area.");
    },
    function () {
      return R("Sin `virtual`, ¿qué decide qué `area` se llama mediante `p->area()`?", shapesSrc(NONVIRT, "Rectangle rect;\nPolygon* p = &rect;"),
        "El tipo del puntero", ["El objeto real", "El último set_values"], "Sin virtual, el tipo estático del puntero selecciona la función.", false);
    },
    function () {
      return R("Con `virtual`, ¿qué decide qué `area` se llama mediante `p->area()`?", shapesSrc(VIRT, "Rectangle rect;\nPolygon* p = &rect;"),
        "El objeto real", ["El tipo del puntero", "El orden de las clases"], "Una función virtual permite seleccionar durante la ejecución la implementación del objeto apuntado.", false);
    },
    function () {
      return R("Una clase que declara o hereda una función virtual es…", shapesSrc(VIRT, ""),
        "Polimórfica", ["Abstracta", "Amiga"], "Una clase que declara o hereda una función virtual es polimórfica. Abstracta sería con una virtual pura.", false);
    },
    function () {
      return R("Con `virtual int area() { return 0; }`, ¿se puede crear un `Polygon`?", shapesSrc(VIRT, "Polygon poly;"),
        "Sí: es concreta", ["No: es abstracta", "Solo con new"], "La base tiene implementación concreta, así que aún se puede instanciar. Virtual no significa abstracta.", false);
    },
    function () {
      return R("Si Polygon no declara `area`, ¿compila `p->area()`?", src(POLY + "\n" + RECT_D, "Rectangle rect;\nPolygon* p = &rect;\np->area();"),
        "No compila", ["Sí: llama a Rectangle::area", "Sí: devuelve 0"], "El tipo estático del puntero determina la interfaz disponible: Polygon no tiene area.", "FAIL");
    },
    function () {
      return R("¿Dónde se escribe `virtual`?", shapesSrc(VIRT, ""),
        "En la función de la base", ["En la derivada", "En la llamada"], "Escriba virtual en la declaración de la función base; un miembro derivado con la misma firma la redefine.", false);
    },
    function () {
      const [w, h] = evenPair();
      return R("¿Qué imprime?", shapesSrc(VIRT, `Rectangle rect; Triangle trgl; Polygon poly;\nPolygon* p = &rect; Polygon* q = &trgl;\nPolygon* r = &poly;\np->set_values(${w}, ${h}); q->set_values(${w}, ${h});\nr->set_values(${w}, ${h});\ncout << p->area() + q->area() + r->area();`),
        w * h * 1.5, [0, w * h * 3], `Mismo tipo de puntero, tres resultados: ${w * h} + ${w * h / 2} + 0.`);
    },
    function () {
      const [w, h] = evenPair();
      return R("¿Qué imprime?", shapesSrc(NONVIRT, `Rectangle rect; Triangle trgl;\nPolygon* p = &rect; Polygon* q = &trgl;\np->set_values(${w}, ${h}); q->set_values(${w}, ${h});\ncout << p->area() + q->area();`),
        0, [w * h * 1.5, w * h], "Si area no fuera virtual, todas las llamadas mediante Polygon* devolverían 0.");
    },
    function () {
      return R("¿Puede un `Polygon*` usarse como `Rectangle*` sin más?", shapesSrc(VIRT, "Rectangle rect;\nPolygon* p = &rect;\nRectangle* r = p;"),
        "No", ["Sí, siempre", "Solo con virtual"], "Un puntero base general no puede tratarse implícitamente como puntero a cualquier derivada.", "FAIL");
    },
    function () {
      const [w, h] = evenPair();
      return R("¿Qué imprime?", shapesSrc(NONVIRT, `Triangle trgl;\ntrgl.set_values(${w}, ${h});\ncout << trgl.area();`),
        w * h / 2, [0, w * h], "Sin puntero de por medio, la llamada directa sobre trgl usa Triangle::area.");
    },
    function () {
      const [w, h] = evenPair();
      return R("¿Qué imprime?", shapesSrc(VIRT, `Rectangle rect; Triangle trgl;\nrect.set_values(${w}, ${h});\ntrgl.set_values(${w}, ${h});\nPolygon* p = &rect;\np = &trgl;\ncout << p->area();`),
        w * h / 2, [w * h, 0], "Al final p apunta a trgl; con virtual, se llama la versión del objeto apuntado ahora.");
    },
    function () {
      return R("En `Polygon* p = &rect;`, el tipo estático de p es…", shapesSrc(VIRT, "Rectangle rect;\nPolygon* p = &rect;"),
        "Polygon*", ["Rectangle*", "Rectangle"], "El tipo estático es el declarado (Polygon*); el objeto real es un Rectangle.", false);
    },
    function () {
      const v = pick([true, false]);
      return R("¿Qué imprime?", src(`class A {\npublic:\n  ${v ? "virtual " : ""}void who() { cout << "A"; }\n};\nclass B : public A {\npublic:\n  void who() { cout << "B"; }\n};`, "B b;\nA* p = &b;\np->who();"),
        v ? "B" : "A", [v ? "A" : "B", "AB"], v ? "who es virtual en A: mediante A* se llama la versión del objeto real, B." : "who no es virtual: mediante A* se usa A::who aunque el objeto sea B.");
    },
    function () {
      return R("¿Compila `p->perimeter()` si solo Rectangle lo define?", src(POLY_V(VIRT) + "\n" + "class Rectangle : public Polygon {\npublic:\n  int perimeter() { return 2 * (width + height); }\n};", "Rectangle rect;\nPolygon* p = &rect;\np->perimeter();"),
        "No compila", ["Sí", "Sí, si es virtual"], "Un puntero base no expone los miembros exclusivos de la derivada.", "FAIL");
    }
  ];

  /* ---------- p13 · Clases abstractas (clasificador) ---------- */
  const ABS = POLY_V(PURE);
  const ABS_ALL = ABS + "\n" + DERIVED;
  const ABS_VD = "class Polygon {\nprotected:\n  int width, height;\npublic:\n  virtual ~Polygon() {}\n  void set_values(int w, int h) {\n    width = w; height = h;\n  }\n  virtual int area() = 0;\n};";
  const P_ABS_ITEMS = [
    { decl: ABS_ALL, body: "Rectangle rect;\nPolygon* p = &rect;\nint a = p->area();", bin: "compila", explain: "Rectangle implementa area: es concreta. Un puntero a la base abstracta puede referirse a ella." },
    { decl: ABS_ALL, body: "Rectangle rect;\nTriangle trgl;", bin: "compila", explain: "Ambas derivadas implementan la virtual pura, así que se pueden instanciar." },
    { decl: ABS_ALL, body: "Rectangle rect; Triangle trgl;\nPolygon* shapes[2] = {&rect, &trgl};", bin: "compila", explain: "Un arreglo de punteros a la base abstracta es válido: no construye ningún Polygon." },
    { decl: ABS_VD + "\n" + DERIVED, body: "Polygon* p = new Rectangle;\ndelete p;", bin: "compila", explain: "new crea un Rectangle concreto; el destructor virtual permite eliminarlo mediante Polygon*." },
    { decl: "class Polygon {\nprotected:\n  int width, height;\npublic:\n  virtual int area() = 0;\n  void printarea() { cout << this->area(); }\n};", body: "", bin: "compila", explain: "Una operación de la base puede llamar a la virtual pura: se dirige a la implementación derivada." },
    { decl: ABS_ALL, body: "Polygon* p;", bin: "compila", explain: "Declarar un puntero no construye un objeto base." },
    { decl: POLY_V(VIRT), body: "Polygon poly;", bin: "compila", explain: "Con `virtual int area() { return 0; }` (no pura), Polygon es concreta y se puede instanciar." },
    { decl: ABS_ALL, body: "Polygon* q = new Triangle;\nq->set_values(4, 5);", bin: "compila", explain: "El puntero tiene tipo base y apunta a un Triangle concreto." },
    { decl: ABS_ALL, body: "Triangle trgl;\nPolygon* q = &trgl;\nq->set_values(4, 5);", bin: "compila", explain: "set_values es parte de la interfaz de Polygon: se puede llamar mediante el puntero base." },
    { decl: ABS_ALL + "\nvoid show(Polygon* p) {\n  cout << p->area();\n}", body: "Rectangle rect;\nshow(&rect);", bin: "compila", explain: "Una función puede recibir un puntero a la base abstracta y usar su interfaz." },
    { decl: ABS_ALL, body: "Polygon poly;", bin: "no compila", explain: "Polygon tiene una virtual pura pendiente: es abstracta y no puede instanciarse." },
    { decl: ABS + "\nclass Circle : public Polygon { };", body: "Circle c;", bin: "no compila", explain: "Circle no implementa area, así que sigue siendo abstracta." },
    { decl: ABS_ALL, body: "Polygon* p = new Polygon;", bin: "no compila", explain: "new tampoco puede crear un objeto de una clase abstracta." },
    { decl: ABS_ALL, body: "Polygon arr[2];", bin: "no compila", explain: "Un arreglo de Polygon construiría objetos abstractos. Se usa un arreglo de punteros: `Polygon* arr[2]`." },
    { decl: ABS_ALL, body: "Rectangle rect;\nPolygon* p = &rect;\nRectangle* r = p;", bin: "no compila", explain: "Un puntero base no se convierte implícitamente en puntero a una derivada." },
    { decl: ABS + "\nclass Rectangle : public Polygon {\npublic:\n  int area() { return width * height; }\n  int perimeter() { return 2 * (width + height); }\n};", body: "Rectangle rect;\nPolygon* p = &rect;\np->perimeter();", bin: "no compila", explain: "Polygon no declara perimeter: el puntero base solo ofrece la interfaz de la base." },
    { decl: ABS_ALL + "\nvoid show(Polygon p) { }", body: "", bin: "no compila", explain: "Recibir un Polygon por valor exigiría crear un objeto abstracto. Hay que usar un puntero." },
    { decl: ABS_ALL, body: "Triangle t;\nPolygon q = t;", bin: "no compila", explain: "q sería un objeto Polygon, y Polygon es abstracta." },
    { decl: "class Polygon {\nprotected:\n  int width, height;\npublic:\n  int area() = 0;\n};", body: "", bin: "no compila", explain: "Solo una función virtual puede ser pura: falta `virtual` antes de `int area() = 0`." },
    { decl: ABS + "\nclass Square : public Polygon {\npublic:\n  void set_side(int s) { set_values(s, s); }\n};", body: "Square sq;", bin: "no compila", explain: "Square agrega set_side pero no implementa area: sigue siendo abstracta." },
    { decl: ABS + "\nclass Square : public Polygon {\npublic:\n  void set_side(int s) { set_values(s, s); }\n  int area() { return width * height; }\n};", body: "Square sq;\nsq.set_side(3);", bin: "compila", explain: "Square implementa area: ahora es concreta." }
  ];

  /* ---------- p14 · Polimorfismo en acción (disparos) ---------- */
  const PRINTAREA = "virtual int area() = 0;\n  void printarea() { cout << this->area() << \" \"; }";
  const POLY_PA = POLY_V(PRINTAREA);
  const paSrc = body => src(POLY_PA + "\n" + DERIVED_NOTE, body, POLY_PA + "\n" + DERIVED);
  const P_POLY_GENS = [
    function () {
      const [w, h] = evenPair();
      return S("¿Qué imprime?", paSrc(`Rectangle rect; Triangle trgl;\nPolygon* shapes[2] = {&rect, &trgl};\nfor (int i = 0; i < 2; ++i) {\n  shapes[i]->set_values(${w}, ${h});\n  shapes[i]->printarea();\n}`),
        `${w * h} ${w * h / 2}`, [`${w * h} ${w * h}`, `${w * h / 2} ${w * h}`, "0 0"], "El ciclo usa la interfaz común Polygon; la llamada virtual aporta el comportamiento de cada objeto.");
    },
    function () {
      const [w, h] = evenPair();
      const vd = POLY_V("virtual ~Polygon() {}\n  " + PRINTAREA);
      return S("¿Qué imprime?", src(vd + "\n" + DERIVED_NOTE, `Polygon* p = new Rectangle;\nPolygon* q = new Triangle;\np->set_values(${w}, ${h}); q->set_values(${w}, ${h});\np->printarea(); q->printarea();\ndelete p;\ndelete q;`, vd + "\n" + DERIVED),
        `${w * h} ${w * h / 2}`, [`${w * h / 2} ${w * h}`, "0 0", `${w * h} ${w * h}`], "Los punteros tienen tipo base, pero new creó objetos derivados concretos: cada uno usa su area.");
    },
    function () {
      return S("¿Qué imprime?", src("class Polygon {\npublic:\n  virtual ~Polygon() { cout << \"~P\"; }\n};\nclass Rectangle : public Polygon {\npublic:\n  ~Rectangle() { cout << \"~R\"; }\n};", "Polygon* p = new Rectangle;\ndelete p;"),
        "~R~P", ["~P", "~P~R", "~R"], "El destructor base virtual hace que delete mediante Polygon* llame al destructor derivado y luego al base.");
    },
    function () {
      return S("¿Para qué sirve `virtual ~Polygon() {}`?", "Polygon* p = new Rectangle;\ndelete p;",
        "Que delete llame al destructor derivado", ["Que Polygon sea abstracta", "Evitar delete", "Copiar el objeto"], "Con destructor base virtual, eliminar mediante un puntero base llama al destructor derivado correspondiente y luego al base.");
    },
    function () {
      return S("Dentro de printarea, ¿a qué apunta `this`?", src(POLY_PA, ""),
        "Al objeto actual", ["A la clase Polygon", "Al primer objeto creado", "A nullptr"], "this apunta al objeto sobre el que se llamó la función; por eso this->area() usa la versión de ese objeto.", false);
    },
    function () {
      const v = [[rnd(2, 9), rnd(2, 9)], evenPair(), [rnd(2, 9), rnd(2, 9)]];
      const t = v[0][0] * v[0][1] + v[1][0] * v[1][1] / 2 + v[2][0] * v[2][1];
      return S("¿Qué imprime?", src(ABS + "\n" + DERIVED_NOTE, `Rectangle r1, r2; Triangle t1;\nPolygon* s[3] = {&r1, &t1, &r2};\ns[0]->set_values(${v[0][0]}, ${v[0][1]});\ns[1]->set_values(${v[1][0]}, ${v[1][1]});\ns[2]->set_values(${v[2][0]}, ${v[2][1]});\nint total = 0;\nfor (int i = 0; i < 3; ++i) total += s[i]->area();\ncout << total;`, ABS_ALL),
        t, [v[0][0] * v[0][1] + v[1][0] * v[1][1] + v[2][0] * v[2][1], 0, v[0][0] * v[0][1] + v[2][0] * v[2][1]], `s[1] apunta a un Triangle: su área es ${v[1][0]} × ${v[1][1]} / 2. Las otras dos son rectángulos.`);
    },
    function () {
      return S("Si shapes guarda `&rect` y `&trgl` (objetos automáticos), ¿se hace delete?", paSrc("Rectangle rect; Triangle trgl;\nPolygon* shapes[2] = {&rect, &trgl};"),
        "No: los punteros no son dueños", ["Sí, delete shapes[i]", "Sí, delete[] shapes", "Solo el primero"], "Estos objetos tienen duración automática; los punteros no son sus propietarios y no se eliminan.", false);
    },
    function () {
      return S("¿Cuántas veces se escribe el código de printarea?", src(POLY_PA + "\n" + DERIVED_NOTE, ""),
        "Una vez, en la base", ["Una por derivada", "Ninguna", "Dos"], "printarea se implementa una sola vez en la base y las derivadas la heredan.", false);
    },
    function () {
      const [w, h] = evenPair();
      return S("¿Qué imprime?", src(ABS + "\n" + DERIVED_NOTE, `Polygon* p = new Triangle;\np->set_values(${w}, ${h});\ncout << p->area();\ndelete p;`, ABS_ALL),
        w * h / 2, [w * h, 0, "No compila"], "new crea un Triangle concreto; con area virtual pura en la base, se usa Triangle::area.");
    },
    function () {
      const [w, h] = evenPair();
      return S("¿Qué imprime?", paSrc(`Rectangle rect; Triangle trgl;\nrect.set_values(${w}, ${h}); trgl.set_values(${w}, ${h});\nPolygon* p = &trgl;\np->printarea();\np = &rect;\np->printarea();`),
        `${w * h / 2} ${w * h}`, [`${w * h} ${w * h / 2}`, `${w * h / 2} ${w * h / 2}`, "0 0"], "El mismo puntero apunta primero a trgl y luego a rect: cada llamada usa el objeto apuntado en ese momento.");
    },
    function () {
      return S("¿Qué hace `= 0` en `virtual int area() = 0;`?", src(ABS, ""),
        "La hace virtual pura", ["Devuelve 0", "Inicializa area en 0", "La hace privada"], "Agregar = 0 hace que la función sea virtual pura: no da una implementación predeterminada.", false);
    },
    function () {
      return S("¿Cuándo es concreta una clase derivada de Polygon (abstracta)?", src(ABS, ""),
        "Cuando implementa area()", ["Siempre", "Nunca", "Si tiene constructor"], "Las derivadas deben implementar la operación virtual pura para ser concretas.", false);
    },
    function () {
      const [w, h] = evenPair();
      const base = POLY_V("virtual int area() { return 0; }\n  void printarea() { cout << this->area() << \" \"; }");
      return S("¿Qué imprime?", src(base + "\n" + DERIVED_NOTE, `Rectangle rect; Triangle trgl; Polygon poly;\nPolygon* s[3] = {&rect, &trgl, &poly};\nfor (int i = 0; i < 3; ++i) {\n  s[i]->set_values(${w}, ${h});\n  s[i]->printarea();\n}`, base + "\n" + DERIVED),
        `${w * h} ${w * h / 2} 0`, [`0 0 0`, `${w * h} ${w * h / 2} ${w * h}`, `${w * h} ${w * h} ${w * h}`], "Base polimórfica concreta: el Polygon real usa su propia area (0).");
    },
    function () {
      const order = shuffle(["R", "T", "P"]);
      const names = { R: "&r", T: "&t", P: "&p" };
      return S("¿Qué imprime?", src("class Shape {\npublic:\n  virtual void who() { cout << \"P\"; }\n};\nclass Rect : public Shape {\npublic:\n  void who() { cout << \"R\"; }\n};\nclass Tri : public Shape {\npublic:\n  void who() { cout << \"T\"; }\n};",
        `Rect r; Tri t; Shape p;\nShape* list[3] = {${order.map(o => names[o]).join(", ")}};\nfor (int i = 0; i < 3; ++i) list[i]->who();`),
        order.join(""), ["PPP", order.slice().reverse().join(""), "RTP"].concat(["TRP", "PRT"]), "Cada llamada virtual usa la versión del objeto real, en el orden del arreglo.");
    },
    function () {
      return S("¿Cuál es la ventaja práctica de combinar herencia, interfaz común y virtual?", "",
        "Un mismo ciclo opera sobre distintos tipos", ["Programas sin punteros", "Menos memoria", "No hay que compilar"], "Con una interfaz compartida y operaciones virtuales, un ciclo sobre Polygon* sirve para rectángulos y triángulos.");
    },
    function () {
      const [a, b, c, d] = [rnd(2, 6), rnd(2, 6), rnd(7, 12), rnd(7, 12)];
      return S("¿Qué imprime?", paSrc(`Rectangle rect;\nPolygon* p = &rect;\np->set_values(${a}, ${b});\nrect.set_values(${c}, ${d});\np->printarea();`),
        `${c * d}`, [`${a * b}`, "0", `${a * b + c * d}`], "p y rect se refieren al mismo objeto: printarea usa el último estado.");
    },
    function () {
      return S("¿Qué imprime?", src("class Polygon {\npublic:\n  virtual ~Polygon() { cout << \"~P\"; }\n};\nclass Triangle : public Polygon {\npublic:\n  ~Triangle() { cout << \"~T\"; }\n};", "Polygon* a = new Triangle;\nPolygon* b = new Triangle;\ndelete b;\ndelete a;"),
        "~T~P~T~P", ["~P~P", "~P~T~P~T", "~T~T~P~P"], "Cada delete destruye un objeto completo: primero su parte derivada y luego la base.");
    },
    function () {
      return S("¿Qué imprime?", src("class Polygon {\npublic:\n  Polygon() { cout << \"P\"; }\n  virtual ~Polygon() { cout << \"~P\"; }\n};\nclass Rectangle : public Polygon {\npublic:\n  Rectangle() { cout << \"R\"; }\n  ~Rectangle() { cout << \"~R\"; }\n};", "Polygon* p = new Rectangle;\ndelete p;"),
        "PR~R~P", ["RP~P~R", "PR~P~R", "PR~P"], "Construcción de la base a la derivada; con destructor virtual, la destrucción va de la derivada a la base.");
    },
    function () {
      const [w, h] = evenPair();
      return S("¿Qué imprime?", src(ABS + "\n" + DERIVED_NOTE, `Rectangle rect; Triangle trgl;\nPolygon* p = &rect;\nPolygon* q = &trgl;\np->set_values(${w}, ${h});\nq->set_values(${h}, ${w});\ncout << p->area() - q->area();`, ABS_ALL),
        w * h / 2, [0, w * h, -w * h / 2], `${w * h} − ${w * h / 2} = ${w * h / 2}. Cada puntero usa la area de su objeto real.`);
    },
    function () {
      return S("¿Qué es `Polygon` si declara `virtual int area() = 0;`?", src(ABS, ""),
        "Una clase abstracta", ["Una clase concreta", "Una unión", "Una clase amiga"], "Una clase con una operación virtual pura pendiente es abstracta: no puede instanciarse.", false);
    }
  ];

  /* ===================================================================
     BLOQUE 5 · AMISTAD Y EL BONO (PPT §6 y §7)
     =================================================================== */

  /* ---------- p15 · Amigos (disparos) ---------- */
  const RECT_FRIEND = k => `class Rectangle {\n  int width, height;\npublic:\n  void set_values(int w, int h) {\n    width = w; height = h;\n  }\n  int area() { return width * height; }\n  friend Rectangle duplicate(Rectangle);\n};\nRectangle duplicate(Rectangle input) {\n  Rectangle result;\n  result.width = input.width * ${k};\n  result.height = input.height * ${k};\n  return result;\n}`;
  const SQUARE = "class Square;\nclass Rectangle {\n  int width, height;\npublic:\n  void convert(Square s);\n  int area() { return width * height; }\n};\nclass Square {\n  int side;\npublic:\n  void set_side(int n) { side = n; }\n  friend class Rectangle;\n};\nvoid Rectangle::convert(Square s) {\n  width = s.side; height = s.side;\n}";
  const P_FRIEND_GENS = [
    function () {
      const [w, h] = distinct(2, 2, 9);
      return S("¿Qué imprime?", src(RECT_FRIEND(2), `Rectangle rect, rectb;\nrect.set_values(${w}, ${h});\nrectb = duplicate(rect);\ncout << rectb.area();`),
        4 * w * h, [2 * w * h, w * h, 0], `La función amiga puede escribir los campos privados: rectb queda ${2 * w} × ${2 * h} = ${4 * w * h}.`);
    },
    function () {
      const [w, h] = distinct(2, 2, 9);
      return S("¿Qué imprime?", src(RECT_FRIEND(2), `Rectangle rect, rectb;\nrect.set_values(${w}, ${h});\nrectb = duplicate(rect);\ncout << rect.area();`),
        w * h, [4 * w * h, 2 * w * h, 0], `duplicate recibe una copia: rect conserva sus dimensiones de ${w} por ${h}.`);
    },
    function () {
      const [w, h] = distinct(2, 2, 9), k = rnd(3, 4);
      return S("¿Qué imprime?", src(RECT_FRIEND(k), `Rectangle rect;\nrect.set_values(${w}, ${h});\nRectangle big = duplicate(rect);\ncout << big.area();`),
        k * k * w * h, [k * w * h, w * h, 2 * k * w * h], `Cada lado se multiplica por ${k}: (${w}·${k}) × (${h}·${k}) = ${k * k * w * h}.`);
    },
    function () {
      return S("¿Cómo se llama la función amiga duplicate?", src(RECT_FRIEND(2), "Rectangle rect;"),
        "duplicate(rect)", ["rect.duplicate()", "Rectangle::duplicate(rect)", "rect->duplicate()"], "La función sigue siendo externa: se define y llama como duplicate(...), no como miembro de un objeto.", false);
    },
    function () {
      return S("¿Es duplicate un miembro de Rectangle?", src(RECT_FRIEND(2), ""),
        "No: es externa con acceso", ["Sí, privado", "Sí, público", "Sí, protegido"], "Un amigo recibe acceso sin convertirse en miembro.", false);
    },
    function () {
      const s = rnd(2, 12);
      return S("¿Qué imprime?", src(SQUARE, `Square sqr; Rectangle rect;\nsqr.set_side(${s});\nrect.convert(sqr);\ncout << rect.area();`),
        s * s, [s, 4 * s, 0], `Rectangle es amiga de Square, así que convert puede leer side: el rectángulo queda ${s} × ${s}.`);
    },
    function () {
      return S("¿Es recíproca la amistad?", "class Square {\n  // ...\n  friend class Rectangle;\n};",
        "No", ["Sí", "Solo entre clases", "Solo con funciones"], "Que Square declare amigo a Rectangle no da a Square acceso a los privados de Rectangle.");
    },
    function () {
      return S("¿Es transitiva la amistad?", "",
        "No", ["Sí", "Solo con herencia", "Solo entre dos clases"], "Un amigo de Rectangle no se convierte automáticamente en amigo de Square.");
    },
    function () {
      return S("¿Se hereda la amistad?", "",
        "No", ["Sí", "Solo con herencia public", "Solo la de funciones"], "Una declaración de amistad no concede automáticamente el mismo acceso a las derivadas de un amigo.");
    },
    function () {
      return S("¿Para qué sirve `class Square;` antes de Rectangle?", "class Square;\nclass Rectangle {\n  // ...\n  void convert(Square s);\n};",
        "Dar a conocer el nombre antes de usarlo", ["Definir Square vacía", "Hacer Square amiga", "Heredar de Square"], "Es una declaración anticipada: permite mencionar Square en la interfaz de Rectangle mientras el tipo está incompleto.");
    },
    function () {
      return S("Si Square declara `friend class Rectangle;`, ¿quién puede leer `side`?", src(SQUARE, ""),
        "Las funciones de Rectangle", ["Cualquier código", "Solo main", "Las derivadas de Square"], "Square concede acceso a Rectangle: sus miembros (como convert) pueden leer el estado privado de Square.", false);
    },
    function () {
      return S("¿Puede Square leer `width` de Rectangle?", src(SQUARE, ""),
        "No", ["Sí, son amigas", "Sí, si es public", "Solo en convert"], "La amistad tiene una dirección: Square concedió acceso a Rectangle, no al revés.", false);
    },
    function () {
      return S("¿Dónde se escribe la declaración `friend`?", src(RECT_FRIEND(2), ""),
        "En la clase que concede el acceso", ["En la función amiga", "En main", "En el .cpp"], "Se declara el prototipo de la función externa dentro de la clase con friend.", false);
    },
    function () {
      return S("¿Cuándo conviene un miembro en vez de un amigo?", "",
        "Si la operación pertenece a la clase", ["Nunca", "Siempre", "Si la clase es struct"], "Prefiera un miembro cuando la operación pertenezca naturalmente a una clase; reserve la amistad para colaboraciones específicas.");
    },
    function () {
      const [a, b, c, d] = [rnd(2, 6), rnd(2, 6), rnd(2, 6), rnd(7, 9)];
      return S("¿Qué imprime?", src("class Rectangle {\n  int width, height;\npublic:\n  void set_values(int w, int h) {\n    width = w; height = h;\n  }\n  friend int total(Rectangle a, Rectangle b);\n};\nint total(Rectangle a, Rectangle b) {\n  return a.width * a.height + b.width * b.height;\n}",
        `Rectangle r1, r2;\nr1.set_values(${a}, ${b});\nr2.set_values(${c}, ${d});\ncout << total(r1, r2);`),
        a * b + c * d, [a * b, c * d, (a + c) * (b + d)], "La amiga puede leer los campos privados de cualquier objeto Rectangle, aquí de dos.");
    },
    function () {
      const [w, h] = distinct(2, 2, 9);
      return S("¿Qué imprime?", src("class Rectangle {\n  int width, height;\npublic:\n  void set_values(int w, int h) {\n    width = w; height = h;\n  }\n  int area() { return width * height; }\n  friend void grow(Rectangle r);\n};\nvoid grow(Rectangle r) {\n  r.width = r.width * 2;\n}",
        `Rectangle rect;\nrect.set_values(${w}, ${h});\ngrow(rect);\ncout << rect.area();`),
        w * h, [2 * w * h, 4 * w * h, 0], "grow recibe una copia por valor: ser amiga le da acceso, pero cambia la copia, no rect.");
    },
    function () {
      return S("¿Puede una función amiga acceder a miembros protected?", "",
        "Sí", ["No, solo public", "Solo a private", "Solo si hereda"], "Un amigo podrá acceder a los miembros privados y protegidos.");
    },
    function () {
      return S("¿Qué debe usar el código cliente general?", "",
        "Las operaciones públicas", ["Funciones amigas", "Los campos privados", "Herencia privada"], "Use operaciones públicas para el código cliente general; reserve la amistad para quien necesita colaborar.");
    },
    function () {
      return S("¿Qué pasa con este código?", src(RECT_FRIEND(2), "Rectangle rect;\nrect.set_values(2, 3);\nrect.duplicate(rect);"),
        "No compila", ["Duplica rect", "Compila y no hace nada", "Falla al ejecutar"], "duplicate no es miembro: no se puede llamar con rect.duplicate(...).", "FAIL");
    },
    function () {
      const s = rnd(2, 12), t = rnd(2, 12);
      return S("¿Qué imprime?", src(SQUARE, `Square sqr; Rectangle rect;\nsqr.set_side(${s});\nrect.convert(sqr);\nsqr.set_side(${t});\ncout << rect.area();`),
        s * s, [t * t, s * t, 0], "convert copió side en ese momento (recibe una copia de sqr). Cambiar sqr después no altera rect.");
    },
    function () {
      return S("¿Por qué la definición de `Rectangle::convert` va después de la clase Square completa?", src(SQUARE, ""),
        "Porque lee s.side", ["Por estilo", "Porque es amiga", "Porque es privada"], "Para leer los campos de Square hace falta su definición completa; la declaración anticipada solo da a conocer el nombre.", false);
    }
  ];

  /* ---------- p16 · Valorizar un bono con objetos (carrera) ---------- */
  const COUPON_DECL = "class Coupon {\n  double nominal, annualRate, days, basis;\n  int period;\n  bool repaysNominal;\npublic:\n  Coupon();\n  Coupon(double n, double c, int p, bool isFinal);\n  double getYearFraction();\n  double getCashFlow();\n  double getValue(double annualYield);\n};\nCoupon::Coupon()\n  : nominal(0), annualRate(0), days(180), basis(360),\n    period(1), repaysNominal(false) {}\nCoupon::Coupon(double n, double c, int p, bool isFinal)\n  : nominal(n), annualRate(c), days(180), basis(360),\n    period(p), repaysNominal(isFinal) {}\ndouble Coupon::getYearFraction() { return days / basis; }\ndouble Coupon::getCashFlow() {\n  double amount = nominal * annualRate * getYearFraction();\n  if (repaysNominal) amount += nominal;\n  return amount;\n}\ndouble Coupon::getValue(double annualYield) {\n  return getCashFlow() / std::pow(1 + annualYield / 2, period);\n}";
  const BOND_DECL = COUPON_DECL + "\nclass Bond {\n  Coupon* coupons;\n  int couponCount;\n  Bond(const Bond&);\n  Bond& operator=(const Bond&);\npublic:\n  Bond(double nominal, double couponRate, int count);\n  ~Bond();\n  double getValue(double annualYield);\n};\nBond::Bond(double nominal, double couponRate, int count)\n  : coupons(0), couponCount(count) {\n  assert(count > 0);\n  coupons = new Coupon[couponCount];\n  for (int i = 0; i < couponCount; ++i) {\n    bool isFinal = (i == couponCount - 1);\n    coupons[i] = Coupon(nominal, couponRate, i + 1, isFinal);\n  }\n}\nBond::~Bond() { delete[] coupons; }\ndouble Bond::getValue(double annualYield) {\n  double total = 0.0;\n  for (int i = 0; i < couponCount; ++i)\n    total += coupons[i].getValue(annualYield);\n  return total;\n}";
  const BOND_NOTE = "// Coupon y Bond como en el PPT (180/360)";
  const bsrc = body => src(BOND_NOTE, body, BOND_DECL);
  function bond() {
    const N = pick([100, 1000]), rate = pick([0.04, 0.05, 0.06, 0.08]), count = pick([2, 4, 6]);
    let y; do { y = pick([0.04, 0.05, 0.06, 0.07, 0.08, 0.1]); } while (y === rate);
    const cpn = N * rate * 0.5, d = 1 + y / 2;
    const cf = k => cpn + (k === count ? N : 0), pv = k => cf(k) / Math.pow(d, k);
    let price = 0; for (let k = 1; k <= count; k++) price += pv(k);
    return { N, rate, count, y, cpn, d, cf, pv, price };
  }
  const lit = x => (Number.isInteger(x) ? x + ".0" : String(x));
  const P_BOND_GENS = [
    function () {
      const b = bond();
      return R("¿Qué imprime?", bsrc(`Coupon c(${lit(b.N)}, ${b.rate}, 1, false);\ncout << c.getYearFraction();`),
        "0.5", ["180", "2"], "El calendario regular es 180/360: getYearFraction devuelve y = 0.5.");
    },
    function () {
      const b = bond(), p = rnd(1, b.count - 1);
      return R("¿Qué imprime?", bsrc(`Coupon c(${lit(b.N)}, ${b.rate}, ${p}, false);\ncout << c.getCashFlow();`),
        cout6(b.cpn), [cout6(b.cpn + b.N), cout6(b.N * b.rate)], `Interés del cupón: ${b.N} × ${b.rate} × 0.5 = ${cout6(b.cpn)}. No es el pago final, así que no suma el nominal.`);
    },
    function () {
      const b = bond();
      return R("¿Qué imprime?", bsrc(`Coupon c(${lit(b.N)}, ${b.rate}, ${b.count}, true);\ncout << c.getCashFlow();`),
        cout6(b.cpn + b.N), [cout6(b.cpn), cout6(b.N)], `isFinal es true: el if suma el nominal al interés. ${cout6(b.cpn)} + ${b.N} = ${cout6(b.cpn + b.N)}.`);
    },
    function () {
      const b = bond(), p = rnd(1, b.count - 1);
      return R("¿Qué imprime?", bsrc(`Coupon c(${lit(b.N)}, ${b.rate}, ${p}, false);\ncout << c.getValue(${b.y});`),
        cout6(b.pv(p)), [cout6(b.cpn), cout6(b.cpn / Math.pow(1 + b.y, p))], `PV = ${cout6(b.cpn)} / (1 + ${b.y}/2)^${p} = ${cout6(b.pv(p))}. La tasa por período es la anual dividida en 2.`);
    },
    function () {
      const b = bond();
      return R("¿Qué imprime?", bsrc(`Bond bond(${lit(b.N)}, ${b.rate}, ${b.count});\ncout << bond.getValue(${b.y});`),
        cout6(b.price), [cout6(b.N), cout6(b.cpn * b.count + b.N)], `Bond::getValue suma el valor presente de cada uno de los ${b.count} cupones: ${cout6(b.price)}.`);
    },
    function () {
      const b = bond();
      return R(`¿Cuántos objetos Coupon crea \`Bond bond(${lit(b.N)}, ${b.rate}, ${b.count});\`?`, bsrc(`Bond bond(${lit(b.N)}, ${b.rate}, ${b.count});`),
        b.count, [b.count - 1, b.count + 1], `El constructor hace \`new Coupon[couponCount]\`: un objeto por pago, ${b.count} en total.`, false);
    },
    function () {
      return R("¿Qué índice de pago (`period`) recibe `coupons[i]`?", "coupons[i] = Coupon(nominal, couponRate, i + 1, isFinal);",
        "i + 1", ["i", "i - 1"], "Los índices de pago comienzan en 1; los del arreglo, en 0.");
    },
    function () {
      return R("¿Qué cupón recibe `isFinal = true`?", "bool isFinal = (i == couponCount - 1);",
        "Solo el último", ["El primero", "Todos"], "Solo el último elemento del arreglo devuelve el nominal; así el nominal se suma una sola vez.");
    },
    function () {
      return R("¿Por qué Bond declara privados su copia y su `operator=`?", "Bond(const Bond&);            // sin copia\nBond& operator=(const Bond&); // sin asignación",
        "Para no compartir el arreglo", ["Para que sea abstracta", "Para ahorrar memoria"], "Impiden que dos bonos compartan y eliminen el mismo arreglo de cupones.");
    },
    function () {
      return R("¿Qué hace `~Bond()`?", "Bond::~Bond() { delete[] coupons; }",
        "Libera el arreglo de cupones", ["Imprime el precio", "Nada"], "Usa delete[] para destruir los objetos Coupon y liberar su arreglo cuando el bono sale del ámbito.");
    },
    function () {
      return R("¿Por qué Coupon necesita el constructor `Coupon()`?", "coupons = new Coupon[couponCount];",
        "new Coupon[n] lo exige", ["Para el destructor", "Para getValue"], "Crear un arreglo de objetos con new[] requiere constructor predeterminado. Los elementos comienzan con nominal y tasa cero.");
    },
    function () {
      const n = pick([2, 4, 6, 8, 10]);
      return R(`Con \`couponCount = ${n}\`, ¿a cuántos años es el bono?`, `Bond bond(100.0, 0.05, ${n});`,
        cout6(n / 2), [n, cout6(n / 4)], `Los pagos son semestrales: el plazo es couponCount / 2.0 = ${cout6(n / 2)} años.`);
    },
    function () {
      const y = pick([0.04, 0.05, 0.06, 0.07, 0.08, 0.1]);
      return R(`Con rendimiento anual ${y}, ¿cuál es la tasa por período?`, `bond.getValue(${y});`,
        cout6(y / 2), [cout6(y), cout6(y * 2)], `getValue descuenta con (1 + r/2): ${y} / 2 = ${cout6(y / 2)} por semestre.`);
    },
    function () {
      const b = bond();
      return R("¿Cuánto suman los flujos de caja (sin descontar)?", bsrc(`Bond bond(${lit(b.N)}, ${b.rate}, ${b.count});`),
        cout6(b.cpn * b.count + b.N), [cout6(b.cpn * b.count), cout6(b.price)], `${b.count} cupones de ${cout6(b.cpn)} más el nominal ${b.N}, que se devuelve una vez.`, false);
    },
    function () {
      return R("¿Qué llama `Bond::getValue` para cada pago?", "total += coupons[i].getValue(annualYield);",
        "Coupon::getValue", ["Bond::getValue", "getCashFlow solo"], "El bono pide a cada cupón su valor presente; cada cupón calcula su flujo y lo descuenta según su índice.");
    },
    function () {
      const N = pick([100, 1000]), r = pick([0.04, 0.05, 0.06, 0.08]), n = pick([2, 4, 6]);
      return R("¿Qué imprime?", bsrc(`Bond bond(${lit(N)}, ${r}, ${n});\ncout << bond.getValue(${r});`),
        cout6(N), [cout6(N * (1 + r)), cout6(N * r * 0.5 * n)], "Si el rendimiento es igual a la tasa de cupón (con pagos y capitalización semestrales), el bono vale exactamente su nominal.");
    },
    function () {
      return R("¿Qué imprime?", bsrc("Coupon c;\ncout << c.getCashFlow();"),
        0, [100, "2.5"], "El constructor predeterminado deja nominal y tasa en cero: el flujo es 0.");
    },
    function () {
      return R("¿Qué comprueba `assert(count > 0)`?", "assert(count > 0);",
        "Que haya cupones", ["Que el precio sea positivo", "Que la tasa sea 5 %"], "<cassert> comprueba durante el desarrollo que la cantidad de cupones sea positiva.");
    },
    function () {
      const b = bond();
      return R("¿Cuánto más paga el cupón final que uno intermedio?", bsrc(`Coupon a(${lit(b.N)}, ${b.rate}, 1, false);\nCoupon z(${lit(b.N)}, ${b.rate}, ${b.count}, true);`),
        b.N, [cout6(b.cpn), 0], "La única diferencia es repaysNominal: el final suma el nominal al mismo interés.", false);
    },
    function () {
      const N = pick([100, 1000]), r = pick([0.04, 0.05, 0.06, 0.08]);
      let y; do { y = pick([0.04, 0.05, 0.06, 0.07, 0.08, 0.1]); } while (y === r);
      const v = (N * r * 0.5 + N) / (1 + y / 2);
      return R("¿Qué imprime?", bsrc(`Bond bond(${lit(N)}, ${r}, 1);\ncout << bond.getValue(${y});`),
        cout6(v), [cout6(N * r * 0.5 + N), cout6(N)], `Con un solo cupón, ese es el final: (${cout6(N * r * 0.5)} + ${N}) / (1 + ${y}/2) = ${cout6(v)}.`);
    },
    function () {
      return R("¿Qué tipo de relación hay entre Bond y Coupon?", "class Bond {\n  Coupon* coupons;\n  int couponCount;\n  // ...\n};",
        "Bond posee un arreglo de Coupon", ["Bond hereda de Coupon", "Coupon es amiga de Bond"], "Es composición: el bono tiene sus propios cupones (coupons posee el arreglo) y los libera en su destructor.");
    }
  ];

  /* ===================================================================
     NIVELES DE LA SECCIÓN
     =================================================================== */
  // El código de los clasificadores se arma con decl + body (lo mismo que se verifica).
  [P_SYN_ITEMS, P_ACC_ITEMS, P_INH_ITEMS, P_ABS_ITEMS].forEach(items => items.forEach(it => {
    it.code = [it.decl, it.body].filter(Boolean).join("\n");
    it.check = { decl: it.decl, body: it.body, compiles: it.bin === "compila" };
  }));
  Object.entries({ P_REC_GENS, P_SYN_ITEMS, P_PTR_GENS, P_ACC_ITEMS, P_CTOR_GENS, P_LIFE_GENS, P_COPY_GENS,
    P_UNION_GENS, P_INH_ITEMS, P_DER_GENS, P_ORDER_GENS, P_VIRT_GENS, P_ABS_ITEMS, P_POLY_GENS, P_FRIEND_GENS, P_BOND_GENS })
    .forEach(([k, a]) => { a.key = k; });

  const NAMES = { compila: "Compila", "no compila": "No compila" };
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
  const COMP_BINS = ["compila", "no compila"];
  function sorter(items, ask) {
    return {
      engine: "sorter", controls: SORT,
      build() { return { phases: [{ bins: COMP_BINS, items: cases(items, Math.min(10, items.length), ask) }] }; },
      quiz: n => sorterQuiz(items, COMP_BINS, n, ask)
    };
  }
  const L = (o, kind) => Object.assign({ section: "poo" }, o, kind);

  const POO = [
    // Bloque 1 · Estructuras
    L({ id: "p01-registros", world: 21, addr: "0x2100", title: "Registros y miembros", topic: "§1 Registros y miembros",
      desc: "Product y Movie: el punto, copiar registros, paso por valor o por referencia y arreglos de registros.",
      intro: "El programa corre hacia ti. Ponte en el carril correcto: ¿se cambió el registro original o una copia?" },
      runner(P_REC_GENS)),
    L({ id: "p02-sintaxis", world: 21, addr: "0x2110", title: "¿Compila el registro?", topic: "§1 Sintaxis de estructuras",
      desc: "El punto y coma tras la llave, punto o flecha, y un nivel a la vez en registros anidados.",
      intro: "Mándalo a <code>COMPILA</code> o <code>NO COMPILA</code>. Fíjate si a la izquierda hay un objeto (<code>.</code>) o un puntero (<code>-&gt;</code>)." },
      sorter(P_SYN_ITEMS, "¿Este código compila?")),
    L({ id: "p03-punteros", world: 21, addr: "0x2120", title: "Punteros y anidación", topic: "§1 Punteros y anidación",
      desc: "pmovie->year, (*pmovie).year y charlie.favorite_movie.year.",
      intro: "Dispara a la respuesta correcta. <code>p-&gt;year</code> es lo mismo que <code>(*p).year</code>." },
      shooter(P_PTR_GENS)),
    { id: "jefe-p1", section: "poo", world: 21, addr: "0xBADC", engine: "shooter", boss: true, controls: SHOOT,
      title: "Jefe: Missing Semicolon", topic: "Jefe del bloque 1", desc: "Mezcla de los niveles 1 a 3.",
      intro: "Alguien cerró un struct sin punto y coma y ahora el error aparece diez líneas más abajo. Responde lo de los niveles 1 a 3.",
      bossOf: ["p01-registros", "p02-sintaxis", "p03-punteros"], boss2: { label: "};", color: "amber", pattern: "aimed", speed: 1 } },
    // Bloque 2 · Clases
    L({ id: "p04-acceso", world: 22, addr: "0x2200", title: "Estado y acceso", topic: "§2 Estado, comportamiento y acceso",
      desc: "private, public y protected; Rectangle:: y la interfaz pública.",
      intro: "Mándalo a <code>COMPILA</code> o <code>NO COMPILA</code>. Recuerda: en una <code>class</code> todo parte privado." },
      sorter(P_ACC_ITEMS, "¿Este código compila?")),
    L({ id: "p05-constructores", world: 22, addr: "0x2210", title: "Constructores", topic: "§2 Construcción",
      desc: "Sin tipo de retorno, sobrecarga, constructor predeterminado y Pair fourth();.",
      intro: "Ponte en el carril correcto. Los argumentos eligen qué constructor se usa." },
      runner(P_CTOR_GENS)),
    L({ id: "p06-vida", world: 22, addr: "0x2220", title: "Vida de un objeto", topic: "§2 Construcción y destrucción",
      desc: "Cuándo corre cada constructor y destructor: ámbitos, new y delete.",
      intro: "Cada letra es un constructor y cada <code>~</code> un destructor. Dispara a la salida en el orden correcto." },
      shooter(P_LIFE_GENS)),
    L({ id: "p07-copias", world: 22, addr: "0x2230", title: "Copias y punteros a objetos", topic: "§2 Copia y punteros a objetos",
      desc: "Construir una copia o asignarla, punteros que se comparten, -> y new Rectangle[2].",
      intro: "Ponte en el carril con el resultado. ¿Es una copia independiente o el mismo objeto?" },
      runner(P_COPY_GENS)),
    { id: "jefe-p2", section: "poo", world: 22, addr: "0xC0DE", engine: "shooter", boss: true, controls: SHOOT,
      title: "Jefe: Shallow Copy", topic: "Jefe del bloque 2", desc: "Mezcla de los niveles 4 a 7.",
      intro: "Copió los punteros en vez de los datos y ahora dos objetos se pelean la misma memoria. Responde lo de los niveles 4 a 7.",
      bossOf: ["p04-acceso", "p05-constructores", "p06-vida", "p07-copias"], boss2: { label: "b(a)", color: "cyan", pattern: "spread", speed: 1.1 } },
    // Bloque 3 · Tipos clase y herencia
    L({ id: "p08-uniones", world: 23, addr: "0x2300", title: "struct, class y union", topic: "§3 Distintos usos de los tipos clase",
      desc: "Acceso por defecto, uniones con etiqueta y uniones anónimas.",
      intro: "Dispara a la respuesta correcta. Un struct guarda todo a la vez; una unión, una alternativa a la vez." },
      shooter(P_UNION_GENS)),
    L({ id: "p09-herencia", world: 23, addr: "0x2310", title: "Herencia y acceso", topic: "§4 Clases base, acceso y modos de herencia",
      desc: "protected, herencia public/protected/private y constructores base.",
      intro: "Mándalo a <code>COMPILA</code> o <code>NO COMPILA</code>. Piensa qué ve la derivada y qué ve el código externo." },
      sorter(P_INH_ITEMS, "¿Este código compila?")),
    L({ id: "p10-derivadas", world: 23, addr: "0x2320", title: "Clases derivadas", topic: "§4 Clases base y derivadas",
      desc: "Polygon, Rectangle y Triangle; la tabla de modos y la herencia múltiple.",
      intro: "Ponte en el carril correcto. Cada derivada reutiliza la base y aporta su propio comportamiento." },
      runner(P_DER_GENS)),
    L({ id: "p11-orden", world: 23, addr: "0x2330", title: "Orden de construcción", topic: "§4 Acceso y duración",
      desc: "Mother, Daughter y Son: qué constructor base se elige y en qué orden se destruye.",
      intro: "M y m son constructores de Mother; D y S, de las derivadas; <code>~</code> marca un destructor. Dispara a la salida correcta." },
      shooter(P_ORDER_GENS)),
    { id: "jefe-p3", section: "poo", world: 23, addr: "0xD1A6", engine: "shooter", boss: true, controls: SHOOT,
      title: "Jefe: Inaccessible Base", topic: "Jefe del bloque 3", desc: "Mezcla de los niveles 8 a 11.",
      intro: "Heredó en privado y ahora nadie puede llamarlo. Responde lo de los niveles 8 a 11 y esquiva su lluvia de etiquetas.",
      bossOf: ["p08-uniones", "p09-herencia", "p10-derivadas", "p11-orden"], boss2: { label: "private:", color: "plum", pattern: "rain", speed: 1.15, rainText: "#" } },
    // Bloque 4 · Polimorfismo
    L({ id: "p12-virtual", world: 24, addr: "0x2400", title: "virtual o no", topic: "§5 Punteros y funciones virtuales",
      desc: "Un Polygon* que apunta a un Rectangle: ¿qué area se llama?",
      intro: "Mira si <code>area</code> es <code>virtual</code> en Polygon. Sin virtual manda el tipo del puntero; con virtual, el objeto real." },
      runner(P_VIRT_GENS)),
    L({ id: "p13-abstractas", world: 24, addr: "0x2410", title: "Clases abstractas", topic: "§5 Clases abstractas",
      desc: "virtual int area() = 0: qué se puede instanciar y qué no.",
      intro: "Mándalo a <code>COMPILA</code> o <code>NO COMPILA</code>. Una clase con virtual pura pendiente no se instancia, pero sí se apunta." },
      sorter(P_ABS_ITEMS, "¿Este código compila?")),
    L({ id: "p14-polimorfismo", world: 24, addr: "0x2420", title: "Polimorfismo en acción", topic: "§5 Objetos dinámicos y ciclos",
      desc: "printarea con this, arreglos de Polygon*, new y destructores virtuales.",
      intro: "Dispara a la salida correcta. Un mismo ciclo, distintos tipos: cada objeto aporta su versión." },
      shooter(P_POLY_GENS)),
    { id: "jefe-p4", section: "poo", world: 24, addr: "0x0BAD", engine: "shooter", boss: true, controls: SHOOT,
      title: "Jefe: Pure Virtual Call", topic: "Jefe del bloque 4", desc: "Mezcla de los niveles 12 a 14.",
      intro: "Intentó instanciar una clase abstracta y quedó atrapado entre la base y la derivada. Responde lo de los niveles 12 a 14.",
      bossOf: ["p12-virtual", "p13-abstractas", "p14-polimorfismo"], boss2: { label: "= 0", color: "cyan", pattern: "spread", speed: 1.2 } },
    // Bloque 5 · Amistad y el bono
    L({ id: "p15-amistad", world: 25, addr: "0x2500", title: "Amigos", topic: "§6 Funciones y clases amigas",
      desc: "duplicate, Square y Rectangle; la amistad no es recíproca, transitiva ni heredada.",
      intro: "Dispara a la respuesta correcta. Un amigo recibe acceso sin convertirse en miembro." },
      shooter(P_FRIEND_GENS)),
    L({ id: "p16-bono", world: 25, addr: "0x2510", title: "El bono con objetos", topic: "§7 Ejemplo: valorización de un bono",
      desc: "Coupon y Bond: fracción del año, flujos, valor presente y el arreglo de cupones.",
      intro: "El bono bullet del PPT, ahora con clases y datos que cambian. Ponte en el carril con lo que calcula el programa." },
      runner(P_BOND_GENS)),
    { id: "jefe-pf", section: "poo", world: 25, addr: "0x60D0", engine: "shooter", boss: true, final: true, controls: SHOOT,
      title: "Jefe final: God Object", topic: "Jefe final de POO",
      desc: "Toda la sección. Se desbloquea al vencer a los 4 jefes y completar el bloque 5.",
      intro: "La clase que lo sabe y lo hace todo, sin encapsulación ni herencia que la ordene. Ataca con preguntas de los 16 niveles: dispara a la letra correcta y esquiva sus ataques mixtos.",
      bossOf: "all", boss2: { label: "class God", color: "bad", pattern: "mixed", speed: 1.25 } }
  ];

  function buildBoss(lv) {
    const pool = lv.bossOf === "all" ? POO.filter(l => !l.boss) : POO.filter(l => lv.bossOf.includes(l.id));
    let qs;
    if (lv.bossOf === "all") qs = shuffle(pool).slice(0, 12).map(l => l.quiz(1)[0]);
    else {
      const per = Math.floor(10 / pool.length);
      qs = pool.flatMap(l => l.quiz(per));
      shuffle(pool).slice(0, 10 - qs.length).forEach(l => qs.push(l.quiz(1)[0]));
    }
    return { questions: shuffle(qs), boss: lv.boss2 };
  }
  POO.filter(l => l.boss).forEach(l => { l.build = () => buildBoss(l); });

  C.worlds.push(
    { n: 21, name: "Bloque 1 · Estructuras", desc: "Sección 1 del PPT: registros y miembros, punteros y registros anidados." },
    { n: 22, name: "Bloque 2 · Clases", desc: "Sección 2: estado y acceso, constructores, destructores, copias y punteros a objetos." },
    { n: 23, name: "Bloque 3 · Tipos clase y herencia", desc: "Secciones 3 y 4: struct, class y union; clases base y derivadas, modos de herencia y orden de construcción." },
    { n: 24, name: "Bloque 4 · Polimorfismo", desc: "Sección 5: funciones virtuales, clases abstractas y objetos dinámicos." },
    { n: 25, name: "Bloque 5 · Amistad y el bono", desc: "Secciones 6 y 7: funciones y clases amigas, y la valorización del bono con Coupon y Bond." }
  );
  POO.forEach(l => C.levels.push(l));
  C.pooBanks = { P_REC_GENS, P_SYN_ITEMS, P_PTR_GENS, P_ACC_ITEMS, P_CTOR_GENS, P_LIFE_GENS, P_COPY_GENS,
    P_UNION_GENS, P_INH_ITEMS, P_DER_GENS, P_ORDER_GENS, P_VIRT_GENS, P_ABS_ITEMS, P_POLY_GENS, P_FRIEND_GENS, P_BOND_GENS };
})();
