import { Button, EmptyState, PageHeader } from '@/components/ui';
import { ROUTES } from '@/utils/constants';

/** Punto de integración público hasta que se implemente la historia de la ficha completa. */
export default function PublicPropertyPage() {
  return (
    <section>
      <PageHeader title="Ficha de la propiedad" />
      <EmptyState
        title="El detalle público estará disponible próximamente"
        description="Por ahora puedes seguir explorando las propiedades disponibles en el catálogo."
        action={
          <Button to={ROUTES.CATALOG} variant="secondary">
            Volver al catálogo
          </Button>
        }
      />
    </section>
  );
}
