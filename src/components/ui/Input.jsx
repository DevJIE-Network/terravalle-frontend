import { useId } from 'react';
import { cn } from '@/utils/helpers';

/**
 * Campo de texto con etiqueta y mensaje de error.
 *
 * @param {object} props
 * @param {string} props.label Texto de la etiqueta (obligatorio por accesibilidad).
 * @param {'text'|'email'|'password'|'number'|'tel'|'search'} [props.type='text'] Tipo de campo.
 * @param {string} [props.error] Mensaje de error; si existe, el campo se marca en rojo.
 * @param {string} [props.hint] Texto de ayuda bajo el campo (se oculta si hay error).
 * @param {string} [props.id] Id del input; si no se pasa, se genera uno automáticamente.
 * @param {string} [props.className] Clases extra para el contenedor.
 * Cualquier otra prop (name, value, onChange, placeholder, required, ref...) se pasa al <input>.
 *
 * @example
 * <Input label="Correo electrónico" type="email" name="email"
 *        value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
 */
export default function Input({ label, type = 'text', error, hint, id, className, ...rest }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error || hint;

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-ink text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          'text-ink h-11 w-full rounded-lg border bg-white px-3 text-base transition-colors',
          'placeholder:text-stone-400 disabled:cursor-not-allowed disabled:bg-stone-100',
          'focus:ring-2 focus:outline-none',
          error
            ? 'border-red-500 focus:ring-red-200'
            : 'focus:border-primary-500 focus:ring-primary-100 border-stone-300',
        )}
        {...rest}
      />
      {message && (
        <p
          id={messageId}
          className={cn('text-sm', error ? 'text-red-600' : 'text-ink-muted')}
          role={error ? 'alert' : undefined}
        >
          {message}
        </p>
      )}
    </div>
  );
}
