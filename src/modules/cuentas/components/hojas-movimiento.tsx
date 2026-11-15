import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { CampoDescripcion } from '@/components/campo-descripcion';
import { CampoEtiquetado } from '@/components/campo-etiquetado';
import { HojaMonto } from '@/components/hoja-monto';
import { SelectorDia } from '@/components/selector-dia';
import { Boton, Chip, Texto } from '@/components/ui';
import type { MetodoPagoId } from '@/constants/metodos-pago.constants';
import { confirmar } from '@/lib/confirmar';
import { hoyIso } from '@/lib/fechas';
import { formatMoneda, formatMonedaConSigno } from '@/lib/format';
import { hapticos } from '@/lib/hapticos';
import { useCategorias } from '@/modules/categorias/hooks/use-categorias';
import { SelectorCategoria } from '@/modules/gastos/components/selector-categoria';
import { SelectorMetodoPago } from '@/modules/gastos/components/selector-metodo-pago';
import { useUltimasElecciones } from '@/modules/gastos/store/ultimas-elecciones.store';
import { useTema } from '@/providers/tema-provider';

import type { Cuenta, MovimientoCuenta, OrigenAporte } from '../cuentas.types';
import {
  useActualizarMovimientoCuenta,
  useCuadrarCuenta,
  useCuentas,
  useEliminarMovimientoCuenta,
  useEstablecerSaldoInicial,
  useRegistrarMovimientoCuenta,
  useRetirar,
} from '../hooks/use-cuentas';
import { cuentaPrincipal, type SaldoCuenta } from '../utils/saldos';
import { SelectorCuenta } from './selector-cuenta';

interface PropsHoja {
  saldo: SaldoCuenta;
  /** Todas las cuentas con su saldo, para elegir la otra punta de una transferencia. */
  saldos: readonly SaldoCuenta[];
  alTerminar: () => void;
}

function lasOtras(cuenta: Cuenta, saldos: readonly SaldoCuenta[]): Cuenta[] {
  return saldos.map((s) => s.cuenta).filter((otra) => otra.id !== cuenta.id);
}

/** La cuenta del día a día, que es de donde sale o a donde vuelve la plata del ahorro. */
function diariaDe(cuenta: Cuenta, saldos: readonly SaldoCuenta[]): SaldoCuenta | undefined {
  if (cuenta.tipo !== 'flexible') return undefined;
  const principal = cuentaPrincipal(
    saldos.map((s) => s.cuenta),
    'diaria',
  );
  return saldos.find((s) => s.cuenta.id === principal?.id);
}

const ORIGENES_APORTE: readonly { id: OrigenAporte; texto: string }[] = [
  { id: 'sueldo', texto: 'De mi sueldo' },
  { id: 'extra', texto: 'Extra' },
];

/**
 * De dónde viene un aporte al ahorro. Del sueldo cuenta para el aporte del
 * cobro; un extra (un regalo, un cachuelo) sólo suma a la meta del mes.
 */
function SelectorOrigenAporte({
  valor,
  alCambiar,
}: {
  valor: OrigenAporte;
  alCambiar: (origen: OrigenAporte) => void;
}) {
  return (
    <CampoEtiquetado
      etiqueta="De dónde viene"
      ayuda={
        valor === 'sueldo'
          ? 'Cuenta para el aporte de tu cobro y para la meta del mes.'
          : 'Suma a la meta del mes, pero no reemplaza el aporte de tu cobro.'
      }
    >
      <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
        {ORIGENES_APORTE.map(({ id, texto }) => (
          <Chip key={id} texto={texto} seleccionado={valor === id} onPress={() => alCambiar(id)} />
        ))}
      </View>
    </CampoEtiquetado>
  );
}

export interface HojaAporteProps extends PropsHoja {
  /** "Esto ya lo tenía": cambia la hoja a anotar el saldo inicial. */
  alAnotarSaldoInicial: () => void;
}

