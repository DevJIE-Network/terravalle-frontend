import { useCallback, useEffect, useState } from 'react';
import {
  createNearbyPlace,
  deleteNearbyPlace,
  getNearbyPlaceCategories,
  getNearbyPlaces,
} from '@/api';
import { Alert, Button, Card, ConfirmDialog, Input } from '@/components/ui';
import { cn } from '@/utils/helpers';
import {
  formatApproxDistance,
  sortNearbyPlaces,
  toNearbyPlacePayload,
  validateNearbyPlaceForm,
} from '@/utils/propertyLocation';

const EMPTY_PLACE_FORM = { categoryId: '', name: '', approximateDistanceM: '' };

/**
 * HU-023 · Servicios y puntos cercanos de la propiedad.
 * Componente autocontenido: carga categorías y puntos por su cuenta,
 * con estados independientes (carga, creación y eliminación).
 *
 * @param {object} props
 * @param {string|number} props.propertyId
 */
export default function NearbyPlacesSection({ propertyId }) {
  const [categories, setCategories] = useState([]);
  const [categoriesStatus, setCategoriesStatus] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [categoriesError, setCategoriesError] = useState(null);

  const [places, setPlaces] = useState([]);
  const [placesStatus, setPlacesStatus] = useState('loading');
  const [placesError, setPlacesError] = useState(null);
  const [placesAttempt, setPlacesAttempt] = useState(0);

  const [form, setForm] = useState(EMPTY_PLACE_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [pendingDelete, setPendingDelete] = useState(null); // punto a eliminar
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Los puntos cercanos se cargan de forma independiente al catálogo de categorías.
  useEffect(() => {
    let active = true;
    getNearbyPlaces(propertyId)
      .then((loaded) => {
        if (!active) return;
        setPlaces(sortNearbyPlaces(loaded));
        setPlacesStatus('ready');
      })
      .catch((error) => {
        if (!active) return;
        setPlacesError(error);
        setPlacesStatus('error');
      });
    return () => {
      active = false;
    };
  }, [propertyId, placesAttempt]);

  useEffect(() => {
    let active = true;
    getNearbyPlaceCategories()
      .then((loaded) => {
        if (!active) return;
        setCategories(loaded);
        setCategoriesStatus('ready');
      })
      .catch((error) => {
        if (!active) return;
        setCategoriesError(error);
        setCategoriesStatus('error');
      });
    return () => {
      active = false;
    };
  }, [propertyId]);

  const retryPlaces = useCallback(() => {
    setPlacesStatus('loading');
    setPlacesError(null);
    setPlacesAttempt((attempt) => attempt + 1);
  }, []);

  const retryCategories = useCallback(() => {
    setCategoriesStatus('loading');
    setCategoriesError(null);
    getNearbyPlaceCategories()
      .then((loaded) => {
        setCategories(loaded);
        setCategoriesStatus('ready');
      })
      .catch((error) => {
        setCategoriesError(error);
        setCategoriesStatus('error');
      });
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => ({ ...current, [name]: '' }));
    setCreateError('');
    setSuccessMessage('');
  }

  async function handleCreate(event) {
    event.preventDefault();
    if (isCreating) return;

    setCreateError('');
    setSuccessMessage('');
    const found = validateNearbyPlaceForm(form);
    setFormErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      setIsCreating(true);
      const response = await createNearbyPlace(propertyId, toNearbyPlacePayload(form));
      const created = response.nearbyPlace;
      if (created) setPlaces((current) => sortNearbyPlaces([...current, created]));
      setSuccessMessage(response.message ?? 'Punto cercano agregado correctamente.');
      setForm(EMPTY_PLACE_FORM);
    } catch (error) {
      setCreateError(error.details?.message ?? error.message);
    } finally {
      setIsCreating(false);
    }
  }

  function handleCancel() {
    setForm(EMPTY_PLACE_FORM);
    setFormErrors({});
    setCreateError('');
  }

  async function handleConfirmDelete() {
    if (!pendingDelete || isDeleting) return;

    setDeleteError('');
    try {
      setIsDeleting(true);
      await deleteNearbyPlace(propertyId, pendingDelete.id);
      setPlaces((current) => current.filter((place) => place.id !== pendingDelete.id));
      setSuccessMessage('Punto cercano eliminado correctamente.');
      setPendingDelete(null);
    } catch (error) {
      setDeleteError(error.details?.message ?? error.message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card title="Servicios y puntos cercanos">
      <p className="text-ink-muted mb-4 text-sm">
        Las distancias son aproximadas y se declaran a mano.
      </p>

      {successMessage && (
        <Alert variant="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      <PlacesList
        status={placesStatus}
        error={placesError}
        places={places}
        onRetry={retryPlaces}
        onDelete={setPendingDelete}
        disabled={isDeleting}
      />

      <AddPlaceForm
        form={form}
        errors={formErrors}
        categories={categories}
        categoriesStatus={categoriesStatus}
        categoriesError={categoriesError}
        isCreating={isCreating}
        createError={createError}
        onChange={handleChange}
        onSubmit={handleCreate}
        onCancel={handleCancel}
        onRetryCategories={retryCategories}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`¿Eliminar «${pendingDelete?.name ?? ''}»?`}
        confirmLabel="Eliminar"
        variant="danger"
        loading={isDeleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      >
        Se quitará «{pendingDelete?.name ?? ''}» de los puntos cercanos de la propiedad.
      </ConfirmDialog>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Lista de puntos cercanos                                            */
/* ------------------------------------------------------------------ */

function PlacesList({ status, error, places, onRetry, onDelete, disabled }) {
  if (status === 'loading') {
    return (
      <p className="text-ink-muted text-sm" role="status">
        Cargando los puntos cercanos...
      </p>
    );
  }

  if (status === 'error') {
    return (
      <div className="text-sm">
        <Alert variant="error" title="No pudimos cargar los puntos cercanos">
          {error?.message}
        </Alert>
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (places.length === 0) {
    return (
      <p className="text-ink-muted text-sm">No hay puntos de interés cercanos registrados.</p>
    );
  }

  return (
    <ul aria-label="Puntos cercanos registrados" className="flex flex-col divide-y divide-stone-100">
      {places.map((place) => (
        <li key={place.id} className="flex items-center gap-3 py-2.5 text-sm">
          <span className="bg-primary-50 text-primary-800 rounded-md px-2 py-0.5 text-xs font-semibold">
            {place.category?.name ?? 'Sin categoría'}
          </span>
          <span className="text-ink min-w-0 flex-1 truncate font-medium">{place.name}</span>
          <span className="text-ink-muted shrink-0 text-xs">
            {formatApproxDistance(place.approximateDistanceM) ?? 'Distancia sin registrar'}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDelete(place)}
            aria-label={`Eliminar ${place.name}`}
            disabled={disabled}
            className={cn('text-red-700 hover:bg-red-50')}
          >
            Eliminar
          </Button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Formulario para agregar un punto                                    */
/* ------------------------------------------------------------------ */

function AddPlaceForm({
  form,
  errors,
  categories,
  categoriesStatus,
  categoriesError,
  isCreating,
  createError,
  onChange,
  onSubmit,
  onCancel,
  onRetryCategories,
}) {
  const disabledCreating = isCreating || categoriesStatus !== 'ready';

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-4 border-t border-stone-100 pt-5">
      <p className="text-ink text-sm font-semibold">Agregar punto cercano</p>

      {categoriesStatus === 'loading' && (
        <p className="text-ink-muted text-sm" role="status">
          Cargando las categorías disponibles...
        </p>
      )}

      {categoriesStatus === 'error' && (
        <div className="text-sm">
          <Alert variant="error" title="No pudimos cargar las categorías">
            {categoriesError?.message}
          </Alert>
          <Button variant="secondary" size="sm" className="mt-3" onClick={onRetryCategories}>
            Reintentar
          </Button>
        </div>
      )}

      {categoriesStatus === 'ready' && categories.length === 0 && (
        <p className="text-ink-muted text-sm">
          El catálogo de categorías no tiene opciones disponibles por ahora.
        </p>
      )}

      {createError && (
        <Alert variant="error" title="No se pudo agregar el punto cercano">
          <p>{createError}</p>
          <p className="mt-1">Lo que escribiste sigue en pantalla; puedes corregirlo e intentarlo de nuevo.</p>
        </Alert>
      )}

      {categoriesStatus === 'ready' && categories.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <CategorySelect
            id="nearbyCategoryId"
            value={form.categoryId}
            onChange={onChange}
            categories={categories}
            disabled={disabledCreating}
            error={errors.categoryId}
          />
          <Input
            id="nearbyPlaceName"
            name="name"
            label="Nombre del punto"
            value={form.name}
            onChange={onChange}
            error={errors.name}
            hint="Ej. Hospital General."
            disabled={isCreating}
          />
          <Input
            id="nearbyPlaceDistance"
            name="approximateDistanceM"
            label="Distancia aproximada (m)"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={form.approximateDistanceM}
            onChange={onChange}
            error={errors.approximateDistanceM}
            hint="Opcional. En metros, ej. 650."
            disabled={isCreating}
          />
        </div>
      )}

      {categoriesStatus === 'ready' && categories.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={isCreating}>
            Limpiar
          </Button>
          <Button type="submit" loading={isCreating}>
            {isCreating ? 'Agregando...' : 'Agregar punto'}
          </Button>
        </div>
      )}
    </form>
  );
}

/** `<select>` de categorías, con las mismas clases que el resto de la app. */
function CategorySelect({ id, value, onChange, categories, disabled, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-ink text-sm font-medium">
        Categoría
      </label>
      <select
        id={id}
        name="categoryId"
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'text-ink h-11 w-full rounded-lg border bg-white px-3 text-base focus:ring-2 focus:outline-none',
          'disabled:cursor-not-allowed disabled:bg-stone-100',
          error ? 'border-red-500 focus:ring-red-200' : 'focus:border-primary-500 focus:ring-primary-100 border-stone-300',
        )}
      >
        <option value="">Selecciona una categoría</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
