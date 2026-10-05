/**
 * Encabezado estándar de cada página (título + descripción).
 *
 * @param {object} props
 * @param {string} props.title Título principal de la página (se renderiza como <h1>).
 * @param {string} [props.description] Texto breve bajo el título.
 * @param {import('react').ReactNode} [props.actions] Botones a la derecha en escritorio (debajo en celular).
 *
 * @example <PageHeader title="Favoritos" description="Propiedades que guardaste." />
 */
export default function PageHeader({ title, description, actions }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-primary-800 text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="text-ink-muted mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
