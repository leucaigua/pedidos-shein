import type { NextConfig } from "next";

// Cabeceras de seguridad aplicadas a todas las rutas.
// Nota: no se fija una Content-Security-Policy estricta para no romper widgets
// de terceros ya integrados (Elfsight/TikTok, Google/Meta tags). Si más
// adelante se hace un inventario de orígenes, se puede añadir un CSP a medida.
const securityHeaders = [
  // Fuerza HTTPS durante 2 años (incluye subdominios).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Evita que el navegador "adivine" tipos MIME.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Anti-clickjacking: solo el propio sitio puede enmarcar sus páginas.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // No filtrar la URL completa como referer a otros orígenes.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Desactiva APIs sensibles que la app no usa.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
