import { Link } from 'react-router-dom';
import { buildPublicPropertyPath } from '@/utils/constants';
import { listOfflineProperties } from '@/utils/offlineProperties';

const savedAtFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });

/** Fichas que se pueden abrir sin conexión porque ya se consultaron en este dispositivo. */
export default function OfflineSavedList() {
  const saved = listOfflineProperties();
  if (saved.length === 0) return null;

  return (
    <section
      aria-labelledby="offline-saved-title"
      className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <h2 id="offline-saved-title" className="text-ink text-xl">
        Disponibles sin conexión
      </h2>
      <p className="text-ink-muted mt-1 text-sm">
        Fichas que ya abriste en este dispositivo. Sus datos pueden no estar actualizados.
      </p>
      <ul className="mt-4 divide-y divide-stone-100">
        {saved.map((item) => (
          <li key={item.id}>
            <Link
              to={buildPublicPropertyPath(item.id)}
              className="hover:bg-surface flex flex-wrap items-center justify-between gap-2 rounded-xl px-2 py-3"
            >
              <span className="text-ink font-semibold">{item.title}</span>
              <span className="text-ink-muted text-xs">
                {item.propertyType ? `${item.propertyType} · ` : ''}guardada el{' '}
                {savedAtFormatter.format(item.savedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
