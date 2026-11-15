/**
 * Nombres de los tokens de color. Es JavaScript plano (no TS) porque lo lee
 * también `tailwind.config.js`, que corre en Node sin compilar.
 *
 * Añadir un token: se agrega aquí y en las dos paletas de `tema.constants.ts`;
 * el tipado obliga a que ninguna de las dos se quede sin él.
 */
const NOMBRES_TOKENS = /** @type {const} */ ([
  'fondo',
  'superficie',
  'superficie-alta',
  'borde',
  'texto',
  'texto-suave',
  'primario',
  'primario-texto',
  'acento',
  'acento-texto',
  'tinta',
  'tinta-texto',
  'tinta-suave',
  'tinta-borde',
  'menta',
  'marca',
  'seleccion',
  'seleccion-texto',
  'seleccion-icono',
  'peligro',
  'peligro-suave',
  'cat-1',
  'cat-2',
  'cat-3',
  'cat-4',
  'cat-5',
  'cat-6',
  'cat-7',
  'cat-8',
]);

module.exports = { NOMBRES_TOKENS };
