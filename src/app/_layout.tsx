import '@/global.css';

import { useEffect, useMemo } from 'react';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { PantallaCarga } from '@/components/pantalla-carga';
import { useDevolucionIsd } from '@/modules/gastos/hooks/use-devolucion-isd';
import { useMesadaAutomatica } from '@/modules/ingresos/hooks/use-mesada-automatica';
import { useCobroSuscripciones } from '@/modules/suscripciones/hooks/use-cobro-suscripciones';
import { AppProviders } from '@/providers/app-providers';
import { useTema } from '@/providers/tema-provider';

void SplashScreen.preventAutoHideAsync();

/**
 * Las pestañas son SIEMPRE la base de la pila. Así, cuando el atajo abre la
 * app en frío directo en `/registrar`, debajo de la confirmación ya está el
 * inicio y cerrarla vuelve ahí en vez de a una pantalla vacía.
 */
export const unstable_settings = { initialRouteName: '(tabs)' };

function Navegacion() {
  const { modo, colores } = useTema();
  // En este orden: un cobro atrasado de una suscripción del exterior deja su
  // ISD listo para que la devolución lo recoja en la misma pasada.
  useMesadaAutomatica();
  useCobroSuscripciones();
  useDevolucionIsd();

  // Se oculta aquí, dentro de los proveedores: este componente sólo se monta
  // cuando la base ya está abierta y migrada. Antes, el splash tapa; después,
  // `PantallaCarga` (idéntica) toma el relevo y se desvanece.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  const temaNavegacion = useMemo(() => {
    const base = modo === 'oscuro' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colores.primario,
        background: colores.fondo,
        card: colores.fondo,
        text: colores.texto,
        border: colores.borde,
      },
    };
  }, [modo, colores]);

  return (
    <ThemeProvider value={temaNavegacion}>
      <StatusBar style={modo === 'oscuro' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo } }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="nuevo-gasto" options={{ presentation: 'modal' }} />
        <Stack.Screen name="nuevo-ingreso" options={{ presentation: 'modal' }} />
        <Stack.Screen name="movimiento-cuenta" options={{ presentation: 'modal' }} />
        <Stack.Screen name="editar-cuenta" options={{ presentation: 'modal' }} />
        <Stack.Screen name="cuenta/[id]" />
        <Stack.Screen name="editar-plan" options={{ presentation: 'modal' }} />
        <Stack.Screen name="categoria" options={{ presentation: 'modal' }} />
        <Stack.Screen name="categorias" />
        <Stack.Screen name="suscripcion" options={{ presentation: 'modal' }} />
        <Stack.Screen name="suscripciones" />
        <Stack.Screen name="editar-frecuencia" options={{ presentation: 'modal' }} />
        <Stack.Screen name="estado-cuenta" />
        <Stack.Screen name="atajo" />
        <Stack.Screen
          name="registrar"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack>
      <PantallaCarga />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fuentesListas, errorFuentes] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  // Si las fuentes fallan se sigue con la del sistema: mejor eso que no abrir.
  if (!fuentesListas && !errorFuentes) return null;

  return (
    <AppProviders>
      <Navegacion />
    </AppProviders>
  );
}
