import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { EstadoVacio } from '@/components/estado-vacio';

/** Un enlace mal escrito en el atajo cae aquí en vez de en una pantalla en blanco. */
export default function NoEncontradaScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 justify-center bg-fondo px-6">
      <EstadoVacio
        icono="compass-outline"
        titulo="Esta pantalla no existe"
        mensaje="Si llegaste desde el atajo, revisa que el enlace empiece por ahorraya://registrar."
        accion={{ texto: 'Ir al inicio', alPulsar: () => router.replace('/') }}
      />
    </View>
  );
}
