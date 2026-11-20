import { Isotype } from '@/components/brand';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/utils/constants';

const FEATURES = [
  {
    title: 'Fichas técnicas completas',
    description:
      'Terreno, construcción, servicios y ubicación capturados con el mismo formato en cada publicación.',
  },
  {
    title: 'Estimación orientativa',
    description:
      'Una referencia de valor calculada con datos de la zona. Siempre separada del precio del vendedor.',
  },
  {
    title: 'Ubicación con contexto',
    description:
      'Mapa y lugares cercanos con distancias aproximadas para entender el entorno antes de visitar.',
  },
];

const STEPS = [
  { n: '01', text: 'Explora el catálogo y filtra por tipo, zona o precio.' },
  { n: '02', text: 'Revisa la ficha: fotos, medidas, servicios y mapa.' },
  { n: '03', text: 'Guarda tus favoritas y contacta directo al vendedor.' },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col gap-16 sm:gap-20">
      <section className="bg-primary-700 relative overflow-hidden rounded-3xl px-6 py-12 text-white shadow-xl sm:px-12 sm:py-16">
        <Isotype
          tone="light"
          className="pointer-events-none absolute -right-10 -bottom-16 h-80 w-auto opacity-10 sm:h-[26rem]"
        />
        <div className="relative max-w-2xl">
          <p className="font-highlight text-brand-sand text-2xl">terrenos con historia clara</p>
          <h1 className="font-display mt-3 text-4xl leading-tight font-bold sm:text-5xl">
            Bienvenido a TerraValle
          </h1>
          <p className="mt-5 text-lg text-white/85">
            Terrenos y casas con fichas técnicas estandarizadas y una estimación orientativa de su
            valor, para decidir con información clara.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to={ROUTES.CATALOG} variant="secondary" size="lg">
              Ver catálogo
            </Button>
            <Button
              to={isAuthenticated ? ROUTES.CREATE_PROPERTY : ROUTES.REGISTER}
              variant="accent"
              size="lg"
            >
              Publicar un inmueble
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="home-features">
        <h2 id="home-features" className="font-display text-ink text-2xl font-bold sm:text-3xl">
          Lo que encuentras en cada publicación
        </h2>
        <ul className="mt-8 grid gap-5 sm:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <li
              key={feature.title}
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span
                aria-hidden="true"
                className={
                  index === 1
                    ? 'bg-sage-100 text-sage-800 font-display inline-flex size-10 items-center justify-center rounded-xl font-bold'
                    : 'bg-primary-50 text-primary-700 font-display inline-flex size-10 items-center justify-center rounded-xl font-bold'
                }
              >
                {index + 1}
              </span>
              <h3 className="font-display text-ink mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">{feature.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="home-steps"
        className="grid gap-8 rounded-3xl border border-stone-200 bg-white/60 p-8 sm:p-10 md:grid-cols-[1fr_1.4fr]"
      >
        <div>
          <p className="font-highlight text-earth-700 text-xl">en tres pasos</p>
          <h2 id="home-steps" className="font-display text-ink mt-1 text-2xl font-bold sm:text-3xl">
            De la búsqueda a la visita
          </h2>
        </div>
        <ol className="flex flex-col gap-4">
          {STEPS.map((step) => (
            <li key={step.n} className="flex items-start gap-4">
              <span className="font-display text-earth-600 text-2xl font-bold">{step.n}</span>
              <p className="text-ink pt-1">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
