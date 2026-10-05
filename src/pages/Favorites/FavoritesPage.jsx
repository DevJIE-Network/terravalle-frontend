// TODO HU-030: marcar propiedades favoritas y consultar mi lista.
import { EmptyState, PageHeader } from '@/components/ui';

export default function FavoritesPage() {
  return (
    <section>
      <PageHeader
        title="Favoritos"
        description="Las propiedades que guardaste para revisarlas después."
      />
      <EmptyState
        title="Aún no tienes favoritos"
        description="Cuando marques propiedades como favoritas en el catálogo, aparecerán aquí."
      />
    </section>
  );
}
