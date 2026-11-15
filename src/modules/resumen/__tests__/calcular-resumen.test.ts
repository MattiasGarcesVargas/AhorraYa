import { PLAN_INICIAL } from '@/constants/plan.constants';
import { mesQueContiene, quincenaQueContiene } from '@/lib/periodos';
import type { MovimientoAhorro } from '@/modules/ahorro/ahorro.types';
import { CATEGORIAS_DE_PARTIDA } from '@/modules/categorias/utils/catalogo';
import type { Gasto } from '@/modules/gastos/gastos.types';
import type { Ingreso } from '@/modules/ingresos/ingresos.types';
import type { Plan } from '@/modules/plan/plan.types';

import { calcularResumen } from '../utils/calcular-resumen';
import { historialQuincenas } from '../utils/historial-quincenas';

let id = 0;
function gasto(parcial: Partial<Gasto>): Gasto {
  id += 1;
  return {
    id,
    montoCentavos: 1_000,
    categoria: 'comida',
    metodoPago: 'efectivo',
    cuentaId: null,
    nota: null,
    fecha: '2026-11-16',
    creadoEn: `2026-11-16T12:00:${String(id).padStart(2, '0')}Z`,
    origen: 'app',
    ...parcial,
  };
}

function aporte(
  montoCentavos: number,
  fecha: string,
  tipo: MovimientoAhorro['tipo'] = 'aporte',
): MovimientoAhorro {
  id += 1;
  return { id, montoCentavos, tipo, nota: null, fecha, creadoEn: `${fecha}T08:00:00Z` };
}

const BASE = {
  ingresos: [],
  movimientosAhorro: [],
  categorias: CATEGORIAS_DE_PARTIDA,
  plan: PLAN_INICIAL,
};

describe('calcularResumen', () => {
  const quincena = quincenaQueContiene('2026-11-20');

  it('usa la mitad del presupuesto mensual en la quincena ($160 de $320)', () => {
    const resumen = calcularResumen({ ...BASE, periodo: quincena, hoy: '2026-11-20', gastos: [] });
    expect(resumen.presupuesto).toBe(16_000);
    expect(resumen.disponible).toBe(16_000);
  });

  it('reparte lo disponible entre los días que quedan, hoy incluido', () => {
    const resumen = calcularResumen({
      ...BASE,
      periodo: quincena,
      hoy: '2026-11-20',
      gastos: [gasto({ montoCentavos: 5_000 })],
    });
    // Quedan $110 en 10 días (20 al 29).
    expect(resumen.disponible).toBe(11_000);
    expect(resumen.diasRestantes).toBe(10);
    expect(resumen.porDia).toBe(1_100);
  });

  it('marca las categorías excedidas y ordena por gasto', () => {
    const resumen = calcularResumen({
      ...BASE,
      periodo: quincena,
      hoy: '2026-11-20',
      gastos: [
        gasto({ categoria: 'salidas', montoCentavos: 2_500 }), // límite quincenal $20
        gasto({ categoria: 'comida', montoCentavos: 500 }),
      ],
    });
    expect(resumen.categorias[0].categoria.id).toBe('salidas');
    expect(resumen.excedidas.map((c) => c.categoria.id)).toEqual(['salidas']);
    expect(resumen.excedidas[0].restante).toBe(-500);
  });

  it('una categoría con límite 0 no tiene tope: nunca se "pasa"', () => {
    const resumen = calcularResumen({
      ...BASE,
      categorias: [{ ...CATEGORIAS_DE_PARTIDA[0], limiteMensualCentavos: 0 }],
      periodo: quincena,
      hoy: '2026-11-20',
      gastos: [gasto({ categoria: 'transporte', montoCentavos: 5_000 })],
    });
    expect(resumen.categorias[0]).toMatchObject({ sinTope: true, excedido: false });
    expect(resumen.excedidas).toHaveLength(0);
  });

  it('los gastos de una categoría eliminada siguen contando, aparte', () => {
    const resumen = calcularResumen({
      ...BASE,
      periodo: quincena,
      hoy: '2026-11-20',
      gastos: [gasto({ categoria: 'ya-no-existe', montoCentavos: 700 })],
    });
    expect(resumen.gastado).toBe(700);
    expect(resumen.categorias[0].categoria.nombre).toBe('Sin categoría');
  });

  it('ignora gastos fuera del periodo', () => {
    const resumen = calcularResumen({
      ...BASE,
      periodo: quincena,
      hoy: '2026-11-20',
      gastos: [gasto({ fecha: '2026-11-14' }), gasto({ fecha: '2026-11-30' })],
    });
    expect(resumen.gastado).toBe(0);
  });

  it('págate primero: compara el ahorro neto de la quincena contra el aporte', () => {
    const resumen = calcularResumen({
      ...BASE,
      periodo: quincena,
      hoy: '2026-11-20',
      gastos: [],
      movimientosAhorro: [
        aporte(100_000, '2026-11-01', 'inicial'),
        aporte(25_000, '2026-11-15'),
        aporte(5_000, '2026-11-18', 'retiro'),
      ],
    });
    expect(resumen.ahorro).toEqual({
      neto: 20_000,
      objetivo: 25_000,
      cumplido: false,
      falta: 5_000,
    });
  });

  it('en el mes compara contra la meta mensual', () => {
    const resumen = calcularResumen({
      ...BASE,
      periodo: mesQueContiene('2026-11-20'),
      hoy: '2026-11-30',
      gastos: [],
      movimientosAhorro: [aporte(25_000, '2026-11-15'), aporte(25_000, '2026-11-30')],
    });
    expect(resumen.ahorro.cumplido).toBe(true);
    expect(resumen.ahorro.objetivo).toBe(50_000);
  });
});

