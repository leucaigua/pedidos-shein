import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

/**
 * Layout compartido para las páginas legales (privacidad, términos, cookies,
 * envíos y devoluciones). Aplica una tipografía consistente a los <h2>, <p>,
 * <ul>, etc. que reciba como children, sin depender del plugin de typography.
 */
export default function LegalLayout({
  titulo,
  actualizado,
  intro,
  children,
}: {
  titulo: string;
  actualizado: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-[#FAFAFA]">
        {/* Encabezado */}
        <div className="bg-[#1A1A1A] text-white px-4 py-14">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">{titulo}</h1>
            <p className="text-sm text-gray-400">Última actualización: {actualizado}</p>
            {intro && <p className="text-gray-300 mt-4 leading-relaxed">{intro}</p>}
          </div>
        </div>

        {/* Contenido */}
        <div className="max-w-3xl mx-auto px-4 py-12">
          <article
            className="
              bg-white rounded-2xl border border-[#E5E5E5] p-6 md:p-10
              text-[#3D3D3D] leading-relaxed
              [&_h2]:font-display [&_h2]:font-bold [&_h2]:text-xl [&_h2]:text-[#1A1A1A]
              [&_h2]:mt-9 [&_h2]:mb-3 [&_h2]:first:mt-0
              [&_h3]:font-semibold [&_h3]:text-base [&_h3]:text-[#1A1A1A] [&_h3]:mt-6 [&_h3]:mb-2
              [&_p]:text-sm [&_p]:mb-4
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1.5 [&_ul]:text-sm
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-1.5 [&_ol]:text-sm
              [&_a]:text-[#1A1A1A] [&_a]:font-medium [&_a]:underline
              [&_strong]:text-[#1A1A1A] [&_strong]:font-semibold
              [&_table]:w-full [&_table]:text-sm [&_table]:border-collapse [&_table]:mb-4
              [&_th]:text-left [&_th]:border [&_th]:border-[#E5E5E5] [&_th]:bg-[#FAFAFA] [&_th]:p-2
              [&_td]:border [&_td]:border-[#E5E5E5] [&_td]:p-2 [&_td]:align-top
            "
          >
            {children}
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
