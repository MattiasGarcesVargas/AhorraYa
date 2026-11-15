import { PLAN_INICIAL } from '@/constants/plan.constants';
import { mesQueContiene } from '@/lib/periodos';
import type { MovimientoAhorro } from '@/modules/ahorro/ahorro.types';
import { CATEGORIAS_DE_PARTIDA, crearCatalogo } from '@/modules/categorias/utils/catalogo';
import type { Gasto } from '@/modules/gastos/gastos.types';
import type { Ingreso } from '@/modules/ingresos/ingresos.types';

import {
  construirEstadoCuenta,
  nombreArchivoEstadoCuenta,
  type EntradaEstadoCuenta,
} from '../utils/construir-estado-cuenta';
import { campoCsv, estadoCuentaCsv } from '../utils/estado-cuenta-csv';
import { escapar, estadoCuentaHtml } from '../utils/estado-cuenta-html';

const NOVIEMBRE = mesQueContiene('2026-11-10');

function gasto(id: number, fecha: string, monto: number, extra: Partial<Gasto> = {}): Gasto {
  return {
    id,
    montoCentavos: monto,
    categoria: 'comida',
    metodoPago: 'efectivo',
    cuentaId: null,
    nota: null,
    fecha,
    creadoEn: `${fecha}T12:00:0${id}Z`,
    origen: 'app',
    ...extra,
  };
}

function ingreso(id: number, fecha: string, monto: number): Ingreso {
  return {
    id,
    montoCentavos: monto,
    tipo: 'sueldo',
    cuentaId: null,
    nota: null,
    fecha,
    creadoEn: `${fecha}T09:00:00Z`,
  };
}

function ahorro(
  id: number,
  fecha: string,
  monto: number,
  tipo: MovimientoAhorro['tipo'],
): MovimientoAhorro {
  return { id, montoCentavos: monto, tipo, nota: null, fecha, creadoEn: `${fecha}T10:00:00Z` };
}

const ENTRADA: EntradaEstadoCuenta = {
  periodo: NOVIEMBRE,
  hoy: '2026-12-02',
  gastos: [
    gasto(1, '2026-11-16', 450),
    gasto(2, '2026-11-20', 2_500, { categoria: 'salidas', metodoPago: 'debito' }),
    gasto(3, '2026-10-31', 999), // de octubre: no entra
  ],
  ingresos: [ingreso(1, '2026-11-15', 35_000), ingreso(2, '2026-11-30', 35_000)],
  movimientosAhorro: [
    ahorro(1, '2026-10-01', 100_000, 'inicial'),
    ahorro(2, '2026-11-15', 25_000, 'aporte'),
    ahorro(3, '2026-11-25', 5_000, 'retiro'),
    ahorro(4, '2026-11-30', 25_000, 'aporte'),
  ],
  categorias: crearCatalogo(CATEGORIAS_DE_PARTIDA),
  plan: PLAN_INICIAL,
};

