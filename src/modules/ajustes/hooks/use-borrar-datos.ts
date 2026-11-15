import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useRepositorios } from '@/providers/repositorios-context';

export function useBorrarDatos() {
  const { datos } = useRepositorios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => datos.borrarTodo(),
    // Todo cambió: se invalida la caché entera en vez de clave por clave.
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
