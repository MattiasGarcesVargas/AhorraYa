import { Texto } from '@/components/ui';
import type { Centavos } from '@/lib/dinero';

import { textoDesgloseExterior } from '../utils/texto-desglose-exterior';

export interface DesgloseExteriorProps {
  /** El consumo, sin impuestos. */
  consumoCentavos: Centavos;
  className?: string;
}

/**
 * Aviso bajo el importe: cuánto IVA e ISD se suman y cuánto se cobra en total.
 * Quien lo muestra decide si aplica (`aplicaImpuestos`).
 */
export function DesgloseExterior({ consumoCentavos, className }: DesgloseExteriorProps) {
  if (consumoCentavos <= 0) return null;
  return (
    <Texto variante="detalle" tono="suave" numerico className={`text-center ${className ?? ''}`}>
      {textoDesgloseExterior(consumoCentavos)}
    </Texto>
  );
}
