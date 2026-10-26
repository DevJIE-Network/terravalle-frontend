import { useEffect, useMemo, useState } from 'react';
import { userService } from '@/api';
import { Alert, Button, Card, ErrorState, Input, Loader, PageHeader } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { cn, isValidEmail } from '@/utils/helpers';

const PHONE_PATTERN = /^\+?[0-9][0-9\s-]*[0-9]$/;

/** Campos editables del perfil (deben coincidir con los que acepta PATCH /users/me). */
const FIELDS = [
  {
    name: 'name',
    label: 'Nombre completo',
    type: 'text',
    autoComplete: 'name',
    required: true,
    group: 'account',
  },
  {
    name: 'email',
    label: 'Correo electrónico de la cuenta',
    type: 'email',
    autoComplete: 'email',
    required: true,
    hint: 'Es el correo con el que inicias sesión.',
    group: 'account',
  },
  {
    name: 'phone',
    label: 'Teléfono de contacto',
    type: 'tel',
    autoComplete: 'tel',
    hint: 'Opcional. Entre 10 y 15 dígitos. Lo verán los interesados en tus propiedades.',
    group: 'contact',
  },
  {
    name: 'contactEmail',
    label: 'Correo de contacto',
    type: 'email',
    autoComplete: 'off',
    hint: 'Opcional. Un correo distinto al de tu cuenta para que te contacten compradores.',
    group: 'contact',
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
  } else if (!isValidEmail(email)) {
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

  if (contactEmail && !isValidEmail(contactEmail)) {
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

/* ------------------------------------------------------------------ */
/* Íconos (trazo simple, heredan el color del texto)                   */
/* ------------------------------------------------------------------ */
const ICON_PATHS = {
  user: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0',
  mail: 'M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0-9.75 6.5-9.75-6.5',
  phone:
    'M2.25 6.75c0 8.28 6.72 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.37c0-.52-.35-.97-.85-1.09l-4.42-1.1c-.44-.11-.9.05-1.17.41l-.97 1.29a1.13 1.13 0 0 1-1.21.38 12.04 12.04 0 0 1-7.14-7.14 1.13 1.13 0 0 1 .38-1.21l1.29-.97c.36-.27.52-.73.41-1.17l-1.1-4.42A1.13 1.13 0 0 0 5.62 2.25H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z',
  chat: 'M8.25 9.75h7.5m-7.5 3h4.5M21 12c0 4.56-4.03 8.25-9 8.25a9.76 9.76 0 0 1-2.55-.33L4.5 21l1.4-3.73A7.96 7.96 0 0 1 3 12c0-4.56 4.03-8.25 9-8.25s9 3.69 9 8.25Z',
  calendar:
    'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  shield:
    'M9 12.75 11.25 15 15 9.75m-3-7.04A11.96 11.96 0 0 1 3.6 6 12 12 0 0 0 3 9.75c0 5.59 3.82 10.29 9 11.62 5.18-1.33 9-6.03 9-11.62 0-1.31-.21-2.57-.6-3.75h-.15c-3.2 0-6.1-1.25-8.25-3.29Z',
  check: 'm4.5 12.75 6 6 9-13.5',
  pencil:
    'm16.86 4.49 1.69-1.69a1.88 1.88 0 1 1 2.65 2.65L10.58 16.07a4.5 4.5 0 0 1-1.9 1.13L6 18l.8-2.69a4.5 4.5 0 0 1 1.13-1.9l8.93-8.92Zm0 0L19.5 7.13',
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

/** Iniciales para el avatar (máximo dos letras). */
function getInitials(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
}

/** Datos de contacto opcionales que completan el perfil. */
const CONTACT_FIELDS = [
  { name: 'phone', label: 'Teléfono de contacto' },
  { name: 'contactEmail', label: 'Correo de contacto' },
];

/** Encabezado con avatar, nombre, correo de la cuenta y antigüedad. */
function ProfileHero({ profile, action }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="from-primary-800 via-primary-700 to-primary-500 relative h-24 bg-gradient-to-r sm:h-28">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:18px_18px]"
        />
      </div>
      <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
          <div
            aria-hidden="true"
            className="bg-earth-100 text-primary-800 relative z-10 -mt-10 flex size-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white text-2xl font-bold shadow-md sm:-mt-12 sm:size-24 sm:text-3xl"
          >
            {getInitials(profile.name)}
          </div>
          <div className="min-w-0 pb-0.5">
            <h2 className="text-ink truncate text-xl font-bold sm:text-2xl">{profile.name}</h2>
            <div className="text-ink-muted mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="flex min-w-0 items-center gap-1.5">
                <Icon name="mail" className="size-4 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="calendar" className="size-4 shrink-0" />
                Miembro desde {formatDate(profile.createdAt)}
              </span>
            </div>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

/** Indicador de qué tan completo está el perfil (datos de contacto para compradores). */
function ProfileCompletion({ profile }) {
  const total = 2 + CONTACT_FIELDS.length;
  const done = 2 + CONTACT_FIELDS.filter(({ name }) => Boolean(profile[name])).length;
  const percent = Math.round((done / total) * 100);

  return (
    <Card title="Perfil completado">
      <div className="flex items-baseline justify-between">
        <span className="text-primary-700 text-3xl font-bold">{percent}%</span>
        <span className="text-ink-muted text-sm">
          {done} de {total} datos
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Perfil completado"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="bg-surface-muted mt-3 h-2 overflow-hidden rounded-full"
      >
        <div
          className="bg-primary-600 h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {CONTACT_FIELDS.map(({ name, label }) => {
          const complete = Boolean(profile[name]);
          return (
            <li key={name} className="flex items-center gap-2">
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-full',
                  complete
                    ? 'bg-primary-100 text-primary-700'
                    : 'border-[1.5px] border-dashed border-stone-300',
                )}
              >
                {complete && <Icon name="check" className="size-3.5" />}
              </span>
              <span className={complete ? 'text-ink' : 'text-ink-muted'}>
                {label}
                {!complete && <span className="sr-only"> (pendiente)</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-ink-muted mt-4 text-sm">
        Los compradores interesados en tus propiedades usarán estos datos para contactarte.
      </p>
    </Card>
  );
}

/** Aviso de privacidad: cada usuario solo ve y edita su propia cuenta. */
function PrivacyNote() {
  return (
    <div className="border-primary-100 bg-primary-50 text-primary-800 flex gap-3 rounded-xl border p-4 text-sm">
      <Icon name="shield" className="size-5 shrink-0" />
      <p>Solo tú puedes consultar y modificar la información de tu cuenta.</p>
    </div>
  );
}

/** Fila de solo lectura con ícono, etiqueta y valor. */
function ProfileItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span className="bg-primary-50 text-primary-700 flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Icon name={icon} className="size-[18px]" />
      </span>
      <div className="min-w-0">
        <dt className="text-ink-muted text-xs font-medium tracking-wide uppercase">{label}</dt>
        <dd className="text-ink mt-0.5 font-medium break-words">
          {value || <span className="text-ink-muted font-normal italic">No registrado</span>}
        </dd>
      </div>
    </div>
  );
}

/** Grupo de campos del formulario con título y descripción. */
function FormSection({ title, description, children }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1">
        <span className="text-ink block text-sm font-semibold">{title}</span>
        <span className="text-ink-muted block text-sm">{description}</span>
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
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

  function renderField(field) {
    return (
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
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Mi perfil"
        description="Consulta y actualiza tus datos de identificación y de contacto."
      />

      {status === 'loading' && <Loader label="Cargando tu perfil..." className="py-16" />}

      {status === 'error' && (
        <ErrorState title="No pudimos cargar tu perfil" message={loadError} onRetry={retryLoad} />
      )}

      {status === 'ready' && (
        <div className="flex flex-col gap-6">
          <ProfileHero
            profile={profile}
            action={
              !isEditing && (
                <Button onClick={startEditing}>
                  <Icon name="pencil" className="size-4" />
                  Editar perfil
                </Button>
              )
            }
          />

          {successMessage && (
            <Alert variant="success" onClose={() => setSuccessMessage('')}>
              {successMessage}
            </Alert>
          )}

          <div className="grid items-start gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              {!isEditing && (
                <>
                  <Card title="Datos de la cuenta">
                    <dl className="flex flex-col divide-y divide-stone-100">
                      <ProfileItem icon="user" label="Nombre completo" value={profile.name} />
                      <ProfileItem
                        icon="mail"
                        label="Correo electrónico de la cuenta"
                        value={profile.email}
                      />
                      <ProfileItem
                        icon="calendar"
                        label="Miembro desde"
                        value={formatDate(profile.createdAt)}
                      />
                    </dl>
                  </Card>

                  <Card title="Datos de contacto">
                    <dl className="flex flex-col divide-y divide-stone-100">
                      <ProfileItem
                        icon="phone"
                        label="Teléfono de contacto"
                        value={profile.phone}
                      />
                      <ProfileItem
                        icon="chat"
                        label="Correo de contacto"
                        value={profile.contactEmail}
                      />
                    </dl>
                  </Card>
                </>
              )}

              {isEditing && (
                <Card title="Editar datos">
                  <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
                    <FormSection
                      title="Datos de la cuenta"
                      description="Tu nombre y el correo con el que inicias sesión."
                    >
                      {FIELDS.filter((field) => field.group === 'account').map(renderField)}
                    </FormSection>

                    <hr className="border-stone-100" />

                    <FormSection
                      title="Datos de contacto"
                      description="Opcionales. Los verán los compradores interesados en tus propiedades."
                    >
                      {FIELDS.filter((field) => field.group === 'contact').map(renderField)}
                    </FormSection>

                    <hr className="border-stone-100" />

                    {/* Campo no editable: se muestra deshabilitado. */}
                    <Input
                      label="Miembro desde"
                      value={formatDate(profile.createdAt)}
                      disabled
                      readOnly
                      hint="Este dato no se puede modificar."
                      className="sm:max-w-xs"
                    />

                    {generalError && (
                      <Alert
                        variant="error"
                        title="No se pudieron guardar los cambios"
                        onClose={() => setGeneralError('')}
                      >
                        {generalError}
                      </Alert>
                    )}

                    <div className="bg-surface flex flex-col gap-3 rounded-xl border border-stone-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-ink-muted text-sm" aria-live="polite">
                        {hasChanges ? (
                          <span className="text-earth-700 font-medium">
                            Tienes cambios sin guardar.
                          </span>
                        ) : (
                          '* Campos obligatorios.'
                        )}
                      </p>
                      <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        <Button variant="secondary" onClick={cancelEditing} disabled={isSaving}>
                          Cancelar
                        </Button>
                        <Button type="submit" loading={isSaving} disabled={!hasChanges}>
                          {isSaving ? 'Guardando...' : 'Guardar cambios'}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Card>
              )}
            </div>

            <aside className="flex flex-col gap-4">
              <ProfileCompletion profile={profile} />
              <PrivacyNote />
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}
