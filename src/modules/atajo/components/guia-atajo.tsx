import { View } from 'react-native';
import * as Linking from 'expo-linking';

import { Boton, Texto } from '@/components/ui';
import { useCatalogoCategorias } from '@/modules/categorias/hooks/use-categorias';

import { enlaceNuevoGasto, enlaceRegistrar, plantillaAtajo } from '../utils/enlaces';
import { BloqueCopiable } from './bloque-copiable';
import { ListaPasos, type Paso } from './lista-pasos';

/**
 * Nombres de las acciones tal como aparecen en la app Atajos con el iPhone en
 * español. La lista de categorías es la ACTUAL: si creas una, aparece aquí.
 */
function pasos(categorias: string): Paso[] {
  return [
    {
      titulo: 'Crea el atajo',
      detalle:
        'Abre la app Atajos y toca + (arriba a la derecha). Toca el nombre de arriba y ponle "Registrar gasto". Ese nombre NO se busca: "Registrar gasto" no es una acción, es el nombre de TU atajo. Las acciones de los pasos siguientes sí se buscan en "Buscar acciones".',
    },
    {
      titulo: 'Pregunta la categoría',
      detalle: `Agrega la acción "Lista" con: ${categorias}. Debajo, "Elegir de la lista" con el texto "¿En qué gastaste?".`,
    },
    {
      titulo: 'Pregunta el importe',
      detalle: 'Agrega "Solicitar entrada", tipo Número, con el texto "¿Cuánto?".',
    },
    {
      titulo: 'Pregunta la forma de pago',
      detalle:
        'Otra "Lista" con: Efectivo, Debito, Credito, Transferencia, y otro "Elegir de la lista" con "¿Cómo pagaste?".',
    },
    {
      titulo: 'Arma el enlace',
      detalle:
        'Agrega "URL" y pega la plantilla de abajo. Reemplaza cada [hueco] por su variable: [Cuánto] → Entrada proporcionada, [Categoría] → el primer Elemento elegido, [Pago] → el segundo.',
    },
    {
      titulo: 'Ábrelo',
      detalle:
        'Termina con la acción "Abrir URL". Si pagaste con débito o transferencia, AhorraYa te pregunta de qué cuenta sale (te muestra tus cuentas con su saldo), registra el gasto y te muestra la confirmación. No hay que agregar las cuentas al atajo.',
    },
    {
      titulo: 'Asígnalo al doble toque',
      detalle:
        'Ajustes del iPhone → Accesibilidad → Tocar → Tocar atrás → Doble toque → "Registrar gasto".',
    },
  ];
}

export function GuiaAtajo() {
  const catalogo = useCatalogoCategorias();
  const PASOS = pasos(catalogo.lista.map((categoria) => categoria.nombre).join(', '));
  const probar = () =>
    Linking.openURL(
      enlaceRegistrar({
        monto: '1.00',
        categoria: 'Imprevistos',
        metodo: 'Efectivo',
        nota: 'Prueba del atajo',
      }),
    );

  return (
    <View className="gap-6">
      <Texto tono="suave">
        Con un doble toque en la parte de atrás del iPhone eliges la categoría, escribes el importe
        y la forma de pago, y el gasto queda registrado. Sin buscar la app.
      </Texto>

      <ListaPasos pasos={PASOS} />

      <BloqueCopiable etiqueta="Plantilla para la acción URL" valor={plantillaAtajo()} />

      <Boton
        texto="Probar con un gasto de $ 1.00"
        icono="flash-outline"
        variante="secundario"
        ancho
        onPress={probar}
      />

      <View className="gap-3">
        <Texto peso="bold">¿Prefieres algo más simple?</Texto>
        <Texto variante="detalle" tono="suave">
          {
            'Un atajo con una sola acción "Abrir URL" y este enlace abre AhorraYa directo en la pantalla de nuevo gasto.'
          }
        </Texto>
        <BloqueCopiable etiqueta="Enlace al registro rápido" valor={enlaceNuevoGasto()} />
      </View>
    </View>
  );
}
