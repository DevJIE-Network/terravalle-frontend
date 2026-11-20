import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand';
import { ROUTES } from '@/utils/constants';
import Navbar from './Navbar';

/** Encabezado fijo con el logotipo de TerraValle y el menú principal. */
export default function Header() {
  return (
    <header className="bg-surface/95 sticky top-0 z-40 border-b border-stone-200 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to={ROUTES.HOME} className="shrink-0 rounded-lg">
          <Logo size="sm" />
          <span className="sr-only"> — ir al inicio</span>
        </Link>
        <Navbar />
      </div>
    </header>
  );
}
