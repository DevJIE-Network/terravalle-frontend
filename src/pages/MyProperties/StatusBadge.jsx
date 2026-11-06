import { getStatusConfig } from '@/utils/myProperties';
import { cn } from '@/utils/helpers';

/**
 * Etiqueta del estado de publicación. El significado va en el TEXTO; el color y el punto
 * solo refuerzan (no dependen del color para entenderse).
 */
export default function StatusBadge({ status, className }) {
  const config = getStatusConfig(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        config.badge,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-2 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}
