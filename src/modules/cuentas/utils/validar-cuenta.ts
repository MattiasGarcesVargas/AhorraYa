import { esBancoId } from '@/constants/bancos.constants';
import { LARGO_MAXIMO_NOMBRE_CUENTA, TASA_MAXIMA_BP } from '@/constants/cuentas.constants';
import { normalizar } from '@/lib/texto';

import type { Cuenta, DatosCuenta } from '../cuentas.types';

export interface FormularioCuenta extends DatosCuenta {
  /** Tasa anual en puntos básicos. `null` si lo escrito no es un porcentaje. */
  tasaBp: number | null;
}

export type ErroresCuenta = Partial<Record<'nombre' | 'banco' | 'tasaBp', string>>;

export type ResultadoValidacionCuenta =
  { ok: true; datos: DatosCuenta; tasaBp: number } | { ok: false; errores: ErroresCuenta };

/**
 * Reglas de una cuenta. `existentes` son las que ya hay, para no repetir el
 * nombre dentro del mismo banco; `idActual` es la que se está editando.
 */
export function validarCuenta(
  formulario: FormularioCuenta,
  existentes: readonly Cuenta[],
  idActual?: number,
): ResultadoValidacionCuenta {
  const errores: ErroresCuenta = {};
  const nombre = formulario.nombre.trim().replace(/\s+/g, ' ');

  if (!esBancoId(formulario.banco)) errores.banco = 'Elige un banco.';

  if (nombre === '') errores.nombre = 'Ponle un nombre a la cuenta.';
  else if (nombre.length > LARGO_MAXIMO_NOMBRE_CUENTA)
    errores.nombre = `Máximo ${LARGO_MAXIMO_NOMBRE_CUENTA} letras.`;
  else if (
    existentes.some(
      (cuenta) =>
        cuenta.id !== idActual &&
        cuenta.banco === formulario.banco &&
        normalizar(cuenta.nombre) === normalizar(nombre),
    )
  )
    errores.nombre = 'Ya tienes una cuenta con ese nombre en ese banco.';

  // Sólo la flexible paga interés: en la del día a día la tasa no cuenta.
  const tasaBp = formulario.tipo === 'flexible' ? formulario.tasaBp : 0;
  if (tasaBp === null) errores.tasaBp = 'Escribe la tasa como un porcentaje, por ejemplo 5.';
  else if (tasaBp > TASA_MAXIMA_BP)
    errores.tasaBp = 'Esa tasa es demasiado alta. Revisa el número.';

  if (Object.keys(errores).length > 0 || tasaBp === null) return { ok: false, errores };
  return {
    ok: true,
    datos: { banco: formulario.banco, nombre, tipo: formulario.tipo },
    tasaBp,
  };
}

export class ErrorCuentaInvalida extends Error {
  constructor(readonly errores: ErroresCuenta) {
    super(Object.values(errores)[0] ?? 'La cuenta no es válida.');
    this.name = 'ErrorCuentaInvalida';
  }
}
