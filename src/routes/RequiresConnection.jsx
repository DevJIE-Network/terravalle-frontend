import { Outlet } from 'react-router-dom';
import { Alert } from '@/components/ui';
import { useOnlineStatus } from '@/hooks';

/**
 * Pantallas que envían o necesitan datos vigentes (iniciar sesión, publicar, editar, estimar con IA,
 * perfil y favoritos). Sin conexión se explica por qué y se deshabilitan sus controles con un
 * fieldset: lo escrito se conserva y nada se envía hasta que vuelva la conexión.
 */
export default function RequiresConnection() {
  const online = useOnlineStatus();

  return (
    <>
      {!online && (
        <Alert variant="warning" title="Esta sección requiere conexión" className="mb-6">
          Sin Internet no se pueden enviar ni actualizar datos. Lo que escribiste se conserva y
          podrás continuar cuando vuelva la conexión.
        </Alert>
      )}
      <fieldset disabled={!online} className="m-0 min-w-0 border-0 p-0">
        <Outlet />
      </fieldset>
    </>
  );
}
