import { useEffect, useRef } from 'react';

/** Adds `is-in` when the element enters the viewport (once). Drives the mask-wipe behaviour. */
export function useReveal<T extends HTMLElement>(options: { rootMargin?: string; threshold?: number } = {}) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) { el.classList.add('is-in'); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { el.classList.add('is-in'); io.disconnect(); }
      }
    }, { rootMargin: options.rootMargin ?? '0px 0px -12% 0px', threshold: options.threshold ?? 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [options.rootMargin, options.threshold]);
  return ref;
}

/** Marks every `[data-reveal]` descendant with `is-in` as it scrolls into view. */
export function useRevealAll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        // Reveal when it enters, and also if a fast scroll already carried it past the top.
        if (e.isIntersecting || e.boundingClientRect.bottom < 0) { (e.target as HTMLElement).classList.add('is-in'); io.unobserve(e.target); }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  });
  return ref;
}
