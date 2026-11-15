import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampoDescripcion } from '@/components/campo-descripcion';
import { Encabezado } from '@/components/encabezado';
import { SelectorDia } from '@/components/selector-dia';
import { TecladoMonto } from '@/components/teclado-monto';
import { Boton, Chip, Icono, Texto } from '@/components/ui';
import { VisorMonto } from '@/components/visor-monto';
import { MARGEN_PANTALLA } from '@/constants/layout.constants';
import type { MetodoPagoId } from '@/constants/metodos-pago.constants';
import { centavosAEntrada, entradaACentavos, pulsarTecla } from '@/lib/entrada-monto';
import { hoyIso, sumarDias, type FechaIso } from '@/lib/fechas';
import { formatMoneda } from '@/lib/format';
import type { CatalogoCategorias, CategoriaId } from '@/modules/categorias/categorias.types';
import { SelectorCuenta } from '@/modules/cuentas/components/selector-cuenta';
import type { Cuenta } from '@/modules/cuentas/cuentas.types';

import type { BorradorGasto, Gasto, NuevoGasto } from '../gastos.types';
import { LARGO_MAXIMO_NOTA } from '../schema/gasto.schema';
import { useUltimasElecciones } from '../store/ultimas-elecciones.store';
import { cuentaDelGasto, tocaCuenta } from '../utils/cuenta-del-gasto';
import { aplicaImpuestos } from '../utils/impuestos-exterior';
import { DesgloseExterior } from './desglose-exterior';
import { SelectorCategoria } from './selector-categoria';
import { SelectorMetodoPago } from './selector-metodo-pago';

export interface FormularioGastoProps {
  catalogo: CatalogoCategorias;
  /** Con un gasto, el formulario lo EDITA en vez de registrar uno nuevo. */
  gasto?: Gasto;
  borrador?: BorradorGasto;
  /** Cuentas de las que puede salir la plata al pagar con débito o transferencia. */
  cuentas: readonly Cuenta[];
  /** La cuenta que se propone en un gasto nuevo (la del día a día). */
  cuentaPorDefecto: number | null;
  /** Por qué el atajo no pudo registrar solo (viene de `/registrar`). */
  aviso?: string;
  guardando: boolean;
  alGuardar: (gasto: NuevoGasto) => void;
  /** Abre la creación de una categoría sin salir del registro. */
  alCrearCategoria: () => void;
  /** Sólo al editar. */
  alEliminar?: () => void;
}

/**
 * Registro rápido: importe → categoría → (forma de pago ya elegida) → listo.
 * Tres toques más los dígitos. Todo está en una sola pantalla y el botón dice
 * exactamente lo que va a guardar, para no tener que revisar después.
 *
 * El mismo formulario corrige un gasto ya registrado: importe, categoría,
 * forma de pago, cuenta, día y descripción.
 */
