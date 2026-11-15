import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { CLAVE_CUENTAS_RAIZ } from '@/lib/claves-consulta';
import { hapticos } from '@/lib/hapticos';
import { eliminarGasto } from '@/modules/gastos/services/registrar-gasto';
import { CLAVE_GASTOS } from '@/modules/gastos/hooks/use-gastos';
import type { Gasto, NuevoGasto } from '@/modules/gastos/gastos.types';
import { useRepositorios } from '@/providers/repositorios-context';

import { registrarSinDuplicar } from '../services/registrar-sin-duplicar';

export type EstadoRegistro =
  | { fase: 'guardando' }
  | { fase: 'listo'; gasto: Gasto; impuestos: Gasto[]; duplicado: boolean }
  | { fase: 'deshecho' }
  | { fase: 'error'; mensaje: string };

/**
 * Registra el gasto que trae el enlace UNA sola vez por montaje, aunque la
 * pantalla se vuelva a pintar (la ref lo impide) o el enlace se abra dos
 * veces (lo impide `registrarSinDuplicar`).
 */
export function useRegistroDesdeAtajo(gasto: NuevoGasto, saleDelAhorro = false) {
  const repos = useRepositorios();
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<EstadoRegistro>({ fase: 'guardando' });
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;

    repos
      .transaccion(() => registrarSinDuplicar(repos, gasto, new Date(), { saleDelAhorro }))
      .then(async (resultado) => {
        await queryClient.invalidateQueries({ queryKey: CLAVE_GASTOS });
        await queryClient.invalidateQueries({ queryKey: CLAVE_CUENTAS_RAIZ });
        hapticos.exito();
        setEstado({ fase: 'listo', ...resultado });
      })
      .catch(() => setEstado({ fase: 'error', mensaje: 'No se pudo registrar el gasto.' }));
  }, [repos, gasto, saleDelAhorro, queryClient]);

  const deshacer = async () => {
    if (estado.fase !== 'listo') return;
    const { id } = estado.gasto;
    // Se van también sus impuestos, si era de una app del exterior.
    await repos.transaccion(() => eliminarGasto(repos, id));
    await queryClient.invalidateQueries({ queryKey: CLAVE_GASTOS });
    await queryClient.invalidateQueries({ queryKey: CLAVE_CUENTAS_RAIZ });
    hapticos.aviso();
    setEstado({ fase: 'deshecho' });
  };

  return { estado, deshacer };
}
