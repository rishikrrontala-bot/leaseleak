import { lazy, Suspense } from 'react';
import { useRoute } from './lib/router';
import Tool from './tool/Tool';
import Grain from './ui/Grain';

const Landing = lazy(() => import('./landing/Landing'));
const Pricing = lazy(() => import('./landing/Pricing'));

export default function App() {
  const path = useRoute();
  const page = path.startsWith('/app') ? <Tool />
    : path.startsWith('/pricing') ? <Suspense fallback={null}><Pricing /></Suspense>
    : <Suspense fallback={null}><Landing /></Suspense>;
  return <>{page}<Grain /></>;
}
