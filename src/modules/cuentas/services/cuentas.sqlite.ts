import type { SQLiteDatabase } from 'expo-sqlite';

import type { BancoId } from '@/constants/bancos.constants';
import { ahoraIso, notaONulo } from '@/lib/db/base-de-datos';

import type {
  OrigenAporte,
  Cuenta,
  MovimientoCuenta,
  TasaCuenta,
  TipoCuenta,
  TipoMovimientoCuenta,
} from '../cuentas.types';
import type { CuentasRepository, MovimientosCuentaRepository } from './cuentas.repository';

interface FilaCuenta {
  id: number;
  banco: string;
  nombre: string;
  tipo: string;
  orden: number;
  creado_en: string;
}

function aCuenta(fila: FilaCuenta): Cuenta {
  return {
    id: fila.id,
    banco: fila.banco as BancoId,
    nombre: fila.nombre,
    tipo: fila.tipo as TipoCuenta,
    orden: fila.orden,
    creadoEn: fila.creado_en,
  };
}

export function crearCuentasSqlite(db: SQLiteDatabase): CuentasRepository {
  async function contarRegistros(id: number): Promise<number> {
    const fila = await db.getFirstAsync<{ total: number }>(
      `SELECT
         (SELECT COUNT(*) FROM movimientos_cuenta WHERE cuenta_id = ? OR contraparte_id = ?) +
         (SELECT COUNT(*) FROM gastos WHERE cuenta_id = ?) +
         (SELECT COUNT(*) FROM ingresos WHERE cuenta_id = ?) AS total`,
      id,
      id,
      id,
      id,
    );
    return fila?.total ?? 0;
  }

  return {
    async listar() {
      const filas = await db.getAllAsync<FilaCuenta>(
        'SELECT id, banco, nombre, tipo, orden, creado_en FROM cuentas ORDER BY orden, id',
      );
      return filas.map(aCuenta);
    },

    async crear(datos) {
      const creadoEn = ahoraIso();
      const fila = await db.getFirstAsync<{ siguiente: number }>(
        'SELECT COALESCE(MAX(orden), -1) + 1 AS siguiente FROM cuentas',
      );
      const orden = fila?.siguiente ?? 0;
      const { lastInsertRowId } = await db.runAsync(
        'INSERT INTO cuentas (banco, nombre, tipo, orden, creado_en) VALUES (?, ?, ?, ?, ?)',
        datos.banco,
        datos.nombre,
        datos.tipo,
        orden,
        creadoEn,
      );
      return { ...datos, id: lastInsertRowId, orden, creadoEn };
    },

    async actualizar(id, datos) {
      await db.runAsync(
        'UPDATE cuentas SET banco = ?, nombre = ?, tipo = ? WHERE id = ?',
        datos.banco,
        datos.nombre,
        datos.tipo,
        id,
      );
    },

    contarRegistros,

    async eliminar(id) {
      if ((await contarRegistros(id)) > 0) {
        throw new Error('La cuenta tiene movimientos: no se puede eliminar.');
      }
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM tasas_cuenta WHERE cuenta_id = ?', id);
        await db.runAsync('DELETE FROM cuentas WHERE id = ?', id);
      });
    },

    async listarTasas() {
      const filas = await db.getAllAsync<{ cuenta_id: number; desde: string; tasa_bp: number }>(
        'SELECT cuenta_id, desde, tasa_bp FROM tasas_cuenta ORDER BY cuenta_id, desde',
      );
      return filas.map((fila): TasaCuenta => ({
        cuentaId: fila.cuenta_id,
        desde: fila.desde,
        tasaBp: fila.tasa_bp,
      }));
    },

    async establecerTasa(cuentaId, desde, tasaBp) {
      await db.runAsync(
        'INSERT OR REPLACE INTO tasas_cuenta (cuenta_id, desde, tasa_bp) VALUES (?, ?, ?)',
        cuentaId,
        desde,
        tasaBp,
      );
    },
  };
}

