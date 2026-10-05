import { cn } from '@/utils/helpers';

function DefaultIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

/**
 * Mensaje para cuando una sección no tiene datos que mostrar.
 *
 * @param {object} props
 * @param {string} props.title Título corto (ej. "Aún no tienes favoritos").
 * @param {string} [props.description] Explicación o sugerencia para el usuario.
 * @param {import('react').ReactNode} [props.icon] Ícono personalizado (por defecto, una casa).
 * @param {import('react').ReactNode} [props.action] Acción sugerida (ej. un <Button>).
 * @param {string} [props.className] Clases extra.
 *
 * @example
 * <EmptyState title="Sin resultados" description="Prueba con otros filtros."
 *             action={<Button variant="secondary">Limpiar filtros</Button>} />
 */
export default function EmptyState({ title, description, icon, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center',
        className,
      )}
    >
      <div className="bg-primary-50 text-primary-600 mb-4 flex size-14 items-center justify-center rounded-full">
        {icon ?? <DefaultIcon />}
      </div>
      <h3 className="text-ink text-base font-semibold">{title}</h3>
      {description && <p className="text-ink-muted mt-1 max-w-md text-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
