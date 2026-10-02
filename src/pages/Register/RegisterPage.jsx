// TODO HU-017: formulario de registro de cuenta (usar authService.register de '@/api').
import { EmptyState, PageHeader } from '@/components/ui';

export default function RegisterPage() {
  return (
    <section className="mx-auto max-w-md">
      <PageHeader
        title="Crear cuenta"
        description="Regístrate para publicar tus inmuebles y guardar propiedades favoritas."
      />
      <EmptyState
        title="Aquí irá el formulario de registro"
        description="Nombre, correo, contraseña y confirmación, con validaciones."
      />
    </section>
  );
}
