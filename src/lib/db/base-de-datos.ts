/**
 * Infraestructura compartida de persistencia. Los módulos NO importan
 * expo-sqlite directamente para leer o escribir: cada uno define su
 * repositorio (interfaz) y su implementación SQLite, y el proveedor de
 * repositorios los arma con la conexión que abre `SQLiteProvider`.
 */
export const NOMBRE_BASE_DE_DATOS = 'ahorraya.db';

export { migrar } from './migraciones';

/** Instante actual en ISO, para `creado_en`. Inyectable en tests. */
export function ahoraIso(): string {
  return new Date().toISOString();
}

/** Normaliza una nota opcional: cadena vacía o sólo espacios es "sin nota". */
export function notaONulo(nota: string | null | undefined): string | null {
  const limpia = nota?.trim();
  return limpia ? limpia : null;
}
