// Down-right arrow: the CTA glyph.
export const ArrowDR = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 5l10 10M15 6v9H6" />
  </svg>
);
// Right arrow: inline link glyph.
export const Arrow = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10h12m-5-5 5 5-5 5" />
  </svg>
);
