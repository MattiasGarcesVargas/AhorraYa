import type { SQLiteDatabase } from 'expo-sqlite';

import { PLAN_INICIAL } from '@/constants/plan.constants';

import { COBROS_POR_MES_INICIAL, type Plan } from '../plan.types';
import type { PlanRepository } from './plan.repository';

export function crearPlanSqlite(db: SQLiteDatabase): PlanRepository {
  return {
    async obtener() {
      const filas = await db.getAllAsync<{ clave: string; valor: number }>(
        'SELECT clave, valor FROM plan',
      );
      const guardado = Object.fromEntries(filas.map((fila) => [fila.clave, fila.valor]));
      // Lo que falte (una clave nueva en una versión futura) toma el valor inicial.
      const plan = { ...PLAN_INICIAL, ...guardado } as Plan;
      // La tabla guarda enteros: cualquier cosa que no sea 1 se lee como quincenal.
      return { ...plan, cobrosPorMes: plan.cobrosPorMes === 1 ? 1 : COBROS_POR_MES_INICIAL };
    },

    async actualizar(cambios) {
      const filas = Object.entries(cambios).filter(
        (fila): fila is [string, number] => fila[1] !== undefined,
      );
      if (filas.length === 0) return;
      // Una sola sentencia: o se guardan todos los campos o ninguno.
      await db.runAsync(
        `INSERT INTO plan (clave, valor) VALUES ${filas.map(() => '(?, ?)').join(', ')}
         ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
        filas.flat(),
      );
    },
  };
}
