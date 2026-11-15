import type { MetodoPagoId } from '@/constants/metodos-pago.constants';
import { porcionBp, type Centavos } from '@/lib/dinero';
import type { Categoria } from '@/modules/categorias/categorias.types';

import {
  ISD_BP,
  IVA_EXTERIOR_BP,
  METODOS_CON_IMPUESTOS,
} from '../constants/impuestos-exterior.constants';
import type { CambiosGasto, Gasto, NuevoGasto, TipoImpuesto } from '../gastos.types';

/** ¿Este pago lleva IVA e ISD? Categoría del exterior Y pagada con tarjeta. */
export function aplicaImpuestos(
  categoria: Pick<Categoria, 'delExterior'> | undefined,
  metodoPago: MetodoPagoId,
): boolean {
  return categoria?.delExterior === true && METODOS_CON_IMPUESTOS.includes(metodoPago);
}

export interface DesgloseExterior {
  consumo: Centavos;
  iva: Centavos;
  isd: Centavos;
  /** Lo que el banco descuenta al momento: consumo + IVA + ISD. */
  cobrado: Centavos;
  /** Lo que cuesta de verdad cuando vuelve el ISD: consumo + IVA. */
  costoReal: Centavos;
}

/** Cada impuesto se calcula sobre el consumo y se redondea por separado, como el banco. */
export function desglosarExterior(consumo: Centavos): DesgloseExterior {
  const iva = porcionBp(consumo, IVA_EXTERIOR_BP);
  const isd = porcionBp(consumo, ISD_BP);
  return { consumo, iva, isd, cobrado: consumo + iva + isd, costoReal: consumo + iva };
}

/**
 * Al revés: de lo que cobró el banco, cuánto fue el consumo. Sirve cuando se
 * corrige el total de un retiro que ya llevaba impuestos.
 */
export function consumoDeCobrado(cobrado: Centavos): Centavos {
  const estimado = Math.round((cobrado * 10_000) / (10_000 + IVA_EXTERIOR_BP + ISD_BP));
  // Los redondeos de cada impuesto pueden mover un centavo: se busca el
  // consumo vecino que dé exactamente ese total.
  const exacto = [estimado, estimado - 1, estimado + 1].find(
    (consumo) => consumo > 0 && desglosarExterior(consumo).cobrado === cobrado,
  );
  return exacto ?? estimado;
}

const porcentaje = (bp: number) => `${bp / 100} %`;

export function notaImpuesto(impuesto: TipoImpuesto, etiqueta: string): string {
  return impuesto === 'iva'
    ? `IVA ${porcentaje(IVA_EXTERIOR_BP)} · ${etiqueta}`
    : `ISD ${porcentaje(ISD_BP)} · ${etiqueta} (se devuelve)`;
}

export function notaDevolucion(etiqueta: string): string {
  return `Devolución ISD · ${etiqueta}`;
}

/** Lo que cambia en un impuesto cuando cambia su consumo. */
export function cambiosImpuesto(
  padre: CambiosGasto,
  impuesto: TipoImpuesto,
  etiqueta: string,
): CambiosGasto {
  const desglose = desglosarExterior(padre.montoCentavos);
  return {
    montoCentavos: impuesto === 'iva' ? desglose.iva : desglose.isd,
    categoria: padre.categoria,
    metodoPago: padre.metodoPago,
    cuentaId: padre.cuentaId,
    nota: notaImpuesto(impuesto, etiqueta),
    fecha: padre.fecha,
  };
}

const IMPUESTOS: readonly TipoImpuesto[] = ['iva', 'isd'];

/**
 * Los dos gastos que acompañan a un consumo del exterior. Heredan categoría,
 * forma de pago, cuenta y fecha. Un impuesto de menos de un centavo no se crea.
 */
export function impuestosDe(padre: Gasto, etiqueta: string): NuevoGasto[] {
  return IMPUESTOS.map(
    (impuesto): NuevoGasto => ({
      ...cambiosImpuesto(padre, impuesto, etiqueta),
      origen: padre.origen,
      gastoPadreId: padre.id,
      impuesto,
    }),
  ).filter((gasto) => gasto.montoCentavos > 0);
}

/** El ISD va y vuelve: mueve el saldo de la cuenta pero no es gasto del presupuesto. */
export function cuentaEnPresupuesto(gasto: Pick<Gasto, 'impuesto'>): boolean {
  return gasto.impuesto !== 'isd';
}
