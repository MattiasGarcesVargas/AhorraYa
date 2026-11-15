import { useState, type ReactNode } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Encabezado } from '@/components/encabezado';
import { Boton, Chip, Texto } from '@/components/ui';
import { BANCOS, type BancoId } from '@/constants/bancos.constants';
import { LARGO_MAXIMO_NOMBRE_CUENTA } from '@/constants/cuentas.constants';
import { MARGEN_PANTALLA } from '@/constants/layout.constants';
import { FUENTES } from '@/constants/tema.constants';
import { confirmar } from '@/lib/confirmar';
import { interpretarImporteOCero } from '@/lib/dinero';
import { formatMoneda } from '@/lib/format';
import { hapticos } from '@/lib/hapticos';
import { useTema } from '@/providers/tema-provider';

import type { Cuenta, TipoCuenta } from '../cuentas.types';
import {
  useCantidadRegistrosCuenta,
  useCuentas,
  useEliminarCuenta,
  useGuardarCuenta,
} from '../hooks/use-cuentas';
import { interesDiarioEstimado, interpretarTasa } from '../utils/interes';
import { TIPOS_CUENTA } from '../utils/textos-cuenta';
import { validarCuenta } from '../utils/validar-cuenta';

export interface FormularioCuentaProps {
  /** Sin cuenta: se crea una nueva. */
  cuenta?: Cuenta;
  /** Tasa vigente de la cuenta que se edita, en puntos básicos. */
  tasaBp?: number;
  /** Saldo de hoy de la cuenta que se edita, para estimar el interés. */
  saldoCentavos?: number;
  alTerminar: () => void;
  /** Tras eliminar la cuenta. */
  alEliminar: () => void;
}

