import { useState } from 'react';
import { View } from 'react-native';

import { CampoDescripcion } from '@/components/campo-descripcion';
import { CampoEtiquetado } from '@/components/campo-etiquetado';
import { HojaMonto } from '@/components/hoja-monto';
import { SelectorDia } from '@/components/selector-dia';
import { Boton, Chip } from '@/components/ui';
import { confirmar } from '@/lib/confirmar';
import { hoyIso } from '@/lib/fechas';
import { formatMoneda } from '@/lib/format';
import { hapticos } from '@/lib/hapticos';
import { SelectorCuenta } from '@/modules/cuentas/components/selector-cuenta';
import type { Cuenta } from '@/modules/cuentas/cuentas.types';
import { cuentaPrincipal } from '@/modules/cuentas/utils/saldos';
import type { Plan } from '@/modules/plan/plan.types';

import {
  useActualizarIngreso,
  useEliminarIngreso,
  useRegistrarIngreso,
} from '../hooks/use-ingresos';
import { TIPOS_INGRESO, type Ingreso, type TipoIngreso } from '../ingresos.types';
import { repartir, type Reparto } from '../utils/reparto';

function SelectorTipo({
  valor,
  alCambiar,
}: {
  valor: TipoIngreso;
  alCambiar: (tipo: TipoIngreso) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
      {TIPOS_INGRESO.map((opcion) => (
        <Chip
          key={opcion.id}
          texto={opcion.nombre}
          icono={opcion.icono}
          seleccionado={valor === opcion.id}
          onPress={() => alCambiar(opcion.id)}
        />
      ))}
    </View>
  );
}

/** Lo que se propone apartar según el tipo: el plan para el sueldo, todo lo extra, nada de la mesada. */
const REPARTO_SUGERIDO: Record<TipoIngreso, Reparto> = {
  sueldo: 'plan',
  mesada: 'nada',
  extra: 'todo',
  reembolso: 'nada',
};

export interface HojaNuevoIngresoProps {
  cuentas: readonly Cuenta[];
  plan: Plan;
  alTerminar: () => void;
}

/**
 * Registrar un ingreso y, en el mismo paso, REPARTIRLO: una parte a la cuenta
 * de ahorro y el resto queda para gastar. Es el "págate primero" hecho al
 * cobrar, para no mandar todo al ahorro y luego ir sacando.
 */
export function HojaNuevoIngreso({ cuentas, plan, alTerminar }: HojaNuevoIngresoProps) {
  const registrar = useRegistrarIngreso();
  const diarias = cuentas.filter((cuenta) => cuenta.tipo === 'diaria');
  const cuentaAhorro = cuentaPrincipal(cuentas, 'flexible');

  const [tipo, setTipo] = useState<TipoIngreso>('sueldo');
  const [reparto, setReparto] = useState<Reparto>(REPARTO_SUGERIDO.sueldo);
  const [llegaA, setLlegaA] = useState<number | null>(
    () => cuentaPrincipal(cuentas, 'diaria')?.id ?? null,
  );
  const [descripcion, setDescripcion] = useState('');

  const elegirTipo = (nuevo: TipoIngreso) => {
    setTipo(nuevo);
    setReparto(REPARTO_SUGERIDO[nuevo]);
  };

  // El sueldo y la mesada casi siempre son la misma cifra: se proponen.
  const sugerido =
    tipo === 'sueldo'
      ? plan.sueldoQuincenalCentavos
      : tipo === 'mesada'
        ? plan.mesadaSemanalCentavos
        : 0;
  const aportePlan = plan.aporteQuincenalCentavos;
  const repartoEfectivo: Reparto = cuentaAhorro ? reparto : 'nada';

  return (
    <HojaMonto
      // Cambiar de tipo reinicia el importe con su valor sugerido.
      key={`${tipo}-${sugerido}`}
      titulo="Nuevo ingreso"
      valorInicial={sugerido}
      guardando={registrar.isPending}
      textoGuardar={(centavos) => {
        const { alAhorro } = repartir(centavos, repartoEfectivo, aportePlan);
        return alAhorro > 0
          ? `Registrar y apartar ${formatMoneda(alAhorro)}`
          : `Registrar ${formatMoneda(centavos)}`;
      }}
      alGuardar={(montoCentavos) =>
        registrar.mutate(
          {
            ingreso: {
              montoCentavos,
              tipo,
              cuentaId: llegaA,
              nota: descripcion.trim() || null,
              fecha: hoyIso(),
            },
            alAhorroCentavos: repartir(montoCentavos, repartoEfectivo, aportePlan).alAhorro,
            cuentaAhorroId: cuentaAhorro?.id ?? null,
          },
          { onSuccess: alTerminar },
        )
      }
    >
      {(centavos) => {
        const { alAhorro, paraGastar } = repartir(centavos, repartoEfectivo, aportePlan);
        return (
          <View>
            <CampoEtiquetado etiqueta="Tipo">
              <SelectorTipo valor={tipo} alCambiar={elegirTipo} />
            </CampoEtiquetado>

            {diarias.length > 0 ? (
              <CampoEtiquetado etiqueta="Llega a">
                <SelectorCuenta
                  cuentas={diarias}
                  valor={llegaA}
                  alCambiar={setLlegaA}
                  ninguna="Efectivo"
                />
              </CampoEtiquetado>
            ) : null}

            {cuentaAhorro ? (
              <CampoEtiquetado
                etiqueta="Págate primero"
                ayuda={
                  alAhorro > 0
                    ? `Van ${formatMoneda(alAhorro)} a ${cuentaAhorro.nombre} y te quedan ${formatMoneda(paraGastar)} para gastar hasta el siguiente pago.`
                    : `Te quedan los ${formatMoneda(paraGastar)} completos para gastar. Nada va al ahorro.`
                }
              >
                <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
                  <Chip
                    texto="No apartar"
                    seleccionado={reparto === 'nada'}
                    onPress={() => setReparto('nada')}
                  />
                  {aportePlan > 0 ? (
                    <Chip
                      texto={`Apartar ${formatMoneda(aportePlan)}`}
                      seleccionado={reparto === 'plan'}
                      onPress={() => setReparto('plan')}
                    />
                  ) : null}
                  <Chip
                    texto="Todo al ahorro"
                    seleccionado={reparto === 'todo'}
                    onPress={() => setReparto('todo')}
                  />
                </View>
              </CampoEtiquetado>
            ) : null}

            <CampoEtiquetado etiqueta="Nota">
              <CampoDescripcion valor={descripcion} alCambiar={setDescripcion} />
            </CampoEtiquetado>
          </View>
        );
      }}
    </HojaMonto>
  );
}

