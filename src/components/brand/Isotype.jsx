import { cn } from '@/utils/helpers';

/*
 * Isotipo de TerraValle: el contorno de un terreno real (cuadrilátero irregular).
 * - Marca de esquina: un mojón de medición.
 * - Punto: una ubicación fijada en el mapa. Siempre en barro/clay.
 * Manual: no rotar ni distorsionar el cuadrilátero; sin degradados, sombras ni relieve.
 */

/** Vértices del lote (viewBox 0 0 48 56): sup. izq., sup. der., inf. der., inf. izq. */
const LOT_PATH = 'M9 8 L45 14 L41 52 L3 48 Z';
const CORNER_MARK = { x1: 9, y1: 8, x2: 4.5, y2: 2 };
const LOCATION_DOT = { cx: 41, cy: 52, r: 3.6 };

const TONES = {
  /** Sobre fondos claros: contorno teal, acento clay. */
  color: { stroke: 'var(--color-brand-teal)', accent: 'var(--color-brand-clay)' },
  /** Sobre fondos oscuros o teal: contorno arena, acento clay. */
  light: { stroke: 'var(--color-brand-sand)', accent: 'var(--color-brand-clay)' },
};

/**
 * @param {object} props
 * @param {'color'|'light'} [props.tone='color']
 * @param {string} [props.title] texto alternativo; sin él el ícono es decorativo
 * @param {string} [props.className] tamaño (ej. "h-8 w-auto")
 */
export default function Isotype({ tone = 'color', title, className }) {
  const colors = TONES[tone] ?? TONES.color;

  return (
    <svg
      viewBox="0 0 48 56"
      fill="none"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      aria-label={title}
      className={cn('h-8 w-auto shrink-0', className)}
    >
      <path d={LOT_PATH} stroke={colors.stroke} strokeWidth="3.6" strokeLinejoin="round" />
      <line {...CORNER_MARK} stroke={colors.accent} strokeWidth="3.6" strokeLinecap="round" />
      <circle {...LOCATION_DOT} fill={colors.accent} />
    </svg>
  );
}
