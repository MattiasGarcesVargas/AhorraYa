import type { Categoria, CategoriaId, DatosCategoria } from '../categorias.types';

export interface CategoriasRepository {
  /** En el orden elegido. */
  listar(): Promise<Categoria[]>;
  /** Se agrega al final de la lista. */
  crear(id: CategoriaId, datos: DatosCategoria): Promise<Categoria>;
  actualizar(id: CategoriaId, datos: DatosCategoria): Promise<void>;
  /** Guarda un orden nuevo: `ids` es la lista completa, de primera a última. */
  reordenar(ids: readonly CategoriaId[]): Promise<void>;
  /** Cuántos gastos usan la categoría (para saber si hay que moverlos antes de eliminar). */
  contarGastos(id: CategoriaId): Promise<number>;
  /**
   * Elimina la categoría. Si tiene gastos, se pasan a `moverGastosA` en la
   * MISMA transacción: nunca queda un gasto apuntando a una categoría que no
   * existe.
   */
  eliminar(id: CategoriaId, moverGastosA: CategoriaId | null): Promise<void>;
}
