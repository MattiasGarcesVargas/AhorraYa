import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SQLiteProvider } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { migrar, NOMBRE_BASE_DE_DATOS } from '@/lib/db/base-de-datos';

import { RepositoriosProvider } from './repositorios-provider';
import { TemaProvider } from './tema-provider';

function crearQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Los datos son locales y sólo cambian cuando YO registro algo, y cada
        // registro invalida su clave. No hace falta revalidar por tiempo.
        staleTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  // El QueryClient se crea una vez por montaje, no en cada render.
  const [queryClient] = useState(crearQueryClient);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TemaProvider>
          <SQLiteProvider databaseName={NOMBRE_BASE_DE_DATOS} onInit={migrar}>
            <RepositoriosProvider>
              <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            </RepositoriosProvider>
          </SQLiteProvider>
        </TemaProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
