import { ScrollView, View } from 'react-native';
import * as Linking from 'expo-linking';

import { Boton, Chip, Texto } from '@/components/ui';
import { hapticos } from '@/lib/hapticos';
import { useCatalogoCategorias } from '@/modules/categorias/hooks/use-categorias';

import { usePagoAutomatico } from '../store/pago-automatico.store';
import { enlaceRegistrar, plantillaWallet } from '../utils/enlaces';
import { BloqueCopiable } from './bloque-copiable';
import { ListaPasos, type Paso } from './lista-pasos';

/**
 * Nombres tal como aparecen en la app Atajos con el iPhone en español. Los de
 * las variables pueden variar un poco según la versión de iOS: por eso van
 * también en inglés.
 */
const PASOS: Paso[] = [
  {
    titulo: 'Crea la automatización',
    detalle:
      'Abre la app Atajos, entra en la pestaña "Automatización" y toca +. Busca "Transacción" y elígela.',
  },
  {
    titulo: 'Elige tu tarjeta',
    detalle:
      'En "Cuando use sin contacto" marca tu tarjeta de débito. Abajo elige "Ejecutar inmediatamente" y apaga "Notificar al ejecutar". Toca Siguiente y luego "Nueva automatización en blanco".',
  },
  {
    titulo: 'Arma el enlace',
    detalle:
      'Agrega la acción "URL" y pega la plantilla de abajo. Borra [Importe], toca "Entrada del atajo" y elige Importe (Amount). Haz lo mismo con [Comercio], eligiendo Comercio (Merchant).',
  },
  {
    titulo: 'Ábrelo',
    detalle: 'Agrega la acción "Abrir URL" debajo y toca OK. No hace falta nada más.',
  },
  {
    titulo: 'Paga y revisa',
    detalle:
      'Al pagar acercando el iPhone, AhorraYa se abre con el pago ya registrado en débito. Ahí mismo puedes cambiarle la categoría, o después tocando el gasto en Movimientos.',
  },
];

/**
 * Guía para que los pagos con Apple Pay se registren solos, y elección de la
 * categoría en la que caen (el pago no trae categoría).
 */
export function GuiaWallet() {
  const catalogo = useCatalogoCategorias();
  const preferida = usePagoAutomatico((estado) => estado.categoriaWallet);
  const elegir = usePagoAutomatico((estado) => estado.elegirCategoriaWallet);
  // Si la preferida se eliminó, rige la primera de la lista (igual que al registrar).
  const vigente = catalogo.lista.some((c) => c.id === preferida)
    ? preferida
    : (catalogo.lista[0]?.id ?? null);

  const probar = () =>
    Linking.openURL(
      enlaceRegistrar({ origen: 'wallet', monto: 'US$ 1.00', nota: 'Prueba de Apple Pay' }),
    );

  return (
    <View className="gap-6">
      <Texto tono="suave">
        Si tienes tu tarjeta de débito en Wallet, cada pago que hagas acercando el iPhone se
        registra solo: con el importe, el comercio como descripción y la forma de pago en débito.
      </Texto>

      <View className="gap-2">
        <Texto peso="semibold">Categoría por defecto</Texto>
        <Texto variante="detalle" tono="suave">
          El pago no dice en qué gastaste, así que cae aquí. Después la cambias en un toque.
        </Texto>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 py-1"
          accessibilityRole="radiogroup"
        >
          {catalogo.lista.map((categoria) => (
            <Chip
              key={categoria.id}
              texto={categoria.nombre}
              icono={categoria.icono}
              seleccionado={vigente === categoria.id}
              onPress={() => {
                hapticos.seleccion();
                elegir(categoria.id);
              }}
            />
          ))}
        </ScrollView>
      </View>

      <ListaPasos pasos={PASOS} />

      <BloqueCopiable etiqueta="Plantilla para la acción URL" valor={plantillaWallet()} />

      <Boton
        texto="Probar con un pago de $ 1.00"
        icono="flash-outline"
        variante="contorno"
        ancho
        onPress={probar}
      />

      <View className="gap-1 border-t border-borde pt-4">
        <Texto variante="detalle" peso="semibold">
          Ten en cuenta
        </Texto>
        <Texto variante="detalle" tono="suave">
          Sólo se registran los pagos hechos con el iPhone o el Apple Watch; con la tarjeta física,
          no. Si pagas algo que ya anotaste al retirar del ahorro, quedará dos veces: borra uno. Y
          mientras uses la app desde Expo Go, sólo funciona con la computadora encendida en tu misma
          red.
        </Texto>
      </View>
    </View>
  );
}
