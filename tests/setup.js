import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Limpia el DOM, el almacenamiento y los mocks entre pruebas.
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
