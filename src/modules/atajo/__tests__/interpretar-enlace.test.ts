import { CATEGORIAS_DE_PARTIDA, crearCatalogo } from '@/modules/categorias/utils/catalogo';

import {
  diagnosticarEnlace,
  borradorAParametros,
  buscarMetodoPago,
  interpretarEnlaceGasto,
} from '../utils/interpretar-enlace';

const HOY = '2026-11-20';
const CATALOGO = crearCatalogo(CATEGORIAS_DE_PARTIDA);

describe('enlace del atajo', () => {
  it('registra directo cuando trae importe, categoría y forma de pago', () => {
    const resultado = interpretarEnlaceGasto(
      { monto: '4,50', categoria: 'Comida', metodo: 'Efectivo' },
      HOY,
      CATALOGO,
    );
    expect(resultado).toEqual({
      tipo: 'completo',
      gasto: {
        montoCentavos: 450,
        categoria: 'comida',
        metodoPago: 'efectivo',
        cuentaId: null,
        nota: null,
        fecha: HOY,
        origen: 'atajo',
      },
      cuentaPorElegir: false,
    });
  });

  it('acepta nombres alternativos de parámetros y nota', () => {
    const resultado = interpretarEnlaceGasto(
      { cantidad: '12', cat: 'novia', pago: 'Tarjeta de débito', nota: 'Cine' },
      HOY,
      CATALOGO,
    );
    expect(resultado.tipo).toBe('completo');
    if (resultado.tipo === 'completo') {
      expect(resultado.gasto).toMatchObject({
        montoCentavos: 1_200,
        categoria: 'novia',
        metodoPago: 'debito',
        cuentaId: null,
        nota: 'Cine',
      });
    }
  });

  it('con datos incompletos devuelve un borrador con lo que sí entendió', () => {
    expect(interpretarEnlaceGasto({ monto: '3', categoria: 'Mascotas' }, HOY, CATALOGO)).toEqual({
      tipo: 'incompleto',
      borrador: {
        montoCentavos: 300,
        categoria: undefined,
        metodoPago: undefined,
        nota: undefined,
      },
    });
  });

  it('un importe inválido nunca se registra', () => {
    expect(
      interpretarEnlaceGasto(
        { monto: 'abc', categoria: 'Comida', metodo: 'Efectivo' },
        HOY,
        CATALOGO,
      ).tipo,
    ).toBe('incompleto');
    expect(
      interpretarEnlaceGasto({ monto: '0', categoria: 'Comida', metodo: 'Efectivo' }, HOY, CATALOGO)
        .tipo,
    ).toBe('incompleto');
  });

  it.each([
    ['Compras personales', 'compras'],
    ['IMPREVISTOS', 'imprevistos'],
    ['  salidas ', 'salidas'],
    ['almuerzo', 'comida'],
  ])('reconoce la categoría "%s"', (texto, id) => {
    expect(CATALOGO.buscar(texto)?.id).toBe(id);
  });

  it('reconoce una categoría creada por la persona, por su nombre', () => {
    const catalogo = crearCatalogo([
      ...CATEGORIAS_DE_PARTIDA,
      {
        id: 'c-xyz',
        nombre: 'Gimnasio',
        icono: 'fitness-outline',
        color: 'cat-7',
        orden: 6,
        limiteMensualCentavos: 2_000,
      },
    ]);
    const resultado = interpretarEnlaceGasto(
      { monto: '20', categoria: 'gimnasio', metodo: 'Debito' },
      HOY,
      catalogo,
    );
    expect(resultado.tipo === 'completo' && resultado.gasto.categoria).toBe('c-xyz');
  });

  it.each([
    ['Débito', 'debito'],
    ['Credito', 'credito'],
    ['deuna', 'transferencia'],
  ])('reconoce la forma de pago "%s"', (texto, id) => {
    expect(buscarMetodoPago(texto)).toBe(id);
  });

  it('un borrador vuelve a parámetros de ruta', () => {
    expect(borradorAParametros({ montoCentavos: 450, categoria: 'comida' })).toEqual({
      monto: '4.50',
      categoria: 'comida',
    });
  });
});

describe('diagnosticarEnlace', () => {
  it('no reporta nada si el enlace está completo', () => {
    expect(
      diagnosticarEnlace({ monto: '4.5', categoria: 'Comida', metodo: 'Efectivo' }, CATALOGO),
    ).toEqual([]);
  });

  it('avisa cuando el enlace llega sin datos', () => {
    expect(diagnosticarEnlace({}, CATALOGO)).toHaveLength(1);
  });

  it('detecta huecos de la plantilla sin reemplazar', () => {
    const problemas = diagnosticarEnlace(
      { monto: '[Cuánto]', categoria: '[Categoría]', metodo: '[Pago]' },
      CATALOGO,
    );
    expect(problemas).toHaveLength(3);
    expect(problemas[0]).toContain('Entrada proporcionada');
  });

  it('nombra la categoría que no existe', () => {
    const [problema] = diagnosticarEnlace(
      { monto: '3', categoria: 'Mascotas', metodo: 'Debito' },
      CATALOGO,
    );
    expect(problema).toContain('"Mascotas"');
  });
});

