/* Configuración de Firebase para las cuentas en la nube.
   Estos datos NO son secretos: identifican el proyecto y van dentro de la página.
   La seguridad la dan las reglas de Firestore (ver firestore.rules) y la lista de dominios autorizados.
   Si `config` es null, el juego funciona solo con perfiles guardados en el navegador. */
window.CPP_ARCADE_CLOUD = {
  config: null,
  // Solo se ofrecen cuentas en estos dominios (en otros, por ejemplo una vista previa, se juega sin cuenta).
  hosts: ["favendano03.github.io", "localhost", "127.0.0.1"]
};
