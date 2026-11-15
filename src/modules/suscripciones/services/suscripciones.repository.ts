import type { FechaIso } from '@/lib/fechas';

import type { DatosSuscripcion, Suscripcion } from '../suscripciones.types';

export interface SuscripcionesRepository {
  listar(): Promise<Suscripcion[]>;
  obtener(id: number): Promise<Suscripcion | null>;
  /** `cobradaHasta` define desde cuándo se cobra: nunca hacia atrás. */
  crear(datos: DatosSuscripcion, cobradaHasta: FechaIso): Promise<Suscripcion>;
  actualizar(id: number, datos: DatosSuscripcion): Promise<void>;
  eliminar(id: number): Promise<void>;
  marcarCobradaHasta(id: number, hasta: FechaIso): Promise<void>;
}
