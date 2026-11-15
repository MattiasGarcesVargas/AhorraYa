import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { CLAVE_CUENTAS_RAIZ } from '@/lib/claves-consulta';
import type { Centavos } from '@/lib/dinero';
import { hoyIso, type FechaIso } from '@/lib/fechas';
import { CLAVE_GASTOS, useTotalesGastosPorCuenta } from '@/modules/gastos/hooks/use-gastos';
import { actualizarGasto, eliminarGasto } from '@/modules/gastos/services/registrar-gasto';
import { consumoDeCobrado } from '@/modules/gastos/utils/impuestos-exterior';
import { useTotalesIngresosPorCuenta } from '@/modules/ingresos/hooks/use-ingresos';
import { useRepositorios } from '@/providers/repositorios-context';

import type {
  CambiosMovimientoCuenta,
  Cuenta,
  NuevoMovimientoCuenta,
  TipoCuenta,
} from '../cuentas.types';
import { retirar, type DatosRetiro } from '../services/retiro-con-gasto';
import {
  calcularSaldos,
  cuentaPrincipal,
  totalizar,
  type SaldoCuenta,
  type TotalesCuentas,
} from '../utils/saldos';
import { ErrorCuentaInvalida, validarCuenta, type FormularioCuenta } from '../utils/validar-cuenta';

/** Raíz de las claves de cuentas: invalidarla refresca cuentas, tasas y movimientos. */
export const CLAVE_CUENTAS = CLAVE_CUENTAS_RAIZ;

export function useCuentas() {
  const { cuentas } = useRepositorios();
  return useQuery({ queryKey: [...CLAVE_CUENTAS, 'lista'], queryFn: () => cuentas.listar() });
}

export function useTasasCuentas() {
  const { cuentas } = useRepositorios();
  return useQuery({ queryKey: [...CLAVE_CUENTAS, 'tasas'], queryFn: () => cuentas.listarTasas() });
}

export function useMovimientosCuenta() {
  const { movimientosCuenta } = useRepositorios();
  return useQuery({
    queryKey: [...CLAVE_CUENTAS, 'movimientos'],
    queryFn: () => movimientosCuenta.listarTodos(),
  });
}

/** La cuenta que se propone por defecto de cada tipo (la primera de la lista). */
export function useCuentaPrincipal(tipo: TipoCuenta): Cuenta | undefined {
  const cuentas = useCuentas().data;
  return useMemo(() => (cuentas ? cuentaPrincipal(cuentas, tipo) : undefined), [cuentas, tipo]);
}

/**
 * El saldo de cada cuenta HOY, con su interés, y los totales. COMPONE lo de
 * tres módulos (movimientos de cuenta, gastos e ingresos): cada uno sigue
 * siendo dueño de sus datos.
 */
export function useSaldosCuentas(): {
  saldos?: SaldoCuenta[];
  totales?: TotalesCuentas;
  cargando: boolean;
} {
  const cuentas = useCuentas().data;
  const tasas = useTasasCuentas().data;
  const movimientos = useMovimientosCuenta().data;
  const gastosPorDia = useTotalesGastosPorCuenta().data;
  const ingresosPorDia = useTotalesIngresosPorCuenta().data;
  const hoy = hoyIso();

  const saldos = useMemo(() => {
    if (!cuentas || !tasas || !movimientos || !gastosPorDia || !ingresosPorDia) return undefined;
    return calcularSaldos(cuentas, { movimientos, gastosPorDia, ingresosPorDia, tasas }, hoy);
  }, [cuentas, tasas, movimientos, gastosPorDia, ingresosPorDia, hoy]);

  const totales = useMemo(() => (saldos ? totalizar(saldos) : undefined), [saldos]);

  return { saldos, totales, cargando: saldos === undefined };
}

export function useSaldoCuenta(id: number | undefined): SaldoCuenta | undefined {
  const { saldos } = useSaldosCuentas();
  return useMemo(() => saldos?.find((saldo) => saldo.cuenta.id === id), [saldos, id]);
}

function useInvalidarCuentas() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CLAVE_CUENTAS });
}

export interface GuardadoCuenta {
  /** Sin `id` se crea. */
  id?: number;
  formulario: FormularioCuenta;
  /** Al crear: lo que hay hoy en la cuenta. */
  saldoInicialCentavos?: Centavos;
}

/** Crea o actualiza una cuenta y, si cambió, deja la tasa nueva vigente desde hoy. */
export function useGuardarCuenta() {
  const { cuentas, movimientosCuenta } = useRepositorios();
  const invalidar = useInvalidarCuentas();

  return useMutation({
    mutationFn: async ({ id, formulario, saldoInicialCentavos }: GuardadoCuenta) => {
      // Se valida contra lo que hay en la base AHORA, no contra lo que tenía la pantalla.
      const resultado = validarCuenta(formulario, await cuentas.listar(), id);
      if (!resultado.ok) throw new ErrorCuentaInvalida(resultado.errores);

      const hoy = hoyIso();
      const cuentaId = id ?? (await cuentas.crear(resultado.datos)).id;
      if (id) await cuentas.actualizar(id, resultado.datos);

      const tasas = (await cuentas.listarTasas()).filter((tasa) => tasa.cuentaId === cuentaId);
      const vigente = tasas.at(-1)?.tasaBp ?? 0;
      if (vigente !== resultado.tasaBp)
        await cuentas.establecerTasa(cuentaId, hoy, resultado.tasaBp);

      if (!id && saldoInicialCentavos && saldoInicialCentavos > 0) {
        await movimientosCuenta.establecerSaldoInicial(cuentaId, saldoInicialCentavos, hoy);
      }
      return cuentaId;
    },
    onSuccess: invalidar,
  });
}

