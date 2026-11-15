import type { DatosSuscripcion } from '../suscripciones.types';
import { validarSuscripcion } from '../utils/validar-suscripcion';

const VALIDA: DatosSuscripcion = {
  nombre: '  Claude ',
  montoCentavos: 2_000,
  categoria: 'ocio',
  metodoPago: 'debito',
  cuentaId: null,
  diaCobro: 17,
  activa: true,
};

describe('validar suscripción', () => {
  it('acepta una válida y limpia el nombre', () => {
    const r = validarSuscripcion(VALIDA);
    expect(r.ok && r.datos.nombre).toBe('Claude');
  });

  it('exige nombre, monto mayor a cero y día de 1 a 31', () => {
    for (const mala of [
      { nombre: '  ' },
      { montoCentavos: 0 },
      { diaCobro: 0 },
      { diaCobro: 32 },
      { diaCobro: 1.5 },
      { categoria: '' },
    ]) {
      expect(validarSuscripcion({ ...VALIDA, ...mala }).ok).toBe(false);
    }
    expect(validarSuscripcion({ ...VALIDA, diaCobro: 31 }).ok).toBe(true);
    expect(validarSuscripcion({ ...VALIDA, diaCobro: 1 }).ok).toBe(true);
  });
});
