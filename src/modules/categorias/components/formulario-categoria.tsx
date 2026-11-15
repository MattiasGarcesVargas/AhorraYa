import { useState } from 'react';
import { ScrollView, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarCategoria } from '@/components/avatar-categoria';
import { CampoEtiquetado } from '@/components/campo-etiquetado';
import { Encabezado } from '@/components/encabezado';
import { Boton, Chip, Separador, Texto } from '@/components/ui';
import {
  LARGO_MAXIMO_NOMBRE_CATEGORIA,
  type ColorCategoria,
  type NombreIcono,
} from '@/constants/categorias.constants';
import { MARGEN_PANTALLA } from '@/constants/layout.constants';
import { FUENTES } from '@/constants/tema.constants';
import { confirmar } from '@/lib/confirmar';
import { interpretarImporteOCero } from '@/lib/dinero';
import { centavosAEntrada } from '@/lib/entrada-monto';
import { formatMoneda } from '@/lib/format';
import { hapticos } from '@/lib/hapticos';
import { useTema } from '@/providers/tema-provider';

import type { Categoria } from '../categorias.types';
import {
  useCantidadGastos,
  useCategorias,
  useEliminarCategoria,
  useGuardarCategoria,
  useMoverCategoria,
} from '../hooks/use-categorias';
import { colorSugerido } from '../utils/catalogo';
import { motivoParaNoEliminar, validarCategoria } from '../utils/validar-categoria';
import { SelectorColor } from './selector-color';
import { SelectorIcono } from './selector-icono';

export interface FormularioCategoriaProps {
  /** Sin categoría: se crea una nueva. */
  categoria?: Categoria;
  alTerminar: () => void;
}

/**
 * Crear y editar una categoría: nombre, límite mensual, tono e ícono, con una
 * vista previa arriba. Al editar, también se reordena y se elimina (moviendo
 * antes sus gastos a otra categoría).
 */
