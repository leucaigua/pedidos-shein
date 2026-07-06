const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos (0/O, 1/I)

export function generarCodigoCupon(): string {
  // Aleatoriedad criptográfica para que los cupones no sean predecibles.
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  let suf = '';
  for (let i = 0; i < bytes.length; i++) {
    suf += ALFABETO[bytes[i] % ALFABETO.length];
  }
  return `BIENVENIDO-${suf}`;
}
