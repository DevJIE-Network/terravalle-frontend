import { describe, expect, it } from 'vitest';
import {
  EMPTY_FORM,
  formFromDimensions,
  isSameForm,
  parseNumber,
  toDimensionsPayload,
  validateDimensions,
} from '@/utils/propertyDimensions';

const LAND = { landArea: '250', frontage: '10', depth: '25' };
const CONSTRUCTION = {
  builtArea: '120',
  bedrooms: '3',
  bathrooms: '2',
  floors: '2',
  parkingSpaces: '1',
  age: '5',
  condition: 'good',
};

const terrain = (extra = {}) => ({ ...EMPTY_FORM, ...LAND, hasConstruction: 'no', ...extra });
const house = (extra = {}) => ({
  ...EMPTY_FORM,
  ...LAND,
  ...CONSTRUCTION,
  hasConstruction: 'yes',
  ...extra,
});

describe('HU-021 · parseNumber', () => {
  it('interpreta números válidos', () => {
    expect(parseNumber(' 250.5 ')).toEqual({ value: 250.5 });
    expect(parseNumber('3', { integer: true })).toEqual({ value: 3 });
  });

  it('distingue vacío, negativo y no numérico', () => {
    expect(parseNumber('')).toEqual({ reason: 'required' });
    expect(parseNumber('-4')).toEqual({ reason: 'negative' });
    expect(parseNumber('abc')).toEqual({ reason: 'invalid' });
    expect(parseNumber('1e3')).toEqual({ reason: 'invalid' });
    expect(parseNumber('2.5', { integer: true })).toEqual({ reason: 'invalid' });
  });
});

describe('HU-021 · validateDimensions', () => {
  it('CA1: acepta terreno válido sin construcción', () => {
    expect(validateDimensions(terrain()).errors).toEqual({});
  });

  it('CA2: sin construcción no exige ni valida los campos de edificación', () => {
    const { errors } = validateDimensions(terrain({ builtArea: 'abc', bedrooms: '-1' }));
    expect(errors).toEqual({});
  });

  it('CA3: con construcción los campos de edificación son obligatorios', () => {
    const { errors } = validateDimensions({ ...EMPTY_FORM, ...LAND, hasConstruction: 'yes' });
    expect(Object.keys(errors).sort()).toEqual(
      ['age', 'bathrooms', 'bedrooms', 'builtArea', 'condition', 'floors', 'parkingSpaces'].sort(),
    );
  });

  it('obliga a indicar si existe construcción', () => {
    expect(validateDimensions({ ...EMPTY_FORM, ...LAND }).errors.hasConstruction).toBeTruthy();
  });

  it('CA4: marca negativos, cero y no numéricos en el terreno', () => {
    const { errors } = validateDimensions(
      terrain({ landArea: '-10', frontage: '0', depth: 'abc' }),
    );
    expect(errors.landArea).toMatch(/negativos/);
    expect(errors.frontage).toMatch(/mayor que cero/);
    expect(errors.depth).toMatch(/número/);
  });

  it('CA4: enteros no negativos para habitaciones, baños y estacionamientos', () => {
    const { errors } = validateDimensions(
      house({ bedrooms: '-1', bathrooms: '1.5', parkingSpaces: 'x' }),
    );
    expect(errors.bedrooms).toMatch(/negativos/);
    expect(errors.bathrooms).toMatch(/enteros/);
    expect(errors.parkingSpaces).toMatch(/enteros/);
  });

  it('acepta cero habitaciones, baños, estacionamientos y antigüedad, pero no cero pisos', () => {
    const { errors } = validateDimensions(
      house({ bedrooms: '0', bathrooms: '0', parkingSpaces: '0', age: '0', floors: '0' }),
    );
    expect(Object.keys(errors)).toEqual(['floors']);
  });

  it('rechaza valores fuera de rango', () => {
    expect(validateDimensions(house({ bedrooms: '500' })).errors.bedrooms).toMatch(/entre 0 y 99/);
  });

  it('rechaza un estado general desconocido', () => {
    expect(validateDimensions(house({ condition: 'otro' })).errors.condition).toBeTruthy();
  });

  it('avisa (sin bloquear) cuando frente × fondo no coincide con la superficie', () => {
    const { errors, warnings } = validateDimensions(terrain({ landArea: '1000' }));
    expect(errors).toEqual({});
    expect(warnings).toHaveLength(1);
  });

  it('avisa (sin bloquear) cuando lo construido excede terreno × pisos', () => {
    const { errors, warnings } = validateDimensions(house({ builtArea: '900' }));
    expect(errors).toEqual({});
    expect(warnings.some((text) => text.includes('superficie construida'))).toBe(true);
  });

  it('no avisa con datos consistentes', () => {
    expect(validateDimensions(house()).warnings).toEqual([]);
  });
});

describe('HU-021 · conversiones del formulario', () => {
  it('toDimensionsPayload envía números y limpia la construcción si no existe', () => {
    expect(toDimensionsPayload(terrain())).toEqual({
      landArea: 250,
      frontage: 10,
      depth: 25,
      hasConstruction: false,
      builtArea: null,
      bedrooms: null,
      bathrooms: null,
      floors: null,
      parkingSpaces: null,
      age: null,
      condition: null,
    });
  });

  it('toDimensionsPayload incluye la construcción cuando existe', () => {
    expect(toDimensionsPayload(house())).toMatchObject({
      hasConstruction: true,
      builtArea: 120,
      bedrooms: 3,
      condition: 'good',
    });
  });

  it('formFromDimensions precarga los datos existentes como texto', () => {
    const form = formFromDimensions({ ...toDimensionsPayload(house()) });
    expect(form).toEqual(house());
    expect(
      formFromDimensions({ landArea: 90, frontage: 9, depth: 10, hasConstruction: false }),
    ).toMatchObject({ hasConstruction: 'no', landArea: '90', builtArea: '' });
    expect(formFromDimensions(null)).toEqual(EMPTY_FORM);
  });

  it('isSameForm ignora los campos ocultos cuando no hay construcción', () => {
    expect(isSameForm(terrain(), terrain({ builtArea: '999' }))).toBe(true);
    expect(isSameForm(house(), house({ builtArea: '999' }))).toBe(false);
  });
});
