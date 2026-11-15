import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { CLAVE_CUENTAS_RAIZ } from '@/lib/claves-consulta';
import { hoyIso } from '@/lib/fechas';
import { CLAVE_GASTOS } from '@/modules/gastos/hooks/use-gastos';
import { useRepositorios } from '@/providers/repositorios-context';

import { cobrarSuscripciones } from '../services/cobro-automatico';
import { CLAVE_SUSCRIPCIONES } from './use-suscripciones';

/**
 * Cobra las suscripciones cuyo día ya llegó al abrir la app y cada vez que
 * vuelve al frente (por si quedó abierta de un día al otro). Va una sola vez,
 * en la raíz.
 */
export function useCobroSuscripciones() {
  const { suscripciones, gastos, categorias, transaccion } = useRepositorios();
  const queryClient = useQueryClient();

  useEffect(() => {
    const cobrar = async () => {
      try {
        const cobros = await transaccion(() =>
          cobrarSuscripciones({ suscripciones, gastos, categorias }, hoyIso()),
        );
        if (cobros > 0) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: CLAVE_GASTOS }),
            queryClient.invalidateQueries({ queryKey: CLAVE_CUENTAS_RAIZ }),
            queryClient.invalidateQueries({ queryKey: CLAVE_SUSCRIPCIONES }),
          ]);
        }
      } catch {
        /* Se reintenta la próxima vez que se abra la app: no debe impedir usarla. */
      }
    };

    void cobrar();
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void cobrar();
    });
    return () => suscripcion.remove();
  }, [suscripciones, gastos, categorias, transaccion, queryClient]);
}
