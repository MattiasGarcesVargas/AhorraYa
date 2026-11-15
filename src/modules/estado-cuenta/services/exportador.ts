/**
 * Cómo sale un archivo de la app. Contrato aparte de su implementación: en el
 * teléfono es "generar y abrir el menú de compartir" (`exportador-archivos.ts`)
 * y en el navegador, "imprimir o descargar" (`exportador-archivos.web.ts`).
 */
export interface Exportador {
  /** Convierte el HTML en PDF y lo ofrece para guardar o enviar. */
  compartirPdf(html: string, nombreArchivo: string): Promise<void>;
  compartirCsv(csv: string, nombreArchivo: string): Promise<void>;
}
