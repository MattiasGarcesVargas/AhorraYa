import type { Exportador } from './exportador';

function descargar(contenido: Blob, nombre: string) {
  const url = URL.createObjectURL(contenido);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/**
 * En el navegador no hay menú de compartir con archivos locales: el PDF se
 * abre en una pestaña con el diálogo de imprimir ("Guardar como PDF") y el
 * CSV se descarga directo.
 */
export const exportadorArchivos: Exportador = {
  async compartirPdf(html, nombreArchivo) {
    const ventana = window.open('', '_blank');
    if (!ventana) {
      throw new Error(
        'El navegador bloqueó la ventana. Permite ventanas emergentes e inténtalo otra vez.',
      );
    }
    ventana.document.open();
    ventana.document.write(html);
    ventana.document.close();
    ventana.document.title = nombreArchivo;
    ventana.focus();
    // Un respiro para que el navegador termine de maquetar antes de imprimir.
    setTimeout(() => ventana.print(), 400);
  },

  async compartirCsv(csv, nombreArchivo) {
    descargar(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${nombreArchivo}.csv`);
  },
};
