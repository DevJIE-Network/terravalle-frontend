// TODO HU-019: pantalla para consultar y actualizar mi perfil.
import { EmptyState, PageHeader } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <section>
      <PageHeader title="Mi perfil" description="Consulta y actualiza tus datos de contacto." />
      <EmptyState
        title={`Hola, ${user?.name ?? 'usuario'}`}
        description="Aquí irá el formulario con tus datos personales y de contacto."
      />
    </section>
  );
}
