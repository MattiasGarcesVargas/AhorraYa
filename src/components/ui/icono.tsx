import { Ionicons } from '@expo/vector-icons';

import type { NombreIcono } from '@/constants/categorias.constants';
import type { NombreToken } from '@/constants/tema.constants';
import { useTema } from '@/providers/tema-provider';

export interface IconoProps {
  nombre: NombreIcono;
  tamano?: number;
  /** Token de la paleta, no un hex: así el icono sigue al modo claro/oscuro. */
  color?: NombreToken;
}

export function Icono({ nombre, tamano = 20, color = 'texto' }: IconoProps) {
  const { colores } = useTema();
  return <Ionicons name={nombre} size={tamano} color={colores[color]} />;
}
