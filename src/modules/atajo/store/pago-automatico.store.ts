import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CategoriaId } from '@/modules/categorias/categorias.types';

interface PagoAutomatico {
  /**
   * Categoría a la que van los pagos con Apple Pay, que llegan sin categoría.
   * `null`: aún no se eligió y se usa la primera de la lista.
   */
  categoriaWallet: CategoriaId | null;
  elegirCategoriaWallet: (categoria: CategoriaId) => void;
}

/**
 * Preferencia de cómo se registra un pago automático, no un dato financiero:
 * por eso vive en AsyncStorage y no en la base (igual que `ultimas-elecciones`).
 */
export const usePagoAutomatico = create<PagoAutomatico>()(
  persist(
    (set) => ({
      categoriaWallet: null,
      elegirCategoriaWallet: (categoria) => set({ categoriaWallet: categoria }),
    }),
    {
      name: 'atajo.pago-automatico',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * ¿Ya se leyó la preferencia guardada? Un pago con Apple Pay puede abrir la
 * app en frío: si se registrara antes de leerla, iría a la categoría
 * equivocada. Quien registra espera a que esto sea `true`.
 */
export function usePagoAutomaticoListo(): boolean {
  return useSyncExternalStore(
    (avisar) => usePagoAutomatico.persist.onFinishHydration(avisar),
    () => usePagoAutomatico.persist.hasHydrated(),
    () => false,
  );
}
