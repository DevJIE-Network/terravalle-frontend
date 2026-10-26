import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '@/App';

describe('App', () => {
  it('monta el router con AuthProvider y muestra la página de inicio', async () => {
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: 'Bienvenido a TerraValle' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Iniciar sesión' }).length).toBeGreaterThan(0);
  });
});
