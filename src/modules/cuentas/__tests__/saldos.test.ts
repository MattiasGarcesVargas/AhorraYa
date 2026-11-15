import { mesQueContiene } from '@/lib/periodos';
import type { Gasto } from '@/modules/gastos/gastos.types';
import type { Ingreso } from '@/modules/ingresos/ingresos.types';

import type { Cuenta, MovimientoCuenta } from '../cuentas.types';
import { asientosDetallados, construirLibro } from '../utils/libro';
import {
  calcularSaldos,
  cuentaPrincipal,
  efectoEnCuenta,
  totalizar,
  type FuentesSaldos,
} from '../utils/saldos';
import { validarCuenta } from '../utils/validar-cuenta';

const DIARIA: Cuenta = {
  id: 1,
  banco: 'pichincha',
  nombre: 'Cuenta de ahorros',
  tipo: 'diaria',
  orden: 0,
  creadoEn: '2026-11-01T00:00:00Z',
};
const FLEXIBLE: Cuenta = {
  ...DIARIA,
  id: 2,
  nombre: 'Cuenta flexible',
  tipo: 'flexible',
  orden: 1,
};
const CUENTAS = [DIARIA, FLEXIBLE];

let siguienteId = 0;
function movimiento(parcial: Partial<MovimientoCuenta>): MovimientoCuenta {
  siguienteId += 1;
  const fecha = parcial.fecha ?? '2026-11-01';
  return {
    id: siguienteId,
    cuentaId: FLEXIBLE.id,
    contraparteId: null,
    gastoId: null,
    tipo: 'aporte',
    montoCentavos: 10_000,
    nota: null,
    fecha,
    creadoEn: `${fecha}T10:00:${String(siguienteId).padStart(2, '0')}Z`,
    ...parcial,
  };
}

const TASAS = [{ cuentaId: FLEXIBLE.id, desde: '2026-11-01', tasaBp: 500 }];
const NOMBRES = {
  categoria: (id: string) => (id === 'transporte' ? 'Transporte' : id),
  cuenta: (id: number) => CUENTAS.find((cuenta) => cuenta.id === id)?.nombre ?? '?',
};

