import { StyleSheet, View } from 'react-native';

/** Línea de un píxel físico entre filas. `sangria` la alinea con el texto, no con el icono. */
export function Separador({ sangria = 0, tinta = false }: { sangria?: number; tinta?: boolean }) {
  return (
    <View
      className={tinta ? 'bg-tinta-borde' : 'bg-borde'}
      style={{ height: StyleSheet.hairlineWidth, marginLeft: sangria }}
    />
  );
}
