import type { SQLiteDatabase } from 'expo-sqlite';

import type { MetodoPagoId } from '@/constants/metodos-pago.constants';
import { ahoraIso, notaONulo } from '@/lib/db/base-de-datos';
import type { TotalDiarioCuenta } from '@/modules/cuentas/cuentas.types';

import type { Gasto, NuevoGasto, OrigenGasto, TipoImpuesto } from '../gastos.types';
import type { GastosRepository } from './gastos.repository';

interface FilaGasto {
  id: number;
  monto_centavos: number;
  categoria: string;
  metodo_pago: string;
  cuenta_id: number | null;
  nota: string | null;
  fecha: string;
  creado_en: string;
  origen: string;
  gasto_padre_id: number | null;
  impuesto: string | null;
}

const COLUMNAS =
  'id, monto_centavos, categoria, metodo_pago, cuenta_id, nota, fecha, creado_en, origen, gasto_padre_id, impuesto';

function aGasto(fila: FilaGasto): Gasto {
  return {
    id: fila.id,
    montoCentavos: fila.monto_centavos,
    categoria: fila.categoria,
    metodoPago: fila.metodo_pago as MetodoPagoId,
    cuentaId: fila.cuenta_id,
    nota: fila.nota,
    fecha: fila.fecha,
    creadoEn: fila.creado_en,
    origen: fila.origen as OrigenGasto,
    gastoPadreId: fila.gasto_padre_id,
    impuesto: fila.impuesto as TipoImpuesto | null,
  };
}

export function crearGastosSqlite(db: SQLiteDatabase): GastosRepository {
  return {
    async registrar(gasto) {
      const creadoEn = ahoraIso();
      const nota = notaONulo(gasto.nota);
      const { lastInsertRowId } = await db.runAsync(
        `INSERT INTO gastos
           (monto_centavos, categoria, metodo_pago, cuenta_id, nota, fecha, creado_en, origen,
            gasto_padre_id, impuesto)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        gasto.montoCentavos,
        gasto.categoria,
        gasto.metodoPago,
        gasto.cuentaId,
        nota,
        gasto.fecha,
        creadoEn,
        gasto.origen,
        gasto.gastoPadreId ?? null,
        gasto.impuesto ?? null,
      );
      return { ...gasto, nota, id: lastInsertRowId, creadoEn };
    },

    async obtener(id) {
      const fila = await db.getFirstAsync<FilaGasto>(
        `SELECT ${COLUMNAS} FROM gastos WHERE id = ?`,
        id,
      );
      return fila ? aGasto(fila) : null;
    },

    async actualizar(id, cambios) {
      await db.runAsync(
        `UPDATE gastos
         SET monto_centavos = ?, categoria = ?, metodo_pago = ?, cuenta_id = ?, nota = ?, fecha = ?
         WHERE id = ?`,
        cambios.montoCentavos,
        cambios.categoria,
        cambios.metodoPago,
        cambios.cuentaId,
        notaONulo(cambios.nota),
        cambios.fecha,
        id,
      );
    },

    async eliminar(id) {
      await db.runAsync('DELETE FROM gastos WHERE id = ?', id);
    },

    async listarHijos(padreId) {
      const filas = await db.getAllAsync<FilaGasto>(
        `SELECT ${COLUMNAS} FROM gastos WHERE gasto_padre_id = ? ORDER BY id`,
        padreId,
      );
      return filas.map(aGasto);
    },

    async isdSinDevolver(antesDe) {
      const filas = await db.getAllAsync<FilaGasto>(
        `SELECT ${COLUMNAS} FROM gastos
         WHERE impuesto = 'isd' AND fecha < ?
           AND NOT EXISTS (SELECT 1 FROM ingresos WHERE ingresos.gasto_id = gastos.id)
         ORDER BY fecha, id`,
        antesDe,
      );
      return filas.map(aGasto);
    },

    async listarEntre(desde, hasta) {
      const filas = await db.getAllAsync<FilaGasto>(
        `SELECT ${COLUMNAS} FROM gastos
         WHERE fecha BETWEEN ? AND ?
         ORDER BY fecha DESC, creado_en DESC`,
        desde,
        hasta,
      );
      return filas.map(aGasto);
    },

    async buscarIgualDesde(gasto: NuevoGasto, desdeInstante: string) {
      const fila = await db.getFirstAsync<FilaGasto>(
        `SELECT ${COLUMNAS} FROM gastos
         WHERE monto_centavos = ? AND categoria = ? AND metodo_pago = ? AND creado_en >= ?
           AND gasto_padre_id IS NULL
         ORDER BY creado_en DESC LIMIT 1`,
        gasto.montoCentavos,
        gasto.categoria,
        gasto.metodoPago,
        desdeInstante,
      );
      return fila ? aGasto(fila) : null;
    },

    async totalesPorCuenta() {
      const filas = await db.getAllAsync<{ cuenta_id: number; fecha: string; total: number }>(
        `SELECT cuenta_id, fecha, SUM(monto_centavos) AS total FROM gastos
         WHERE cuenta_id IS NOT NULL GROUP BY cuenta_id, fecha`,
      );
      return filas.map((fila): TotalDiarioCuenta => ({
        cuentaId: fila.cuenta_id,
        fecha: fila.fecha,
        totalCentavos: fila.total,
      }));
    },
  };
}
