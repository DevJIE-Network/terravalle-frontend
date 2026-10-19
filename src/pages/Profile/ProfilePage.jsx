import { useEffect, useMemo, useState } from 'react';
import { userService } from '@/api';
import { Alert, Button, Card, ErrorState, Input, Loader, PageHeader } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChanges } from '@/hooks/useUnsavedChanges';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s-]*[0-9]$/;

/** Campos editables del perfil (deben coincidir con los que acepta PATCH /users/me). */
const FIELDS = [
  {
    name: 'name',
    label: 'Nombre completo',
    type: 'text',
    autoComplete: 'name',
    required: true,
  },
  {
    name: 'email',
    label: 'Correo electrónico de la cuenta',
    type: 'email',
    autoComplete: 'email',
    required: true,
    hint: 'Es el correo con el que inicias sesión.',
  },
  {
    name: 'phone',
    label: 'Teléfono de contacto',
    type: 'tel',
    autoComplete: 'tel',
    hint: 'Opcional. Entre 10 y 15 dígitos. Lo verán los interesados en tus propiedades.',
  },
  {
    name: 'contactEmail',
    label: 'Correo de contacto',
    type: 'email',
    autoComplete: 'off',
    hint: 'Opcional. Un correo distinto al de tu cuenta para que te contacten compradores.',
  },
];

/** Convierte el perfil de la API en valores del formulario (los campos vacíos como ''). */
function toForm(profile) {
  return Object.fromEntries(FIELDS.map(({ name }) => [name, profile?.[name] ?? '']));
}

/** Valor tal como se enviaría al backend (sin espacios y correos en minúsculas). */
function normalize(name, value) {
  const trimmed = value.trim();
  return name === 'email' || name === 'contactEmail' ? trimmed.toLowerCase() : trimmed;
}

/** Campos que cambiaron respecto al perfil vigente. */
function getChanges(form, profile) {
  const original = toForm(profile);
  return Object.fromEntries(
    FIELDS.map(({ name }) => [name, normalize(name, form[name])]).filter(
      ([name, value]) => value !== normalize(name, original[name]),
    ),
  );
}

function validate(form) {
  const errors = {};
  const name = form.name.trim();
  const email = form.email.trim();
  const phone = form.phone.trim();
  const contactEmail = form.contactEmail.trim();

  if (!name) {
    errors.name = 'El nombre es obligatorio.';
  } else if (name.length < 2) {
    errors.name = 'El nombre debe tener al menos 2 caracteres.';
  } else if (name.length > 100) {
    errors.name = 'El nombre no puede superar los 100 caracteres.';
  }

  if (!email) {
    errors.email = 'El correo electrónico es obligatorio.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Ingresa un correo electrónico válido.';
  }

  if (phone) {
    const digits = phone.replace(/\D/g, '').length;
    if (phone.length > 20 || !PHONE_PATTERN.test(phone)) {
      errors.phone = 'El teléfono solo puede contener números, espacios, guiones y +.';
    } else if (digits < 10 || digits > 15) {
      errors.phone = 'El teléfono debe tener entre 10 y 15 dígitos.';
    }
  }

  if (contactEmail && !EMAIL_PATTERN.test(contactEmail)) {
    errors.contactEmail = 'Ingresa un correo de contacto válido.';
  }

  return errors;
}

/** Traduce la respuesta de error del backend a errores por campo y un mensaje general. */
function parseSaveError(error) {
  const details = error.details ?? {};

  // 409: el correo ya pertenece a otra cuenta.
  if (error.status === 409) {
    return {
      fieldErrors: { email: details.message ?? 'El correo electrónico ya está registrado.' },
      generalError: '',
    };
  }

  // 400: validaciones del backend, con el campo que falló.
  if (error.status === 400 && Array.isArray(details.errors)) {
    const fieldErrors = {};
    for (const issue of details.errors) {
      if (FIELDS.some(({ name }) => name === issue.field) && !fieldErrors[issue.field]) {
        fieldErrors[issue.field] = issue.message;
      }
    }
    return {
      fieldErrors,
      generalError: Object.keys(fieldErrors).length ? '' : (details.message ?? error.message),
    };
  }

  return { fieldErrors: {}, generalError: error.message };
}

function formatDate(value) {
  if (!value) return 'No disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No disponible';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(date);
}

/** Vista de solo lectura de un dato del perfil. */
function ProfileItem({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="text-ink-muted text-sm sm:w-56 sm:shrink-0">{label}</dt>
      <dd className="text-ink min-w-0 font-medium break-words">
        {value || <span className="text-ink-muted font-normal italic">No registrado</span>}
      </dd>
    </div>
  );
}

