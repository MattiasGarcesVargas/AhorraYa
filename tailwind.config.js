const { NOMBRES_TOKENS } = require('./src/constants/tokens-nombres');

/**
 * Cada color es una variable CSS con canales RGB (`21 128 61`) para que
 * Tailwind pueda aplicarle opacidad: `bg-primario/10`.
 *
 * Los VALORES no viven aquí ni en el CSS: los define `tema.constants.ts` y los
 * inyecta `TemaProvider` con `vars()` según el modo claro/oscuro. Así hay una
 * sola fuente de verdad que comparten las clases y lo que se pinta en JS
 * (SVG, iconos), que no entiende de clases.
 */
const conOpacidad = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

const colores = Object.fromEntries(
  NOMBRES_TOKENS.map((nombre) => [nombre, conOpacidad(`--${nombre}`)]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // El modo oscuro NO usa variantes `dark:`: lo resuelven las variables que
  // inyecta TemaProvider. 'class' evita que NativeWind se pelee con quien
  // fije el esquema de color (en web lanzaba "Cannot manually set color scheme").
  darkMode: 'class',
  theme: {
    extend: {
      colors: colores,
      borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        '2xl': 28,
      },
    },
  },
  plugins: [],
};
