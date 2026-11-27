import { ContactSeller, FavoriteButton, HeartIcon } from '@/components/property';
import { Button } from '@/components/ui';
import { favoriteAvailability } from '@/utils/favorites';

export default function PropertyActions({ property, online = true }) {
  const { id, title } = property;

  // Contactar y guardar consultan o modifican datos en el servidor: sin conexión no se ofrecen.
  if (!online) {
    return (
      <div className="flex flex-col gap-3">
        <Button size="lg" fullWidth disabled>
          Contactar vendedor
        </Button>
        <Button variant="secondary" size="lg" fullWidth disabled>
          <HeartIcon /> Guardar en favoritos
        </Button>
        <p className="text-ink-muted text-sm">
          Contactar al vendedor y guardar en favoritos requieren conexión a Internet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* key: al cambiar de :id el Router reutiliza la ficha; el contacto de la propiedad
          anterior (incluida una petición pendiente) no debe filtrarse en la nueva. */}
      <ContactSeller
        key={id}
        propertyId={id}
        title={title}
        available={favoriteAvailability(property).available}
      />
      <FavoriteButton variant="full" propertyId={id} title={title} snapshot={{ title }} />
    </div>
  );
}
