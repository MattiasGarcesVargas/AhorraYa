import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { CLAVE_GASTOS } from '@/modules/gastos/hooks/use-gastos';
import { useRepositorios } from '@/providers/repositorios-context';

import type { CatalogoCategorias, CategoriaId, DatosCategoria } from '../categorias.types';
import { CATALOGO_VACIO, crearCatalogo, moverEnOrden } from '../utils/catalogo';
import {
  ErrorCategoriaInvalida,
  nuevoIdCategoria,
  validarCategoria,
} from '../utils/validar-categoria';

export const CLAVE_CATEGORIAS = ['categorias'] as const;

export function useCategorias() {
  const { categorias } = useRepositorios();
  const consulta = useQuery({ queryKey: CLAVE_CATEGORIAS, queryFn: () => categorias.listar() });

  const catalogo = useMemo(
    () => (consulta.data ? crearCatalogo(consulta.data) : undefined),
    [consulta.data],
  );

  return { catalogo, categorias: catalogo?.lista, cargando: catalogo === undefined };
}

/**
 * Para lo que sólo MUESTRA categorías: mientras carga devuelve un catálogo
 * vacío (todo se ve como "Sin categoría" un instante) en vez de obligar a
 * cada componente a esperar.
 */
export function useCatalogoCategorias(): CatalogoCategorias {
  return useCategorias().catalogo ?? CATALOGO_VACIO;
}

function useInvalidarCategorias() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CLAVE_CATEGORIAS });
}

/** Crea (sin `id`) o actualiza (con `id`). Devuelve el id guardado. */
export function useGuardarCategoria() {
  const { categorias } = useRepositorios();
  const invalidar = useInvalidarCategorias();

  return useMutation({
    mutationFn: async ({ id, datos }: { id?: CategoriaId; datos: DatosCategoria }) => {
      // Se valida contra lo que hay en la base AHORA, no contra lo que tenía la pantalla.
      const resultado = validarCategoria(datos, await categorias.listar(), id);
      if (!resultado.ok) throw new ErrorCategoriaInvalida(resultado.errores);

      if (id) {
        await categorias.actualizar(id, resultado.datos);
        return id;
      }
      return (await categorias.crear(nuevoIdCategoria(), resultado.datos)).id;
    },
    onSuccess: invalidar,
  });
}

export function useEliminarCategoria() {
  const { categorias } = useRepositorios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, moverGastosA }: { id: CategoriaId; moverGastosA: CategoriaId | null }) =>
      categorias.eliminar(id, moverGastosA),
    // Cambian las categorías y, si se movieron gastos, también los gastos.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CATEGORIAS });
      await queryClient.invalidateQueries({ queryKey: CLAVE_GASTOS });
    },
  });
}

export function useMoverCategoria() {
  const { categorias } = useRepositorios();
  const invalidar = useInvalidarCategorias();

  return useMutation({
    mutationFn: async ({ id, direccion }: { id: CategoriaId; direccion: -1 | 1 }) => {
      const ids = (await categorias.listar()).map((categoria) => categoria.id);
      await categorias.reordenar(moverEnOrden(ids, id, direccion));
    },
    onSuccess: invalidar,
  });
}

/** Cuántos gastos tiene una categoría. Cuelga de la clave de gastos: registrar uno lo actualiza. */
export function useCantidadGastos(id: CategoriaId | undefined) {
  const { categorias } = useRepositorios();
  return useQuery({
    queryKey: [...CLAVE_GASTOS, 'por-categoria', id],
    queryFn: () => categorias.contarGastos(id as CategoriaId),
    enabled: id !== undefined,
  });
}