/** Entra plata a la cuenta: desde otra cuenta propia o desde fuera. */
export function HojaAporte({ saldo, saldos, alTerminar, alAnotarSaldoInicial }: HojaAporteProps) {
  const { cuenta } = saldo;
  const registrar = useRegistrarMovimientoCuenta();
  const otras = lasOtras(cuenta, saldos);
  // Se propone la cuenta del día a día sólo si tiene de dónde: si está en
  // cero, lo más probable es que la plata venga de fuera.
  const [desde, setDesde] = useState<number | null>(() => {
    const diaria = diariaDe(cuenta, saldos);
    return diaria && diaria.saldo > 0 ? diaria.cuenta.id : null;
  });
  const [descripcion, setDescripcion] = useState('');
  const esAhorro = cuenta.tipo === 'flexible';
  const origen = saldos.find((s) => s.cuenta.id === desde);
  // Mientras no se elija, la plata que llega de fuera se toma como un extra y
  // la que sale de otra cuenta, como parte del sueldo.
  const [procedenciaElegida, setProcedenciaElegida] = useState<OrigenAporte | null>(null);
  const procedencia: OrigenAporte = procedenciaElegida ?? (desde === null ? 'extra' : 'sueldo');
  // Un pase entre dos cuentas de ahorro no cuenta para la meta: no se pregunta.
  const preguntaProcedencia = esAhorro && origen?.cuenta.tipo !== 'flexible';
  const sinEstrenar = saldo.serie.length === 0;

  return (
    <HojaMonto
      titulo={esAhorro ? 'Aportar al ahorro' : 'Depositar'}
      descripcion={`Lo que entra a ${cuenta.nombre}.`}
      guardando={registrar.isPending}
      textoGuardar={(centavos) => {
        // Una transferencia no puede dejar en negativo la cuenta de la que sale.
        if (origen && centavos > origen.saldo) {
          return `${origen.cuenta.nombre} sólo tiene ${formatMoneda(origen.saldo)}`;
        }
        return `${esAhorro ? 'Aportar' : 'Depositar'} ${formatMoneda(centavos)}`;
      }}
      alGuardar={(montoCentavos) => {
        if (origen && montoCentavos > origen.saldo) return;
        // Meter a la cuenta del día a día plata que sale del ahorro ES un
        // retiro del ahorro: se anota así para que cuente contra la meta.
        const sacaDelAhorro = !esAhorro && origen?.cuenta.tipo === 'flexible';
        registrar.mutate(
          {
            cuentaId: sacaDelAhorro ? origen.cuenta.id : cuenta.id,
            contraparteId: sacaDelAhorro ? cuenta.id : desde,
            gastoId: null,
            tipo: sacaDelAhorro ? 'retiro' : 'aporte',
            montoCentavos,
            nota: descripcion.trim() || null,
            fecha: hoyIso(),
            origen: preguntaProcedencia ? procedencia : null,
          },
          { onSuccess: alTerminar },
        );
      }}
    >
      {sinEstrenar ? (
        <Pressable
          accessibilityRole="button"
          onPress={alAnotarSaldoInicial}
          className="mb-5 min-h-11 justify-center active:opacity-70"
        >
          <Texto variante="detalle" tono="suave">
            ¿Es plata que ya tenías en esta cuenta?{' '}
            <Texto variante="detalle" peso="semibold" tono="primario">
              Anótala como saldo inicial
            </Texto>
          </Texto>
        </Pressable>
      ) : null}
      {otras.length > 0 ? (
        <CampoEtiquetado etiqueta="De dónde sale">
          <SelectorCuenta cuentas={otras} valor={desde} alCambiar={setDesde} ninguna="De fuera" />
        </CampoEtiquetado>
      ) : null}
      {preguntaProcedencia ? (
        <SelectorOrigenAporte valor={procedencia} alCambiar={setProcedenciaElegida} />
      ) : null}
      <CampoEtiquetado etiqueta="Nota">
        <CampoDescripcion valor={descripcion} alCambiar={setDescripcion} />
      </CampoEtiquetado>
    </HojaMonto>
  );
}

/**
 * Sale plata de la cuenta. Dice PARA QUÉ: con "Registrar el gasto" el retiro
 * deja también el gasto anotado, en un solo paso.
 */
