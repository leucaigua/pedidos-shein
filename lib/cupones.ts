const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos (0/O, 1/I)

export function generarCodigoCupon(): string {
  let suf = '';
  for (let i = 0; i < 5; i++) {
    suf += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return `BIENVENIDO-${suf}`;
}
