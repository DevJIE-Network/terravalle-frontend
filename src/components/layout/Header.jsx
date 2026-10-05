import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import Navbar from './Navbar';

/**
 * Encabezado fijo con el logo (texto provisional) y el menú principal.
 * TODO: reemplazar el logo de texto por el logo definitivo cuando exista.
 */
export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          to={ROUTES.HOME}
          className="text-primary-700 shrink-0 text-xl font-bold tracking-tight"
        >
          Terra<span className="text-earth-600">Valle</span>
          <span className="sr-only"> — ir al inicio</span>
        </Link>
        <Navbar />
      </div>
    </header>
  );
}
