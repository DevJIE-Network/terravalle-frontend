/** Corazón decorativo: el nombre accesible lo da el botón o enlace que lo contiene. */
export default function HeartIcon({ filled = false, className = 'size-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinejoin="round"
        d="M12 20.5s-7.5-4.4-7.5-10.1A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 3.1c0 5.7-7.5 10.1-7.5 10.1Z"
      />
    </svg>
  );
}
