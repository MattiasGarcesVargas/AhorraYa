import {
  ALIAS_CATEGORIAS,
  CATEGORIAS_INICIALES,
  COLORES_CATEGORIA,
  type ColorCategoria,
} from '@/constants/categorias.constants';
import { sumar, type Centavos } from '@/lib/dinero';
import { normalizar } from '@/lib/texto';

import type { Categoria, CatalogoCategorias } from '../categorias.types';

/**
 * Lo que se muestra para un gasto cuya categoría ya no existe. No debería
 * pasar (eliminar obliga a mover los gastos), pero si pasa, la lista no se
 * rompe.
 */
export const SIN_CATEGORIA: Categoria = {
  id: '',
  nombre: 'Sin categoría',
  icono: 'help-circle-outline',
  color: 'cat-6',
  orden: Number.MAX_SAFE_INTEGER,
  limiteMensualCentavos: 0,
};

export function crearCatalogo(categorias: readonly Categoria[]): CatalogoCategorias {
  const lista = [...categorias].sort((a, b) => a.orden - b.orden);
  const porId = new Map(lista.map((categoria) => [categoria.id, categoria]));

  return {
    lista,
    porId: (id) => porId.get(id) ?? { ...SIN_CATEGORIA, id },
    buscar: (texto) => {
      if (!texto) return undefined;
      const buscado = normalizar(texto);
      return lista.find((categoria) =>
        [categoria.id, categoria.nombre, ...(ALIAS_CATEGORIAS[categoria.id] ?? [])].some(
          (candidato) => normalizar(candidato) === buscado,
        ),
      );
    },
  };
}

export const CATALOGO_VACIO = crearCatalogo([]);

/** Las categorías de partida como `Categoria`, para tests y valores por defecto. */
export const CATEGORIAS_DE_PARTIDA: readonly Categoria[] = CATEGORIAS_INICIALES.map(
  (categoria, orden) => ({ ...categoria, orden }),
);

/** El tono menos usado: así una categoría nueva no repite color si puede evitarlo. */
export function colorSugerido(categorias: readonly Categoria[]): ColorCategoria {
  const usos = new Map<ColorCategoria, number>(COLORES_CATEGORIA.map((color) => [color, 0]));
  for (const categoria of categorias) {
    usos.set(categoria.color, (usos.get(categoria.color) ?? 0) + 1);
  }
  return [...usos.entries()].sort((a, b) => a[1] - b[1])[0][0];
}

export function totalPresupuestoMensual(categorias: readonly Categoria[]): Centavos {
  return sumar(categorias.map((categoria) => categoria.limiteMensualCentavos));
}

/**
 * El orden que queda al mover una categoría un lugar hacia arriba (`-1`) o
 * hacia abajo (`+1`). En los extremos no cambia nada.
 */
export function moverEnOrden(ids: readonly string[], id: string, direccion: -1 | 1): string[] {
  const resultado = [...ids];
  const desde = resultado.indexOf(id);
  const hasta = desde + direccion;
  if (desde < 0 || hasta < 0 || hasta >= resultado.length) return resultado;

  [resultado[desde], resultado[hasta]] = [resultado[hasta], resultado[desde]];
  return resultado;
}
