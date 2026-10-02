import { Navigate, Route, Routes } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import {
  CatalogPage,
  FavoritesPage,
  HomePage,
  LoginPage,
  MyPropertiesPage,
  NotFoundPage,
  ProfilePage,
  RegisterPage,
} from '@/pages';
import { ROUTES } from '@/utils/constants';
import GuestRoute from './GuestRoute';
import ProtectedRoute from './ProtectedRoute';

/**
 * Mapa de rutas de la aplicación.
 * Para agregar una pantalla nueva:
 *   1. Crea la página en src/pages/<Nombre>/<Nombre>Page.jsx y expórtala en src/pages/index.js
 *   2. Agrega su ruta en ROUTES (src/utils/constants.js)
 *   3. Regístrala aquí en el grupo que corresponda (pública, solo visitantes o protegida)
 */
export default function AppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Públicas */}
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.CATALOG} element={<CatalogPage />} />

        {/* Solo visitantes: si ya hay sesión, redirige a "/" */}
        <Route element={<GuestRoute />}>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        </Route>

        {/* Protegidas: si no hay sesión, redirige a "/login" */}
        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.MY_PROPERTIES} element={<MyPropertiesPage />} />
          <Route path={ROUTES.FAVORITES} element={<FavoritesPage />} />
          <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
        </Route>

        {/* No encontrada */}
        <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to={ROUTES.NOT_FOUND} replace />} />
      </Route>
    </Routes>
  );
}
