import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { useUltimoDato } from '@/hooks/use-ultimo-dato';
import { hapticos } from '@/lib/hapticos';
import {
  HojaAporte,
  HojaCuadrar,
  HojaEditarMovimiento,
  HojaRetiro,
  HojaSaldoInicial,
} from '@/modules/cuentas/components/hojas-movimiento';
import { HojaTransferir } from '@/modules/cuentas/components/hoja-transferir';
import {
  useMovimientoCuenta,
  useMovimientosCuenta,
  useSaldosCuentas,
} from '@/modules/cuentas/hooks/use-cuentas';

type Tipo = 'aporte' | 'retiro' | 'inicial' | 'cuadrar' | 'transferir';

function esTipo(valor: unknown): valor is Tipo {
  return (
    valor === 'aporte' ||
    valor === 'retiro' ||
    valor === 'inicial' ||
    valor === 'cuadrar' ||
    valor === 'transferir'
  );
}

/**
 * Hoja de movimientos de una cuenta:
 *  - `?cuenta=2&tipo=aporte|retiro|inicial|cuadrar|transferir` registra uno nuevo;
 *  - `?id=14` abre uno ya registrado para corregirlo o eliminarlo.
 */
export default function MovimientoCuentaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cuenta?: string; tipo?: string; id?: string }>();
  const idMovimiento = params.id ? Number(params.id) : undefined;

  const { saldos } = useSaldosCuentas();
  const movimientos = useMovimientosCuenta().data;
  const consulta = useMovimientoCuenta(idMovimiento);
  const movimiento = useUltimoDato(consulta.data);

  const terminar = () => {
    hapticos.exito();
    if (router.canGoBack()) router.back();
    else router.replace('/cuentas');
  };

  if (idMovimiento !== undefined) {
    if (!movimiento) return consulta.isPending ? null : <Redirect href="/cuentas" />;
    return (
      <HojaEditarMovimiento key={movimiento.id} movimiento={movimiento} alTerminar={terminar} />
    );
  }

  if (!saldos || !movimientos) return null;

  const saldo = saldos.find((s) => s.cuenta.id === Number(params.cuenta));
  if (!saldo) return <Redirect href="/cuentas" />;

  const tipo: Tipo = esTipo(params.tipo) ? params.tipo : 'aporte';
  const comunes = { saldo, saldos, alTerminar: terminar };
  // `key`: cambiar de cuenta o de tipo reutilizando la pantalla arranca de cero.
  const clave = `${tipo}-${saldo.cuenta.id}`;

  switch (tipo) {
    case 'aporte':
      return (
        <HojaAporte
          key={clave}
          {...comunes}
          alAnotarSaldoInicial={() => router.setParams({ tipo: 'inicial' })}
        />
      );
    case 'retiro':
      return <HojaRetiro key={clave} {...comunes} />;
    case 'transferir':
      return (
        <HojaTransferir
          key={clave}
          saldos={saldos}
          desdeInicialId={saldo.cuenta.id}
          alTerminar={terminar}
        />
      );
    case 'cuadrar':
      return <HojaCuadrar key={`${clave}-${saldo.saldo}`} saldo={saldo} alTerminar={terminar} />;
    case 'inicial': {
      const inicial =
        movimientos.find((m) => m.tipo === 'inicial' && m.cuentaId === saldo.cuenta.id)
          ?.montoCentavos ?? 0;
      return (
        <HojaSaldoInicial
          key={`${clave}-${inicial}`}
          saldo={saldo}
          inicial={inicial}
          alTerminar={terminar}
        />
      );
    }
  }
}
