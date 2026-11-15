import { useMemo, useState } from 'react';

import { hoyIso } from '@/lib/fechas';
import { desplazarPeriodo, periodoQueContiene, type TipoPeriodo } from '@/lib/periodos';

/**
 * Periodo que se está mirando: el tipo (quincena/mes) y cuántos pasos hacia
 * atrás. `desplazar(0)` vuelve al actual. No se permite ir al futuro: no hay
 * nada que ver ahí todavía.
 */
export function usePeriodoNavegable(tipo: TipoPeriodo) {
  const [desfase, setDesfase] = useState(0);
  const hoy = hoyIso();

  const periodo = useMemo(
    () => desplazarPeriodo(periodoQueContiene(tipo, hoy), desfase),
    [tipo, hoy, desfase],
  );

  const desplazar = (pasos: number) =>
    setDesfase((actual) => (pasos === 0 ? 0 : Math.min(0, actual + pasos)));

  return { periodo, esActual: desfase === 0, desplazar, reiniciar: () => setDesfase(0) };
}
