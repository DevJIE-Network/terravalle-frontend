import Card from '@/components/ui/Card';

/**
 * HU-023 · Panel de mapa.
 *
 * El proyecto todavía NO tiene proveedor de mapas (Google Maps, Mapbox, Leaflet):
 * mientras eso no exista se muestra un bloque informativo y nunca se pide API key.
 * La ausencia del mapa NO impide guardar la ubicación.
 *
 * Punto de integración futura: reemplazar el marcador (`MapViewPlaceholder`)
 * por el componente del proveedor que se incorpore, pasándole
 * `location.latitude` / `location.longitude` como punto inicial.
 *
 * @param {object} props
 * @param {object|null} props.location Ubicación guardada en el backend.
 */
export default function LocationMapPanel({ location }) {
  const hasCoordinates =
    typeof location?.latitude === 'number' && typeof location?.longitude === 'number';
  const registeredPlace = buildRegisteredPlace(location);

  return (
    <Card title="Vista del mapa">
      <MapViewPlaceholder />

      {registeredPlace && (
        <p className="text-ink-muted mt-3 text-sm">
          {registeredPlace}
        </p>
      )}

      {hasCoordinates && (
        <dl className="mt-3 flex flex-col gap-1 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-muted">Coordenadas registradas</dt>
            <dd className="text-ink font-semibold" data-testid="coordinates-summary">
              {location.latitude}, {location.longitude}
            </dd>
          </div>
        </dl>
      )}

      <p className="text-ink-muted mt-3 text-xs">
        Cuando el mapa esté disponible podrás ajustar el punto directamente aquí.
      </p>
    </Card>
  );
}

/** Resumen textual de lo guardado (municipio/estado o dirección). */
function buildRegisteredPlace(location) {
  if (!location) return null;
  const parts = [location.municipality, location.state].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  return location.formattedAddress ?? null;
}

/** Bloque que dice con claridad que aún no hay mapa (mismo diseño que el resto de TerraValle). */
function MapViewPlaceholder() {
  return (
    <div
      role="note"
      aria-label="Estado del mapa"
      className="bg-surface-muted flex min-h-56 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 px-6 text-center"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-stone-400 size-10"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
        />
      </svg>
      <p className="text-ink text-sm font-semibold">
        Mapa no disponible actualmente. Puedes registrar la ubicación manualmente.
      </p>
    </div>
  );
}
