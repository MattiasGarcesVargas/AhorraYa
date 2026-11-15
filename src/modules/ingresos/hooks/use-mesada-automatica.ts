import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { hoyIso } from '@/lib/fechas';
import { useCuentas } from '@/modules/cuentas/hooks/use-cuentas';
import { cuentaPrincipal } from '@/modules/cuentas/utils/saldos';
import { usePlan } from '@/modules/plan/hooks/use-plan';
import { useRepositorios } from '@/providers/repositorios-context';

import { acreditarMesadas } from '../services/mesada-automatica';
import { CLAVE_INGRESOS } from './use-ingresos';

/**
 * Acredita la mesada de los lunes al abrir la app y cada vez que vuelve al
 * frente (por si quedó abierta de domingo a lunes). Va una sola vez, en la raíz.
 */
export function useMesadaAutomatica() {
  const { ingresos, transaccion } = useRepositorios();
  const queryClient = useQueryClient();
  const plan = usePlan().data;
  const cuentas = useCuentas().data;

  useEffect(() => {
    if (!plan || !cuentas) return;

    const acreditar = async () => {
      try {
        const anotadas = await transaccion(() =>
          acreditarMesadas(ingresos, {
            mesadaCentavos: plan.mesadaSemanalCentavos,
            cuentaId: cuentaPrincipal(cuentas, 'diaria')?.id ?? null,
            hoy: hoyIso(),
          }),
        );
        if (anotadas > 0) await queryClient.invalidateQueries({ queryKey: CLAVE_INGRESOS });
      } catch {
        /* Se reintenta la próxima vez que se abra la app: no debe impedir usarla. */
      }
    };

    void acreditar();
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void acreditar();
    });
    return () => suscripcion.remove();
  }, [plan, cuentas, ingresos, transaccion, queryClient]);
}
