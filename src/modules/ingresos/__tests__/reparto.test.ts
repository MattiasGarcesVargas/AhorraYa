import { repartir } from '../utils/reparto';

describe('repartir un ingreso', () => {
  it('con el plan aparta el aporte y deja el resto para gastar', () => {
    expect(repartir(35_000, 'plan', 25_000)).toEqual({ alAhorro: 25_000, paraGastar: 10_000 });
  });

  it('puede mandar todo al ahorro o no apartar nada', () => {
    expect(repartir(8_000, 'todo', 25_000)).toEqual({ alAhorro: 8_000, paraGastar: 0 });
    expect(repartir(3_000, 'nada', 25_000)).toEqual({ alAhorro: 0, paraGastar: 3_000 });
  });

  it('nunca aparta más de lo que entró', () => {
    expect(repartir(20_000, 'plan', 25_000)).toEqual({ alAhorro: 20_000, paraGastar: 0 });
  });
});
