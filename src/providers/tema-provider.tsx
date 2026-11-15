import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { vars } from 'nativewind';

import { PALETAS, variablesCss, type ModoTema, type Paleta } from '@/constants/tema.constants';

interface Tema {
  modo: ModoTema;
  /** Los mismos colores que usan las clases, en hex, para SVG e iconos. */
  colores: Paleta;
}

const TemaContext = createContext<Tema>({ modo: 'claro', colores: PALETAS.claro });

/**
 * Sigue el modo del sistema (claro/oscuro) e inyecta la paleta como variables
 * CSS en la raíz: todas las clases (`bg-fondo`, `text-primario/50`) se
 * resuelven contra ellas, así que cambiar de modo no obliga a ninguna pantalla
 * a saber en qué modo está.
 */
export function TemaProvider({ children }: { children: ReactNode }) {
  const esquema = useColorScheme();
  const modo: ModoTema = esquema === 'dark' ? 'oscuro' : 'claro';

  const valor = useMemo<Tema>(() => ({ modo, colores: PALETAS[modo] }), [modo]);
  const variables = useMemo(() => vars(variablesCss(PALETAS[modo])), [modo]);

  return (
    <TemaContext.Provider value={valor}>
      <View style={[estilos.raiz, variables]}>{children}</View>
    </TemaContext.Provider>
  );
}

export function useTema(): Tema {
  return useContext(TemaContext);
}

const estilos = StyleSheet.create({ raiz: { flex: 1 } });
