import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { FormularioCategoria } from '@/modules/categorias/components/formulario-categoria';
import { useCategorias } from '@/modules/categorias/hooks/use-categorias';

/** `/categoria` crea una nueva; `/categoria?id=…` edita (y permite eliminar) una existente. */
export default function CategoriaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { categorias } = useCategorias();

  if (!categorias) return null;

  const categoria = id ? categorias.find((c) => c.id === id) : undefined;
  if (id && !categoria) return <Redirect href="/categorias" />;

  const cerrar = () => (router.canGoBack() ? router.back() : router.replace('/categorias'));

  // `key`: si se abre otra categoría reutilizando la pantalla, el formulario arranca de cero.
  return <FormularioCategoria key={id ?? 'nueva'} categoria={categoria} alTerminar={cerrar} />;
}
