import { Children, type ReactNode } from 'react';
import { View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { FilaOpcion } from '@/components/fila-opcion';
import { Pantalla } from '@/components/pantalla';
import { Seccion } from '@/components/seccion';
import { Separador, Texto } from '@/components/ui';
import { confirmar } from '@/lib/confirmar';
import { formatMoneda, formatMonedaEntera } from '@/lib/format';
import { useBorrarDatos } from '@/modules/ajustes/hooks/use-borrar-datos';
import { useCategorias } from '@/modules/categorias/hooks/use-categorias';
import { totalPresupuestoMensual } from '@/modules/categorias/utils/catalogo';
import { useSaldosCuentas } from '@/modules/cuentas/hooks/use-cuentas';
import { usePlan } from '@/modules/plan/hooks/use-plan';
import { CAMPOS_PLAN, type CampoPlan } from '@/modules/plan/plan.types';
import { holguraMensual } from '@/modules/plan/utils/calculos-plan';
import { FRECUENCIAS } from '@/modules/plan/utils/frecuencia';
import { validarPlan } from '@/modules/plan/utils/validar-plan';

const CAMPOS: CampoPlan[] = [
  'metaMensualCentavos',
  'aporteQuincenalCentavos',
  'sueldoQuincenalCentavos',
  'mesadaSemanalCentavos',
];

/** Filas en lista, separadas por una línea fina (sin caja). */
function Grupo({ children }: { children: ReactNode }) {
  return (
    <View className="-mx-4">
      {Children.toArray(children).map((hijo, i) => (
        <View key={i}>
          {i > 0 ? (
            <View className="px-4">
              <Separador />
            </View>
          ) : null}
          {hijo}
        </View>
      ))}
    </View>
  );
}

export default function AjustesScreen() {
  const router = useRouter();
  const plan = usePlan();
  const { categorias } = useCategorias();
  const { saldos, totales } = useSaldosCuentas();
  const borrar = useBorrarDatos();

  const holgura = plan.data && categorias ? holguraMensual(plan.data, categorias) : null;
  const coherencia = plan.data ? validarPlan(plan.data) : null;

  const borrarTodo = async () => {
    const ok = await confirmar({
      titulo: '¿Borrar todos los datos?',
      mensaje:
        'Se eliminan gastos, ingresos y movimientos de tus cuentas, y el plan vuelve a los valores iniciales. No se puede deshacer.',
      textoConfirmar: 'Borrar todo',
      destructivo: true,
    });
    if (ok) borrar.mutate();
  };

  return (
    <Pantalla antetitulo="Tu plan" titulo="Ajustes">
      <Seccion titulo="Mi plan" className="mt-0">
        <Grupo>
          <FilaOpcion
            titulo="¿Cada cuánto cobras?"
            valor={plan.data ? FRECUENCIAS[plan.data.cobrosPorMes].nombre : undefined}
            alPulsar={() => router.push('/editar-frecuencia')}
          />
          {CAMPOS.map((campo) => (
            <FilaOpcion
              key={campo}
              titulo={CAMPOS_PLAN[campo].titulo}
              valor={plan.data ? formatMonedaEntera(plan.data[campo]) : undefined}
              alPulsar={() => router.push({ pathname: '/editar-plan', params: { campo } })}
            />
          ))}
        </Grupo>
        {coherencia && !coherencia.ok ? (
          <Texto variante="detalle" tono="peligro" className="mt-2" numerico>
            Revisa tu plan: {coherencia.motivo} {coherencia.sugerencia}
          </Texto>
        ) : null}
        {holgura !== null ? (
          <Texto
            variante="detalle"
            tono={holgura >= 0 ? 'suave' : 'peligro'}
            className="mt-2"
            numerico
          >
            {holgura >= 0
              ? `Tu plan cuadra: gastando lo presupuestado y ahorrando la meta te quedan ${formatMoneda(holgura)} al mes.`
              : `Tu plan no cuadra por ${formatMoneda(-holgura)} al mes: baja algún límite o la meta.`}
          </Texto>
        ) : null}
      </Seccion>

      <Seccion titulo="Categorías y cuentas">
        <Grupo>
          <FilaOpcion
            icono="pricetags-outline"
            titulo="Categorías y presupuesto"
            detalle={categorias ? `${categorias.length} categorías` : undefined}
            valor={
              categorias
                ? `${formatMonedaEntera(totalPresupuestoMensual(categorias))}/mes`
                : undefined
            }
            alPulsar={() => router.push('/categorias')}
          />
          <FilaOpcion
            icono="wallet-outline"
            titulo="Cuentas"
            detalle={
              saldos ? `${saldos.length} ${saldos.length === 1 ? 'cuenta' : 'cuentas'}` : undefined
            }
            valor={totales ? formatMonedaEntera(totales.patrimonio) : undefined}
            alPulsar={() => router.navigate('/cuentas')}
          />
          <FilaOpcion
            icono="repeat-outline"
            titulo="Suscripciones"
            detalle="Cobros que se registran solos cada mes"
            alPulsar={() => router.push('/suscripciones')}
          />
        </Grupo>
      </Seccion>

      <Seccion titulo="Registro rápido">
        <Grupo>
          <FilaOpcion
            icono="phone-portrait-outline"
            titulo="Atajo y Apple Pay"
            detalle="Doble toque atrás y pagos con tu tarjeta en Wallet"
            alPulsar={() => router.push('/atajo')}
          />
        </Grupo>
      </Seccion>

      <Seccion titulo="Reportes">
        <Grupo>
          <FilaOpcion
            icono="document-text-outline"
            titulo="Estados de cuenta"
            detalle="Descarga tu mes en PDF o para Excel"
            alPulsar={() => router.push('/estado-cuenta')}
          />
        </Grupo>
      </Seccion>

      <Seccion titulo="Datos">
        <Grupo>
          <FilaOpcion
            icono="trash-outline"
            titulo={borrar.isPending ? 'Borrando…' : 'Borrar todos los datos'}
            peligro
            alPulsar={borrarTodo}
          />
        </Grupo>
        <Texto variante="mini" tono="suave" className="mt-2">
          Tus datos viven sólo en este teléfono. Nada sale de aquí.
        </Texto>
      </Seccion>

      <Texto variante="mini" tono="suave" className="mt-10 text-center">
        AhorraYa {Constants.expoConfig?.version ?? ''}
      </Texto>
    </Pantalla>
  );
}
