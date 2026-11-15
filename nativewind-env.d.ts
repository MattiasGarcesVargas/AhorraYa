/// <reference types="nativewind/types" />

// TypeScript 6 comprueba también los imports de efecto (`import '@/global.css'`).
declare module '*.css';

// Imágenes de `assets/images`: Metro las convierte en un id de recurso.
declare module '*.png' {
  const recurso: number;
  export default recurso;
}
