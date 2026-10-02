// TODO HU-018: formulario de inicio de sesión (correo + contraseña) usando useAuth().login().
// Tras iniciar sesión, regresar a location.state?.from (la página protegida que se intentó abrir) o a "/".
import { EmptyState, PageHeader } from '@/components/ui';

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-md">
      <PageHeader
        title="Iniciar sesión"
        description="Accede a tu cuenta para publicar propiedades y guardar tus favoritas."
      />
      <EmptyState
        title="Aquí irá el formulario de inicio de sesión"
        description="Campos de correo y contraseña, validaciones y mensajes de error."
      />
    </section>
  );
}
