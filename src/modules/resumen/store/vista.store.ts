import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { TipoPeriodo } from '@/lib/periodos';

interface VistaResumen {
  /** El plan se vive por quincena; el mes queda a un toque. Se recuerda la última elección. */
  tipoPeriodo: TipoPeriodo;
  cambiarTipoPeriodo: (tipo: TipoPeriodo) => void;
}

export const useVistaResumen = create<VistaResumen>()(
  persist(
    (set) => ({
      tipoPeriodo: 'quincena',
      cambiarTipoPeriodo: (tipoPeriodo) => set({ tipoPeriodo }),
    }),
    { name: 'resumen.vista', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