export function FormularioGasto({
  catalogo,
  gasto,
  borrador,
  cuentas,
  cuentaPorDefecto,
  aviso,
  guardando,
  alGuardar,
  alCrearCategoria,
  alEliminar,
}: FormularioGastoProps) {
  const insets = useSafeAreaInsets();
  const ultimoMetodo = useUltimasElecciones((estado) => estado.ultimoMetodo);
  const editando = gasto !== undefined;
  const hoy = hoyIso();

  const [entrada, setEntrada] = useState(() =>
    centavosAEntrada(gasto?.montoCentavos ?? borrador?.montoCentavos ?? 0),
  );
  const [categoria, setCategoria] = useState<CategoriaId | null>(
    gasto?.categoria ?? borrador?.categoria ?? null,
  );
  const [metodo, setMetodo] = useState<MetodoPagoId>(
    gasto?.metodoPago ?? borrador?.metodoPago ?? ultimoMetodo,
  );
  // Al editar se respeta la cuenta guardada, aunque sea "ninguna".
  const [cuenta, setCuenta] = useState<number | null>(gasto ? gasto.cuentaId : cuentaPorDefecto);
  const [descripcion, setDescripcion] = useState(gasto?.nota ?? borrador?.nota ?? '');
  const [fecha, setFecha] = useState<FechaIso>(gasto?.fecha ?? hoy);

  const ayer = sumarDias(hoy, -1);
  const centavos = entradaACentavos(entrada);
  const listo = centavos > 0 && categoria !== null;
  const eligeCuenta = tocaCuenta(metodo) && cuentas.length > 0;
  const conImpuestos =
    categoria !== null && aplicaImpuestos(catalogo.porId(categoria), metodo) && centavos > 0;

  const guardar = () => {
    if (!listo) return;
    alGuardar({
      montoCentavos: centavos,
      categoria,
      metodoPago: metodo,
      cuentaId: cuentaDelGasto(metodo, cuenta),
      nota: descripcion.trim() || null,
      fecha,
      origen: gasto?.origen ?? 'app',
    });
  };

  const textoBoton = (() => {
    if (centavos <= 0) return 'Escribe el importe';
    if (!categoria) return 'Elige una categoría';
    const resumen = `${formatMoneda(centavos)} · ${catalogo.porId(categoria).nombre}`;
    return `${editando ? 'Guardar' : 'Registrar'} ${resumen}`;
  })();

  return (
    <View className="flex-1 bg-fondo">
      <Encabezado titulo={editando ? 'Editar gasto' : 'Nuevo gasto'} variante="hoja" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: MARGEN_PANTALLA, paddingBottom: 12 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {aviso ? (
          <View className="mt-2 rounded-lg bg-peligro-suave p-3">
            <Texto variante="detalle" peso="semibold" tono="peligro" className="mb-1">
              El atajo no pudo registrar el gasto
            </Texto>
            <Texto variante="detalle">{aviso}</Texto>
          </View>
        ) : null}
        <VisorMonto entrada={entrada} />
        {conImpuestos ? <DesgloseExterior consumoCentavos={centavos} className="-mt-2 mb-4" /> : null}

        <View className="mb-2 flex-row items-center justify-between">
          <Texto variante="detalle" peso="semibold" tono="suave">
            Categoría
          </Texto>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Crear categoría"
            hitSlop={10}
            onPress={alCrearCategoria}
            className="flex-row items-center gap-1 active:opacity-70"
          >
            <Icono nombre="add" tamano={16} color="primario" />
            <Texto variante="detalle" peso="semibold" tono="primario">
              Nueva
            </Texto>
          </Pressable>
        </View>
        <SelectorCategoria categorias={catalogo.lista} valor={categoria} alCambiar={setCategoria} />

        <Texto variante="detalle" peso="semibold" tono="suave" className="mb-2 mt-5">
          Forma de pago
        </Texto>
        <SelectorMetodoPago valor={metodo} alCambiar={setMetodo} />

        {eligeCuenta ? (
          <>
            <Texto variante="detalle" peso="semibold" tono="suave" className="mb-2 mt-5">
              Sale de
            </Texto>
            <SelectorCuenta
              cuentas={cuentas}
              valor={cuenta}
              alCambiar={setCuenta}
              ninguna="Ninguna"
            />
          </>
        ) : null}

        <View className="mt-5 gap-3">
          {editando || (fecha !== hoy && fecha !== ayer) ? (
            <SelectorDia valor={fecha} alCambiar={setFecha} />
          ) : (
            <View className="flex-row gap-2">
              <Chip texto="Hoy" seleccionado={fecha === hoy} onPress={() => setFecha(hoy)} />
              <Chip texto="Ayer" seleccionado={fecha === ayer} onPress={() => setFecha(ayer)} />
            </View>
          )}
          <CampoDescripcion
            valor={descripcion}
            alCambiar={setDescripcion}
            marcador="Descripción: qué fue (opcional)"
            largoMaximo={LARGO_MAXIMO_NOTA}
          />
        </View>

        {alEliminar ? (
          <Boton
            texto="Eliminar gasto"
            icono="trash-outline"
            variante="peligro"
            tamano="sm"
            ancho
            className="mt-5"
            onPress={alEliminar}
          />
        ) : null}
      </ScrollView>

      <View
        className="gap-3 border-t border-borde pt-3"
        style={{ paddingHorizontal: MARGEN_PANTALLA, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <TecladoMonto alPulsar={(tecla) => setEntrada((actual) => pulsarTecla(actual, tecla))} />
        <Boton
          texto={textoBoton}
          tamano="lg"
          ancho
          disabled={!listo}
          cargando={guardando}
          onPress={guardar}
        />
      </View>
    </View>
  );
}
