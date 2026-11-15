import { createContext, useContext } from 'react';

import type { DatosRepository } from '@/modules/ajustes/services/datos.repository';
import type { CategoriasRepository } from '@/modules/categorias/services/categorias.repository';
import type {
  CuentasRepository,
  MovimientosCuentaRepository,
} from '@/modules/cuentas/services/cuentas.repository';
import type { GastosRepository } from '@/modules/gastos/services/gastos.repository';
import type { IngresosRepository } from '@/modules/ingresos/services/ingresos.repository';
import type { PlanRepository } from '@/modules/plan/services/plan.repository';
import type { SuscripcionesRepository } from '@/modules/suscripciones/services/suscripciones.repository';

/**
 * Inversión de dependencias: los hooks de cada módulo piden un repositorio
 * por su INTERFAZ, nunca por su implementación. La implementación real
 * (SQLite) la decide `RepositoriosProvider`; un test podría montar el mismo
 * árbol con repositorios en memoria sin tocar una sola pantalla.
 *
 * Este archivo sólo importa TIPOS de los módulos, así que no crea ciclos.
 */
export interface Repositorios {
  gastos: GastosRepository;
  ingresos: IngresosRepository;
  cuentas: CuentasRepository;
  movimientosCuenta: MovimientosCuentaRepository;
  categorias: CategoriasRepository;
  plan: PlanRepository;
  datos: DatosRepository;
  suscripciones: SuscripcionesRepository;
  /**
   * Corre `tarea` como una sola operación: o se guarda todo o no se guarda
   * nada. Para casos de uso que escriben en más de un repositorio (un retiro
   * con su gasto, un ingreso con su aporte).
   */
  transaccion<T>(tarea: () => Promise<T>): Promise<T>;
}

export const RepositoriosContext = createContext<Repositorios | null>(null);

export function useRepositorios(): Repositorios {
  const repositorios = useContext(RepositoriosContext);
  if (!repositorios) {
    throw new Error('useRepositorios debe usarse dentro de <RepositoriosProvider>.');
  }
  return repositorios;
}
