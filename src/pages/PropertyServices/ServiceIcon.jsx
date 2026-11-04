/*
 * Íconos de los servicios del catálogo (HU-022). SVG de trazo, sin dependencias externas.
 */
const PATHS = {
  droplet: ['M12 3c3.5 4.2 6 7.4 6 10.5A6 6 0 0 1 6 13.5C6 10.4 8.5 7.2 12 3Z'],
  zap: ['M13 2 4 14h7l-1 8 9-12h-7l1-8Z'],
  waves: [
    'M2 7c2 0 2-1.5 4-1.5S8 7 10 7s2-1.5 4-1.5S16 7 18 7s2-1.5 4-1.5',
    'M2 12c2 0 2-1.5 4-1.5S8 12 10 12s2-1.5 4-1.5S16 12 18 12s2-1.5 4-1.5',
    'M2 17c2 0 2-1.5 4-1.5S8 17 10 17s2-1.5 4-1.5S16 17 18 17s2-1.5 4-1.5',
  ],
  flame: [
    'M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2.5 1.2-4.2 2.5-5.5.3 2 1.2 3 2.5 3.5-.5-3 0-6 0-9Z',
  ],
  wifi: [
    'M2 8.5a15 15 0 0 1 20 0',
    'M5 12a10.5 10.5 0 0 1 14 0',
    'M8.5 15.5a5.5 5.5 0 0 1 7 0',
    'M12 19h.01',
  ],
  lamp: ['M9 21h6', 'M12 21V9', 'M12 9c0-3 2-5 5-5', 'M14 4h6l-1.5 3h-3L14 4Z'],
  road: ['M8 3 4 21', 'M16 3l4 18', 'M12 4v2', 'M12 10v3', 'M12 17v3'],
  footprints: [
    'M5 16v-3.5C5 10 6 8 7.5 8S10 10 10 12.5c0 2-1 3.5-2.5 3.5H5Z',
    'M5 19.5h4',
    'M19 11V7.5C19 5 18 3 16.5 3S14 5 14 7.5c0 2 1 3.5 2.5 3.5H19Z',
    'M19 14.5h-4',
  ],
  check: ['M20 6 9 17l-5-5'],
};

/**
 * @param {object} props
 * @param {string} props.name Clave del ícono (ver `serviceIconName`).
 * @param {string} [props.className]
 */
export default function ServiceIcon({ name, className = 'size-5' }) {
  const paths = PATHS[name] ?? PATHS.check;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
