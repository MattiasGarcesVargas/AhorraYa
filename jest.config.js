/**
 * Los tests cubren el DOMINIO (cálculos de dinero, quincenas, presupuesto,
 * enlaces del atajo): funciones puras que no tocan React Native. Por eso basta
 * con el preset de jest-expo y no hace falta montar pantallas.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
