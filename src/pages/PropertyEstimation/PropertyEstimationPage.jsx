import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { estimationService } from '@/api';
import { Alert, Button, Card, ErrorState, Input, Loader, PageHeader } from '@/components/ui';
import { ROUTES } from '@/utils/constants';
import { cn, formatPrice } from '@/utils/helpers';

const DISCLAIMER_FALLBACK =
  'Estimación orientativa generada automáticamente. No es un avalúo oficial ni garantiza el precio de venta; el precio final de publicación lo decide el vendedor.';

/* ------------------------------------------------------------------ */
/* Íconos                                                              */
/* ------------------------------------------------------------------ */
const ICON_PATHS = {
  sparkles:
    'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z',
  up: 'M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18',
  down: 'M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3',
  neutral: 'M5 12h14',
  info: 'm11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z',
  clipboard:
    'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z',
};

function Icon({ name, className = 'size-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

const IMPACT = {
  positive: { icon: 'up', label: 'Aumenta el valor', className: 'bg-primary-50 text-primary-700' },
  negative: { icon: 'down', label: 'Reduce el valor', className: 'bg-red-50 text-red-700' },
  neutral: { icon: 'neutral', label: 'Sin efecto', className: 'bg-surface-muted text-ink-muted' },
};

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/** Valor del precio de publicación como texto para el campo del formulario. */
const priceToInput = (price) => (price === null || price === undefined ? '' : String(price));

/* ------------------------------------------------------------------ */
/* Bloques de presentación                                             */
/* ------------------------------------------------------------------ */

/** CA2: datos que faltan para estimar. */
function MissingData({ missing }) {
  return (
    <Alert variant="warning" title="Completa la información de la propiedad">
      <p>Antes de estimar el valor necesitas registrar:</p>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
        {missing.map((item) => (
          <li key={item.field}>
            <span className="font-semibold">{item.section}:</span> {item.message}
          </li>
        ))}
      </ul>
    </Alert>
  );
}

/** Barra del rango con la posición del valor estimado. */
function RangeBar({ min, value, max }) {
  const position = max > min ? ((value - min) / (max - min)) * 100 : 50;
  return (
    <div className="mt-5">
      <div className="bg-primary-100 relative h-2 rounded-full">
        <span
          aria-hidden="true"
          className="bg-primary-700 absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${position}%` }}
        />
      </div>
      <div className="text-ink-muted mt-2 flex justify-between text-sm">
        <span>
          Mínimo <span className="text-ink font-semibold">{formatPrice(min)}</span>
        </span>
        <span>
          Máximo <span className="text-ink font-semibold">{formatPrice(max)}</span>
        </span>
      </div>
    </div>
  );
}

/** CA1 y CA3: resultado con factores y advertencia. */
function EstimationResult({ estimation }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="from-primary-800 to-primary-600 bg-gradient-to-r px-5 py-5 text-white sm:px-6">
        <p className="text-primary-100 text-sm font-medium">Valor orientativo estimado</p>
        <p className="mt-1 text-3xl font-bold sm:text-4xl">
          {formatPrice(estimation.estimatedValue)}
        </p>
        <p className="text-primary-100 mt-1 text-sm">
          Generada el {formatDateTime(estimation.createdAt)}
        </p>
      </div>

      <div className="flex flex-col gap-6 px-5 py-5 sm:px-6">
        <RangeBar
          min={estimation.estimatedMin}
          value={estimation.estimatedValue}
          max={estimation.estimatedMax}
        />

        <div>
          <h3 className="text-ink text-sm font-semibold">¿Cómo se obtuvo?</h3>
          <p className="text-ink-muted mt-1 text-sm leading-relaxed">{estimation.explanation}</p>
        </div>

        <div>
          <h3 className="text-ink text-sm font-semibold">Factores considerados</h3>
          <ul className="mt-2 flex flex-col divide-y divide-stone-100">
            {estimation.factors.map((factor) => {
              const impact = IMPACT[factor.impact] ?? IMPACT.neutral;
              return (
                <li key={factor.name} className="flex gap-3 py-3 first:pt-1 last:pb-0">
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg',
                      impact.className,
                    )}
                    title={impact.label}
                  >
                    <Icon name={impact.icon} className="size-4" />
                    <span className="sr-only">{impact.label}</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-ink text-sm font-medium">
                      {factor.name}{' '}
                      <span className="text-ink-muted font-normal">· {factor.value}</span>
                    </p>
                    <p className="text-ink-muted text-sm">{factor.explanation}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-earth-200 bg-earth-50 text-earth-800 flex gap-3 rounded-xl border p-4 text-sm">
          <Icon name="info" className="size-5 shrink-0" />
          <p>{estimation.disclaimer || DISCLAIMER_FALLBACK}</p>
        </div>

        <p className="text-ink-muted text-xs">
          Modelo {estimation.modelName} · versión {estimation.modelVersion}
        </p>
      </div>
    </div>
  );
}

/** CA4: el vendedor decide el precio final, aunque sea distinto al sugerido. */
function PublicationPriceCard({ property, suggestedValue, onSaved }) {
  const [price, setPrice] = useState(priceToInput(property.publicationPrice));
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const current = priceToInput(property.publicationPrice);
  const hasChanges = price.trim() !== current;

  async function handleSubmit(event) {
    event.preventDefault();
    const value = price.trim() === '' ? null : Number(price);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      setError('Ingresa un precio válido, mayor o igual a cero.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      const updated = await estimationService.updatePublicationPrice(property.id, value);
      onSaved(updated);
    } catch (saveError) {
      const issue = saveError.details?.errors?.find?.((item) => item.field === 'publicationPrice');
      setError(issue?.message ?? saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card title="Precio de publicación">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <p className="text-ink-muted text-sm">
          Precio actual:{' '}
          <span className="text-ink font-semibold">
            {property.publicationPrice === null
              ? 'Sin definir'
              : formatPrice(property.publicationPrice)}
          </span>
        </p>

        <Input
          label="Precio final (MXN)"
          name="publicationPrice"
          type="number"
          inputMode="decimal"
          min="0"
          step="1000"
          value={price}
          onChange={(event) => {
            setPrice(event.target.value);
            setError('');
          }}
          error={error}
          hint="Tú decides el precio final; puede ser distinto al valor estimado."
          disabled={isSaving}
        />

        <div className="flex flex-col gap-2">
          {suggestedValue !== null && (
            <Button
              variant="secondary"
              onClick={() => setPrice(String(suggestedValue))}
              disabled={isSaving}
            >
              Usar valor estimado ({formatPrice(suggestedValue)})
            </Button>
          )}
          <Button type="submit" loading={isSaving} disabled={!hasChanges}>
            {isSaving ? 'Guardando...' : 'Guardar precio'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Historial de estimaciones anteriores. */
function EstimationHistory({ estimations }) {
  if (estimations.length < 2) return null;
  return (
    <Card title="Estimaciones anteriores">
      <ul className="flex flex-col divide-y divide-stone-100 text-sm">
        {estimations.slice(1).map((item) => (
          <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2">
            <span className="text-ink-muted">{formatDateTime(item.createdAt)}</span>
            <span className="text-ink font-semibold">{formatPrice(item.estimatedValue)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

/**
 * HU-009 · Obtener estimación orientativa del valor mediante IA.
 * Ruta: /mis-propiedades/:id/estimacion (solo el dueño de la propiedad).
 */
export default function PropertyEstimationPage() {
  const { id } = useParams();

  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [property, setProperty] = useState(null);
  const [estimations, setEstimations] = useState([]);

  const [isEstimating, setIsEstimating] = useState(false);
  const [missing, setMissing] = useState([]);
  const [estimateError, setEstimateError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([estimationService.getMyProperty(id), estimationService.getEstimations(id)])
      .then(([loadedProperty, history]) => {
        if (!active) return;
        setProperty(loadedProperty);
        setEstimations(history.estimations ?? []);
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

  async function handleEstimate() {
    if (isEstimating) return;
    try {
      setIsEstimating(true);
      setMissing([]);
      setEstimateError('');
      setSuccessMessage('');
      const result = await estimationService.requestEstimation(id);
      setEstimations((previous) => [result.estimation, ...previous]);
    } catch (error) {
      if (error.status === 422 && Array.isArray(error.details?.missing)) {
        setMissing(error.details.missing);
      } else {
        setEstimateError(error.details?.message ?? error.message);
      }
    } finally {
      setIsEstimating(false);
    }
  }

  function handlePriceSaved(updated) {
    setProperty((previous) => ({ ...previous, ...updated }));
    setSuccessMessage('Precio de publicación actualizado.');
  }

  const latest = estimations[0] ?? null;
  const isWithdrawn = property?.status === 'withdrawn';

  return (
    <section className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Estimación del valor"
        description={
          property
            ? `Referencia orientativa para «${property.title}».`
            : 'Obtén una referencia orientativa del valor de tu propiedad.'
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
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <span className="bg-earth-100 text-earth-700 flex size-11 shrink-0 items-center justify-center rounded-xl">
                    <Icon name="sparkles" className="size-6" />
                  </span>
                  <div>
                    <h2 className="text-ink font-semibold">Estimar valor con IA</h2>
                    <p className="text-ink-muted text-sm">
                      Analiza superficie, construcción, ubicación, servicios, entorno y propiedades
                      comparables.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleEstimate}
                  loading={isEstimating}
                  disabled={isWithdrawn}
                  className="shrink-0"
                >
                  {isEstimating && 'Calculando...'}
                  {!isEstimating && (latest ? 'Volver a estimar' : 'Estimar valor con IA')}
                </Button>
              </div>
              {isWithdrawn && (
                <p className="text-ink-muted mt-3 text-sm">
                  Esta propiedad está retirada y no se puede estimar.
                </p>
              )}
            </Card>

            {missing.length > 0 && <MissingData missing={missing} />}

            {estimateError && (
              <Alert
                variant="error"
                title="No se pudo generar la estimación"
                onClose={() => setEstimateError('')}
              >
                {estimateError}
              </Alert>
            )}

            {latest ? (
              <EstimationResult estimation={latest} />
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
                <span className="bg-surface-muted text-ink-muted mx-auto flex size-12 items-center justify-center rounded-full">
                  <Icon name="clipboard" className="size-6" />
                </span>
                <p className="text-ink mt-3 font-medium">Aún no hay estimaciones</p>
                <p className="text-ink-muted mt-1 text-sm">
                  Solicita una estimación para ver el valor, el rango y los factores considerados.
                </p>
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            {successMessage && (
              <Alert variant="success" onClose={() => setSuccessMessage('')}>
                {successMessage}
              </Alert>
            )}
            <PublicationPriceCard
              key={priceToInput(property.publicationPrice)}
              property={property}
              suggestedValue={latest?.estimatedValue ?? null}
              onSaved={handlePriceSaved}
            />
            <EstimationHistory estimations={estimations} />
          </aside>
        </div>
      )}
    </section>
  );
}
