import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { FormularioSuscripcion } from '@/modules/suscripciones/components/formulario-suscripcion';
import { useSuscripciones } from '@/modules/suscripciones/hooks/use-suscripciones';

/** `/suscripcion` crea una nueva; `/suscripcion?id=…` edita (y permite eliminar) una existente. */
export default function SuscripcionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: suscripciones } = useSuscripciones();

  if (!suscripciones) return null;

  const suscripcion = id ? suscripciones.find((s) => s.id === Number(id)) : undefined;
  if (id && !suscripcion) return <Redirect href="/suscripciones" />;

  const cerrar = () => (router.canGoBack() ? router.back() : router.replace('/suscripciones'));

  return (
    <FormularioSuscripcion key={id ?? 'nueva'} suscripcion={suscripcion} alTerminar={cerrar} />
  );
}
