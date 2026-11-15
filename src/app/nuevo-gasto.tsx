import { useMemo } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { useUltimoDato } from '@/hooks/use-ultimo-dato';
import { confirmar } from '@/lib/confirmar';
import { formatMoneda } from '@/lib/format';
import { hapticos } from '@/lib/hapticos';
import { leerBorrador } from '@/modules/atajo/utils/interpretar-enlace';
import type { CatalogoCategorias } from '@/modules/categorias/categorias.types';
import { useCategorias } from '@/modules/categorias/hooks/use-categorias';
import type { Cuenta } from '@/modules/cuentas/cuentas.types';
import { useCuentas } from '@/modules/cuentas/hooks/use-cuentas';
import { cuentaPrincipal } from '@/modules/cuentas/utils/saldos';
import { FormularioGasto } from '@/modules/gastos/components/formulario-gasto';
import {
  useActualizarGasto,
  useEliminarGasto,
  useGasto,
  useRegistrarGasto,
} from '@/modules/gastos/hooks/use-gastos';
import { useUltimasElecciones } from '@/modules/gastos/store/ultimas-elecciones.store';

interface Datos {
  catalogo: CatalogoCategorias;
  cuentas: Cuenta[];
}

/**
 * Hoja de registro rápido. También es:
 *  - el destino de `ahorraya://nuevo-gasto` y de un enlace del atajo al que le
 *    falte algún dato: lo que sí llegó (`?monto=…&categoria=…`) aparece cargado;
 *  - la edición de un gasto ya registrado, con `?id=…`.
 */
export default function NuevoGastoScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { catalogo } = useCategorias();
  const cuentas = useCuentas().data;

  // El borrador se lee contra las categorías reales: hay que esperar a tenerlas.
  if (!catalogo || !cuentas) return null;
  return id ? (
    <Edicion id={Number(id)} catalogo={catalogo} cuentas={cuentas} />
  ) : (
    <Registro catalogo={catalogo} cuentas={cuentas} />
  );
}

function useCerrar() {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
}

function Registro({ catalogo, cuentas }: Datos) {
  const router = useRouter();
  const cerrar = useCerrar();
  const params = useLocalSearchParams();
  const clave = JSON.stringify(params);
  const borrador = useMemo(() => leerBorrador(JSON.parse(clave), catalogo), [clave, catalogo]);

  const registrar = useRegistrarGasto();
  const recordarMetodo = useUltimasElecciones((estado) => estado.recordarMetodo);

  return (
    <FormularioGasto
      catalogo={catalogo}
      borrador={borrador}
      cuentas={cuentas}
      cuentaPorDefecto={cuentaPrincipal(cuentas, 'diaria')?.id ?? null}
      aviso={typeof params.aviso === 'string' && params.aviso ? params.aviso : undefined}
      guardando={registrar.isPending}
      alCrearCategoria={() => router.push('/categoria')}
      alGuardar={(gasto) =>
        registrar.mutate(gasto, {
          onSuccess: () => {
            hapticos.exito();
            recordarMetodo(gasto.metodoPago);
            cerrar();
          },
        })
      }
    />
  );
}

function Edicion({ id, catalogo, cuentas }: Datos & { id: number }) {
  const router = useRouter();
  const cerrar = useCerrar();
  const consulta = useGasto(id);
  // Se recuerda el gasto: al eliminarlo la consulta queda vacía antes de cerrar la hoja.
  const gasto = useUltimoDato(consulta.data);
  const actualizar = useActualizarGasto();
  const eliminar = useEliminarGasto();

  if (!gasto) return consulta.isPending ? null : <Redirect href="/movimientos" />;
  // Un impuesto (IVA, ISD) se calcula de su consumo: se corrige el consumo, no él.
  if (gasto.gastoPadreId) {
    return (
      <Edicion
        key={gasto.gastoPadreId}
        id={gasto.gastoPadreId}
        catalogo={catalogo}
        cuentas={cuentas}
      />
    );
  }

  const alEliminar = async () => {
    const ok = await confirmar({
      titulo: '¿Eliminar este gasto?',
      mensaje: `${formatMoneda(gasto.montoCentavos)} · No se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      destructivo: true,
    });
    if (!ok) return;
    hapticos.aviso();
    eliminar.mutate(gasto.id, { onSuccess: cerrar });
  };

  return (
    <FormularioGasto
      key={gasto.id}
      catalogo={catalogo}
      gasto={gasto}
      cuentas={cuentas}
      cuentaPorDefecto={null}
      guardando={actualizar.isPending}
      alCrearCategoria={() => router.push('/categoria')}
      alEliminar={alEliminar}
      alGuardar={({ origen: _origen, ...cambios }) =>
        actualizar.mutate(
          { id: gasto.id, cambios },
          {
            onSuccess: () => {
              hapticos.exito();
              cerrar();
            },
          },
        )
      }
    />
  );
}
