import { Isotype } from '@/components/brand';

const BENEFITS = [
  'Fichas técnicas con superficie, construcción y servicios',
  'Ubicación y entorno con distancias aproximadas',
  'Estimación orientativa del valor con IA',
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5 shrink-0" fill="none">
      <circle cx="10" cy="10" r="9" className="fill-primary-400/25" />
      <path
        d="m6 10.2 2.6 2.6L14 7.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Marco de las pantallas de acceso (inicio de sesión y registro):
 * panel de marca en escritorio y el formulario en una tarjeta.
 *
 * @param {object} props
 * @param {string} props.title Título de la pantalla (<h1>).
 * @param {string} [props.description]
 * @param {import('react').ReactNode} props.children El formulario.
 */
export default function AuthShell({ title, description, children }) {
  return (
    <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-xl shadow-stone-900/5 lg:grid-cols-[1fr_1.05fr]">
      <div className="bg-primary-700 text-brand-sand relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        <Isotype
          tone="light"
          className="pointer-events-none absolute -right-16 -bottom-20 h-96 opacity-[0.08]"
        />
        <div className="relative">
          <Isotype tone="light" className="h-12" />
          <p className="font-highlight text-earth-200 mt-10 text-2xl">
            terrenos con historia clara
          </p>
          <p className="font-display mt-3 text-3xl leading-tight font-semibold">
            Bienes raíces en Puerto Vallarta, con toda la información en un solo lugar.
          </p>
        </div>
        <ul className="relative mt-10 flex flex-col gap-3 text-sm">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-3">
              <CheckIcon />
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col justify-center px-6 py-10 sm:px-12 sm:py-12">
        <header className="mb-8">
          <h1 className="text-ink text-3xl">{title}</h1>
          {description && <p className="text-ink-muted mt-2">{description}</p>}
        </header>
        {children}
      </div>
    </section>
  );
}
