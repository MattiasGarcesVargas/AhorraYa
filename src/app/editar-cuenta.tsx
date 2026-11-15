import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { useUltimoDato } from '@/hooks/use-ultimo-dato';
import { FormularioCuenta } from '@/modules/cuentas/components/formulario-cuenta';
import { useSaldosCuentas } from '@/modules/cuentas/hooks/use-cuentas';

/** `/editar-cuenta` crea una cuenta; `/editar-cuenta?id=…` edita (y permite eliminar) una existente. */
export default function EditarCuentaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { saldos } = useSaldosCuentas();

  // Se recuerda la cuenta: al eliminarla desaparece de `saldos` antes de cerrar la hoja.
  const saldo = useUltimoDato(id ? saldos?.find((s) => s.cuenta.id === Number(id)) : undefined);

  if (!saldos) return null;
  if (id && !saldo) return <Redirect href="/cuentas" />;

  const cerrar = () => (router.canGoBack() ? router.back() : router.replace('/cuentas'));
  // Eliminada la cuenta, su pantalla de detalle ya no tiene nada que mostrar: se vuelve a la lista.
  const alEliminar = () => router.dismissTo('/cuentas');

  // `key`: si se abre otra cuenta reutilizando la pantalla, el formulario arranca de cero.
  return (
    <FormularioCuenta
      key={id ?? 'nueva'}
      cuenta={saldo?.cuenta}
      tasaBp={saldo?.tasaBp}
      saldoCentavos={saldo?.saldo}
      alTerminar={cerrar}
      alEliminar={alEliminar}
    />
  );
}
