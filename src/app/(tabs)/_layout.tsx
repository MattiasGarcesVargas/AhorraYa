import { DynamicColorIOS, type ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { BarraPestanas } from '@/components/barra-pestanas';
import type { NombreIcono } from '@/constants/categorias.constants';
import { USA_PESTANAS_NATIVAS } from '@/constants/layout.constants';
import { PALETAS } from '@/constants/tema.constants';

/**
 * Dos barras según lo que ofrezca el sistema:
 * - iOS con Liquid Glass → pestañas NATIVAS: el cristal lo dibuja UIKit.
 * - Resto (Android, web, iOS < 26) → pestañas de JavaScript con barra propia.
 * Las rutas son las mismas y en el mismo orden en las dos.
 */
export default function PestanasLayout() {
  return USA_PESTANAS_NATIVAS ? <PestanasNativas /> : <PestanasPropias />;
}

function PestanasNativas() {
  return (
    <NativeTabs
      tintColor={DynamicColorIOS({ light: PALETAS.claro.primario, dark: PALETAS.oscuro.primario })}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md={{ default: 'home', selected: 'home' }}
        />
        <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="movimientos">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'list.bullet.rectangle', selected: 'list.bullet.rectangle.fill' }}
          md={{ default: 'receipt_long', selected: 'receipt_long' }}
        />
        <NativeTabs.Trigger.Label>Movimientos</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cuentas">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'banknote', selected: 'banknote.fill' }}
          md={{ default: 'savings', selected: 'savings' }}
        />
        <NativeTabs.Trigger.Label>Cuentas</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ajustes">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          md={{ default: 'settings', selected: 'settings' }}
        />
        <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/** Icono relleno en la activa y de contorno en el resto, como en SF Symbols. */
function icono(relleno: NombreIcono, contorno: NombreIcono) {
  function IconoPestana({
    focused,
    color,
    size,
  }: {
    focused: boolean;
    color: ColorValue;
    size: number;
  }) {
    // En RN 0.88 `ColorValue` también admite número y `null`; el icono sólo
    // texto. La barra propia siempre pasa un hex, así que basta con filtrar.
    return (
      <Ionicons
        name={focused ? relleno : contorno}
        size={size}
        color={typeof color === 'string' ? color : undefined}
      />
    );
  }
  return IconoPestana;
}

function PestanasPropias() {
  return (
    <Tabs
      tabBar={(props) => <BarraPestanas {...props} />}
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: icono('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="movimientos"
        options={{ title: 'Movimientos', tabBarIcon: icono('receipt', 'receipt-outline') }}
      />
      <Tabs.Screen
        name="cuentas"
        options={{ title: 'Cuentas', tabBarIcon: icono('wallet', 'wallet-outline') }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{ title: 'Ajustes', tabBarIcon: icono('settings', 'settings-outline') }}
      />
    </Tabs>
  );
}
