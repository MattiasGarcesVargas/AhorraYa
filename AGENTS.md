This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Convenciones de AhorraYa

- **Idioma**: código, comentarios y UI en español.
- **Estructura**: la misma de `app-pulsocont`. Rutas delgadas en `src/app`; la lógica vive en
  `src/modules/<modulo>/{components,hooks,services,store,schema,utils}` (vertical slices).
  Un módulo puede usar los hooks/tipos públicos de otro, nunca sus servicios SQLite.
- **Persistencia**: cada módulo define una interfaz `*Repository` y su `*.sqlite.ts`. Sólo
  `providers/repositorios-provider.tsx` conecta implementaciones. Las migraciones van en
  `src/lib/db/migraciones.ts`: NUNCA se edita una publicada, se agrega otra al final.
- **Dinero**: siempre en centavos enteros (`lib/dinero.ts`). Formato `$ 1,234.50` (coma miles,
  punto decimales) y sólo desde `lib/format.ts`; ninguna pantalla usa `toLocaleString`.
- **Fechas**: días como texto `yyyy-MM-dd` (`lib/fechas.ts`). Quincenas de pago a pago (15 y
  último día) en `lib/periodos.ts`.
- **Colores**: sólo tokens (`bg-primario`, `text-texto-suave`…) definidos en
  `constants/tema.constants.ts`; para SVG/iconos, `useTema().colores`. Nada de hex sueltos.
- **NativeWind + React Compiler**: si un componente recibe `className`, su `style` debe ser un
  OBJETO, no un arreglo. En web NativeWind hace `push` dentro del arreglo y, como el compilador
  lo reutiliza entre renders, las clases se acumulan (ver `components/ui/texto.tsx`).
- **Categorías**: viven en la tabla `categorias` (migración 2), no en el código.
  `constants/categorias.constants.ts` sólo siembra las iniciales. Para mostrar una categoría usa
  el catálogo (`useCatalogoCategorias().porId(id)`), que nunca falla. Eliminar SIEMPRE mueve
  antes los gastos (`CategoriasRepository.eliminar(id, moverGastosA)`).
- **Cuentas**: la plata vive en cuentas (`modules/cuentas`): `diaria` (día a día) y `flexible`
  (ahorro con interés). `movimientos_cuenta` guarda aportes, retiros, saldo inicial y ajustes;
  gastos e ingresos llevan `cuenta_id` (null = no toca cuentas). El interés NO se guarda: se
  calcula en `cuentas/utils/interes.ts` (saldo × tasa ÷ 365, diario) con el historial
  `tasas_cuenta`. Saldos en `utils/saldos.ts`, debe/haber en `utils/libro.ts`. El módulo `ahorro`
  es sólo la meta y lee las cuentas flexibles. Un retiro puede crear su gasto (enlazados por
  `gasto_id`, ver `services/retiro-con-gasto.ts`); lo que escribe en dos repositorios va dentro
  de `Repositorios.transaccion`. `movimientos_ahorro` es un respaldo viejo: no se usa.
- **Mesada automática**: `ingresos/services/mesada-automatica.ts` acredita cada lunes al abrir la
  app; la tabla `marcas` recuerda hasta qué día.
- **Apple Pay**: `/registrar?origen=wallet&monto=…&nota=…` registra en débito con la categoría
  de `atajo/store/pago-automatico.store.ts`.
- **Exportar archivos**: `modules/estado-cuenta/services/exportador-archivos.ts` (PDF con
  expo-print + menú de compartir) y su `.web.ts`. El HTML del PDF escapa todo texto del usuario.
- **Marca**: `assets/images/` tiene `icon.png` (icono de la app), `logo.png` (glifo de un color,
  se tiñe con el token `marca` vía `components/ui/logo.tsx`) y `splash-logo*.png` (splash nativo
  claro/oscuro). `components/pantalla-carga.tsx` repite el splash y se desvanece. El PDF incrusta
  el logo en base64 (`estado-cuenta/utils/logo-estado-cuenta.ts`): regenerarlo si cambia el logo.
- **Tests**: la lógica de dominio (funciones puras, casos de uso con repositorio en memoria) va
  con test en `__tests__/`. Antes de dar algo por terminado: `npm run typecheck`,
  `npm run lint`, `npm test`.

## Apps del exterior, suscripciones y tareas automáticas

- **Un gasto se crea SIEMPRE con `registrarGasto`** (`modules/gastos/services/registrar-gasto.ts`),
  y se corrige o elimina con `actualizarGasto` / `eliminarGasto`. Si la categoría tiene
  `delExterior` y se paga con débito o crédito, crean además el IVA (15 %) y el ISD (5 %) como
  gastos hijos (`gastoPadreId`, `impuesto`). Los hijos no se editan: viven y mueren con su consumo.
- El ISD se devuelve solo al día siguiente (`registrarDevolucionesIsd` → ingreso `reembolso`
  enlazado por `gastoId`). El ISD y su devolución mueven el saldo de la cuenta pero no cuentan
  en el presupuesto ni en los ingresos (`cuentaEnPresupuesto`, `esDevolucionIsd`).
- Suscripciones (`modules/suscripciones`): se cobran solas el día fijado, también con `registrarGasto`.
- Tareas al abrir la app (en `app/_layout.tsx`, en este orden): mesada, cobro de suscripciones,
  devolución del ISD. `Repositorios.transaccion` las pone en fila: no anidar una dentro de otra.
- Transferencias: una sola fila con `cuentaId` + `contraparteId`; quién es la dueña lo decide
  `armarTransferencia` (`modules/cuentas/utils/transferencia.ts`) para que la meta lo vea bien.
- Aportes al ahorro llevan `origen` (`sueldo` | `extra`): el extra suma a la meta del mes pero no
  al aporte del cobro. El plan se valida entero con `validarPlan` (aporte × cobros ≤ meta).