describe('saldos por cuenta', () => {
  it('una transferencia entre cuentas propias suma en una y resta en la otra', () => {
    const aporte = movimiento({ contraparteId: DIARIA.id, montoCentavos: 25_000 });
    expect(efectoEnCuenta(aporte, FLEXIBLE.id)).toBe(25_000);
    expect(efectoEnCuenta(aporte, DIARIA.id)).toBe(-25_000);

    const retiro = movimiento({ tipo: 'retiro', contraparteId: DIARIA.id, montoCentavos: 4_000 });
    expect(efectoEnCuenta(retiro, FLEXIBLE.id)).toBe(-4_000);
    expect(efectoEnCuenta(retiro, DIARIA.id)).toBe(4_000);
    expect(efectoEnCuenta(retiro, 99)).toBe(0);
  });

  it('el ajuste trae su propio signo', () => {
    expect(efectoEnCuenta(movimiento({ tipo: 'ajuste', montoCentavos: -120 }), FLEXIBLE.id)).toBe(
      -120,
    );
  });

  it('junta movimientos, gastos, ingresos e interés en el saldo de cada cuenta', () => {
    const fuentes: FuentesSaldos = {
      movimientos: [
        movimiento({ tipo: 'inicial', montoCentavos: 270_000 }),
        movimiento({ tipo: 'inicial', cuentaId: DIARIA.id, montoCentavos: 5_000 }),
        // El 15 cobro: $250 de la diaria pasan a la flexible.
        movimiento({ fecha: '2026-11-15', contraparteId: DIARIA.id, montoCentavos: 25_000 }),
      ],
      ingresosPorDia: [{ cuentaId: DIARIA.id, fecha: '2026-11-15', totalCentavos: 35_000 }],
      gastosPorDia: [{ cuentaId: DIARIA.id, fecha: '2026-11-16', totalCentavos: 1_200 }],
      tasas: TASAS,
    };

    const saldos = calcularSaldos(CUENTAS, fuentes, '2026-11-20');
    const [diaria, flexible] = saldos;

    // 50 + 350 − 250 − 12
    expect(diaria.saldo).toBe(13_800);
    expect(diaria.interesTotal).toBe(0);
    expect(flexible.saldo).toBe(270_000 + 25_000 + flexible.interesTotal);
    expect(flexible.interesTotal).toBeGreaterThan(19 * 36);
    expect(flexible.tasaBp).toBe(500);
    // Mañana paga sobre TODO el saldo, interés incluido: $2,957 × 5 % ÷ 365.
    expect(flexible.interesDiario).toBe(Math.floor((flexible.saldo * 0.05) / 365));
    expect(flexible.interesDiario).toBe(40);

    const totales = totalizar(saldos);
    expect(totales.ahorros).toBe(flexible.saldo);
    expect(totales.disponible).toBe(13_800);
    expect(totales.patrimonio).toBe(flexible.saldo + 13_800);
  });

  it('retirar baja el saldo y lo que la cuenta paga al día', () => {
    const base = [movimiento({ tipo: 'inicial', montoCentavos: 270_000 })];
    const fuentes = (movimientos: MovimientoCuenta[]): FuentesSaldos => ({
      movimientos,
      gastosPorDia: [],
      ingresosPorDia: [],
      tasas: TASAS,
    });

    const [antes] = calcularSaldos([FLEXIBLE], fuentes(base), '2026-11-10');
    const [despues] = calcularSaldos(
      [FLEXIBLE],
      fuentes([
        ...base,
        movimiento({ tipo: 'retiro', fecha: '2026-11-10', montoCentavos: 100_000 }),
      ]),
      '2026-11-10',
    );

    expect(despues.saldo).toBe(antes.saldo - 100_000);
    expect(antes.interesDiario).toBe(37);
    expect(despues.interesDiario).toBe(23);
  });

  it('propone la primera cuenta de cada tipo', () => {
    expect(cuentaPrincipal(CUENTAS, 'flexible')).toBe(FLEXIBLE);
    expect(cuentaPrincipal(CUENTAS, 'diaria')).toBe(DIARIA);
    expect(cuentaPrincipal([DIARIA], 'flexible')).toBeUndefined();
  });
});

