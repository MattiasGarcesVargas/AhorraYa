import { sumar, type Centavos } from '@/lib/dinero';
import { sumarDias } from '@/lib/fechas';
import type { CategoriasRepository } from '@/modules/categorias/services/categorias.repository';
import type { MovimientosCuentaRepository } from '@/modules/cuentas/services/cuentas.repository';
import { sincronizarRetiroDeGasto } from '@/modules/cuentas/services/retiro-con-gasto';
import type { IngresosRepository } from '@/modules/ingresos/services/ingresos.repository';

import { DIAS_PARA_DEVOLUCION_ISD } from '../constants/impuestos-exterior.constants';
import type { CambiosGasto, Gasto, NuevoGasto } from '../gastos.types';
import { validarNuevoGasto } from '../schema/gasto.schema';
import {
  aplicaImpuestos,
  cambiosImpuesto,
  impuestosDe,
  notaDevolucion,
} from '../utils/impuestos-exterior';
import type { GastosRepository } from './gastos.repository';

/** Lo que hace falta para registrar un gasto con sus impuestos. */
export interface ReposRegistro {
  gastos: GastosRepository;
  categorias: Pick<CategoriasRepository, 'listar'>;
}

/** Lo que hace falta para corregirlo o eliminarlo: también su devolución y su retiro. */
export interface ReposGasto extends ReposRegistro {
  ingresos: IngresosRepository;
  movimientosCuenta: MovimientosCuentaRepository;
}

export interface GastoRegistrado {
  gasto: Gasto;
  /** El IVA y el ISD que se crearon con él. Vacío si no es del exterior con tarjeta. */
  impuestos: Gasto[];
}

async function categoriaDe(repos: ReposRegistro, id: string) {
  return (await repos.categorias.listar()).find((categoria) => categoria.id === id);
}

/** Lo que el banco descontó en total: el consumo más sus impuestos. */
export function totalCobrado(registro: GastoRegistrado): Centavos {
  return registro.gasto.montoCentavos + sumar(registro.impuestos.map((g) => g.montoCentavos));
}

/**
 * ÚNICA puerta para crear un gasto, venga del formulario, del atajo, de Wallet,
 * de un retiro o de una suscripción. Si la categoría es del exterior y se pagó
 * con tarjeta, crea además el IVA y el ISD como gastos hijos.
 *
 * Quien llama lo envuelve en una transacción (`Repositorios.transaccion`).
 */
export async function registrarGasto(
  repos: ReposRegistro,
  nuevo: NuevoGasto,
): Promise<GastoRegistrado> {
  const gasto = await repos.gastos.registrar(validarNuevoGasto(nuevo));
  const categoria = await categoriaDe(repos, gasto.categoria);
  if (!aplicaImpuestos(categoria, gasto.metodoPago)) return { gasto, impuestos: [] };

  const impuestos: Gasto[] = [];
  for (const impuesto of impuestosDe(gasto, categoria?.nombre ?? '')) {
    impuestos.push(await repos.gastos.registrar(impuesto));
  }
  return { gasto, impuestos };
}

/** Borra un impuesto y, si ya se había registrado, la devolución de su ISD. */
async function eliminarImpuesto(repos: ReposGasto, impuesto: Gasto): Promise<void> {
  const devolucion = await repos.ingresos.buscarPorGasto(impuesto.id);
  if (devolucion) await repos.ingresos.eliminar(devolucion.id);
  await repos.gastos.eliminar(impuesto.id);
}

/**
 * Deja los impuestos al día con su consumo: los recalcula, los crea si ahora
 * aplican, o los borra si dejaron de aplicar (se cambió a efectivo, a otra
 * categoría…) o si el consumo se elimina (`padre = null`). La devolución de un
 * ISD ya devuelto se corrige o se borra con él.
 */
