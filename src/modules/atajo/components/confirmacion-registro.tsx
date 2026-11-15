import { useEffect } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Boton, Icono, Monto, Texto } from '@/components/ui';
import { metodoPagoPorId } from '@/constants/metodos-pago.constants';
import { useCatalogoCategorias } from '@/modules/categorias/hooks/use-categorias';
import { DesgloseExterior } from '@/modules/gastos/components/desglose-exterior';
import { useTema } from '@/providers/tema-provider';

import type { EstadoRegistro } from '../hooks/use-registro-desde-atajo';

/** Tiempo que se ve la confirmación antes de cerrarse sola. Alcanza para tocar "Deshacer". */
const CIERRE_AUTOMATICO_MS = 2600;
/**
 * Un pago con Apple Pay cae en la categoría por defecto: se deja más tiempo a
 * la vista para poder corregirla ahí mismo.
 */
const CIERRE_AUTOMATICO_WALLET_MS = 6000;

export interface ConfirmacionRegistroProps {
  estado: EstadoRegistro;
  alDeshacer: () => void;
  alCerrar: () => void;
  /** Abre el gasto recién registrado para corregirlo (categoría, descripción…). */
  alEditar: (id: number) => void;
}

/**
 * Lo que se ve al volver del atajo: un check, lo que se registró y la opción
 * de deshacer. Se cierra sola; tocar fuera también cierra.
 */
export function ConfirmacionRegistro({
  estado,
  alDeshacer,
  alCerrar,
  alEditar,
}: ConfirmacionRegistroProps) {
  const { colores } = useTema();
  const catalogo = useCatalogoCategorias();

  const deWallet = estado.fase === 'listo' && estado.gasto.origen === 'wallet';

  useEffect(() => {
    if (estado.fase !== 'listo' && estado.fase !== 'deshecho') return;
    const espera =
      estado.fase === 'deshecho'
        ? 900
        : deWallet
          ? CIERRE_AUTOMATICO_WALLET_MS
          : CIERRE_AUTOMATICO_MS;
    const temporizador = setTimeout(alCerrar, espera);
    return () => clearTimeout(temporizador);
  }, [estado.fase, deWallet, alCerrar]);

  return (
    <Pressable
      accessibilityLabel="Cerrar"
      onPress={alCerrar}
      className="flex-1 items-center justify-center bg-black/50 px-8"
    >
      {/* Sin animación propia: la hoja ya entra con fundido (`animation: 'fade'`). */}
      <View className="w-full max-w-sm">
        {/* El Pressable interior evita que un toque en la tarjeta la cierre. */}
        <Pressable className="items-center rounded-2xl border border-borde bg-fondo px-6 pb-6 pt-8">
          {estado.fase === 'guardando' ? (
            <View className="items-center py-6">
              <ActivityIndicator color={colores.primario} />
              <Texto variante="detalle" tono="suave" className="mt-3">
                Registrando…
              </Texto>
            </View>
          ) : null}

          {estado.fase === 'listo' ? (
            <View className="w-full items-center">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-primario">
                <Icono nombre="checkmark" tamano={30} color="primario-texto" />
              </View>
              <Texto variante="detalle" peso="semibold" tono="suave">
                {estado.duplicado
                  ? 'Ya estaba registrado'
                  : deWallet
                    ? 'Pago con Apple Pay registrado'
                    : 'Gasto registrado'}
              </Texto>
              <View className="my-1">
                <Monto centavos={estado.gasto.montoCentavos} tamano="lg" />
              </View>
              <Texto variante="detalle" tono="suave" className="text-center">
                {catalogo.porId(estado.gasto.categoria).nombre} ·{' '}
                {metodoPagoPorId(estado.gasto.metodoPago).nombre}
                {estado.gasto.nota ? ` · ${estado.gasto.nota}` : ''}
              </Texto>
              {estado.impuestos.length > 0 ? (
                <DesgloseExterior consumoCentavos={estado.gasto.montoCentavos} className="mt-2" />
              ) : null}
              {deWallet ? (
                <Boton
                  texto="Cambiar categoría"
                  icono="pricetag-outline"
                  variante="fantasma"
                  tamano="sm"
                  className="mt-3 self-center"
                  onPress={() => alEditar(estado.gasto.id)}
                />
              ) : null}
              <View className="mt-6 w-full flex-row gap-3">
                <Boton
                  texto="Deshacer"
                  variante="contorno"
                  className="flex-1"
                  onPress={alDeshacer}
                />
                <Boton texto="Listo" className="flex-1" onPress={alCerrar} />
              </View>
            </View>
          ) : null}

          {estado.fase === 'deshecho' ? (
            <View className="items-center py-4">
              <Icono nombre="arrow-undo" tamano={28} color="texto-suave" />
              <Texto peso="semibold" className="mt-2">
                Gasto eliminado
              </Texto>
            </View>
          ) : null}

          {estado.fase === 'error' ? (
            <View className="w-full items-center">
              <Icono nombre="alert-circle" tamano={32} color="peligro" />
              <Texto peso="semibold" className="mt-2 text-center">
                {estado.mensaje}
              </Texto>
              <Boton texto="Cerrar" variante="contorno" ancho className="mt-5" onPress={alCerrar} />
            </View>
          ) : null}
        </Pressable>
      </View>
    </Pressable>
  );
}
