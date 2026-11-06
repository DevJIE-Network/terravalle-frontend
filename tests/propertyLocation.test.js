import { describe, expect, it } from 'vitest';
import {
  EMPTY_LOCATION_FORM,
  formatApproxDistance,
  formFromLocation,
  locationFormHasChanges,
  sortNearbyPlaces,
  toLocationPayload,
  toNearbyPlacePayload,
  validateLocationForm,
  validateNearbyPlaceForm,
} from '@/utils/propertyLocation';

const SAVED = {
  id: '3',
  propertyId: '7',
  street: 'Av. Juárez 10',
  exteriorNumber: '10',
  interiorNumber: null,
  neighborhood: 'Centro',
  municipality: 'Tula de Allende',
  state: 'Hidalgo',
  postalCode: '42800',
  country: 'México',
  latitude: 20.0346,
  longitude: -99.2119,
  formattedAddress: null,
};

describe('formFromLocation', () => {
  it('precarga el formulario desde la ubicación guardada', () => {
    const form = formFromLocation(SAVED);
    expect(form.street).toBe('Av. Juárez 10');
    expect(form.latitude).toBe('20.0346');
    expect(form.longitude).toBe('-99.2119');
    expect(form.interiorNumber).toBe('');
    expect(form.formattedAddress).toBe('');
  });

  it('devuelve el formulario vacío si la ubicación es null', () => {
    expect(formFromLocation(null)).toEqual(EMPTY_LOCATION_FORM);
  });
});

describe('locationFormHasChanges', () => {
  it('detecta cambios y descarta diferencias solo por espacios', () => {
    const form = formFromLocation(SAVED);
    expect(locationFormHasChanges(form, form)).toBe(false);

    form.state = 'X';
    form.interiorNumber = '  ';
    expect(locationFormHasChanges(form, formFromLocation(SAVED))).toBe(true);
  });
});

describe('toLocationPayload', () => {
  it('envía solo los campos escritos y las coordenadas como números', () => {
    const form = formFromLocation({ ...SAVED, interiorNumber: null, formattedAddress: null });
    form.longitude = ' -99.2119 ';
    expect(toLocationPayload(form)).toEqual({
      street: 'Av. Juárez 10',
      exteriorNumber: '10',
      neighborhood: 'Centro',
      municipality: 'Tula de Allende',
      state: 'Hidalgo',
      postalCode: '42800',
      country: 'México',
      latitude: 20.0346,
      longitude: -99.2119,
    });
  });

  it('omite las coordenadas si alguna está vacía (el par va junto)', () => {
    const form = { ...EMPTY_LOCATION_FORM, municipality: 'Tula', state: 'Hidalgo', latitude: '20.03' };
    const payload = toLocationPayload(form);
    expect(payload).toEqual({ municipality: 'Tula', state: 'Hidalgo' });
  });
});

