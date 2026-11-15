import type { SQLiteDatabase } from 'expo-sqlite';

import { PLAN_INICIAL } from '@/constants/plan.constants';
import {
  sembrarCategorias,
  sembrarBilletera,
  sembrarCategoriasDelExterior,
  sembrarCuentas,
} from '@/lib/db/migraciones';

import type { DatosRepository } from './datos.repository';

export function crearDatosSqlite(db: SQLiteDatabase): DatosRepository {
  return {
    async borrarTodo() {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          DELETE FROM gastos;
          DELETE FROM ingresos;
          DELETE FROM movimientos_cuenta;
          DELETE FROM movimientos_ahorro;
          DELETE FROM tasas_cuenta;
          DELETE FROM cuentas;
          DELETE FROM categorias;
          DELETE FROM suscripciones;
        `);
        // Vuelven las categorías y las cuentas de partida.
        await sembrarCategorias(db);
        await sembrarCategoriasDelExterior(db);
        await sembrarCuentas(db);
        await sembrarBilletera(db);
        for (const [clave, valor] of Object.entries(PLAN_INICIAL)) {
          await db.runAsync(
            'INSERT OR REPLACE INTO plan (clave, valor) VALUES (?, ?)',
            clave,
            valor,
          );
        }
      });
    },
  };
}
