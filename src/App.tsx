import { lazy, Suspense } from 'react';
import { useRoute } from './lib/router';
import Tool from './tool/Tool';

const Landing = lazy(() => import('./landing/Landing'));
const Pricing = lazy(() => import('./landing/Pricing'));

export default function App() {
  const path = useRoute();
  if (path.startsWith('/app')) return <Tool />;
  if (path.startsWith('/pricing')) return <Suspense fallback={null}><Pricing /></Suspense>;
  return <Suspense fallback={null}><Landing /></Suspense>;
}
