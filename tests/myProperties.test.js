import { describe, expect, it } from 'vitest';
import {
  ACTION_CONFIG,
  applyStatusChange,
  describeAction,
  getAvailableActions,
  getPendingItems,
  getPrimaryPhotoUrl,
  getStatusConfig,
  isEditable,
} from '@/utils/myProperties';

describe('HU-024 · estados de publicación', () => {
  it('cada estado tiene texto legible (no solo color)', () => {
    expect(getStatusConfig('draft').label).toBe('Borrador');
    expect(getStatusConfig('active').label).toBe('Activa');
    expect(getStatusConfig('inactive').label).toBe('Inactiva');
    expect(getStatusConfig('withdrawn').label).toBe('Retirada');
  });

  it('indica si los compradores la ven', () => {
    expect(getStatusConfig('active').visibility).toMatch(/Disponible/);
    expect(getStatusConfig('inactive').visibility).toMatch(/No visible/);
    expect(getStatusConfig('draft').visibility).toMatch(/No visible/);
  });

  it('un estado desconocido no rompe la pantalla', () => {
    expect(getStatusConfig('archived').label).toBe('archived');
    expect(getStatusConfig(undefined).label).toBe('Sin estado');
  });

  it('refleja las transiciones válidas de HU-008', () => {
    expect(getAvailableActions('draft')).toEqual(['activate', 'withdraw']);
    expect(getAvailableActions('active')).toEqual(['deactivate', 'withdraw']);
    expect(getAvailableActions('inactive')).toEqual(['activate', 'withdraw']);
    expect(getAvailableActions('withdrawn')).toEqual([]);
    expect(getAvailableActions('otro')).toEqual([]);
  });

  it('cada acción lleva a su estado', () => {
    expect(ACTION_CONFIG.activate.targetStatus).toBe('active');
    expect(ACTION_CONFIG.deactivate.targetStatus).toBe('inactive');
    expect(ACTION_CONFIG.withdraw.targetStatus).toBe('withdrawn');
  });

  it('una propiedad retirada no es editable', () => {
    expect(isEditable({ status: 'withdrawn' })).toBe(false);
    expect(isEditable({ status: 'draft' })).toBe(true);
  });
});

describe('HU-024 · fotografía principal', () => {
  it('acepta las formas más probables del backend', () => {
    expect(getPrimaryPhotoUrl({ primaryPhotoUrl: 'a.jpg' })).toBe('a.jpg');
    expect(getPrimaryPhotoUrl({ primaryPhoto: { url: 'b.jpg' } })).toBe('b.jpg');
    expect(
      getPrimaryPhotoUrl({
        photos: [{ url: 'c.jpg' }, { url: 'd.jpg', isPrimary: true }],
      }),
    ).toBe('d.jpg');
    expect(getPrimaryPhotoUrl({ photos: [{ url: 'e.jpg' }] })).toBe('e.jpg');
  });

  it('devuelve null si no hay fotografía', () => {
    expect(getPrimaryPhotoUrl({})).toBeNull();
    expect(getPrimaryPhotoUrl({ photos: [] })).toBeNull();
    expect(getPrimaryPhotoUrl(null)).toBeNull();
  });
});

describe('HU-024 · información pendiente', () => {
  it('marca solo lo que el backend indica explícitamente, con su formulario', () => {
    const items = getPendingItems({
      id: 7,
      status: 'draft',
      hasDimensions: false,
      servicesCount: 0,
      publicationPrice: null,
    });
    expect(items.map((item) => item.key)).toEqual(['dimensions', 'services', 'price']);
    expect(items.map((item) => item.to)).toEqual([
      '/mis-propiedades/7/dimensiones',
      '/mis-propiedades/7/servicios',
      '/mis-propiedades/7/editar',
    ]);
  });

  it('no inventa pendientes cuando el dato no viene en la respuesta', () => {
    expect(getPendingItems({ id: 1, status: 'draft' })).toEqual([]);
  });

  it('no marca pendientes con datos completos', () => {
    expect(
      getPendingItems({
        id: 1,
        status: 'active',
        hasDimensions: true,
        servicesCount: 3,
        publicationPrice: 100,
      }),
    ).toEqual([]);
  });

  it('una propiedad retirada no tiene pendientes', () => {
    expect(getPendingItems({ id: 1, status: 'withdrawn', publicationPrice: null })).toEqual([]);
  });
});

describe('HU-024 · aplicar un cambio de estado a la lista', () => {
  const list = [
    { id: '1', status: 'active' },
    { id: '2', status: 'draft' },
  ];

  it('actualiza la propiedad en su lugar sin filtro', () => {
    const next = applyStatusChange(list, { id: '1', status: 'inactive' }, '');
    expect(next).toEqual([
      { id: '1', status: 'inactive' },
      { id: '2', status: 'draft' },
    ]);
  });

  it('la quita si ya no coincide con el filtro vigente', () => {
    expect(applyStatusChange(list, { id: '1', status: 'inactive' }, 'active')).toEqual([
      { id: '2', status: 'draft' },
    ]);
  });

  it('la conserva si sigue coincidiendo con el filtro', () => {
    expect(applyStatusChange(list, { id: '2', status: 'draft' }, 'draft')).toHaveLength(2);
  });
});

describe('HU-024 · textos de confirmación', () => {
  const property = { title: 'Casa en Tula' };

  it('desactivar explica que deja de mostrarse como disponible', () => {
    const text = describeAction('deactivate', property);
    expect(text.title).toBe('¿Desactivar esta propiedad?');
    expect(text.body).toMatch(/dejará de mostrarse como disponible/);
    expect(text.variant).toBe('primary');
  });

  it('activar menciona la información pendiente si la hay', () => {
    const text = describeAction('activate', property, [{ label: 'Servicios disponibles' }]);
    expect(text.body).toMatch(/información pendiente: Servicios disponibles/);
    expect(describeAction('activate', property).body).not.toMatch(/pendiente/);
  });

  it('retirar advierte que es definitivo y usa el estilo de peligro', () => {
    const text = describeAction('withdraw', property);
    expect(text.body).toMatch(/definitiva/);
    expect(text.variant).toBe('danger');
  });
});
