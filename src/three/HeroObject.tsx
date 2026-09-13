import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * The one 3D object on the page: a machined calibration dial — a metal ring with
 * 60 ticks and a single ember needle. It rotates slowly and tilts toward the cursor.
 * Concept spine: precision instrument.
 */
function Dial({ pointer }: { pointer: React.MutableRefObject<{ x: number; y: number }> }) {
  const group = useRef<THREE.Group>(null);
  const ticks = useMemo(() => {
    const arr: { pos: [number, number, number]; rot: number; long: boolean }[] = [];
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const r = 1.42;
      arr.push({ pos: [Math.cos(a) * r, Math.sin(a) * r, 0.12], rot: a, long: i % 5 === 0 });
    }
    return arr;
  }, []);

  useFrame((state, dt) => {
    const g = group.current; if (!g) return;
    g.rotation.z += dt * 0.12;
    const tx = pointer.current.y * 0.35; const ty = pointer.current.x * 0.45;
    g.rotation.x += (tx - g.rotation.x) * Math.min(1, dt * 4);
    g.rotation.y += (ty - g.rotation.y) * Math.min(1, dt * 4);
    void state;
  });

  return (
    <group ref={group} rotation={[0.35, -0.4, 0]}>
      {/* outer ring */}
      <mesh>
        <torusGeometry args={[1.6, 0.16, 32, 128]} />
        <meshStandardMaterial color="#cfd6d1" metalness={0.95} roughness={0.28} />
      </mesh>
      {/* inner bevel ring */}
      <mesh position={[0, 0, 0.02]}>
        <torusGeometry args={[1.28, 0.05, 24, 128]} />
        <meshStandardMaterial color="#9fb0a7" metalness={0.9} roughness={0.35} />
      </mesh>
      {/* face */}
      <mesh position={[0, 0, -0.06]}>
        <circleGeometry args={[1.45, 96]} />
        <meshStandardMaterial color="#143a2b" metalness={0.2} roughness={0.85} />
      </mesh>
      {/* ticks */}
      {ticks.map((t, i) => (
        <mesh key={i} position={t.pos} rotation={[0, 0, t.rot]}>
          <boxGeometry args={[t.long ? 0.22 : 0.1, 0.02, 0.02]} />
          <meshStandardMaterial color={t.long ? '#f4efe3' : '#9fe1bd'} metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      {/* needle */}
      <group rotation={[0, 0, 2.2]}>
        <mesh position={[0.55, 0, 0.14]}>
          <boxGeometry args={[1.1, 0.035, 0.03]} />
          <meshStandardMaterial color="#ff6b3d" metalness={0.3} roughness={0.4} emissive="#ff6b3d" emissiveIntensity={0.25} />
        </mesh>
      </group>
      {/* hub */}
      <mesh position={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.12, 0.12, 0.08, 32]} />
        <meshStandardMaterial color="#e9e1cf" metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  );
}

export default function HeroObject() {
  const pointer = useRef({ x: 0, y: 0 });
  return (
    <div
      className="h-full w-full"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        pointer.current = { x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 };
      }}
      onPointerLeave={() => { pointer.current = { x: 0, y: 0 }; }}
    >
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 5.2], fov: 38 }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 4, 5]} intensity={2.2} color="#fff4e6" />
        <directionalLight position={[-4, -2, 2]} intensity={0.8} color="#9fe1bd" />
        <Dial pointer={pointer} />
      </Canvas>
    </div>
  );
}
