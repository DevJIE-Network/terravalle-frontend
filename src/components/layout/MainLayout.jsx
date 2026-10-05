import { Outlet } from 'react-router-dom';
import DevAuthToggle from '@/components/dev/DevAuthToggle';
import Footer from './Footer';
import Header from './Header';

/**
 * Estructura común de todas las páginas: encabezado, contenido y pie.
 * Cada página se dibuja dentro de <Outlet />, con un ancho máximo y márgenes laterales
 * ya aplicados, así que las páginas NO necesitan agregar su propio contenedor.
 */
export default function MainLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
        <Outlet />
      </main>
      <Footer />
      {/* Solo aparece con `npm run dev`; no se incluye en el build de producción. */}
      {import.meta.env.DEV && <DevAuthToggle />}
    </div>
  );
}
