import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { CLAVE_CUENTAS_RAIZ, CLAVE_INGRESOS_RAIZ } from '@/lib/claves-consulta';
import { hoyIso } from '@/lib/fechas';
import { useRepositorios } from '@/providers/repositorios-context';

import { registrarDevolucionesIsd } from '../services/registrar-gasto';

/**
 * Registra la devolución del ISD de los consumos del exterior cuyo día ya
 * llegó, al abrir la app y cada vez que vuelve al frente. Va una sola vez, en
 * la raíz.
 */
export function useDevolucionIsd() {
  const repos = useRepositorios();
  const queryClient = useQueryClient();

  useEffect(() => {
    const devolver = async () => {
      try {
        const registradas = await repos.transaccion(() =>
          registrarDevolucionesIsd(repos, hoyIso()),
        );
        if (registradas === 0) return;
        await queryClient.invalidateQueries({ queryKey: CLAVE_INGRESOS_RAIZ });
        await queryClient.invalidateQueries({ queryKey: CLAVE_CUENTAS_RAIZ });
      } catch {
        /* Se reintenta la próxima vez que se abra la app: no debe impedir usarla. */
      }
    };

    void devolver();
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void devolver();
    });
    return () => suscripcion.remove();
  }, [repos, queryClient]);
}
