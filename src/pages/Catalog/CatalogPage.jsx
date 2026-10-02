// TODO HU-026: catálogo de propiedades con paginación
// TODO HU-027: barra de búsqueda y panel de filtros
// TODO HU-028: enlace a la ficha detallada de cada propiedad
import { useState } from 'react';
import client from '@/api/client';
import { Alert, Button, Card, EmptyState, ErrorState, Loader, PageHeader } from '@/components/ui';

/**
 * Además del placeholder, esta página tiene un EJEMPLO del patrón de carga/error
 * con el cliente HTTP (sección "Ejemplo: manejo de errores"). Cópialo en tus pantallas
 * y bórralo de aquí cuando se implemente HU-026.
 */
export default function CatalogPage() {
  // status: 'idle' | 'loading' | 'success' | 'error'
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const testConnection = async () => {
    setStatus('loading');
    setError(null);
    try {
      // Endpoint de ejemplo; si el backend no está corriendo verás el mensaje de "sin conexión".
      await client.get('/properties');
      setStatus('success');
    } catch (err) {
      setError(err); // err.message ya viene en español desde el interceptor
      setStatus('error');
    }
  };

  return (
    <section className="flex flex-col gap-8">
      <PageHeader
        title="Catálogo"
        description="Explora las propiedades disponibles, busca por zona y filtra por precio, tipo y características."
      />

      <EmptyState
        title="Todavía no hay propiedades para mostrar"
        description="Aquí aparecerá el listado de propiedades con búsqueda, filtros y paginación."
      />

      <Card title="Ejemplo: manejo de errores del cliente HTTP">
        <p className="text-ink-muted mb-4 text-sm">
          Hace una petición a <code className="break-all">GET /properties</code> y muestra el
          resultado con los componentes Loader, ErrorState y Alert.
        </p>

        {status === 'idle' && (
          <Button variant="secondary" onClick={testConnection}>
            Probar conexión con la API
          </Button>
        )}
        {status === 'loading' && <Loader label="Consultando propiedades..." />}
        {status === 'error' && <ErrorState message={error.message} onRetry={testConnection} />}
        {status === 'success' && (
          <Alert variant="success" onClose={() => setStatus('idle')}>
            La API respondió correctamente.
          </Alert>
        )}
      </Card>
    </section>
  );
}
