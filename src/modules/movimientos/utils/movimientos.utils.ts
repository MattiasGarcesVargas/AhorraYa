import { metodoPagoPorId } from '@/constants/metodos-pago.constants';
import { formatDiaRelativo, type FechaIso } from '@/lib/fechas';
import type { CatalogoCategorias } from '@/modules/categorias/categorias.types';
import type { Cuenta, MovimientoCuenta } from '@/modules/cuentas/cuentas.types';
import type { Gasto } from '@/modules/gastos/gastos.types';
import { tipoIngresoPorId, type Ingreso } from '@/modules/ingresos/ingresos.types';

import type { FiltroMovimientos, GrupoDia, Movimiento } from '../movimientos.types';

export interface OpcionesGasto {
  /** El gasto nació de un retiro del ahorro: van enlazados. */
  delAhorro?: boolean;
}

export function desdeGasto(
  gasto: Gasto,
  categorias: CatalogoCategorias,
  { delAhorro = false }: OpcionesGasto = {},
): Movimiento {
  const categoria = categorias.porId(gasto.categoria);
  const metodo = [
    metodoPagoPorId(gasto.metodoPago).nombre,
    gasto.origen === 'wallet' ? 'Apple Pay' : null,
    delAhorro ? 'del ahorro' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    clave: `gasto-${gasto.id}`,
    tipo: 'gasto',
    id: gasto.id,
    fecha: gasto.fecha,
    creadoEn: gasto.creadoEn,
    // Con nota, la nota dice más que la categoría ("Almuerzo con Ana").
    titulo: gasto.nota ?? categoria.nombre,
    detalle: gasto.nota ? `${categoria.nombre} · ${metodo}` : metodo,
    icono: categoria.icono,
    color: categoria.color,
    importe: -gasto.montoCentavos,
    tono: 'normal',
    gastoPadreId: gasto.gastoPadreId ?? undefined,
    avisoEliminar: delAhorro ? 'También se elimina el retiro del ahorro que lo pagó.' : undefined,
  };
}

export function desdeIngreso(ingreso: Ingreso): Movimiento {
  const tipo = tipoIngresoPorId(ingreso.tipo);
  return {
    clave: `ingreso-${ingreso.id}`,
    tipo: 'ingreso',
    id: ingreso.id,
    fecha: ingreso.fecha,
    creadoEn: ingreso.creadoEn,
    titulo: ingreso.nota ?? tipo.nombre,
    detalle: ingreso.nota ? `Ingreso · ${tipo.nombre}` : 'Ingreso',
    icono: tipo.icono,
    color: 'primario',
    importe: ingreso.montoCentavos,
    tono: 'positivo',
  };
}

const TEXTOS_CUENTA = {
  inicial: { ahorro: 'Saldo inicial', diaria: 'Saldo inicial', icono: 'flag-outline' },
  aporte: { ahorro: 'Aporte al ahorro', diaria: 'Depósito', icono: 'arrow-down-circle-outline' },
  retiro: { ahorro: 'Retiro del ahorro', diaria: 'Retiro', icono: 'arrow-up-circle-outline' },
  ajuste: {
    ahorro: 'Ajuste con el banco',
    diaria: 'Ajuste con el banco',
    icono: 'swap-vertical-outline',
  },
} as const;

/** Transferencia entre cuentas propias: "De X a Y". El importe sigue el signo del movimiento. */
function desdeTransferencia(
  movimiento: MovimientoCuenta & { contraparteId: number },
  cuentas?: ReadonlyMap<number, Pick<Cuenta, 'nombre'>>,
): Movimiento {
  const nombre = (id: number) => cuentas?.get(id)?.nombre ?? 'otra cuenta';
  // El retiro sale de su cuenta hacia la contraparte; el aporte, al revés.
  const [origen, destino] =
    movimiento.tipo === 'retiro'
      ? [movimiento.cuentaId, movimiento.contraparteId]
      : [movimiento.contraparteId, movimiento.cuentaId];
  const importe =
    movimiento.tipo === 'retiro' ? -movimiento.montoCentavos : movimiento.montoCentavos;
  return {
    clave: `ahorro-${movimiento.id}`,
    tipo: 'ahorro',
    id: movimiento.id,
    fecha: movimiento.fecha,
    creadoEn: movimiento.creadoEn,
    titulo: 'Transferencia',
    detalle: [`De ${nombre(origen)} a ${nombre(destino)}`, movimiento.nota]
      .filter(Boolean)
      .join(' · '),
    icono: 'swap-horizontal-outline',
    color: 'tinta',
    importe,
    tono: importe < 0 ? 'normal' : 'positivo',
  };
}

/**
 * Un movimiento de cuenta (aporte, retiro, saldo inicial, ajuste) como fila de
 * la lista. `cuenta` es la suya: decide si se llama "Aporte al ahorro" o
 * "Depósito" y aparece en el detalle.
 */
export function desdeMovimientoCuenta(
  movimiento: MovimientoCuenta,
  cuenta?: Pick<Cuenta, 'nombre' | 'tipo'>,
  cuentas?: ReadonlyMap<number, Pick<Cuenta, 'nombre'>>,
): Movimiento {
  if (movimiento.contraparteId !== null) {
    return desdeTransferencia({ ...movimiento, contraparteId: movimiento.contraparteId }, cuentas);
  }
  const textos = TEXTOS_CUENTA[movimiento.tipo];
  const importe =
    movimiento.tipo === 'retiro' ? -movimiento.montoCentavos : movimiento.montoCentavos;
  return {
    clave: `ahorro-${movimiento.id}`,
    tipo: 'ahorro',
    id: movimiento.id,
    fecha: movimiento.fecha,
    creadoEn: movimiento.creadoEn,
    titulo: cuenta?.tipo === 'flexible' ? textos.ahorro : textos.diaria,
    detalle: [movimiento.nota, cuenta?.nombre].filter(Boolean).join(' · ') || 'Ahorro',
    icono: textos.icono,
    color: 'tinta',
    importe,
    tono: importe < 0 ? 'normal' : 'positivo',
    avisoEliminar:
      movimiento.gastoId !== null
        ? 'También se elimina el gasto que se registró con este retiro.'
        : undefined,
  };
}

export function filtrar(
  movimientos: readonly Movimiento[],
  filtro: FiltroMovimientos,
): Movimiento[] {
  return filtro === 'todos' ? [...movimientos] : movimientos.filter((m) => m.tipo === filtro);
}

/** Agrupa por día, del más reciente al más antiguo, y dentro del día por hora de registro. */
export function agruparPorDia(movimientos: readonly Movimiento[], hoy?: FechaIso): GrupoDia[] {
  const ordenados = [...movimientos].sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn),
  );

  const grupos: GrupoDia[] = [];
  for (const movimiento of ordenados) {
    let grupo = grupos[grupos.length - 1];
    if (!grupo || grupo.fecha !== movimiento.fecha) {
      grupo = {
        fecha: movimiento.fecha,
        titulo: formatDiaRelativo(movimiento.fecha, hoy),
        gastadoDelDia: 0,
        data: [],
      };
      grupos.push(grupo);
    }
    grupo.data.push(movimiento);
    if (movimiento.tipo === 'gasto') grupo.gastadoDelDia += -movimiento.importe;
  }
  return grupos;
}