/**
 * HU-019 · Consultar y actualizar mi perfil.
 * Muestra el perfil del usuario autenticado (GET /users/me) y permite editarlo
 * (PATCH /users/me). Cada usuario solo puede ver y editar su propia cuenta.
 */
export default function ProfilePage() {
  const { updateUser } = useAuth();

  // Carga del perfil: 'loading' | 'error' | 'ready'
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [profile, setProfile] = useState(null);

  // Edición
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(toForm(null));
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Número de intento de carga: cambiarlo vuelve a consultar el perfil ("Reintentar").
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    userService
      .getMyProfile()
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setStatus('ready');
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error.message);
        setStatus('error');
      });
    // Si el usuario sale antes de que responda el servidor, se ignora la respuesta.
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  function retryLoad() {
    setStatus('loading');
    setLoadError('');
    setLoadAttempt((attempt) => attempt + 1);
  }

  const changes = useMemo(() => (profile ? getChanges(form, profile) : {}), [form, profile]);
  const hasChanges = isEditing && Object.keys(changes).length > 0;

  // CA4: advierte antes de salir de la pantalla con cambios sin guardar.
  useUnsavedChanges(hasChanges);

  function startEditing() {
    setForm(toForm(profile));
    setErrors({});
    setGeneralError('');
    setSuccessMessage('');
    setIsEditing(true);
  }

  function cancelEditing() {
    if (hasChanges && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;
    setIsEditing(false);
    setErrors({});
    setGeneralError('');
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
    setGeneralError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return;

    // CA3: valida en pantalla y conserva lo capturado.
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      setGeneralError('');
      const { message, user } = await userService.updateMyProfile(changes);

      // CA2: confirma y muestra los datos vigentes que devolvió el backend.
      setProfile(user);
      updateUser({ name: user.name, email: user.email });
      setIsEditing(false);
      setSuccessMessage(message || 'Perfil actualizado correctamente.');
    } catch (error) {
      const { fieldErrors, generalError: message } = parseSaveError(error);
      setErrors(fieldErrors);
      setGeneralError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Mi perfil"
        description="Consulta y actualiza tus datos de identificación y de contacto."
        actions={
          status === 'ready' && !isEditing ? (
            <Button onClick={startEditing}>Editar perfil</Button>
          ) : null
        }
      />

      {status === 'loading' && <Loader label="Cargando tu perfil..." className="py-12" />}

      {status === 'error' && (
        <ErrorState title="No pudimos cargar tu perfil" message={loadError} onRetry={retryLoad} />
      )}

      {status === 'ready' && (
        <div className="flex flex-col gap-6">
          {successMessage && (
            <Alert variant="success" onClose={() => setSuccessMessage('')}>
              {successMessage}
            </Alert>
          )}

          {!isEditing && (
            <Card title="Datos de la cuenta">
              <dl className="flex flex-col gap-4">
                <ProfileItem label="Nombre completo" value={profile.name} />
                <ProfileItem label="Correo electrónico de la cuenta" value={profile.email} />
                <ProfileItem label="Teléfono de contacto" value={profile.phone} />
                <ProfileItem label="Correo de contacto" value={profile.contactEmail} />
                <ProfileItem label="Miembro desde" value={formatDate(profile.createdAt)} />
              </dl>
            </Card>
          )}

          {isEditing && (
            <Card title="Editar datos">
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                {FIELDS.map((field) => (
                  <Input
                    key={field.name}
                    label={field.required ? `${field.label} *` : field.label}
                    name={field.name}
                    type={field.type}
                    autoComplete={field.autoComplete}
                    value={form[field.name]}
                    onChange={handleChange}
                    error={errors[field.name]}
                    hint={field.hint}
                    required={field.required}
                    disabled={isSaving}
                  />
                ))}

                {/* Campo no editable: se muestra deshabilitado. */}
                <Input
                  label="Miembro desde"
                  value={formatDate(profile.createdAt)}
                  disabled
                  readOnly
                  hint="Este dato no se puede modificar."
                />

                <p className="text-ink-muted text-sm">* Campos obligatorios.</p>

                {generalError && (
                  <Alert
                    variant="error"
                    title="No se pudieron guardar los cambios"
                    onClose={() => setGeneralError('')}
                  >
                    {generalError}
                  </Alert>
                )}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button variant="secondary" onClick={cancelEditing} disabled={isSaving}>
                    Cancelar
                  </Button>
                  <Button type="submit" loading={isSaving} disabled={!hasChanges}>
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}
