import { useMemo } from 'react';

import type { Periodo } from '@/lib/periodos';
import { useCatalogoCategorias } from '@/modules/categorias/hooks/use-categorias';
import { useGastosEntre } from '@/modules/gastos/hooks/use-gastos';
import { useIngresosEntre } from '@/modules/ingresos/hooks/use-ingresos';

import { asientosDetallados, construirLibro, type Libro } from '../utils/libro';
import { useCuentas, useMovimientosCuenta, useSaldoCuenta } from './use-cuentas';

/** El debe y haber de una cuenta en un periodo, armado con lo de los demás módulos. */
export function useLibroCuenta(cuentaId: number, periodo: Periodo): Libro | undefined {
  const saldo = useSaldoCuenta(cuentaId);
  const cuentas = useCuentas().data;
  const movimientos = useMovimientosCuenta().data;
  const gastos = useGastosEntre(periodo.inicio, periodo.fin).data;
  const ingresos = useIngresosEntre(periodo.inicio, periodo.fin).data;
  const catalogo = useCatalogoCategorias();

  return useMemo(() => {
    if (!saldo || !cuentas || !movimientos || !gastos || !ingresos) return undefined;

    const asientos = asientosDetallados(
      cuentaId,
      { movimientos, gastos, ingresos },
      {
        categoria: (id) => catalogo.porId(id).nombre,
        cuenta: (id) => cuentas.find((cuenta) => cuenta.id === id)?.nombre ?? 'otra cuenta',
      },
    );
    return construirLibro(periodo, saldo.serie, asientos);
  }, [saldo, cuentas, movimientos, gastos, ingresos, catalogo, cuentaId, periodo]);
}
