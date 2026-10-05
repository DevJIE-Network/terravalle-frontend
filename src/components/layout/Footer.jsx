import { APP_NAME } from '@/utils/constants';

/** Pie de página sencillo. */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="text-ink-muted mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-center text-sm sm:flex-row sm:justify-between sm:text-left">
        <p>
          © {year} {APP_NAME}
        </p>
        <p>Proyecto académico · UTTT</p>
      </div>
    </footer>
  );
}
