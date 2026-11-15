import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { MetodoPagoId } from '@/constants/metodos-pago.constants';

interface UltimasElecciones {
  /** Casi siempre se paga igual que la última vez: se preselecciona. */
  ultimoMetodo: MetodoPagoId;
  recordarMetodo: (metodo: MetodoPagoId) => void;
}

/**
 * Preferencia de interfaz, no dato financiero: por eso vive en AsyncStorage y
 * no en la base. La CATEGORÍA no se recuerda a propósito: preseleccionarla
 * haría fácil registrar la comida como transporte sin darse cuenta.
 */
export const useUltimasElecciones = create<UltimasElecciones>()(
  persist(
    (set) => ({
      ultimoMetodo: 'efectivo',
      recordarMetodo: (metodo) => set({ ultimoMetodo: metodo }),
    }),
    {
      name: 'gastos.ultimas-elecciones',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
