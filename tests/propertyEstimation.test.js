import { describe, expect, it } from 'vitest';
import {
  buildPropertyDimensionsPath,
  buildPropertyEditPath,
  buildPropertyLocationPath,
  buildPropertyServicesPath,
} from '@/utils/constants';
import {
  isTimeoutError,
  missingDataLink,
  modelLabel,
  uniqueMissingLinks,
} from '@/utils/propertyEstimation';

describe('utils · propertyEstimation', () => {
  it('enlaza cada dato faltante con su sección', () => {
    expect(missingDataLink({ field: 'characteristics' }, 7)).toEqual({
      to: buildPropertyDimensionsPath(7),
      label: 'Completar dimensiones',
    });
    expect(missingDataLink({ field: 'builtArea' }, 7).to).toBe(buildPropertyDimensionsPath(7));
    expect(missingDataLink({ field: 'location' }, 7).to).toBe(buildPropertyLocationPath(7));
    expect(missingDataLink({ field: 'services' }, 7).to).toBe(buildPropertyServicesPath(7));
  });

  it('un dato desconocido lleva a los datos generales', () => {
    expect(missingDataLink({ field: 'title' }, 7)).toEqual({
      to: buildPropertyEditPath(7),
      label: 'Completar datos generales',
    });
    expect(missingDataLink(undefined, 7).to).toBe(buildPropertyEditPath(7));
  });

  it('no repite accesos de la misma sección', () => {
    const links = uniqueMissingLinks(
      [{ field: 'characteristics' }, { field: 'builtArea' }, { field: 'location' }],
      7,
    );
    expect(links.map((link) => link.label)).toEqual([
      'Completar dimensiones',
      'Completar ubicación',
    ]);
    expect(uniqueMissingLinks(null, 7)).toEqual([]);
  });

  it('detecta un tiempo de espera agotado', () => {
    expect(isTimeoutError({ code: 'ECONNABORTED' })).toBe(true);
    expect(isTimeoutError({ code: null, status: 500 })).toBe(false);
    expect(isTimeoutError(undefined)).toBe(false);
  });

  it('describe el modelo solo con los datos disponibles', () => {
    expect(modelLabel({ modelName: 'valuador', modelVersion: '1.1.0' })).toBe(
      'Modelo valuador · versión 1.1.0',
    );
    expect(modelLabel({ modelVersion: '1.1.0' })).toBe('Versión del modelo 1.1.0');
    expect(modelLabel({ modelName: 'valuador', modelVersion: ' ' })).toBe('Modelo valuador');
    expect(modelLabel({})).toBe('');
    expect(modelLabel(null)).toBe('');
  });
});