export function useEliminarCuenta() {
  const { cuentas } = useRepositorios();
  const invalidar = useInvalidarCuentas();
  return useMutation({ mutationFn: (id: number) => cuentas.eliminar(id), onSuccess: invalidar });
}

/** Cuántos registros tiene una cuenta: con alguno, no se puede eliminar. */
export function useCantidadRegistrosCuenta(id: number | undefined) {
  const { cuentas } = useRepositorios();
  return useQuery({
    queryKey: [...CLAVE_CUENTAS, 'registros', id],
    queryFn: () => cuentas.contarRegistros(id as number),
    enabled: id !== undefined,
  });
}

function validarImporte(montoCentavos: Centavos, conSigno = false) {
  const valido =
    Number.isInteger(montoCentavos) && (conSigno ? montoCentavos !== 0 : montoCentavos > 0);
  if (!valido) throw new Error('El importe tiene que ser mayor que cero.');
}

export function useRegistrarMovimientoCuenta() {
  const { movimientosCuenta } = useRepositorios();
  const invalidar = useInvalidarCuentas();

  return useMutation({
    mutationFn: (movimiento: NuevoMovimientoCuenta) => {
      validarImporte(movimiento.montoCentavos, movimiento.tipo === 'ajuste');
      return movimientosCuenta.registrar(movimiento);
    },
    onSuccess: invalidar,
  });
}

export function useMovimientoCuenta(id: number | undefined) {
  const { movimientosCuenta } = useRepositorios();
  return useQuery({
    queryKey: [...CLAVE_CUENTAS, 'movimiento', id],
    queryFn: () => movimientosCuenta.obtener(id as number),
    enabled: id !== undefined,
  });
}

/**
 * Corrige un movimiento. Si es un retiro que registró un gasto, el gasto se
 * corrige con él en la misma operación.
 */
export function useActualizarMovimientoCuenta() {
  const repos = useRepositorios();
  const { movimientosCuenta, gastos, transaccion } = repos;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, cambios }: { id: number; cambios: CambiosMovimientoCuenta }) =>
      transaccion(async () => {
        const actual = await movimientosCuenta.obtener(id);
        if (!actual) throw new Error('Ese movimiento ya no existe.');
        validarImporte(cambios.montoCentavos, actual.tipo === 'ajuste');
        await movimientosCuenta.actualizar(id, cambios);

        const gasto = actual.gastoId === null ? null : await gastos.obtener(actual.gastoId);
        if (gasto) {
          // El retiro vale lo que cobró el banco. Si el gasto lleva impuestos,
          // el consumo es la parte que, con ellos, da ese total.
          const conImpuestos = (await gastos.listarHijos(gasto.id)).length > 0;
          await actualizarGasto(repos, gasto.id, {
            montoCentavos: conImpuestos
              ? consumoDeCobrado(cambios.montoCentavos)
              : cambios.montoCentavos,
            categoria: gasto.categoria,
            metodoPago: gasto.metodoPago,
            cuentaId: gasto.cuentaId,
            nota: gasto.nota,
            fecha: cambios.fecha,
          });
        }
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CUENTAS });
      await queryClient.invalidateQueries({ queryKey: CLAVE_GASTOS });
    },
  });
}

/** Elimina un movimiento y, si es un retiro que registró un gasto, también ese gasto. */
export function useEliminarMovimientoCuenta() {
  const repos = useRepositorios();
  const { movimientosCuenta, transaccion } = repos;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      transaccion(async () => {
        const actual = await movimientosCuenta.obtener(id);
        if (!actual) return;
        await movimientosCuenta.eliminar(id);
        if (actual.gastoId !== null) await eliminarGasto(repos, actual.gastoId);
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CUENTAS });
      await queryClient.invalidateQueries({ queryKey: CLAVE_GASTOS });
    },
  });
}

export function useEstablecerSaldoInicial() {
  const { movimientosCuenta } = useRepositorios();
  const invalidar = useInvalidarCuentas();
  return useMutation({
    mutationFn: ({ cuentaId, montoCentavos }: { cuentaId: number; montoCentavos: Centavos }) =>
      movimientosCuenta.establecerSaldoInicial(cuentaId, montoCentavos, hoyIso()),
    onSuccess: invalidar,
  });
}

/**
 * "Cuadrar con el banco": se escribe el saldo que muestra el banco y la
 * diferencia con el de la app queda anotada como un ajuste de hoy. Si ya
 * coinciden, no se registra nada.
 */
export function useCuadrarCuenta() {
  const { movimientosCuenta } = useRepositorios();
  const invalidar = useInvalidarCuentas();

  return useMutation({
    mutationFn: async ({
      cuentaId,
      saldoApp,
      saldoBanco,
      fecha = hoyIso(),
    }: {
      cuentaId: number;
      saldoApp: Centavos;
      saldoBanco: Centavos;
      fecha?: FechaIso;
    }) => {
      const diferencia = saldoBanco - saldoApp;
      if (diferencia === 0) return null;
      return movimientosCuenta.registrar({
        cuentaId,
        contraparteId: null,
        gastoId: null,
        tipo: 'ajuste',
        montoCentavos: diferencia,
        nota: 'Cuadre con el saldo del banco',
        fecha,
      });
    },
    onSuccess: invalidar,
  });
}

/** Retiro de una cuenta, con su gasto si se indica para qué fue. Todo o nada. */
export function useRetirar() {
  const { gastos, movimientosCuenta, categorias, transaccion } = useRepositorios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (datos: DatosRetiro) =>
      transaccion(() => retirar({ gastos, movimientosCuenta, categorias }, datos)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CUENTAS });
      await queryClient.invalidateQueries({ queryKey: CLAVE_GASTOS });
    },
  });
}