describe('historialQuincenas', () => {
  it('arma la tabla de quincenas como el Excel', () => {
    const filas = historialQuincenas({
      ...BASE,
      quincenas: [quincenaQueContiene('2026-11-30'), quincenaQueContiene('2026-11-15')],
      hoy: '2026-12-02',
      gastos: [gasto({ fecha: '2026-11-16', montoCentavos: 8_000 })],
      movimientosAhorro: [aporte(25_000, '2026-11-15')],
    });

    expect(filas[0]).toMatchObject({ enCurso: true, ahorrado: 0, cumplido: false });
    expect(filas[1]).toMatchObject({
      enCurso: false,
      ahorrado: 25_000,
      cumplido: true,
      gastado: 8_000,
      presupuesto: 16_000,
    });
  });
});

describe('aportes extra (no salen del sueldo)', () => {
  const extra: MovimientoAhorro = { ...aporte(2_000, '2026-11-16'), origen: 'extra' };

  it('no cumplen el aporte de la quincena, se informan aparte', () => {
    const resumen = calcularResumen({
      ...BASE,
      periodo: quincenaQueContiene('2026-11-20'),
      hoy: '2026-11-20',
      gastos: [],
      movimientosAhorro: [{ ...aporte(25_000, '2026-11-17'), origen: 'extra' }, extra],
    });
    expect(resumen.ahorro).toMatchObject({ neto: 0, cumplido: false, falta: 25_000 });
    expect(resumen.ahorroExtra).toBe(27_000);
    expect(resumen.esPeriodoDeCobro).toBe(true);
  });

  it('sí cuentan para la meta del mes', () => {
    const resumen = calcularResumen({
      ...BASE,
      periodo: mesQueContiene('2026-11-20'),
      hoy: '2026-11-20',
      gastos: [],
      movimientosAhorro: [aporte(48_000, '2026-11-15'), extra],
    });
    expect(resumen.ahorro).toMatchObject({ neto: 50_000, objetivo: 50_000, cumplido: true });
    expect(resumen.esPeriodoDeCobro).toBe(false);
  });

  it('en el historial no marcan la quincena como cumplida', () => {
    const [fila] = historialQuincenas({
      ...BASE,
      quincenas: [quincenaQueContiene('2026-11-16')],
      hoy: '2026-11-20',
      gastos: [],
      movimientosAhorro: [{ ...aporte(25_000, '2026-11-16'), origen: 'extra' }],
    });
    expect(fila).toMatchObject({ ahorrado: 0, extra: 25_000, cumplido: false });
  });
});

