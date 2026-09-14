// The mark: an ink square, an L in the ground colour, an ember dot.
export function Logo({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--color-ink)" />
      <path d="M18 14h8v28h20v8H18z" fill="var(--color-canvas)" />
      <circle cx="46" cy="20" r="6" fill="var(--color-ember)" />
    </svg>
  );
}
