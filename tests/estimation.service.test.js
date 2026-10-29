import { describe, expect, it, vi } from 'vitest';
import client from '@/api/client';
import {
  getEstimations,
  getMyProperty,
  requestEstimation,
  updatePublicationPrice,
} from '@/api/estimation.service';

describe('estimationService (HU-009)', () => {
  it('requestEstimation solicita la estimación con POST', async () => {
    const body = { estimation: { id: '15' } };
    const post = vi.spyOn(client, 'post').mockResolvedValue({ data: body });

    await expect(requestEstimation('7')).resolves.toEqual(body);
    expect(post).toHaveBeenCalledWith('/properties/7/estimations');
  });

  it('getEstimations consulta el historial de la propiedad', async () => {
    const body = { estimations: [], disclaimer: 'x' };
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: body });

    await expect(getEstimations('7')).resolves.toEqual(body);
    expect(get).toHaveBeenCalledWith('/properties/7/estimations');
  });

  it('getMyProperty consulta el detalle de una propiedad propia', async () => {
    const property = { id: '7', title: 'Casa' };
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: { property } });

    await expect(getMyProperty('7')).resolves.toEqual(property);
    expect(get).toHaveBeenCalledWith('/properties/mine/7');
  });

  it('updatePublicationPrice envía solo el precio con PATCH', async () => {
    const property = { id: '7', publicationPrice: 1650000 };
    const patch = vi.spyOn(client, 'patch').mockResolvedValue({ data: { property } });

    await expect(updatePublicationPrice('7', 1650000)).resolves.toEqual(property);
    expect(patch).toHaveBeenCalledWith('/properties/7', { publicationPrice: 1650000 });
  });
});
