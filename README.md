# C++ Arcade

Arcade para aprender **conceptos** de C++ (no a escribir código): dónde vive cada dato en memoria, cómo se leen los punteros, qué hace cada estructura de control y cómo se diseña una clase con `.h` y `.cpp`.

Hecho para el curso *Programación en Finanzas* (C++), con ejemplos de bonos y opciones.

## Modos de juego

Al iniciar sesión eliges un modo:

- **Campaña**: niveles ordenados según la materia. Tiene dos secciones:
  - **Estructuras y Funciones**: los 16 niveles y 4 jefes descritos abajo.
  - **Gestión de memoria**: *coming soon*.
- **Arcade**: casos cortos y más dinámicos. *Coming soon*.

## Niveles

La campaña sigue el índice del resumen "Bases de C++, estructuras de programación y funciones": 16 niveles en 4 bloques. Al final de cada bloque hay un jefe que mezcla preguntas de sus 4 niveles, y el cuarto jefe es el final, con preguntas de los 16. Los niveles normales están siempre abiertos; cada jefe se desbloquea al completar su bloque, y el final pide además vencer a los otros tres.

| Bloque | Nivel (sección del resumen) | Mecánica |
|---|---|---|
| 1 · Bases | Estructura de un programa: preprocesador, compilador o enlazador | Clasificador |
| | Variables y ámbito | Carrera |
| | Tipos y literales (sizeof, rangos, octal, hex, binario) | Disparos |
| | Texto y constantes (char, escapes, string, const vs #define) | Carrera |
| | **Jefe: Overflow** | Jefe, ataque dirigido |
| 2 · Operadores y archivos | Operadores aritméticos y asignación | Carrera |
| | Lógica, bits, conversiones y precedencia | Disparos |
| | Entrada, salida y stringstream | Carrera |
| | Header y .cpp | Clasificador |
| | **Jefe: Undefined Reference** | Jefe, abanico |
| 3 · Funciones | Funciones: definición y llamadas | Carrera |
| | Paso por valor y por referencia | Disparos |
| | Interfaces: void, sobrecarga, defaults, prototipos, inline (¿compila?) | Clasificador |
| | Recursión | Carrera |
| | **Jefe: Stack Overflow** | Jefe, lluvia de marcos |
| 4 · Control y arreglos | Selección e iteración | Carrera |
| | Saltos y switch | Disparos |
| | Arreglos | Disparos |
| | Cadenas estilo C | Carrera |
| | **Jefe final: Segmentation Fault** | Jefe, ataques mixtos |

Fuera de la campaña quedan dos secciones extra con material de otros PPT del curso: **Memoria** (Stack o Heap, Cazapunteros, Detective de memoria, Jefe Memory Leak) y **Clases** (Arquitecto de clases, Vida de un objeto, Jefe Constructor Loco).

Las preguntas de punteros y de control de flujo se generan al azar, así que cada partida es distinta. Cada error muestra una explicación que queda en pantalla hasta que la cierras (botón o `Enter`) y se guarda en **Repasar errores**.

## Controles

- Teclado: `◀ ▶` (o `A`/`D`) para moverte, `Espacio` para la acción (soltar / disparar), `Enter` para cerrar una explicación, `Esc` o `P` para pausar, `M` para silenciar o activar el sonido.
- Celular: botones en pantalla debajo del juego. El botón del parlante (arriba a la derecha, o junto a la pausa) silencia el sonido.

## Perfiles y partidas guardadas

El menú de inicio permite crear perfiles con PIN opcional. Todo se guarda en el `localStorage` del navegador (no hay servidor), así que:

- Cada navegador tiene sus propios perfiles.
- Para llevar tu avance a otro equipo, usa **Exportar partida** (código o archivo `.json`) y después **Importar partida guardada** en el menú de inicio.
- El PIN solo evita que otra persona use tu perfil en el mismo computador; no es una contraseña segura.

## Cuentas en la nube (opcional)

Si `js/firebase-config.js` tiene la configuración de un proyecto de Firebase, el menú de inicio ofrece
**Entrar con Google** o **con correo**. El avance de cada cuenta se guarda en Firestore (`users/{uid}`) y se
sincroniza entre equipos; al crear la cuenta se puede traer el avance de un perfil local. Sin configuración,
el juego funciona solo con perfiles del navegador.

Para habilitarlo en Firebase:
1. Authentication → Sign-in method: activar Google y Email/Password.
2. Authentication → Settings → Authorized domains: agregar el dominio donde se publica el juego.
3. Firestore Database → Rules: pegar el contenido de `firestore.rules` y publicar.
4. Agregar el dominio también en la lista `hosts` de `js/firebase-config.js`.

El SDK de Firebase (Apache-2.0) va incluido en `js/vendor/firebase/` y solo se descarga cuando hay cuentas habilitadas.

## Publicarlo en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `cpp-arcade`).
2. Sube el contenido de esta carpeta (o `git init`, `git add .`, `git commit`, `git push`).
3. En el repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
4. En uno o dos minutos queda en `https://<tu-usuario>.github.io/cpp-arcade/`.

No necesita compilar nada: es HTML, CSS y JavaScript puro.

## Estructura

```
index.html        pantallas (login, mapa, juego, resultado, repaso)
css/style.css     estilos
js/storage.js     perfiles, guardado, exportar/importar
js/questions.js   contenido de los niveles y generadores de preguntas
js/engines.js     los tres motores de juego (clasificador, disparos, carrera)
js/bg.js          fondo animado del menú de inicio (duelos de conceptos)
js/sound.js       efectos de sonido sintetizados (Web Audio, sin archivos)
js/cloud.js       cuentas en la nube con Firebase (Google o correo)
js/firebase-config.js  configuración pública del proyecto de Firebase
firestore.rules   reglas de seguridad de la base de datos
img/              ícono de la pestaña (favicon) y de la pantalla de inicio del celular
js/app.js         navegación entre pantallas y controles
```

Para agregar preguntas, edita `js/questions.js`: cada nivel tiene su lista o sus generadores.
