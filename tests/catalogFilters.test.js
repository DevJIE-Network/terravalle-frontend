import { describe, expect, it } from 'vitest';
import {
  CATALOG_FILTER_KEYS,
  describeActiveFilters,
  removeFilter,
  toSearchParams,
  validateCatalogFilters,
  valuesFromSearchParams,
} from '@/utils/catalogFilters';

const params = (query) => new URLSearchParams(query);

describe('lectura de criterios desde la URL', () => {
  it('sin parámetros devuelve criterios vacíos', () => {
    expect(valuesFromSearchParams(params(''))).toEqual({
      q: '',
      propertyTypeId: '',
      minPrice: '',
      maxPrice: '',
      state: '',
      municipality: '',
      minLandArea: '',
      maxLandArea: '',
      hasConstruction: '',
      serviceIds: [],
    });
  });

  it('lee todos los criterios, admite serviceIds con comas o repetidos e ignora lo ajeno', () => {
    const values = valuesFromSearchParams(
      params('q=%20casa%20&propertyTypeId=2&minPrice=10&serviceIds=1,2&serviceIds=3&utm=x&page=4'),
    );
    expect(values).toMatchObject({ q: 'casa', propertyTypeId: '2', minPrice: '10' });
    expect(values.serviceIds).toEqual(['1', '2', '3']);
    expect(values).not.toHaveProperty('utm');
    expect(values).not.toHaveProperty('page');
  });
});

describe('validación antes de consultar (CA4)', () => {
  it('sin criterios no hay filtros ni errores', () => {
    expect(validateCatalogFilters({})).toEqual({ filters: {}, errors: {} });
  });

  it('convierte los textos en tipos reales y solo conserva lo que tiene valor', () => {
    const { filters, errors } = validateCatalogFilters({
      q: '  casa   con   jardín ',
      propertyTypeId: '2',
      minPrice: '100000',
      maxPrice: '2500000.50',
      state: ' Hidalgo ',
      municipality: '',
      minLandArea: '0',
      maxLandArea: '500.5',
      hasConstruction: 'false',
      serviceIds: ['2', '1', '2'],
    });
    expect(errors).toEqual({});
    expect(filters).toEqual({
      q: 'casa con jardín',
      propertyTypeId: 2,
      minPrice: 100000,
      maxPrice: 2500000.5,
      state: 'Hidalgo',
      minLandArea: 0,
      maxLandArea: 500.5,
      hasConstruction: false,
      serviceIds: [2, 1],
    });
  });

  it('un mínimo mayor que el máximo marca ambos campos y no deja ese rango en los filtros', () => {
    const price = validateCatalogFilters({ minPrice: '900', maxPrice: '100' });
    expect(price.errors.minPrice).toMatch(/mínimo no puede ser mayor/);
    expect(price.errors.maxPrice).toMatch(/máximo no puede ser menor/);
    expect(price.filters).toEqual({});

    const area = validateCatalogFilters({ minLandArea: '50', maxLandArea: '10' });
    expect(area.errors.minLandArea).toMatch(/superficie mínima/);
    expect(area.errors.maxLandArea).toMatch(/superficie máxima/);
  });

  it('acepta rangos iguales y con un solo extremo', () => {
    expect(validateCatalogFilters({ minPrice: '5', maxPrice: '5' }).errors).toEqual({});
    expect(validateCatalogFilters({ maxPrice: '5' }).filters).toEqual({ maxPrice: 5 });
    expect(validateCatalogFilters({ minLandArea: '5' }).filters).toEqual({ minLandArea: 5 });
  });

  it.each([
    ['minPrice', '-1'],
    ['minPrice', 'abc'],
    ['maxPrice', '1e3'],
    ['maxPrice', '1,500'],
    ['minLandArea', '10.999'],
    ['maxLandArea', '.5'],
    ['maxPrice', '1000000000000'],
    ['maxLandArea', '10000001'],
  ])('rechaza %s = "%s"', (field, value) => {
    const { errors, filters } = validateCatalogFilters({ [field]: value });
    expect(errors[field]).toBeTruthy();
    expect(filters).toEqual({});
  });

  it('valida texto, tipo, construcción y servicios', () => {
    expect(validateCatalogFilters({ q: 'a'.repeat(101) }).errors.q).toMatch(/100 caracteres/);
    expect(validateCatalogFilters({ state: 'a'.repeat(121) }).errors.state).toMatch(/120/);
    expect(validateCatalogFilters({ municipality: 'b'.repeat(121) }).errors.municipality).toMatch(
      /120/,
    );
    expect(validateCatalogFilters({ propertyTypeId: '99' }).errors.propertyTypeId).toBeTruthy();
    expect(validateCatalogFilters({ propertyTypeId: 'casa' }).errors.propertyTypeId).toBeTruthy();
    expect(
      validateCatalogFilters({ hasConstruction: 'quizás' }).errors.hasConstruction,
    ).toBeTruthy();
    expect(validateCatalogFilters({ serviceIds: ['1', 'agua'] }).errors.serviceIds).toBeTruthy();
    expect(validateCatalogFilters({ serviceIds: ['0'] }).errors.serviceIds).toBeTruthy();
    expect(
      validateCatalogFilters({ serviceIds: Array.from({ length: 31 }, (_, i) => String(i + 1)) })
        .errors.serviceIds,
    ).toMatch(/30/);
  });

  it('reporta todos los errores a la vez', () => {
    const { errors } = validateCatalogFilters({ minPrice: 'x', propertyTypeId: '99' });
    expect(Object.keys(errors).sort()).toEqual(['minPrice', 'propertyTypeId']);
  });
});

