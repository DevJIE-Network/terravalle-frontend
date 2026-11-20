import { Logo } from '@/components/brand';
import { APP_NAME } from '@/utils/constants';

/** Pie de página con el logotipo sobre Tinta (fondo oscuro del manual). */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-brand-ink text-stone-300">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-sm sm:flex-row sm:items-end sm:justify-between">
        <Logo tone="light" tagline />
        <div className="flex flex-col gap-1 text-center sm:text-right">
          <p>
            © {year} {APP_NAME}
          </p>
          <p>Proyecto académico · UTTT</p>
        </div>
      </div>
    </footer>
  );
}