async function sincronizarImpuestos(
  repos: ReposGasto,
  gastoId: number,
  padre: Gasto | null,
): Promise<Gasto[]> {
  const hijos = await repos.gastos.listarHijos(gastoId);
  const categoria = padre ? await categoriaDe(repos, padre.categoria) : undefined;

  if (!padre || !aplicaImpuestos(categoria, padre.metodoPago)) {
    for (const hijo of hijos) await eliminarImpuesto(repos, hijo);
    return [];
  }

  const etiqueta = categoria?.nombre ?? '';
  const vigentes: Gasto[] = [];
  for (const deseado of impuestosDe(padre, etiqueta)) {
    const actual = hijos.find((hijo) => hijo.impuesto === deseado.impuesto);
    if (!actual) {
      vigentes.push(await repos.gastos.registrar(deseado));
      continue;
    }
    const cambios = cambiosImpuesto(padre, deseado.impuesto ?? 'iva', etiqueta);
    await repos.gastos.actualizar(actual.id, cambios);
    vigentes.push({ ...actual, ...cambios });

    const devolucion = await repos.ingresos.buscarPorGasto(actual.id);
    if (devolucion) {
      await repos.ingresos.actualizar(devolucion.id, {
        ...devolucion,
        montoCentavos: cambios.montoCentavos,
        fecha: sumarDias(cambios.fecha, DIAS_PARA_DEVOLUCION_ISD),
      });
    }
  }
  // Un impuesto que ya no corresponde (quedó en cero) se va.
  for (const hijo of hijos) {
    if (!vigentes.some((vigente) => vigente.id === hijo.id)) await eliminarImpuesto(repos, hijo);
  }
  return vigentes;
}

/**
 * Corrige un gasto y arrastra todo lo que cuelga de él: sus impuestos, la
 * devolución del ISD y, si nació de un retiro del ahorro, ese retiro (que vale
 * lo que el banco cobró: consumo + impuestos).
 */
export async function actualizarGasto(
  repos: ReposGasto,
  id: number,
  cambios: CambiosGasto,
): Promise<void> {
  const original = await repos.gastos.obtener(id);
  if (!original) throw new Error('Ese gasto ya no existe.');

  const { origen: _origen, gastoPadreId: _padre, impuesto: _impuesto, ...validos } =
    validarNuevoGasto({ ...cambios, origen: original.origen });
  await repos.gastos.actualizar(id, validos);

  const impuestos = await sincronizarImpuestos(repos, id, { ...original, ...validos });
  await sincronizarRetiroDeGasto(repos.movimientosCuenta, id, {
    montoCentavos: validos.montoCentavos + sumar(impuestos.map((g) => g.montoCentavos)),
    fecha: validos.fecha,
  });
}

/** Elimina un gasto con sus impuestos, su devolución y su retiro enlazado. */
export async function eliminarGasto(repos: ReposGasto, id: number): Promise<void> {
  // Borrar sólo un impuesto: se va con su devolución, sin tocar el consumo.
  const gasto = await repos.gastos.obtener(id);
  if (gasto?.gastoPadreId) {
    await eliminarImpuesto(repos, gasto);
    return;
  }
  await sincronizarImpuestos(repos, id, null);
  await sincronizarRetiroDeGasto(repos.movimientosCuenta, id, null);
  await repos.gastos.eliminar(id);
}

/**
 * Registra la devolución de cada ISD cuyo día ya pasó: un ingreso tipo
 * `reembolso`, al día siguiente del consumo, en la misma cuenta. Si el consumo
 * salió de un retiro del ahorro, vuelve a esa cuenta. No repite: el ingreso
 * queda enlazado al ISD. Devuelve cuántas registró.
 *
 * Quien llama lo envuelve en una transacción.
 */
export async function registrarDevolucionesIsd(repos: ReposGasto, hoy: string): Promise<number> {
  const pendientes = await repos.gastos.isdSinDevolver(hoy);
  if (pendientes.length === 0) return 0;

  const categorias = await repos.categorias.listar();
  for (const isd of pendientes) {
    const retiro =
      isd.cuentaId === null && isd.gastoPadreId
        ? await repos.movimientosCuenta.buscarPorGasto(isd.gastoPadreId)
        : null;
    const categoria = categorias.find((c) => c.id === isd.categoria);
    await repos.ingresos.registrar({
      montoCentavos: isd.montoCentavos,
      tipo: 'reembolso',
      cuentaId: isd.cuentaId ?? retiro?.cuentaId ?? null,
      nota: notaDevolucion(categoria?.nombre ?? 'consumo del exterior'),
      fecha: sumarDias(isd.fecha, DIAS_PARA_DEVOLUCION_ISD),
      gastoId: isd.id,
    });
  }
  return pendientes.length;
}
