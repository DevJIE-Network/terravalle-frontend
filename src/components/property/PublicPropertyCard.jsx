import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui';
import { buildPublicPropertyPath } from '@/utils/constants';
import {
  formatMxnPrice,
  formatPropertyArea,
  getPublicPhotoUrl,
  getPublicPropertyType,
  summarizePropertyLocation,
} from '@/utils/publicProperties';

function PropertyPhoto({ primaryPhoto, title }) {
  const url = getPublicPhotoUrl(primaryPhoto);
  const [failedUrl, setFailedUrl] = useState(null);

  return (
    <div className="bg-surface-muted -mx-5 -mt-4 mb-5 aspect-[4/3] overflow-hidden">
      {url && url !== failedUrl ? (
        <img
          src={url}
          alt={`Fotografía principal de ${title}`}
          loading="lazy"
          decoding="async"
          width="640"
          height="480"
          onError={() => setFailedUrl(url)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="from-primary-50 to-earth-50 text-primary-700 flex h-full flex-col items-center justify-center gap-3 bg-linear-to-br px-4 text-center">
          <svg
            aria-hidden="true"
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="size-14"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 24 24 9l18 15M11 20v20h26V20M20 40V28h8v12M5 40h38"
            />
            <path strokeLinecap="round" d="M33 10h7m-3.5-3.5v7" />
          </svg>
          <span className="text-ink-muted text-sm">Fotografía no disponible</span>
        </div>
      )}
    </div>
  );
}

/** Un solo enlace por tarjeta: navegable con teclado, sin controles anidados. */
export default function PublicPropertyCard({ property }) {
  const headingId = `public-property-${property.id}-title`;

  return (
    <article aria-labelledby={headingId} className="h-full">
      <Link
        to={buildPublicPropertyPath(property.id)}
        aria-label={`Ver propiedad: ${property.title}`}
        className="group block h-full rounded-xl"
      >
        <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
          <div className="flex h-full flex-col">
            <PropertyPhoto primaryPhoto={property.primaryPhoto} title={property.title} />
            <p className="bg-earth-50 text-earth-800 mb-3 self-start rounded-full px-3 py-1 text-xs font-semibold">
              {getPublicPropertyType(property.propertyType)}
            </p>
            <h2
              id={headingId}
              className="text-ink group-hover:text-primary-700 text-lg font-semibold break-words"
            >
              {property.title}
            </h2>
            <p className="text-ink-muted mt-1 text-sm break-words">
              {summarizePropertyLocation(property.location)}
            </p>
            <p className="text-primary-800 mt-4 text-xl font-bold">
              {formatMxnPrice(property.publicationPrice)}
            </p>
            <div className="text-ink-muted mt-2 mb-5 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              <span>
                <span className="sr-only">Superficie de terreno: </span>
                {formatPropertyArea(property.landArea)}
              </span>
              {property.hasConstruction === true && property.builtArea != null && (
                <span>{formatPropertyArea(property.builtArea)} construidos</span>
              )}
            </div>
            <div className="text-primary-700 mt-auto flex items-center justify-between border-t border-stone-100 pt-4 text-sm font-semibold">
              Ver propiedad <span aria-hidden="true">→</span>
            </div>
          </div>
        </Card>
      </Link>
    </article>
  );
}
