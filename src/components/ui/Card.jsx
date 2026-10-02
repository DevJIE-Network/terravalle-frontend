import { cn } from '@/utils/helpers';

/**
 * Contenedor con fondo blanco, borde y sombra suave.
 *
 * @param {object} props
 * @param {string} [props.title] Título opcional en la parte superior.
 * @param {import('react').ReactNode} [props.footer] Contenido opcional al pie (ej. botones).
 * @param {import('react').ReactNode} props.children Contenido principal.
 * @param {string} [props.className] Clases extra.
 *
 * @example
 * <Card title="Casa en Tula" footer={<Button size="sm">Ver detalle</Button>}>
 *   3 recámaras · 2 baños
 * </Card>
 */
export default function Card({ title, footer, children, className }) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col rounded-xl border border-stone-200 bg-white shadow-sm',
        className,
      )}
    >
      {title && (
        <div className="border-b border-stone-100 px-5 py-4">
          <h3 className="text-ink text-base font-semibold">{title}</h3>
        </div>
      )}
      <div className="flex-1 px-5 py-4">{children}</div>
      {footer && <div className="border-t border-stone-100 px-5 py-3">{footer}</div>}
    </div>
  );
}
