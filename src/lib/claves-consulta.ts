/**
 * Raíces de las claves de React Query que más de un módulo necesita invalidar.
 * Viven aquí, y no en el hook de su módulo, para que dos módulos que se
 * afectan entre sí (un gasto mueve el saldo de una cuenta, y un retiro crea un
 * gasto) no tengan que importarse en círculo.
 */
export const CLAVE_CUENTAS_RAIZ = ['cuentas'] as const;
export const CLAVE_INGRESOS_RAIZ = ['ingresos'] as const;
