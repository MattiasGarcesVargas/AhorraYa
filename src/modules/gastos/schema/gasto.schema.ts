import { z } from 'zod';

import { IDS_METODOS_PAGO } from '@/constants/metodos-pago.constants';
import { MAXIMO_CENTAVOS } from '@/lib/dinero';
import { esFechaIso } from '@/lib/fechas';

import type { NuevoGasto } from '../gastos.types';

export const LARGO_MAXIMO_NOTA = 120;

/**
 * Última línea de defensa antes de escribir en la base: todo gasto, venga del
 * formulario o del atajo, pasa por aquí.
 */
export const nuevoGastoSchema = z.object({
  montoCentavos: z
    .number()
    .int('El importe debe estar en centavos enteros.')
    .positive('El importe tiene que ser mayor que cero.')
    .max(MAXIMO_CENTAVOS, 'Ese importe es demasiado alto.'),
  // Las categorías las crea la persona: aquí sólo se exige que haya una. Que
  // exista lo garantiza quien la eligió (el selector o el catálogo del atajo).
  categoria: z.string().trim().min(1, 'Elige una categoría.'),
  metodoPago: z.enum(IDS_METODOS_PAGO),
  cuentaId: z.number().int().positive().nullable(),
  nota: z
    .string()
    .trim()
    .max(LARGO_MAXIMO_NOTA)
    .nullable()
    .transform((nota) => (nota ? nota : null)),
  fecha: z.string().refine(esFechaIso, 'Fecha inválida.'),
  origen: z.enum(['app', 'atajo', 'wallet', 'suscripcion']),
  gastoPadreId: z.number().int().positive().nullable().optional(),
  impuesto: z.enum(['iva', 'isd']).nullable().optional(),
}) satisfies z.ZodType<NuevoGasto, unknown>;

export function validarNuevoGasto(datos: NuevoGasto): NuevoGasto {
  return nuevoGastoSchema.parse(datos);
}
