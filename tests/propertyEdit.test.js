import { describe, expect, it } from 'vitest';
import {
  EMPTY_EDIT_FORM,
  formFromProperty,
  hasChanges,
  toChanges,
  validateEditForm,
} from '@/utils/propertyEdit';

const VALID = {
  title: 'Casa en Tula',
  propertyTypeId: '2',
  description: 'Bonita casa',
  publicationPrice: '1500000',
};

describe('HU-024 · formFromProperty', () => {
  it('precarga los datos como texto y tolera nulos', () => {
    expect(
      formFromProperty({
        title: 'Casa',
        propertyTypeId: 2,
        description: null,
        publicationPrice: 1500000,
      }),
    ).toEqual({
      title: 'Casa',
      propertyTypeId: '2',
      description: '',
      publicationPrice: '1500000',
    });
    expect(formFromProperty(null)).toEqual(EMPTY_EDIT_FORM);
  });
});

describe('HU-024 · validateEditForm (reglas de HU-008)', () => {
  it('acepta datos válidos', () => {
    expect(validateEditForm(VALID)).toEqual({});
  });

  it('valida el título (3 a 150)', () => {
    expect(validateEditForm({ ...VALID, title: '  ' }).title).toMatch(/obligatorio/);
    expect(validateEditForm({ ...VALID, title: 'ab' }).title).toMatch(/al menos 3/);
    expect(validateEditForm({ ...VALID, title: 'a'.repeat(151) }).title).toMatch(/150/);
    expect(validateEditForm({ ...VALID, title: 'abc' }).title).toBeUndefined();
  });

  it('exige un tipo de propiedad existente', () => {
    expect(validateEditForm({ ...VALID, propertyTypeId: '' }).propertyTypeId).toBeTruthy();
    expect(validateEditForm({ ...VALID, propertyTypeId: '99' }).propertyTypeId).toBeTruthy();
  });

  it('limita la descripción a 3000 caracteres', () => {
    expect(validateEditForm({ ...VALID, description: 'a'.repeat(3001) }).description).toMatch(
      /3000/,
    );
  });

  it('el precio: vacío es válido; negativo, no numérico o con más de 2 decimales no', () => {
    expect(validateEditForm({ ...VALID, publicationPrice: '' })).toEqual({});
    expect(validateEditForm({ ...VALID, publicationPrice: '0' })).toEqual({});
    expect(validateEditForm({ ...VALID, publicationPrice: '10.50' })).toEqual({});
    expect(validateEditForm({ ...VALID, publicationPrice: '-5' }).publicationPrice).toMatch(
      /negativo/,
    );
    expect(validateEditForm({ ...VALID, publicationPrice: 'abc' }).publicationPrice).toMatch(
      /válido/,
    );
    expect(validateEditForm({ ...VALID, publicationPrice: '10.999' }).publicationPrice).toMatch(
      /2 decimales/,
    );
  });
});

describe('HU-024 · toChanges (PATCH parcial)', () => {
  it('sin cambios devuelve {} (el backend rechaza un PATCH vacío)', () => {
    expect(toChanges(VALID, VALID)).toEqual({});
    expect(hasChanges(VALID, VALID)).toBe(false);
  });

  it('envía solo lo que cambió y con su tipo correcto', () => {
    expect(toChanges({ ...VALID, title: ' Casa renovada ' }, VALID)).toEqual({
      title: 'Casa renovada',
    });
    expect(toChanges({ ...VALID, publicationPrice: '1600000.50' }, VALID)).toEqual({
      publicationPrice: 1600000.5,
    });
    expect(toChanges({ ...VALID, propertyTypeId: '3' }, VALID)).toEqual({ propertyTypeId: 3 });
  });

  it('vaciar descripción o precio los envía como null', () => {
    expect(toChanges({ ...VALID, description: '  ', publicationPrice: '' }, VALID)).toEqual({
      description: null,
      publicationPrice: null,
    });
  });

  it('ignorar espacios sobrantes no cuenta como cambio', () => {
    expect(hasChanges({ ...VALID, title: '  Casa en Tula  ' }, VALID)).toBe(false);
  });
});
