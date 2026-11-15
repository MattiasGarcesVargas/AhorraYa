import type { MovimientosCuentaRepository } from '@/modules/cuentas/services/cuentas.repository';
import { retirar } from '@/modules/cuentas/services/retiro-con-gasto';
import type { NuevoGasto } from '@/modules/gastos/gastos.types';
import { validarNuevoGasto } from '@/modules/gastos/schema/gasto.schema';
import {
  registrarGasto,
  type GastoRegistrado,
  type ReposRegistro,
} from '@/modules/gastos/services/registrar-gasto';

/**
 * Si el mismo gasto (importe, categoría y forma de pago) ya se registró en
 * esta ventana, se considera el mismo. Cubre que iOS reabra el enlace al
 * volver a la app o que el atajo se dispare dos veces con un doble toque de
 * más; dos cafés idénticos en 30 segundos son mucho menos probables.
 */
export const VENTANA_DUPLICADO_MS = 30_000;

export interface ResultadoRegistro extends GastoRegistrado {
  /** `true` si no se creó nada porque ya existía. */
  duplicado: boolean;
}

/** Con `movimientosCuenta` se puede registrar un pago que sale de una cuenta de ahorro. */
export interface ReposEnlace extends ReposRegistro {
  movimientosCuenta?: MovimientosCuentaRepository;
}

/**
 * Caso de uso del atajo. Recibe los repositorios por parámetro (no los
 * importa) para poder probarlo con unos en memoria. Los impuestos de una app
 * del exterior los pone `registrarGasto`; un enlace repetido no los duplica
 * porque el consumo ya existe.
 */
export async function registrarSinDuplicar(
  repos: ReposEnlace,
  nuevo: NuevoGasto,
  ahora: Date = new Date(),
  opciones: { saleDelAhorro?: boolean } = {},
): Promise<ResultadoRegistro> {
  const valido = validarNuevoGasto(nuevo);
  const desde = new Date(ahora.getTime() - VENTANA_DUPLICADO_MS).toISOString();

  const existente = await repos.gastos.buscarIgualDesde(valido, desde);
  if (existente) {
    return {
      gasto: existente,
      impuestos: await repos.gastos.listarHijos(existente.id),
      duplicado: true,
    };
  }

  // Pagado desde una cuenta de ahorro: es un retiro que deja el gasto anotado,
  // para que la meta vea que esa plata salió del ahorro.
  if (opciones.saleDelAhorro && valido.cuentaId !== null && repos.movimientosCuenta) {
    const { gasto } = await retirar(
      { ...repos, movimientosCuenta: repos.movimientosCuenta },
      {
        cuentaId: valido.cuentaId,
        montoCentavos: valido.montoCentavos,
        fecha: valido.fecha,
        gasto: {
          categoria: valido.categoria,
          metodoPago: valido.metodoPago,
          descripcion: valido.nota,
        },
        nota: valido.nota,
        haciaCuentaId: null,
        origen: valido.origen,
      },
    );
    if (!gasto) throw new Error('No se pudo registrar el gasto.');
    return { gasto, impuestos: await repos.gastos.listarHijos(gasto.id), duplicado: false };
  }
  return { ...(await registrarGasto(repos, valido)), duplicado: false };
}
