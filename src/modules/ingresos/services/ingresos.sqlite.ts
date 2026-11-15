import type { SQLiteDatabase } from 'expo-sqlite';

import { ahoraIso, notaONulo } from '@/lib/db/base-de-datos';
import type { TotalDiarioCuenta } from '@/modules/cuentas/cuentas.types';

import type { Ingreso, TipoIngreso } from '../ingresos.types';
import type { IngresosRepository } from './ingresos.repository';

interface FilaIngreso {
  id: number;
  monto_centavos: number;
  tipo: string;
  cuenta_id: number | null;
  nota: string | null;
  fecha: string;
  creado_en: string;
  gasto_id: number | null;
}

const COLUMNAS = 'id, monto_centavos, tipo, cuenta_id, nota, fecha, creado_en, gasto_id';

function aIngreso(fila: FilaIngreso): Ingreso {
  return {
    id: fila.id,
    montoCentavos: fila.monto_centavos,
    tipo: fila.tipo as TipoIngreso,
    cuentaId: fila.cuenta_id,
    nota: fila.nota,
    fecha: fila.fecha,
    creadoEn: fila.creado_en,
    gastoId: fila.gasto_id,
  };
}

export function crearIngresosSqlite(db: SQLiteDatabase): IngresosRepository {
  return {
    async registrar(ingreso) {
      const creadoEn = ahoraIso();
      const nota = notaONulo(ingreso.nota);
      const { lastInsertRowId } = await db.runAsync(
        `INSERT INTO ingresos (monto_centavos, tipo, cuenta_id, nota, fecha, creado_en, gasto_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ingreso.montoCentavos,
        ingreso.tipo,
        ingreso.cuentaId,
        nota,
        ingreso.fecha,
        creadoEn,
        ingreso.gastoId ?? null,
      );
      return { ...ingreso, nota, id: lastInsertRowId, creadoEn };
    },

    async obtener(id) {
      const fila = await db.getFirstAsync<FilaIngreso>(
        `SELECT ${COLUMNAS} FROM ingresos WHERE id = ?`,
        id,
      );
      return fila ? aIngreso(fila) : null;
    },

    async actualizar(id, cambios) {
      await db.runAsync(
        `UPDATE ingresos SET monto_centavos = ?, tipo = ?, cuenta_id = ?, nota = ?, fecha = ?
         WHERE id = ?`,
        cambios.montoCentavos,
        cambios.tipo,
        cambios.cuentaId,
        notaONulo(cambios.nota),
        cambios.fecha,
        id,
      );
    },

    async eliminar(id) {
      await db.runAsync('DELETE FROM ingresos WHERE id = ?', id);
    },

    async buscarPorGasto(gastoId) {
      const fila = await db.getFirstAsync<FilaIngreso>(
        `SELECT ${COLUMNAS} FROM ingresos WHERE gasto_id = ? LIMIT 1`,
        gastoId,
      );
      return fila ? aIngreso(fila) : null;
    },

    async listarEntre(desde, hasta) {
      const filas = await db.getAllAsync<FilaIngreso>(
        `SELECT ${COLUMNAS} FROM ingresos
         WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC, creado_en DESC`,
        desde,
        hasta,
      );
      return filas.map(aIngreso);
    },

    async totalesPorCuenta() {
      const filas = await db.getAllAsync<{ cuenta_id: number; fecha: string; total: number }>(
        `SELECT cuenta_id, fecha, SUM(monto_centavos) AS total FROM ingresos
         WHERE cuenta_id IS NOT NULL GROUP BY cuenta_id, fecha`,
      );
      return filas.map((fila): TotalDiarioCuenta => ({
        cuentaId: fila.cuenta_id,
        fecha: fila.fecha,
        totalCentavos: fila.total,
      }));
    },

    async mesadaAcreditadaHasta() {
      const fila = await db.getFirstAsync<{ valor: string }>(
        "SELECT valor FROM marcas WHERE clave = 'mesada_acreditada_hasta'",
      );
      return fila?.valor ?? null;
    },

    async marcarMesadaAcreditada(hasta) {
      await db.runAsync(
        "INSERT OR REPLACE INTO marcas (clave, valor) VALUES ('mesada_acreditada_hasta', ?)",
        hasta,
      );
    },
  };
}