describe('validateLocationForm', () => {
  it('acepta municipio + estado sin coordenadas', () => {
    const form = { ...EMPTY_LOCATION_FORM, municipality: 'Tula', state: 'Hidalgo' };
    expect(validateLocationForm(form)).toEqual({});
  });

  it('acepta coordenadas válidas sin dirección', () => {
    const form = { ...EMPTY_LOCATION_FORM, latitude: '20.0346', longitude: '-99.2119' };
    expect(validateLocationForm(form)).toEqual({});
  });

  it('ubicación insuficiente: no hay ninguna vía de información', () => {
    expect(validateLocationForm(EMPTY_LOCATION_FORM)).toEqual({
      formattedAddress:
        'Debes proporcionar una dirección válida o coordenadas de la propiedad.',
    });
  });

  it('rechaza solo latitud o solo longitud (el par va junto)', () => {
    const form = { ...EMPTY_LOCATION_FORM, latitude: '20.03' };
    const errors = validateLocationForm(form);
    expect(errors.latitude).toBe('La latitud y longitud deben enviarse juntas.');
    expect(errors.longitude).toBe('La latitud y longitud deben enviarse juntas.');
  });

  it('rechaza números no válidos en coordenadas', () => {
    const errors = validateLocationForm({
      ...EMPTY_LOCATION_FORM,
      latitude: 'veinte',
      longitude: 'abc',
    });
    expect(errors.latitude).toMatch(/debe ser un número/);
    expect(errors.longitude).toMatch(/debe ser un número/);
  });

  it('latitud y longitud fuera de rango', () => {
    const errors = validateLocationForm({
      ...EMPTY_LOCATION_FORM,
      latitude: '95',
      longitude: '-200',
    });
    expect(errors.latitude).toBe('La latitud debe estar entre -90 y 90.');
    expect(errors.longitude).toBe('La longitud debe estar entre -180 y 180.');
  });

  it('un par de coordenadas inválido no cuenta como vía de información suficiente', () => {
    const errors = validateLocationForm({
      ...EMPTY_LOCATION_FORM,
      municipality: 'Tula',
      latitude: '95',
    });
    expect(errors.latitude).toBe('La latitud debe estar entre -90 y 90.');
    expect(errors.formattedAddress).toBeTruthy();
  });
});

describe('formatApproxDistance', () => {
  it('metros bajo 1 km', () => {
    expect(formatApproxDistance(650)).toBe('650 m aprox.');
  });

  it('comillas kilométricas con un decimal y sin ceros restantes', () => {
    expect(formatApproxDistance(1400)).toBe('1.4 km aprox.');
    expect(formatApproxDistance(1000)).toBe('1 km aprox.');
  });

  it('sin distancia devuelve null', () => {
    expect(formatApproxDistance(null)).toBeNull();
    expect(formatApproxDistance(undefined)).toBeNull();
  });
});

describe('sortNearbyPlaces', () => {
  const PLACES = [
    { name: 'B', approximateDistanceM: null },
    { name: 'C', approximateDistanceM: 1400 },
    { name: 'A2', approximateDistanceM: 650 },
    { name: 'A1', approximateDistanceM: 650 },
  ];

  it('ordena por distancia ascendente, sin distancia al final, empate por nombre', () => {
    expect(sortNearbyPlaces(PLACES).map((place) => place.name)).toEqual([
      'A1',
      'A2',
      'C',
      'B',
    ]);
  });
});

describe('punto cercano', () => {
  const FORM = { categoryId: '2', name: '  Escuela Benito Juárez  ', approximateDistanceM: ' 1400 ' };

  it('toNearbyPlacePayload recorta y convierte la distancia', () => {
    expect(toNearbyPlacePayload(FORM)).toEqual({
      categoryId: '2',
      name: 'Escuela Benito Juárez',
      approximateDistanceM: 1400,
    });
  });

  it('toNearbyPlacePayload omite la distancia si no se escribe', () => {
    expect(toNearbyPlacePayload({ categoryId: '2', name: 'Escuela', approximateDistanceM: '' })).toEqual({
      categoryId: '2',
      name: 'Escuela',
    });
  });

  it('validateNearbyPlaceForm exige categoría y nombre', () => {
    const errors = validateNearbyPlaceForm({ categoryId: '', name: '', approximateDistanceM: '' });
    expect(errors.categoryId).toBeTruthy();
    expect(errors.name).toBeTruthy();
  });

  it('validateNearbyPlaceForm rechaza distancias no enteras o negativas', () => {
    expect(validateNearbyPlaceForm({ categoryId: '1', name: 'Escuela', approximateDistanceM: '12.5' }))
      .toEqual({ approximateDistanceM: 'La distancia debe ser un número entero.' });
    expect(validateNearbyPlaceForm({ categoryId: '1', name: 'Escuela', approximateDistanceM: '-3' }))
      .toEqual({ approximateDistanceM: 'La distancia no puede ser negativa.' });
    expect(validateNearbyPlaceForm({ categoryId: '1', name: 'Escuela', approximateDistanceM: '650' }))
      .toEqual({});
  });
});