describe('pago con Apple Pay (automatización de Wallet)', () => {
  const CONTEXTO = { cuentaDiariaId: 1, categoriaWallet: 'compras' };

  it('registra directo con sólo el importe y el comercio', () => {
    const resultado = interpretarEnlaceGasto(
      { origen: 'wallet', monto: 'US$ 4.50', nota: 'Supermaxi' },
      HOY,
      CATALOGO,
      CONTEXTO,
    );
    expect(resultado).toEqual({
      tipo: 'completo',
      gasto: {
        montoCentavos: 450,
        categoria: 'compras',
        metodoPago: 'debito',
        cuentaId: 1,
        nota: 'Supermaxi',
        fecha: HOY,
        origen: 'wallet',
      },
      cuentaPorElegir: false,
    });
  });

  it('acepta el comercio en su propio parámetro y otras formas de escribir el origen', () => {
    const resultado = interpretarEnlaceGasto(
      { origen: 'Apple Pay', importe: '12,00 USD', comercio: 'KFC' },
      HOY,
      CATALOGO,
      CONTEXTO,
    );
    expect(resultado.tipo).toBe('completo');
    if (resultado.tipo === 'completo') {
      expect(resultado.gasto).toMatchObject({
        montoCentavos: 1_200,
        nota: 'KFC',
        origen: 'wallet',
      });
    }
  });

  it('si la categoría por defecto ya no existe, usa la primera de la lista', () => {
    const resultado = interpretarEnlaceGasto({ origen: 'wallet', monto: '3' }, HOY, CATALOGO, {
      cuentaDiariaId: null,
      categoriaWallet: 'borrada',
    });
    expect(resultado.tipo).toBe('completo');
    if (resultado.tipo === 'completo') {
      expect(resultado.gasto.categoria).toBe(CATALOGO.lista[0].id);
      expect(resultado.gasto.cuentaId).toBeNull();
    }
  });

  it('sin importe no registra nada: abre el formulario', () => {
    const resultado = interpretarEnlaceGasto({ origen: 'wallet' }, HOY, CATALOGO, CONTEXTO);
    expect(resultado.tipo).toBe('incompleto');
  });

  it('el atajo normal con débito también baja la cuenta del día a día', () => {
    const resultado = interpretarEnlaceGasto(
      { monto: '5', categoria: 'Comida', metodo: 'Debito' },
      HOY,
      CATALOGO,
      CONTEXTO,
    );
    expect(resultado.tipo === 'completo' && resultado.gasto).toMatchObject({
      cuentaId: 1,
      origen: 'atajo',
    });
  });
});

describe('de qué cuenta sale la plata', () => {
  const CUENTAS = [
    { id: 1, nombre: 'Cuenta de ahorros', tipo: 'diaria' },
    { id: 2, nombre: 'Cuenta flexible', tipo: 'flexible' },
  ] as const;
  const CONTEXTO = { cuentaDiariaId: 1, categoriaWallet: 'compras', cuentas: CUENTAS };
  const enlace = (extra: Record<string, string>) =>
    interpretarEnlaceGasto({ monto: '5', categoria: 'Comida', ...extra }, HOY, CATALOGO, CONTEXTO);

  it('con débito y varias cuentas, la app tiene que preguntar', () => {
    const resultado = enlace({ metodo: 'Debito' });
    expect(resultado).toMatchObject({ tipo: 'completo', cuentaPorElegir: true });
  });

  it('en efectivo o con crédito no pregunta: no sale de ninguna cuenta', () => {
    for (const metodo of ['Efectivo', 'Credito']) {
      const resultado = enlace({ metodo });
      expect(resultado).toMatchObject({ cuentaPorElegir: false, gasto: { cuentaId: null } });
    }
  });

  it('si el enlace dice la cuenta, por nombre o por tipo, no pregunta', () => {
    for (const cuenta of ['Cuenta flexible', 'cuenta FLEXIBLE', 'flexible']) {
      const resultado = enlace({ metodo: 'Debito', cuenta });
      expect(resultado).toMatchObject({ cuentaPorElegir: false, gasto: { cuentaId: 2 } });
    }
  });

  it('con una sola cuenta no hay nada que preguntar', () => {
    const resultado = interpretarEnlaceGasto(
      { monto: '5', categoria: 'Comida', metodo: 'Debito' },
      HOY,
      CATALOGO,
      { cuentaDiariaId: 1, cuentas: [CUENTAS[0]] },
    );
    expect(resultado).toMatchObject({ cuentaPorElegir: false, gasto: { cuentaId: 1 } });
  });

  it('un pago con Apple Pay no pregunta: sale de la cuenta de la tarjeta', () => {
    const resultado = interpretarEnlaceGasto(
      { origen: 'wallet', monto: '3' },
      HOY,
      CATALOGO,
      CONTEXTO,
    );
    expect(resultado).toMatchObject({ cuentaPorElegir: false, gasto: { cuentaId: 1 } });
  });

  it('una cuenta que no existe se avisa y se pregunta', () => {
    expect(enlace({ metodo: 'Debito', cuenta: 'Produbanco' })).toMatchObject({
      cuentaPorElegir: true,
    });
    expect(
      diagnosticarEnlace(
        { monto: '5', categoria: 'Comida', metodo: 'Debito', cuenta: 'Produbanco' },
        CATALOGO,
        CUENTAS,
      ),
    ).toEqual(['La cuenta "Produbanco" no existe en AhorraYa. Escríbela igual que en la app.']);
  });
});
