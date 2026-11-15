import type { MetodoPagoId } from '@/constants/metodos-pago.constants';
import type { Centavos } from '@/lib/dinero';
import type { FechaIso } from '@/lib/fechas';
import type { CategoriaId } from '@/modules/categorias/categorias.types';

/** Lo que una persona define de una suscripción. */
export interface DatosSuscripcion {
  nombre: string;
  /** Lo que cuesta cada mes, ANTES de impuestos (el consumo). */
  montoCentavos: Centavos;
  categoria: CategoriaId;
  metodoPago: MetodoPagoId;
  /** La cuenta de la que sale. Sólo cuenta con débito o transferencia. */
  cuentaId: number | null;
  /** Día del mes en que se cobra (1 a 31; en meses cortos, el último día). */
  diaCobro: number;
  /** Pausada = no se cobra, pero se conserva. */
  activa: boolean;
}

export interface Suscripcion extends DatosSuscripcion {
  id: number;
  /** Último día hasta el que ya se atendieron los cobros (inclusive). */
  cobradaHasta: FechaIso;
  creadoEn: string;
}
