import { PALETAS } from '@/constants/tema.constants';
import type { Centavos } from '@/lib/dinero';
import { formatFechaNumerica } from '@/lib/fechas';
import { formatMoneda, formatMonedaConSigno, formatPorcentaje } from '@/lib/format';

import type { EstadoCuenta, LineaCuenta } from '../estado-cuenta.types';
import { LOGO_PNG_BASE64 } from './logo-estado-cuenta';

/**
 * El estado de cuenta como HTML para imprimir en PDF. Siempre con la paleta
 * CLARA: un documento se lee en papel o en pantalla blanca, no en modo oscuro.
 *
 * Todo texto que escribió la persona (notas, nombres de categoría) pasa por
 * `escapar`: una nota con `<` no debe romper el documento.
 */
const C = PALETAS.claro;

export function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const TIPO: Record<LineaCuenta['tipo'], string> = {
  gasto: 'Gasto',
  ingreso: 'Ingreso',
  aporte: 'Ahorro',
  retiro: 'Ahorro',
};

const LOGO = `<img class="logo" alt="AhorraYa" src="data:image/png;base64,${LOGO_PNG_BASE64}"/>`;

function claseMonto(monto: Centavos): string {
  return monto > 0 ? 'num pos' : 'num';
}

function estilos(): string {
  return `
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; color: ${C.texto}; font-size: 10.5px; line-height: 1.45;
    font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .num { font-variant-numeric: tabular-nums; white-space: nowrap; text-align: right; }
  .suave { color: ${C['texto-suave']}; }
  .pos { color: ${C.primario}; }
  .peligro { color: ${C.peligro}; }
  header { display: flex; justify-content: space-between; align-items: flex-end;
    padding-bottom: 14px; border-bottom: 1px solid ${C.borde}; }
  .marca { display: flex; align-items: center; }
  .marca .logo { height: 26px; width: auto; display: block; }
  .titulo { text-align: right; }
  .titulo .eyebrow { font-size: 9px; letter-spacing: .08em; text-transform: uppercase; color: ${C['texto-suave']}; }
  .titulo h1 { margin: 2px 0 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
  .hero { margin-top: 16px; background: ${C.tinta}; color: ${C['tinta-texto']};
    border-radius: 14px; padding: 16px 18px; display: flex; }
  .hero .dato { flex: 1; }
  .hero .dato + .dato { border-left: 1px solid ${C['tinta-borde']}; padding-left: 14px; margin-left: 14px; }
  .hero .etq { color: ${C['tinta-suave']}; font-size: 9px; letter-spacing: .06em; text-transform: uppercase; }
  .hero .val { font-size: 17px; font-weight: 800; margin-top: 3px; }
  .hero .sub { color: ${C['tinta-suave']}; font-size: 9px; margin-top: 2px; }
  .menta { color: ${C.menta}; }
  .aviso { margin-top: 10px; border-radius: 10px; padding: 9px 12px; background: ${C.acento}; color: ${C['acento-texto']}; }
  .aviso.parcial { background: ${C.superficie}; color: ${C['texto-suave']}; }
  h2 { font-size: 12.5px; margin: 22px 0 8px; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { text-align: left; font-size: 8.5px; text-transform: uppercase; letter-spacing: .05em;
    color: ${C['texto-suave']}; font-weight: 700; padding: 6px; border-bottom: 1px solid ${C.texto}; }
  th.num { text-align: right; }
  td { padding: 6px; border-bottom: 1px solid ${C.borde}; vertical-align: top; }
  tr { page-break-inside: avoid; }
  tfoot td { font-weight: 800; border-top: 1px solid ${C.texto}; border-bottom: none; }
  .punto { display: inline-block; width: 8px; height: 8px; border-radius: 4px; margin-right: 6px; }
  .barra { display: inline-block; width: 64px; height: 5px; border-radius: 3px; background: ${C['superficie-alta']};
    overflow: hidden; vertical-align: middle; margin-right: 6px; }
  .barra i { display: block; height: 100%; background: ${C.primario}; }
  .barra i.exceso { background: ${C.peligro}; }
  .detalle { color: ${C['texto-suave']}; font-size: 9px; }
  .vacio { color: ${C['texto-suave']}; padding: 8px 0; }
  .dos { display: flex; gap: 18px; }
  .dos > div { flex: 1; }
  footer { margin-top: 26px; padding-top: 10px; border-top: 1px solid ${C.borde}; color: ${C['texto-suave']}; font-size: 8.5px; }
  `;
}

