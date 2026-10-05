import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthProvider';
import AppRouter from '@/routes/AppRouter';

/**
 * Raíz de la aplicación: aquí solo se montan los proveedores globales.
 * Las rutas viven en src/routes/AppRouter.jsx.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
