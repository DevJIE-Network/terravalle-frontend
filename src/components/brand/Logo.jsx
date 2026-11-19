import { BRAND_TAGLINE } from '@/utils/constants';
import { cn } from '@/utils/helpers';
import Isotype from './Isotype';

/**
 * Logotipo de TerraValle: isotipo + wordmark "terravalle" en Space Grotesk 600.
 *
 * @param {object} props
 * @param {'horizontal'|'stacked'} [props.layout='horizontal'] lockup horizontal o apilado
 * @param {'color'|'light'} [props.tone='color'] "light" para fondos oscuros o teal
 * @param {boolean} [props.tagline=false] muestra «Bienes raíces en Puerto Vallarta»
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {string} [props.className]
 */
export default function Logo({
  layout = 'horizontal',
  tone = 'color',
  tagline = false,
  size = 'md',
  className,
}) {
  const sizes = {
    sm: { icon: 'h-7', word: 'text-xl', tag: 'text-xs' },
    md: { icon: 'h-9', word: 'text-2xl', tag: 'text-sm' },
    lg: { icon: 'h-16', word: 'text-5xl', tag: 'text-lg' },
  }[size];
  const isLight = tone === 'light';

  return (
    <span
      className={cn(
        'inline-flex',
        layout === 'stacked' ? 'flex-col items-center gap-2 text-center' : 'items-center gap-3',
        className,
      )}
    >
      <Isotype tone={tone} className={sizes.icon} />
      <span className="flex flex-col">
        <span
          className={cn(
            'font-display leading-none font-semibold tracking-tight lowercase',
            sizes.word,
            isLight ? 'text-brand-sand' : 'text-brand-ink',
          )}
        >
          terravalle
        </span>
        {tagline && (
          <span
            className={cn('mt-1', sizes.tag, isLight ? 'text-primary-200' : 'text-primary-600')}
          >
            {BRAND_TAGLINE}
          </span>
        )}
      </span>
    </span>
  );
}
