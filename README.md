# AhorraYa

Registro de gastos en segundos y seguimiento del ahorro, hecho a la medida de mi plan
(`mi_situacion_financiera.md`): quincenas de pago a pago (15 y último día), "págate primero"
con $250 por quincena, meta de $500 al mes y presupuesto por categoría.

- **Inicio**: cuánto te queda en la quincena, cuánto puedes gastar por día, "págate primero",
  tu ahorro y el gasto por categoría.
- **Registro rápido**: teclado propio + categoría + forma de pago. Tres toques.
- **Atajo de iPhone**: doble toque atrás → eliges categoría, importe y pago → queda registrado.
- **Ahorro**: total, meta del mes, proyección a 12 meses e historial por quincena (como el Excel).
- **Categorías a tu medida**: crea, edita (nombre, ícono, tono, límite), ordena y elimina
  categorías en Ajustes → Categorías y presupuesto. Al eliminar una con gastos, eliges a cuál
  pasan esos gastos. Límite en $0 = sin tope.
- **Estado de cuenta mensual**: en Ajustes → Estados de cuenta (o al final de Movimientos)
  descargas el mes en **PDF** (ingresos, gastos por categoría y forma de pago, todos los
  movimientos y tu cuenta de ahorro con saldo) o en **CSV** para Excel.
- **Datos 100 % locales** (SQLite en el teléfono). Nada sale de ahí.

## Cómo probarla

### 1. En tu iPhone, hoy mismo (Expo Go)

1. Instala **Expo Go** desde el App Store.
2. En la Mac, con el iPhone en la **misma red Wi-Fi**:

   ```bash
   cd finanzas
   npm start
   ```

3. Escanea el código QR con la cámara del iPhone → se abre en Expo Go.

Cada cambio en el código se recarga solo en el teléfono.

> Expo Go sirve para PROBAR. Lo que registres ahí vive dentro de Expo Go y no pasa a la app
> instalada (paso 3).

### 2. El atajo de doble toque, en Expo Go

En la app: **Ajustes → Atajo de iPhone**. La guía muestra la plantilla del enlace que funciona
en ESE momento (en Expo Go empieza por `exp://<ip-de-tu-mac>:8081/--/registrar`) con un botón
para copiarla, y un botón para probar con un gasto de $1.00 (luego tocas "Deshacer").

Resumen del atajo (app **Atajos**):

1. **Lista** (Transporte, Novia, Comida, Salidas, Compras, Imprevistos) → **Elegir de la lista**.
2. **Solicitar entrada** (Número) → "¿Cuánto?".
3. **Lista** (Efectivo, Debito, Credito, Transferencia) → **Elegir de la lista**.
4. **URL** con la plantilla, reemplazando los huecos por las variables → **Abrir URL**.
5. iPhone: **Ajustes → Accesibilidad → Tocar → Tocar atrás → Doble toque** → tu atajo.

Si al enlace le falta algo (o una categoría no se reconoce), AhorraYa abre el formulario con lo
que sí llegó. Si el mismo enlace se abre dos veces en 30 s, no duplica el gasto.

### 3. Para el día a día (app instalada, enlace `ahorraya://`)

Expo Go depende de que la Mac esté corriendo `npm start`. Para tener AhorraYa con su ícono y
que el atajo funcione siempre, hay que instalarla. Dos caminos:

- **Con cuenta de Apple Developer** ($99/año), sin Xcode:

  ```bash
  npx eas-cli@latest build --platform ios --profile production
  ```

  ```bash
  npx eas-cli@latest submit --platform ios
  ```

  y la instalas desde TestFlight.

- **Gratis, con Xcode** (instálalo desde la App Store de la Mac). Conecta el iPhone por cable:

  ```bash
  npx expo run:ios --device --configuration Release
  ```

  Con un Apple ID gratuito la firma dura 7 días; después se vuelve a correr el comando (los
  datos se conservan).

Con la app instalada, el atajo usa `ahorraya://registrar?monto=…&categoria=…&metodo=…`
(la guía de la app ya te muestra ese enlace).

### 4. En el navegador

```bash
npm run web
```

## Scripts

| Comando             | Qué hace                                 |
| ------------------- | ---------------------------------------- |
| `npm start`         | Servidor de desarrollo (QR para Expo Go) |
| `npm test`          | Tests del dominio (Jest)                 |
| `npm run typecheck` | TypeScript estricto                      |
| `npm run lint`      | ESLint (config de Expo)                  |
| `npm run format`    | Prettier                                 |

## Arquitectura

Misma estructura que mis otros proyectos (`app-pulsocont`), con **vertical slices** en
`src/modules`: cada módulo es dueño de sus tipos, su persistencia, sus hooks y su UI.

```
src/
  app/            Rutas de expo-router (pantallas delgadas que COMPONEN módulos)
  components/     UI compartida (ui/ = primitivas: Texto, Boton, Chip, Monto…)
  constants/      Tema, catálogos (categorías, formas de pago), plan inicial
  lib/            Dominio puro y utilidades: dinero, fechas, quincenas, teclado
    db/           Conexión SQLite y migraciones versionadas
  modules/
    gastos/       Registrar, listar y borrar gastos
    ingresos/     Sueldo, mesada, extras (con "enviar al ahorro")
    ahorro/       Aportes, retiros, saldo inicial, proyección
    plan/         Meta, aporte quincenal, sueldo y mesada
    categorias/   Crear, editar, ordenar y eliminar categorías (con su límite mensual)
    estado-cuenta/ Estado de cuenta del mes: modelo, PDF (HTML), CSV y exportador
    resumen/      Dashboard: compone gastos + ahorro + plan
    movimientos/  Lista unificada por día
    atajo/        Enlace del atajo de iPhone (interpretar + registrar sin duplicar)
    ajustes/      Borrar datos
  providers/      Proveedores: tema, SQLite, inyección de repositorios
```

**SOLID en la práctica**

- **S**: cada archivo tiene una tarea (p. ej. `interpretar-enlace.ts` sólo traduce el enlace).
- **O**: categorías, formas de pago y tipos de ingreso son datos; agregar uno no toca pantallas.
- **L/I**: interfaces pequeñas por módulo (`GastosRepository`, `PlanRepository`,
  `PresupuestoRepository`…); cualquier implementación que las cumpla sirve.
- **D**: los hooks piden repositorios por interfaz a `useRepositorios()`; sólo
  `RepositoriosProvider` sabe que hay SQLite. Los tests usan un repositorio en memoria.

Todo importe viaja en **centavos enteros** (`lib/dinero.ts`) y todo formato sale de
`lib/format.ts`.