describe('cobro mensual', () => {
  const plan: Plan = {
    ...PLAN_INICIAL,
    cobrosPorMes: 1,
    aporteQuincenalCentavos: 40_000,
    sueldoQuincenalCentavos: 70_000,
  };
  const mes = mesQueContiene('2026-11-20');

  it('el periodo de cobro es el mes y el objetivo, el aporte por cobro', () => {
    const resumen = calcularResumen({
      ...BASE,
      plan,
      periodo: mes,
      hoy: '2026-11-20',
      gastos: [],
      movimientosAhorro: [
        aporte(30_000, '2026-11-02'),
        { ...aporte(20_000, '2026-11-10'), origen: 'extra' },
      ],
    });
    expect(resumen.esPeriodoDeCobro).toBe(true);
    expect(resumen.ahorro).toEqual({
      neto: 30_000,
      objetivo: 40_000,
      cumplido: false,
      falta: 10_000,
    });
    expect(resumen.ahorroExtra).toBe(20_000);
    // El presupuesto del mes no cambia con la frecuencia de cobro.
    expect(resumen.presupuesto).toBe(32_000);
  });

  it('la quincena deja de ser periodo de cobro: no tiene objetivo', () => {
    const resumen = calcularResumen({
      ...BASE,
      plan,
      periodo: quincenaQueContiene('2026-11-20'),
      hoy: '2026-11-20',
      gastos: [],
    });
    expect(resumen.esPeriodoDeCobro).toBe(false);
    expect(resumen.ahorro).toMatchObject({ objetivo: 0, cumplido: false, falta: 0 });
  });

  it('el historial lista meses, con el presupuesto del mes entero', () => {
    const filas = historialQuincenas({
      ...BASE,
      plan,
      quincenas: [mes, mesQueContiene('2026-10-10')],
      hoy: '2026-11-20',
      gastos: [gasto({ fecha: '2026-10-05', montoCentavos: 8_000 })],
      movimientosAhorro: [aporte(40_000, '2026-10-31'), aporte(10_000, '2026-11-01')],
    });
    expect(filas[0]).toMatchObject({ enCurso: true, ahorrado: 10_000, cumplido: false });
    expect(filas[1]).toMatchObject({
      enCurso: false,
      ahorrado: 40_000,
      objetivo: 40_000,
      cumplido: true,
      gastado: 8_000,
      presupuesto: 32_000,
    });
  });
});

describe('ISD: sale y vuelve, no es gasto ni ingreso', () => {
  const quincena = quincenaQueContiene('2026-11-20');
  const ingreso = (parcial: Partial<Ingreso>): Ingreso => ({
    id: ++id,
    montoCentavos: 500,
    tipo: 'reembolso',
    cuentaId: null,
    nota: null,
    fecha: '2026-11-18',
    creadoEn: '2026-11-18T09:00:00Z',
    ...parcial,
  });
  const consumo = gasto({ montoCentavos: 10_000 });
  const iva = gasto({ montoCentavos: 1_500, gastoPadreId: consumo.id, impuesto: 'iva' });
  const isd = gasto({ montoCentavos: 500, gastoPadreId: consumo.id, impuesto: 'isd' });
  const entrada = {
    ...BASE,
    gastos: [consumo, iva, isd],
    ingresos: [
      ingreso({ gastoId: isd.id }),
      ingreso({ montoCentavos: 700 }), // un reembolso cualquiera sí es ingreso
    ],
  };

  it('el resumen cuenta el consumo y el IVA, no el ISD ni su devolución', () => {
    const resumen = calcularResumen({ ...entrada, periodo: quincena, hoy: '2026-11-20' });
    expect(resumen.gastado).toBe(11_500);
    expect(resumen.disponible).toBe(16_000 - 11_500);
    // La fila del ISD se sigue viendo en la lista, como en Movimientos.
    expect(resumen.cantidadGastos).toBe(3);
    expect(resumen.ingresos).toBe(700);
  });

  it('el historial tampoco', () => {
    const [fila] = historialQuincenas({ ...entrada, quincenas: [quincena], hoy: '2026-11-20' });
    expect(fila).toMatchObject({ gastado: 11_500, ingresos: 700 });
  });
});
