import { idQueSeEdita } from '../utils/id-que-se-edita';

describe('idQueSeEdita', () => {
  it('un movimiento normal se abre a sí mismo', () => {
    expect(idQueSeEdita({ tipo: 'gasto', id: 4 })).toBe(4);
    expect(idQueSeEdita({ tipo: 'ingreso', id: 9 })).toBe(9);
  });

  it('un impuesto abre el consumo al que pertenece', () => {
    expect(idQueSeEdita({ tipo: 'gasto', id: 5, gastoPadreId: 4 })).toBe(4);
  });
});
