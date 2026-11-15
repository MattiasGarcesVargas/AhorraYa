/** Operaciones sobre TODOS los datos a la vez. */
export interface DatosRepository {
  /**
   * Borra gastos, ingresos y movimientos de cuentas, y devuelve el plan, las
   * categorías y las cuentas a los valores iniciales.
   */
  borrarTodo(): Promise<void>;
}
