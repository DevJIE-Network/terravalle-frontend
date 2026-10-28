import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
} from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { AuthProvider } from '@/context/AuthProvider';
import {
  CatalogPage,
  CreatePropertyPage,
  FavoritesPage,
  HomePage,
  LoginPage,
  MyPropertiesPage,
  NotFoundPage,
  ProfilePage,
  PropertyEstimationPage,
  RegisterPage,
} from '@/pages';

import { ROUTES } from '@/utils/constants';

import GuestRoute from './GuestRoute';
import ProtectedRoute from './ProtectedRoute';

/** Proveedores que necesitan el router (AuthProvider usa useNavigate). */
function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

/**
 * Mapa de rutas de la aplicación.
 * Se usa un "data router" (createBrowserRouter) porque permite bloquear la navegación cuando hay
 * cambios sin guardar (useBlocker, HU-019).
 *
 * Para agregar una pantalla nueva:
 *   1. Crea la página en src/pages/<Nombre>/<Nombre>Page.jsx
 *      y expórtala en src/pages/index.js
 *   2. Agrega su ruta en ROUTES (src/utils/constants.js)
 *   3. Regístrala aquí en el grupo que corresponda
 *      (pública, solo visitantes o protegida)
 */
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      <Route element={<MainLayout />}>
        {/* Públicas */}
        <Route
          path={ROUTES.HOME}
          element={<HomePage />}
        />

        <Route
          path={ROUTES.CATALOG}
          element={<CatalogPage />}
        />

        {/* Solo visitantes */}
        <Route element={<GuestRoute />}>
          <Route
            path={ROUTES.LOGIN}
            element={<LoginPage />}
          />

          <Route
            path={ROUTES.REGISTER}
            element={<RegisterPage />}
          />
        </Route>

        {/* Protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route
            path={ROUTES.MY_PROPERTIES}
            element={<MyPropertiesPage />}
          />

          <Route
            path={ROUTES.CREATE_PROPERTY}
            element={<CreatePropertyPage />}
          />

          <Route
            path={ROUTES.PROPERTY_ESTIMATION}
            element={<PropertyEstimationPage />}
          />

          <Route
            path={ROUTES.FAVORITES}
            element={<FavoritesPage />}
          />

          <Route
            path={ROUTES.PROFILE}
            element={<ProfilePage />}
          />
        </Route>

        {/* No encontrada */}
        <Route
          path={ROUTES.NOT_FOUND}
          element={<NotFoundPage />}
        />

        <Route
          path="*"
          element={
            <Navigate
              to={ROUTES.NOT_FOUND}
              replace
            />
          }
        />
      </Route>
    </Route>,
  ),
);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