function tablaCategorias(e: EstadoCuenta): string {
  if (e.categorias.length === 0) return `<p class="vacio">Sin categorías con gasto este mes.</p>`;

  const filas = e.categorias
    .map((c) => {
      const ancho = Math.min(100, Math.round(c.porcentaje));
      const uso = c.sinTope
        ? '<span class="suave">Sin tope</span>'
        : `<span class="barra"><i class="${c.excedido ? 'exceso' : ''}" style="width:${ancho}%"></i></span>${formatPorcentaje(c.porcentaje)}`;
      const diferencia = c.sinTope
        ? '—'
        : `<span class="${c.excedido ? 'peligro' : ''}">${c.excedido ? `+${formatMoneda(-c.diferencia)}` : formatMoneda(c.diferencia)}</span>`;
      return `<tr>
        <td><span class="punto" style="background:${C[c.color]}"></span>${escapar(c.nombre)}</td>
        <td class="num">${formatMoneda(c.gastado)}</td>
        <td class="num">${c.sinTope ? '—' : formatMoneda(c.limite)}</td>
        <td class="num">${diferencia}</td>
        <td class="num">${uso}</td>
      </tr>`;
    })
    .join('');

  return `<table>
    <thead><tr><th>Categoría</th><th class="num">Gastado</th><th class="num">Presupuesto</th><th class="num">Queda / exceso</th><th class="num">Uso</th></tr></thead>
    <tbody>${filas}</tbody>
    <tfoot><tr><td>Total</td><td class="num">${formatMoneda(e.totales.gastos)}</td><td colspan="3"></td></tr></tfoot>
  </table>`;
}

function tablaMetodos(e: EstadoCuenta): string {
  if (e.metodos.length === 0) return `<p class="vacio">Sin gastos este mes.</p>`;
  const filas = e.metodos
    .map(
      (m) =>
        `<tr><td>${escapar(m.nombre)}</td><td class="num">${m.cantidad}</td><td class="num">${formatMoneda(m.total)}</td></tr>`,
    )
    .join('');
  return `<table>
    <thead><tr><th>Forma de pago</th><th class="num">Gastos</th><th class="num">Total</th></tr></thead>
    <tbody>${filas}</tbody>
  </table>`;
}

function tablaMovimientos(e: EstadoCuenta): string {
  if (e.movimientos.length === 0) return `<p class="vacio">Sin movimientos este mes.</p>`;

  const filas = e.movimientos
    .map((l) => {
      // Sin nota, el concepto YA es la categoría: no se repite debajo.
      const detalle = [l.categoria === l.concepto ? null : l.categoria, l.metodo]
        .filter(Boolean)
        .map((t) => escapar(t as string))
        .join(' · ');
      return `<tr>
        <td class="num" style="text-align:left">${formatFechaNumerica(l.fecha)}</td>
        <td>${escapar(l.concepto)}${detalle ? `<div class="detalle">${detalle}</div>` : ''}</td>
        <td class="suave">${TIPO[l.tipo]}</td>
        <td class="${claseMonto(l.monto)}">${formatMonedaConSigno(l.monto)}</td>
      </tr>`;
    })
    .join('');

  return `<table>
    <thead><tr><th style="width:68px">Fecha</th><th>Concepto</th><th style="width:60px">Tipo</th><th class="num" style="width:92px">Monto</th></tr></thead>
    <tbody>${filas}</tbody>
    <tfoot><tr><td></td><td>Resultado del mes</td><td></td><td class="${claseMonto(e.totales.flujoLibre)}">${formatMonedaConSigno(e.totales.flujoLibre)}</td></tr></tfoot>
  </table>`;
}

