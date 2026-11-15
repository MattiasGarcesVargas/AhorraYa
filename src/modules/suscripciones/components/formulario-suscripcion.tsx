import { useState } from 'react';
import { ScrollView, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampoEtiquetado } from '@/components/campo-etiquetado';
import { Encabezado } from '@/components/encabezado';
import { Boton, Texto } from '@/components/ui';
import { MARGEN_PANTALLA } from '@/constants/layout.constants';
import type { MetodoPagoId } from '@/constants/metodos-pago.constants';
import { FUENTES } from '@/constants/tema.constants';
import { confirmar } from '@/lib/confirmar';
import { interpretarImporte } from '@/lib/dinero';
import { centavosAEntrada } from '@/lib/entrada-monto';
import { formatDiaMes, hoyIso } from '@/lib/fechas';
import { hapticos } from '@/lib/hapticos';
import { useCategorias } from '@/modules/categorias/hooks/use-categorias';
import { SelectorCuenta } from '@/modules/cuentas/components/selector-cuenta';
import { useCuentas } from '@/modules/cuentas/hooks/use-cuentas';
import { cuentaPrincipal } from '@/modules/cuentas/utils/saldos';
import { SelectorCategoria } from '@/modules/gastos/components/selector-categoria';
import { SelectorMetodoPago } from '@/modules/gastos/components/selector-metodo-pago';
import { cuentaDelGasto, tocaCuenta } from '@/modules/gastos/utils/cuenta-del-gasto';
import { useTema } from '@/providers/tema-provider';

import { useEliminarSuscripcion, useGuardarSuscripcion } from '../hooks/use-suscripciones';
import type { Suscripcion } from '../suscripciones.types';
import {
  esDiaDeCobro,
  LARGO_MAXIMO_NOMBRE_SUSCRIPCION,
  proximoCobro,
  validarSuscripcion,
} from '../utils/validar-suscripcion';

export interface FormularioSuscripcionProps {
  /** Sin suscripción: se crea una nueva. */
  suscripcion?: Suscripcion;
  alTerminar: () => void;
}

