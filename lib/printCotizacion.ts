/** Espera las imágenes del documento oculto antes de abrir la impresión. */
export async function imprimirCotizacion(): Promise<void> {
  const images = Array.from(document.querySelectorAll<HTMLImageElement>('.solo-print img'));
  await Promise.all(images.map((image) => image.decode().catch(() => {
    // Una imagen no disponible no debe impedir imprimir el resto de la cotización.
  })));
  window.print();
}
