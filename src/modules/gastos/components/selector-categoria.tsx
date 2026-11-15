import { Pressable, View } from 'react-native';

import { Icono, Texto } from '@/components/ui';
import { hapticos } from '@/lib/hapticos';
import type { Categoria, CategoriaId } from '@/modules/categorias/categorias.types';

export interface SelectorCategoriaProps {
  categorias: readonly Categoria[];
  valor: CategoriaId | null;
  alCambiar: (categoria: CategoriaId) => void;
}

/**
 * Ancho fijo de un tercio (menos los huecos) y SIN crecer: con 7 u 8
 * categorías la última fila queda alineada a la izquierda en vez de estirar
 * una casilla a todo el ancho.
 */
const CASILLA =
  'h-[68px] basis-[31.5%] items-center justify-center gap-1 rounded-lg px-1 active:opacity-80';

/** Rejilla de tres columnas: todas las categorías a la vista, sin abrir nada. */
export function SelectorCategoria({ categorias, valor, alCambiar }: SelectorCategoriaProps) {
  return (
    <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
      {categorias.map((categoria) => {
        const activa = valor === categoria.id;
        return (
          <Pressable
            key={categoria.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: activa }}
            accessibilityLabel={categoria.nombre}
            onPress={() => {
              hapticos.seleccion();
              alCambiar(categoria.id);
            }}
            className={`${CASILLA} ${activa ? 'bg-seleccion' : 'bg-superficie'}`}
          >
            <Icono
              nombre={categoria.icono}
              tamano={22}
              color={activa ? 'seleccion-icono' : 'texto'}
            />
            <Texto
              variante="detalle"
              peso="semibold"
              tono={activa ? 'seleccion' : 'normal'}
              numberOfLines={1}
            >
              {categoria.nombre}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}
