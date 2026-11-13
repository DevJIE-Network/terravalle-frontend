import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PhotoUploader from '@/components/property/PhotoUploader';

/** Envoltorio con estado real, como lo usa CreatePropertyPage. */
function Harness({ initial = [], disabled = false }) {
  const [photos, setPhotos] = useState(initial);
  return (
    <>
      <PhotoUploader photos={photos} setPhotos={setPhotos} disabled={disabled} />
      <p data-testid="count">{photos.length}</p>
      <p data-testid="primary">{photos.find((photo) => photo.isPrimary)?.file.name ?? ''}</p>
    </>
  );
}

const image = (name, { type = 'image/jpeg', size = 1024 } = {}) => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const input = (container) => container.querySelector('input[type="file"]');
const select = (container, files) => fireEvent.change(input(container), { target: { files } });
const card = (name) =>
  screen
    .getAllByText(name)
    .find((element) => element.closest('article'))
    .closest('article');

let objectUrls;

beforeEach(() => {
  objectUrls = 0;
  globalThis.URL.createObjectURL = vi.fn(() => `blob:preview-${++objectUrls}`);
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe('HU-020 · Selección de fotografías', () => {
  it('agrega imágenes válidas con vista previa y marca la primera como principal', () => {
    const { container } = render(<Harness />);

    select(container, [
      image('fachada.jpg'),
      image('sala.png', { type: 'image/png', size: 2_097_152 }),
    ]);

    expect(screen.getByTestId('count')).toHaveTextContent('2');
    expect(screen.getByTestId('primary')).toHaveTextContent('fachada.jpg');
    expect(screen.getByAltText('Vista previa de fachada.jpg')).toHaveAttribute(
      'src',
      'blob:preview-1',
    );
    expect(within(card('fachada.jpg')).getByText('Principal')).toBeInTheDocument();
    expect(within(card('sala.png')).getByText('2.00 MB')).toBeInTheDocument();
    expect(input(container).value).toBe('');
  });

  it('rechaza formatos no permitidos y archivos de más de 5 MB, conservando los válidos', () => {
    const { container } = render(<Harness />);

    select(container, [
      image('plano.pdf', { type: 'application/pdf' }),
      image('enorme.jpg', { size: 6 * 1024 * 1024 }),
      image('patio.webp', { type: 'image/webp' }),
    ]);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'plano.pdf: formato no permitido. enorme.jpg: supera el límite de 5 MB.',
    );
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('no pasa de 10 fotografías', () => {
    const { container } = render(<Harness />);

    select(
      container,
      Array.from({ length: 11 }, (_, index) => image(`foto-${index + 1}.jpg`)),
    );

    expect(screen.getByTestId('count')).toHaveTextContent('10');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'foto-11.jpg: se alcanzó el máximo de 10 fotografías.',
    );

    select(container, [image('extra.jpg')]);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Puedes seleccionar un máximo de 10 fotografías.',
    );
    expect(screen.getByTestId('count')).toHaveTextContent('10');
  });

  it('ignora una selección vacía', () => {
    const { container } = render(<Harness />);

    select(container, []);

    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('las fotos agregadas después no reemplazan a la principal', () => {
    const { container } = render(<Harness />);

    select(container, [image('fachada.jpg')]);
    select(container, [image('cocina.jpg')]);

    expect(screen.getByTestId('primary')).toHaveTextContent('fachada.jpg');
  });

  it('permite elegir otra foto como principal', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    select(container, [image('fachada.jpg'), image('sala.jpg')]);

    await user.click(within(card('sala.jpg')).getByRole('button', { name: 'Hacer principal' }));

    expect(screen.getByTestId('primary')).toHaveTextContent('sala.jpg');
    expect(
      within(card('fachada.jpg')).getByRole('button', { name: 'Hacer principal' }),
    ).toBeInTheDocument();
  });

  it('al eliminar la principal, la siguiente pasa a ser principal', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    select(container, [image('fachada.jpg'), image('sala.jpg'), image('patio.jpg')]);

    await user.click(within(card('fachada.jpg')).getByRole('button', { name: 'Eliminar' }));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
    expect(screen.getByTestId('count')).toHaveTextContent('2');
    expect(screen.getByTestId('primary')).toHaveTextContent('sala.jpg');
  });

  it('eliminar una foto que no es principal deja la principal igual', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    select(container, [image('fachada.jpg'), image('sala.jpg')]);

    await user.click(within(card('sala.jpg')).getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByTestId('primary')).toHaveTextContent('fachada.jpg');

    await user.click(within(card('fachada.jpg')).getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('deshabilita la selección y las acciones mientras se guarda', () => {
    const file = image('fachada.jpg');
    const { container } = render(
      <Harness
        disabled
        initial={[
          { id: 'a', file, previewUrl: 'blob:a', isPrimary: true },
          { id: 'b', file: image('sala.jpg'), previewUrl: 'blob:b', isPrimary: false },
        ]}
      />,
    );

    expect(input(container)).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Eliminar' })[0]).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hacer principal' })).toBeDisabled();
  });
});
