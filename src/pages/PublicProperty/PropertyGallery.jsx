import { useState } from 'react';
import { Isotype } from '@/components/brand';
import { cn } from '@/utils/helpers';

/** Galería de fotografías: imagen principal y miniaturas. Carga diferida salvo la primera. */
export default function PropertyGallery({ photos, title }) {
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState(() => new Set());

  const usable = photos.filter((photo) => !failed.has(photo.src));
  const current = usable[Math.min(selected, usable.length - 1)];

  const markFailed = (src) =>
    setFailed((previous) => {
      const next = new Set(previous);
      next.add(src);
      return next;
    });

  if (!current) {
    return (
      <div className="from-primary-50 to-earth-50 flex aspect-[16/9] flex-col items-center justify-center gap-3 rounded-3xl bg-linear-to-br text-center">
        <Isotype className="h-14 opacity-70" />
        <p className="text-ink-muted text-sm">Esta propiedad aún no tiene fotografías.</p>
      </div>
    );
  }

  const position = usable.indexOf(current);
  const go = (step) => setSelected((position + step + usable.length) % usable.length);

  return (
    <section aria-label="Galería de fotografías" className="flex flex-col gap-3">
      <div className="bg-surface-muted relative aspect-[16/9] overflow-hidden rounded-3xl shadow-sm">
        <img
          key={current.src}
          src={current.src}
          alt={`Fotografía ${position + 1} de ${usable.length} de ${title}`}
          fetchPriority={position === 0 ? 'high' : 'auto'}
          decoding="async"
          onError={() => markFailed(current.src)}
          className="h-full w-full object-cover"
        />
        {usable.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Foto anterior"
              className="text-ink absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-white"
            >
              <span aria-hidden="true" className="text-xl">
                ‹
              </span>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Foto siguiente"
              className="text-ink absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-white"
            >
              <span aria-hidden="true" className="text-xl">
                ›
              </span>
            </button>
            <p className="bg-brand-ink/75 absolute right-3 bottom-3 rounded-full px-3 py-1 text-xs font-medium text-white">
              {position + 1} / {usable.length}
            </p>
          </>
        )}
      </div>

      {usable.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {usable.map((photo, index) => (
            <li key={photo.src} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`Ver foto ${index + 1} de ${usable.length}`}
                aria-current={index === position ? 'true' : undefined}
                className={cn(
                  'block h-16 w-24 overflow-hidden rounded-xl border-2 transition sm:h-20 sm:w-28',
                  index === position
                    ? 'border-primary-600'
                    : 'border-transparent opacity-75 hover:opacity-100',
                )}
              >
                <img
                  src={photo.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={() => markFailed(photo.src)}
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
