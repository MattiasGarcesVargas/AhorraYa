import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hoyIso } from '@/lib/fechas';
import { useRepositorios } from '@/providers/repositorios-context';

import type { DatosSuscripcion } from '../suscripciones.types';
import { cobradaHastaAlCrear, validarSuscripcion } from '../utils/validar-suscripcion';

export const CLAVE_SUSCRIPCIONES = ['suscripciones'] as const;

export function useSuscripciones() {
  const { suscripciones } = useRepositorios();
  return useQuery({ queryKey: CLAVE_SUSCRIPCIONES, queryFn: () => suscripciones.listar() });
}

export interface GuardarSuscripcion {
  /** Sin `id` se crea una nueva. */
  id?: number;
  datos: DatosSuscripcion;
  /** Sólo al crear, y sólo si hoy es el día de cobro: ¿se cobra también la de hoy? */
  cobrarHoy?: boolean;
}

/** Crea o corrige una suscripción. Una nueva nunca cobra hacia atrás. */
export function useGuardarSuscripcion() {
  const { suscripciones } = useRepositorios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, datos, cobrarHoy = false }: GuardarSuscripcion) => {
      const resultado = validarSuscripcion(datos);
      if (!resultado.ok) throw new Error(Object.values(resultado.errores).join(' '));

      if (id !== undefined) {
        await suscripciones.actualizar(id, resultado.datos);
        return id;
      }
      const cobradaHasta = cobradaHastaAlCrear(hoyIso(), cobrarHoy);
      return (await suscripciones.crear(resultado.datos, cobradaHasta)).id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_SUSCRIPCIONES }),
  });
}

/** Elimina la suscripción; los gastos que ya cobró se conservan. */
export function useEliminarSuscripcion() {
  const { suscripciones } = useRepositorios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => suscripciones.eliminar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_SUSCRIPCIONES }),
  });
}