function Campo({
  etiqueta,
  error,
  ayuda,
  children,
}: {
  etiqueta: string;
  error?: string;
  ayuda?: string;
  children: ReactNode;
}) {
  return (
    <View className="mt-6">
      <Texto variante="detalle" peso="semibold" tono="suave" className="mb-2">
        {etiqueta}
      </Texto>
      {children}
      {error ? (
        <Texto variante="detalle" tono="peligro" className="mt-1.5">
          {error}
        </Texto>
      ) : ayuda ? (
        <Texto variante="detalle" tono="suave" className="mt-1.5">
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
}

const TIPOS: TipoCuenta[] = ['diaria', 'flexible'];

/**
 * Crear y editar una cuenta: banco, nombre, tipo y — si es flexible — la tasa
 * de interés anual. Al crearla se anota también cuánto hay hoy en ella.
 */
export function FormularioCuenta({
  cuenta,
  tasaBp: tasaActual = 0,
  saldoCentavos = 0,
  alTerminar,
  alEliminar: alEliminada,
}: FormularioCuentaProps) {
  const insets = useSafeAreaInsets();
  const { colores } = useTema();
  const existentes = useCuentas().data ?? [];
  const guardar = useGuardarCuenta();
  const eliminar = useEliminarCuenta();
  const registros = useCantidadRegistrosCuenta(cuenta?.id).data ?? 0;

  const [banco, setBanco] = useState<BancoId>(cuenta?.banco ?? 'pichincha');
  const [nombre, setNombre] = useState(cuenta?.nombre ?? '');
  const [tipo, setTipo] = useState<TipoCuenta>(cuenta?.tipo ?? 'flexible');
  const [tasaTexto, setTasaTexto] = useState(() =>
    tasaActual > 0 ? (tasaActual / 100).toString() : cuenta ? '' : '5',
  );
  const [saldoTexto, setSaldoTexto] = useState('');
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  const tasaBp = interpretarTasa(tasaTexto);
  const saldoInicial = interpretarImporteOCero(saldoTexto);
  const formulario = { banco, nombre, tipo, tasaBp };
  const validacion = validarCuenta(formulario, existentes, cuenta?.id);
  const errores = validacion.ok ? {} : validacion.errores;
  // Un nombre repetido se avisa al escribir; un campo vacío, sólo al intentar guardar.
  const errorNombre =
    errores.nombre && (intentoGuardar || nombre.trim() !== '') ? errores.nombre : undefined;
  const errorSaldo = saldoInicial === null ? 'Escribe el saldo como un número.' : undefined;

  const baseInteres = cuenta ? saldoCentavos : (saldoInicial ?? 0);
  const interesAlDia = tipo === 'flexible' ? interesDiarioEstimado(baseInteres, tasaBp ?? 0) : 0;

  const alGuardar = () => {
    setIntentoGuardar(true);
    if (!validacion.ok || saldoInicial === null) return;
    guardar.mutate(
      { id: cuenta?.id, formulario, saldoInicialCentavos: saldoInicial },
      {
        onSuccess: () => {
          hapticos.exito();
          alTerminar();
        },
      },
    );
  };

  const alEliminar = async () => {
    if (!cuenta) return;
    const ok = await confirmar({
      titulo: `¿Eliminar "${cuenta.nombre}"?`,
      mensaje: 'No tiene movimientos registrados.',
      textoConfirmar: 'Eliminar',
      destructivo: true,
    });
    if (!ok) return;
    eliminar.mutate(cuenta.id, {
      onSuccess: () => {
        hapticos.aviso();
        alEliminada();
      },
    });
  };

  const estiloCampo = { fontFamily: FUENTES.semibold };

  return (
    <View className="flex-1 bg-fondo">
      <Encabezado titulo={cuenta ? 'Editar cuenta' : 'Nueva cuenta'} variante="hoja" />

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingHorizontal: MARGEN_PANTALLA,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <Campo etiqueta="Banco" error={errores.banco}>
          <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
            {BANCOS.map((opcion) => (
              <Chip
                key={opcion.id}
                texto={opcion.corto}
                seleccionado={banco === opcion.id}
                onPress={() => setBanco(opcion.id)}
              />
            ))}
          </View>
        </Campo>

        <Campo etiqueta="Tipo de cuenta" ayuda={TIPOS_CUENTA[tipo].descripcion}>
          <View className="flex-row gap-2" accessibilityRole="radiogroup">
            {TIPOS.map((opcion) => (
              <Chip
                key={opcion}
                texto={TIPOS_CUENTA[opcion].nombre}
                icono={TIPOS_CUENTA[opcion].icono}
                seleccionado={tipo === opcion}
                onPress={() => setTipo(opcion)}
              />
            ))}
          </View>
        </Campo>

        <Campo etiqueta="Nombre" error={errorNombre}>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder={tipo === 'flexible' ? 'Ej. Cuenta flexible' : 'Ej. Cuenta de ahorros'}
            placeholderTextColor={colores['texto-suave']}
            maxLength={LARGO_MAXIMO_NOMBRE_CUENTA}
            autoCapitalize="sentences"
            returnKeyType="done"
            accessibilityLabel="Nombre de la cuenta"
            className="h-12 rounded-lg bg-superficie px-4 text-base text-texto"
            style={estiloCampo}
          />
        </Campo>

        {tipo === 'flexible' ? (
          <Campo
            etiqueta="Interés anual"
            error={errores.tasaBp}
            ayuda={
              interesAlDia > 0
                ? `Con lo que tienes hoy son unos ${formatMoneda(interesAlDia)} al día. Si el banco cambia la tasa, cámbiala aquí: rige desde hoy.`
                : 'La tasa anual que te da el banco. El interés se suma solo cada día.'
            }
          >
            <View className="h-12 flex-row items-center rounded-lg bg-superficie px-4">
              <TextInput
                value={tasaTexto}
                onChangeText={setTasaTexto}
                placeholder="0"
                placeholderTextColor={colores['texto-suave']}
                keyboardType="decimal-pad"
                maxLength={5}
                accessibilityLabel="Interés anual en porcentaje"
                className="flex-1 text-base text-texto"
                style={estiloCampo}
              />
              <Texto peso="bold" tono="suave">
                % al año
              </Texto>
            </View>
          </Campo>
        ) : null}

        {cuenta ? null : (
          <Campo
            etiqueta="¿Cuánto hay hoy en la cuenta?"
            error={errorSaldo}
            ayuda="El saldo que ves ahora en el banco. Puedes dejarlo en 0 y anotarlo después."
          >
            <View className="h-12 flex-row items-center rounded-lg bg-superficie px-4">
              <Texto peso="bold" tono="suave" className="mr-1">
                $
              </Texto>
              <TextInput
                value={saldoTexto}
                onChangeText={setSaldoTexto}
                placeholder="0.00"
                placeholderTextColor={colores['texto-suave']}
                keyboardType="decimal-pad"
                maxLength={12}
                accessibilityLabel="Saldo actual de la cuenta"
                className="flex-1 text-base text-texto"
                style={estiloCampo}
              />
            </View>
          </Campo>
        )}

        {guardar.isError ? (
          <Texto variante="detalle" tono="peligro" className="mt-4">
            {guardar.error.message}
          </Texto>
        ) : null}

        <View className="mt-8 gap-3">
          <Boton
            texto={cuenta ? 'Guardar cambios' : 'Crear cuenta'}
            tamano="lg"
            ancho
            cargando={guardar.isPending}
            onPress={alGuardar}
          />
          {cuenta ? (
            <>
              <Boton
                texto="Eliminar cuenta"
                icono="trash-outline"
                variante="peligro"
                ancho
                disabled={registros > 0}
                cargando={eliminar.isPending}
                onPress={alEliminar}
              />
              {registros > 0 ? (
                <Texto variante="mini" tono="suave" className="text-center">
                  Tiene {registros} {registros === 1 ? 'movimiento' : 'movimientos'}: una cuenta con
                  historia no se elimina, para no perder el rastro de esa plata.
                </Texto>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