/** Crear y editar una suscripción que se cobra sola un día fijo de cada mes. */
export function FormularioSuscripcion({ suscripcion, alTerminar }: FormularioSuscripcionProps) {
  const insets = useSafeAreaInsets();
  const { colores } = useTema();
  const { categorias = [] } = useCategorias();
  const cuentas = useCuentas().data ?? [];
  const guardar = useGuardarSuscripcion();
  const eliminar = useEliminarSuscripcion();
  const hoy = hoyIso();
  const editando = suscripcion !== undefined;

  const [nombre, setNombre] = useState(suscripcion?.nombre ?? '');
  const [montoTexto, setMontoTexto] = useState(() =>
    centavosAEntrada(suscripcion?.montoCentavos ?? 0),
  );
  const [diaTexto, setDiaTexto] = useState(suscripcion ? String(suscripcion.diaCobro) : '');
  const [categoria, setCategoria] = useState<string | null>(suscripcion?.categoria ?? null);
  const [metodo, setMetodo] = useState<MetodoPagoId>(suscripcion?.metodoPago ?? 'debito');
  const [cuenta, setCuenta] = useState<number | null>(() =>
    suscripcion ? suscripcion.cuentaId : (cuentaPrincipal(cuentas, 'diaria')?.id ?? null),
  );
  const [activa, setActiva] = useState(suscripcion?.activa ?? true);
  const [cobrarHoy, setCobrarHoy] = useState(false);
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  const dia = Number.parseInt(diaTexto, 10);
  const validacion = validarSuscripcion({
    nombre,
    montoCentavos: interpretarImporte(montoTexto) ?? 0,
    categoria: categoria ?? '',
    metodoPago: metodo,
    cuentaId: cuentaDelGasto(metodo, cuenta),
    diaCobro: Number.isNaN(dia) ? 0 : dia,
    activa,
  });
  const errores = validacion.ok ? {} : validacion.errores;
  const ver = (campo: keyof typeof errores, escrito: boolean) =>
    intentoGuardar || escrito ? errores[campo] : undefined;

  const diaValido = !errores.diaCobro;
  const hoyEsElDia = !editando && diaValido && esDiaDeCobro(dia, hoy);
  const eligeCuenta = tocaCuenta(metodo) && cuentas.length > 0;

  const alGuardar = () => {
    setIntentoGuardar(true);
    if (!validacion.ok) return;
    guardar.mutate(
      { id: suscripcion?.id, datos: validacion.datos, cobrarHoy: hoyEsElDia && cobrarHoy },
      {
        onSuccess: () => {
          hapticos.exito();
          alTerminar();
        },
      },
    );
  };

  const alEliminar = async () => {
    if (!suscripcion) return;
    const ok = await confirmar({
      titulo: `¿Eliminar "${suscripcion.nombre}"?`,
      mensaje: 'Los gastos que ya se cobraron se conservan.',
      textoConfirmar: 'Eliminar',
      destructivo: true,
    });
    if (!ok) return;
    eliminar.mutate(suscripcion.id, {
      onSuccess: () => {
        hapticos.aviso();
        alTerminar();
      },
    });
  };

  const ayudaDia = diaValido
    ? hoyEsElDia
      ? 'Hoy es el día de cobro: por defecto se considera ya cobrada y la primera será el mes que viene.'
      : `${editando ? 'Próximo cobro' : 'Primer cobro'}: ${formatDiaMes(
          proximoCobro(dia, hoy, suscripcion?.cobradaHasta ?? hoy),
        )}. Si el mes es más corto, se cobra el último día.`
    : 'Un día del 1 al 31. Si el mes es más corto, se cobra el último día.';

  return (
    <View className="flex-1 bg-fondo">
      <Encabezado titulo={editando ? 'Editar suscripción' : 'Nueva suscripción'} variante="hoja" />

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingHorizontal: MARGEN_PANTALLA,
          paddingBottom: 16,
        }}
      >
        <CampoEtiquetado etiqueta="Nombre" error={ver('nombre', nombre.trim() !== '')}>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej. Claude"
            placeholderTextColor={colores['texto-suave']}
            maxLength={LARGO_MAXIMO_NOMBRE_SUSCRIPCION}
            returnKeyType="done"
            accessibilityLabel="Nombre de la suscripción"
            className="h-12 rounded-lg border border-borde px-4 text-base text-texto"
            style={{ fontFamily: FUENTES.medium }}
          />
        </CampoEtiquetado>

        <CampoEtiquetado
          etiqueta="Monto al mes"
          error={ver('montoCentavos', montoTexto !== '')}
          ayuda="Lo que cuesta antes de impuestos. Si es una app del exterior pagada con tarjeta, el IVA y el ISD se suman solos."
        >
          <View className="h-12 flex-row items-center rounded-lg border border-borde px-4">
            <Texto tono="suave" className="mr-1">
              $
            </Texto>
            <TextInput
              value={montoTexto}
              onChangeText={setMontoTexto}
              placeholder="0.00"
              placeholderTextColor={colores['texto-suave']}
              keyboardType="decimal-pad"
              accessibilityLabel="Monto mensual"
              className="flex-1 text-base text-texto"
              style={{ fontFamily: FUENTES.medium, fontVariant: ['tabular-nums'] }}
            />
          </View>
        </CampoEtiquetado>

        <CampoEtiquetado
          etiqueta="Día de cobro"
          error={ver('diaCobro', diaTexto !== '')}
          ayuda={ayudaDia}
        >
          <TextInput
            value={diaTexto}
            onChangeText={(texto) => setDiaTexto(texto.replace(/\D/g, '').slice(0, 2))}
            placeholder="1 a 31"
            placeholderTextColor={colores['texto-suave']}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel="Día del mes en que se cobra"
            className="h-12 rounded-lg border border-borde px-4 text-base text-texto"
            style={{ fontFamily: FUENTES.medium, fontVariant: ['tabular-nums'] }}
          />
        </CampoEtiquetado>

        {hoyEsElDia ? (
          <View className="-mt-2 mb-5 min-h-12 flex-row items-center justify-between gap-3">
            <Texto className="flex-1">Cobrar también la de hoy</Texto>
            <Switch
              value={cobrarHoy}
              onValueChange={setCobrarHoy}
              accessibilityLabel="Cobrar también la de hoy"
              trackColor={{ true: colores.primario, false: colores.borde }}
            />
          </View>
        ) : null}

        <CampoEtiquetado etiqueta="Categoría" error={ver('categoria', false)}>
          <SelectorCategoria categorias={categorias} valor={categoria} alCambiar={setCategoria} />
        </CampoEtiquetado>

        <CampoEtiquetado etiqueta="Forma de pago">
          <SelectorMetodoPago valor={metodo} alCambiar={setMetodo} />
        </CampoEtiquetado>

        {eligeCuenta ? (
          <CampoEtiquetado etiqueta="Sale de">
            <SelectorCuenta
              cuentas={cuentas}
              valor={cuenta}
              alCambiar={setCuenta}
              ninguna="Ninguna"
            />
          </CampoEtiquetado>
        ) : null}

        <View className="mb-5 min-h-12 flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Texto peso="medium">Activa</Texto>
            <Texto variante="detalle" tono="suave">
              Pausada no se cobra, pero se conserva.
            </Texto>
          </View>
          <Switch
            value={activa}
            onValueChange={setActiva}
            accessibilityLabel="Suscripción activa"
            trackColor={{ true: colores.primario, false: colores.borde }}
          />
        </View>

        {editando ? (
          <Boton
            texto="Eliminar suscripción"
            icono="trash-outline"
            variante="peligro"
            tamano="sm"
            ancho
            cargando={eliminar.isPending}
            onPress={alEliminar}
          />
        ) : null}
      </ScrollView>

      <View
        className="border-t border-borde pt-3"
        style={{ paddingHorizontal: MARGEN_PANTALLA, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Boton
          texto={editando ? 'Guardar cambios' : 'Crear suscripción'}
          tamano="lg"
          ancho
          cargando={guardar.isPending}
          disabled={intentoGuardar && !validacion.ok}
          onPress={alGuardar}
        />
      </View>
    </View>
  );
}
