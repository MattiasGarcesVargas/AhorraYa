import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { hoyIso } from '@/lib/fechas';
import { ConfirmacionRegistro } from '@/modules/atajo/components/confirmacion-registro';
import { ElegirCuentaEnlace } from '@/modules/atajo/components/elegir-cuenta-enlace';
import { useRegistroDesdeAtajo } from '@/modules/atajo/hooks/use-registro-desde-atajo';
import {
  usePagoAutomatico,
  usePagoAutomaticoListo,
} from '@/modules/atajo/store/pago-automatico.store';
import {
  borradorAParametros,
  diagnosticarEnlace,
  interpretarEnlaceGasto,
  type ContextoEnlace,
} from '@/modules/atajo/utils/interpretar-enlace';
import type { CatalogoCategorias } from '@/modules/categorias/categorias.types';
import { useCategorias } from '@/modules/categorias/hooks/use-categorias';
import { useCuentas, useSaldosCuentas } from '@/modules/cuentas/hooks/use-cuentas';
import { cuentaPrincipal } from '@/modules/cuentas/utils/saldos';
import type { NuevoGasto } from '@/modules/gastos/gastos.types';

/**
 * Destino del atajo de iPhone y de la automatización de Wallet:
 *   ahorraya://registrar?monto=4.50&categoria=Comida&metodo=Efectivo
 *   ahorraya://registrar?origen=wallet&monto=US$ 4.50&nota=Supermaxi
 *
 * Con todos los datos, registra y confirma sin pedir nada más. Si falta algo,
 * abre el formulario con lo que llegó para completarlo. Lo único que la app
 * pregunta siempre que haga falta es de qué cuenta sale la plata: las cuentas
 * las conoce la app, no el atajo.
 */
export default function RegistrarDesdeAtajoScreen() {
  const { catalogo } = useCategorias();
  const cuentas = useCuentas().data;
  const preferenciasListas = usePagoAutomaticoListo();
  const categoriaWallet = usePagoAutomatico((estado) => estado.categoriaWallet);

  const contexto = useMemo<ContextoEnlace | undefined>(
    () =>
      cuentas
        ? {
            cuentaDiariaId: cuentaPrincipal(cuentas, 'diaria')?.id ?? null,
            categoriaWallet,
            cuentas,
          }
        : undefined,
    [cuentas, categoriaWallet],
  );

  // La categoría del enlace se busca entre las reales, y un pago con Apple Pay
  // necesita la cuenta y la categoría por defecto: hay que esperar a tenerlas.
  if (!catalogo || !contexto || !preferenciasListas) return null;
  return <Interpretar catalogo={catalogo} contexto={contexto} />;
}

function Interpretar({
  catalogo,
  contexto,
}: {
  catalogo: CatalogoCategorias;
  contexto: ContextoEnlace;
}) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const clave = JSON.stringify(params);
  const resultado = useMemo(
    () => interpretarEnlaceGasto(JSON.parse(clave), hoyIso(), catalogo, contexto),
    [clave, catalogo, contexto],
  );

  useEffect(() => {
    if (resultado.tipo === 'incompleto') {
      // Se avisa QUÉ faltó: si no, el formulario vacío no dice cómo arreglar el atajo.
      const aviso = diagnosticarEnlace(JSON.parse(clave), catalogo, contexto.cuentas).join('\n');
      router.replace({
        pathname: '/nuevo-gasto',
        params: { ...borradorAParametros(resultado.borrador), aviso },
      });
    }
  }, [resultado, router, clave, catalogo, contexto.cuentas]);

  if (resultado.tipo === 'incompleto') return null;
  return (
    <ConCuenta
      gasto={resultado.gasto}
      preguntar={resultado.cuentaPorElegir}
      categoria={catalogo.porId(resultado.gasto.categoria).nombre}
    />
  );
}

/** Pregunta la cuenta si hace falta y, con ella elegida, registra. */
function ConCuenta({
  gasto,
  preguntar,
  categoria,
}: {
  gasto: NuevoGasto;
  preguntar: boolean;
  categoria: string;
}) {
  const router = useRouter();
  const { saldos } = useSaldosCuentas();
  const [elegida, setElegida] = useState<number | null>(null);

  const cuentaId = preguntar ? elegida : gasto.cuentaId;
  const listo = useMemo(() => ({ ...gasto, cuentaId }), [gasto, cuentaId]);

  // Para preguntar (o saber si sale del ahorro) hacen falta los saldos.
  if (!saldos) return null;

  if (preguntar && elegida === null) {
    return (
      <ElegirCuentaEnlace
        gasto={gasto}
        categoria={categoria}
        saldos={saldos.filter((saldo) => saldo.cuenta.tipo !== 'efectivo')}
        alElegir={setElegida}
        alCancelar={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
    );
  }

  const saleDelAhorro = saldos.some(
    (s) => s.cuenta.id === cuentaId && s.cuenta.tipo === 'flexible',
  );
  return <Confirmacion gasto={listo} saleDelAhorro={saleDelAhorro} />;
}

function Confirmacion({ gasto, saleDelAhorro }: { gasto: NuevoGasto; saleDelAhorro: boolean }) {
  const router = useRouter();
  const { estado, deshacer } = useRegistroDesdeAtajo(gasto, saleDelAhorro);

  const cerrar = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  // La confirmación se reemplaza por la hoja de edición: al cerrarla se vuelve al inicio.
  const editar = useCallback(
    (id: number) => router.replace({ pathname: '/nuevo-gasto', params: { id: String(id) } }),
    [router],
  );

  return (
    <ConfirmacionRegistro
      estado={estado}
      alDeshacer={deshacer}
      alCerrar={cerrar}
      alEditar={editar}
    />
  );
}
