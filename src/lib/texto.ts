/**
 * `"  Débito "` → `"debito"`. Para comparar lo que escribe una persona (o lo
 * que manda Atajos) contra los nombres del catálogo sin que una tilde, una
 * mayúscula o un espacio de más rompan la coincidencia.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
