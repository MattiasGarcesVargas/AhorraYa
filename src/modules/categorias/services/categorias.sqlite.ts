import type { SQLiteDatabase } from 'expo-sqlite';

import type { ColorCategoria, NombreIcono } from '@/constants/categorias.constants';
import { ahoraIso } from '@/lib/db/base-de-datos';

import type { Categoria } from '../categorias.types';
import type { CategoriasRepository } from './categorias.repository';

interface FilaCategoria {
  id: string;
  nombre: string;
  icono: string;
  color: string;
  orden: number;
  limite_mensual_centavos: number;
  del_exterior: number;
}

function aCategoria(fila: FilaCategoria): Categoria {
  return {
    id: fila.id,
    nombre: fila.nombre,
    icono: fila.icono as NombreIcono,
    color: fila.color as ColorCategoria,
    orden: fila.orden,
    limiteMensualCentavos: fila.limite_mensual_centavos,
    delExterior: fila.del_exterior === 1,
  };
}

export function crearCategoriasSqlite(db: SQLiteDatabase): CategoriasRepository {
  return {
    async listar() {
      const filas = await db.getAllAsync<FilaCategoria>(
        `SELECT id, nombre, icono, color, orden, limite_mensual_centavos, del_exterior
         FROM categorias ORDER BY orden, creado_en`,
      );
      return filas.map(aCategoria);
    },

    async crear(id, datos) {
      const fila = await db.getFirstAsync<{ siguiente: number }>(
        'SELECT COALESCE(MAX(orden), -1) + 1 AS siguiente FROM categorias',
      );
      const orden = fila?.siguiente ?? 0;
      await db.runAsync(
        `INSERT INTO categorias 
           (id, nombre, icono, color, orden, limite_mensual_centavos, del_exterior, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        datos.nombre,
        datos.icono,
        datos.color,
        orden,
        datos.limiteMensualCentavos,
        datos.delExterior ? 1 : 0,
        ahoraIso(),
      );
      return { id, orden, ...datos };
    },

    async actualizar(id, datos) {
      await db.runAsync(
        `UPDATE categorias
         SET nombre = ?, icono = ?, color = ?, limite_mensual_centavos = ?, del_exterior = ?
         WHERE id = ?`,
        datos.nombre,
        datos.icono,
        datos.color,
        datos.limiteMensualCentavos,
        datos.delExterior ? 1 : 0,
        id,
      );
    },

    async reordenar(ids) {
      await db.withTransactionAsync(async () => {
        for (const [orden, id] of ids.entries()) {
          await db.runAsync('UPDATE categorias SET orden = ? WHERE id = ?', orden, id);
        }
      });
    },

    async contarGastos(id) {
      const fila = await db.getFirstAsync<{ cantidad: number }>(
        'SELECT COUNT(*) AS cantidad FROM gastos WHERE categoria = ?',
        id,
      );
      return fila?.cantidad ?? 0;
    },

    async eliminar(id, moverGastosA) {
      await db.withTransactionAsync(async () => {
        if (moverGastosA) {
          await db.runAsync(
            'UPDATE gastos SET categoria = ? WHERE categoria = ?',
            moverGastosA,
            id,
          );
        } else {
          // Última defensa: sin destino, una categoría con gastos no se borra.
          const fila = await db.getFirstAsync<{ cantidad: number }>(
            'SELECT COUNT(*) AS cantidad FROM gastos WHERE categoria = ?',
            id,
          );
          if ((fila?.cantidad ?? 0) > 0) {
            throw new Error('La categoría tiene gastos: elige a dónde moverlos.');
          }
        }
        await db.runAsync('DELETE FROM categorias WHERE id = ?', id);
      });
    },
  };
}
