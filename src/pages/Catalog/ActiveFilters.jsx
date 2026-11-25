import { Button } from '@/components/ui';

/**
 * Etiquetas de los filtros aplicados (siempre visibles, aunque el panel esté plegado en móvil).
 * Cada una se quita por separado; "Limpiar filtros" vuelve al catálogo general.
 */
export default function ActiveFilters({ chips, onRemove, onClear }) {
  if (chips.length === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <p className="text-ink-muted text-sm font-medium">Filtros activos:</p>
      <ul aria-label="Filtros activos" className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li
            key={chip.id}
            className="border-primary-100 bg-primary-50 text-primary-800 flex items-center gap-1 rounded-full border py-1 pr-1 pl-3 text-sm font-medium"
          >
            <span>{chip.label}</span>
            <button
              type="button"
              onClick={() => onRemove(chip)}
              aria-label={`Quitar filtro: ${chip.label}`}
              className="hover:bg-primary-100 focus-visible:ring-primary-500/40 flex size-7 items-center justify-center rounded-full transition focus-visible:ring-4 focus-visible:outline-none"
            >
              <span aria-hidden="true">×</span>
            </button>
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" onClick={onClear}>
        Limpiar filtros
      </Button>
    </div>
  );
}
