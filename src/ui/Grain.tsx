// Film grain over the whole page. Fixed, faint, non-interactive; hidden in print.
export default function Grain() {
  return (
    <svg className="grain no-print" aria-hidden="true">
      <filter id="page-grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="100%" height="100%" filter="url(#page-grain)" />
    </svg>
  );
}