function tablaAhorro(e: EstadoCuenta): string {
  const filas = e.ahorro.lineas
    .map(
      (l) => `<tr>
        <td class="num" style="text-align:left">${formatFechaNumerica(l.fecha)}</td>
        <td>${escapar(l.concepto)}</td>
        <td class="${claseMonto(l.monto)}">${formatMonedaConSigno(l.monto)}</td>
        <td class="num">${formatMoneda(l.saldo)}</td>
      </tr>`,
    )
    .join('');

  return `<table>
    <thead><tr><th style="width:68px">Fecha</th><th>Movimiento</th><th class="num">Monto</th><th class="num">Saldo</th></tr></thead>
    <tbody>
      <tr><td></td><td class="suave">Saldo al inicio del mes</td><td></td><td class="num">${formatMoneda(e.ahorro.saldoAlInicio)}</td></tr>
      ${filas || '<tr><td></td><td class="vacio" colspan="3">Sin aportes ni retiros este mes.</td></tr>'}
    </tbody>
    <tfoot><tr><td></td><td>Saldo al cierre</td><td></td><td class="num">${formatMoneda(e.ahorro.saldoAlCierre)}</td></tr></tfoot>
  </table>`;
}

export function estadoCuentaHtml(e: EstadoCuenta): string {
  const { totales, meta } = e;
  const textoMeta = meta.cumplida
    ? `Cumpliste tu meta de ahorro: ${formatMoneda(meta.alcanzado)} de ${formatMoneda(meta.objetivo)}.`
    : `Ahorraste ${formatMoneda(meta.alcanzado)} de tu meta de ${formatMoneda(meta.objetivo)} (${formatPorcentaje(meta.porcentaje)}).`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Estado de cuenta · ${escapar(e.titulo)}</title>
<style>${estilos()}</style>
</head>
<body>
  <header>
    <div class="marca">${LOGO}</div>
    <div class="titulo">
      <div class="eyebrow">Estado de cuenta</div>
      <h1>${escapar(e.titulo)}</h1>
      <div class="suave">${escapar(e.rango)}</div>
    </div>
  </header>

  <section class="hero">
    <div class="dato"><div class="etq">Ingresos</div><div class="val num" style="text-align:left">${formatMoneda(totales.ingresos)}</div></div>
    <div class="dato"><div class="etq">Gastos</div><div class="val num" style="text-align:left">${formatMoneda(totales.gastos)}</div>
      <div class="sub">${e.cantidadGastos} gastos · ${formatMoneda(e.promedioDiario)} al día</div></div>
    <div class="dato"><div class="etq">Ahorrado</div><div class="val num menta" style="text-align:left">${formatMoneda(totales.ahorroNeto)}</div>
      <div class="sub">Meta ${formatMoneda(meta.objetivo)}</div></div>
    <div class="dato"><div class="etq">Saldo de ahorro</div><div class="val num" style="text-align:left">${formatMoneda(e.ahorro.saldoAlCierre)}</div>
      <div class="sub">Al cierre del periodo</div></div>
  </section>

  <div class="aviso">${textoMeta} Resultado del mes (ingresos − gastos − ahorro): <strong>${formatMonedaConSigno(totales.flujoLibre)}</strong>.</div>
  ${e.enCurso ? `<div class="aviso parcial">El mes aún no termina: las cifras llegan hasta el ${escapar(e.generadoEl)}.</div>` : ''}

  <h2>Gastos por categoría</h2>
  ${tablaCategorias(e)}

  <div class="dos">
    <div>
      <h2>Por forma de pago</h2>
      ${tablaMetodos(e)}
    </div>
    <div>
      <h2>Resumen</h2>
      <table><tbody>
        <tr><td>Ingresos</td><td class="num pos">${formatMonedaConSigno(totales.ingresos)}</td></tr>
        <tr><td>Gastos</td><td class="num">${formatMonedaConSigno(-totales.gastos)}</td></tr>
        <tr><td>Aportes al ahorro</td><td class="num">${formatMonedaConSigno(-totales.aportes)}</td></tr>
        <tr><td>Retiros del ahorro</td><td class="num">${formatMonedaConSigno(totales.retiros)}</td></tr>
      </tbody>
      <tfoot><tr><td>Resultado del mes</td><td class="${claseMonto(totales.flujoLibre)}">${formatMonedaConSigno(totales.flujoLibre)}</td></tr></tfoot></table>
    </div>
  </div>

  <h2>Movimientos</h2>
  ${tablaMovimientos(e)}

  <h2>Cuenta de ahorro</h2>
  ${tablaAhorro(e)}

  <footer>Generado el ${escapar(e.generadoEl)} con AhorraYa. Datos registrados por ti y guardados sólo en tu teléfono.</footer>
</body>
</html>`;
}
