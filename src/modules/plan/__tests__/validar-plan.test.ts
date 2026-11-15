import { PLAN_INICIAL } from '@/constants/plan.constants';

import type { Plan } from '../plan.types';
import { ingresoMensualEstimado } from '../utils/calculos-plan';
import {
  aporteSugerido,
  cambiosAlCambiarFrecuencia,
  periodosDeCobroHaciaAtras,
} from '../utils/frecuencia';
import { aplicarCambiosPlan, validarCambiosPlan, validarPlan } from '../utils/validar-plan';

const plan = (cambios: Partial<Plan> = {}): Plan => ({ ...PLAN_INICIAL, ...cambios });

describe('validarPlan', () => {
  it('el plan inicial cuadra: 2 × $250 = $500', () => {
    expect(validarPlan(plan())).toEqual({ ok: true });
  });

  it('rechaza 2 cobros de $350 con meta de $500, y dice los números', () => {
    const resultado = validarPlan(plan({ aporteQuincenalCentavos: 35_000 }));
    expect(resultado).toMatchObject({
      ok: false,
      motivo: 'Con 2 cobros de $ 350 serían $ 700 y tu meta es $ 500.',
      sugerencia: 'Baja el aporte por cobro a $ 250 o sube la meta a $ 700.',
    });
  });

  it('con cobro mensual acepta un aporte de $500 para una meta de $500', () => {
    const mensual = plan({
      cobrosPorMes: 1,
      aporteQuincenalCentavos: 50_000,
      sueldoQuincenalCentavos: 70_000,
    });
    expect(validarPlan(mensual)).toEqual({ ok: true });
    expect(validarPlan({ ...mensual, aporteQuincenalCentavos: 50_001 }).ok).toBe(false);
  });

  it('rechaza una meta mayor que lo que entra al mes', () => {
    // 2 × $350 + ~$130 de mesada = $830.
    expect(ingresoMensualEstimado(plan())).toBe(83_000);
    const resultado = validarPlan(plan({ metaMensualCentavos: 90_000 }));
    expect(resultado).toMatchObject({
      ok: false,
      motivo: 'Tu meta es $ 900 y al mes te entran unos $ 830.',
    });
    expect(validarPlan(plan({ metaMensualCentavos: 83_000 })).ok).toBe(true);
  });
});

describe('validarCambiosPlan', () => {
  it('valida el plan que quedaría, no el cambio suelto', () => {
    expect(validarCambiosPlan(plan(), { aporteQuincenalCentavos: 35_000 }).ok).toBe(false);
    expect(validarCambiosPlan(plan(), { metaMensualCentavos: 40_000 }).ok).toBe(false);
    expect(validarCambiosPlan(plan(), { aporteQuincenalCentavos: 20_000 }).ok).toBe(true);
  });

  it('un plan que ya venía descuadrado se puede corregir campo por campo', () => {
    const roto = plan({ aporteQuincenalCentavos: 50_000, metaMensualCentavos: 90_000 });
    // Bajar el aporte arregla su regla aunque la meta siga por encima del ingreso.
    expect(validarCambiosPlan(roto, { aporteQuincenalCentavos: 25_000 }).ok).toBe(true);
    // Pero no se acepta dejar roto lo que se está editando.
    expect(validarCambiosPlan(roto, { aporteQuincenalCentavos: 46_000 }).ok).toBe(false);
  });
});

describe('cambio de frecuencia', () => {
  it('propone aporte = meta ÷ cobros y conserva el ingreso del mes', () => {
    const cambios = cambiosAlCambiarFrecuencia(plan(), 1);
    expect(cambios).toEqual({
      cobrosPorMes: 1,
      aporteQuincenalCentavos: 50_000,
      sueldoQuincenalCentavos: 70_000,
    });
    expect(validarCambiosPlan(plan(), cambios)).toEqual({ ok: true });

    const mensual = aplicarCambiosPlan(plan(), cambios);
    expect(aplicarCambiosPlan(mensual, cambiosAlCambiarFrecuencia(mensual, 2))).toEqual(plan());
  });

  it('sin cambio de frecuencia no propone nada', () => {
    expect(cambiosAlCambiarFrecuencia(plan(), 2)).toEqual({});
  });

  it('el aporte sugerido nunca pasa de la meta', () => {
    expect(aporteSugerido(50_001, 2)).toBe(25_000);
  });

  it('con cobro mensual los periodos de cobro son meses', () => {
    expect(periodosDeCobroHaciaAtras(1, '2026-11-20', 2)).toEqual([
      { tipo: 'mes', inicio: '2026-11-01', fin: '2026-11-30' },
      { tipo: 'mes', inicio: '2026-10-01', fin: '2026-10-31' },
    ]);
    expect(periodosDeCobroHaciaAtras(2, '2026-11-20', 1)[0]).toMatchObject({
      tipo: 'quincena',
      inicio: '2026-11-15',
    });
  });
});