export function HojaRetiro({ saldo, saldos, alTerminar }: PropsHoja) {
  const { cuenta } = saldo;
  const { colores } = useTema();
  const { catalogo } = useCategorias();
  const retirar = useRetirar();
  const ultimoMetodo = useUltimasElecciones((estado) => estado.ultimoMetodo);
  const otras = lasOtras(cuenta, saldos);

  // Del ahorro casi siempre se saca para gastar; de la cuenta diaria, no.
  const [conGasto, setConGasto] = useState(cuenta.tipo === 'flexible');
  const [categoria, setCategoria] = useState<string | null>(null);
  const [metodo, setMetodo] = useState<MetodoPagoId>(ultimoMetodo);
  const [descripcion, setDescripcion] = useState('');
  const [hacia, setHacia] = useState<number | null>(
    () => diariaDe(cuenta, saldos)?.cuenta.id ?? null,
  );

  const guardar = (montoCentavos: number) => {
    if (montoCentavos > saldo.saldo) return;
    if (conGasto && !categoria) return;
    const texto = descripcion.trim() || null;

    retirar.mutate(
      {
        cuentaId: cuenta.id,
        montoCentavos,
        fecha: hoyIso(),
        gasto: conGasto && categoria ? { categoria, metodoPago: metodo, descripcion: texto } : null,
        nota:
          conGasto && categoria && catalogo
            ? [catalogo.porId(categoria).nombre, texto].filter(Boolean).join(' · ')
            : texto,
        haciaCuentaId: conGasto ? null : hacia,
      },
      { onSuccess: alTerminar },
    );
  };

  return (
    <HojaMonto
      titulo={cuenta.tipo === 'flexible' ? 'Retirar del ahorro' : 'Retirar'}
      descripcion={`Disponible en ${cuenta.nombre}: ${formatMoneda(saldo.saldo)}`}
      guardando={retirar.isPending}
      textoGuardar={(centavos) => {
        // No se puede sacar más de lo que hay: el saldo nunca queda negativo.
        if (centavos > saldo.saldo) return `Sólo hay ${formatMoneda(saldo.saldo)}`;
        if (conGasto && !categoria) return 'Elige para qué fue';
        return `Retirar ${formatMoneda(centavos)}`;
      }}
      alGuardar={guardar}
    >
      <Pressable
        onPress={() => setConGasto((actual) => !actual)}
        accessibilityRole="switch"
        accessibilityLabel="Registrar el gasto"
        accessibilityState={{ checked: conGasto }}
        className="mb-5 min-h-12 flex-row items-center gap-3"
      >
        <View className="flex-1">
          <Texto peso="medium">Registrar el gasto</Texto>
          <Texto variante="detalle" tono="suave">
            {conGasto
              ? 'Queda anotado en qué se fue. Si lo vas a pagar con Apple Pay, apágalo: ese pago se registra solo.'
              : 'Sólo sale la plata de la cuenta, sin anotar ningún gasto.'}
          </Texto>
        </View>
        <Switch
          value={conGasto}
          onValueChange={setConGasto}
          trackColor={{ true: colores.primario, false: colores['superficie-alta'] }}
          thumbColor={colores.fondo}
          ios_backgroundColor={colores['superficie-alta']}
        />
      </Pressable>

      {conGasto ? (
        <>
          <CampoEtiquetado etiqueta="Para qué fue">
            <SelectorCategoria
              categorias={catalogo?.lista ?? []}
              valor={categoria}
              alCambiar={setCategoria}
            />
          </CampoEtiquetado>
          <CampoEtiquetado etiqueta="Forma de pago">
            <SelectorMetodoPago valor={metodo} alCambiar={setMetodo} />
          </CampoEtiquetado>
        </>
      ) : otras.length > 0 ? (
        <CampoEtiquetado etiqueta="A dónde va">
          <SelectorCuenta cuentas={otras} valor={hacia} alCambiar={setHacia} ninguna="Fuera" />
        </CampoEtiquetado>
      ) : null}

      <CampoEtiquetado etiqueta="Nota">
        <CampoDescripcion valor={descripcion} alCambiar={setDescripcion} />
      </CampoEtiquetado>
    </HojaMonto>
  );
}

/** Lo que ya había en la cuenta al empezar a llevarla. Reemplaza al valor anterior. */
export function HojaSaldoInicial({
  saldo,
  inicial,
  alTerminar,
}: Pick<PropsHoja, 'saldo' | 'alTerminar'> & { inicial: number }) {
  const establecer = useEstablecerSaldoInicial();

  return (
    <HojaMonto
      titulo="Saldo inicial"
      descripcion={`Lo que tenías en ${saldo.cuenta.nombre} al empezar a llevarla. Reemplaza al valor anterior.`}
      valorInicial={inicial}
      permitirCero
      guardando={establecer.isPending}
      textoGuardar={(centavos) => `Guardar ${formatMoneda(centavos)}`}
      alGuardar={(montoCentavos) =>
        establecer.mutate({ cuentaId: saldo.cuenta.id, montoCentavos }, { onSuccess: alTerminar })
      }
    />
  );
}

/**
 * Cuadrar con el banco: se escribe el saldo real y la diferencia con el de la
 * app queda como un ajuste. Sirve para corregir el interés estimado o algún
 * movimiento que no se anotó.
 */
