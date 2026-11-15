import type { MetodoPagoId } from '@/constants/metodos-pago.constants';
import type { Centavos } from '@/lib/dinero';
import type { FechaIso } from '@/lib/fechas';
import type { CategoriaId } from '@/modules/categorias/categorias.types';

/**
 * Por dónde entró el gasto: desde la app, desde el atajo de iPhone o desde un
 * pago con Apple Pay (la automatización de Wallet), o el cobro automático de
 * una suscripción.
 */
export type OrigenGasto = 'app' | 'atajo' | 'wallet' | 'suscripcion';

/**
 * Impuestos que el banco cobra aparte en un consumo del exterior: el IVA es
 * costo real; el ISD se devuelve días después.
 */
export type TipoImpuesto = 'iva' | 'isd';

export interface Gasto {
  id: number;
  montoCentavos: Centavos;
  categoria: CategoriaId;
  metodoPago: MetodoPagoId;
  /**
   * La cuenta de la que salió la plata. `null` si no tocó ninguna cuenta
   * (efectivo, crédito) o si el gasto es anterior a llevar cuentas.
   */
  cuentaId: number | null;
  /** Descripción libre: qué fue ("Almuerzo con Ana"). */
  nota: string | null;
  /** Día del gasto (no el instante): ver `lib/fechas.ts`. */
  fecha: FechaIso;
  /** Instante en que se registró, ISO. Ordena los gastos de un mismo día. */
  creadoEn: string;
  origen: OrigenGasto;
  /** Si es un impuesto, el consumo al que pertenece. Vive y muere con él. */
  gastoPadreId?: number | null;
  /** Qué impuesto es. Sin valor = un gasto normal. */
  impuesto?: TipoImpuesto | null;
}

export type NuevoGasto = Omit<Gasto, 'id' | 'creadoEn'>;

/** Gasto a medio llenar: lo que llega de un enlace incompleto del atajo. */
export interface BorradorGasto {
  montoCentavos?: Centavos;
  categoria?: CategoriaId;
  metodoPago?: MetodoPagoId;
  nota?: string;
  /** La cuenta de la que sale, si el enlace la dijo. */
  cuentaId?: number;
}

/** Lo que se puede corregir de un gasto ya registrado. El origen no cambia. */
export type CambiosGasto = Omit<NuevoGasto, 'origen' | 'gastoPadreId' | 'impuesto'>;
