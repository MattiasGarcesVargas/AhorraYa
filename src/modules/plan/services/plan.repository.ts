import type { CambiosPlan, Plan } from '../plan.types';

/** Las cifras del plan. Los límites por categoría viven en el módulo de categorías. */
export interface PlanRepository {
  obtener(): Promise<Plan>;
  /** Guarda los campos indicados; todos juntos o ninguno. */
  actualizar(cambios: CambiosPlan): Promise<void>;
}