describe('libro de una cuenta (debe y haber)', () => {
  const noviembre = mesQueContiene('2026-11-10');
  const movimientos = [
    movimiento({ tipo: 'inicial', fecha: '2026-10-20', montoCentavos: 270_000 }),
    movimiento({ fecha: '2026-11-15', contraparteId: DIARIA.id, montoCentavos: 25_000 }),
    movimiento({
      tipo: 'retiro',
      fecha: '2026-11-20',
      montoCentavos: 2_000,
      gastoId: 7,
      nota: 'Transporte · Uber',
    }),
  ];
  const fuentes: FuentesSaldos = {
    movimientos,
    gastosPorDia: [],
    ingresosPorDia: [],
    tasas: [{ cuentaId: FLEXIBLE.id, desde: '2026-10-20', tasaBp: 500 }],
  };

  function libroDe(cuenta: Cuenta, gastos: Gasto[] = [], ingresos: Ingreso[] = []) {
    const [saldo] = calcularSaldos([cuenta], fuentes, '2026-11-30');
    const asientos = asientosDetallados(cuenta.id, { movimientos, gastos, ingresos }, NOMBRES);
    return { saldo, libro: construirLibro(noviembre, saldo.serie, asientos) };
  }

  it('abre con el saldo del mes anterior y cada línea cuadra con la de arriba', () => {
    const { saldo, libro } = libroDe(FLEXIBLE);

    // Lo de octubre (inicial + su interés) ya viene en el saldo de apertura.
    expect(libro.saldoAlInicio).toBeGreaterThan(270_000);

    let corrido = libro.saldoAlInicio;
    for (const linea of libro.lineas) {
      corrido += linea.entra - linea.sale;
      expect(linea.saldo).toBe(corrido);
    }
    expect(libro.saldoAlCierre).toBe(saldo.saldo);
    expect(libro.saldoAlCierre).toBe(libro.saldoAlInicio + libro.totalEntra - libro.totalSale);
  });

  it('junta el interés en una línea antes de cada movimiento y otra al final', () => {
    const { libro } = libroDe(FLEXIBLE);

    expect(libro.lineas.map((linea) => linea.concepto)).toEqual([
      'Interés ganado',
      'Aporte desde Cuenta de ahorros',
      'Interés ganado',
      'Retiro',
      'Interés ganado',
    ]);
    // El 1 de noviembre de 2026 es domingo: lo suyo ya se pagó el viernes anterior.
    expect(libro.lineas[0].detalle).toBe('14 días');
    expect(libro.lineas[3]).toMatchObject({ sale: 2_000, detalle: 'Transporte · Uber' });
    expect(libro.interes).toBeGreaterThan(0);
    // Las líneas de interés no se editan: se calculan.
    expect(libro.lineas[0].origen).toBeNull();
    expect(libro.lineas[1].origen).toEqual({ tipo: 'movimiento', id: movimientos[1].id });
  });

  it('en la otra cuenta la misma transferencia aparece como salida', () => {
    const { libro } = libroDe(DIARIA);
    expect(libro.lineas).toHaveLength(1);
    expect(libro.lineas[0]).toMatchObject({
      concepto: 'Transferencia a Cuenta flexible',
      sale: 25_000,
      saldo: -25_000,
    });
  });

  it('incluye los gastos e ingresos de la cuenta, y sólo esos', () => {
    const gasto = (id: number, cuentaId: number | null): Gasto => ({
      id,
      montoCentavos: 500,
      categoria: 'transporte',
      metodoPago: 'debito',
      cuentaId,
      nota: null,
      fecha: '2026-11-18',
      creadoEn: `2026-11-18T12:00:0${id}Z`,
      origen: 'app',
    });
    const asientos = asientosDetallados(
      DIARIA.id,
      { movimientos: [], gastos: [gasto(1, DIARIA.id), gasto(2, null)], ingresos: [] },
      NOMBRES,
    );
    expect(asientos).toHaveLength(1);
    expect(asientos[0]).toMatchObject({ concepto: 'Transporte', importe: -500, detalle: 'Gasto' });
  });
});

describe('validar una cuenta', () => {
  const nueva = { banco: 'pichincha', nombre: 'Flexi 2', tipo: 'flexible', tasaBp: 500 } as const;

  it('acepta una cuenta flexible con su tasa', () => {
    expect(validarCuenta(nueva, CUENTAS)).toEqual({
      ok: true,
      datos: { banco: 'pichincha', nombre: 'Flexi 2', tipo: 'flexible' },
      tasaBp: 500,
    });
  });

  it('no deja repetir el nombre en el mismo banco, pero sí en otro', () => {
    const repetida = { ...nueva, nombre: ' cuenta FLEXIBLE ' };
    expect(validarCuenta(repetida, CUENTAS).ok).toBe(false);
    expect(validarCuenta({ ...repetida, banco: 'guayaquil' }, CUENTAS).ok).toBe(true);
    // Al editarla, su propio nombre no cuenta como repetido.
    expect(validarCuenta(repetida, CUENTAS, FLEXIBLE.id).ok).toBe(true);
  });

  it('la cuenta del día a día no lleva tasa', () => {
    const resultado = validarCuenta({ ...nueva, tipo: 'diaria', tasaBp: null }, CUENTAS);
    expect(resultado).toMatchObject({ ok: true, tasaBp: 0 });
  });

  it('rechaza un nombre vacío, una tasa mal escrita o exagerada', () => {
    expect(validarCuenta({ ...nueva, nombre: '  ' }, CUENTAS).ok).toBe(false);
    expect(validarCuenta({ ...nueva, tasaBp: null }, CUENTAS).ok).toBe(false);
    expect(validarCuenta({ ...nueva, tasaBp: 5_000 }, CUENTAS).ok).toBe(false);
  });
});
