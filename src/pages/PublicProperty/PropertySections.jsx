import ServiceIcon from '@/pages/PropertyServices/ServiceIcon';
import {
  addressLines,
  constructionRows,
  dimensionRows,
  formatApproxDistance,
  groupNearbyPlaces,
  hasCoordinates,
  mapEmbedUrl,
  mapLinkUrl,
} from '@/utils/propertyDetail';
import { serviceIconName } from '@/utils/propertyServices';

/** Contenedor de cada bloque de la ficha. */
export function DetailSection({ id, title, eyebrow, children }) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
    >
      {eyebrow && (
        <p className="text-earth-700 mb-1 text-xs font-semibold tracking-[0.14em] uppercase">
          {eyebrow}
        </p>
      )}
      <h2 id={id} className="text-ink mb-5 text-xl sm:text-2xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

function FactGrid({ rows, label }) {
  return (
    <dl aria-label={label} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="bg-surface rounded-2xl px-4 py-3">
          <dt className="text-ink-muted text-xs font-medium">{row.label}</dt>
          <dd className="text-ink font-display mt-1 text-lg font-semibold">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Terreno y construcción. Si no hay ningún dato, la sección no se muestra. */
export function FeaturesSection({ property }) {
  const land = dimensionRows(property.dimensions);
  const built = constructionRows(property.construction);
  if (land.length === 0 && built.length === 0) return null;

  return (
    <DetailSection id="ficha-caracteristicas" eyebrow="Ficha técnica" title="Características">
      <div className="flex flex-col gap-6">
        {land.length > 0 && (
          <div>
            <h3 className="text-ink mb-3 text-base">Terreno</h3>
            <FactGrid rows={land} label="Terreno" />
          </div>
        )}
        {built.length > 0 && (
          <div>
            <h3 className="text-ink mb-3 text-base">Construcción</h3>
            <FactGrid rows={built} label="Construcción" />
          </div>
        )}
        {land.length > 0 && !property.hasConstruction && (
          <p className="text-ink-muted text-sm">Terreno sin construcción.</p>
        )}
      </div>
    </DetailSection>
  );
}

export function ServicesSection({ services }) {
  if (!services?.length) return null;
  return (
    <DetailSection id="ficha-servicios" eyebrow="Infraestructura" title="Servicios disponibles">
      <ul className="flex flex-wrap gap-2" aria-label="Servicios disponibles">
        {services.map((service) => (
          <li
            key={service.id}
            className="border-primary-100 bg-primary-50 text-primary-800 flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
          >
            <ServiceIcon name={serviceIconName(service)} className="size-4" />
            {service.name}
          </li>
        ))}
      </ul>
      <p className="text-ink-muted mt-4 text-xs">
        Información declarada por el vendedor; TerraValle no certifica la disponibilidad de los
        servicios.
      </p>
    </DetailSection>
  );
}

/** Ubicación con mapa y entorno con distancias aproximadas. */
export function LocationSection({ property, distanceNote }) {
  const lines = addressLines(property.location);
  const withMap = hasCoordinates(property.location);
  const groups = groupNearbyPlaces(property.nearbyPlaces);
  if (!lines && !withMap && groups.length === 0) return null;

  return (
    <DetailSection id="ficha-ubicacion" eyebrow="Entorno" title="Ubicación y alrededores">
      <div className="flex flex-col gap-6">
        {lines && (
          <address className="text-ink not-italic">
            {lines.map((line, index) => (
              <span
                key={line}
                className={index === 0 ? 'block font-semibold' : 'text-ink-muted block'}
              >
                {line}
              </span>
            ))}
          </address>
        )}

        {withMap && (
          <div className="overflow-hidden rounded-2xl border border-stone-200">
            <iframe
              title={`Mapa de la ubicación de ${property.title}`}
              src={mapEmbedUrl(property.location)}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="aspect-[16/9] w-full"
            />
            <p className="bg-surface text-ink-muted flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs">
              <span>© colaboradores de OpenStreetMap</span>
              <a
                href={mapLinkUrl(property.location)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-700 font-semibold hover:underline"
              >
                Abrir mapa completo
              </a>
            </p>
          </div>
        )}

        {groups.length > 0 && (
          <div>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-ink text-base">Lugares cercanos</h3>
              <p className="text-earth-800 bg-earth-50 rounded-full px-3 py-1 text-xs font-semibold">
                {distanceNote || 'Las distancias son aproximadas.'}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map((group) => (
                <div key={group.category} className="bg-surface rounded-2xl p-4">
                  <h4 className="text-primary-800 font-display mb-2 text-sm font-semibold">
                    {group.category}
                  </h4>
                  <ul className="flex flex-col gap-1.5">
                    {group.items.map((place) => (
                      <li
                        key={place.id}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <span className="text-ink min-w-0">{place.name}</span>
                        <span className="text-ink-muted shrink-0 tabular-nums">
                          {formatApproxDistance(place.approximateDistanceM)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DetailSection>
  );
}
