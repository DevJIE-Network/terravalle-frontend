import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { estimationService, getPropertyDimensions, savePropertyDimensions } from '@/api';
import { Alert, Button, Card, ErrorState, Input, Loader, PageHeader } from '@/components/ui';
import { useUnsavedChanges } from '@/hooks';
import { CONSTRUCTION_CONDITIONS, ROUTES } from '@/utils/constants';
import { cn } from '@/utils/helpers';
import {
  CONSTRUCTION_FIELDS,
  EMPTY_FORM,
  LAND_FIELDS,
  formFromDimensions,
  formatArea,
  isSameForm,
  toDimensionsPayload,
  validateDimensions,
} from '@/utils/propertyDimensions';

const DISCLAIMER =
  'Los datos que captures son informativos y no sustituyen la documentación oficial (escrituras, planos ni certificaciones de superficie o construcción).';

const FORM_FIELDS = ['hasConstruction', ...LAND_FIELDS, ...CONSTRUCTION_FIELDS];

/* ------------------------------------------------------------------ */
/* Campos propios de esta pantalla                                     */
/* ------------------------------------------------------------------ */

/** Número capturado como texto: así podemos explicar "abc" o "-5" en vez de que el navegador los calle. */
function NumberField({
  name,
  label,
  form,
  errors,
  onChange,
  disabled,
  hint,
  className,
  integer = false,
}) {
  return (
    <Input
      id={name}
      name={name}
      label={label}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      autoComplete="off"
      value={form[name]}
      onChange={onChange}
      error={errors[name]}
      hint={hint}
      disabled={disabled}
      className={className}
    />
  );
}

function ConstructionToggle({ value, error, onChange, disabled }) {
  const options = [
    { value: 'yes', label: 'Sí, tiene construcción' },
    { value: 'no', label: 'No, es solo terreno' },
  ];

  return (
    <fieldset aria-describedby={error ? 'hasConstruction-error' : undefined}>
      <legend className="text-ink mb-1.5 text-sm font-medium">¿Existe construcción?</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 text-sm transition-colors',
              value === option.value
                ? 'border-primary-500 bg-primary-50 text-primary-800'
                : 'border-stone-300 bg-white',
              error && 'border-red-500',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              type="radio"
              name="hasConstruction"
              value={option.value}
              checked={value === option.value}
              onChange={onChange}
              disabled={disabled}
              className="accent-primary-600 size-4"
            />
            {option.label}
          </label>
        ))}
      </div>
      {error && (
        <p id="hasConstruction-error" role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function ConditionSelect({ value, error, onChange, disabled }) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor="condition" className="text-ink text-sm font-medium">
        Estado general
      </label>
      <select
        id="condition"
        name="condition"
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'condition-error' : undefined}
        className={cn(
          'text-ink h-11 w-full rounded-lg border bg-white px-3 text-base focus:ring-2 focus:outline-none',
          'disabled:cursor-not-allowed disabled:bg-stone-100',
          error
            ? 'border-red-500 focus:ring-red-200'
            : 'focus:border-primary-500 focus:ring-primary-100 border-stone-300',
        )}
      >
        <option value="">Selecciona una opción</option>
        {CONSTRUCTION_CONDITIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id="condition-error" role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Resumen de medidas guardadas (CA1)                                  */
/* ------------------------------------------------------------------ */

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-ink-muted text-sm">{label}</dt>
      <dd className="text-ink text-sm font-semibold">{value}</dd>
    </div>
  );
}

