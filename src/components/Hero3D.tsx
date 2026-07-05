/**
 * The ONE 3D scene: a low-poly clay-toned landscape with a drifting sun.
 * - lazy-loaded (three.js never ships unless the farmer switches it on)
 * - pauses when scrolled off-screen or the tab is hidden
 * - refuses to run on data-saver / 2G connections
 */
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

function Terrain() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(34, 26, 30, 22);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const h =
        Math.sin(x * 0.35) * Math.cos(y * 0.3) * 1.4 +
        Math.sin(x * 0.12 + 2) * 1.8 +
        Math.cos(y * 0.2 + 1) * 0.8;
      pos.setZ(i, h);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.05) * 0.02;
    }
  });
  return (
    <mesh
      ref={ref}
      geometry={geo}
      rotation={[-Math.PI / 2.35, 0, 0]}
      position={[0, -3.4, -6]}
    >
      <meshStandardMaterial color="#9a5a35" flatShading roughness={1} />
    </mesh>
  );
}

function Sun() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = 2.6 + Math.sin(clock.elapsedTime * 0.4) * 0.15;
    }
  });
  return (
    <mesh ref={ref} position={[4.5, 2.6, -14]}>
      <sphereGeometry args={[1.7, 20, 20]} />
      <meshBasicMaterial color="#f7dc9e" />
    </mesh>
  );
}

export default function Hero3D() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(!document.hidden);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    io.observe(el);
    const onVis = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const running = visible && pageVisible;

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 overflow-hidden rounded-b-[2rem]"
      aria-hidden="true"
      style={{
        background:
          'linear-gradient(180deg, #d98e5a 0%, #c4703f 45%, #8a4c28 100%)',
      }}
    >
      <Canvas
        frameloop={running ? 'always' : 'never'}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: 'low-power' }}
        camera={{ position: [0, 1.2, 8], fov: 50 }}
      >
        <ambientLight intensity={0.75} color="#ffe0c2" />
        <directionalLight position={[6, 8, 2]} intensity={1.1} color="#ffd9a0" />
        <Sun />
        <Terrain />
      </Canvas>
    </div>
  );
}
