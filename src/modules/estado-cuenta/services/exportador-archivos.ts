import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { Exportador } from './exportador';

/** A4 en puntos (72 por pulgada). */
const A4 = { width: 595, height: 842 };
/** iOS no respeta `@page { margin }` del HTML: los márgenes van aquí. */
const MARGENES_IOS = { top: 36, right: 32, bottom: 36, left: 32 };

async function compartir(archivo: File, mimeType: string, UTI: string, dialogTitle: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Este dispositivo no permite compartir archivos.');
  }
  // El menú de compartir de iOS ofrece "Guardar en Archivos", AirDrop, WhatsApp…
  await Sharing.shareAsync(archivo.uri, { mimeType, UTI, dialogTitle });
}

export const exportadorArchivos: Exportador = {
  async compartirPdf(html, nombreArchivo) {
    const { uri } = await Print.printToFileAsync({ html, ...A4, margins: MARGENES_IOS });
    // expo-print le pone un nombre aleatorio; se renombra para que se entienda al guardarlo.
    const pdf = new File(uri);
    await pdf.move(new File(Paths.cache, `${nombreArchivo}.pdf`), { overwrite: true });
    await compartir(pdf, 'application/pdf', 'com.adobe.pdf', 'Estado de cuenta');
  },

  async compartirCsv(csv, nombreArchivo) {
    const archivo = new File(Paths.cache, `${nombreArchivo}.csv`);
    archivo.create({ overwrite: true });
    await archivo.write(csv);
    await compartir(archivo, 'text/csv', 'public.comma-separated-values-text', 'Movimientos');
  },
};
