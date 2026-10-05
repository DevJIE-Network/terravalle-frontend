// TODO HU-024: panel para administrar mis propiedades publicadas.
// Relacionadas: HU-020 a HU-023 (formularios de registro de propiedad) y HU-025 (estimación con IA).
import { Button, EmptyState, PageHeader } from '@/components/ui';

export default function MyPropertiesPage() {
  return (
    <section>
      <PageHeader
        title="Mis propiedades"
        description="Administra los inmuebles que has publicado: edítalos, pausa su publicación o elimínalos."
        actions={<Button disabled>Publicar propiedad</Button>}
      />
      <EmptyState
        title="Aún no has publicado propiedades"
        description="Aquí verás la lista de tus inmuebles con su estado y acciones."
      />
    </section>
  );
}
