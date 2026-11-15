import type { ColorCategoria, NombreIcono } from '@/constants/categorias.constants';
import type { Centavos } from '@/lib/dinero';

export type CategoriaId = string;

export interface Categoria {
  id: CategoriaId;
  nombre: string;
  icono: NombreIcono;
  color: ColorCategoria;
  /** Posición en las listas, empezando en 0. */
  orden: number;
  /** Lo que me permito gastar al mes. Por quincena es la mitad. */
  limiteMensualCentavos: Centavos;
  /**
   * App del exterior (Uber, Apple…): al pagarla con tarjeta el banco cobra
   * además IVA e ISD. Ver `gastos/utils/impuestos-exterior.ts`.
   */
  delExterior?: boolean;
}

/** Lo que la persona escribe al crear o editar una categoría. */
export type DatosCategoria = Pick<
  Categoria,
  'nombre' | 'icono' | 'color' | 'limiteMensualCentavos' | 'delExterior'
>;

/**
 * Búsqueda de categorías ya cargadas. Las pantallas y las funciones puras
 * reciben ESTO y no la lista cruda: así nadie repite cómo se busca por id o
 * por nombre, ni qué pasa si una categoría ya no existe.
 */
export interface CatalogoCategorias {
  /** En el orden elegido por la persona. */
  lista: readonly Categoria[];
  /** Nunca falla: un id desconocido devuelve "Sin categoría". */
  porId(id: CategoriaId): Categoria;
  /** Por id, nombre o alias, sin importar tildes ni mayúsculas. */
  buscar(texto: string | undefined): Categoria | undefined;
}
