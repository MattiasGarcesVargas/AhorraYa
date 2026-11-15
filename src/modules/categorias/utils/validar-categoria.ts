import {
  COLORES_CATEGORIA,
  ICONOS_CATEGORIA,
  LARGO_MAXIMO_NOMBRE_CATEGORIA,
} from '@/constants/categorias.constants';
import { MAXIMO_CENTAVOS } from '@/lib/dinero';
import { normalizar } from '@/lib/texto';

import type { Categoria, CategoriaId, DatosCategoria } from '../categorias.types';

export type ErroresCategoria = Partial<Record<keyof DatosCategoria, string>>;

/** Error de dominio con el detalle por campo, para mostrarlo junto a cada uno. */
export class ErrorCategoriaInvalida extends Error {
  constructor(readonly errores: ErroresCategoria) {
    super(Object.values(errores).join(' '));
    this.name = 'ErrorCategoriaInvalida';
  }
}

export type ResultadoValidacion =
  { ok: true; datos: DatosCategoria } | { ok: false; errores: ErroresCategoria };

/**
 * Reglas de una categoría. El nombre debe ser ÚNICO sin contar tildes ni
 * mayúsculas: el atajo de iPhone busca la categoría por nombre, y "Café" y
 * "cafe" serían la misma para él.
 */
export function validarCategoria(
  datos: DatosCategoria,
  existentes: readonly Categoria[],
  idEditando?: CategoriaId,
): ResultadoValidacion {
  const errores: ErroresCategoria = {};
  const nombre = datos.nombre.trim().replace(/\s+/g, ' ');

  if (!nombre) {
    errores.nombre = 'Escribe un nombre.';
  } else if (nombre.length > LARGO_MAXIMO_NOMBRE_CATEGORIA) {
    errores.nombre = `Máximo ${LARGO_MAXIMO_NOMBRE_CATEGORIA} caracteres.`;
  } else if (
    existentes.some(
      (otra) => otra.id !== idEditando && normalizar(otra.nombre) === normalizar(nombre),
    )
  ) {
    errores.nombre = 'Ya tienes una categoría con ese nombre.';
  }

  if (!(ICONOS_CATEGORIA as readonly string[]).includes(datos.icono)) {
    errores.icono = 'Elige un ícono.';
  }
  if (!(COLORES_CATEGORIA as readonly string[]).includes(datos.color)) {
    errores.color = 'Elige un color.';
  }

  const limite = datos.limiteMensualCentavos;
  if (!Number.isInteger(limite) || limite < 0 || limite > MAXIMO_CENTAVOS) {
    errores.limiteMensualCentavos = 'Escribe un límite válido (puede ser 0).';
  }

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, datos: { ...datos, nombre } };
}

/** Id para una categoría nueva. Nunca choca con los de las iniciales (`comida`, …). */
export function nuevoIdCategoria(ahora = Date.now(), azar = Math.random()): CategoriaId {
  return `c-${ahora.toString(36)}${Math.floor(azar * 1_679_616)
    .toString(36)
    .padStart(4, '0')}`;
}

/**
 * Qué falta para poder eliminar una categoría. Es una regla de negocio, no de
 * pantalla: nunca puede quedar sin categorías y sus gastos no pueden quedar
 * huérfanos.
 */
export function motivoParaNoEliminar(
  categorias: readonly Categoria[],
  id: CategoriaId,
  cantidadGastos: number,
  moverGastosA: CategoriaId | null,
): string | null {
  if (categorias.length <= 1) return 'Necesitas al menos una categoría.';
  if (cantidadGastos === 0) return null;
  if (!moverGastosA) return 'Elige a qué categoría pasan sus gastos.';
  if (moverGastosA === id || !categorias.some((c) => c.id === moverGastosA)) {
    return 'Elige otra categoría para sus gastos.';
  }
  return null;
}