describe('construirEstadoCuenta', () => {
  const estado = construirEstadoCuenta(ENTRADA);

  it('titula el mes y su rango en español', () => {
    expect(estado.titulo).toBe('Noviembre 2026');
    expect(estado.rango).toBe('Del 1 al 30 de noviembre de 2026');
    expect(estado.enCurso).toBe(false);
  });

  it('suma sólo lo del mes', () => {
    expect(estado.totales).toEqual({
      ingresos: 70_000,
      gastos: 2_950,
      aportes: 50_000,
      retiros: 5_000,
      ahorroNeto: 45_000,
      // 700 − 29.50 − 500 + 50
      flujoLibre: 70_000 - 2_950 - 50_000 + 5_000,
    });
  });

  it('la cuenta de ahorro arranca con el saldo previo y lleva el saldo fila a fila', () => {
    expect(estado.ahorro.saldoAlInicio).toBe(100_000);
    expect(estado.ahorro.lineas.map((l) => l.saldo)).toEqual([125_000, 120_000, 145_000]);
    expect(estado.ahorro.saldoAlCierre).toBe(145_000);
  });

  it('compara el ahorro neto contra la meta mensual', () => {
    expect(estado.meta).toMatchObject({ objetivo: 50_000, alcanzado: 45_000, cumplida: false });
  });

  it('lista los movimientos del más antiguo al más reciente, con signo', () => {
    expect(estado.movimientos.map((m) => [m.fecha, m.tipo, m.monto])).toEqual([
      ['2026-11-15', 'ingreso', 35_000],
      ['2026-11-15', 'aporte', -25_000],
      ['2026-11-16', 'gasto', -450],
      ['2026-11-20', 'gasto', -2_500],
      ['2026-11-25', 'retiro', 5_000],
      ['2026-11-30', 'ingreso', 35_000],
      ['2026-11-30', 'aporte', -25_000],
    ]);
  });

  it('agrupa por categoría y por forma de pago', () => {
    const salidas = estado.categorias.find((c) => c.nombre === 'Salidas');
    expect(salidas).toMatchObject({ gastado: 2_500, limite: 4_000, excedido: false });
    expect(estado.metodos).toEqual([
      { nombre: 'Débito', cantidad: 1, total: 2_500 },
      { nombre: 'Efectivo', cantidad: 1, total: 450 },
    ]);
  });

  it('en un mes en curso promedia sobre los días transcurridos', () => {
    const parcial = construirEstadoCuenta({ ...ENTRADA, hoy: '2026-11-20' });
    expect(parcial.enCurso).toBe(true);
    expect(parcial.promedioDiario).toBe(Math.round(2_950 / 20));
  });

  describe('con un consumo del exterior', () => {
    const tarjeta = { categoria: 'salidas', metodoPago: 'debito' } as const;
    const devolucion: Ingreso = {
      ...ingreso(3, '2026-11-23', 50),
      tipo: 'reembolso',
      gastoId: 6,
    };
    const conExterior = construirEstadoCuenta({
      ...ENTRADA,
      gastos: [
        gasto(4, '2026-11-22', 1_000, tarjeta),
        gasto(5, '2026-11-22', 150, { ...tarjeta, gastoPadreId: 4, impuesto: 'iva' }),
        gasto(6, '2026-11-22', 50, { ...tarjeta, gastoPadreId: 4, impuesto: 'isd' }),
      ],
      ingresos: [...ENTRADA.ingresos, devolucion],
    });

    it('el ISD no cuenta como gasto ni su devolución como ingreso', () => {
      expect(conExterior.totales.gastos).toBe(1_150);
      expect(conExterior.totales.ingresos).toBe(70_000);
      expect(conExterior.cantidadGastos).toBe(2);
      expect(conExterior.metodos).toEqual([{ nombre: 'Débito', cantidad: 2, total: 1_150 }]);
      expect(conExterior.categorias.find((c) => c.nombre === 'Salidas')?.gastado).toBe(1_150);
    });

    it('pero los dos aparecen en los movimientos, porque mueven la cuenta', () => {
      const montos = conExterior.movimientos.map((m) => m.monto);
      expect(montos).toContain(-50);
      expect(montos).toContain(50);
    });

    it('un reembolso cualquiera sí es ingreso', () => {
      const conReembolso = construirEstadoCuenta({
        ...ENTRADA,
        ingresos: [...ENTRADA.ingresos, { ...devolucion, gastoId: null }],
      });
      expect(conReembolso.totales.ingresos).toBe(70_050);
    });
  });

  it('nombra el archivo por año y mes', () => {
    expect(nombreArchivoEstadoCuenta(NOVIEMBRE)).toBe('AhorraYa-estado-de-cuenta-2026-11');
  });
});

describe('PDF (HTML)', () => {
  it('escapa lo que escribió la persona', () => {
    expect(escapar('<b>"Tom & Jerry"</b>')).toBe('&lt;b&gt;&quot;Tom &amp; Jerry&quot;&lt;/b&gt;');

    const html = estadoCuentaHtml(
      construirEstadoCuenta({
        ...ENTRADA,
        gastos: [gasto(1, '2026-11-16', 450, { nota: '<script>alert(1)</script>' })],
      }),
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('incluye las cifras clave y las secciones', () => {
    const html = estadoCuentaHtml(construirEstadoCuenta(ENTRADA));
    expect(html).toContain('Noviembre 2026');
    expect(html).toContain('$ 700.00');
    expect(html).toContain('$ 1,450.00');
    for (const seccion of ['Gastos por categoría', 'Movimientos', 'Cuenta de ahorro']) {
      expect(html).toContain(seccion);
    }
  });
});

describe('CSV', () => {
  it('cita los campos con comas, comillas o saltos de línea', () => {
    expect(campoCsv('simple')).toBe('simple');
    expect(campoCsv('Pan, leche')).toBe('"Pan, leche"');
    expect(campoCsv('Dijo "hola"')).toBe('"Dijo ""hola"""');
  });

  it('empieza con BOM, trae encabezados y un importe numérico por fila', () => {
    const csv = estadoCuentaCsv(construirEstadoCuenta(ENTRADA));
    const lineas = csv.replace('\uFEFF', '').trim().split('\r\n');

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(lineas[0]).toBe('Fecha,Tipo,Concepto,Categoría,Forma de pago,Monto');
    expect(lineas[1]).toBe('15/11/2026,Ingreso,Sueldo,,,350.00');
    expect(lineas[3]).toBe('16/11/2026,Gasto,Comida,Comida,Efectivo,-4.50');
    expect(lineas).toHaveLength(1 + 7);
  });
});
