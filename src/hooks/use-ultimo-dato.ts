import { useState } from 'react';

/**
 * Recuerda el último valor que NO fue vacío. Lo usan las hojas de edición: al
 * eliminar el registro que se está editando la consulta pasa a `null`, y sin
 * esto la hoja se quedaría en blanco el instante que tarda en cerrarse.
 */
export function useUltimoDato<T>(dato: T | null | undefined): T | null {
  const [ultimo, setUltimo] = useState<T | null>(dato ?? null);
  // Ajustar el estado durante el render es el patrón de React para "recordar
  // algo del render anterior": no hace falta un efecto.
  if (dato != null && dato !== ultimo) setUltimo(dato);
  return ultimo;
}
