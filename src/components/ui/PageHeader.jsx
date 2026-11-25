/**
 * Encabezado estándar de cada página (título + descripción).
 *
 * @param {object} props
 * @param {string} [props.eyebrow] Texto corto sobre el título (ej. "Mi cuenta").
 * @param {string} props.title Título principal de la página (se renderiza como <h1>).
 * @param {string} [props.description] Texto breve bajo el título.
 * @param {import('react').ReactNode} [props.actions] Botones a la derecha en escritorio (debajo en celular).
 *
 * @example <PageHeader title="Favoritos" description="Propiedades que guardaste." />
 */
export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-earth-700 mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-ink text-3xl leading-tight sm:text-4xl">{title}</h1>
        {description && (
          <p className="text-ink-muted mt-2 max-w-2xl text-base sm:text-lg">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
