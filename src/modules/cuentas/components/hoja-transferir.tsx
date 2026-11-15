import { useState } from 'react';
import { View } from 'react-native';

import { CampoDescripcion } from '@/components/campo-descripcion';
import { CampoEtiquetado } from '@/components/campo-etiquetado';
import { HojaMonto } from '@/components/hoja-monto';
import { SelectorDia } from '@/components/selector-dia';
import { BotonIcono, Chip } from '@/components/ui';
import { hoyIso } from '@/lib/fechas';
import { formatMoneda } from '@/lib/format';
import { hapticos } from '@/lib/hapticos';

import type { OrigenAporte } from '../cuentas.types';
import { useRegistrarMovimientoCuenta } from '../hooks/use-cuentas';
import type { SaldoCuenta } from '../utils/saldos';
import { armarTransferencia, validarTransferencia } from '../utils/transferencia';
import { SelectorCuenta } from './selector-cuenta';

export interface HojaTransferirProps {
  /** Todas las cuentas con su saldo. */
  saldos: readonly SaldoCuenta[];
  /** La cuenta desde la que se abrió la hoja: es el "Desde" propuesto. */
  desdeInicialId: number;
  alTerminar: () => void;
}

/** Mover plata entre dos cuentas propias: una sale, la otra recibe. */
export function HojaTransferir({ saldos, desdeInicialId, alTerminar }: HojaTransferirProps) {
  const registrar = useRegistrarMovimientoCuenta();
  const cuentas = saldos.map((s) => s.cuenta);

  const [desdeId, setDesdeId] = useState(desdeInicialId);
  const [haciaId, setHaciaId] = useState(
    () => cuentas.find((cuenta) => cuenta.id !== desdeInicialId)?.id ?? desdeInicialId,
  );
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(hoyIso);
  const [origen, setOrigen] = useState<OrigenAporte>('sueldo');

  const desde = saldos.find((s) => s.cuenta.id === desdeId);
  const hacia = saldos.find((s) => s.cuenta.id === haciaId);
  if (!desde || !hacia) return null;

  const entraAlAhorro = hacia.cuenta.tipo === 'flexible';

  const intercambiar = () => {
    hapticos.seleccion();
    setDesdeId(haciaId);
    setHaciaId(desdeId);
  };
  // Elegir como una punta la cuenta que ya es la otra equivale a intercambiarlas.
  const elegirDesde = (id: number | null) => {
    if (id === null) return;
    if (id === haciaId) setHaciaId(desdeId);
    setDesdeId(id);
  };
  const elegirHacia = (id: number | null) => {
    if (id === null) return;
    if (id === desdeId) setDesdeId(haciaId);
    setHaciaId(id);
  };

  const error = (centavos: number) =>
    validarTransferencia({ desdeId, haciaId, montoCentavos: centavos }, desde.saldo);

  return (
    <HojaMonto
      titulo="Transferir"
      descripcion="Mueve plata entre tus cuentas."
      guardando={registrar.isPending}
      textoGuardar={(centavos) => {
        if (desdeId !== haciaId && centavos > desde.saldo) {
          return `${desde.cuenta.nombre} sólo tiene ${formatMoneda(desde.saldo)}`;
        }
        return `Transferir ${formatMoneda(centavos)}`;
      }}
      alGuardar={(montoCentavos) => {
        if (error(montoCentavos)) return;
        registrar.mutate(
          armarTransferencia(
            {
              desdeId,
              haciaId,
              montoCentavos,
              nota: descripcion.trim() || null,
              fecha,
              origen: entraAlAhorro ? origen : undefined,
            },
            cuentas,
          ),
          { onSuccess: alTerminar },
        );
      }}
    >
      <CampoEtiquetado etiqueta="Desde" ayuda={`Disponible: ${formatMoneda(desde.saldo)}`}>
        <SelectorCuenta cuentas={cuentas} valor={desdeId} alCambiar={elegirDesde} />
      </CampoEtiquetado>

      <View className="-mt-2 mb-3 items-center">
        <BotonIcono
          icono="swap-vertical"
          etiqueta={`Invertir: de ${hacia.cuenta.nombre} a ${desde.cuenta.nombre}`}
          variante="fantasma"
          onPress={intercambiar}
        />
      </View>

      <CampoEtiquetado etiqueta="Hacia" ayuda={`Tiene: ${formatMoneda(hacia.saldo)}`}>
        <SelectorCuenta cuentas={cuentas} valor={haciaId} alCambiar={elegirHacia} />
      </CampoEtiquetado>

      {entraAlAhorro ? (
        <CampoEtiquetado etiqueta="De dónde viene">
          <View className="flex-row gap-2" accessibilityRole="radiogroup">
            <Chip
              texto="De mi sueldo"
              seleccionado={origen === 'sueldo'}
              onPress={() => setOrigen('sueldo')}
            />
            <Chip
              texto="Extra"
              seleccionado={origen === 'extra'}
              onPress={() => setOrigen('extra')}
            />
          </View>
        </CampoEtiquetado>
      ) : null}

      <CampoEtiquetado etiqueta="Día">
        <SelectorDia valor={fecha} alCambiar={setFecha} />
      </CampoEtiquetado>
      <CampoEtiquetado etiqueta="Nota">
        <CampoDescripcion
          valor={descripcion}
          alCambiar={setDescripcion}
          marcador="Motivo (opcional)"
        />
      </CampoEtiquetado>
    </HojaMonto>
  );
}
