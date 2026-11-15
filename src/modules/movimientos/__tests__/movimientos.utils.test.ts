import { CATEGORIAS_DE_PARTIDA, crearCatalogo } from '@/modules/categorias/utils/catalogo';
import type { Gasto } from '@/modules/gastos/gastos.types';
import type { Ingreso } from '@/modules/ingresos/ingresos.types';

import {
  agruparPorDia,
  desdeGasto,
  desdeIngreso,
  desdeMovimientoCuenta,
  filtrar,
} from '../utils/movimientos.utils';

const gasto = (id: number, fecha: string, monto: number, hora = '12'): Gasto => ({
  id,
  montoCentavos: monto,
  categoria: 'comida',
  metodoPago: 'efectivo',
  cuentaId: null,
  nota: null,
  fecha,
  creadoEn: `${fecha}T${hora}:00:00Z`,
  origen: 'app',
});

const CATALOGO = crearCatalogo(CATEGORIAS_DE_PARTIDA);

const sueldo: Ingreso = {
  id: 1,
  montoCentavos: 35_000,
  tipo: 'sueldo',
  cuentaId: null,
  nota: null,
  fecha: '2026-11-15',
  creadoEn: '2026-11-15T09:00:00Z',
};

describe('movimientos', () => {
  it('los gastos restan y los ingresos suman', () => {
    expect(desdeGasto(gasto(1, '2026-11-15', 450), CATALOGO).importe).toBe(-450);
    expect(desdeIngreso(sueldo).importe).toBe(35_000);
  });

  it('con nota, la nota es el título y la categoría pasa al detalle', () => {
    const conNota = desdeGasto({ ...gasto(1, '2026-11-15', 450), nota: 'Almuerzo' }, CATALOGO);
    expect(conNota.titulo).toBe('Almuerzo');
    expect(conNota.detalle).toBe('Comida · Efectivo');
  });

  it('agrupa por día, del más reciente al más antiguo, con el gasto del día', () => {
    const movimientos = [
      desdeGasto(gasto(1, '2026-11-15', 450, '10'), CATALOGO),
      desdeIngreso(sueldo),
      desdeGasto(gasto(2, '2026-11-16', 300), CATALOGO),
      desdeGasto(gasto(3, '2026-11-15', 200, '18'), CATALOGO),
    ];
    const grupos = agruparPorDia(movimientos, '2026-11-16');

    expect(grupos.map((g) => g.titulo)).toEqual(['Hoy', 'Ayer']);
    expect(grupos[1].gastadoDelDia).toBe(650);
    expect(grupos[1].data.map((m) => m.clave)).toEqual(['gasto-3', 'gasto-1', 'ingreso-1']);
  });

  it('un gasto de una categoría que ya no existe se muestra como "Sin categoría"', () => {
    const huerfano = desdeGasto({ ...gasto(9, '2026-11-15', 100), categoria: 'borrada' }, CATALOGO);
    expect(huerfano.detalle).toBe('Efectivo');
    expect(huerfano.titulo).toBe('Sin categoría');
  });

  it('filtra por tipo', () => {
    const todos = [desdeGasto(gasto(1, '2026-11-15', 450), CATALOGO), desdeIngreso(sueldo)];
    expect(filtrar(todos, 'ingreso').map((m) => m.tipo)).toEqual(['ingreso']);
    expect(filtrar(todos, 'todos')).toHaveLength(2);
  });

  it('una transferencia se titula "Transferencia" y dice de qué cuenta a cuál', () => {
    const cuentas = new Map([
      [1, { nombre: 'Día a día' }],
      [2, { nombre: 'Ahorro' }],
    ]);
    const base = {
      id: 5,
      gastoId: null,
      montoCentavos: 1_000,
      nota: null,
      fecha: '2026-11-15',
      creadoEn: '2026-11-15T09:00:00Z',
    } as const;

    const aporte = desdeMovimientoCuenta(
      { ...base, cuentaId: 2, contraparteId: 1, tipo: 'aporte' },
      undefined,
      cuentas,
    );
    expect(aporte.titulo).toBe('Transferencia');
    expect(aporte.detalle).toBe('De Día a día a Ahorro');
    expect(aporte.importe).toBe(1_000);

    const retiro = desdeMovimientoCuenta(
      { ...base, cuentaId: 2, contraparteId: 1, tipo: 'retiro', nota: 'Para el mes' },
      undefined,
      cuentas,
    );
    expect(retiro.detalle).toBe('De Ahorro a Día a día · Para el mes');
    expect(retiro.importe).toBe(-1_000);
  });
});
