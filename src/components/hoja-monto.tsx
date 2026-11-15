import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MARGEN_PANTALLA } from '@/constants/layout.constants';
import type { Centavos } from '@/lib/dinero';
import { centavosAEntrada, entradaACentavos, pulsarTecla } from '@/lib/entrada-monto';

import { Encabezado } from './encabezado';
import { TecladoMonto } from './teclado-monto';
import { Boton, Texto } from './ui';
import { VisorMonto } from './visor-monto';

export interface HojaMontoProps {
  titulo: string;
  descripcion?: string;
  valorInicial?: Centavos;
  /** Texto del botón; recibe el importe para poder decir "Aportar $ 250.00". */
  textoGuardar: (centavos: Centavos) => string;
  /** Permite guardar $0 (p. ej. un límite de presupuesto en cero). */
  permitirCero?: boolean;
  guardando?: boolean;
  alGuardar: (centavos: Centavos) => void;
  /**
   * Por qué NO se puede guardar el importe escrito. Con texto, se muestra bajo
   * el importe y el botón se apaga. Como función recibe lo que se va tecleando.
   */
  error?: string | ((centavos: Centavos) => string | null);
  /**
   * Contenido extra entre el importe y el teclado (chips de tipo, interruptores).
   * Como función recibe el importe que se está escribiendo, para poder decir
   * "van $ 250 al ahorro, te quedan $ 100" mientras se teclea.
   */
  children?: ReactNode | ((centavos: Centavos) => ReactNode);
}

/**
 * Hoja genérica "escribe un importe y guárdalo". La usan el aporte al ahorro,
 * los ingresos, la meta y los límites del presupuesto: cada pantalla sólo dice
 * QUÉ guardar; el CÓMO se escribe vive aquí una sola vez.
 */
export function HojaMonto({
  titulo,
  descripcion,
  valorInicial = 0,
  textoGuardar,
  permitirCero = false,
  guardando = false,
  alGuardar,
  error,
  children,
}: HojaMontoProps) {
  const insets = useSafeAreaInsets();
  const [entrada, setEntrada] = useState(() => centavosAEntrada(valorInicial));
  const centavos = entradaACentavos(entrada);
  const importeValido = permitirCero ? entrada !== '' || valorInicial === 0 : centavos > 0;
  const motivoError = (typeof error === 'function' ? error(centavos) : error) || null;
  const valido = importeValido && motivoError === null;

  return (
    <View className="flex-1 bg-fondo">
      <Encabezado titulo={titulo} variante="hoja" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: MARGEN_PANTALLA, paddingBottom: 8 }}
        keyboardShouldPersistTaps="handled"
      >
        {descripcion ? (
          <Texto variante="detalle" tono="suave" className="text-center">
            {descripcion}
          </Texto>
        ) : null}
        <VisorMonto entrada={entrada} />
        {motivoError ? (
          <Texto
            variante="detalle"
            tono="peligro"
            className="mb-4 text-center"
            numerico
            accessibilityLiveRegion="polite"
          >
            {motivoError}
          </Texto>
        ) : null}
        {typeof children === 'function' ? children(centavos) : children}
      </ScrollView>

      <View
        className="gap-3 border-t border-borde pt-3"
        style={{ paddingHorizontal: MARGEN_PANTALLA, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <TecladoMonto alPulsar={(tecla) => setEntrada((actual) => pulsarTecla(actual, tecla))} />
        <Boton
          texto={importeValido ? textoGuardar(centavos) : 'Escribe un importe'}
          tamano="lg"
          ancho
          disabled={!valido}
          cargando={guardando}
          onPress={() => alGuardar(centavos)}
        />
      </View>
    </View>
  );
}
