import { useId, useRef, useState } from 'react';
import { Button, Input } from '@/components/ui';
import { PROPERTY_TYPES } from '@/utils/constants';
import { cn } from '@/utils/helpers';
import { CATALOG_FILTER_LIMITS, validateCatalogFilters } from '@/utils/catalogFilters';

const FIELD_CLASSES = cn(
  'text-ink h-12 w-full rounded-xl border bg-white px-4 text-base shadow-xs transition',
  'focus:ring-4 focus:outline-none',
);

/** Lista desplegable con el mismo aspecto que `Input`. */
function SelectField({ label, error, id, children, ...rest }) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={selectId} className="text-ink text-sm font-medium">
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-message` : undefined}
        className={cn(
          FIELD_CLASSES,
          error
            ? 'border-red-500 focus:ring-red-100'
            : 'focus:border-primary-500 focus:ring-primary-100 border-stone-300 hover:border-stone-400',
        )}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <p id={`${selectId}-message`} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function ServicesField({ services, selected, error, onToggle }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-ink mb-1 text-sm font-medium">
        Servicios (con todos los marcados)
      </legend>
      {services.status === 'loading' && (
        <p className="text-ink-muted text-sm">Cargando servicios...</p>
      )}
      {services.status === 'error' && (
        <p className="text-ink-muted text-sm">
          No pudimos cargar los servicios disponibles. Puedes buscar con los demás filtros.
        </p>
      )}
      {services.status === 'ready' && services.items.length === 0 && (
        <p className="text-ink-muted text-sm">Aún no hay servicios disponibles para filtrar.</p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {services.items.map((service) => (
          <label
            key={service.id}
            className="text-ink flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 text-sm"
          >
            <input
              type="checkbox"
              checked={selected.includes(String(service.id))}
              onChange={() => onToggle(String(service.id))}
              className="accent-primary-600 size-4"
            />
            {service.name}
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/**
 * Barra de búsqueda y panel de filtros del catálogo.
 *
 * - Un solo formulario: Enter en la barra o "Aplicar filtros" validan TODO antes de buscar (CA4).
 * - En móvil el panel es una sección desplegable; desde `lg` siempre está abierto.
 * - Los valores iniciales salen de la URL; el padre lo reinicia (con `key`) cuando la URL cambia.
 *
 * @param {object} props
 * @param {object} props.initialValues Criterios como texto (ver `valuesFromSearchParams`).
 * @param {Record<string, string>} [props.initialErrors] Errores si la URL traía valores inválidos.
 * @param {{ status: 'loading'|'ready'|'error', items: Array<{ id: number, name: string }> }} props.services
 * @param {(filters: object) => void} props.onApply Se llama solo con criterios válidos.
 */
export default function CatalogFilters({ initialValues, initialErrors = {}, services, onApply }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState(initialErrors);
  const [open, setOpen] = useState(Object.keys(initialErrors).length > 0);
  const formRef = useRef(null);
  const panelId = useId();

  const setField = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
  };

  function toggleService(id) {
    setValues((current) => ({
      ...current,
      serviceIds: current.serviceIds.includes(id)
        ? current.serviceIds.filter((item) => item !== id)
        : [...current.serviceIds, id],
    }));
    setErrors((current) => ({ ...current, serviceIds: undefined }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const result = validateCatalogFilters(values);
    if (Object.keys(result.errors).length > 0) {
      setErrors(result.errors);
      setOpen(true);
      // Espera a que el panel se muestre para llevar el foco al primer campo con error.
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    setErrors({});
    onApply(result.filters);
  }

  return (
    <form
      ref={formRef}
      role="search"
      aria-label="Buscar y filtrar propiedades"
      onSubmit={handleSubmit}
      noValidate
      className="mb-6 flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Input
          label="Buscar propiedades"
          type="search"
          name="q"
          value={values.q}
          onChange={setField('q')}
          error={errors.q}
          placeholder="Título, municipio o estado"
          maxLength={CATALOG_FILTER_LIMITS.search + 20}
          autoComplete="off"
        />
        <div className="flex gap-2">
          <Button type="submit" size="lg" className="flex-1 sm:flex-none">
            Buscar
          </Button>
          <Button
            variant="secondary"
            size="lg"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((current) => !current)}
            className="lg:hidden"
          >
            Filtros
          </Button>
        </div>
      </div>

      <div id={panelId} className={cn('flex-col gap-5', open ? 'flex' : 'hidden lg:flex')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="Tipo de inmueble"
            name="propertyTypeId"
            value={values.propertyTypeId}
            onChange={setField('propertyTypeId')}
            error={errors.propertyTypeId}
          >
            <option value="">Todos</option>
            {PROPERTY_TYPES.map((type) => (
              <option key={type.id} value={String(type.id)}>
                {type.name}
              </option>
            ))}
          </SelectField>

          <Input
            label="Estado"
            name="state"
            value={values.state}
            onChange={setField('state')}
            error={errors.state}
            placeholder="Ej. Jalisco"
            autoComplete="off"
          />
          <Input
            label="Municipio"
            name="municipality"
            value={values.municipality}
            onChange={setField('municipality')}
            error={errors.municipality}
            placeholder="Ej. Puerto Vallarta"
            autoComplete="off"
          />

          <Input
            label="Precio mínimo (MXN)"
            name="minPrice"
            inputMode="decimal"
            value={values.minPrice}
            onChange={setField('minPrice')}
            error={errors.minPrice}
            placeholder="0"
          />
          <Input
            label="Precio máximo (MXN)"
            name="maxPrice"
            inputMode="decimal"
            value={values.maxPrice}
            onChange={setField('maxPrice')}
            error={errors.maxPrice}
          />
          <SelectField
            label="Construcción"
            name="hasConstruction"
            value={values.hasConstruction}
            onChange={setField('hasConstruction')}
            error={errors.hasConstruction}
          >
            <option value="">Cualquiera</option>
            <option value="true">Con construcción</option>
            <option value="false">Sin construcción</option>
          </SelectField>

          <Input
            label="Superficie mínima (m²)"
            name="minLandArea"
            inputMode="decimal"
            value={values.minLandArea}
            onChange={setField('minLandArea')}
            error={errors.minLandArea}
            placeholder="0"
          />
          <Input
            label="Superficie máxima (m²)"
            name="maxLandArea"
            inputMode="decimal"
            value={values.maxLandArea}
            onChange={setField('maxLandArea')}
            error={errors.maxLandArea}
          />
        </div>

        <ServicesField
          services={services}
          selected={values.serviceIds}
          error={errors.serviceIds}
          onToggle={toggleService}
        />

        <div className="flex sm:justify-end">
          <Button type="submit" className="w-full sm:w-auto">
            Aplicar filtros
          </Button>
        </div>
      </div>
    </form>
  );
}
