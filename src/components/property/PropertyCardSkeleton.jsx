import { Card } from '@/components/ui';

/** Decorativo: el anuncio de carga accesible lo hace la página, no cada skeleton. */
export default function PropertyCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div
        aria-hidden="true"
        data-testid="property-card-skeleton"
        className="motion-safe:animate-pulse"
      >
        <div className="bg-surface-muted -mx-5 -mt-4 mb-5 aspect-[4/3]" />
        <div className="bg-earth-50 mb-4 h-6 w-20 rounded-full" />
        <div className="bg-surface-muted mb-2 h-6 w-4/5 rounded" />
        <div className="bg-surface-muted mb-6 h-4 w-3/5 rounded" />
        <div className="bg-primary-50 mb-3 h-7 w-2/3 rounded" />
        <div className="bg-surface-muted mb-5 h-4 w-1/3 rounded" />
        <div className="border-t border-stone-100 pt-4">
          <div className="bg-surface-muted h-5 w-28 rounded" />
        </div>
      </div>
    </Card>
  );
}
