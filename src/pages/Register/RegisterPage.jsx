import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { register as registerUser } from '@/api/auth.service';
import { Alert, Button, Input, PageHeader } from '@/components/ui';
import { ROUTES } from '@/utils/constants';

const INITIAL_FORM = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    // Limpia el error del campo cuando el usuario lo corrige.
    setErrors((previous) => ({
      ...previous,
      [name]: '',
    }));

    setGeneralError('');
  }

  function validateForm() {
    const newErrors = {};

    const name = form.name.trim();
    const email = form.email.trim();

    // Nombre
    if (!name) {
      newErrors.name = 'El nombre es obligatorio.';
    } else if (name.length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres.';
    } else if (name.length > 120) {
      newErrors.name = 'El nombre no puede superar los 120 caracteres.';
    }

    // Correo
    if (!email) {
      newErrors.email = 'El correo electrónico es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Ingresa un correo electrónico válido.';
    }

    // Contraseña
    if (!form.password) {
      newErrors.password = 'La contraseña es obligatoria.';
    } else if (form.password.length < 8) {
      newErrors.password =
        'La contraseña debe tener al menos 8 caracteres.';
    } else if (form.password.length > 72) {
      newErrors.password =
        'La contraseña no puede superar los 72 caracteres.';
    }

    // Confirmación
    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña.';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    return newErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Evita doble envío.
    if (isSubmitting) return;

    setGeneralError('');

    const validationErrors = validateForm();

    // Si existe algún error, NO enviamos nada al backend.
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);

      /*
       * confirmPassword NO se envía al backend.
       * Solamente sirve para validación en frontend.
       */
      await registerUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      navigate(ROUTES.LOGIN, {
        replace: true,
        state: {
          message:
            'Cuenta creada correctamente. Ahora puedes iniciar sesión.',
        },
      });
    } catch (error) {
      // Correo duplicado.
      if (error.status === 409) {
        setErrors((previous) => ({
          ...previous,
          email: 'Este correo electrónico ya está registrado.',
        }));

        return;
      }

      // Error general: red, servidor, timeout, etc.
      setGeneralError(
        error.details?.message ||
          error.message ||
          'No fue posible crear la cuenta. Intenta nuevamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md">
      <PageHeader
        title="Crear cuenta"
        description="Regístrate para publicar tus inmuebles y guardar propiedades favoritas."
      />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5"
      >
        <Input
          label="Nombre"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          placeholder="Ingresa tu nombre"
          autoComplete="name"
          error={errors.name}
        />

        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="correo@ejemplo.com"
          autoComplete="email"
          error={errors.email}
        />

        <Input
          label="Contraseña"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={form.password}
          onChange={handleChange}
          placeholder="Ingresa tu contraseña"
          autoComplete="new-password"
          error={errors.password}
          hint="Debe tener entre 8 y 72 caracteres."
        />

        <Input
          label="Confirmar contraseña"
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          value={form.confirmPassword}
          onChange={handleChange}
          placeholder="Repite tu contraseña"
          autoComplete="new-password"
          error={errors.confirmPassword}
        />

        <div className="flex items-center justify-between gap-3">
          <label className="text-ink flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) =>
                setShowPassword(event.target.checked)
              }
            />
            Mostrar contraseña
          </label>
        </div>

        {generalError && (
          <Alert
            variant="error"
            title="No se pudo crear la cuenta"
            onClose={() => setGeneralError('')}
          >
            {generalError}
          </Alert>
        )}

        <Button
          type="submit"
          loading={isSubmitting}
          fullWidth
        >
          {isSubmitting
            ? 'Creando cuenta...'
            : 'Crear cuenta'}
        </Button>

        <div className="border-t border-stone-200 pt-4">
          <p className="text-ink-muted mb-3 text-center text-sm">
            ¿Ya tienes una cuenta?
          </p>

          <Button
            to={ROUTES.LOGIN}
            variant="secondary"
            fullWidth
          >
            Iniciar sesión
          </Button>
        </div>
      </form>
    </section>
  );
}