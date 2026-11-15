import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { CLAVE_CUENTAS_RAIZ, CLAVE_INGRESOS_RAIZ } from '@/lib/claves-consulta';
import type { Centavos } from '@/lib/dinero';
import type { FechaIso } from '@/lib/fechas';
import { useRepositorios } from '@/providers/repositorios-context';

import { tipoIngresoPorId, type NuevoIngreso } from '../ingresos.types';

export const CLAVE_INGRESOS = CLAVE_INGRESOS_RAIZ;

export function useIngresosEntre(desde: FechaIso, hasta: FechaIso) {
  const { ingresos } = useRepositorios();
  return useQuery({
    queryKey: [...CLAVE_INGRESOS, desde, hasta],
    queryFn: () => ingresos.listarEntre(desde, hasta),
  });
}

/** Lo recibido en cada cuenta, por día. Cuelga de la clave de ingresos. */
export function useTotalesIngresosPorCuenta() {
  const { ingresos } = useRepositorios();
  return useQuery({
    queryKey: [...CLAVE_INGRESOS, 'por-cuenta'],
    queryFn: () => ingresos.totalesPorCuenta(),
  });
}

export function useIngreso(id: number | undefined) {
  const { ingresos } = useRepositorios();
  return useQuery({
    queryKey: [...CLAVE_INGRESOS, 'uno', id],
    queryFn: () => ingresos.obtener(id as number),
    enabled: id !== undefined,
  });
}

function validarImporte(montoCentavos: Centavos) {
  if (!Number.isInteger(montoCentavos) || montoCentavos <= 0) {
    throw new Error('El importe tiene que ser mayor que cero.');
  }
}

export interface RegistroIngreso {
  ingreso: NuevoIngreso;
  /**
   * "Págate primero": la parte de este ingreso que pasa al ahorro apenas
   * llega. Entra como un aporte a `cuentaAhorroId`, con la misma fecha, que
   * sale de la cuenta a la que llegó el ingreso. 0 = no se aparta nada.
   */
  alAhorroCentavos: Centavos;
  cuentaAhorroId: number | null;
}

export function useRegistrarIngreso() {
  const { ingresos, movimientosCuenta, transaccion } = useRepositorios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ingreso, alAhorroCentavos, cuentaAhorroId }: RegistroIngreso) => {
      validarImporte(ingreso.montoCentavos);
      if (alAhorroCentavos > ingreso.montoCentavos) {
        throw new Error('No puedes apartar más de lo que entró.');
      }

      return transaccion(async () => {
        const registrado = await ingresos.registrar(ingreso);
        if (alAhorroCentavos > 0 && cuentaAhorroId !== null) {
          await movimientosCuenta.registrar({
            cuentaId: cuentaAhorroId,
            contraparteId: ingreso.cuentaId,
            gastoId: null,
            tipo: 'aporte',
            montoCentavos: alAhorroCentavos,
            nota: `${tipoIngresoPorId(ingreso.tipo).nombre} al ahorro`,
            fecha: ingreso.fecha,
            // Sólo lo apartado del sueldo cumple el aporte del cobro; lo demás
            // es un extra que suma a la meta del mes.
            origen: ingreso.tipo === 'sueldo' ? 'sueldo' : 'extra',
          });
        }
        return registrado;
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_INGRESOS });
      await queryClient.invalidateQueries({ queryKey: CLAVE_CUENTAS_RAIZ });
    },
  });
}

export function useActualizarIngreso() {
  const { ingresos } = useRepositorios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, cambios }: { id: number; cambios: NuevoIngreso }) => {
      validarImporte(cambios.montoCentavos);
      return ingresos.actualizar(id, cambios);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_INGRESOS }),
  });
}

export function useEliminarIngreso() {
  const { ingresos } = useRepositorios();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ingresos.eliminar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_INGRESOS }),
  });
}
