import type { SQLiteDatabase } from 'expo-sqlite';

import { CATEGORIAS_DEL_EXTERIOR, CATEGORIAS_INICIALES } from '@/constants/categorias.constants';
import { CUENTAS_INICIALES } from '@/constants/cuentas.constants';
import { PLAN_INICIAL, PRESUPUESTO_INICIAL } from '@/constants/plan.constants';
import { hoyIso } from '@/lib/fechas';

/** Inserta las categorías de partida. Lo usan la migración 2 y "Borrar todos los datos". */
export async function sembrarCategorias(
  db: SQLiteDatabase,
  limites: Readonly<Record<string, number>> = {},
): Promise<void> {
  const ahora = new Date().toISOString();
  for (const [orden, categoria] of CATEGORIAS_INICIALES.entries()) {
    await db.runAsync(
      `INSERT OR IGNORE INTO categorias (id, nombre, icono, color, orden, limite_mensual_centavos, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      categoria.id,
      categoria.nombre,
      categoria.icono,
      categoria.color,
      orden,
      limites[categoria.id] ?? categoria.limiteMensualCentavos,
      ahora,
    );
  }
}

/**
 * Deja listas las categorías de apps del exterior (Uber, Suscripciones). Si la
 * persona ya creó una con ese nombre, sólo la marca; si no, la crea al final.
 * Lo usan la migración 5 y "Borrar todos los datos".
 */
export async function sembrarCategoriasDelExterior(db: SQLiteDatabase): Promise<void> {
  const ahora = new Date().toISOString();
  for (const categoria of CATEGORIAS_DEL_EXTERIOR) {
    const { changes } = await db.runAsync(
      'UPDATE categorias SET del_exterior = 1 WHERE id = ? OR lower(nombre) = lower(?)',
      categoria.id,
      categoria.nombre,
    );
    if (changes > 0) continue;
    await db.runAsync(
      `INSERT INTO categorias
         (id, nombre, icono, color, orden, limite_mensual_centavos, del_exterior, creado_en)
       VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(orden), -1) + 1 FROM categorias), 0, 1, ?)`,
      categoria.id,
      categoria.nombre,
      categoria.icono,
      categoria.color,
      ahora,
    );
  }
}

/**
 * Inserta las cuentas de partida, con su tasa de interés vigente desde hoy.
 * Lo usan la migración 3 y "Borrar todos los datos". Devuelve el id de la
 * cuenta flexible (la de ahorro), que es a donde va el ahorro ya registrado.
 */
export async function sembrarCuentas(db: SQLiteDatabase): Promise<number | null> {
  const ahora = new Date().toISOString();
  const hoy = hoyIso();
  let flexible: number | null = null;

  for (const [orden, cuenta] of CUENTAS_INICIALES.entries()) {
    const { lastInsertRowId } = await db.runAsync(
      'INSERT INTO cuentas (banco, nombre, tipo, orden, creado_en) VALUES (?, ?, ?, ?, ?)',
      cuenta.banco,
      cuenta.nombre,
      cuenta.tipo,
      orden,
      ahora,
    );
    if (cuenta.tasaBp > 0) {
      await db.runAsync(
        'INSERT INTO tasas_cuenta (cuenta_id, desde, tasa_bp) VALUES (?, ?, ?)',
        lastInsertRowId,
        hoy,
        cuenta.tasaBp,
      );
    }
    if (cuenta.tipo === 'flexible' && flexible === null) flexible = lastInsertRowId;
  }
  return flexible;
}

/**
 * Esquema de la base local, por versiones.
 *
 * NUNCA se edita una migración ya publicada: el teléfono que ya la corrió no
 * la volvería a correr. Un cambio de esquema es una migración NUEVA al final
 * de la lista; `PRAGMA user_version` recuerda hasta cuál se aplicó.
 */
interface Migracion {
  version: number;
  aplicar: (db: SQLiteDatabase) => Promise<void>;
}

const MIGRACIONES: Migracion[] = [
  {
    version: 1,
    aplicar: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS gastos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          monto_centavos INTEGER NOT NULL CHECK (monto_centavos > 0),
          categoria TEXT NOT NULL,
          metodo_pago TEXT NOT NULL,
          nota TEXT,
          fecha TEXT NOT NULL,
          creado_en TEXT NOT NULL,
          origen TEXT NOT NULL DEFAULT 'app'
        );
        CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos (fecha);

        CREATE TABLE IF NOT EXISTS ingresos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          monto_centavos INTEGER NOT NULL CHECK (monto_centavos > 0),
          tipo TEXT NOT NULL,
          nota TEXT,
          fecha TEXT NOT NULL,
          creado_en TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_ingresos_fecha ON ingresos (fecha);

        CREATE TABLE IF NOT EXISTS movimientos_ahorro (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          monto_centavos INTEGER NOT NULL CHECK (monto_centavos > 0),
          tipo TEXT NOT NULL CHECK (tipo IN ('inicial', 'aporte', 'retiro')),
          nota TEXT,
          fecha TEXT NOT NULL,
          creado_en TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_ahorro_fecha ON movimientos_ahorro (fecha);

        CREATE TABLE IF NOT EXISTS presupuesto (
          categoria TEXT PRIMARY KEY NOT NULL,
          limite_mensual_centavos INTEGER NOT NULL CHECK (limite_mensual_centavos >= 0)
        );

        CREATE TABLE IF NOT EXISTS plan (
          clave TEXT PRIMARY KEY NOT NULL,
          valor INTEGER NOT NULL
        );
      `);

      // Se siembra con parámetros, no interpolando: execAsync no escapa nada.
      for (const [categoria, limite] of Object.entries(PRESUPUESTO_INICIAL)) {
        await db.runAsync(
          'INSERT OR IGNORE INTO presupuesto (categoria, limite_mensual_centavos) VALUES (?, ?)',
          categoria,
          limite,
        );
      }
      for (const [clave, valor] of Object.entries(PLAN_INICIAL)) {
        await db.runAsync('INSERT OR IGNORE INTO plan (clave, valor) VALUES (?, ?)', clave, valor);
      }
    },
  },
  {
    /**
     * Las categorías pasan de estar fijas en el código a la base, para poder
     * crearlas, editarlas y eliminarlas desde la app. El límite mensual vive
     * ahora en la propia categoría: se copia el que hubiera en `presupuesto`
     * (por si ya lo habías cambiado) y esa tabla se elimina.
     */
    version: 2,
    aplicar: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS categorias (
          id TEXT PRIMARY KEY NOT NULL,
          nombre TEXT NOT NULL,
          icono TEXT NOT NULL,
          color TEXT NOT NULL,
          orden INTEGER NOT NULL,
          limite_mensual_centavos INTEGER NOT NULL DEFAULT 0 CHECK (limite_mensual_centavos >= 0),
          creado_en TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos (categoria);
      `);

      const filas = await db.getAllAsync<{ categoria: string; limite_mensual_centavos: number }>(
        'SELECT categoria, limite_mensual_centavos FROM presupuesto',
      );
      const limites = Object.fromEntries(
        filas.map((f) => [f.categoria, f.limite_mensual_centavos]),
      );
      await sembrarCategorias(db, limites);

      await db.execAsync('DROP TABLE IF EXISTS presupuesto;');
    },
  },
  {
    /**
     * Cuentas bancarias. El ahorro deja de ser un número suelto: la plata vive
     * en cuentas (la del día a día y la flexible, que paga interés) y cada
     * movimiento dice de cuál sale y a cuál entra.
     *
     * Esta migración sólo AGREGA. Los movimientos de ahorro se copian a
     * `movimientos_cuenta` (colgados de la cuenta flexible) y la tabla vieja
     * `movimientos_ahorro` queda intacta como respaldo. Los gastos e ingresos
     * anteriores quedan sin cuenta: son historia, no mueven saldos.
     */
    version: 3,
    aplicar: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS cuentas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          banco TEXT NOT NULL,
          nombre TEXT NOT NULL,
          tipo TEXT NOT NULL CHECK (tipo IN ('diaria', 'flexible')),
          orden INTEGER NOT NULL,
          creado_en TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tasas_cuenta (
          cuenta_id INTEGER NOT NULL,
          desde TEXT NOT NULL,
          tasa_bp INTEGER NOT NULL CHECK (tasa_bp >= 0),
          PRIMARY KEY (cuenta_id, desde)
        );

        CREATE TABLE IF NOT EXISTS movimientos_cuenta (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cuenta_id INTEGER NOT NULL,
          contraparte_id INTEGER,
          gasto_id INTEGER,
          tipo TEXT NOT NULL CHECK (tipo IN ('inicial', 'aporte', 'retiro', 'ajuste')),
          monto_centavos INTEGER NOT NULL
            CHECK (monto_centavos <> 0 AND (monto_centavos > 0 OR tipo = 'ajuste')),
          nota TEXT,
          fecha TEXT NOT NULL,
          creado_en TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_mov_cuenta_fecha ON movimientos_cuenta (fecha);
        CREATE INDEX IF NOT EXISTS idx_mov_cuenta_cuenta ON movimientos_cuenta (cuenta_id);
        CREATE INDEX IF NOT EXISTS idx_mov_cuenta_gasto ON movimientos_cuenta (gasto_id);

        ALTER TABLE gastos ADD COLUMN cuenta_id INTEGER;
        ALTER TABLE ingresos ADD COLUMN cuenta_id INTEGER;
      `);

      const flexible = await sembrarCuentas(db);
      if (flexible !== null) {
        await db.runAsync(
          `INSERT INTO movimientos_cuenta (id, cuenta_id, tipo, monto_centavos, nota, fecha, creado_en)
           SELECT id, ?, tipo, monto_centavos, nota, fecha, creado_en FROM movimientos_ahorro`,
          flexible,
        );
      }
    },
  },
  {
    /**
     * Marcas sueltas de la app (clave → texto). La primera: hasta qué día ya
     * se acreditó la mesada automática de los lunes. Arranca HOY, así que
     * sólo se acreditan los lunes que vengan, no los pasados.
     */
    version: 4,
    aplicar: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS marcas (
          clave TEXT PRIMARY KEY NOT NULL,
          valor TEXT NOT NULL
        );
      `);
      await db.runAsync(
        "INSERT OR IGNORE INTO marcas (clave, valor) VALUES ('mesada_acreditada_hasta', ?)",
        hoyIso(),
      );
    },
  },
  {
    /**
     * Impuestos de apps del exterior, suscripciones y origen del aporte.
     *
     * - `categorias.del_exterior`: al pagarla con tarjeta se cobran IVA e ISD.
     * - `gastos.gasto_padre_id` + `impuesto`: el IVA y el ISD son gastos hijos
     *   del consumo. `ingresos.gasto_id`: la devolución apunta a su ISD.
     * - `movimientos_cuenta.origen`: si el aporte salió del sueldo o fue un
     *   extra (NULL = sueldo, que es como se contaba hasta ahora).
     * - `suscripciones`: cobros que se repiten un día fijo de cada mes.
     */
    version: 5,
    aplicar: async (db) => {
      await db.execAsync(`
        ALTER TABLE categorias ADD COLUMN del_exterior INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE gastos ADD COLUMN gasto_padre_id INTEGER;
        ALTER TABLE gastos ADD COLUMN impuesto TEXT;
        ALTER TABLE ingresos ADD COLUMN gasto_id INTEGER;
        ALTER TABLE movimientos_cuenta ADD COLUMN origen TEXT;

        CREATE INDEX IF NOT EXISTS idx_gastos_padre ON gastos (gasto_padre_id);
        CREATE INDEX IF NOT EXISTS idx_ingresos_gasto ON ingresos (gasto_id);

        CREATE TABLE IF NOT EXISTS suscripciones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          monto_centavos INTEGER NOT NULL CHECK (monto_centavos > 0),
          categoria TEXT NOT NULL,
          metodo_pago TEXT NOT NULL,
          cuenta_id INTEGER,
          dia_cobro INTEGER NOT NULL CHECK (dia_cobro BETWEEN 1 AND 31),
          activa INTEGER NOT NULL DEFAULT 1,
          cobrada_hasta TEXT NOT NULL,
          creado_en TEXT NOT NULL
        );
      `);
      await sembrarCategoriasDelExterior(db);
    },
  },
];

export const VERSION_ACTUAL = MIGRACIONES[MIGRACIONES.length - 1].version;

export async function migrar(db: SQLiteDatabase): Promise<void> {
  try {
    // WAL: escrituras más rápidas y lecturas sin bloqueo. El backend web
    // (alpha) puede no soportarlo; ahí se sigue con el modo por defecto.
    await db.execAsync('PRAGMA journal_mode = WAL;');
  } catch {
    /* modo de diario por defecto */
  }

  const fila = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const versionAplicada = fila?.user_version ?? 0;

  for (const migracion of MIGRACIONES) {
    if (migracion.version <= versionAplicada) continue;

    await db.withTransactionAsync(async () => {
      await migracion.aplicar(db);
      // PRAGMA no admite parámetros; la versión es un entero nuestro, no input.
      await db.execAsync(`PRAGMA user_version = ${migracion.version}`);
    });
  }
}
