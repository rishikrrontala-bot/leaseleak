import { useEffect, useState } from 'react';

/** Vite base path, without trailing slash ('' when deployed at the root). */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
/** Prefix a public asset path with the base. */
export const asset = (p: string) => `${BASE}${p}`;
const strip = (p: string) => (BASE && p.startsWith(BASE) ? p.slice(BASE.length) || '/' : p);


export function useRoute() {
  const [path, setPath] = useState(() => strip(window.location.pathname));
  useEffect(() => {
    const onPop = () => setPath(strip(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return path;
}

export function navigate(to: string) {
  if (strip(window.location.pathname) === to) { window.scrollTo({ top: 0 }); return; }
  window.history.pushState({}, '', BASE + to);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0 });
}

export function Link(props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const { to, onClick, children, ...rest } = props;
  return (
    <a
      href={BASE + to}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onClick?.(e);
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
