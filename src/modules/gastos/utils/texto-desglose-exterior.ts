import type { Centavos } from '@/lib/dinero';
import { formatMoneda } from '@/lib/format';

import { desglosarExterior } from './impuestos-exterior';

/** Lo que el banco suma a un consumo del exterior pagado con tarjeta, en una línea. */
export function textoDesgloseExterior(consumoCentavos: Centavos): string {
  const { iva, isd, cobrado } = desglosarExterior(consumoCentavos);
  return `+ IVA ${formatMoneda(iva)} · ISD ${formatMoneda(isd)} (vuelve mañana) · se cobran ${formatMoneda(cobrado)}`;
}
