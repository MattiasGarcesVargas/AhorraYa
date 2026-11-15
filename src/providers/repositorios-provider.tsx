import { useMemo, type ReactNode } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { crearDatosSqlite } from '@/modules/ajustes/services/datos.sqlite';
import { crearCategoriasSqlite } from '@/modules/categorias/services/categorias.sqlite';
import {
  crearCuentasSqlite,
  crearMovimientosCuentaSqlite,
} from '@/modules/cuentas/services/cuentas.sqlite';
import { crearGastosSqlite } from '@/modules/gastos/services/gastos.sqlite';
import { crearIngresosSqlite } from '@/modules/ingresos/services/ingresos.sqlite';
import { crearPlanSqlite } from '@/modules/plan/services/plan.sqlite';
import { crearSuscripcionesSqlite } from '@/modules/suscripciones/services/suscripciones.sqlite';

import { RepositoriosContext, type Repositorios } from './repositorios-context';

/**
 * Raíz de composición: el ÚNICO lugar que sabe que los datos viven en SQLite.
 * Debe ir dentro de `SQLiteProvider`, que abre la base y corre las migraciones
 * antes de pintar a sus hijos.
 */
export function RepositoriosProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();

  const repositorios = useMemo<Repositorios>(() => {
    // Un objeto, no una variable suelta: lo que cambia es su contenido.
    const cola: { ultima: Promise<unknown> } = { ultima: Promise.resolve() };
    return {
      gastos: crearGastosSqlite(db),
      ingresos: crearIngresosSqlite(db),
      cuentas: crearCuentasSqlite(db),
      movimientosCuenta: crearMovimientosCuentaSqlite(db),
      categorias: crearCategoriasSqlite(db),
      plan: crearPlanSqlite(db),
      datos: crearDatosSqlite(db),
      suscripciones: crearSuscripcionesSqlite(db),
      transaccion<T>(tarea: () => Promise<T>): Promise<T> {
        // De a una: SQLite no admite una transacción dentro de otra, y al abrir
        // la app varias tareas automáticas (mesada, suscripciones, devolución
        // del ISD) piden la suya casi a la vez.
        const turno = cola.ultima.then(async () => {
          let resultado!: T;
          await db.withTransactionAsync(async () => {
            resultado = await tarea();
          });
          return resultado;
        });
        cola.ultima = turno.catch(() => undefined);
        return turno;
      },
    };
  }, [db]);

  return (
    <RepositoriosContext.Provider value={repositorios}>{children}</RepositoriosContext.Provider>
  );
}