export function HojaCuadrar({ saldo, alTerminar }: Pick<PropsHoja, 'saldo' | 'alTerminar'>) {
  const cuadrar = useCuadrarCuenta();

  return (
    <HojaMonto
      titulo="Cuadrar con el banco"
      descripcion={`Escribe el saldo que muestra el banco para ${saldo.cuenta.nombre}. La app tiene ${formatMoneda(saldo.saldo)}.`}
      valorInicial={saldo.saldo}
      permitirCero
      guardando={cuadrar.isPending}
      textoGuardar={(centavos) => {
        const diferencia = centavos - saldo.saldo;
        return diferencia === 0
          ? 'Ya está cuadrado'
          : `Ajustar ${formatMonedaConSigno(diferencia)}`;
      }}
      alGuardar={(saldoBanco) =>
        cuadrar.mutate(
          { cuentaId: saldo.cuenta.id, saldoApp: saldo.saldo, saldoBanco },
          { onSuccess: alTerminar },
        )
      }
    />
  );
}

const TITULOS_EDICION: Record<MovimientoCuenta['tipo'], string> = {
  inicial: 'Editar saldo inicial',
  aporte: 'Editar aporte',
  retiro: 'Editar retiro',
  ajuste: 'Editar ajuste',
};

/**
 * Corregir un movimiento ya registrado: importe, día y descripción (y, en un
 * aporte al ahorro, de dónde vino). O eliminarlo.
 */
export function HojaEditarMovimiento({
  movimiento,
  alTerminar,
}: {
  movimiento: MovimientoCuenta;
  alTerminar: () => void;
}) {
  const actualizar = useActualizarMovimientoCuenta();
  const eliminar = useEliminarMovimientoCuenta();
  const [fecha, setFecha] = useState(movimiento.fecha);
  const [descripcion, setDescripcion] = useState(movimiento.nota ?? '');
  // El ajuste es el único que guarda signo: se edita el valor y se conserva.
  const signo = movimiento.montoCentavos < 0 ? -1 : 1;
  const conGasto = movimiento.gastoId !== null;

  const cuentas = useCuentas().data ?? [];
  const esFlexible = (id: number | null) =>
    cuentas.some((cuenta) => cuenta.id === id && cuenta.tipo === 'flexible');
  const [procedencia, setProcedencia] = useState<OrigenAporte>(movimiento.origen ?? 'sueldo');
  // Sólo en aportes a una cuenta de ahorro que no vienen de otro ahorro.
  const editaProcedencia =
    movimiento.tipo === 'aporte' &&
    esFlexible(movimiento.cuentaId) &&
    !esFlexible(movimiento.contraparteId);

  const alEliminar = async () => {
    const ok = await confirmar({
      titulo: '¿Eliminar este movimiento?',
      mensaje: [
        `${formatMoneda(Math.abs(movimiento.montoCentavos))} · No se puede deshacer.`,
        conGasto ? 'También se elimina el gasto que se registró con este retiro.' : null,
      ]
        .filter(Boolean)
        .join(' '),
      textoConfirmar: 'Eliminar',
      destructivo: true,
    });
    if (!ok) return;
    hapticos.aviso();
    eliminar.mutate(movimiento.id, { onSuccess: alTerminar });
  };

  return (
    <HojaMonto
      titulo={TITULOS_EDICION[movimiento.tipo]}
      descripcion={
        conGasto ? 'El gasto que se registró con este retiro se corrige con él.' : undefined
      }
      valorInicial={Math.abs(movimiento.montoCentavos)}
      guardando={actualizar.isPending}
      textoGuardar={(centavos) => `Guardar ${formatMoneda(centavos)}`}
      alGuardar={(centavos) =>
        actualizar.mutate(
          {
            id: movimiento.id,
            cambios: {
              montoCentavos: signo * centavos,
              nota: descripcion.trim() || null,
              fecha,
              // Sin `origen` el repositorio conserva el que había.
              ...(editaProcedencia ? { origen: procedencia } : {}),
            },
          },
          { onSuccess: alTerminar },
        )
      }
    >
      {editaProcedencia ? (
        <SelectorOrigenAporte valor={procedencia} alCambiar={setProcedencia} />
      ) : null}
      <CampoEtiquetado etiqueta="Día">
        <SelectorDia valor={fecha} alCambiar={setFecha} />
      </CampoEtiquetado>
      <CampoEtiquetado etiqueta="Nota">
        <CampoDescripcion valor={descripcion} alCambiar={setDescripcion} />
      </CampoEtiquetado>
      <Boton
        texto="Eliminar movimiento"
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