interface FilaMovimiento {
  id: number;
  cuenta_id: number;
  contraparte_id: number | null;
  gasto_id: number | null;
  tipo: string;
  monto_centavos: number;
  nota: string | null;
  fecha: string;
  creado_en: string;
  origen: string | null;
}

const COLUMNAS =
  'id, cuenta_id, contraparte_id, gasto_id, tipo, monto_centavos, nota, fecha, creado_en, origen';

function aMovimiento(fila: FilaMovimiento): MovimientoCuenta {
  return {
    id: fila.id,
    cuentaId: fila.cuenta_id,
    contraparteId: fila.contraparte_id,
    gastoId: fila.gasto_id,
    tipo: fila.tipo as TipoMovimientoCuenta,
    montoCentavos: fila.monto_centavos,
    nota: fila.nota,
    fecha: fila.fecha,
    creadoEn: fila.creado_en,
    origen: fila.origen as OrigenAporte | null,
  };
}

export function crearMovimientosCuentaSqlite(db: SQLiteDatabase): MovimientosCuentaRepository {
  return {
    async registrar(movimiento) {
      const creadoEn = ahoraIso();
      const nota = notaONulo(movimiento.nota);
      const { lastInsertRowId } = await db.runAsync(
        `INSERT INTO movimientos_cuenta
           (cuenta_id, contraparte_id, gasto_id, tipo, monto_centavos, nota, fecha, creado_en,
            origen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        movimiento.cuentaId,
        movimiento.contraparteId,
        movimiento.gastoId,
        movimiento.tipo,
        movimiento.montoCentavos,
        nota,
        movimiento.fecha,
        creadoEn,
        movimiento.origen ?? null,
      );
      return { ...movimiento, nota, id: lastInsertRowId, creadoEn };
    },

    async obtener(id) {
      const fila = await db.getFirstAsync<FilaMovimiento>(
        `SELECT ${COLUMNAS} FROM movimientos_cuenta WHERE id = ?`,
        id,
      );
      return fila ? aMovimiento(fila) : null;
    },

    async actualizar(id, cambios) {
      await db.runAsync(
        // Sin `origen` en los cambios, se conserva el que tenía.
        `UPDATE movimientos_cuenta
         SET monto_centavos = ?, nota = ?, fecha = ?, origen = COALESCE(?, origen)
         WHERE id = ?`,
        cambios.montoCentavos,
        notaONulo(cambios.nota),
        cambios.fecha,
        cambios.origen ?? null,
        id,
      );
    },

    async eliminar(id) {
      await db.runAsync('DELETE FROM movimientos_cuenta WHERE id = ?', id);
    },

    async listarTodos() {
      const filas = await db.getAllAsync<FilaMovimiento>(
        `SELECT ${COLUMNAS} FROM movimientos_cuenta ORDER BY fecha DESC, creado_en DESC, id DESC`,
      );
      return filas.map(aMovimiento);
    },

    async establecerSaldoInicial(cuentaId, montoCentavos, fecha) {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          "DELETE FROM movimientos_cuenta WHERE tipo = 'inicial' AND cuenta_id = ?",
          cuentaId,
        );
        if (montoCentavos > 0) {
          await db.runAsync(
            `INSERT INTO movimientos_cuenta (cuenta_id, tipo, monto_centavos, nota, fecha, creado_en)
             VALUES (?, 'inicial', ?, 'Lo que ya tenía en la cuenta', ?, ?)`,
            cuentaId,
            montoCentavos,
            fecha,
            ahoraIso(),
          );
        }
      });
    },

    async buscarPorGasto(gastoId) {
      const fila = await db.getFirstAsync<FilaMovimiento>(
        `SELECT ${COLUMNAS} FROM movimientos_cuenta WHERE gasto_id = ? LIMIT 1`,
        gastoId,
      );
      return fila ? aMovimiento(fila) : null;
    },
  };
}
