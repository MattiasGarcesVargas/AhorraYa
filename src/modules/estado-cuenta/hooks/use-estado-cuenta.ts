import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';

import { hoyIso } from '@/lib/fechas';
import type { Periodo } from '@/lib/periodos';
import { useMovimientosAhorro } from '@/modules/ahorro/hooks/use-ahorro';
import { useCategorias } from '@/modules/categorias/hooks/use-categorias';
import { useGastosEntre } from '@/modules/gastos/hooks/use-gastos';
import { useIngresosEntre } from '@/modules/ingresos/hooks/use-ingresos';
import { usePlan } from '@/modules/plan/hooks/use-plan';

import type { EstadoCuenta } from '../estado-cuenta.types';
import { exportadorArchivos } from '../services/exportador-archivos';
import { construirEstadoCuenta, nombreArchivoEstadoCuenta } from '../utils/construir-estado-cuenta';
import { estadoCuentaCsv } from '../utils/estado-cuenta-csv';
import { estadoCuentaHtml } from '../utils/estado-cuenta-html';

/** Estado de cuenta de un mes, armado con los datos de los demás módulos. */
export function useEstadoCuenta(periodo: Periodo): { estado?: EstadoCuenta } {
  const gastos = useGastosEntre(periodo.inicio, periodo.fin);
  const ingresos = useIngresosEntre(periodo.inicio, periodo.fin);
  const ahorro = useMovimientosAhorro();
  const { catalogo } = useCategorias();
  const plan = usePlan();

  const estado = useMemo(() => {
    if (!gastos.data || !ingresos.data || !ahorro.data || !catalogo || !plan.data) return undefined;
    return construirEstadoCuenta({
      periodo,
      hoy: hoyIso(),
      gastos: gastos.data,
      ingresos: ingresos.data,
      movimientosAhorro: ahorro.data,
      categorias: catalogo,
      plan: plan.data,
    });
  }, [periodo, gastos.data, ingresos.data, ahorro.data, catalogo, plan.data]);

  return { estado };
}

export type FormatoEstadoCuenta = 'pdf' | 'csv';

export function useExportarEstadoCuenta() {
  return useMutation({
    mutationFn: async ({
      estado,
      formato,
    }: {
      estado: EstadoCuenta;
      formato: FormatoEstadoCuenta;
    }) => {
      const nombre = nombreArchivoEstadoCuenta(estado.periodo);
      if (formato === 'pdf')
        await exportadorArchivos.compartirPdf(estadoCuentaHtml(estado), nombre);
      else await exportadorArchivos.compartirCsv(estadoCuentaCsv(estado), nombre);
    },
  });
}
