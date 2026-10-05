// TODO (sin HU asignada aún): contenido de inicio — presentación de TerraValle,
// acceso rápido a la búsqueda (ver HU-027) y propiedades destacadas (ver HU-026).
import { Button, EmptyState, PageHeader } from '@/components/ui';
import { ROUTES } from '@/utils/constants';

export default function HomePage() {
  return (
    <section>
      <PageHeader
        title="Bienvenido a TerraValle"
        description="Publica tus inmuebles con fichas técnicas estandarizadas y obtén una estimación orientativa de su valor."
      />
      <EmptyState
        title="Aquí irá la página de inicio"
        description="Presentación de la plataforma, buscador rápido y propiedades destacadas."
        action={<Button to={ROUTES.CATALOG}>Ver catálogo</Button>}
      />
    </section>
  );
}