export interface HojaEditarIngresoProps {
  ingreso: Ingreso;
  cuentas: readonly Cuenta[];
  alTerminar: () => void;
}

/** Corregir un ingreso ya registrado: importe, tipo, cuenta, día y descripción. O eliminarlo. */
export function HojaEditarIngreso({ ingreso, cuentas, alTerminar }: HojaEditarIngresoProps) {
  const actualizar = useActualizarIngreso();
  const eliminar = useEliminarIngreso();
  const diarias = cuentas.filter((cuenta) => cuenta.tipo === 'diaria');

  const [tipo, setTipo] = useState<TipoIngreso>(ingreso.tipo);
  const [llegaA, setLlegaA] = useState<number | null>(ingreso.cuentaId);
  const [fecha, setFecha] = useState(ingreso.fecha);
  const [descripcion, setDescripcion] = useState(ingreso.nota ?? '');

  const alEliminar = async () => {
    const ok = await confirmar({
      titulo: '¿Eliminar este ingreso?',
      mensaje: `${formatMoneda(ingreso.montoCentavos)} · No se puede deshacer. Si apartaste una parte al ahorro, ese aporte se queda: elimínalo aparte si tampoco ocurrió.`,
      textoConfirmar: 'Eliminar',
      destructivo: true,
    });
    if (!ok) return;
    hapticos.aviso();
    eliminar.mutate(ingreso.id, { onSuccess: alTerminar });
  };

  return (
    <HojaMonto
      titulo="Editar ingreso"
      valorInicial={ingreso.montoCentavos}
      guardando={actualizar.isPending}
      textoGuardar={(centavos) => `Guardar ${formatMoneda(centavos)}`}
      alGuardar={(montoCentavos) =>
        actualizar.mutate(
          {
            id: ingreso.id,
            cambios: {
              montoCentavos,
              tipo,
              cuentaId: llegaA,
              nota: descripcion.trim() || null,
              fecha,
            },
          },
          { onSuccess: alTerminar },
        )
      }
    >
      <CampoEtiquetado etiqueta="Tipo">
        <SelectorTipo valor={tipo} alCambiar={setTipo} />
      </CampoEtiquetado>
      {diarias.length > 0 ? (
        <CampoEtiquetado etiqueta="Llegó a">
          <SelectorCuenta
            cuentas={diarias}
            valor={llegaA}
            alCambiar={setLlegaA}
            ninguna="Efectivo"
          />
        </CampoEtiquetado>
      ) : null}
      <CampoEtiquetado etiqueta="Día">
        <SelectorDia valor={fecha} alCambiar={setFecha} />
      </CampoEtiquetado>
      <CampoEtiquetado etiqueta="Nota">
        <CampoDescripcion valor={descripcion} alCambiar={setDescripcion} />
      </CampoEtiquetado>
      <Boton
        texto="Eliminar ingreso"
        icono="trash-outline"
        variante="peligro"
        tamano="sm"
        ancho
        cargando={eliminar.isPending}
        onPress={alEliminar}
      />
    </HojaMonto>
  );
}