function DimensionsSummary({ dimensions }) {
  if (!dimensions) {
    return (
      <Card title="Medidas registradas">
        <p className="text-ink-muted text-sm">
          Aún no has guardado las dimensiones de esta propiedad.
        </p>
      </Card>
    );
  }

  const condition = CONSTRUCTION_CONDITIONS.find((item) => item.value === dimensions.condition);

  return (
    <Card title="Medidas registradas">
      <dl className="flex flex-col divide-y divide-stone-100">
        <SummaryRow label="Superficie del terreno" value={formatArea(dimensions.landArea)} />
        <SummaryRow label="Frente" value={`${dimensions.frontage} m`} />
        <SummaryRow label="Fondo" value={`${dimensions.depth} m`} />
        <SummaryRow label="Construcción" value={dimensions.hasConstruction ? 'Sí' : 'No'} />
        {dimensions.hasConstruction && (
          <>
            <SummaryRow label="Superficie construida" value={formatArea(dimensions.builtArea)} />
            <SummaryRow label="Habitaciones" value={dimensions.bedrooms} />
            <SummaryRow label="Baños" value={dimensions.bathrooms} />
            <SummaryRow label="Pisos" value={dimensions.floors} />
            <SummaryRow label="Estacionamientos" value={dimensions.parkingSpaces} />
            <SummaryRow label="Antigüedad" value={`${dimensions.age} años`} />
            <SummaryRow label="Estado general" value={condition?.label ?? dimensions.condition} />
          </>
        )}
      </dl>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

/**
 * HU-021 · Formulario de dimensiones y características de construcción.
 * Ruta: /mis-propiedades/:id/dimensiones (solo el dueño de la propiedad).
 */
export default function PropertyDimensionsPage() {
  const { id } = useParams();
  const location = useLocation();

  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [property, setProperty] = useState(null);

  const [saved, setSaved] = useState(null); // dimensiones guardadas en el backend
  const [baseline, setBaseline] = useState(EMPTY_FORM); // formulario tal como se guardó/cargó
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState([]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isDirty = !isSameForm(form, baseline);
  useUnsavedChanges(isDirty && !isSaving);

  useEffect(() => {
    let active = true;
    Promise.all([estimationService.getMyProperty(id), getPropertyDimensions(id)])
      .then(([loadedProperty, dimensions]) => {
        if (!active) return;
        const loadedForm = formFromDimensions(dimensions);
        setProperty(loadedProperty);
        setSaved(dimensions);
        setBaseline(loadedForm);
        setForm(loadedForm);
        setStatus('ready');
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error.message);
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [id, loadAttempt]);

  function retryLoad() {
    setStatus('loading');
    setLoadError('');
    setLoadAttempt((attempt) => attempt + 1);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setSuccessMessage('');
    setWarnings([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return;

    setSaveError('');
    setSuccessMessage('');

    setWarnings([]);
    const result = validateDimensions(form);
    setErrors(result.errors);

    // CA4: si hay campos inválidos se marcan y NO se envía nada.
    if (Object.keys(result.errors).length > 0) return;

    try {
      setIsSaving(true);
      const payload = toDimensionsPayload(form);
      const response = await savePropertyDimensions(id, payload);
      const stored = response.dimensions ?? payload;
      const storedForm = formFromDimensions(stored);

      setSaved(stored);
      setBaseline(storedForm);
      setForm(storedForm);
      setWarnings(result.warnings);
      setSuccessMessage(response.message ?? 'Las dimensiones se guardaron correctamente.');
    } catch (error) {
      // El backend puede devolver los errores como arreglo o dentro de `errors`.
      const items = Array.isArray(error.details) ? error.details : error.details?.errors;
      if (Array.isArray(items)) {
        const backendErrors = {};
        for (const item of items) {
          if (FORM_FIELDS.includes(item.field)) backendErrors[item.field] = item.message;
        }
        setErrors((current) => ({ ...current, ...backendErrors }));
      }
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  const showConstruction = form.hasConstruction === 'yes';
  const fieldProps = { form, errors, onChange: handleChange, disabled: isSaving };
  const invalidCount = Object.values(errors).filter(Boolean).length;
  const introMessage = location.state?.message;

  return (
    <section className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Dimensiones y construcción"
        description={
          property
            ? `Describe las condiciones físicas de «${property.title}».`
            : 'Describe las condiciones físicas de tu propiedad.'
        }
        actions={
          <Button variant="secondary" to={ROUTES.MY_PROPERTIES}>
            Mis propiedades
          </Button>
        }
      />

      {status === 'loading' && <Loader label="Cargando la propiedad..." className="py-16" />}

      {status === 'error' && (
        <ErrorState
          title="No pudimos cargar la propiedad"
          message={loadError}
          onRetry={retryLoad}
        />
      )}

      {status === 'ready' && (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 lg:col-span-2">
            {introMessage && !successMessage && <Alert variant="info">{introMessage}</Alert>}

            <Alert variant="info" title="Información orientativa">
              {DISCLAIMER}
            </Alert>

            {successMessage && (
              <Alert variant="success" onClose={() => setSuccessMessage('')}>
                {successMessage}
              </Alert>
            )}

            {saveError && (
              <Alert variant="error" title="No se pudo guardar" onClose={() => setSaveError('')}>
                {saveError}
              </Alert>
            )}

            {invalidCount > 0 && (
              <Alert variant="error" title="Revisa los campos marcados">
                {invalidCount === 1
                  ? 'Hay 1 campo con datos inválidos. Corrígelo para poder guardar.'
                  : `Hay ${invalidCount} campos con datos inválidos. Corrígelos para poder guardar.`}
              </Alert>
            )}

            <Card title="Terreno">
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  name="landArea"
                  label="Superficie del terreno (m²)"
                  className="sm:col-span-2"
                  {...fieldProps}
                />
                <NumberField name="frontage" label="Frente (m)" {...fieldProps} />
                <NumberField name="depth" label="Fondo (m)" {...fieldProps} />
              </div>
            </Card>

            <Card title="Construcción">
              <div className="flex flex-col gap-4">
                <ConstructionToggle
                  value={form.hasConstruction}
                  error={errors.hasConstruction}
                  onChange={handleChange}
                  disabled={isSaving}
                />

                {showConstruction && (
                  <div className="grid gap-4 border-t border-stone-100 pt-4 sm:grid-cols-2">
                    <NumberField
                      name="builtArea"
                      label="Superficie construida (m²)"
                      {...fieldProps}
                    />
                    <NumberField name="floors" label="Pisos" integer {...fieldProps} />
                    <NumberField name="bedrooms" label="Habitaciones" integer {...fieldProps} />
                    <NumberField name="bathrooms" label="Baños" integer {...fieldProps} />
                    <NumberField
                      name="parkingSpaces"
                      label="Estacionamientos"
                      integer
                      {...fieldProps}
                    />
                    <NumberField
                      name="age"
                      label="Antigüedad (años)"
                      integer
                      hint="Usa 0 si es nueva."
                      {...fieldProps}
                    />
                    <div className="sm:col-span-2">
                      <ConditionSelect
                        value={form.condition}
                        error={errors.condition}
                        onChange={handleChange}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {warnings.length > 0 && (
              <Alert variant="warning" title="Revisa la consistencia de tus datos">
                <ul className="flex list-disc flex-col gap-1 pl-5">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
                <p className="mt-2">
                  Se guardaron de todos modos; puedes corregirlos cuando quieras.
                </p>
              </Alert>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" to={ROUTES.MY_PROPERTIES}>
                Cancelar
              </Button>
              <Button type="submit" loading={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar dimensiones'}
              </Button>
            </div>
          </form>

          <aside className="flex flex-col gap-4">
            <DimensionsSummary dimensions={saved} />
          </aside>
        </div>
      )}
    </section>
  );
}