describe('criterios en la dirección de la página', () => {
  it('genera la URL en orden estable y sin criterios vacíos', () => {
    const a = toSearchParams({
      maxPrice: 900,
      q: 'casa',
      serviceIds: [2, 1],
      hasConstruction: false,
    });
    const b = toSearchParams({
      serviceIds: [2, 1],
      q: 'casa',
      hasConstruction: false,
      maxPrice: 900,
    });
    expect(a.toString()).toBe('q=casa&maxPrice=900&hasConstruction=false&serviceIds=2%2C1');
    expect(a.toString()).toBe(b.toString());
    expect(toSearchParams({}).toString()).toBe('');
    expect(toSearchParams({ q: '', serviceIds: [] }).toString()).toBe('');
  });

  it('ida y vuelta: URL → valores → filtros → URL conserva la búsqueda', () => {
    const original =
      'q=casa&propertyTypeId=2&minPrice=1000&maxPrice=5000&state=Hidalgo&hasConstruction=true&serviceIds=1%2C3';
    const { filters, errors } = validateCatalogFilters(valuesFromSearchParams(params(original)));
    expect(errors).toEqual({});
    expect(toSearchParams(filters).toString()).toBe(original);
  });

  it('expone los parámetros que entiende el backend', () => {
    expect(CATALOG_FILTER_KEYS).toEqual([
      'q',
      'propertyTypeId',
      'minPrice',
      'maxPrice',
      'state',
      'municipality',
      'minLandArea',
      'maxLandArea',
      'hasConstruction',
      'serviceIds',
    ]);
  });
});

describe('etiquetas de filtros activos', () => {
  const services = [
    { id: 1, name: 'Agua potable' },
    { id: 2, name: 'Electricidad' },
  ];

  it('sin filtros no hay etiquetas', () => {
    expect(describeActiveFilters({})).toEqual([]);
  });

  it('describe cada criterio en español, agrupando los rangos', () => {
    const chips = describeActiveFilters(
      {
        q: 'casa',
        propertyTypeId: 1,
        minPrice: 100000,
        maxPrice: 900000,
        state: 'Hidalgo',
        municipality: 'Tula',
        minLandArea: 200,
        hasConstruction: true,
        serviceIds: [1, 9],
      },
      services,
    );
    expect(chips.map((chip) => chip.label)).toEqual([
      'Búsqueda: “casa”',
      'Tipo: Terreno',
      'Precio: $100,000 – $900,000',
      'Estado: Hidalgo',
      'Municipio: Tula',
      'Superficie: desde 200 m²',
      'Con construcción',
      'Servicio: Agua potable',
      'Servicio: #9',
    ]);
  });

  it('formatos de rango con un solo extremo y sin construcción', () => {
    const chips = describeActiveFilters({
      maxPrice: 500000,
      maxLandArea: 1500.5,
      hasConstruction: false,
    });
    expect(chips.map((chip) => chip.label)).toEqual([
      'Precio: hasta $500,000',
      'Superficie: hasta 1,500.5 m²',
      'Sin construcción',
    ]);
  });

  it('quitar una etiqueta elimina solo ese criterio y no modifica el original', () => {
    const filters = { q: 'casa', minPrice: 1, maxPrice: 2, serviceIds: [1, 2] };
    const chips = describeActiveFilters(filters, services);
    const price = chips.find((chip) => chip.id === 'price');
    const service = chips.find((chip) => chip.id === 'service-1');

    expect(removeFilter(filters, price)).toEqual({ q: 'casa', serviceIds: [1, 2] });
    expect(removeFilter(filters, service)).toEqual({
      q: 'casa',
      minPrice: 1,
      maxPrice: 2,
      serviceIds: [2],
    });
    expect(removeFilter({ serviceIds: [1] }, service)).toEqual({});
    expect(filters).toEqual({ q: 'casa', minPrice: 1, maxPrice: 2, serviceIds: [1, 2] });
  });
});
