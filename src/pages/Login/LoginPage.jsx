import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Input, PageHeader } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/utils/constants';

const INITIAL_FORM = { email: '', password: '' };

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
    setGeneralError('');
  }

  function validateForm() {
    const newErrors = {};
    const email = form.email.trim();

    if (!email) {
      newErrors.email = 'El correo electrónico es obligatorio.';
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = 'Ingresa un correo electrónico válido.';
    }

    if (!form.password) {
      newErrors.password = 'La contraseña es obligatoria.';
    }

    return newErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    setGeneralError('');
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      const destination = location.state?.from?.pathname || ROUTES.HOME;
      navigate(destination, { replace: true });
    } catch (error) {
      setGeneralError(
        error.details?.message || error.message || 'No fue posible iniciar sesión. Intenta nuevamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md">
      <PageHeader
        title="Iniciar sesión"
        description="Accede a tu cuenta para publicar propiedades y guardar tus favoritas."
      />

      {location.state?.message && (
        <Alert variant="success" className="mb-5">
          {location.state.message}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
          autoComplete="current-password"
          error={errors.password}
        />

        <label className="text-ink flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
          />
          Mostrar contraseña
        </label>

        {generalError && (
          <Alert
            variant="error"
            title="No se pudo iniciar sesión"
            onClose={() => setGeneralError('')}
          >
            {generalError}
          </Alert>
        )}

        <Button type="submit" loading={isSubmitting} fullWidth>
          {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </Button>

        <div className="border-t border-stone-200 pt-4">
          <p className="text-ink-muted mb-3 text-center text-sm">
            ¿Todavía no tienes una cuenta?
          </p>
          <Button to={ROUTES.REGISTER} variant="secondary" fullWidth>
            Crear cuenta
          </Button>
        </div>
      </form>
    </section>
  );
}