export function FormularioCategoria({ categoria, alTerminar }: FormularioCategoriaProps) {
  const insets = useSafeAreaInsets();
  const { colores } = useTema();
  const { categorias = [] } = useCategorias();
  const guardar = useGuardarCategoria();
  const eliminar = useEliminarCategoria();
  const mover = useMoverCategoria();
  const cantidadGastos = useCantidadGastos(categoria?.id).data ?? 0;

  const [nombre, setNombre] = useState(categoria?.nombre ?? '');
  const [limiteTexto, setLimiteTexto] = useState(() =>
    centavosAEntrada(categoria?.limiteMensualCentavos ?? 0),
  );
  const [icono, setIcono] = useState<NombreIcono>(categoria?.icono ?? 'pricetag-outline');
  const [color, setColor] = useState<ColorCategoria>(
    () => categoria?.color ?? colorSugerido(categorias),
  );
  const [delExterior, setDelExterior] = useState(categoria?.delExterior ?? false);
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [moviendoGastos, setMoviendoGastos] = useState(false);
  const [destino, setDestino] = useState<string | null>(null);

  const limite = interpretarImporteOCero(limiteTexto);
  const validacion = validarCategoria(
    { nombre, icono, color, limiteMensualCentavos: limite ?? -1, delExterior },
    categorias,
    categoria?.id,
  );
  const errores = validacion.ok ? {} : validacion.errores;
  // Un nombre repetido se avisa al escribir; un campo vacío, sólo al intentar guardar.
  const errorNombre =
    errores.nombre && (intentoGuardar || nombre.trim() !== '') ? errores.nombre : undefined;
  const errorLimite =
    errores.limiteMensualCentavos && limiteTexto !== '' ? errores.limiteMensualCentavos : undefined;

  const posicion = categoria ? categorias.findIndex((c) => c.id === categoria.id) : -1;
  const otras = categorias.filter((c) => c.id !== categoria?.id);
  // Sólo cuenta cuando ya se está eligiendo a dónde van los gastos.
  const bloqueoEliminar = categoria
    ? motivoParaNoEliminar(categorias, categoria.id, cantidadGastos, destino)
    : null;

  const alGuardar = () => {
    setIntentoGuardar(true);
    if (!validacion.ok) return;
    guardar.mutate(
      { id: categoria?.id, datos: validacion.datos },
      {
        onSuccess: () => {
          hapticos.exito();
          alTerminar();
        },
      },
    );
  };

  const alEliminar = async () => {
    if (!categoria) return;
    if (cantidadGastos > 0 && !moviendoGastos) {
      setMoviendoGastos(true);
      return;
    }
    if (cantidadGastos === 0) {
      const ok = await confirmar({
        titulo: `¿Eliminar "${categoria.nombre}"?`,
        mensaje: 'No tiene gastos registrados.',
        textoConfirmar: 'Eliminar',
        destructivo: true,
      });
      if (!ok) return;
    }
    eliminar.mutate(
      { id: categoria.id, moverGastosA: cantidadGastos > 0 ? destino : null },
      {
        onSuccess: () => {
          hapticos.aviso();
          alTerminar();
        },
      },
    );
  };

  const nombreDestino = otras.find((c) => c.id === destino)?.nombre;

  return (
    <View className="flex-1 bg-fondo">
      <Encabezado titulo={categoria ? 'Editar categoría' : 'Nueva categoría'} variante="hoja" />

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingHorizontal: MARGEN_PANTALLA,
          paddingBottom: 16,
        }}
      >
        {/* Vista previa: así se verá en las listas. */}
        <View className="flex-row items-center gap-3 pb-5 pt-2">
          <AvatarCategoria icono={icono} color={color} tamano={48} />
          <View className="flex-1">
            <Texto peso="semibold" numberOfLines={1}>
              {nombre.trim() || 'Nombre de la categoría'}
            </Texto>
            <Texto variante="detalle" tono="suave" numerico>
              {limite
                ? `${formatMoneda(limite)} al mes · ${formatMoneda(Math.round(limite / 2))} por quincena`
                : 'Sin límite'}
            </Texto>
          </View>
        </View>
        <View className="mb-5">
          <Separador />
        </View>

        <CampoEtiquetado
          etiqueta="Nombre"
          error={errorNombre}
          ayuda="Si usas el atajo de iPhone, escribe este nombre igual en la lista del atajo."
        >
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej. Gimnasio"
            placeholderTextColor={colores['texto-suave']}
            maxLength={LARGO_MAXIMO_NOMBRE_CATEGORIA}
            autoCapitalize="sentences"
            returnKeyType="done"
            accessibilityLabel="Nombre de la categoría"
            className="h-12 rounded-lg border border-borde px-4 text-base text-texto"
            style={{ fontFamily: FUENTES.medium }}
          />
        </CampoEtiquetado>

        <CampoEtiquetado
          etiqueta="Límite al mes"
          error={errorLimite}
          ayuda="Lo que te permites gastar aquí cada mes. Déjalo en 0 si no quieres tope."
        >
          <View className="h-12 flex-row items-center rounded-lg border border-borde px-4">
            <Texto tono="suave" className="mr-1">
              $
            </Texto>
            <TextInput
              value={limiteTexto}
              onChangeText={setLimiteTexto}
              placeholder="0.00"
              placeholderTextColor={colores['texto-suave']}
              keyboardType="decimal-pad"
              accessibilityLabel="Límite mensual"
              className="flex-1 text-base text-texto"
              style={{ fontFamily: FUENTES.medium, fontVariant: ['tabular-nums'] }}
            />
          </View>
        </CampoEtiquetado>

        <CampoEtiquetado
          etiqueta="App del exterior"
          ayuda="Al pagarla con tarjeta se suman IVA 15 % e ISD 5 % (el ISD se devuelve)"
        >
          <View className="min-h-12 flex-row items-center justify-between">
            <Texto>Es una app del exterior</Texto>
            <Switch
              value={delExterior}
              onValueChange={setDelExterior}
              accessibilityLabel="App del exterior"
              trackColor={{ true: colores.primario, false: colores['superficie-alta'] }}
              thumbColor={colores.fondo}
              ios_backgroundColor={colores['superficie-alta']}
            />
          </View>
        </CampoEtiquetado>

        <CampoEtiquetado etiqueta="Color">
          <SelectorColor valor={color} alCambiar={setColor} />
        </CampoEtiquetado>

        <CampoEtiquetado etiqueta="Ícono">
          <SelectorIcono valor={icono} alCambiar={setIcono} />
        </CampoEtiquetado>

        {categoria ? (
          <>
            <CampoEtiquetado etiqueta="Posición en las listas">
              <View className="flex-row gap-3">
                <Boton
                  texto="Subir"
                  icono="arrow-up"
                  variante="contorno"
                  className="flex-1"
                  disabled={posicion <= 0 || mover.isPending}
                  onPress={() => mover.mutate({ id: categoria.id, direccion: -1 })}
                />
                <Boton
                  texto="Bajar"
                  icono="arrow-down"
                  variante="contorno"
                  className="flex-1"
                  disabled={posicion < 0 || posicion >= categorias.length - 1 || mover.isPending}
                  onPress={() => mover.mutate({ id: categoria.id, direccion: 1 })}
                />
              </View>
            </CampoEtiquetado>

            <View className="border-t border-borde pt-5">
              {moviendoGastos ? (
                <View className="mb-4">
                  <Texto peso="semibold">
                    Tiene {cantidadGastos} {cantidadGastos === 1 ? 'gasto' : 'gastos'}. ¿A qué
                    categoría los paso?
                  </Texto>
                  <Texto variante="detalle" tono="suave" className="mb-3 mt-1">
                    Así tus totales y tu historial siguen cuadrando.
                  </Texto>
                  <View className="flex-row flex-wrap gap-2">
                    {otras.map((otra) => (
                      <Chip
                        key={otra.id}
                        texto={otra.nombre}
                        icono={otra.icono}
                        seleccionado={destino === otra.id}
                        onPress={() => setDestino(otra.id)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              <Boton
                texto={
                  moviendoGastos
                    ? nombreDestino
                      ? `Pasar a ${nombreDestino} y eliminar`
                      : 'Elige una categoría'
                    : 'Eliminar categoría'
                }
                icono="trash-outline"
                variante="peligro"
                tamano="sm"
                ancho
                cargando={eliminar.isPending}
                disabled={categorias.length <= 1 || (moviendoGastos && bloqueoEliminar !== null)}
                onPress={alEliminar}
              />
              {categorias.length <= 1 ? (
                <Texto variante="detalle" tono="suave" className="mt-2 text-center">
                  Necesitas al menos una categoría.
                </Texto>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View
        className="border-t border-borde pt-3"
        style={{ paddingHorizontal: MARGEN_PANTALLA, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Boton
          texto={categoria ? 'Guardar cambios' : 'Crear categoría'}
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
