import type { MetodoPagoId } from '@/constants/metodos-pago.constants';
import type { Centavos } from '@/lib/dinero';
import type { FechaIso } from '@/lib/fechas';
import type { Gasto } from '@/modules/gastos/gastos.types';
import type { GastosRepository } from '@/modules/gastos/services/gastos.repository';
import {
  registrarGasto,
  totalCobrado,
  type ReposRegistro,
} from '@/modules/gastos/services/registrar-gasto';

import type { MovimientoCuenta } from '../cuentas.types';
import type { MovimientosCuentaRepository } from './cuentas.repository';

export interface DatosRetiro {
  cuentaId: number;
  montoCentavos: Centavos;
  fecha: FechaIso;
  /**
   * Para qué se sacó. Con esto el retiro registra TAMBIÉN el gasto, en un
   * solo paso. Sin esto la plata sólo sale de la cuenta (o pasa a
   * `haciaCuentaId`).
   */
  gasto: { categoria: string; metodoPago: MetodoPagoId; descripcion: string | null } | null;
  /** Lo que se verá en el libro de la cuenta: "Transporte · Uber al trabajo". */
  nota: string | null;
  /** Transferencia a otra cuenta propia. No se combina con `gasto`. */
  haciaCuentaId: number | null;
  /** Por dónde entró el gasto. Por defecto, la app. */
  origen?: Gasto['origen'];
}

export interface ResultadoRetiro {
  retiro: MovimientoCuenta;
  gasto: Gasto | null;
}

type Repos = {
  gastos: GastosRepository;
  movimientosCuenta: MovimientosCuentaRepository;
  /** Para saber si la categoría es del exterior. Sin esto no se calculan impuestos. */
  categorias?: ReposRegistro['categorias'];
};

const SIN_CATEGORIAS: ReposRegistro['categorias'] = { listar: async () => [] };

/**
 * "Saqué $20 de la flexible para el Uber": baja el ahorro y deja el gasto
 * anotado, enlazados por `gastoId`.
 *
 * El gasto NO lleva cuenta: la plata ya salió con el retiro, y si además
 * descontara de una cuenta se restaría dos veces. Si es una app del exterior
 * pagada con tarjeta, el retiro vale lo que cobró el banco: consumo + IVA + ISD.
 *
 * Quien llama lo envuelve en una transacción (`Repositorios.transaccion`).
 */
export async function retirar(repos: Repos, datos: DatosRetiro): Promise<ResultadoRetiro> {
  if (!Number.isInteger(datos.montoCentavos) || datos.montoCentavos <= 0) {
    throw new Error('El importe tiene que ser mayor que cero.');
  }

  let gasto: Gasto | null = null;
  let montoRetiro = datos.montoCentavos;
  if (datos.gasto) {
    const registro = await registrarGasto(
      { gastos: repos.gastos, categorias: repos.categorias ?? SIN_CATEGORIAS },
      {
        montoCentavos: datos.montoCentavos,
        categoria: datos.gasto.categoria,
        metodoPago: datos.gasto.metodoPago,
        cuentaId: null,
        nota: datos.gasto.descripcion,
        fecha: datos.fecha,
        origen: datos.origen ?? 'app',
      },
    );
    gasto = registro.gasto;
    montoRetiro = totalCobrado(registro);
  }

  const retiro = await repos.movimientosCuenta.registrar({
    cuentaId: datos.cuentaId,
    contraparteId: gasto ? null : datos.haciaCuentaId,
    gastoId: gasto?.id ?? null,
    tipo: 'retiro',
    montoCentavos: montoRetiro,
    nota: datos.nota,
    fecha: datos.fecha,
  });

  return { retiro, gasto };
}

/**
 * Mantiene el retiro al día con su gasto: si el gasto cambia de importe o de
 * fecha, el retiro también; si el gasto se elimina (`cambios = null`), el
 * retiro se va con él. Sin retiro enlazado no hace nada.
 */
export async function sincronizarRetiroDeGasto(
  movimientosCuenta: MovimientosCuentaRepository,
  gastoId: number,
  cambios: { montoCentavos: Centavos; fecha: FechaIso } | null,
): Promise<void> {
  const retiro = await movimientosCuenta.buscarPorGasto(gastoId);
  if (!retiro) return;

  if (cambios === null) {
    await movimientosCuenta.eliminar(retiro.id);
    return;
  }
  await movimientosCuenta.actualizar(retiro.id, {
    montoCentavos: cambios.montoCentavos,
    nota: retiro.nota,
    fecha: cambios.fecha,
  });
}
