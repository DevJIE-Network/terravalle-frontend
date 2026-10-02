// Completa (HU-016): página para rutas inexistentes.
import { Button, EmptyState } from '@/components/ui';
import { ROUTES } from '@/utils/constants';

export default function NotFoundPage() {
  return (
    <section className="py-8">
      <EmptyState
        title="Página no encontrada"
        description="La dirección que buscas no existe o fue movida."
        icon={<span className="text-xl font-bold">404</span>}
        action={<Button to={ROUTES.HOME}>Volver al inicio</Button>}
      />
    </section>
  );
}
