import { describe, expect, it } from 'vitest';
import { cn, isValidEmail, resolveRedirectPath } from '@/utils/helpers';
import { ROUTES } from '@/utils/constants';

describe('isValidEmail', () => {
  it.each(['ana@correo.com', 'a@b.c', 'x@a.b.c', 'ANA.PEREZ+casa@empresa.com.mx'])(
    'acepta %s',
    (email) => expect(isValidEmail(email)).toBe(true),
  );

  it.each([
    '',
    'ana',
    '@correo.com',
    'ana@',
    'ana@correo',
    'ana@.com',
    'ana@correo.',
    'ana perez@correo.com',
    'ana@@correo.com',
    'ana@correo@otro.com',
    ' ana@correo.com',
  ])('rechaza "%s"', (email) => expect(isValidEmail(email)).toBe(false));

  it('rechaza valores que no son texto o demasiado largos', () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(123)).toBe(false);
    expect(isValidEmail(`${'a'.repeat(250)}@b.com`)).toBe(false);
  });

  it('responde de inmediato con entradas largas (sin backtracking)', () => {
    const start = performance.now();
    isValidEmail(`a@${'.'.repeat(50_000)}`);
    expect(performance.now() - start).toBeLessThan(50);
  });
});

describe('otros helpers', () => {
  it('cn une solo las clases válidas', () => {
    expect(cn('a', false, null, 'b', undefined)).toBe('a b');
  });

  it('resolveRedirectPath regresa a la página privada o al inicio', () => {
    expect(resolveRedirectPath({ pathname: ROUTES.PROFILE, search: '?x=1' })).toBe('/perfil?x=1');
    expect(resolveRedirectPath({ pathname: ROUTES.LOGIN })).toBe(ROUTES.HOME);
    expect(resolveRedirectPath({ pathname: '//externo.com' })).toBe(ROUTES.HOME);
    expect(resolveRedirectPath(null)).toBe(ROUTES.HOME);
  });
});
