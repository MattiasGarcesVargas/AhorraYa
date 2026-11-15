import type { SQLiteDatabase } from 'expo-sqlite';

import { hoyIso } from '@/lib/fechas';

import type { MetodoPagoId } from '@/constants/metodos-pago.constants';
import { ahoraIso } from '@/lib/db/base-de-datos';

import type { DatosSuscripcion, Suscripcion } from '../suscripciones.types';
import type { SuscripcionesRepository } from './suscripciones.repository';

interface FilaSuscripcion {
  id: number;
  nombre: string;
  monto_centavos: number;
  categoria: string;
  metodo_pago: string;
  cuenta_id: number | null;
  dia_cobro: number;
  activa: number;
  cobrada_hasta: string;
  creado_en: string;
}

const COLUMNAS =
  'id, nombre, monto_centavos, categoria, metodo_pago, cuenta_id, dia_cobro, activa, cobrada_hasta, creado_en';

function aSuscripcion(fila: FilaSuscripcion): Suscripcion {
  return {
    id: fila.id,
    nombre: fila.nombre,
    montoCentavos: fila.monto_centavos,
    categoria: fila.categoria,
    metodoPago: fila.metodo_pago as MetodoPagoId,
    cuentaId: fila.cuenta_id,
    diaCobro: fila.dia_cobro,
    activa: fila.activa === 1,
    cobradaHasta: fila.cobrada_hasta,
    creadoEn: fila.creado_en,
  };
}

export function crearSuscripcionesSqlite(db: SQLiteDatabase): SuscripcionesRepository {
  return {
    async listar() {
      const filas = await db.getAllAsync<FilaSuscripcion>(
        `SELECT ${COLUMNAS} FROM suscripciones ORDER BY dia_cobro, nombre COLLATE NOCASE, id`,
      );
      return filas.map(aSuscripcion);
    },

    async obtener(id) {
      const fila = await db.getFirstAsync<FilaSuscripcion>(
        `SELECT ${COLUMNAS} FROM suscripciones WHERE id = ?`,
        id,
      );
      return fila ? aSuscripcion(fila) : null;
    },

    async crear(datos, cobradaHasta) {
      const creadoEn = ahoraIso();
      const resultado = await db.runAsync(
        `INSERT INTO suscripciones
           (nombre, monto_centavos, categoria, metodo_pago, cuenta_id, dia_cobro, activa, cobrada_hasta, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        datos.nombre,
        datos.montoCentavos,
        datos.categoria,
        datos.metodoPago,
        datos.cuentaId,
        datos.diaCobro,
        datos.activa ? 1 : 0,
        cobradaHasta,
        creadoEn,
      );
      return { ...datos, id: resultado.lastInsertRowId, cobradaHasta, creadoEn };
    },

    async actualizar(id, datos: DatosSuscripcion) {
      await db.runAsync(
        `UPDATE suscripciones
         SET nombre = ?, monto_centavos = ?, categoria = ?, metodo_pago = ?, cuenta_id = ?,
             dia_cobro = ?, activa = ?,
             -- Al reactivar una pausada no se cobran los meses que estuvo en pausa.
             cobrada_hasta = CASE WHEN activa = 0 AND ? = 1 THEN ? ELSE cobrada_hasta END
         WHERE id = ?`,
        datos.nombre,
        datos.montoCentavos,
        datos.categoria,
        datos.metodoPago,
        datos.cuentaId,
        datos.diaCobro,
        datos.activa ? 1 : 0,
        datos.activa ? 1 : 0,
        hoyIso(),
        id,
      );
    },

    async eliminar(id) {
      await db.runAsync('DELETE FROM suscripciones WHERE id = ?', id);
    },

    async marcarCobradaHasta(id, hasta) {
      await db.runAsync('UPDATE suscripciones SET cobrada_hasta = ? WHERE id = ?', hasta, id);
    },
  };
}
